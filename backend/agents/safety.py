"""Agent 5 — Deterministic Safety Verifier.

This module owns the final urgency band and the actionable instruction.

Hard invariants (enforced by tests in tests/test_safety.py):
  * pure Python only — no model inference, no network calls, no ML imports;
  * every rule may only ESCALATE urgency, never lower it;
  * the LLM's suggested band is advisory input, nothing more;
  * every path through this module produces an instruction and disclaimer;
  * this is the single authoritative final-band implementation.
"""

from schemas import Band, CaseState
from templates import get_disclaimer, get_instruction

# Monotonic ordering of bands. Higher value = more urgent handling.
BAND_ORDER: dict[str, int] = {
    "MONITOR": 0,
    "REVIEW": 1,
    "INCONCLUSIVE": 2,
    "URGENT": 3,
}

# Thresholds used by the image-signal rules. Engineering defaults, not
# clinically validated cut-offs.
MALIGNANT_P_REVIEW_THRESHOLD = 0.15
MALIGNANT_P_URGENT_THRESHOLD = 0.40
LOW_CONFIDENCE_THRESHOLD = 0.35


def _raise_to(current: str, target: str) -> str:
    """Monotonic escalation: return whichever band is more urgent."""
    return max(current, target, key=lambda band: BAND_ORDER[band])


def safety_verifier(state: CaseState) -> CaseState:
    """Evaluate every deterministic rule and set the final decision.

    All applicable rules are evaluated — evaluation never stops at the
    first trigger — and every triggered rule identifier is recorded.
    """
    q = state.questionnaire

    # Initial band: the LLM's advisory suggestion when reasoning succeeded,
    # otherwise fail safe to INCONCLUSIVE.
    if state.reasoning is not None:
        band: str = state.reasoning.suggested_band
    else:
        band = "INCONCLUSIVE"

    triggers: list[str] = []

    # R1 — bleeding lesion
    if q is not None and q.bleeding is True:
        band = _raise_to(band, "URGENT")
        triggers.append("R1_BLEEDING")

    # R2 — rapid evolution (changed recently, present under six months)
    if q is not None and q.changed_recently and q.duration_months < 6:
        band = _raise_to(band, "URGENT")
        triggers.append("R2_RAPID_EVOLUTION")

    # R3 — new lesion in a patient over 50
    if q is not None and q.age > 50 and q.duration_months < 12:
        band = _raise_to(band, "URGENT")
        triggers.append("R3_NEW_LESION_OVER_50")

    # R4 — family history of melanoma plus recent change
    if q is not None and q.family_history_melanoma and q.changed_recently:
        band = _raise_to(band, "URGENT")
        triggers.append("R4_FAMILY_HISTORY")

    # R5 — concerning image signal (at least REVIEW)
    if state.vision and state.vision.malignant_p > MALIGNANT_P_REVIEW_THRESHOLD:
        band = _raise_to(band, "REVIEW")
        triggers.append("R5_MALIGNANT_SIGNAL")

    # R6 — high image signal (URGENT)
    if state.vision and state.vision.malignant_p > MALIGNANT_P_URGENT_THRESHOLD:
        band = _raise_to(band, "URGENT")
        triggers.append("R6_HIGH_MALIGNANT_SIGNAL")

    # R7 — defensive: no usable image AND no questionnaire/history at all.
    # The normal API always supplies a questionnaire, so this rule is
    # ordinarily unreachable, but the protection is kept deliberately.
    if not state.image_ok and q is None and state.history is None:
        band = _raise_to(band, "INCONCLUSIVE")
        triggers.append("R7_NO_USABLE_INPUT")

    # R8 — reasoning unavailable (at least INCONCLUSIVE)
    if state.reasoning is None:
        band = _raise_to(band, "INCONCLUSIVE")
        triggers.append("R8_LLM_FAILED")

    # R9 — low vision confidence (at least INCONCLUSIVE)
    if state.vision and state.vision.confidence < LOW_CONFIDENCE_THRESHOLD:
        band = _raise_to(band, "INCONCLUSIVE")
        triggers.append("R9_LOW_CONFIDENCE")

    final_band: Band = band  # type: ignore[assignment]

    state.final_band = final_band
    state.safety_triggers = triggers
    # The actionable instruction is ALWAYS a static template lookup keyed by
    # the deterministic band — generated text can never become the action.
    state.instruction = get_instruction(final_band, state.language)
    state.disclaimer = get_disclaimer(state.language)
    return state
