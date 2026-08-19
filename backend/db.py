"""Lightweight SQLite persistence for completed cases.

Prototype-only storage: no HIPAA/GDPR/medical-record compliance is claimed.
Use only public, synthetic, anonymised, or hackathon demonstration data —
never real patient information.
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from typing import Any, Optional

from config import DB_PATH, ensure_runtime_dirs

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    case_id     TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL,
    final_band  TEXT,
    payload     TEXT NOT NULL
)
"""


def _connect() -> sqlite3.Connection:
    ensure_runtime_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(_SCHEMA)


def save_case(case_id: str, result: dict[str, Any]) -> None:
    """Persist the completed case result (metadata + full JSON payload)."""
    try:
        with _connect() as conn:
            conn.execute(_SCHEMA)
            conn.execute(
                "INSERT OR REPLACE INTO cases "
                "(case_id, created_at, final_band, payload) "
                "VALUES (?, ?, ?, ?)",
                (
                    case_id,
                    datetime.now(timezone.utc).isoformat(),
                    result.get("final_band"),
                    json.dumps(result),
                ),
            )
    except Exception:
        # Persistence failure must never break an assessment response.
        logger.exception("Failed to persist case %s", case_id)


def get_case(case_id: str) -> Optional[dict[str, Any]]:
    with _connect() as conn:
        conn.execute(_SCHEMA)
        row = conn.execute(
            "SELECT payload FROM cases WHERE case_id = ?", (case_id,)
        ).fetchone()
    return json.loads(row["payload"]) if row else None


def list_cases(limit: int = 50) -> list[dict[str, Any]]:
    with _connect() as conn:
        conn.execute(_SCHEMA)
        rows = conn.execute(
            "SELECT case_id, created_at, final_band FROM cases "
            "ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]
