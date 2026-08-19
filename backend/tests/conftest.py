"""Shared fixtures and case builders for the DermaTriage test suite."""

import sys
from pathlib import Path
from typing import Optional

# Defensive path setup (pytest.ini also sets pythonpath = backend).
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from schemas import (  # noqa: E402
    CaseState,
    HistoryOutput,
    Questionnaire,
    ReasoningOutput,
    VisionOutput,
)

_Q_DEFAULTS = dict(
    age=30,
    fitzpatrick=3,
    duration_months=24.0,
    changed_recently=False,
    bleeding=False,
    itching=False,
    body_site="arm",
    family_history_melanoma=False,
)


def make_questionnaire(**overrides) -> Questionnaire:
    """A benign default questionnaire (triggers no safety rule)."""
    return Questionnaire(**{**_Q_DEFAULTS, **overrides})


def make_reasoning(band: str = "MONITOR") -> ReasoningOutput:
    return ReasoningOutput(
        abcde={
            "A": "No asymmetry evidence supplied.",
            "B": "Borders not remarkable in supplied evidence.",
            "C": "Colour information limited.",
            "D": "Reliable diameter information was not available.",
            "E": "No evolution reported.",
        },
        suggested_band=band,  # type: ignore[arg-type]
        rationale="Advisory only; the deterministic engine decides.",
    )


def make_case(
    *,
    bleeding: bool = False,
    llm_band: str = "MONITOR",
    reasoning="auto",
    confidence: float = 0.9,
    malignant_p: float = 0.05,
    with_vision: bool = True,
    image_ok: bool = True,
    with_questionnaire: bool = True,
    with_history: bool = True,
    **q_overrides,
) -> CaseState:
    """Build a CaseState in an arbitrary pre-safety configuration.

    reasoning:
        "auto"  -> a ReasoningOutput suggesting `llm_band`
        None    -> simulated LLM failure
    """
    questionnaire: Optional[Questionnaire] = None
    if with_questionnaire:
        questionnaire = make_questionnaire(bleeding=bleeding, **q_overrides)

    vision: Optional[VisionOutput] = None
    if with_vision:
        vision = VisionOutput(
            probs={"nv": 1.0 - malignant_p, "mel": malignant_p},
            malignant_p=malignant_p,
            confidence=confidence,
        )

    history: Optional[HistoryOutput] = None
    if with_history and questionnaire is not None:
        history = HistoryOutput(risk_score=0.2, red_flags=[])

    if reasoning == "auto":
        reasoning_out: Optional[ReasoningOutput] = make_reasoning(llm_band)
    else:
        reasoning_out = reasoning

    return CaseState(
        case_id="testcase00000000000000000000000000",
        image_path=None,
        questionnaire=questionnaire,
        image_ok=image_ok,
        vision=vision,
        history=history,
        reasoning=reasoning_out,
    )
