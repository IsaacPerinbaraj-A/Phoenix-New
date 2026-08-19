"""Safety verifier tests — the most important suite in the project.

Proves: monotonic escalation, every R1-R9 rule, fail-safe behaviour,
instruction totality, and structural isolation of the safety module from
every ML/LLM/network dependency.
"""

import ast
import inspect
import itertools

import agents.safety as safety_module
from agents.safety import BAND_ORDER, _raise_to, safety_verifier
from conftest import make_case
from templates import DISCLAIMER, INSTRUCTIONS

# ---------------------------------------------------------------------------
# Core invariants required by the specification
# ---------------------------------------------------------------------------


def test_llm_cannot_downgrade_bleeding_lesion():
    state = make_case(bleeding=True, llm_band="MONITOR")
    out = safety_verifier(state)
    assert out.final_band == "URGENT"
    assert "R1_BLEEDING" in out.safety_triggers


def test_llm_failure_fails_safe():
    out = safety_verifier(make_case(reasoning=None))
    assert out.final_band == "INCONCLUSIVE"
    assert out.instruction


def test_low_confidence_never_returns_monitor():
    state = make_case(llm_band="MONITOR", confidence=0.2)
    assert safety_verifier(state).final_band != "MONITOR"


# ---------------------------------------------------------------------------
# Individual rules
# ---------------------------------------------------------------------------


def test_r1_bleeding_forces_urgent():
    out = safety_verifier(make_case(bleeding=True, llm_band="REVIEW"))
    assert out.final_band == "URGENT"
    assert "R1_BLEEDING" in out.safety_triggers


def test_r2_rapid_evolution_forces_urgent():
    out = safety_verifier(
        make_case(changed_recently=True, duration_months=3.0)
    )
    assert out.final_band == "URGENT"
    assert "R2_RAPID_EVOLUTION" in out.safety_triggers


def test_r2_not_triggered_for_old_lesion():
    out = safety_verifier(
        make_case(changed_recently=True, duration_months=24.0)
    )
    assert "R2_RAPID_EVOLUTION" not in out.safety_triggers


def test_r3_new_lesion_over_50_forces_urgent():
    out = safety_verifier(make_case(age=60, duration_months=6.0))
    assert out.final_band == "URGENT"
    assert "R3_NEW_LESION_OVER_50" in out.safety_triggers


def test_r4_family_history_plus_change_forces_urgent():
    out = safety_verifier(
        make_case(
            family_history_melanoma=True,
            changed_recently=True,
            duration_months=24.0,
        )
    )
    assert out.final_band == "URGENT"
    assert "R4_FAMILY_HISTORY" in out.safety_triggers


def test_r5_malignant_signal_forces_at_least_review():
    out = safety_verifier(make_case(llm_band="MONITOR", malignant_p=0.2))
    assert BAND_ORDER[out.final_band] >= BAND_ORDER["REVIEW"]
    assert "R5_MALIGNANT_SIGNAL" in out.safety_triggers


def test_r6_high_malignant_signal_forces_urgent():
    out = safety_verifier(make_case(llm_band="MONITOR", malignant_p=0.5))
    assert out.final_band == "URGENT"
    assert "R6_HIGH_MALIGNANT_SIGNAL" in out.safety_triggers
    # R5 also fires; evaluation must not stop at the first trigger.
    assert "R5_MALIGNANT_SIGNAL" in out.safety_triggers


def test_r7_defensive_no_usable_input():
    out = safety_verifier(
        make_case(
            image_ok=False,
            with_questionnaire=False,
            with_vision=False,
            with_history=False,
            llm_band="MONITOR",
        )
    )
    assert BAND_ORDER[out.final_band] >= BAND_ORDER["INCONCLUSIVE"]
    assert "R7_NO_USABLE_INPUT" in out.safety_triggers


def test_r8_reasoning_failure():
    out = safety_verifier(make_case(reasoning=None))
    assert BAND_ORDER[out.final_band] >= BAND_ORDER["INCONCLUSIVE"]
    assert "R8_LLM_FAILED" in out.safety_triggers


def test_r9_low_confidence():
    out = safety_verifier(make_case(llm_band="REVIEW", confidence=0.1))
    assert BAND_ORDER[out.final_band] >= BAND_ORDER["INCONCLUSIVE"]
    assert "R9_LOW_CONFIDENCE" in out.safety_triggers


