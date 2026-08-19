"""FastAPI backend for DermaTriage.

Endpoints:
    POST /api/assess              submit a case, stream per-agent SSE events
    GET  /api/cases/{case_id}     retrieve one completed case
    GET  /api/cases               demo/clinician case queue
    GET  /api/health              component availability
    GET  /static/gradcam/{id}.png generated Grad-CAM heatmap
    GET  /docs                    FastAPI Swagger UI
"""

import json
import logging
import re
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, ValidationError

import db
from agents.history import history_model_available
from agents.reasoning import ollama_available
from agents.vision import vision_model_available
from config import (
    ALLOWED_UPLOAD_CONTENT_TYPES,
    ALLOWED_UPLOAD_EXTENSIONS,
    CORS_ORIGINS,
    GRADCAM_DIR,
    MAX_UPLOAD_BYTES,
    OLLAMA_MODEL,
    UPLOAD_DIR,
    ensure_runtime_dirs,
)
from graph import graph
from schemas import CaseState, Questionnaire

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("dermatriage.api")

@asynccontextmanager
async def _lifespan(app: FastAPI):
    ensure_runtime_dirs()
    db.init_db()
    logger.info("DermaTriage API started (reasoning model: %s).", OLLAMA_MODEL)
    yield


app = FastAPI(
    lifespan=_lifespan,
    title="DermaTriage",
    description=(
        "Triage-support prototype. NOT a diagnostic system, NOT a medical "
        "device, NOT clinically validated. The LLM explains; deterministic "
        "rules decide."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_CASE_ID_RE = re.compile(r"^[a-f0-9]{32}$")
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,32}$")


def _user_from_header(authorization: Optional[str]) -> Optional[str]:
    """Resolve a 'Bearer <token>' header to a username, or None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return db.get_token_user(authorization[len("Bearer "):].strip())

# Graph node name -> user-facing agent name.
_NODE_NAMES = {
    "ingest": "ingestion",
    "vision": "vision",
    "history": "history",
    "reason": "reasoning",
    "safety": "safety",
}


def _dump(value: Any) -> Any:
    """JSON-safe serialization for Pydantic models and containers."""
    if isinstance(value, BaseModel):
        return value.model_dump()
    if isinstance(value, dict):
        return {k: _dump(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_dump(v) for v in value]
    return value


def _sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _save_upload(image: UploadFile, case_id: str) -> str:
    """Store the upload under a server-generated name; validate controls."""
    original = Path(image.filename or "upload")
    ext = original.suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type. Use JPG or PNG.",
        )
    if (
        image.content_type
        and image.content_type not in ALLOWED_UPLOAD_CONTENT_TYPES
    ):
        raise HTTPException(
            status_code=400,
            detail="Unsupported image content type. Use JPG or PNG.",
        )
    data = image.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image too large (limit 8 MB).",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload.")
    ensure_runtime_dirs()
    dest = UPLOAD_DIR / f"{case_id}{ext}"
    dest.write_bytes(data)
    return str(dest)


def _result_contract(state_fields: dict[str, Any]) -> dict[str, Any]:
    """Shape the accumulated state into the public result contract."""
    return {
        "case_id": state_fields.get("case_id"),
        "image_ok": state_fields.get("image_ok", False),
        "quality_note": state_fields.get("quality_note"),
        "vision": _dump(state_fields.get("vision")),
        "history": _dump(state_fields.get("history")),
        "reasoning": _dump(state_fields.get("reasoning")),
        "final_band": state_fields.get("final_band"),
        "safety_triggers": state_fields.get("safety_triggers", []),
        "instruction": state_fields.get("instruction"),
        "disclaimer": state_fields.get("disclaimer"),
        "language": state_fields.get("language", "en"),
    }


# ---------------------------------------------------------------------------
# Prototype auth (salted PBKDF2 + bearer tokens; not production identity)
# ---------------------------------------------------------------------------


class AuthRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/register")
def register(req: AuthRequest):
    username = req.username.strip()
    if not _USERNAME_RE.match(username):
        raise HTTPException(
            status_code=422,
            detail="Username must be 3-32 characters: letters, numbers, underscore.",
        )
    if len(req.password) < 6:
        raise HTTPException(
            status_code=422,
            detail="Password must be at least 6 characters.",
        )
    if not db.create_user(username, req.password):
        raise HTTPException(status_code=409, detail="Username already taken.")
    token = db.create_token(username)
    return {"username": username, "token": token}


@app.post("/api/auth/login")
def login(req: AuthRequest):
    username = req.username.strip()
    if not db.verify_user(username, req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    token = db.create_token(username)
    return {"username": username, "token": token}


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        db.delete_token(authorization[len("Bearer "):].strip())
    return {"ok": True}


@app.get("/api/auth/me")
def me(authorization: Optional[str] = Header(default=None)):
    return {"username": _user_from_header(authorization)}


@app.post("/api/assess")
def assess(
    image: Optional[UploadFile] = File(default=None),
    questionnaire: str = Form(...),
    language: str = Form(default="en"),
    authorization: Optional[str] = Header(default=None),
):
    """Run one case through the five-agent graph, streaming SSE events."""
    try:
        q = Questionnaire.model_validate_json(questionnaire)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid questionnaire: {exc.errors()}",
        ) from exc

    if language not in ("en", "ta", "hi"):
        language = "en"

    username = _user_from_header(authorization)
    case_id = uuid.uuid4().hex
    image_path: Optional[str] = None
    if image is not None and image.filename:
        image_path = _save_upload(image, case_id)

    initial = CaseState(
        case_id=case_id,
        image_path=image_path,
        questionnaire=q,
        language=language,  # type: ignore[arg-type]
    )

    def event_stream():
        merged: dict[str, Any] = initial.model_dump()
        started = time.perf_counter()
        visited: list[str] = []
        try:
            for update in graph.stream(
                initial.model_dump(), stream_mode="updates"
            ):
                for node, fields in update.items():
                    if node not in _NODE_NAMES:
                        continue
                    agent_name = _NODE_NAMES[node]
                    visited.append(agent_name)
                    fields = fields or {}
                    merged.update(
                        {k: v for k, v in fields.items()}
                    )
                    now = time.perf_counter()
                    elapsed_ms = int((now - started) * 1000)

                    status = "completed"
                    if agent_name == "reasoning" and fields.get("reasoning") is None:
                        status = "failed_safe"
                    if agent_name == "vision" and fields.get("vision") is None:
                        status = "failed_safe"

                    yield _sse(
                        {
                            "agent": agent_name,
                            "status": status,
                            "elapsed_ms": elapsed_ms,
                            "output": _dump(fields),
                        }
                    )

                    # Make the skipped vision node explicit for the UI.
                    if agent_name == "ingestion" and not fields.get("image_ok"):
                        yield _sse(
                            {
                                "agent": "vision",
                                "status": "skipped",
                                "reason": fields.get("quality_note")
                                or "Image not usable.",
                            }
                        )

            result = _result_contract(merged)
            db.save_case(case_id, result, username=username)
            yield _sse({"done": True, "case_id": case_id, "result": result})
        except Exception:
            logger.exception("Graph execution failed for case %s", case_id)
            # Safe user-facing failure: never a fabricated recommendation.
            yield _sse(
                {
                    "error": True,
                    "message": (
                        "Assessment failed. Please see a clinician; "
                        "this tool could not evaluate the case."
                    ),
                }
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/cases")
def cases(limit: int = 50, authorization: Optional[str] = Header(default=None)):
    """Case queue. Authenticated requests see only their own cases;
    anonymous requests see the shared demo queue."""
    username = _user_from_header(authorization)
    return {
        "cases": db.list_cases(min(max(limit, 1), 200), username=username),
        "username": username,
    }


@app.get("/api/cases/{case_id}")
def case_detail(case_id: str):
    if not _CASE_ID_RE.match(case_id):
        raise HTTPException(status_code=400, detail="Invalid case id.")
    result = db.get_case(case_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    return result


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ollama": ollama_available(),
        "ollama_model": OLLAMA_MODEL,
        "vision_model": vision_model_available(),
        "history_model": history_model_available(),
        # Safety has no model or network dependency: available whenever
        # the application itself is running.
        "safety": True,
    }


@app.get("/static/gradcam/{case_id}.png")
def gradcam(case_id: str):
    if not _CASE_ID_RE.match(case_id):
        raise HTTPException(status_code=400, detail="Invalid case id.")
    path = GRADCAM_DIR / f"{case_id}.png"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Heatmap not found.")
    return FileResponse(path, media_type="image/png")
