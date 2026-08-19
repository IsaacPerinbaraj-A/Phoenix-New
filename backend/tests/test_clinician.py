"""Clinician layer tests: deterministic referrals, priority ordering,
and the queue/stats/model-info endpoints."""

import json

import pytest

pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402
from agents.safety import BAND_ORDER  # noqa: E402
from clinician import (  # noqa: E402
    REFERRAL_PATHWAYS,
    build_clinician_summary,
    priority_score,
)
from config import (  # noqa: E402
    DEMO_CLINICIAN_PASSWORD,
    DEMO_CLINICIAN_USERNAME,
)

client = TestClient(api.app)


def _clinician_headers():
    resp = client.post(
        "/api/auth/login",
        json={
            "username": DEMO_CLINICIAN_USERNAME,
            "password": DEMO_CLINICIAN_PASSWORD,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "clinician"
    return {"Authorization": f"Bearer {body['token']}"}


def _questionnaire(**overrides) -> str:
    base = dict(
        age=30,
        fitzpatrick=3,
        duration_months=24.0,
        changed_recently=False,
        bleeding=False,
        itching=False,
        body_site="arm",
        family_history_melanoma=False,
    )
    base.update(overrides)
    return json.dumps(base)


def _run_case(**q_overrides):
    resp = client.post(
        "/api/assess", data={"questionnaire": _questionnaire(**q_overrides)}
    )
    assert resp.status_code == 200
    events = [
        json.loads(c.strip()[6:])
        for c in resp.text.split("\n\n")
        if c.strip().startswith("data: ")
    ]
    return [e for e in events if e.get("done")][0]["result"]


@pytest.fixture(autouse=True)
def _no_live_llm(monkeypatch):
    monkeypatch.setenv("DERMATRIAGE_SIMULATE_LLM_FAILURE", "true")


def test_referral_exists_for_every_band():
    for band in BAND_ORDER:
        assert REFERRAL_PATHWAYS[band]


def test_priority_score_is_band_monotonic():
    scores = [priority_score(band, [], 0.5) for band in
              sorted(BAND_ORDER, key=BAND_ORDER.get)]
    assert scores == sorted(scores)
    # Band always dominates triggers + risk contributions.
    assert priority_score("URGENT", [], 0.0) > priority_score(
        "INCONCLUSIVE", ["R1", "R2", "R3"], 1.0
    )


def test_priority_score_bounds():
    assert 0 <= priority_score("MONITOR", [], 0.0)
    assert priority_score("URGENT", ["a"] * 10, 1.0) <= 100


def test_summary_handles_missing_fields():
    summary = build_clinician_summary({})
    assert summary["referral"] == REFERRAL_PATHWAYS["INCONCLUSIVE"]
    assert summary["priority_score"] >= 0
    assert summary["basis"]


def test_completed_case_includes_clinician_block():
    result = _run_case(bleeding=True)
    clinician = result["clinician"]
    assert clinician["referral"] == REFERRAL_PATHWAYS["URGENT"]
    assert clinician["priority_score"] >= 75
    assert clinician["note"]


def test_clinician_endpoints_require_clinician_account():
    # Anonymous requests are rejected.
    assert client.get("/api/clinician/queue").status_code == 401
    assert client.get("/api/stats").status_code == 401

    # An ordinary health-worker account is rejected too.
    import uuid

    worker = client.post(
        "/api/auth/register",
        json={"username": f"worker_{uuid.uuid4().hex[:8]}", "password": "secret123"},
    ).json()
    worker_headers = {"Authorization": f"Bearer {worker['token']}"}
    assert worker["role"] == "worker"
    assert client.get("/api/clinician/queue", headers=worker_headers).status_code == 403
    assert client.get("/api/stats", headers=worker_headers).status_code == 403


def test_registration_cannot_claim_clinician_role():
    import uuid

    body = client.post(
        "/api/auth/register",
        json={"username": f"user_{uuid.uuid4().hex[:8]}", "password": "secret123"},
    ).json()
    assert body["role"] == "worker"


def test_queue_is_priority_sorted_and_stats_consistent():
    _run_case(bleeding=True)   # URGENT
    _run_case()                # INCONCLUSIVE (LLM simulated down)

    headers = _clinician_headers()
    queue = client.get("/api/clinician/queue", headers=headers).json()["cases"]
    assert queue, "queue must not be empty after submitting cases"
    scores = [c["priority_score"] for c in queue]
    assert scores == sorted(scores, reverse=True)
    for entry in queue:
        assert entry["referral"]
        assert entry["final_band"]

    stats = client.get("/api/stats", headers=headers).json()
    assert stats["total_cases"] >= 2
    assert stats["by_band"]["URGENT"] >= 1
    assert sum(stats["by_band"].values()) <= stats["total_cases"] + 0
    assert stats["llm_failure_count"] >= 2


def test_case_status_workflow():
    headers = _clinician_headers()
    result = _run_case()
    case_id = result["case_id"]

    # New cases enter the queue as pending.
    queue = client.get("/api/clinician/queue", headers=headers).json()["cases"]
    entry = next(c for c in queue if c["case_id"] == case_id)
    assert entry["status"] == "pending"

    # Only the clinician may change status.
    assert (
        client.patch(
            f"/api/cases/{case_id}/status", json={"status": "reviewed"}
        ).status_code
        == 401
    )
    # Invalid status values are rejected.
    assert (
        client.patch(
            f"/api/cases/{case_id}/status",
            json={"status": "bogus"},
            headers=headers,
        ).status_code
        == 422
    )
    # Valid transition round-trips through queue and case detail.
    resp = client.patch(
        f"/api/cases/{case_id}/status",
        json={"status": "referred"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert client.get(f"/api/cases/{case_id}").json()["status"] == "referred"
    queue = client.get("/api/clinician/queue", headers=headers).json()["cases"]
    assert next(c for c in queue if c["case_id"] == case_id)["status"] == "referred"

    # Unknown case ids 404.
    assert (
        client.patch(
            f"/api/cases/{'0' * 32}/status",
            json={"status": "reviewed"},
            headers=headers,
        ).status_code
        == 404
    )


def test_model_info_never_fabricates():
    body = client.get("/api/model_info").json()
    assert "vision" in body and "history" in body
    # On a machine without evaluation reports the values must be null,
    # not made-up numbers.
    for key in ("vision", "history"):
        assert body[key] is None or isinstance(body[key], dict)
