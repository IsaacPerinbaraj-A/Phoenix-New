import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCases } from "../api.js";
import { getUser } from "../auth.js";
import Icon from "../components/Icon.jsx";
import { BandPill, statusMeta } from "../components/BandPill.jsx";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
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
    <div className="mx-auto max-w-shell px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">
            Your assessment history
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {user
              ? "Cases assessed while you were logged in."
              : "Shared demo queue. Log in to keep a personal history."}
          </p>
        </div>
        <Link to="/assess" className="btn-primary h-10 px-4 text-sm">
          <Icon name="plus" size={15} />
          New assessment
        </Link>
      </div>

      {!user && (
        <p className="mb-4 flex items-start gap-2 rounded-card border border-line bg-surface-card px-4 py-3 text-sm text-ink-secondary">
          <Icon name="info" size={15} className="mt-0.5 shrink-0 text-ink-muted" />
          <span>
            You are not logged in.{" "}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link to="/register" className="font-semibold text-brand-600 hover:underline">
              register
            </Link>{" "}
            so your future cases are saved under your account.
          </span>
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-card border border-urgent-line bg-urgent-bg px-4 py-3 text-sm font-semibold text-urgent-text"
        >
          Could not load history: {error}
        </p>
      )}

      {cases !== null && cases.length === 0 && (
        <div className="flex min-h-[260px] items-center justify-center rounded-card border-2 border-dashed border-line-strong">
          <div className="text-center text-ink-muted">
            <Icon name="folder" size={26} className="mx-auto" />
            <p className="mt-2 text-base font-semibold text-ink-secondary">
              No assessments yet.
            </p>
            <p className="text-sm">Run your first case and it will show up here.</p>
          </div>
        </div>
      )}

      {cases !== null && cases.length > 0 && (
        <div className="card divide-y divide-line">
          {cases.map((c) => {
            const sm = statusMeta(c.status || "pending");
            return (
              <Link
                key={c.case_id}
                to={`/cases/${c.case_id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-bg"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="min-w-[140px]">
                    <p className="text-sm font-semibold text-ink">
                      {formatDate(c.created_at)}
                    </p>
                    <p className="num text-xs text-ink-muted">
                      Case #{c.case_id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <BandPill band={c.final_band} />
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${sm.bg} ${sm.line} ${sm.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                    {c.status || "pending"}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-brand-600">
                  <Icon name="arrow-right" size={15} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
