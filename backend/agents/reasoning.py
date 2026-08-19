"""Agent 4 — Reasoning: LLM supporting explanation via local Ollama.

Produces ABCDE-style explanatory text and an ADVISORY urgency band. It has
no authority over the final decision and never writes the actionable
instruction. Any failure (Ollama down, timeout, invalid JSON, schema
mismatch, empty response, unexpected exception) sets `state.reasoning = None`
so the deterministic safety rule R8 fails the case safe.
"""

import json
import logging
import os

from config import (
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT_S,
    OLLAMA_URL,
    SIMULATE_LLM_FAILURE_ENV,
)
from schemas import CaseState, ReasoningOutput

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a clinical reasoning assistant supporting a triage system.
You do NOT diagnose disease.
Assess only the supplied evidence using ABCDE-style criteria.
NEVER present a disease name as a conclusion.
Do not state that the patient has cancer, melanoma, carcinoma, or a tumour.
Do not fabricate observations that are absent from the supplied evidence.
Numeric lesion diameter is not collected: the "D" field must not invent a measurement; it may state that reliable diameter information was not available.
Your urgency suggestion is advisory only. A deterministic safety engine makes the final decision.
Return ONLY valid JSON matching this schema:
{"abcde": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."},
 "suggested_band": "URGENT|REVIEW|MONITOR|INCONCLUSIVE",
 "rationale": "..."}
No markdown fences.
Use short, plain-language descriptions.
The rationale must be no more than two sentences."""


def ollama_available() -> bool:
    """Readiness check used by /api/health (real request, short timeout)."""
    try:
        import requests  # type: ignore

        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        return resp.status_code == 200
    except Exception:
        return False


def _build_evidence(state: CaseState) -> str:
    """Assemble all available evidence for the model, marking gaps."""
    evidence: dict = {
        "image_quality": {
            "image_usable": state.image_ok,
            "quality_note": state.quality_note,
        }
    }
    if state.vision is not None:
        evidence["vision_model"] = {
            "class_probabilities": state.vision.probs,
            "malignant_group_probability": state.vision.malignant_p,
            "confidence": state.vision.confidence,
        }
    else:
        evidence["vision_model"] = "unavailable (no usable image analysis)"
    if state.questionnaire is not None:
        evidence["patient_history"] = state.questionnaire.model_dump()
    if state.history is not None:
        evidence["history_risk_model"] = {
            "risk_score": state.history.risk_score,
            "red_flags": state.history.red_flags,
        }
    return json.dumps(evidence, indent=2)


def reasoning_agent(state: CaseState) -> CaseState:
    """Ask the local LLM for a schema-validated supporting explanation."""
    # Development switch to demonstrate the R8 fail-safe path (demo Case D).
    if os.getenv(SIMULATE_LLM_FAILURE_ENV, "").lower() == "true":
        logger.info("Simulating LLM failure (%s).", SIMULATE_LLM_FAILURE_ENV)
        state.reasoning = None
        return state

    try:
        import requests  # type: ignore

        resp = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            "Evidence for this case:\n"
                            + _build_evidence(state)
                            + "\nReturn the JSON now."
                        ),
                    },
                ],
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.2},
            },
            timeout=OLLAMA_TIMEOUT_S,
        )
        resp.raise_for_status()
        content = resp.json().get("message", {}).get("content", "")
        if not content or not content.strip():
            raise ValueError("Empty LLM response")
        # Never trust that the model returned valid JSON — parse + validate.
        parsed = json.loads(content)
        state.reasoning = ReasoningOutput.model_validate(parsed)
        logger.info(
            "Reasoning succeeded (model=%s, advisory band=%s).",
            OLLAMA_MODEL,
            state.reasoning.suggested_band,
        )
    except Exception:
        # Broad boundary is intentional: ANY reasoning failure must degrade
        # safely (R8) rather than crash the HTTP request. Logged server-side.
        logger.exception("Reasoning agent failed; setting reasoning=None.")
        state.reasoning = None
    return state
