"""Ingestion quality-gate tests, including the conservative
non-skin-photograph checks (tone-agnostic by design)."""

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from agents.ingestion import evaluate_image  # noqa: E402


def _noise_photo():
    """Camera-like image: colour texture with per-pixel sensor noise."""
    rng = np.random.default_rng(42)
    return rng.integers(40, 220, size=(256, 256, 3), dtype=np.uint8)


def test_colour_photo_passes():
    ok, note = evaluate_image(_noise_photo())
    assert ok is True
    assert note is None


def test_blurry_image_rejected_first():
    img = np.full((256, 256, 3), 128, dtype=np.uint8)
    ok, note = evaluate_image(img)
    assert ok is False
    assert "blurry" in note.lower()


def test_grayscale_document_rejected():
    rng = np.random.default_rng(7)
    gray = rng.integers(40, 220, size=(256, 256), dtype=np.uint8)
    img = np.stack([gray, gray, gray], axis=2)  # zero saturation
    ok, note = evaluate_image(img)
    assert ok is False
    assert "colour" in note.lower()


def test_screenshot_like_graphic_rejected():
    # Large exactly-flat coloured blocks: sharp and colourful, but real
    # camera photos never contain long runs of exactly identical pixels.
    img = np.zeros((256, 256, 3), dtype=np.uint8)
    img[:, :, :] = (40, 120, 220)
    for y in range(0, 256, 64):
        for x in range(0, 256, 64):
            if (y // 64 + x // 64) % 2 == 0:
                img[y : y + 64, x : x + 64] = (200, 80, 40)
    ok, note = evaluate_image(img)
    assert ok is False
    assert "screenshot" in note.lower() or "graphic" in note.lower()


def test_mostly_white_document_rejected():
    # Bright document: white page with sparse colourful "text" noise.
    rng = np.random.default_rng(3)
    img = np.full((256, 256, 3), 250, dtype=np.uint8)
    noise = rng.integers(0, 200, size=(256, 256, 3), dtype=np.uint8)
    mask = rng.random((256, 256)) < 0.2  # 20% text-ish pixels
    img[mask] = noise[mask]
    ok, note = evaluate_image(img)
    assert ok is False
    # Rejected by whichever conservative rule fires first; must not pass.
    assert note


def test_unreadable_image_rejected():
    ok, note = evaluate_image(None)
    assert ok is False
    assert note
