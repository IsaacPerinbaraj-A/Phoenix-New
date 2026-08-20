import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api.js";
import { clearLastRun } from "../lastRun.js";
import Icon from "../components/Icon.jsx";

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
      // A fresh session starts at a fresh analysis page.
      clearLastRun();
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
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Icon name="lock" size={16} />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">Log in</h1>
            <p className="text-xs text-ink-muted">
              Sign in to keep your assessment history in one place.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-urgent-line bg-urgent-bg px-3.5 py-2.5 text-[13px] font-medium text-urgent-text"
            >
              <Icon name="alert-triangle" size={15} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-ink-muted">
          No account?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Register here
          </Link>
        </p>

        <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-700">Demo clinician account</p>
              <p className="num mt-0.5 text-xs text-ink-secondary">clinician / clinic123</p>
            </div>
            <button
              type="button"
              onClick={fillDemoClinician}
              className="rounded-md border border-brand-100 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors duration-150 hover:bg-brand-50"
            >
              Fill in
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Opens the clinician dashboard: prioritised review queue and live
            statistics.
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-faint">
          Prototype accounts — demo use only, no real patient data.
        </p>
      </div>
    </div>
  );
}
