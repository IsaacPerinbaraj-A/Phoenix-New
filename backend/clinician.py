"""Deterministic clinician-facing recommendation layer.

Pure Python — no model calls. Derives a referral pathway (static template
keyed by the safety verifier's final band) and a triage priority score used
to order the clinician review queue.

The priority score is an ENGINEERING ordering aid, not a validated
clinical score: it ranks the queue by the deterministic band first, then
by triggered rule count and the history risk score. It can never disagree
with the band ordering owned by agents/safety.py (it reuses BAND_ORDER —
there is still exactly one authoritative urgency implementation).
"""

from typing import Any, Optional

from agents.safety import BAND_ORDER

# Static referral pathways per band. Never generated text.
REFERRAL_PATHWAYS: dict[str, str] = {
    "URGENT": (
        "Refer to the district hospital / dermatologist within 72 hours. "
        "If teledermatology is available, forward the case photograph and "
        "history ahead of arrival."
    ),
    "REVIEW": (
        "Book a clinic or teledermatology review within 2 to 4 weeks. "
        "Include the case photograph and questionnaire in the referral."
    ),
    "MONITOR": (
        "No referral needed now. Advise re-photographing the lesion in "
        "3 months and returning sooner if it changes, bleeds or grows."
    ),
    "INCONCLUSIVE": (
        "Assessment was incomplete — arrange a clinic review within 2 to 4 "
        "weeks regardless. Prioritise obtaining a clearer photograph at "
        "that visit."
    ),
}

PRIORITY_NOTE = (
    "Deterministic ordering aid for the review queue — not a validated "
    "clinical score."
)


def priority_score(
    final_band: Optional[str],
    safety_triggers: Optional[list[str]],
    risk_score: Optional[float],
) -> int:
    """0–100 queue-ordering score. Band dominates (0/25/50/75); triggered
    rules add up to 12 and the history risk score up to 12, so their sum
    (max 24) can never bridge the 25-point gap between bands — a lower
    band can never outrank a higher one."""
    band = final_band if final_band in BAND_ORDER else "INCONCLUSIVE"
    base = BAND_ORDER[band] * 25
    triggers = min(len(safety_triggers or []) * 4, 12)
    risk = min(max(risk_score if risk_score is not None else 0.0, 0.0), 1.0)
    return min(base + triggers + round(risk * 12), 100)


def build_clinician_summary(result: dict[str, Any]) -> dict[str, Any]:
    """Build the clinician block for a completed case result contract."""
    band = result.get("final_band") or "INCONCLUSIVE"
    if band not in BAND_ORDER:
        band = "INCONCLUSIVE"
    triggers = result.get("safety_triggers") or []

    history = result.get("history")
    risk = history.get("risk_score") if isinstance(history, dict) else None

    basis: list[str] = [f"Final band {band}"]
    if triggers:
        basis.append(f"{len(triggers)} safety rule(s) triggered")
    if risk is not None:
        basis.append(f"History risk score {risk:.2f}")
    vision = result.get("vision")
    if isinstance(vision, dict) and "malignant_p" in vision:
        basis.append(
            f"Malignant-group probability {vision['malignant_p']:.2f}"
        )
    else:
        basis.append("No usable image signal")

    return {
        "priority_score": priority_score(band, triggers, risk),
        "referral": REFERRAL_PATHWAYS[band],
        "basis": basis,
        "note": PRIORITY_NOTE,
    }
