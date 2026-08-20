"""Fairness / bias reporting scaffold for the SkinSight vision model.

Goal: per-Fitzpatrick-group performance (malignant recall, balanced
accuracy) using a dataset that actually carries skin-type labels
(Fitzpatrick17k), producing eval/out/bias_metrics.csv.

Honest limitations, stated up front:
  * HAM10000 (the training set) has NO Fitzpatrick labels and known
    under-representation of darker skin tones; vision performance may
    degrade on darker skin.
  * Fitzpatrick17k labels differ from HAM10000's seven classes; a
    documented label mapping supplied by the evaluator is REQUIRED — this
    script refuses to guess one.
  * The deterministic history safety rules are image-independent, which
    mitigates but does NOT eliminate the vision model's fairness
    limitations. Nothing here makes the system "unbiased".

This script only writes numbers produced by genuinely running the model.
If the required inputs are missing it prints "Not yet evaluated" and exits.

Usage:
    python eval/bias_report.py \
        --data-csv data/fitzpatrick17k/fitzpatrick17k.csv \
        --image-dir data/fitzpatrick17k/images \
        --label-map eval/fitzpatrick17k_label_map.json
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

OUT_DIR = Path(__file__).resolve().parent / "out"

GROUPS = {
    "I-II": (1, 2),
    "III-IV": (3, 4),
    "V-VI": (5, 6),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-csv", type=Path, required=True)
    parser.add_argument("--image-dir", type=Path, required=True)
    parser.add_argument(
        "--label-map",
        type=Path,
        required=True,
        help=(
            "JSON mapping Fitzpatrick17k condition labels to "
            "{'malignant': true/false}; you must document this mapping."
        ),
    )
    parser.add_argument(
        "--weights",
        type=Path,
        default=REPO_ROOT / "backend" / "models" / "weights" / "effnet_b0_ham10000.pt",
    )
    args = parser.parse_args()

    for path, what in (
        (args.weights, "vision checkpoint"),
        (args.data_csv, "Fitzpatrick17k csv"),
        (args.image_dir, "Fitzpatrick17k images"),
        (args.label_map, "label mapping"),
    ):
        if not path.exists():
            sys.exit(f"Not yet evaluated: missing {what} at {path}.")

    import numpy as np
    import pandas as pd
    import torch
    from sklearn.metrics import balanced_accuracy_score, recall_score

    import cv2
    import timm
    from config import (
        HAM10000_CLASSES,
        IMAGENET_MEAN,
        IMAGENET_STD,
        MALIGNANT_CLASSES,
        VISION_INPUT_SIZE,
    )

    label_map = json.loads(args.label_map.read_text())
    df = pd.read_csv(args.data_csv)
    df = df[df["fitzpatrick_scale"].between(1, 6)]
    df = df[df["label"].isin(label_map)]
    if df.empty:
        sys.exit("Not yet evaluated: no rows match the supplied label map.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = timm.create_model(
        "efficientnet_b0", pretrained=False, num_classes=len(HAM10000_CLASSES)
    )
    ckpt = torch.load(args.weights, map_location=device, weights_only=True)
    model.load_state_dict(ckpt.get("model_state_dict", ckpt))
    model.to(device).eval()

    malignant_idx = [
        i for i, c in enumerate(HAM10000_CLASSES) if c in MALIGNANT_CLASSES
    ]

    rows = []
    y_true, y_pred, scales = [], [], []
    for _, row in df.iterrows():
        img_path = args.image_dir / f"{row['md5hash']}.jpg"
        if not img_path.exists():
            continue
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (VISION_INPUT_SIZE, VISION_INPUT_SIZE))
        arr = img.astype(np.float32) / 255.0
        arr = (arr - np.asarray(IMAGENET_MEAN)) / np.asarray(IMAGENET_STD)
        t = torch.from_numpy(arr.transpose(2, 0, 1)).float().unsqueeze(0)
        with torch.no_grad():
            probs = torch.softmax(model(t.to(device)), dim=1)[0].cpu().numpy()
        pred_malignant = int(probs[malignant_idx].sum() > 0.5)
        y_true.append(int(bool(label_map[row["label"]]["malignant"])))
        y_pred.append(pred_malignant)
        scales.append(int(row["fitzpatrick_scale"]))

    if not y_true:
        sys.exit("Not yet evaluated: no images could be read.")

    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    scales = np.asarray(scales)

    for group, (lo, hi) in GROUPS.items():
        mask = (scales >= lo) & (scales <= hi)
        n = int(mask.sum())
        if n == 0:
            rows.append({"fitzpatrick_group": group, "n": 0,
                         "malignant_recall": None, "balanced_accuracy": None})
            continue
        rows.append(
            {
                "fitzpatrick_group": group,
                "n": n,
                "malignant_recall": float(
                    recall_score(y_true[mask], y_pred[mask], zero_division=0)
                ),
                "balanced_accuracy": float(
                    balanced_accuracy_score(y_true[mask], y_pred[mask])
                ),
            }
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_csv = OUT_DIR / "bias_metrics.csv"
    pd.DataFrame(rows).to_csv(out_csv, index=False)
    print(pd.DataFrame(rows).to_string(index=False))
    print(f"Wrote {out_csv}")
    print(
        "Reminder: image-independent safety rules mitigate but do not "
        "eliminate vision-model fairness limitations."
    )


if __name__ == "__main__":
    main()
