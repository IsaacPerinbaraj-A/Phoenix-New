"""Compute the out-of-distribution gate statistics from HAM10000.

Embeds every training image with the trained EfficientNet checkpoint,
stores the per-diagnosis-class mean embeddings, and sets the acceptance
threshold to a low percentile of the training images' own best cosine
similarity — so, by construction, ~(100 - percentile)% of training-like
images pass the gate.

Run AFTER training the vision model, on the machine that has the dataset
and the checkpoint:

    python backend/models/compute_ood_stats.py --data-dir data/ham10000

Output: backend/models/weights/ood_stats.npz. Once it exists (and the
vision checkpoint loads), the ingestion gate starts rejecting photographs
that do not resemble the training distribution; /api/health reports it
as "ood_gate". Loosen at runtime with DERMATRIAGE_OOD_MIN_SIMILARITY
(e.g. 0.5) if genuine smartphone field photos are rejected too often —
the training set is dermatoscopic, so this gate is inherently strict.
"""

import argparse
import sys
from pathlib import Path

import numpy as np

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument(
        "--percentile",
        type=float,
        default=1.0,
        help="Training-similarity percentile used as the acceptance "
        "threshold (default 1.0 -> ~99%% of training-like images pass).",
    )
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).parent / "weights" / "ood_stats.npz",
    )
    args = parser.parse_args()

    import cv2
    import pandas as pd
    import torch

    from agents.vision import _load_model
    from config import (
        HAM10000_CLASSES,
        IMAGENET_MEAN,
        IMAGENET_STD,
        VISION_INPUT_SIZE,
    )

    meta_csv = args.data_dir / "HAM10000_metadata.csv"
    image_dir = args.data_dir / "images"
    if not meta_csv.exists():
        sys.exit(f"Dataset metadata missing at {meta_csv} (see data/README.md).")

    model = _load_model()
    if model is None:
        sys.exit(
            "Vision checkpoint could not be loaded — train it first "
            "(backend/models/train_vision.py)."
        )
    device = next(model.parameters()).device
    print(f"Embedding on {device}")

    mean = np.asarray(IMAGENET_MEAN)
    std = np.asarray(IMAGENET_STD)

    def load_tensor(image_id):
        img = cv2.imread(str(image_dir / f"{image_id}.jpg"))
        if img is None:
            return None
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        rgb = cv2.resize(rgb, (VISION_INPUT_SIZE, VISION_INPUT_SIZE))
        arr = (rgb.astype(np.float32) / 255.0 - mean) / std
        return torch.from_numpy(arr.transpose(2, 0, 1)).float()

    meta = pd.read_csv(meta_csv)
    embeddings, labels = [], []
    batch, batch_labels = [], []

    def flush():
        if not batch:
            return
        with torch.no_grad():
            x = torch.stack(batch).to(device)
            feats = model.forward_features(x)
            try:
                emb = model.forward_head(feats, pre_logits=True)
            except Exception:
                emb = feats.mean(dim=(2, 3))
        embeddings.append(emb.cpu().numpy())
        labels.extend(batch_labels)
        batch.clear()
        batch_labels.clear()

    skipped = 0
    for i, row in enumerate(meta.itertuples(), 1):
        t = load_tensor(row.image_id)
        if t is None:
            skipped += 1
            continue
        batch.append(t)
        batch_labels.append(row.dx)
        if len(batch) >= args.batch_size:
            flush()
        if i % 1000 == 0:
            print(f"  {i}/{len(meta)} images embedded")
    flush()

    if not embeddings:
        sys.exit("No images could be embedded — check the dataset layout.")
    emb = np.concatenate(embeddings, axis=0).astype(np.float32)
    labels = np.asarray(labels)
    print(f"Embedded {len(emb)} images ({skipped} unreadable, skipped).")

    means = np.stack(
        [
            emb[labels == cls].mean(axis=0)
            if (labels == cls).any()
            else emb.mean(axis=0)
            for cls in HAM10000_CLASSES
        ]
    ).astype(np.float32)

    # Best cosine similarity of every training image to any class mean.
    e = emb / (np.linalg.norm(emb, axis=1, keepdims=True) + 1e-8)
    m = means / (np.linalg.norm(means, axis=1, keepdims=True) + 1e-8)
    sims = (e @ m.T).max(axis=1)
    threshold = float(np.percentile(sims, args.percentile))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    np.savez(
        args.out,
        means=means,
        threshold=threshold,
        classes=np.asarray(HAM10000_CLASSES),
        percentile=args.percentile,
    )
    print(
        f"Saved {args.out}\n"
        f"  threshold (p{args.percentile:g} of training similarity): {threshold:.4f}\n"
        f"  training-similarity range: {sims.min():.4f} .. {sims.max():.4f}\n"
        "The distribution gate is now active. Loosen at runtime with "
        "DERMATRIAGE_OOD_MIN_SIMILARITY if genuine field photos are "
        "rejected too often."
    )


if __name__ == "__main__":
    main()
