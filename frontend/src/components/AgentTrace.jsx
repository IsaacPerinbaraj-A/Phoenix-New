const AGENTS = [
  ["ingestion", "Ingestion", "Checks photo quality"],
  ["vision", "Vision", "EfficientNet lesion analysis"],
  ["history", "History", "Structured risk score"],
  ["reasoning", "Reasoning", "LLM supporting explanation (advisory)"],
  ["safety", "Safety", "Deterministic final decision"],
];

const STATUS_STYLE = {
  waiting: "border-slate-200 bg-slate-50 text-slate-400",
  running: "border-blue-300 bg-blue-50 text-blue-700",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-800",
  skipped: "border-slate-300 bg-slate-100 text-slate-600",
  failed_safe: "border-amber-300 bg-amber-50 text-amber-800",
};

const STATUS_LABEL = {
  waiting: "Waiting",
  running: "Running…",
  completed: "Completed",
  skipped: "SKIPPED",
  failed_safe: "Failed safely",
};

const STATUS_ICON = {
  waiting: "○",
  running: "◐",
  completed: "✓",
  skipped: "⤼",
  failed_safe: "⚠",
};

function summarize(agent, output) {
  if (!output) return null;
  switch (agent) {
    case "ingestion":
      return output.image_ok
        ? "Photo usable for analysis"
        : output.quality_note || "Photo not usable";
    case "vision":
      if (!output.vision) return "No model output (degraded safely)";
      return `malignant group p=${output.vision.malignant_p.toFixed(2)}, confidence=${output.vision.confidence.toFixed(2)}`;
    case "history":
      if (!output.history) return null;
      return `risk score ${output.history.risk_score.toFixed(2)}${
        output.history.red_flags.length
          ? ` · flags: ${output.history.red_flags.join("; ")}`
          : ""
      }`;
    case "reasoning":
      if (!output.reasoning) return "LLM unavailable — safety will fail safe (R8)";
      return `advisory band: ${output.reasoning.suggested_band}`;
    case "safety":
      return `final band: ${output.final_band}${
        output.safety_triggers?.length
          ? ` · triggered: ${output.safety_triggers.join(", ")}`
          : ""
      }`;
    default:
      return null;
  }
}

export default function AgentTrace({ events, running }) {
  const byAgent = {};
  for (const e of events) {
    if (e.agent) byAgent[e.agent] = e;
  }

  // Advisory vs final band, to surface the deterministic override.
  const advisory = byAgent.reasoning?.output?.reasoning?.suggested_band;
  const finalBand = byAgent.safety?.output?.final_band;
  const overridden = advisory && finalBand && advisory !== finalBand;

  let sawIncomplete = false;

  return (
    <section aria-labelledby="trace-heading" className="space-y-2">
      <h2 id="trace-heading" className="text-lg font-semibold text-slate-800">
        Agent pipeline
      </h2>
      <ol className="space-y-2">
        {AGENTS.map(([key, name, blurb]) => {
          const event = byAgent[key];
          let status = "waiting";
          if (event) {
            status = event.status || "completed";
          } else if (running && !sawIncomplete) {
            status = "running";
            sawIncomplete = true;
          }
          if (!event) sawIncomplete = true;

          const summary = event ? summarize(key, event.output) : null;
          return (
            <li
              key={key}
              className={`rounded-xl border px-4 py-3 ${STATUS_STYLE[status]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-lg">
                    {STATUS_ICON[status]}
                  </span>
                  <span className="font-semibold">{name}</span>
                  <span className="hidden text-xs opacity-70 sm:inline">{blurb}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  {event?.elapsed_ms != null && (
                    <span className="opacity-70">{event.elapsed_ms} ms</span>
                  )}
                  <span>{STATUS_LABEL[status]}</span>
                </div>
              </div>

              {status === "skipped" && (
                <p className="mt-1 text-sm">
                  Reason: {event?.reason || "Not needed for this case."}
                </p>
              )}
              {summary && <p className="mt-1 text-sm">{summary}</p>}

              {event?.output && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs underline opacity-70">
                    Raw output (JSON)
                  </summary>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-white/60 p-2 text-xs">
                    {JSON.stringify(event.output, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          );
        })}
      </ol>

      {overridden && (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3"
        >
          <p className="font-bold text-red-800">
            Safety override: {advisory} → {finalBand}
          </p>
          <p className="text-sm text-red-700">
            Triggered: {byAgent.safety.output.safety_triggers.join(", ")}
          </p>
          <p className="mt-1 text-xs text-red-600">
            The LLM explains. Deterministic rules decide.
          </p>
        </div>
      )}
    </section>
  );
}
