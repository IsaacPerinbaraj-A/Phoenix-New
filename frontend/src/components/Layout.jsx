import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUser, isClinician } from "../auth.js";
import { logout } from "../api.js";
import { clearLastRun } from "../lastRun.js";
import Icon from "./Icon.jsx";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex h-16 items-center border-b-2 px-3 text-sm font-semibold transition-colors duration-150 ${
          isActive
            ? "border-brand-600 text-brand-700"
            : "border-transparent text-ink-secondary hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = async () => {
    await logout();
    clearLastRun();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface-card">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white">
                <Icon name="lens" size={16} />
              </span>
              <span className="text-lg font-bold tracking-tight text-navy">
                SkinSight
              </span>
            </Link>

            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
              <NavItem to="/">Home</NavItem>
              <NavItem to="/assess">New Assessment</NavItem>
              <NavItem to="/history">History</NavItem>
              {isClinician() && <NavItem to="/clinician">Clinician</NavItem>}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden items-center gap-2 rounded-full border border-line bg-surface-muted py-1 pl-1 pr-3 text-sm font-semibold text-ink sm:flex">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <Icon name={isClinician() ? "stethoscope" : "user"} size={13} />
                  </span>
                  {user}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-ghost h-9 px-3"
                >
                  <Icon name="log-out" size={14} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-ghost h-9 px-3 text-ink-secondary"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-9 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Compact nav for small screens */}
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-line px-2 sm:hidden"
          aria-label="Main mobile"
        >
          {[
            ["/", "Home"],
            ["/assess", "New Assessment"],
            ["/history", "History"],
            ...(isClinician() ? [["/clinician", "Clinician"]] : []),
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-ink-secondary"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface-card px-4 py-6">
        <div className="mx-auto flex max-w-shell flex-col items-center gap-1.5 text-center text-[13px] text-ink-muted sm:flex-row sm:justify-between">
          <p>Hackathon research prototype · Not a medical device · Not clinically validated</p>
          <p className="font-semibold text-ink-secondary">
            This is not a diagnosis. Only a doctor can tell you what it is.
          </p>
        </div>
      </footer>
    </div>
  );
}
