"""Static action instructions and disclaimers.

The actionable instruction shown to a health worker is ALWAYS taken from
these hardcoded tables, keyed by the deterministic final band. The LLM never
writes the instruction.

Tamil ("ta") and Hindi ("hi") slots exist architecturally, but this build
ships no human-reviewed medical translations. Until reviewed translations
are added (and the feature flag in config.py is enabled), every language
falls back to the fully supported English text.
"""

from typing import Optional

INSTRUCTIONS: dict[str, dict[str, str]] = {
    "en": {
        "URGENT": (
            "Get this checked by a doctor within 3 days. "
            "Go to the district hospital."
        ),
        "REVIEW": "Get this checked at a clinic within 2 to 4 weeks.",
        "MONITOR": (
            "Low concern. Take another photo in 3 months and compare."
        ),
        "INCONCLUSIVE": (
            "We could not assess this properly. "
            "Please see a clinician anyway."
        ),
    },
    # Placeholders: populate ONLY with human-reviewed translations, then
    # enable ENABLE_UNREVIEWED_TRANSLATIONS handling in config.py.
    "ta": {},
    "hi": {},
}

DISCLAIMER: dict[str, str] = {
    "en": "This is not a diagnosis. Only a doctor can tell you what it is.",
    # "ta" / "hi": add only human-reviewed translations.
}


def get_instruction(band: str, language: Optional[str] = "en") -> str:
    """Return the static instruction for a band, falling back to English."""
    lang_table = INSTRUCTIONS.get(language or "en") or {}
    text = lang_table.get(band)
    if not text:
        text = INSTRUCTIONS["en"][band]
    return text


def get_disclaimer(language: Optional[str] = "en") -> str:
    """Return the disclaimer, falling back to English."""
    return DISCLAIMER.get(language or "en") or DISCLAIMER["en"]
