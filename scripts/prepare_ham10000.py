"""Download and arrange the HAM10000 dataset automatically.

Fetches "Skin Cancer MNIST: HAM10000" from Kaggle via kagglehub and lays it
out exactly the way the training/eval scripts expect:

    data/ham10000/HAM10000_metadata.csv
    data/ham10000/images/ISIC_*.jpg      (both part folders merged, 10,015 files)

Usage:
    pip install kagglehub
    python scripts/prepare_ham10000.py            # download + arrange
    python scripts/prepare_ham10000.py --source <folder>
        # skip the download and arrange from an already-downloaded/extracted
        # copy (e.g. an unzipped Kaggle archive in Downloads)

Notes:
  * kagglehub caches the raw download (usually under your user profile's
    .cache/kagglehub); after this script succeeds you may delete that cache
    to reclaim ~2.6 GB.
  * If Kaggle refuses anonymous download, sign in once: create an API token
    at kaggle.com -> Settings -> API -> "Create New Token" and place the
    downloaded kaggle.json in %USERPROFILE%\\.kaggle\\  (Windows) or
    ~/.kaggle/ (Linux/macOS), then rerun.
  * Licence reminder: HAM10000 is CC BY-NC-SA 4.0 (non-commercial).
"""

import argparse
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEST = REPO_ROOT / "data" / "ham10000"
EXPECTED_IMAGES = 10015


def download_with_kagglehub() -> Path:
    try:
        import kagglehub  # type: ignore
    except ImportError:
        sys.exit(
            "kagglehub is not installed. Run:\n"
            "    pip install kagglehub\n"
            "then rerun this script."
        )
    print("Downloading HAM10000 from Kaggle (~2.6 GB, cached between runs)…")
    try:
        path = kagglehub.dataset_download("kmader/skin-cancer-mnist-ham10000")
    except Exception as exc:
        sys.exit(
            f"Kaggle download failed: {exc}\n\n"
            "If this is an authentication error: create an API token at\n"
            "kaggle.com -> Settings -> API -> 'Create New Token', put the\n"
            "kaggle.json it gives you into %USERPROFILE%\\.kaggle\\ and rerun.\n"
            "Alternatively, download/extract the zip manually and rerun with\n"
            "    python scripts/prepare_ham10000.py --source <extracted-folder>"
        )
    print(f"Downloaded to cache: {path}")
    return Path(path)


def arrange(source: Path) -> None:
    """Find the metadata CSV and every lesion image under `source` and
    copy them into the canonical data/ham10000 layout. Idempotent."""
    if not source.exists():
        sys.exit(f"Source folder does not exist: {source}")

    csvs = list(source.rglob("HAM10000_metadata*.csv"))
    if not csvs:
        sys.exit(
            f"Could not find HAM10000_metadata.csv anywhere under {source}.\n"
            "Is this the right folder? It should be the extracted Kaggle "
            "archive (or the kagglehub cache)."
        )
    metadata = csvs[0]

    images = [
        p
        for p in source.rglob("ISIC_*.jpg")
        if p.is_file()
    ]
    if not images:
        sys.exit(
            f"Found the metadata CSV but no ISIC_*.jpg images under {source}.\n"
            "If you downloaded the zip manually, make sure it is fully "
            "extracted (including the two image part folders) and rerun."
        )

    images_dir = DEST / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    dest_csv = DEST / "HAM10000_metadata.csv"
    if not dest_csv.exists():
        shutil.copy2(metadata, dest_csv)
        print(f"Copied metadata -> {dest_csv}")
    else:
        print(f"Metadata already in place: {dest_csv}")

    copied = skipped = 0
    total = len(images)
    for i, img in enumerate(images, 1):
        target = images_dir / img.name
        if target.exists():
            skipped += 1
        else:
            shutil.copy2(img, target)
            copied += 1
        if i % 1000 == 0 or i == total:
            print(f"  images: {i}/{total} processed "
                  f"(copied {copied}, already present {skipped})")

    final_count = len(list(images_dir.glob("ISIC_*.jpg")))
    print()
    print(f"Layout ready at: {DEST}")
    print(f"  HAM10000_metadata.csv : present")
    print(f"  images/               : {final_count} files "
          f"(expected {EXPECTED_IMAGES})")
    if final_count != EXPECTED_IMAGES:
        print(
            "WARNING: image count differs from the expected 10,015. "
            "Training will still run, but check that both image part "
            "folders were included in the source."
        )
    print()
    print("Next steps:")
    print("    python backend/models/train_history.py --data-dir data/ham10000")
    print("    python backend/models/train_vision.py  --data-dir data/ham10000 --epochs 15")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=None,
        help=(
            "Arrange from an existing extracted copy instead of downloading "
            "(e.g. the unzipped Kaggle archive folder)."
        ),
    )
    args = parser.parse_args()

    source = args.source if args.source else download_with_kagglehub()
    arrange(source)


if __name__ == "__main__":
    main()
