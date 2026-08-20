// The last completed assessment run, persisted for the browser session so
// navigating back to the assess page shows the finished pipeline instead
// of a blank form. Cleared when a new case starts — and on login/register/
// logout, so a fresh session always starts at a fresh analysis page.

const LAST_RUN_KEY = "dermatriage_last_run";

export function loadLastRun() {
  try {
    const raw = sessionStorage.getItem(LAST_RUN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastRun(run) {
  try {
    sessionStorage.setItem(LAST_RUN_KEY, JSON.stringify(run));
  } catch {
    /* storage unavailable — the run just won't persist */
  }
}

export function clearLastRun() {
  try {
    sessionStorage.removeItem(LAST_RUN_KEY);
  } catch {
    /* ignore */
  }
}
