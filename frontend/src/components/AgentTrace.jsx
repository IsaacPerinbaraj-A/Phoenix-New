import Icon from "./Icon.jsx";

const AGENTS = [
  ["ingestion", "Ingestion", "Photo quality gate"],
  ["vision", "Vision", "EfficientNet lesion analysis"],
  ["history", "History", "Structured risk score"],
  ["reasoning", "Reasoning", "LLM explanation (advisory)"],
  ["safety", "Safety", "Deterministic final decision"],
];

const STATUS = {
  waiting: { icon: "clock", cls: "text-ink-faint", label: "Waiting" },
  running: { icon: "loader", cls: "text-brand-600", label: "Running…", spin: true },
  completed: { icon: "check", cls: "text-ok-text", label: "Completed" },
  skipped: { icon: "corner-down-right", cls: "text-ink-muted", label: "Skipped" },
  failed_safe: { icon: "alert-triangle", cls: "text-review-text", label: "Failed safely" },
};

function Bar({ label, value, tone }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-ink-muted">{label}</span>
      <div className="h-1 flex-1 rounded-full bg-stone-200">
        <div
          className={`h-1 rounded-full ${tone || "bg-brand-500"}`}
          style={{ width: `${Math.min(Math.max(value, 0) * 100, 100)}%` }}
        />
      </div>
      <span className="num w-11 shrink-0 text-right text-xs text-ink-secondary">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function AgentDetails({ agent, output }) {
  switch (agent) {
    case "ingestion":
      return (
        <div className="space-y-1 text-[13px] text-ink-secondary">
          <p>
            Photo usable:{" "}
            <strong className="text-ink">{output.image_ok ? "Yes" : "No"}</strong>
          </p>
          {output.quality_note && <p>{output.quality_note}</p>}
        </div>
      );
    case "vision": {
      const v = output.vision;
      if (!v)
        return (
          <p className="text-[13px] text-ink-secondary">
            No model output — degraded safely, no probabilities fabricated.
          </p>
        );
      const top = Object.entries(v.probs).sort(([, a], [, b]) => b - a).slice(0, 4);
      return (
        <div className="space-y-1.5">
          <Bar label="Malignant group" value={v.malignant_p} tone="bg-urgent-dot" />
          <Bar label="Confidence" value={v.confidence} tone="bg-brand-500" />
          <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
            Top classes
          </p>
          {top.map(([cls, p]) => (
            <Bar key={cls} label={cls} value={Number(p)} tone="bg-stone-400" />
          ))}
        </div>
      );
    }
    case "history": {
      const h = output.history;
      if (!h) return <p className="text-[13px] text-ink-secondary">No history output.</p>;
      return (
        <div className="space-y-1.5">
          <Bar label="Risk score" value={h.risk_score} tone="bg-review-dot" />
          <p className="text-xs text-ink-muted">Source: {h.source}</p>
          {h.red_flags.length > 0 && (
            <ul className="list-disc pl-5 text-[13px] text-ink-secondary">
              {h.red_flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case "reasoning": {
      const r = output.reasoning;
      if (!r)
        return (
          <p className="text-[13px] text-ink-secondary">
            Explanation model unavailable — safety rule R8 treats the case
            with extra caution.
          </p>
        );
      return (
        <div className="space-y-1 text-[13px] text-ink-secondary">
          <p>
            Advisory band: <strong className="text-ink">{r.suggested_band}</strong>{" "}
            <span className="text-xs text-ink-muted">(advisory only)</span>
          </p>
          {r.abcde && (
            <ul className="space-y-0.5">
              {Object.entries(r.abcde).map(([k, v]) => (
                <li key={k}>
                  <strong className="text-ink">{k}:</strong> {v}
                </li>
              ))}
            </ul>
          )}
          {r.rationale && <p className="italic">{r.rationale}</p>}
        </div>
      );
    }
    case "safety":
      return (
        <div className="space-y-1 text-[13px] text-ink-secondary">
          <p>
            Final band: <strong className="text-ink">{output.final_band}</strong>
          </p>
          {output.safety_explanations?.length > 0 && (
            <ul className="list-disc pl-5">
              {output.safety_explanations.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {output.instruction && (
            <p>
              Instruction: <strong className="text-ink">{output.instruction}</strong>
            </p>
          )}
        </div>
      );
    default:
      return null;
  }
}

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
    <section aria-labelledby="trace-heading">
      <p id="trace-heading" className="section-label mb-3">
        Agent pipeline
      </p>
      <ol className="card divide-y divide-line">
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

          const meta = STATUS[status];
          const summary = event ? summarize(key, event.output) : null;
          return (
            <li key={key} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`shrink-0 ${meta.cls}`}>
                    <Icon
                      name={meta.icon}
                      size={16}
                      className={meta.spin ? "animate-spin" : ""}
                    />
                  </span>
                  <span className="text-sm font-semibold text-ink">{name}</span>
                  <span className="hidden truncate text-xs text-ink-muted lg:inline">
                    {blurb}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2.5 text-xs">
                  {event?.elapsed_ms != null && (
                    <span className="num text-ink-faint">{event.elapsed_ms} ms</span>
                  )}
                  <span className={`font-medium ${meta.cls}`}>{meta.label}</span>
                </div>
              </div>

              {status === "skipped" && (
                <p className="mt-1 pl-[26px] text-[13px] text-ink-secondary">
                  Reason: {event?.reason || "Not needed for this case."}
                </p>
              )}
              {summary && (
                <p className="mt-1 pl-[26px] text-[13px] text-ink-secondary">{summary}</p>
              )}

              {event?.output && (
                <details className="mt-1 pl-[26px]">
                  <summary className="cursor-pointer text-xs font-medium text-ink-muted transition-colors duration-150 hover:text-ink-secondary">
                    Details
                  </summary>
                  <div className="mt-2 rounded-md border border-line bg-page p-3">
                    <AgentDetails agent={key} output={event.output} />
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ol>

      {overridden && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-lg border border-urgent-line border-l-4 border-l-urgent-dot bg-urgent-bg px-4 py-3"
        >
          <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-urgent-text" />
          <div>
            <p className="text-sm font-semibold text-urgent-text">
              Safety override: {advisory} → {finalBand}
            </p>
            <p className="mt-0.5 text-[13px] text-urgent-text/90">
              Triggered: {byAgent.safety.output.safety_triggers.join(", ")}
            </p>
            <p className="mt-1 text-xs text-urgent-text/70">
              The LLM explains. Deterministic rules decide.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
