"""Agent 2 — Vision: EfficientNet-B0 lesion classification + Grad-CAM.

The model is loaded once, lazily, from a local checkpoint. If the
checkpoint or its dependencies are unavailable the agent degrades safely:
`state.vision` stays None and NO probabilities are fabricated. Grad-CAM is
best-effort — its failure never fails classification, and classification
failure never crashes the case.
"""

import logging
from pathlib import Path
from typing import Optional

from config import (
    GRADCAM_DIR,
    HAM10000_CLASSES,
    IMAGENET_MEAN,
    IMAGENET_STD,
    MALIGNANT_CLASSES,
    VISION_INPUT_SIZE,
    VISION_WEIGHTS_PATH,
    ensure_runtime_dirs,
)
from schemas import CaseState, VisionOutput

logger = logging.getLogger(__name__)

_model = None
_device = "cpu"
_load_attempted = False


def _load_model():
    """Load EfficientNet-B0 once. Missing weights must not crash the app."""
    global _model, _device, _load_attempted
    if _load_attempted:
        return _model
    _load_attempted = True
    try:
        if not VISION_WEIGHTS_PATH.exists():
            logger.warning(
                "Vision weights not found at %s; vision agent disabled.",
                VISION_WEIGHTS_PATH,
            )
            return None
        import timm  # type: ignore
        import torch  # type: ignore

        _device = "cuda" if torch.cuda.is_available() else "cpu"
        model = timm.create_model(
            "efficientnet_b0",
            pretrained=False,
            num_classes=len(HAM10000_CLASSES),
        )
        checkpoint = torch.load(
            VISION_WEIGHTS_PATH, map_location=_device, weights_only=True
        )
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict)
        model.eval()
        model.to(_device)
        _model = model
        logger.info("Vision model loaded on %s.", _device)
    except Exception:
        logger.exception("Failed to load vision model; agent disabled.")
        _model = None
    return _model


def vision_model_available() -> bool:
    """Readiness check used by /api/health (actual load attempt)."""
    return _load_model() is not None


def _preprocess(image_path: str):
    """Read, resize and normalise an image into a 1x3xHxW tensor."""
    import cv2  # type: ignore
    import numpy as np  # type: ignore
    import torch  # type: ignore

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Unreadable image: {Path(image_path).name}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (VISION_INPUT_SIZE, VISION_INPUT_SIZE))
    arr = img.astype(np.float32) / 255.0
    arr = (arr - np.asarray(IMAGENET_MEAN)) / np.asarray(IMAGENET_STD)
    tensor = torch.from_numpy(arr.transpose(2, 0, 1)).float().unsqueeze(0)
    return tensor, img


def _try_gradcam(model, tensor, rgb_img, case_id: str) -> Optional[str]:
    """Best-effort Grad-CAM heatmap; returns a static URL path or None."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
        from pytorch_grad_cam import GradCAM  # type: ignore
        from pytorch_grad_cam.utils.image import show_cam_on_image  # type: ignore

        target_layer = model.conv_head
        with GradCAM(model=model, target_layers=[target_layer]) as cam:
            grayscale = cam(input_tensor=tensor.to(_device))[0]
        overlay = show_cam_on_image(
            rgb_img.astype(np.float32) / 255.0, grayscale, use_rgb=True
        )
        ensure_runtime_dirs()
        out_path = GRADCAM_DIR / f"{case_id}.png"
        cv2.imwrite(str(out_path), cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        return f"/static/gradcam/{case_id}.png"
    except Exception:
        logger.warning("Grad-CAM failed for case %s (non-fatal).", case_id)
        return None


def vision_agent(state: CaseState) -> CaseState:
    """Classify the lesion photograph. Degrades to vision=None on failure."""
    model = _load_model()
    if model is None or not state.image_path:
        state.vision = None
        return state

    try:
        import torch  # type: ignore

        tensor, rgb_img = _preprocess(state.image_path)
        with torch.no_grad():
            logits = model(tensor.to(_device))
            probs_t = torch.softmax(logits, dim=1)[0].cpu()
        probs = {
            cls: float(probs_t[i]) for i, cls in enumerate(HAM10000_CLASSES)
        }
        malignant_p = float(
            sum(p for cls, p in probs.items() if cls in MALIGNANT_CLASSES)
        )
        confidence = float(max(probs.values()))
        gradcam_path = _try_gradcam(model, tensor, rgb_img, state.case_id)
        state.vision = VisionOutput(
            probs=probs,
            malignant_p=min(max(malignant_p, 0.0), 1.0),
            confidence=min(max(confidence, 0.0), 1.0),
            gradcam_path=gradcam_path,
        )
    except Exception:
        logger.exception("Vision inference failed for case %s.", state.case_id)
        state.vision = None
    return state
