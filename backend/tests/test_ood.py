"""Out-of-distribution gate tests.

The scoring math is tested directly in NumPy; gate behaviour is tested
in its degraded state (no checkpoint / no stats in the test environment),
which must ALWAYS mean pass-through — an inactive gate never fabricates
a rejection."""

import numpy as np
import pytest

from agents.ood import (
    _load_stats,
    check_image,
    cosine_to_means,
    effective_threshold,
    ood_available,
)


def test_cosine_identical_vector_is_one():
    means = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
    assert cosine_to_means(np.array([2.0, 0.0, 0.0]), means) == pytest.approx(1.0)


def test_cosine_orthogonal_vector_is_zero():
    means = np.array([[1.0, 0.0, 0.0]])
    assert cosine_to_means(np.array([0.0, 3.0, 0.0]), means) == pytest.approx(
        0.0, abs=1e-6
    )


def test_cosine_picks_best_matching_mean():
    means = np.array([[1.0, 0.0], [0.0, 1.0]])
    vec = np.array([0.1, 0.995])
    sim = cosine_to_means(vec, means)
    assert sim > 0.99  # matches the second mean, not the first


def test_effective_threshold_env_override(monkeypatch):
    from config import OOD_MIN_SIMILARITY_ENV

    assert effective_threshold(0.8) == pytest.approx(0.8)
    monkeypatch.setenv(OOD_MIN_SIMILARITY_ENV, "0.5")
    assert effective_threshold(0.8) == pytest.approx(0.5)
    monkeypatch.setenv(OOD_MIN_SIMILARITY_ENV, "not-a-number")
    assert effective_threshold(0.8) == pytest.approx(0.8)


def test_gate_inactive_without_stats():
    # The test environment ships no checkpoint and no stats file.
    assert _load_stats() is None
    assert ood_available() is False
    img = np.zeros((32, 32, 3), dtype=np.uint8)
    assert check_image(img) is None  # inactive gate: no verdict, no rejection


def test_inactive_gate_passes_images_through():
    cv2 = pytest.importorskip("cv2")
    from agents.ingestion import evaluate_image_full

    rng = np.random.default_rng(42)
    base = np.array([86, 125, 185], dtype=np.int16)  # BGR skin tone
    img = np.clip(
        base + rng.integers(-35, 36, size=(256, 256, 3), dtype=np.int16),
        0,
        255,
    ).astype(np.uint8)
    ok, note = evaluate_image_full(img)
    assert ok is True
    assert note is None
