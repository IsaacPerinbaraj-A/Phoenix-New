"""Agent 3 — History: structured-history risk score, independent of vision.

Uses a trained XGBoost model when its weights are available; otherwise
falls back to a small, transparent heuristic and labels the output source
accordingly. Red flags are deterministic restatements of questionnaire
facts and are always computed.
"""

import logging
from typing import Optional

from config import HISTORY_WEIGHTS_PATH
from schemas import CaseState, HistoryOutput, Questionnaire

logger = logging.getLogger(__name__)

# Fixed body-site vocabulary shared with training (train_history.py).
BODY_SITES = [
    "head_neck",
    "face",
    "trunk",
    "back",
    "arm",
    "hand",
    "leg",
    "foot",
    "palm_sole",
    "nail",
    "genital",
    "other",
]

_model = None
_load_attempted = False


def _load_model():
    """Load the XGBoost model once; never crash the server if missing."""
    global _model, _load_attempted
    if _load_attempted:
        return _model
    _load_attempted = True
    try:
        if not HISTORY_WEIGHTS_PATH.exists():
            logger.warning(
                "History model weights not found at %s; using heuristic.",
                HISTORY_WEIGHTS_PATH,
            )
            return None
        import xgboost as xgb  # type: ignore

        booster = xgb.Booster()
        booster.load_model(str(HISTORY_WEIGHTS_PATH))
        _model = booster
        logger.info("History XGBoost model loaded.")
    except Exception:
        logger.exception("Failed to load history model; using heuristic.")
        _model = None
    return _model


def history_model_available() -> bool:
    """Readiness check used by /api/health."""
    return _load_model() is not None


def encode_features(q: Questionnaire) -> list[float]:
    """Encode the eight questionnaire fields as a fixed-order vector."""
    site = q.body_site.strip().lower().replace(" ", "_").replace("/", "_")
    site_idx = BODY_SITES.index(site) if site in BODY_SITES else len(BODY_SITES) - 1
    return [
        float(q.age),
        float(q.fitzpatrick),
        float(q.duration_months),
        1.0 if q.changed_recently else 0.0,
        1.0 if q.bleeding else 0.0,
        1.0 if q.itching else 0.0,
        float(site_idx),
        1.0 if q.family_history_melanoma else 0.0,
    ]


def _red_flags(q: Questionnaire) -> list[str]:
    """Deterministic restatement of concerning questionnaire facts."""
    flags: list[str] = []
    if q.bleeding:
        flags.append("Lesion is bleeding")
    if q.changed_recently and q.duration_months < 6:
        flags.append("Rapid recent change in a new lesion")
    elif q.changed_recently:
        flags.append("Lesion changed recently")
    if q.age > 50 and q.duration_months < 12:
        flags.append("New lesion in a patient over 50")
    if q.family_history_melanoma:
        flags.append("Family history of melanoma")
    return flags


def _heuristic_risk(q: Questionnaire) -> float:
    """Transparent fallback score in [0, 1] when no trained model exists.

    This is NOT a clinical score; it simply mirrors the deterministic red
    flags so the UI has a bounded number to display in degraded mode.
    """
    score = 0.1
    if q.bleeding:
        score += 0.3
    if q.changed_recently:
        score += 0.2
    if q.duration_months < 6:
        score += 0.1
    if q.age > 50:
        score += 0.1
    if q.family_history_melanoma:
        score += 0.15
    if q.itching:
        score += 0.05
    return min(score, 1.0)


def history_agent(state: CaseState) -> CaseState:
    """Produce HistoryOutput from the questionnaire alone."""
    q: Optional[Questionnaire] = state.questionnaire
    if q is None:
        # Defensive: the API always supplies a questionnaire.
        state.history = None
        return state

    flags = _red_flags(q)
    booster = _load_model()
    if booster is not None:
        try:
            import numpy as np  # type: ignore
            import xgboost as xgb  # type: ignore

            dmat = xgb.DMatrix(
                np.asarray([encode_features(q)], dtype=float)
            )
            risk = float(booster.predict(dmat)[0])
            risk = min(max(risk, 0.0), 1.0)
            state.history = HistoryOutput(
                risk_score=risk, red_flags=flags, source="xgboost"
            )
            return state
        except Exception:
            logger.exception(
                "History model inference failed; using heuristic."
            )

    state.history = HistoryOutput(
        risk_score=_heuristic_risk(q), red_flags=flags, source="heuristic"
    )
    return state
