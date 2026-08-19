import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCase } from "../api.js";
import ResultCard from "../components/ResultCard.jsx";

export default function CaseDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCase(id)
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Case review</h1>
        <Link
          to="/history"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to history
        </Link>
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
    </div>
  );
}
