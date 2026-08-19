"""Central configuration for DermaTriage.

All tunable constants live here so no agent hides magic values.
None of the thresholds below are clinically validated; they are
engineering defaults for a hackathon prototype.
"""

import os
from pathlib import Path

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
RUNTIME_DIR = BACKEND_DIR / "runtime"
UPLOAD_DIR = RUNTIME_DIR / "uploads"
GRADCAM_DIR = RUNTIME_DIR / "gradcam"
WEIGHTS_DIR = BACKEND_DIR / "models" / "weights"
DB_PATH = RUNTIME_DIR / "dermatriage.sqlite3"

VISION_WEIGHTS_PATH = WEIGHTS_DIR / "effnet_b0_ham10000.pt"
HISTORY_WEIGHTS_PATH = WEIGHTS_DIR / "xgb_history.json"


def ensure_runtime_dirs() -> None:
    """Create runtime directories on demand (never at import of agents)."""
    for d in (RUNTIME_DIR, UPLOAD_DIR, GRADCAM_DIR):
        d.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------------------------------
# Image quality gate (ingestion agent) — engineering heuristics only.
# --------------------------------------------------------------------------
BLUR_THRESHOLD = float(os.getenv("DERMATRIAGE_BLUR_THRESHOLD", "60.0"))
MIN_BRIGHTNESS = float(os.getenv("DERMATRIAGE_MIN_BRIGHTNESS", "30.0"))
MAX_BRIGHTNESS = float(os.getenv("DERMATRIAGE_MAX_BRIGHTNESS", "225.0"))

# --------------------------------------------------------------------------
# Vision model
# --------------------------------------------------------------------------
# HAM10000 class codes, fixed order used by training and inference.
HAM10000_CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

# Classes aggregated into `malignant_p`. Explicit here, never buried in UI.
# akiec (actinic keratoses / intraepithelial carcinoma), bcc (basal cell
# carcinoma) and mel (melanoma) form the concerning group for this prototype.
MALIGNANT_CLASSES = {"akiec", "bcc", "mel"}

VISION_INPUT_SIZE = 224
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

# --------------------------------------------------------------------------
# Reasoning model (local Ollama)
# --------------------------------------------------------------------------
OLLAMA_URL = os.getenv("DERMATRIAGE_OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("DERMATRIAGE_OLLAMA_MODEL", "qwen2.5:7b-instruct")
# Documented fallback (never switched to silently): qwen2.5:3b-instruct
OLLAMA_TIMEOUT_S = float(os.getenv("DERMATRIAGE_OLLAMA_TIMEOUT_S", "90"))

# --------------------------------------------------------------------------
# Uploads
# --------------------------------------------------------------------------
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_UPLOAD_CONTENT_TYPES = {"image/jpeg", "image/png"}

# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "DERMATRIAGE_CORS_ORIGINS", "http://localhost:5173"
    ).split(",")
    if o.strip()
]

# --------------------------------------------------------------------------
# Language support
# --------------------------------------------------------------------------
# Tamil and Hindi are architecturally supported but this build ships no
# human-reviewed medical translations, so they stay feature-flagged off and
# English text is served for every language until reviewed translations exist.
ENABLE_UNREVIEWED_TRANSLATIONS = (
    os.getenv("DERMATRIAGE_ENABLE_UNREVIEWED_TRANSLATIONS", "false").lower()
    == "true"
)

# --------------------------------------------------------------------------
# Demo / development flags (read at call time where they alter behaviour)
# --------------------------------------------------------------------------
DEMO_MODE_ENV = "DERMATRIAGE_DEMO_MODE"
SIMULATE_LLM_FAILURE_ENV = "DERMATRIAGE_SIMULATE_LLM_FAILURE"

# --------------------------------------------------------------------------
# Reproducibility
# --------------------------------------------------------------------------
RANDOM_SEED = 42
