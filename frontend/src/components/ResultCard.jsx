import Disclaimer from "./Disclaimer.jsx";

// Display metadata only — the band itself is decided exclusively by the
// backend safety verifier. This file never recalculates urgency.
const BANDS = {
  URGENT: {
    emoji: "🔴",
    label: "URGENT",
    sub: "Needs professional assessment within 72 hours",
    style: "border-red-500 bg-red-50 text-red-900",
    badge: "bg-red-600 text-white",
  },
  REVIEW: {
    emoji: "🟠",
    label: "REVIEW",
    sub: "Professional examination within 2–4 weeks",
    style: "border-orange-400 bg-orange-50 text-orange-900",
    badge: "bg-orange-500 text-white",
  },
  MONITOR: {
    emoji: "🟡",
    label: "MONITOR",
    sub: "Low concern — re-photograph in 3 months",
    style: "border-yellow-400 bg-yellow-50 text-yellow-900",
    badge: "bg-yellow-500 text-white",
  },
  INCONCLUSIVE: {
    emoji: "⚪",
    label: "INCONCLUSIVE",
    sub: "Could not be assessed — see a clinician regardless",
    style: "border-slate-400 bg-slate-50 text-slate-900",
    badge: "bg-slate-600 text-white",
  },
};

export default function ResultCard({ result }) {
  if (!result?.final_band) return null;
  const band = BANDS[result.final_band] || BANDS.INCONCLUSIVE;
  const advisory = result.reasoning?.suggested_band;

  return (
    <section aria-labelledby="result-heading" className="space-y-4">
      <h2 id="result-heading" className="sr-only">
        Triage result
      </h2>

      {/* 1. Final urgency band — the dominant element */}
      <div
        role="status"
        className={`rounded-2xl border-4 p-6 text-center ${band.style}`}
      >
        <p className="text-5xl" aria-hidden="true">
          {band.emoji}
        </p>
        <p className="mt-2 text-3xl font-extrabold tracking-wide">{band.label}</p>
        <p className="mt-1 text-sm font-medium">{band.sub}</p>
      </div>

      {/* 2. Action instruction — deterministic template text */}
      <div className="rounded-xl border-2 border-slate-800 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          What to do
        </p>
        <p className="mt-1 text-lg font-bold text-slate-900">{result.instruction}</p>
      </div>

      {/* 3. Disclaimer — always visible */}
      <Disclaimer text={result.disclaimer} />

      {/* 4. Triggered safety rules */}
      {result.safety_triggers?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Safety rules triggered
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {result.safety_triggers.map((rule) => (
              <span
                key={rule}
                className={`rounded-full px-3 py-1 text-xs font-bold ${band.badge}`}
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 5. Supporting explanation — clearly subordinate to the decision */}
      {result.reasoning && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Supporting explanation (generated, advisory only)
          </p>
          <p className="mt-1 text-sm text-slate-700">{result.reasoning.rationale}</p>
          {advisory && advisory !== result.final_band && (
            <p className="mt-2 text-xs text-slate-500">
              The model suggested <strong>{advisory}</strong>; the deterministic
              safety engine decided <strong>{result.final_band}</strong>.
            </p>
          )}
        </div>
      )}
      {!result.reasoning && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          The explanation model was unavailable, so the case was automatically
          treated with extra caution (rule R8).
        </div>
      )}

      {/* 6. Technical details — collapsible */}
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-medium text-slate-700">
          Technical details
        </summary>
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          {result.vision ? (
            <div>
              <p className="font-semibold">Image model</p>
              <p>
                Malignant-group probability: {result.vision.malignant_p.toFixed(3)} ·
                Confidence: {result.vision.confidence.toFixed(3)}
              </p>
              <ul className="mt-1 grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                {Object.entries(result.vision.probs).map(([cls, p]) => (
                  <li key={cls}>
                    {cls}: {Number(p).toFixed(3)}
                  </li>
                ))}
              </ul>
              {result.vision.gradcam_path && (
                <img
                  src={result.vision.gradcam_path}
                  alt="Grad-CAM heatmap showing image regions that most influenced the model"
                  className="mt-2 max-h-64 rounded-lg border border-slate-200"
                />
              )}
            </div>
          ) : (
            <p>
              Image model output: not available for this case
              {result.quality_note ? ` (${result.quality_note})` : ""}.
            </p>
          )}

          {result.history && (
            <div>
              <p className="font-semibold">History model</p>
              <p>
                Risk score: {result.history.risk_score.toFixed(2)} (
                {result.history.source})
              </p>
              {result.history.red_flags.length > 0 && (
                <p>Red flags: {result.history.red_flags.join("; ")}</p>
              )}
            </div>
          )}

          {result.reasoning?.abcde && (
            <div>
              <p className="font-semibold">ABCDE explanation (generated)</p>
              <ul className="mt-1 space-y-1">
                {Object.entries(result.reasoning.abcde).map(([k, v]) => (
                  <li key={k}>
                    <strong>{k}:</strong> {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="font-semibold">Case</p>
            <p>ID: {result.case_id}</p>
          </div>
        </div>
      </details>
    </section>
  );
}
