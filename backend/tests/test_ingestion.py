"""Ingestion quality-gate tests, including the conservative
non-skin-photograph checks.

Fairness-critical: the skin-presence check must accept photographs of ALL
skin tones. The six Fitzpatrick reference tones below are each tested
explicitly — if a threshold change ever rejects any of them, these tests
fail and the change must not ship."""

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from agents.ingestion import evaluate_image  # noqa: E402

# Representative RGB tones for Fitzpatrick types I-VI (same swatches the
# questionnaire UI uses).
FITZPATRICK_RGB = [
    (245, 213, 192),  # I
    (238, 193, 168),  # II
    (217, 169, 134),  # III
    (185, 125, 86),   # IV
    (141, 90, 59),    # V
    (91, 58, 38),     # VI
]


def _photo(rgb, seed=42, noise=35):
    """Camera-like image: a base colour plus per-pixel sensor noise (BGR)."""
    rng = np.random.default_rng(seed)
    b, g, r = rgb[2], rgb[1], rgb[0]
    base = np.array([b, g, r], dtype=np.int16)
    img = base + rng.integers(-noise, noise + 1, size=(256, 256, 3), dtype=np.int16)
    return np.clip(img, 0, 255).astype(np.uint8)


@pytest.mark.parametrize("rgb", FITZPATRICK_RGB)
def test_all_fitzpatrick_tones_pass(rgb):
    ok, note = evaluate_image(_photo(rgb))
    assert ok is True, f"Skin tone {rgb} was rejected: {note}"
    assert note is None


def test_non_skin_colour_photos_rejected():
    # Sharp, well-lit, colourful — but clearly not skin.
    for rgb in [(135, 206, 235), (60, 140, 60), (30, 60, 200)]:  # sky, grass, blue
        ok, note = evaluate_image(_photo(rgb))
        assert ok is False, f"Non-skin colour {rgb} was accepted"
        assert "skin" in note.lower()


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
