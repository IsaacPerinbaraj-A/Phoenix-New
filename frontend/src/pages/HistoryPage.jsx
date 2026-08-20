import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCases } from "../api.js";
import { getUser } from "../auth.js";
import Icon from "../components/Icon.jsx";
import { BandPill } from "../components/BandPill.jsx";

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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            {user ? `${user}'s assessment history` : "Assessment history"}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {user
              ? "Cases assessed while you were logged in."
              : "Shared demo queue. Log in to keep a personal history."}
          </p>
        </div>
        <Link to="/assess" className="btn-primary h-9 px-3 text-[13px]">
          <Icon name="plus" size={14} />
          New assessment
        </Link>
      </div>

      {!user && (
        <p className="mb-4 flex items-start gap-2 rounded-md border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink-secondary">
          <Icon name="info" size={14} className="mt-0.5 shrink-0 text-ink-muted" />
          <span>
            You are not logged in.{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">
              register
            </Link>{" "}
            so your future cases are saved under your account.
          </span>
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-urgent-line bg-urgent-bg px-3.5 py-2.5 text-[13px] font-medium text-urgent-text"
        >
          Could not load history: {error}
        </p>
      )}

      {cases !== null && cases.length === 0 && (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-line-strong">
          <div className="text-center text-ink-faint">
            <Icon name="folder" size={24} className="mx-auto" />
            <p className="mt-2 text-sm font-medium text-ink-muted">No assessments yet.</p>
            <p className="text-[13px]">Run your first case and it will show up here.</p>
          </div>
        </div>
      )}

      {cases !== null && cases.length > 0 && (
        <div className="card divide-y divide-line">
          {cases.map((c) => (
            <Link
              key={c.case_id}
              to={`/cases/${c.case_id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-page"
            >
              <div className="flex min-w-0 items-center gap-3">
                <BandPill band={c.final_band} />
                <div className="min-w-0">
                  <p className="num truncate text-[13px] font-medium text-ink">
                    {c.case_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-ink-muted">{formatDate(c.created_at)}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[13px] font-medium text-brand-600">
                Review
                <Icon name="chevron-right" size={14} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
