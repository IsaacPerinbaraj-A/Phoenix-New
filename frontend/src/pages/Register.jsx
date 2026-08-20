import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api.js";
import { clearLastRun } from "../lastRun.js";
import Icon from "../components/Icon.jsx";

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register(username.trim(), password);
      clearLastRun();
      navigate("/assess");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Icon name="user" size={16} />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              Create an account
            </h1>
            <p className="text-xs text-ink-muted">
              3–32 characters (letters, numbers, underscore); password at
              least 6 characters.
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
              minLength={3}
              maxLength={32}
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
              minLength={6}
              autoComplete="new-password"
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              Confirm password
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
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
            {busy ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-4 text-center text-[11px] text-ink-faint">
          Prototype accounts — demo use only, no real patient data.
        </p>
      </div>
    </div>
  );
}
