# Demo fixtures

Reproducible, fully **synthetic** demo cases — no real patient data. The
questionnaires below are typed into the UI (or posted to `/api/assess`);
the demo images are generated locally:

```bash
python scripts/make_demo_images.py
```

That writes `demo/images/sharp_synthetic.png` and `demo/images/blurry.png`.
They are synthetic textures for demonstrating the PIPELINE (quality gate,
routing, streaming) — they are not lesions, and with trained weights loaded
the vision output on them is whatever the model genuinely produces. Never
present it as a clinical result. For Beat 1 with real vision output,
prefer a public HAM10000 sample image from your local dataset copy.

## Case A — low concern (`case_a.json`)

Benign questionnaire + `sharp_synthetic.png`. Shows all five agents
completing. The final band is whatever the pipeline honestly produces —
do not script or hardcode it.

## Case B — deterministic override (`case_b.json`)

`bleeding=true`. Whatever the LLM advises, safety forces **URGENT** with
`R1_BLEEDING` — the override banner appears. (The live LLM's advisory band
is nondeterministic; the override itself is proven by
`test_llm_cannot_downgrade_bleeding_lesion` regardless.)

## Case C — blurry image (`case_c.json`)

Benign questionnaire + `blurry.png`. Ingestion rejects the photo, the
vision agent shows **SKIPPED**, and the case still completes safely.

## Case D — reasoning failure (`case_d.json`)

Stop Ollama, or start the backend with:

```bash
set DERMATRIAGE_SIMULATE_LLM_FAILURE=true
```

(Linux/macOS: `export DERMATRIAGE_SIMULATE_LLM_FAILURE=true`.)
Reasoning fails safely, `R8_LLM_FAILED` fires, the final band is at least
INCONCLUSIVE, and the static instruction still renders.

## Demo mode

`DERMATRIAGE_DEMO_MODE=true` is reserved for reproducible fixtures and
failure simulation only. It never fakes evaluation metrics and never
masquerades stub output as trained-model output.
