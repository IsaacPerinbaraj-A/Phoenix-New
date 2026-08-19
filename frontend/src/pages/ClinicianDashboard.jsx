import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClinicianQueue, getModelInfo, getStats } from "../api.js";

const BAND_CHIP = {
  URGENT: "bg-red-600 text-white",
  REVIEW: "bg-orange-500 text-white",
  MONITOR: "bg-yellow-500 text-white",
  INCONCLUSIVE: "bg-slate-600 text-white",
};

function priorityColor(score) {
  if (score >= 75) return "bg-red-600";
  if (score >= 50) return "bg-orange-500";
  if (score >= 25) return "bg-yellow-500";
  return "bg-emerald-500";
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
    ? "—"
    : `${(value * 100).toFixed(1)}%`;
}

function StatTile({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-extrabold ${accent || "text-slate-800"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function ClinicianDashboard() {
  const [queue, setQueue] = useState(null);
  const [stats, setStats] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getClinicianQueue(), getStats(), getModelInfo()])
      .then(([q, s, m]) => {
        setQueue(q.cases);
        setStats(s);
        setModelInfo(m);
      })
      .catch((err) => setError(err.message));
  }, []);

  const vision = modelInfo?.vision?.metrics;
  const history = modelInfo?.history;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Clinician dashboard</h1>
        <p className="text-sm text-slate-500">
          All assessed cases, ordered by a deterministic priority score
          (band-dominated). Not a validated clinical score — an ordering aid
          for review.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Total cases" value={stats.total_cases} />
          <StatTile
            label="🔴 Urgent"
            value={stats.by_band.URGENT}
            accent="text-red-600"
          />
          <StatTile
            label="🟠 Review"
            value={stats.by_band.REVIEW}
            accent="text-orange-500"
          />
          <StatTile
            label="🟡 Monitor"
            value={stats.by_band.MONITOR}
            accent="text-yellow-600"
          />
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

      {/* Model benchmarks — real evaluation results only */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Vision model benchmark (HAM10000 test split)
          </p>
          {vision ? (
            <div className="mt-2 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {pct(vision.malignant_recall)}
                </p>
                <p className="text-xs text-slate-500">Malignant-group recall</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {pct(vision.balanced_accuracy)}
                </p>
                <p className="text-xs text-slate-500">Balanced accuracy</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 font-medium text-slate-400">Not yet evaluated</p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Dermatoscopic benchmark — does not transfer directly to
            smartphone photos.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            History model benchmark
          </p>
          {history ? (
            <div className="mt-2 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {pct(history.malignant_recall)}
                </p>
                <p className="text-xs text-slate-500">Malignant recall</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {pct(history.balanced_accuracy)}
                </p>
                <p className="text-xs text-slate-500">Balanced accuracy</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 font-medium text-slate-400">Not yet evaluated</p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Trained on synthetic questionnaires — pipeline validation, not
            clinical validation.
          </p>
        </div>
      </div>

      {/* Prioritised queue */}
      <h2 className="mb-3 text-lg font-bold text-slate-800">Review queue</h2>
      {queue !== null && queue.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-400">
          <p className="text-4xl" aria-hidden="true">🗂️</p>
          <p className="mt-2 font-medium">No cases in the queue yet.</p>
        </div>
      )}
      {queue !== null && queue.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3">Risk score</th>
                <th className="px-4 py-3">Rules</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((c) => (
                <tr key={c.case_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${priorityColor(c.priority_score)}`}>
                        {c.priority_score}
                      </span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BAND_CHIP[c.final_band] || BAND_CHIP.INCONCLUSIVE}`}>
                      {c.final_band || "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.risk_score !== null && c.risk_score !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded bg-slate-200">
                          <div
                            className="h-2 rounded bg-blue-500"
                            style={{ width: `${Math.min(c.risk_score * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                          {c.risk_score.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.trigger_count}</td>
                  <td className="px-4 py-3">{c.image_ok ? "✅" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.username || "anonymous"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/cases/${c.case_id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
