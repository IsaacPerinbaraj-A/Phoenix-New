import { useEffect, useState } from "react";
import Disclaimer from "./Disclaimer.jsx";
import Icon from "./Icon.jsx";
import { bandMeta, BandPill } from "./BandPill.jsx";

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
        <p style={{ fontSize: 26, fontWeight: 800 }}>{result.final_band}</p>
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
        {result.disclaimer ||
          "This is not a diagnosis. Only a doctor can tell you what it is."}
      </div>
      <p style={{ marginTop: 8, fontSize: 10 }}>
        Hackathon research prototype · Not clinically validated · Requires
        professional medical assessment
      </p>
    </div>
  );
}

function SignalRow({ label, value, tone, hint }) {
  if (value === null || value === undefined) return null;
  const width = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink-secondary">{label}</span>
        <span className="num text-sm font-medium text-ink">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-stone-200">
        <div
          className={`h-1 rounded-full ${tone || "bg-brand-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
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
  const band = bandMeta(result.final_band);
  const advisory = result.reasoning?.suggested_band;
  const clinician = result.clinician;
  const visionMetrics = benchmark?.vision?.metrics;
  const imageProvided =
    result.image_provided ??
    !(result.quality_note || "").startsWith("No photograph");

  return (
    <section aria-labelledby="result-heading" className="space-y-3">
      <h2 id="result-heading" className="sr-only">
        Triage result
      </h2>

      {/* 1. Final urgency band — authoritative, not alarming */}
      <div
        role="status"
        className={`rounded-lg border border-l-4 p-5 ${band.bg} ${band.line} ${band.accent}`}
      >
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 shrink-0 ${band.text}`}>
            <Icon name={band.icon} size={20} />
          </span>
          <div>
            <p className={`section-label ${band.text} !text-current opacity-80`}>
              Triage result
            </p>
            <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${band.text}`}>
              {band.label}
            </p>
            <p className={`mt-0.5 text-sm ${band.text} opacity-90`}>{band.sub}</p>
          </div>
        </div>
      </div>

      {/* Photograph notices */}
      {result.image_ok === false && imageProvided && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-review-line bg-review-bg px-3.5 py-2.5 text-[13px] text-review-text"
        >
          <Icon name="camera" size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              The photograph was not used
              {result.quality_note ? `: ${result.quality_note}` : "."}
            </p>
            <p className="mt-0.5">
              This result is based on the patient's answers only. For a
              stronger assessment, retake the photo in good light, hold the
              phone steady, and assess the case again.
            </p>
          </div>
        </div>
      )}
      {result.image_ok === false && !imageProvided && (
        <p className="flex items-start gap-2.5 rounded-md border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink-secondary">
          <Icon name="camera" size={15} className="mt-0.5 shrink-0 text-ink-muted" />
          <span>
            No photograph was provided — this result is based on the patient's
            answers only. Adding a clear photo strengthens the assessment.
          </span>
        </p>
      )}

      {/* 2. Action instruction — deterministic template text */}
      <div className="card border-l-4 border-l-ink p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-label">What to do</p>
            <p className="mt-1 text-base font-semibold leading-snug text-ink">
              {result.instruction}
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="btn-outline h-9 shrink-0 px-3">
            <Icon name="printer" size={15} />
            Print referral
          </button>
        </div>
      </div>

      {/* Hidden on screen; the only visible content when printing */}
      <ReferralSlip result={result} band={band} />

      {/* 3. Disclaimer — always visible */}
      <Disclaimer text={result.disclaimer} />

      {/* 4. Triggered safety rules */}
      {result.safety_triggers?.length > 0 && (
        <div className="card p-4">
          <p className="section-label">Safety rules triggered</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.safety_triggers.map((rule) => (
              <span
                key={rule}
                className={`num inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${band.bg} ${band.line} ${band.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${band.dot}`} />
                {rule}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4b. Why this result — per-case causes from the rule engine */}
      {result.safety_explanations?.length > 0 && (
        <div className="card p-4">
          <p className="section-label">Why this result</p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
            {result.safety_explanations.map((e) => (
              <li key={e} className="flex gap-2">
                <span className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${band.dot}`} />
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-faint">
            Causes are computed deterministically from this case's own values
            by the safety rule engine.
          </p>
        </div>
      )}

      {/* 4c. Model signals */}
      {(result.vision || result.history) && (
        <div className="card p-4">
          <p className="section-label">Model signals</p>
          <div className="mt-3 space-y-3">
            {result.vision && (
              <>
                <SignalRow
                  label="Malignant-group probability"
                  value={result.vision.malignant_p}
                  tone="bg-urgent-dot"
                  hint="Image model estimate for the concerning class group"
                />
                <SignalRow
                  label="Vision confidence"
                  value={result.vision.confidence}
                  tone="bg-brand-500"
                  hint="Model certainty in its top class"
                />
              </>
            )}
            {result.history && (
              <SignalRow
                label="History risk score"
                value={result.history.risk_score}
                tone="bg-review-dot"
                hint={`From the patient's answers (${result.history.source})`}
              />
            )}
          </div>
          {result.vision && (
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              {visionMetrics
                ? `Vision model benchmark (HAM10000 lesion-grouped test split): ` +
                  `${(visionMetrics.malignant_recall * 100).toFixed(1)}% malignant recall · ` +
                  `${(visionMetrics.balanced_accuracy * 100).toFixed(1)}% balanced accuracy. ` +
                  `Dermatoscopic benchmark — smartphone photos may differ.`
                : "Vision model benchmark: not yet evaluated on this machine."}
            </p>
          )}
          <p className="mt-1 text-[11px] text-ink-faint">
            Evidence inputs only — the final band above is decided by the
            deterministic safety rules, not by these numbers alone.
          </p>
        </div>
      )}

      {/* 4d. Clinician referral recommendation — deterministic templates */}
      {clinician && (
        <div className="card border-l-4 border-l-brand-500 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="section-label !text-brand-700">
              Clinician referral recommendation
            </p>
            <span className="num rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              Priority {clinician.priority_score}/100
            </span>
          </div>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink">
            {clinician.referral}
          </p>
          {clinician.basis?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {clinician.basis.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-line bg-page px-2 py-0.5 text-[11px] text-ink-secondary"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-ink-faint">{clinician.note}</p>
        </div>
      )}

      {/* 5. Supporting explanation — clearly subordinate to the decision */}
      {result.reasoning && (
        <div className="card bg-page p-4">
          <p className="section-label">Supporting explanation (generated, advisory only)</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            {result.reasoning.rationale}
          </p>
          {advisory && advisory !== result.final_band && (
            <p className="mt-2 text-xs text-ink-muted">
              The model suggested <strong>{advisory}</strong>; the deterministic
              safety engine decided <strong>{result.final_band}</strong>.
            </p>
          )}
        </div>
      )}
      {!result.reasoning && (
        <div className="card bg-page p-4 text-[13px] leading-relaxed text-ink-secondary">
          The explanation model was unavailable, so the case was automatically
          treated with extra caution (rule R8).
        </div>
      )}

      {/* 6. Technical details — collapsible */}
      <details className="card p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-secondary transition-colors duration-150 hover:text-ink">
          <Icon name="chevron-down" size={14} className="text-ink-muted" />
          Technical details
        </summary>
        <div className="mt-3 space-y-4 text-[13px] text-ink-secondary">
          {result.vision ? (
            <div>
              <p className="section-label mb-2">Image model</p>
              <p>
                Malignant-group probability:{" "}
                <span className="num text-ink">{result.vision.malignant_p.toFixed(3)}</span>{" "}
                · Confidence:{" "}
                <span className="num text-ink">{result.vision.confidence.toFixed(3)}</span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {Object.entries(result.vision.probs)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cls, p]) => (
                    <li key={cls} className="flex items-center gap-2">
                      <span className="num w-12 text-xs text-ink-muted">{cls}</span>
                      <div className="h-1 flex-1 rounded-full bg-stone-200">
                        <div
                          className="h-1 rounded-full bg-brand-500"
                          style={{ width: `${Math.min(Number(p) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="num w-12 text-right text-xs text-ink-secondary">
                        {(Number(p) * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
              </ul>
              {result.vision.gradcam_path && (
                <img
                  src={result.vision.gradcam_path}
                  alt="Grad-CAM heatmap showing image regions that most influenced the model"
                  className="mt-2 max-h-64 rounded-md border border-line"
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
              <p className="section-label mb-2">History model</p>
              <p>
                Risk score:{" "}
                <span className="num text-ink">{result.history.risk_score.toFixed(2)}</span>{" "}
                ({result.history.source})
              </p>
              {result.history.red_flags.length > 0 && (
                <p className="mt-1">Red flags: {result.history.red_flags.join("; ")}</p>
              )}
            </div>
          )}

          {result.reasoning?.abcde && (
            <div>
              <p className="section-label mb-2">ABCDE explanation (generated)</p>
              <ul className="space-y-1">
                {Object.entries(result.reasoning.abcde).map(([k, v]) => (
                  <li key={k}>
                    <strong className="text-ink">{k}:</strong> {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="section-label mb-1">Case</p>
            <p className="num text-xs">{result.case_id}</p>
            {result.final_band && (
              <p className="mt-1">
                <BandPill band={result.final_band} />
              </p>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
