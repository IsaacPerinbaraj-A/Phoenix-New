import { useEffect, useState } from "react";
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

// Printable referral slip. Hidden on screen; @media print rules in
// index.css make it the only visible element when printing.
function ReferralSlip({ result, band }) {
  const clinician = result.clinician;
  return (
    <div id="referral-slip">
      <div style={{ borderBottom: "3px solid #000", paddingBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>
          SkinSight — Referral Slip
        </h1>
        <p style={{ fontSize: 11 }}>
          Triage-support prototype · NOT a diagnosis · NOT a medical device
        </p>
      </div>

      <p style={{ marginTop: 10, fontSize: 12 }}>
        Case ID: <strong>{result.case_id}</strong> · Printed:{" "}
        {new Date().toLocaleString()}
      </p>

      <div style={{ border: "3px solid #000", padding: 12, marginTop: 10 }}>
        <p style={{ fontSize: 26, fontWeight: 800 }}>
          {band.emoji} {result.final_band}
        </p>
        <p style={{ fontSize: 13 }}>{band.sub}</p>
      </div>

      <h2 style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
        What the patient must do
      </h2>
      <p style={{ fontSize: 15, fontWeight: 700 }}>{result.instruction}</p>

      {clinician && (
        <>
          <h2 style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
            For the receiving clinician (priority {clinician.priority_score}/100)
          </h2>
          <p style={{ fontSize: 13 }}>{clinician.referral}</p>
        </>
      )}

      {result.safety_explanations?.length > 0 && (
        <>
          <h2 style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
            Why this result
          </h2>
          <ul style={{ fontSize: 12, paddingLeft: 18, listStyle: "disc" }}>
            {result.safety_explanations.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}

      {(result.vision || result.history) && (
        <>
          <h2 style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
            Model signals (evidence only — rules decide)
          </h2>
          <p style={{ fontSize: 12 }}>
            {result.vision &&
              `Malignant-group probability: ${(result.vision.malignant_p * 100).toFixed(0)}% · ` +
                `Vision confidence: ${(result.vision.confidence * 100).toFixed(0)}% · `}
            {result.history &&
              `History risk score: ${(result.history.risk_score * 100).toFixed(0)}%`}
          </p>
        </>
      )}

      <div
        style={{
          border: "2px solid #000",
          padding: 8,
          marginTop: 14,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        ⚠ {result.disclaimer ||
          "This is not a diagnosis. Only a doctor can tell you what it is."}
      </div>
      <p style={{ marginTop: 8, fontSize: 10 }}>
        Hackathon research prototype · Not clinically validated · Requires
        professional medical assessment
      </p>
    </div>
  );
}

function SignalTile({ label, value, tone, hint }) {
  if (value === null || value === undefined) return null;
  const width = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-3xl font-extrabold text-slate-800">
        {(value * 100).toFixed(0)}
        <span className="text-lg font-bold text-slate-400">%</span>
      </p>
      <div className="mt-1.5 h-2.5 rounded-full bg-slate-200">
        <div
          className={`h-2.5 rounded-full ${tone || "bg-blue-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export default function ResultCard({ result }) {
  const hasVision = !!result?.vision;
  const [benchmark, setBenchmark] = useState(null);

  // Real, locally-evaluated model benchmark (null = not yet evaluated).
  useEffect(() => {
    if (!hasVision) return;
    fetch("/api/model_info")
      .then((r) => (r.ok ? r.json() : null))
      .then(setBenchmark)
      .catch(() => {});
  }, [hasVision]);

  if (!result?.final_band) return null;
  const band = BANDS[result.final_band] || BANDS.INCONCLUSIVE;
  const advisory = result.reasoning?.suggested_band;
  const clinician = result.clinician;
  const visionMetrics = benchmark?.vision?.metrics;

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

      {/* Photograph notices: a rejected photo warrants a retake warning; a
          case submitted without any photo just gets a quiet note. */}
      {result.image_ok === false &&
        (result.image_provided ??
        !(result.quality_note || "").startsWith("No photograph")) && (
          <div
            role="alert"
            className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4"
          >
            <p className="font-bold text-amber-900">
              📷 The photograph was not used
              {result.quality_note ? `: ${result.quality_note}` : "."}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              This result is based on the patient's answers only. For a
              stronger assessment, retake the photo in good light, hold the
              phone steady, and assess the case again.
            </p>
          </div>
        )}
      {result.image_ok === false &&
        !(result.image_provided ??
        !(result.quality_note || "").startsWith("No photograph")) && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            📷 No photograph was provided — this result is based on the
            patient's answers only. Adding a clear photo strengthens the
            assessment.
          </p>
        )}

      {/* 2. Action instruction — deterministic template text */}
      <div className="rounded-xl border-2 border-slate-800 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              What to do
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {result.instruction}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🖨️ Print referral
          </button>
        </div>
      </div>

      {/* Hidden on screen; the only visible content when printing */}
      <ReferralSlip result={result} band={band} />

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

      {/* 4b. Why this result — per-case causes from the rule engine */}
      {result.safety_explanations?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Why this result
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {result.safety_explanations.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            Causes are computed deterministically from this case's own
            values by the safety rule engine.
          </p>
        </div>
      )}

      {/* 4c. Model signals — the numbers that matter, at a glance */}
      {(result.vision || result.history) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Model signals
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {result.vision && (
              <>
                <SignalTile
                  label="Malignant-group probability"
                  value={result.vision.malignant_p}
                  tone="bg-red-500"
                  hint="Image model estimate for the concerning class group"
                />
                <SignalTile
                  label="Vision confidence"
                  value={result.vision.confidence}
                  tone="bg-blue-500"
                  hint="Model certainty in its top class"
                />
              </>
            )}
            {result.history && (
              <SignalTile
                label="History risk score"
                value={result.history.risk_score}
                tone="bg-orange-500"
                hint={`From the patient's answers (${result.history.source})`}
              />
            )}
          </div>
          {result.vision && (
            <p className="mt-2 text-xs text-slate-500">
              {visionMetrics
                ? `Vision model benchmark (HAM10000 lesion-grouped test split): ` +
                  `${(visionMetrics.malignant_recall * 100).toFixed(1)}% malignant recall · ` +
                  `${(visionMetrics.balanced_accuracy * 100).toFixed(1)}% balanced accuracy. ` +
                  `Dermatoscopic benchmark — smartphone photos may differ.`
                : "Vision model benchmark: not yet evaluated on this machine."}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Evidence inputs only — the final band above is decided by the
            deterministic safety rules, not by these numbers alone.
          </p>
        </div>
      )}

      {/* 4c. Clinician referral recommendation — deterministic templates */}
      {clinician && (
        <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Clinician referral recommendation
            </p>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
              Priority {clinician.priority_score}/100
            </span>
          </div>
          <p className="mt-2 font-medium text-slate-800">{clinician.referral}</p>
          {clinician.basis?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {clinician.basis.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-blue-700/70">{clinician.note}</p>
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
              <ul className="mt-2 space-y-1.5">
                {Object.entries(result.vision.probs)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cls, p]) => (
                    <li key={cls} className="flex items-center gap-2">
                      <span className="w-12 font-mono text-xs text-slate-500">{cls}</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${Math.min(Number(p) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-slate-600">
                        {(Number(p) * 100).toFixed(1)}%
                      </span>
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