def test_multiple_simultaneous_triggers_all_recorded():
    out = safety_verifier(
        make_case(
            bleeding=True,
            changed_recently=True,
            duration_months=2.0,
            family_history_melanoma=True,
            malignant_p=0.5,
        )
    )
    for rule in (
        "R1_BLEEDING",
        "R2_RAPID_EVOLUTION",
        "R4_FAMILY_HISTORY",
        "R5_MALIGNANT_SIGNAL",
        "R6_HIGH_MALIGNANT_SIGNAL",
    ):
        assert rule in out.safety_triggers
    assert out.final_band == "URGENT"


def test_urgent_can_never_be_downgraded():
    # Even with low confidence (R9 -> at least INCONCLUSIVE), an URGENT
    # trigger must keep the case URGENT.
    out = safety_verifier(
        make_case(bleeding=True, confidence=0.1, reasoning=None)
    )
    assert out.final_band == "URGENT"


# ---------------------------------------------------------------------------
# Monotonic escalation property
# ---------------------------------------------------------------------------


def test_raise_to_is_monotonic():
    for a, b in itertools.product(BAND_ORDER, BAND_ORDER):
        raised = _raise_to(a, b)
        assert BAND_ORDER[raised] >= BAND_ORDER[a]
        assert BAND_ORDER[raised] >= BAND_ORDER[b]


def test_monotonic_escalation_property():
    """No combination of inputs may produce a band below the LLM advisory."""
    grid = itertools.product(
        [False, True],            # bleeding
        [False, True],            # changed_recently
        [30, 60],                 # age
        [3.0, 24.0],              # duration_months
        [False, True],            # family history
        [0.05, 0.2, 0.5],         # malignant_p
        [0.2, 0.9],               # confidence
        list(BAND_ORDER.keys()),  # advisory band
    )
    for bleeding, changed, age, duration, family, mal_p, conf, band in grid:
        out = safety_verifier(
            make_case(
                bleeding=bleeding,
                changed_recently=changed,
                age=age,
                duration_months=duration,
                family_history_melanoma=family,
                malignant_p=mal_p,
                confidence=conf,
                llm_band=band,
            )
        )
        assert out.final_band is not None
        assert BAND_ORDER[out.final_band] >= BAND_ORDER[band], (
            f"Downgrade: advisory={band} final={out.final_band}"
        )
        # Instruction totality: every reachable state has an instruction.
        assert out.instruction
        assert out.disclaimer


def test_instruction_matches_final_band_exactly():
    for band, mal_p in (
        ("URGENT", 0.5),
        ("REVIEW", 0.2),
    ):
        out = safety_verifier(make_case(llm_band="MONITOR", malignant_p=mal_p))
        assert out.final_band == band
        assert out.instruction == INSTRUCTIONS["en"][band]

    out = safety_verifier(make_case(llm_band="MONITOR"))
    assert out.final_band == "MONITOR"
    assert out.instruction == INSTRUCTIONS["en"]["MONITOR"]

    out = safety_verifier(make_case(reasoning=None, with_vision=False))
    assert out.final_band == "INCONCLUSIVE"
    assert out.instruction == INSTRUCTIONS["en"]["INCONCLUSIVE"]


def test_disclaimer_always_exists():
    out = safety_verifier(make_case())
    assert out.disclaimer == DISCLAIMER["en"]


# ---------------------------------------------------------------------------
# Structural model isolation
# ---------------------------------------------------------------------------

FORBIDDEN_SUBSTRINGS = [
    "ollama",
    "openai",
    "torch",
    "transformers",
    "xgboost",
    "requests",
    "httpx",
]

ALLOWED_IMPORT_ROOTS = {"schemas", "templates", "typing", "__future__"}


def test_safety_module_has_no_forbidden_dependencies():
    source = inspect.getsource(safety_module).lower()
    for name in FORBIDDEN_SUBSTRINGS:
        assert name not in source, (
            f"Forbidden dependency '{name}' found in safety module source"
        )


def test_safety_module_imports_are_restricted():
    source = inspect.getsource(safety_module)
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                assert root in ALLOWED_IMPORT_ROOTS, (
                    f"Disallowed import '{alias.name}' in safety module"
                )
        elif isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".")[0]
            assert root in ALLOWED_IMPORT_ROOTS, (
                f"Disallowed import from '{node.module}' in safety module"
            )
