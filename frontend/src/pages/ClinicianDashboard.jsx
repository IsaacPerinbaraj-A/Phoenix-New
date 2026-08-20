import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClinicianQueue, getModelInfo, getStats, setCaseStatus } from "../api.js";
import { isClinician } from "../auth.js";
import Icon from "../components/Icon.jsx";
import { BandPill, statusMeta } from "../components/BandPill.jsx";

const CASE_STATUSES = ["pending", "reviewed", "referred", "closed"];

function priorityDot(score) {
  if (score >= 75) return "bg-urgent-dot";
  if (score >= 50) return "bg-review-dot";
  if (score >= 25) return "bg-monitor-dot";
  return "bg-ok-dot";
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function pct(value) {
  return value === null || value === undefined
    ? "â€”"
    : `${(value * 100).toFixed(1)}%`;
}

function StatTile({ label, value, sub, dot }) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
        {label}
      </p>
      <p className="num mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{sub}</p>}
    </div>
  );
}

export default function ClinicianDashboard() {
  const [queue, setQueue] = useState(null);
  const [stats, setStats] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);

  const changeStatus = async (caseId, status) => {
    const previous = queue;
    // Optimistic update; revert on failure.
    setQueue((q) =>
      q.map((c) => (c.case_id === caseId ? { ...c, status } : c))
    );
    try {
      await setCaseStatus(caseId, status);
    } catch (err) {
      setQueue(previous);
      setError(err.message);
    }
  };

  const clinician = isClinician();

  useEffect(() => {
    if (!clinician) return;
    Promise.all([getClinicianQueue(), getStats(), getModelInfo()])
      .then(([q, s, m]) => {
        setQueue(q.cases);
        setStats(s);
        setModelInfo(m);
      })
      .catch((err) => setError(err.message));
  }, [clinician]);

  const vision = modelInfo?.vision?.metrics;
  const history = modelInfo?.history;

  if (!clinician) {
    return (
      <div className="flex items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md p-6 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Icon name="lock" size={18} />
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-ink">
            Clinician access only
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            This dashboard shows the prioritised review queue and live
            statistics for all assessed cases. Log in with the clinician
            account to view it.
          </p>
          <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-left text-[13px]">
            <p className="font-semibold text-brand-700">Demo clinician account</p>
            <p className="num mt-0.5 text-xs text-ink-secondary">
              username: clinician Â· password: clinic123
            </p>
          </div>
          <Link to="/login" className="btn-primary mt-4 w-full">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-navy">Clinician dashboard
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          All assessed cases, ordered by a deterministic priority score
          (band-dominated). Not a validated clinical score â€” an ordering aid
          for review.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-urgent-line bg-urgent-bg px-3.5 py-2.5 text-[13px] font-medium text-urgent-text"
        >
          {error}
        </p>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Total cases" value={stats.total_cases} />
          <StatTile label="Urgent" value={stats.by_band.URGENT} dot="bg-urgent-dot" />
          <StatTile label="Review" value={stats.by_band.REVIEW} dot="bg-review-dot" />
          <StatTile label="Monitor" value={stats.by_band.MONITOR} dot="bg-monitor-dot" />
          <StatTile
            label="Safety overrides"
            value={pct(stats.override_rate)}
            sub={`${stats.override_count} case(s) escalated above the LLM advisory`}
          />
          <StatTile
            label="LLM fallbacks"
            value={pct(stats.llm_failure_rate)}
            sub={`${stats.llm_failure_count} case(s) handled by rule R8`}
          />
        </div>
      )}

      {/* Model benchmarks â€” real evaluation results only */}
      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <p className="section-label">Vision model benchmark (HAM10000 test split)</p>
          {vision ? (
            <div className="mt-2 flex flex-wrap gap-8">
              <div>
                <p className="num text-xl font-semibold text-ink">
                  {pct(vision.malignant_recall)}
                </p>
                <p className="text-[11px] text-ink-muted">Malignant-group recall</p>
              </div>
              <div>
                <p className="num text-xl font-semibold text-ink">
                  {pct(vision.balanced_accuracy)}
                </p>
                <p className="text-[11px] text-ink-muted">Balanced accuracy</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm font-medium text-ink-faint">Not yet evaluated</p>
          )}
          <p className="mt-2 text-[11px] text-ink-faint">
            Dermatoscopic benchmark â€” does not transfer directly to smartphone
            photos.
          </p>
        </div>
        <div className="card p-4">
          <p className="section-label">History model benchmark</p>
          {history ? (
            <div className="mt-2 flex flex-wrap gap-8">
              <div>
                <p className="num text-xl font-semibold text-ink">
                  {pct(history.malignant_recall)}
                </p>
                <p className="text-[11px] text-ink-muted">Malignant recall</p>
              </div>
              <div>
                <p className="num text-xl font-semibold text-ink">
                  {pct(history.balanced_accuracy)}
                </p>
                <p className="text-[11px] text-ink-muted">Balanced accuracy</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm font-medium text-ink-faint">Not yet evaluated</p>
          )}
          <p className="mt-2 text-[11px] text-ink-faint">
            Trained on synthetic questionnaires â€” pipeline validation, not
            clinical validation.
          </p>
        </div>
      </div>

      {/* Prioritised queue */}
      <p className="section-label mb-3">Review queue</p>
      {queue !== null && queue.length === 0 && (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-line-strong">
          <div className="text-center text-ink-faint">
            <Icon name="folder" size={22} className="mx-auto" />
            <p className="mt-2 text-sm font-medium text-ink-muted">
              No cases in the queue yet.
            </p>
          </div>
        </div>
      )}
      {queue !== null && queue.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th className="table-th text-right">Priority</th>
                <th className="table-th">Band</th>
                <th className="table-th">Risk</th>
                <th className="table-th text-right">Rules</th>
                <th className="table-th">Photo</th>
                <th className="table-th">Submitted</th>
                <th className="table-th">By</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((c) => {
                const sm = statusMeta(c.status || "pending");
                return (
                  <tr
                    key={c.case_id}
                    className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-bg"
                  >
                    <td className="table-td text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(c.priority_score)}`} />
                        <span className="num font-medium text-ink">{c.priority_score}</span>
                        <span className="num text-[11px] text-ink-faint">/100</span>
                      </span>
                    </td>
                    <td className="table-td">
                      <BandPill band={c.final_band} />
                    </td>
                    <td className="table-td">
                      {c.risk_score !== null && c.risk_score !== undefined ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-1 w-14 rounded-full bg-stone-200">
                            <span
                              className="block h-1 rounded-full bg-review-dot"
                              style={{ width: `${Math.min(c.risk_score * 100, 100)}%` }}
                            />
                          </span>
                          <span className="num text-xs text-ink-secondary">
                            {c.risk_score.toFixed(2)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-faint">â€”</span>
                      )}
                    </td>
                    <td className="table-td num text-right text-ink-secondary">
                      {c.trigger_count}
                    </td>
                    <td className="table-td">
                      {c.image_ok ? (
                        <Icon name="check" size={14} className="text-ok-text" />
                      ) : (
                        <span className="text-ink-faint">â€”</span>
                      )}
                    </td>
                    <td className="table-td text-xs text-ink-muted">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="table-td text-xs text-ink-muted">
                      {c.username || "anonymous"}
                    </td>
                    <td className="table-td">
                      <select
                        value={c.status || "pending"}
                        onChange={(e) => changeStatus(c.case_id, e.target.value)}
                        aria-label={`Status for case ${c.case_id.slice(0, 8)}`}
                        className={`h-7 rounded-full border px-2 text-[11px] font-semibold capitalize transition-colors duration-150 ${sm.bg} ${sm.line} ${sm.text}`}
                      >
                        {CASE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="table-td">
                      <Link
                        to={`/cases/${c.case_id}`}
                        className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:underline"
                      >
                        Review
                        <Icon name="chevron-right" size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


