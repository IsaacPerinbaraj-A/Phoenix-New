"""Train EfficientNet-B0 on HAM10000 for SkinSight's vision agent.

Intended to run on a capable training environment (e.g. Colab GPU); the
resulting checkpoint is copied to backend/models/weights/ for local
inference on the target laptop. The application runtime never trains.

Critical methodology:
  * splits are made by `lesion_id`, NEVER by image index — HAM10000
    contains multiple images of the same lesion and an image-level split
    leaks lesions across train/val/test;
  * class-weighted cross entropy handles class imbalance;
  * a fixed random seed keeps splits and training reproducible;
  * reported metrics headline malignant recall and balanced accuracy,
    not overall accuracy.

Expected data layout (see data/README.md):
    data/ham10000/HAM10000_metadata.csv
    data/ham10000/images/<image_id>.jpg

Usage:
    python backend/models/train_vision.py --data-dir data/ham10000 --epochs 15
"""

import argparse
import json
import random
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import balanced_accuracy_score, recall_score
from sklearn.model_selection import GroupShuffleSplit
from torch.utils.data import DataLoader, Dataset

import timm

# Keep identical to backend/config.py HAM10000_CLASSES ordering:
CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
MALIGNANT = {"akiec", "bcc", "mel"}
SEED = 42
INPUT_SIZE = 224
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def set_seed(seed: int = SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


class HamDataset(Dataset):
    def __init__(self, df: pd.DataFrame, image_dir: Path, train: bool):
        self.df = df.reset_index(drop=True)
        self.image_dir = image_dir
        self.train = train

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int):
        import cv2

        row = self.df.iloc[idx]
        img = cv2.imread(str(self.image_dir / f"{row.image_id}.jpg"))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (INPUT_SIZE, INPUT_SIZE))
        if self.train:
            if random.random() < 0.5:
                img = np.fliplr(img).copy()
            if random.random() < 0.5:
                img = np.flipud(img).copy()
        arr = img.astype(np.float32) / 255.0
        arr = (arr - np.asarray(IMAGENET_MEAN)) / np.asarray(IMAGENET_STD)
        tensor = torch.from_numpy(arr.transpose(2, 0, 1)).float()
        label = CLASSES.index(row.dx)
        return tensor, label


def split_by_lesion(df: pd.DataFrame):
    """Train/val/test split grouped by lesion_id (70/15/15)."""
    gss = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=SEED)
    train_idx, rest_idx = next(gss.split(df, groups=df["lesion_id"]))
    train_df, rest_df = df.iloc[train_idx], df.iloc[rest_idx]

    gss2 = GroupShuffleSplit(n_splits=1, test_size=0.50, random_state=SEED)
    val_idx, test_idx = next(gss2.split(rest_df, groups=rest_df["lesion_id"]))
    return train_df, rest_df.iloc[val_idx], rest_df.iloc[test_idx]


def evaluate(model, loader, device):
    model.eval()
    ys, preds = [], []
    with torch.no_grad():
        for x, y in loader:
            logits = model(x.to(device))
            preds.extend(logits.argmax(1).cpu().tolist())
            ys.extend(y.tolist())
    ys, preds = np.asarray(ys), np.asarray(preds)
    per_class_recall = recall_score(
        ys, preds, average=None, labels=list(range(len(CLASSES))),
        zero_division=0,
    )
    malignant_idx = [CLASSES.index(c) for c in MALIGNANT]
    y_mal = np.isin(ys, malignant_idx).astype(int)
    p_mal = np.isin(preds, malignant_idx).astype(int)
    return {
        "balanced_accuracy": float(balanced_accuracy_score(ys, preds)),
        "per_class_recall": {
            c: float(r) for c, r in zip(CLASSES, per_class_recall)
        },
        "malignant_recall": float(
            recall_score(y_mal, p_mal, zero_division=0)
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).parent / "weights" / "effnet_b0_ham10000.pt",
    )
    args = parser.parse_args()

    set_seed()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training on {device}")

    meta = pd.read_csv(args.data_dir / "HAM10000_metadata.csv")
    image_dir = args.data_dir / "images"
    train_df, val_df, test_df = split_by_lesion(meta)
    print(
        f"Split by lesion_id: train={len(train_df)} "
        f"val={len(val_df)} test={len(test_df)}"
    )

    counts = train_df["dx"].value_counts()
    weights = torch.tensor(
        [len(train_df) / (len(CLASSES) * counts.get(c, 1)) for c in CLASSES],
        dtype=torch.float32,
        device=device,
    )
    criterion = nn.CrossEntropyLoss(weight=weights)

    model = timm.create_model(
        "efficientnet_b0", pretrained=True, num_classes=len(CLASSES)
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)

    loaders = {
        "train": DataLoader(
            HamDataset(train_df, image_dir, train=True),
            batch_size=args.batch_size, shuffle=True, num_workers=2,
        ),
        "val": DataLoader(
            HamDataset(val_df, image_dir, train=False),
            batch_size=args.batch_size, num_workers=2,
        ),
        "test": DataLoader(
            HamDataset(test_df, image_dir, train=False),
            batch_size=args.batch_size, num_workers=2,
        ),
    }

    best_val = -1.0
    args.out.parent.mkdir(parents=True, exist_ok=True)
    for epoch in range(args.epochs):
        model.train()
        total = 0.0
        for x, y in loaders["train"]:
            optimizer.zero_grad()
            loss = criterion(model(x.to(device)), y.to(device))
            loss.backward()
            optimizer.step()
            total += float(loss)
        val_metrics = evaluate(model, loaders["val"], device)
        print(
            f"epoch {epoch + 1}/{args.epochs} "
            f"loss={total / max(len(loaders['train']), 1):.4f} "
            f"val_balanced_acc={val_metrics['balanced_accuracy']:.4f} "
            f"val_malignant_recall={val_metrics['malignant_recall']:.4f}"
        )
        score = val_metrics["malignant_recall"]
        if score > best_val:
            best_val = score
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "classes": CLASSES,
                    "epoch": epoch,
                    "val_metrics": val_metrics,
                    "seed": SEED,
                },
                args.out,
            )
            print(f"  saved checkpoint -> {args.out}")

    # Final evaluation of the best checkpoint on the held-out test split.
    ckpt = torch.load(args.out, map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model_state_dict"])
    test_metrics = evaluate(model, loaders["test"], device)
    report = {
        "split": "test (grouped by lesion_id, seed 42)",
        "metrics": test_metrics,
    }
    report_path = args.out.parent / "vision_test_metrics.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print(f"Report written to {report_path}")


if __name__ == "__main__":
    main()
