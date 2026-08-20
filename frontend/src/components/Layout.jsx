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
        `inline-flex h-14 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? "border-brand-500 text-white"
            : "border-transparent text-navy-text hover:text-white"
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
    <div className="flex min-h-screen flex-col bg-page">
      <header className="sticky top-0 z-20 border-b border-navy-line bg-navy">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
                <Icon name="activity" size={14} strokeWidth={2} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-white">
                SkinSight
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-navy-text sm:inline">
                Prototype
              </span>
            </Link>

            <nav className="hidden items-center sm:flex" aria-label="Main">
              <NavItem to="/">Home</NavItem>
              <NavItem to="/assess">New Assessment</NavItem>
              <NavItem to="/history">History</NavItem>
              {isClinician() && <NavItem to="/clinician">Clinician</NavItem>}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden items-center gap-1.5 text-sm text-navy-text sm:flex">
                  <Icon name="user" size={14} />
                  <span className="text-white">{user}</span>
                  {isClinician() && (
                    <span className="ml-1 rounded-sm border border-navy-line px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.06em] text-navy-text">
                      Clinician
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-navy-text transition-colors duration-150 hover:bg-navy-soft hover:text-white"
                >
                  <Icon name="log-out" size={14} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-navy-text transition-colors duration-150 hover:bg-navy-soft hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-8 items-center rounded-md bg-brand-600 px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-500"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Compact nav for small screens */}
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-navy-line px-2 sm:hidden"
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
                `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "border-brand-500 text-white"
                    : "border-transparent text-navy-text"
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

      <footer className="border-t border-line bg-white px-4 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 text-center text-xs text-ink-muted sm:flex-row sm:justify-between">
          <p>Hackathon research prototype · Not a medical device · Not clinically validated</p>
          <p className="font-medium text-ink-secondary">
            This is not a diagnosis. Only a doctor can tell you what it is.
          </p>
        </div>
      </footer>
    </div>
  );
}
