import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getCase } from "../api.js";
import AgentTrace from "../components/AgentTrace.jsx";
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-800">
          {fromAssessment ? "Assessment result" : "Case review"}
        </h1>
        <div className="flex gap-2">
          {fromAssessment ? (
            <Link
              to="/assess"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Start a new case
            </Link>
          ) : (
            <Link
              to="/history"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Back to history
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {!result && !error && (
        <p className="text-slate-500">Loading case…</p>
      )}

      {result && <ResultCard result={result} />}

      {/* The pipeline trace travels along from a just-completed assessment */}
      {result && traceEvents && traceEvents.length > 0 && (
        <details className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-medium text-slate-700">
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
