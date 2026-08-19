"""Agent 1 — Ingestion: image quality gate and graph routing authority.

Decides whether the photograph is usable enough for vision inference.
Quality thresholds live in config.py and are engineering heuristics, not
clinically validated cut-offs. Deliberately, there is NO skin-colour based
rejection rule: such a heuristic could discriminate against darker skin
tones.
"""

import logging

from config import BLUR_THRESHOLD, MAX_BRIGHTNESS, MIN_BRIGHTNESS
from schemas import CaseState

logger = logging.getLogger(__name__)

try:  # OpenCV is expected, but its absence must degrade safely.
    import cv2  # type: ignore

    _CV2_AVAILABLE = True
except Exception:  # pragma: no cover - import environment specific
    cv2 = None  # type: ignore
    _CV2_AVAILABLE = False


def evaluate_image(img) -> tuple[bool, str | None]:
    """THE quality gate: deterministic blur/brightness checks on a decoded
    image. Used by the ingestion agent and by the API precheck endpoint so
    the early warning shown to the worker always matches the pipeline."""
    if img is None or getattr(img, "size", 0) == 0:
        return False, "Photograph could not be read. Please retake it."
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = float(img.mean())
    except Exception:
        return False, "Photograph could not be analysed."

    if blur < BLUR_THRESHOLD:
        return False, "Photograph is too blurry."
    if not (MIN_BRIGHTNESS < brightness < MAX_BRIGHTNESS):
        return False, "Lighting is too dark or too bright."
    return True, None


def cv2_available() -> bool:
    return _CV2_AVAILABLE


def ingestion_agent(state: CaseState) -> CaseState:
    """Set `image_ok` and `quality_note` from deterministic image checks."""
    if not state.image_path:
        state.image_ok = False
        state.quality_note = "No photograph provided."
        return state

    if not _CV2_AVAILABLE:
        state.image_ok = False
        state.quality_note = (
            "Image quality check unavailable on this server; "
            "the photograph was not analysed."
        )
        return state

    try:
        img = cv2.imread(state.image_path)
    except Exception:
        img = None

    state.image_ok, state.quality_note = evaluate_image(img)
    if not state.image_ok:
        logger.info(
            "Image rejected for case %s: %s", state.case_id, state.quality_note
        )
    return state


def route_after_ingest(state: CaseState) -> str:
    """Graph-level routing decision: usable image goes to vision."""
    return "vision" if state.image_ok else "history"
