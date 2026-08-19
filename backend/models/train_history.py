"""Train the XGBoost structured-history model for DermaTriage.

IMPORTANT — SYNTHETIC DATA NOTICE
HAM10000 does not contain the eight questionnaire variables this model
consumes. The questionnaire fields used here are SYNTHETICALLY GENERATED,
conditioned on each image's diagnosis label, using the explicit and
reproducible rules below. They are NOT real patient histories, and any
resulting performance figure is NOT clinical validation. The model exists
so the prototype has a working, offline-capable tabular risk signal.

Generation rules (all sampled with a fixed seed):
  * age: HAM10000 provides a real `age` column; missing values are drawn
    from a normal distribution (mean 50, sd 15, clipped to 5..90);
  * fitzpatrick: uniform 1..6 (HAM10000 has no skin-type labels — this is
    noise by construction and documented as such);
  * duration_months: malignant-group labels sample shorter durations
    (exponential, mean 8 months) than benign labels (exponential, mean 30);
  * changed_recently: Bernoulli p=0.6 for malignant group, p=0.15 benign;
  * bleeding:         Bernoulli p=0.3 for malignant group, p=0.03 benign;
  * itching:          Bernoulli p=0.3 for malignant group, p=0.15 benign;
  * body_site: mapped from HAM10000 `localization` where possible;
  * family_history_melanoma: Bernoulli p=0.15 for melanoma, p=0.05 else.

Target: 1 if the diagnosis label is in the malignant group, else 0.
The saved model is small and runs on CPU with no network access.

Usage:
    python backend/models/train_history.py --data-dir data/ham10000
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import balanced_accuracy_score, recall_score
from sklearn.model_selection import GroupShuffleSplit

SEED = 42
MALIGNANT = {"akiec", "bcc", "mel"}

# Keep identical to backend/agents/history.py BODY_SITES ordering.
BODY_SITES = [
    "head_neck", "face", "trunk", "back", "arm", "hand",
    "leg", "foot", "palm_sole", "nail", "genital", "other",
]

LOCALIZATION_MAP = {
    "scalp": "head_neck", "ear": "head_neck", "neck": "head_neck",
    "face": "face", "chest": "trunk", "abdomen": "trunk", "trunk": "trunk",
    "back": "back", "upper extremity": "arm", "hand": "hand",
    "lower extremity": "leg", "foot": "foot", "acral": "palm_sole",
    "genital": "genital", "unknown": "other",
}


def synthesize(meta: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Generate the synthetic questionnaire table (see module docstring)."""
    n = len(meta)
    malignant = meta["dx"].isin(MALIGNANT).to_numpy()

    age = meta["age"].to_numpy(dtype=float)
    missing = np.isnan(age)
    age[missing] = np.clip(rng.normal(50, 15, missing.sum()), 5, 90)

    duration = np.where(
        malignant,
        rng.exponential(8.0, n),
        rng.exponential(30.0, n),
    )
    site = (
        meta["localization"].map(LOCALIZATION_MAP).fillna("other").to_numpy()
    )
    df = pd.DataFrame(
        {
            "lesion_id": meta["lesion_id"],
            "age": age,
            "fitzpatrick": rng.integers(1, 7, n),
            "duration_months": np.round(duration, 1),
            "changed_recently": rng.random(n)
            < np.where(malignant, 0.6, 0.15),
            "bleeding": rng.random(n) < np.where(malignant, 0.3, 0.03),
            "itching": rng.random(n) < np.where(malignant, 0.3, 0.15),
            "body_site_idx": [BODY_SITES.index(s) for s in site],
            "family_history_melanoma": rng.random(n)
            < np.where(meta["dx"].eq("mel").to_numpy(), 0.15, 0.05),
            "target": malignant.astype(int),
        }
    )
    df["synthetic"] = True  # every generated row is explicitly marked
    return df


FEATURES = [
    "age", "fitzpatrick", "duration_months", "changed_recently",
    "bleeding", "itching", "body_site_idx", "family_history_melanoma",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).parent / "weights" / "xgb_history.json",
    )
    args = parser.parse_args()

    rng = np.random.default_rng(SEED)
    meta = pd.read_csv(args.data_dir / "HAM10000_metadata.csv")
    df = synthesize(meta, rng)

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    train_idx, test_idx = next(gss.split(df, groups=df["lesion_id"]))
    train, test = df.iloc[train_idx], df.iloc[test_idx]

    dtrain = xgb.DMatrix(
        train[FEATURES].astype(float), label=train["target"]
    )
    dtest = xgb.DMatrix(test[FEATURES].astype(float), label=test["target"])

    pos = train["target"].sum()
    neg = len(train) - pos
    params = {
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "max_depth": 4,
        "eta": 0.1,
        "seed": SEED,
        "scale_pos_weight": float(neg / max(pos, 1)),
    }
    booster = xgb.train(
        params, dtrain, num_boost_round=200,
        evals=[(dtest, "test")], early_stopping_rounds=20,
        verbose_eval=50,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    booster.save_model(str(args.out))

    preds = (booster.predict(dtest) >= 0.5).astype(int)
    y = test["target"].to_numpy()
    report = {
        "data": "SYNTHETIC questionnaires conditioned on HAM10000 labels",
        "clinical_validation": False,
        "split": "grouped by lesion_id, seed 42",
        "balanced_accuracy": float(balanced_accuracy_score(y, preds)),
        "malignant_recall": float(recall_score(y, preds, zero_division=0)),
    }
    report_path = args.out.parent / "history_test_metrics.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print(f"Model saved to {args.out}")


if __name__ == "__main__":
    main()
