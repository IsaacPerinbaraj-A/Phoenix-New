"""Prototype-auth tests: register, login, tokens, per-user history."""

import json
import uuid

import pytest

pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402

client = TestClient(api.app)


def _creds():
    return {"username": f"user_{uuid.uuid4().hex[:10]}", "password": "secret123"}


def test_register_login_roundtrip():
    creds = _creds()
    resp = client.post("/api/auth/register", json=creds)
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == creds["username"]
    assert body["token"]

    resp = client.post("/api/auth/login", json=creds)
    assert resp.status_code == 200
    assert resp.json()["token"]


def test_duplicate_username_rejected():
    creds = _creds()
    assert client.post("/api/auth/register", json=creds).status_code == 200
    assert client.post("/api/auth/register", json=creds).status_code == 409


def test_wrong_password_rejected():
    creds = _creds()
    client.post("/api/auth/register", json=creds)
    resp = client.post(
        "/api/auth/login",
        json={"username": creds["username"], "password": "wrongpass"},
    )
    assert resp.status_code == 401


def test_invalid_username_and_short_password_rejected():
    assert (
        client.post(
            "/api/auth/register",
            json={"username": "x", "password": "secret123"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/auth/register",
            json={"username": "valid_user_1", "password": "abc"},
        ).status_code
        == 422
    )


def test_me_endpoint():
    creds = _creds()
    token = client.post("/api/auth/register", json=creds).json()["token"]
    resp = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.json()["username"] == creds["username"]
    assert client.get("/api/auth/me").json()["username"] is None


def test_logout_invalidates_token():
    creds = _creds()
    token = client.post("/api/auth/register", json=creds).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/api/auth/logout", headers=headers)
    assert client.get("/api/auth/me", headers=headers).json()["username"] is None


def test_history_is_per_user(monkeypatch):
    monkeypatch.setenv("DERMATRIAGE_SIMULATE_LLM_FAILURE", "true")
    creds = _creds()
    token = client.post("/api/auth/register", json=creds).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    questionnaire = json.dumps(
        dict(
            age=30,
            fitzpatrick=3,
            duration_months=24.0,
            changed_recently=False,
            bleeding=False,
            itching=False,
            body_site="arm",
            family_history_melanoma=False,
        )
    )
    resp = client.post(
        "/api/assess", data={"questionnaire": questionnaire}, headers=headers
    )
    assert resp.status_code == 200
    done = [
        json.loads(c.strip()[6:])
        for c in resp.text.split("\n\n")
        if c.strip().startswith("data: ") and '"done"' in c
    ][0]
    case_id = done["case_id"]

    mine = client.get("/api/cases", headers=headers).json()
    assert mine["username"] == creds["username"]
    assert any(c["case_id"] == case_id for c in mine["cases"])

    # A different fresh user must not see this case in their history.
    other_token = client.post("/api/auth/register", json=_creds()).json()["token"]
    other = client.get(
        "/api/cases", headers={"Authorization": f"Bearer {other_token}"}
    ).json()
    assert not any(c["case_id"] == case_id for c in other["cases"])
