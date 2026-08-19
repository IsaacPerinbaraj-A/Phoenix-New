import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api.js";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = await login(username.trim(), password);
      navigate(body.role === "clinician" ? "/clinician" : "/assess");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemoClinician = () => {
    setUsername("clinician");
    setPassword("clinic123");
    setError(null);
  };

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to keep your assessment history in one place.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="min-h-[48px] w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">
            Register here
          </Link>
        </p>

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-blue-800">🩺 Demo clinician account</p>
              <p className="mt-0.5 font-mono text-xs text-slate-600">
                clinician / clinic123
              </p>
            </div>
            <button
              type="button"
              onClick={fillDemoClinician}
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              Fill in
            </button>
          </div>
          <p className="mt-1 text-xs text-blue-700/70">
            Opens the clinician dashboard: prioritised review queue and live
            statistics.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Prototype accounts — demo use only, no real patient data.
        </p>
      </div>
    </div>
  );
}
