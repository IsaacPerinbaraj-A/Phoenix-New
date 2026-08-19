"""Reproducible evaluation of the trained vision model on HAM10000.

Produces (under eval/out/):
    metrics.json          — balanced accuracy, per-class recall, malignant recall
    confusion_matrix.png  — test-split confusion matrix

Nothing here fabricates numbers: every value comes from actually running
the checkpoint over the held-out test split (grouped by lesion_id, seed 42,
identical to the training split). If the checkpoint or dataset is missing,
the script exits with a clear message instead of inventing results.

Usage:
    python eval/metrics.py --data-dir data/ham10000
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "backend" / "models"))

OUT_DIR = Path(__file__).resolve().parent / "out"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument(
        "--weights",
        type=Path,
        default=REPO_ROOT / "backend" / "models" / "weights" / "effnet_b0_ham10000.pt",
    )
    args = parser.parse_args()

    if not args.weights.exists():
        sys.exit(
            f"Not yet evaluated: checkpoint missing at {args.weights}. "
            "Train the vision model first (backend/models/train_vision.py)."
        )
    meta_csv = args.data_dir / "HAM10000_metadata.csv"
    if not meta_csv.exists():
        sys.exit(
            f"Not yet evaluated: dataset metadata missing at {meta_csv}. "
            "See data/README.md."
        )

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    import pandas as pd
    import torch
    from sklearn.metrics import confusion_matrix
    from torch.utils.data import DataLoader

    import timm
    from train_vision import (
        CLASSES,
        HamDataset,
        evaluate,
        set_seed,
        split_by_lesion,
    )

    set_seed()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    meta = pd.read_csv(meta_csv)
    _, _, test_df = split_by_lesion(meta)
    loader = DataLoader(
        HamDataset(test_df, args.data_dir / "images", train=False),
        batch_size=32,
    )

    model = timm.create_model(
        "efficientnet_b0", pretrained=False, num_classes=len(CLASSES)
    )
    ckpt = torch.load(args.weights, map_location=device, weights_only=True)
    model.load_state_dict(ckpt.get("model_state_dict", ckpt))
    model.to(device).eval()

    metrics = evaluate(model, loader, device)

    ys, preds = [], []
    with torch.no_grad():
        for x, y in loader:
            preds.extend(model(x.to(device)).argmax(1).cpu().tolist())
            ys.extend(y.tolist())
    cm = confusion_matrix(ys, preds, labels=list(range(len(CLASSES))))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "metrics.json").write_text(
        json.dumps(
            {
                "split": "test (grouped by lesion_id, seed 42)",
                "n_test_images": len(test_df),
                "metrics": metrics,
            },
            indent=2,
        )
    )

    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(CLASSES)), CLASSES)
    ax.set_yticks(range(len(CLASSES)), CLASSES)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title("HAM10000 test split (lesion_id-grouped) confusion matrix")
    for i in range(len(CLASSES)):
        for j in range(len(CLASSES)):
            ax.text(j, i, int(cm[i, j]), ha="center", va="center", fontsize=8)
    fig.colorbar(im)
    fig.tight_layout()
    fig.savefig(OUT_DIR / "confusion_matrix.png", dpi=150)

    print(json.dumps(metrics, indent=2))
    print(f"Wrote {OUT_DIR / 'metrics.json'} and confusion_matrix.png")


if __name__ == "__main__":
    main()
