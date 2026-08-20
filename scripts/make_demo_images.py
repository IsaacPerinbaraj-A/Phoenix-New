"""Generate the synthetic demo images used by the demo fixtures.

Both images are seeded synthetic textures — NOT skin lesions, NOT patient
data. They demonstrate the image-quality gate and pipeline routing:

    demo/images/sharp_synthetic.png  passes the quality gate (Beats 1/2)
    demo/images/blurry.png           rejected as too blurry (Beat 3)

Run:
    python scripts/make_demo_images.py
"""

import sys
from pathlib import Path

import numpy as np

OUT_DIR = Path(__file__).resolve().parents[1] / "demo" / "images"
SEED = 42


def main() -> int:
    try:
        import cv2
    except ImportError:
        print("OpenCV is required: pip install -r backend/requirements.txt")
        return 1

    rng = np.random.default_rng(SEED)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Sharp: skin-toned textured noise with a soft dark blob in the
    # centre, so the frame passes the quality AND skin-presence gates
    # while staying obviously synthetic. High Laplacian variance ->
    # passes the blur gate.
    base_tone = np.array([86, 125, 185], dtype=np.int16)  # BGR skin tone
    base = np.clip(
        base_tone + rng.integers(-35, 36, size=(512, 512, 3)), 0, 255
    ).astype(np.uint8)
    yy, xx = np.mgrid[0:512, 0:512]
    blob = np.exp(-(((yy - 256) ** 2 + (xx - 256) ** 2) / (2 * 80.0**2)))
    sharp = (base * (1.0 - 0.45 * blob[..., None])).astype(np.uint8)
    sharp_path = OUT_DIR / "sharp_synthetic.png"
    cv2.imwrite(str(sharp_path), sharp)

    # Blurry: heavy Gaussian blur of the same frame -> Laplacian variance
    # collapses and the ingestion agent rejects it.
    blurry = cv2.GaussianBlur(sharp, (101, 101), 40)
    blurry_path = OUT_DIR / "blurry.png"
    cv2.imwrite(str(blurry_path), blurry)

    # Sanity-report the quality metrics the ingestion agent will compute.
    for name, img in (("sharp_synthetic", sharp), ("blurry", blurry)):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        print(
            f"{name}.png  laplacian_var={blur_var:.1f}  "
            f"brightness={float(img.mean()):.1f}"
        )

    print(f"Wrote {sharp_path} and {blurry_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
