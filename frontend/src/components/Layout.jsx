import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUser } from "../auth.js";
import { logout } from "../api.js";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-20 bg-slate-900 shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span aria-hidden="true" className="text-2xl">🩺</span>
            <span className="text-lg font-bold text-white">DermaTriage</span>
            <span className="hidden rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
              Prototype
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/assess">New Assessment</NavItem>
            <NavItem to="/history">History</NavItem>
            <NavItem to="/clinician">Clinician</NavItem>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="rounded-full bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200">
                  👤 {user}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 text-center text-xs text-slate-500 sm:flex-row sm:justify-between">
          <p>
            Hackathon research prototype · Not a medical device · Not
            clinically validated
          </p>
          <p className="font-medium">
            This is not a diagnosis. Only a doctor can tell you what it is.
          </p>
        </div>
      </footer>
    </div>
  );
}
