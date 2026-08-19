"""API tests: streaming assessment, validation, health, persistence."""

import io
import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402

client = TestClient(api.app)


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


def _parse_events(text: str) -> list[dict]:
    events = []
    for chunk in text.split("\n\n"):
        chunk = chunk.strip()
        if chunk.startswith("data: "):
            events.append(json.loads(chunk[len("data: "):]))
    return events


def _png_bytes(blurry: bool) -> bytes:
    if blurry:
        img = np.full((256, 256, 3), 128, dtype=np.uint8)
    else:
        rng = np.random.default_rng(7)
        img = rng.integers(0, 255, size=(256, 256, 3), dtype=np.uint8)
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


@pytest.fixture(autouse=True)
def _no_live_llm(monkeypatch):
    monkeypatch.setenv("DERMATRIAGE_SIMULATE_LLM_FAILURE", "true")


def test_health_endpoint_reports_components():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    for key in ("status", "ollama", "vision_model", "history_model", "safety"):
        assert key in body
    # Safety has no model dependency: always available while running.
    assert body["safety"] is True


def test_assess_without_image_streams_full_trace():
    resp = client.post(
        "/api/assess",
        data={"questionnaire": _questionnaire(bleeding=True)},
    )
    assert resp.status_code == 200
    events = _parse_events(resp.text)
    agents_seen = [e.get("agent") for e in events if "agent" in e]
    assert "ingestion" in agents_seen
    assert "safety" in agents_seen
    # Vision must be reported as explicitly skipped when no image exists.
    skipped = [
        e for e in events
        if e.get("agent") == "vision" and e.get("status") == "skipped"
    ]
    assert skipped

    done = [e for e in events if e.get("done")]
    assert done, "Stream must end with a done event"
    result = done[0]["result"]
    # Bleeding forces URGENT even with reasoning failed (R8).
    assert result["final_band"] == "URGENT"
    assert "R1_BLEEDING" in result["safety_triggers"]
    assert "R8_LLM_FAILED" in result["safety_triggers"]
    assert result["instruction"]
    assert result["disclaimer"]
    assert result["image_provided"] is False


def test_assess_with_blurry_image_skips_vision():
    resp = client.post(
        "/api/assess",
        data={"questionnaire": _questionnaire()},
        files={"image": ("lesion.png", io.BytesIO(_png_bytes(blurry=True)), "image/png")},
    )
    assert resp.status_code == 200
    events = _parse_events(resp.text)
    skipped = [
        e for e in events
        if e.get("agent") == "vision" and e.get("status") == "skipped"
    ]
    assert skipped
    done = [e for e in events if e.get("done")][0]
    assert done["result"]["image_ok"] is False
    assert done["result"]["quality_note"]


def test_assess_persists_case_for_retrieval():
    resp = client.post(
        "/api/assess",
        data={"questionnaire": _questionnaire()},
    )
    events = _parse_events(resp.text)
    case_id = [e for e in events if e.get("done")][0]["case_id"]

    detail = client.get(f"/api/cases/{case_id}")
    assert detail.status_code == 200
    assert detail.json()["case_id"] == case_id

    queue = client.get("/api/cases")
    assert queue.status_code == 200
    assert any(c["case_id"] == case_id for c in queue.json()["cases"])


def test_invalid_questionnaire_rejected():
    resp = client.post(
        "/api/assess",
        data={"questionnaire": json.dumps({"age": "not a number"})},
    )
    assert resp.status_code == 422


def test_precheck_rejects_blurry_and_accepts_sharp():
    resp = client.post(
        "/api/assess/precheck",
        files={"image": ("photo.png", io.BytesIO(_png_bytes(blurry=True)), "image/png")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["checked"] is True
    assert body["image_ok"] is False
    assert body["quality_note"]

    resp = client.post(
        "/api/assess/precheck",
        files={"image": ("photo.png", io.BytesIO(_png_bytes(blurry=False)), "image/png")},
    )
    body = resp.json()
    assert body["image_ok"] is True
    assert body["quality_note"] is None


def test_precheck_validates_upload_type():
    resp = client.post(
        "/api/assess/precheck",
        files={"image": ("evil.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
    )
    assert resp.status_code == 400


def test_unsupported_upload_type_rejected():
    resp = client.post(
        "/api/assess",
        data={"questionnaire": _questionnaire()},
        files={"image": ("evil.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
    )
    assert resp.status_code == 400


def test_gradcam_path_traversal_rejected():
    resp = client.get("/static/gradcam/..%2f..%2fsecret.png")
    assert resp.status_code in (400, 404)


def test_case_id_validation():
    resp = client.get("/api/cases/not-a-valid-id")
    assert resp.status_code == 400
