"""Lightweight SQLite persistence: cases, users, and session tokens.

Prototype-only storage: no HIPAA/GDPR/medical-record compliance is claimed.
Use only public, synthetic, anonymised, or hackathon demonstration data —
never real patient information. The auth scheme (salted PBKDF2 hashes +
random bearer tokens) is reasonable for a prototype but is NOT presented
as production-grade identity management.
"""

import hashlib
import hmac
import json
import logging
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Any, Optional

from config import (
    DB_PATH,
    DEMO_CLINICIAN_PASSWORD,
    DEMO_CLINICIAN_USERNAME,
    ensure_runtime_dirs,
)

logger = logging.getLogger(__name__)

_SCHEMAS = [
    """
    CREATE TABLE IF NOT EXISTS cases (
        case_id     TEXT PRIMARY KEY,
        created_at  TEXT NOT NULL,
        final_band  TEXT,
        payload     TEXT NOT NULL,
        username    TEXT,
        status      TEXT NOT NULL DEFAULT 'pending'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        username      TEXT PRIMARY KEY,
        salt          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'worker'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tokens (
        token      TEXT PRIMARY KEY,
        username   TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """,
]

_PBKDF2_ITERATIONS = 200_000


def _connect() -> sqlite3.Connection:
    ensure_runtime_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    for schema in _SCHEMAS:
        conn.execute(schema)
    # Migrations for databases created before these columns existed.
    for statement in (
        "ALTER TABLE cases ADD COLUMN username TEXT",
        "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'worker'",
        "ALTER TABLE cases ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'",
    ):
        try:
            conn.execute(statement)
        except sqlite3.OperationalError:
            pass  # column already present


def init_db() -> None:
    with _connect() as conn:
        _ensure_schema(conn)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Cases
# ---------------------------------------------------------------------------


def save_case(
    case_id: str, result: dict[str, Any], username: Optional[str] = None
) -> None:
    """Persist the completed case result (metadata + full JSON payload)."""
    try:
        with _connect() as conn:
            _ensure_schema(conn)
            conn.execute(
                "INSERT OR REPLACE INTO cases "
                "(case_id, created_at, final_band, payload, username, status) "
                "VALUES (?, ?, ?, ?, ?, 'pending')",
                (
                    case_id,
                    _now(),
                    result.get("final_band"),
                    json.dumps(result),
                    username,
                ),
            )
    except Exception:
        # Persistence failure must never break an assessment response.
        logger.exception("Failed to persist case %s", case_id)


def get_case(case_id: str) -> Optional[dict[str, Any]]:
    with _connect() as conn:
        _ensure_schema(conn)
        row = conn.execute(
            "SELECT payload, status FROM cases WHERE case_id = ?", (case_id,)
        ).fetchone()
    if row is None:
        return None
    payload = json.loads(row["payload"])
    payload["status"] = row["status"]
    return payload


def list_cases(
    limit: int = 50, username: Optional[str] = None
) -> list[dict[str, Any]]:
    with _connect() as conn:
        _ensure_schema(conn)
        if username is not None:
            rows = conn.execute(
                "SELECT case_id, created_at, final_band, status FROM cases "
                "WHERE username = ? ORDER BY created_at DESC LIMIT ?",
                (username, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT case_id, created_at, final_band, status FROM cases "
                "ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [dict(r) for r in rows]


def set_case_status(case_id: str, status: str) -> bool:
    """Update a case's workflow status; returns False if the case is unknown."""
    with _connect() as conn:
        _ensure_schema(conn)
        cursor = conn.execute(
            "UPDATE cases SET status = ? WHERE case_id = ?", (status, case_id)
        )
    return cursor.rowcount > 0


def list_case_payloads(limit: int = 500) -> list[dict[str, Any]]:
    """Full stored payloads, newest first — used by the clinician queue
    and the stats endpoint."""
    with _connect() as conn:
        _ensure_schema(conn)
        rows = conn.execute(
            "SELECT case_id, created_at, username, payload, status FROM cases "
            "ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    out: list[dict[str, Any]] = []
    for r in rows:
        try:
            payload = json.loads(r["payload"])
        except (TypeError, ValueError):
            continue
        out.append(
            {
                "case_id": r["case_id"],
                "created_at": r["created_at"],
                "username": r["username"],
                "payload": payload,
                "status": r["status"],
            }
        )
    return out


# ---------------------------------------------------------------------------
# Users and tokens (prototype auth)
# ---------------------------------------------------------------------------


def _hash_password(password: str, salt_hex: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        _PBKDF2_ITERATIONS,
    ).hex()


def create_user(username: str, password: str, role: str = "worker") -> bool:
    """Create a user; returns False if the username is already taken."""
    salt = secrets.token_hex(16)
    pw_hash = _hash_password(password, salt)
    try:
        with _connect() as conn:
            _ensure_schema(conn)
            conn.execute(
                "INSERT INTO users "
                "(username, salt, password_hash, created_at, role) "
                "VALUES (?, ?, ?, ?, ?)",
                (username, salt, pw_hash, _now(), role),
            )
        return True
    except sqlite3.IntegrityError:
        return False


def get_user_role(username: Optional[str]) -> Optional[str]:
    if not username:
        return None
    with _connect() as conn:
        _ensure_schema(conn)
        row = conn.execute(
            "SELECT role FROM users WHERE username = ?", (username,)
        ).fetchone()
    return row["role"] if row else None


def ensure_demo_clinician() -> None:
    """Create the demo clinician account if it does not exist yet.

    Prototype convenience only: the credentials are public demo values
    (configurable via environment), not real access control."""
    create_user(
        DEMO_CLINICIAN_USERNAME, DEMO_CLINICIAN_PASSWORD, role="clinician"
    )


def verify_user(username: str, password: str) -> bool:
    with _connect() as conn:
        _ensure_schema(conn)
        row = conn.execute(
            "SELECT salt, password_hash FROM users WHERE username = ?",
            (username,),
        ).fetchone()
    if row is None:
        # Still burn a hash so missing users take as long as wrong passwords.
        _hash_password(password, "00" * 16)
        return False
    candidate = _hash_password(password, row["salt"])
    return hmac.compare_digest(candidate, row["password_hash"])


def create_token(username: str) -> str:
    token = secrets.token_hex(32)
    with _connect() as conn:
        _ensure_schema(conn)
        conn.execute(
            "INSERT INTO tokens (token, username, created_at) VALUES (?, ?, ?)",
            (token, username, _now()),
        )
    return token


def get_token_user(token: str) -> Optional[str]:
    if not token:
        return None
    with _connect() as conn:
        _ensure_schema(conn)
        row = conn.execute(
            "SELECT username FROM tokens WHERE token = ?", (token,)
        ).fetchone()
    return row["username"] if row else None


def delete_token(token: str) -> None:
    with _connect() as conn:
        _ensure_schema(conn)
        conn.execute("DELETE FROM tokens WHERE token = ?", (token,))
