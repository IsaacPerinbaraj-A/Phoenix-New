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
    # Per-case cause statements, built from the case's ACTUAL values as
    # each rule fires. Deterministic and auditable — never generated text.
    explanations: list[str] = []

    # R1 — bleeding lesion
    if q is not None and q.bleeding is True:
        band = _raise_to(band, "URGENT")
        triggers.append("R1_BLEEDING")
        explanations.append(
            "The lesion is reported to be bleeding — bleeding lesions "
            "always need urgent professional assessment."
        )

    # R2 — rapid evolution (changed recently, present under six months)
    if q is not None and q.changed_recently and q.duration_months < 6:
        band = _raise_to(band, "URGENT")
        triggers.append("R2_RAPID_EVOLUTION")
        explanations.append(
            f"The lesion changed recently and has only been present "
            f"{q.duration_months:g} months (under the 6-month rapid-change "
            f"limit)."
        )

    # R3 — new lesion in a patient over 50
    if q is not None and q.age > 50 and q.duration_months < 12:
        band = _raise_to(band, "URGENT")
        triggers.append("R3_NEW_LESION_OVER_50")
        explanations.append(
            f"The patient is {q.age} (over 50) and this lesion appeared "
            f"only {q.duration_months:g} months ago (under 12) — new "
            f"lesions at this age warrant urgent review."
        )

    # R4 — family history of melanoma plus recent change
    if q is not None and q.family_history_melanoma and q.changed_recently:
        band = _raise_to(band, "URGENT")
        triggers.append("R4_FAMILY_HISTORY")
        explanations.append(
            "There is a family history of melanoma and the lesion changed "
            "recently — this combination always escalates to urgent."
        )

    # R5 — concerning image signal (at least REVIEW)
    if state.vision and state.vision.malignant_p > MALIGNANT_P_REVIEW_THRESHOLD:
        band = _raise_to(band, "REVIEW")
        triggers.append("R5_MALIGNANT_SIGNAL")
        explanations.append(
            f"The image model put {state.vision.malignant_p:.0%} probability "
            f"on the concerning lesion group, above the "
            f"{MALIGNANT_P_REVIEW_THRESHOLD:.0%} review threshold."
        )

    # R6 — high image signal (URGENT)
    if state.vision and state.vision.malignant_p > MALIGNANT_P_URGENT_THRESHOLD:
        band = _raise_to(band, "URGENT")
        triggers.append("R6_HIGH_MALIGNANT_SIGNAL")
        explanations.append(
            f"That probability ({state.vision.malignant_p:.0%}) is also "
            f"above the {MALIGNANT_P_URGENT_THRESHOLD:.0%} urgent threshold."
        )

    # R7 — defensive: no usable image AND no questionnaire/history at all.
    # The normal API always supplies a questionnaire, so this rule is
    # ordinarily unreachable, but the protection is kept deliberately.
    if not state.image_ok and q is None and state.history is None:
        band = _raise_to(band, "INCONCLUSIVE")
        triggers.append("R7_NO_USABLE_INPUT")
        explanations.append(
            "Neither a usable photograph nor any patient history was "
            "available, so no reliable assessment could be made."
        )

    # R8 — reasoning unavailable (at least INCONCLUSIVE)
    if state.reasoning is None:
        band = _raise_to(band, "INCONCLUSIVE")
        triggers.append("R8_LLM_FAILED")
        explanations.append(
            "The explanation model was unavailable, so the case is "
            "automatically treated with extra caution."
        )

    # R9 — low vision confidence (at least INCONCLUSIVE)
    if state.vision and state.vision.confidence < LOW_CONFIDENCE_THRESHOLD:
        band = _raise_to(band, "INCONCLUSIVE")
        triggers.append("R9_LOW_CONFIDENCE")
        explanations.append(
            f"The image model's confidence was low "
            f"({state.vision.confidence:.0%}, under "
            f"{LOW_CONFIDENCE_THRESHOLD:.0%}), so its output alone cannot "
            f"be relied on."
        )

    if not triggers and state.reasoning is not None:
        explanations.append(
            f"No deterministic red flags were found; the urgency follows "
            f"the advisory assessment ({state.reasoning.suggested_band})."
        )

    final_band: Band = band  # type: ignore[assignment]

    state.final_band = final_band
    state.safety_triggers = triggers
    state.safety_explanations = explanations
    # The actionable instruction is ALWAYS a static template lookup keyed by
    # the deterministic band — generated text can never become the action.
    state.instruction = get_instruction(final_band, state.language)
    state.disclaimer = get_disclaimer(state.language)
    return state
