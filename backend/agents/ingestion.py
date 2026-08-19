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

    if img is None or img.size == 0:
        state.image_ok = False
        state.quality_note = "Photograph could not be read. Please retake it."
        return state

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = float(img.mean())
    except Exception:
        logger.warning("Quality metrics failed for case %s", state.case_id)
        state.image_ok = False
        state.quality_note = "Photograph could not be analysed."
        return state

    if blur < BLUR_THRESHOLD:
        state.image_ok = False
        state.quality_note = "Photograph is too blurry."
    elif not (MIN_BRIGHTNESS < brightness < MAX_BRIGHTNESS):
        state.image_ok = False
        state.quality_note = "Lighting is too dark or too bright."
    else:
        state.image_ok = True
        state.quality_note = None

    return state


def route_after_ingest(state: CaseState) -> str:
    """Graph-level routing decision: usable image goes to vision."""
    return "vision" if state.image_ok else "history"
