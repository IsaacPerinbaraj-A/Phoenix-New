import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCases } from "../api.js";
import { getUser } from "../auth.js";

const BAND_CHIP = {
  URGENT: "bg-red-600 text-white",
  REVIEW: "bg-orange-500 text-white",
  MONITOR: "bg-yellow-500 text-white",
  INCONCLUSIVE: "bg-slate-600 text-white",
};

const BAND_ICON = {
  URGENT: "🔴",
  REVIEW: "🟠",
  MONITOR: "🟡",
  INCONCLUSIVE: "⚪",
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const user = getUser();
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCases()
      .then((body) => setCases(body.cases))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {user ? `${user}'s assessment history` : "Assessment history"}
          </h1>
          <p className="text-sm text-slate-500">
            {user
              ? "Cases assessed while you were logged in."
              : "Shared demo queue. Log in to keep a personal history."}
          </p>
        </div>
        <Link
          to="/assess"
          className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          + New assessment
        </Link>
      </div>

      {!user && (
        <p className="mb-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
          You are not logged in.{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">
            register
          </Link>{" "}
          so your future cases are saved under your account.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          Could not load history: {error}
        </p>
      )}

      {cases !== null && cases.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-400">
          <p className="text-4xl" aria-hidden="true">📂</p>
          <p className="mt-2 font-medium">No assessments yet.</p>
          <p className="text-sm">
            Run your first case and it will show up here.
          </p>
        </div>
      )}

      {cases !== null && cases.length > 0 && (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.case_id}>
              <Link
                to={`/cases/${c.case_id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-300 hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">
                    {BAND_ICON[c.final_band] || "⚪"}
                  </span>
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-700">
                      Case {c.case_id.slice(0, 8)}…
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(c.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      BAND_CHIP[c.final_band] || BAND_CHIP.INCONCLUSIVE
                    }`}
                  >
                    {c.final_band || "UNKNOWN"}
                  </span>
                  <span className="text-sm font-medium text-blue-600">View →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
