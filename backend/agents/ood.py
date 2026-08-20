"""Out-of-distribution (OOD) gate for uploaded photographs.

Accepts only images that resemble the vision model's TRAINING
distribution (HAM10000 lesion close-ups), judged in the trained
EfficientNet's own embedding space:

  * setup: backend/models/compute_ood_stats.py embeds every training
    image, stores the per-class mean embeddings and an acceptance
    threshold (a low percentile of the training images' own similarity —
    so ~99% of training-like images are accepted by construction);
  * runtime: an image is accepted when its embedding's best cosine
    similarity to any class mean reaches the threshold.

Degrades honestly: if the checkpoint or the stats file is missing the
gate reports unavailable and callers must skip it — an unavailable gate
never fabricates a rejection. The threshold can be loosened at runtime
via the DERMATRIAGE_OOD_MIN_SIMILARITY environment variable because the
training set is dermatoscopic while field photos come from phones.
"""

import logging
import os
from typing import Optional

import numpy as np

from config import (
    IMAGENET_MEAN,
    IMAGENET_STD,
    OOD_MIN_SIMILARITY_ENV,
    OOD_STATS_PATH,
    VISION_INPUT_SIZE,
)

logger = logging.getLogger(__name__)

_stats = None
_stats_attempted = False


def _load_stats():
    """Load class-mean embeddings + threshold once; None if unavailable."""
    global _stats, _stats_attempted
    if _stats_attempted:
        return _stats
    _stats_attempted = True
    try:
        if not OOD_STATS_PATH.exists():
            logger.info(
                "OOD stats not found at %s; distribution gate inactive.",
                OOD_STATS_PATH,
            )
            return None
        data = np.load(OOD_STATS_PATH)
        _stats = {
            "means": np.asarray(data["means"], dtype=np.float32),
            "threshold": float(data["threshold"]),
        }
        logger.info(
            "OOD gate active: %d class means, threshold %.4f.",
            _stats["means"].shape[0],
            _stats["threshold"],
        )
    except Exception:
        logger.exception("Failed to load OOD stats; gate inactive.")
        _stats = None
    return _stats


def cosine_to_means(vec: np.ndarray, means: np.ndarray) -> float:
    """Best cosine similarity between one embedding and each class mean.

    Pure NumPy so it is unit-testable without the deep-learning stack."""
    v = np.asarray(vec, dtype=np.float32).ravel()
    v = v / (np.linalg.norm(v) + 1e-8)
    m = np.asarray(means, dtype=np.float32)
    m = m / (np.linalg.norm(m, axis=1, keepdims=True) + 1e-8)
    return float(np.max(m @ v))


def effective_threshold(stored: float) -> float:
    """Stored threshold, unless overridden via environment."""
    raw = os.getenv(OOD_MIN_SIMILARITY_ENV, "").strip()
    if raw:
        try:
            return float(raw)
        except ValueError:
            logger.warning("Ignoring invalid %s=%r", OOD_MIN_SIMILARITY_ENV, raw)
    return stored


def embed_bgr(img) -> Optional[np.ndarray]:
    """Embed a decoded BGR image with the trained vision backbone."""
    from agents.vision import _load_model  # lazy: heavy deps stay optional

    model = _load_model()
    if model is None:
        return None
    try:
        import cv2  # type: ignore
        import torch  # type: ignore

        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        rgb = cv2.resize(rgb, (VISION_INPUT_SIZE, VISION_INPUT_SIZE))
        arr = rgb.astype(np.float32) / 255.0
        arr = (arr - np.asarray(IMAGENET_MEAN)) / np.asarray(IMAGENET_STD)
        tensor = torch.from_numpy(arr.transpose(2, 0, 1)).float().unsqueeze(0)
        device = next(model.parameters()).device
        with torch.no_grad():
            feats = model.forward_features(tensor.to(device))
            try:
                emb = model.forward_head(feats, pre_logits=True)
            except Exception:
                emb = feats.mean(dim=(2, 3))
        return emb[0].detach().cpu().numpy()
    except Exception:
        logger.exception("OOD embedding failed.")
        return None


def check_image(img) -> Optional[tuple[bool, float]]:
    """(accepted, similarity) for a decoded BGR image; None = gate inactive."""
    stats = _load_stats()
    if stats is None:
        return None
    emb = embed_bgr(img)
    if emb is None:
        return None
    sim = cosine_to_means(emb, stats["means"])
    return sim >= effective_threshold(stats["threshold"]), sim


def ood_available() -> bool:
    """Readiness check for /api/health."""
    if _load_stats() is None:
        return False
    from agents.vision import vision_model_available

    return vision_model_available()
