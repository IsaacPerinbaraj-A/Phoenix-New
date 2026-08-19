// Prototype auth state, kept in localStorage. The token is a bearer token
// issued by the backend; no urgency logic ever lives in the frontend.

const USER_KEY = "dermatriage_user";
const TOKEN_KEY = "dermatriage_token";
const ROLE_KEY = "dermatriage_role";

export function getUser() {
  return localStorage.getItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function isClinician() {
  return getRole() === "clinician";
}

export function setAuth(username, token, role) {
  localStorage.setItem(USER_KEY, username);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role || "worker");
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
