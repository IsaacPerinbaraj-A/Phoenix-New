import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getCase } from "../api.js";
import AgentTrace from "../components/AgentTrace.jsx";
import Icon from "../components/Icon.jsx";
import ResultCard from "../components/ResultCard.jsx";

export default function CaseDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const fromAssessment = location.state?.fromAssessment === true;
  const traceEvents = location.state?.events || null;
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCase(id)
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          {fromAssessment && <p className="eyebrow">Assessment complete</p>}
          <h1 className="text-2xl font-bold tracking-tight text-navy">
            {fromAssessment ? "Assessment result" : "Case review"}
          </h1>
        </div>
        <div className="flex gap-2">
          {fromAssessment ? (
            <Link to="/assess" className="btn-primary h-9 px-3 text-[13px]">
              <Icon name="plus" size={14} />
              Start a new case
            </Link>
          ) : (
            <Link to="/history" className="btn-outline h-9 px-3 text-[13px]">
              <Icon name="arrow-left" size={14} />
              Back to history
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-urgent-line bg-urgent-bg px-3.5 py-2.5 text-[13px] font-medium text-urgent-text"
        >
          {error}
        </p>
      )}

      {!result && !error && (
        <p className="flex items-center gap-2 text-[13px] text-ink-muted">
          <Icon name="loader" size={14} className="animate-spin" />
          Loading case…
        </p>
      )}

      {result && <ResultCard result={result} />}

      {/* The pipeline trace travels along from a just-completed assessment */}
      {result && traceEvents && traceEvents.length > 0 && (
        <details className="card mt-4 p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-secondary transition-colors duration-150 hover:text-ink">
            <Icon name="chevron-down" size={14} className="text-ink-muted" />
            How this result was produced (agent pipeline)
          </summary>
          <div className="mt-3">
            <AgentTrace events={traceEvents} running={false} />
          </div>
        </details>
      )}
    </div>
  );
}
