"""Agent 1 — Ingestion: image quality gate and graph routing authority.

Decides whether the photograph is usable enough for vision inference.
Quality thresholds live in config.py and are engineering heuristics, not
clinically validated cut-offs. Deliberately, there is NO skin-colour based
rejection rule: such a heuristic could discriminate against darker skin
tones.
"""

import logging

from config import (
    BLUR_THRESHOLD,
    MAX_BRIGHTNESS,
    MAX_FLAT_FRACTION,
    MAX_WHITE_FRACTION,
    MIN_BRIGHTNESS,
    MIN_SATURATION,
    MIN_SKIN_FRACTION,
    SKIN_CB_RANGE,
    SKIN_CR_RANGE,
)
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

    # Conservative non-skin-photograph checks (tone-agnostic by design —
    # deliberately no skin-colour rule; see config.py). Only inputs that
    # are clearly not photographs of skin are rejected here.
    try:
        saturation = float(
            cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1].mean()
        )
        flat_fraction = float((img[:, :-1] == img[:, 1:]).all(axis=2).mean())
        white_fraction = float((img > 240).all(axis=2).mean())
    except Exception:
        return False, "Photograph could not be analysed."

    if saturation < MIN_SATURATION:
        return False, (
            "This does not look like a skin photograph (no colour "
            "information — a document, scan or grayscale image). Please "
            "take a colour photo of the lesion directly."
        )
    if flat_fraction > MAX_FLAT_FRACTION:
        return False, (
            "This looks like a screenshot or graphic, not a photograph of "
            "skin. Please photograph the lesion directly with the camera."
        )
    if white_fraction > MAX_WHITE_FRACTION:
        return False, (
            "This looks like a document or mostly blank image, not a skin "
            "photograph. Please photograph the lesion directly."
        )

    # Skin-presence check: enough of the frame must carry skin-like
    # CHROMINANCE. Brightness-independent by construction, with a band
    # generous enough for all Fitzpatrick types (verified by tests) and a
    # low required fraction — see config.py for the fairness rationale.
    try:
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]
        skin_mask = (
            (cr >= SKIN_CR_RANGE[0])
            & (cr <= SKIN_CR_RANGE[1])
            & (cb >= SKIN_CB_RANGE[0])
            & (cb <= SKIN_CB_RANGE[1])
        )
        skin_fraction = float(skin_mask.mean())
    except Exception:
        return False, "Photograph could not be analysed."

    if skin_fraction < MIN_SKIN_FRACTION:
        return False, (
            "This does not appear to be a photograph of skin. Please "
            "photograph the lesion directly, filling most of the frame "
            "with the skin around it."
        )
    return True, None


def evaluate_image_full(img) -> tuple[bool, str | None]:
    """The cheap quality gate plus the deep distribution gate.

    The OOD check only runs when the trained model and its stats exist;
    when the gate is inactive images pass through unchanged (it never
    fabricates a rejection)."""
    ok, note = evaluate_image(img)
    if not ok:
        return ok, note
    try:
        from agents.ood import check_image  # lazy: heavy deps optional

        verdict = check_image(img)
    except Exception:
        logger.exception("OOD gate errored; skipping it.")
        verdict = None
    if verdict is not None:
        in_distribution, similarity = verdict
        if not in_distribution:
            logger.info("Image rejected by OOD gate (sim=%.4f).", similarity)
            return False, (
                "This photograph does not resemble the close-up lesion "
                "images the analysis model was trained on. Please take a "
                "close-up photo of the lesion, filling the frame with the "
                "lesion and surrounding skin."
            )
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

    state.image_ok, state.quality_note = evaluate_image_full(img)
    if not state.image_ok:
        logger.info(
            "Image rejected for case %s: %s", state.case_id, state.quality_note
        )
    return state


def route_after_ingest(state: CaseState) -> str:
    """Graph-level routing decision: usable image goes to vision."""
    return "vision" if state.image_ok else "history"
