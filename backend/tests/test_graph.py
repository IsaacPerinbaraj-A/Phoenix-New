"""Graph routing tests: conditional vision routing and safety finality."""

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from conftest import make_questionnaire  # noqa: E402
from graph import graph  # noqa: E402


def _run_graph(image_path, monkeypatch):
    """Stream a case and return (visited node names, merged final fields)."""
    # Keep tests hermetic: never call a live LLM from the test suite.
    monkeypatch.setenv("DERMATRIAGE_SIMULATE_LLM_FAILURE", "true")
    state = {
        "case_id": "graphtest000000000000000000000000",
        "image_path": str(image_path) if image_path else None,
        "questionnaire": make_questionnaire().model_dump(),
        "language": "en",
    }
    visited = []
    merged = dict(state)
    for update in graph.stream(state, stream_mode="updates"):
        for node, fields in update.items():
            visited.append(node)
            merged.update(fields or {})
    return visited, merged


@pytest.fixture()
def sharp_image(tmp_path):
    # Skin-toned camera-like noise so the non-skin gate passes it.
    rng = np.random.default_rng(42)
    base = np.array([86, 125, 185], dtype=np.int16)  # BGR of a mid tone
    img = np.clip(
        base + rng.integers(-35, 36, size=(256, 256, 3), dtype=np.int16),
        0,
        255,
    ).astype(np.uint8)
    path = tmp_path / "sharp.png"
    cv2.imwrite(str(path), img)
    return path


@pytest.fixture()
def blurry_image(tmp_path):
    img = np.full((256, 256, 3), 128, dtype=np.uint8)
    path = tmp_path / "blurry.png"
    cv2.imwrite(str(path), img)
    return path


def test_acceptable_image_visits_vision_node(sharp_image, monkeypatch):
    visited, merged = _run_graph(sharp_image, monkeypatch)
    assert "vision" in visited
    assert visited[0] == "ingest"
    assert merged["image_ok"] is True


def test_rejected_image_skips_vision_node(blurry_image, monkeypatch):
    visited, merged = _run_graph(blurry_image, monkeypatch)
    assert "vision" not in visited
    assert merged["image_ok"] is False
    assert merged["quality_note"]


def test_no_image_skips_vision_node(monkeypatch):
    visited, merged = _run_graph(None, monkeypatch)
    assert "vision" not in visited
    assert merged["quality_note"] == "No photograph provided."


def test_both_routes_reach_safety_last(sharp_image, blurry_image, monkeypatch):
    for image in (sharp_image, blurry_image):
        visited, merged = _run_graph(image, monkeypatch)
        assert "safety" in visited
        assert visited[-1] == "safety", (
            "No normal path may reach END before the safety node"
        )
        # Safety produced a complete decision on every route.
        assert merged["final_band"] is not None
        assert merged["instruction"]
        assert merged["disclaimer"]


def test_expected_node_order_on_full_path(sharp_image, monkeypatch):
    visited, _ = _run_graph(sharp_image, monkeypatch)
    assert visited == ["ingest", "vision", "history", "reason", "safety"]


def test_expected_node_order_on_degraded_path(blurry_image, monkeypatch):
    visited, _ = _run_graph(blurry_image, monkeypatch)
    assert visited == ["ingest", "history", "reason", "safety"]
