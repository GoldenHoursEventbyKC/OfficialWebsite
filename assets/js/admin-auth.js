const ADMIN_AUTH_KEY = "gh_admin_authenticated";
const ADMIN_SESSION_KEY = ADMIN_AUTH_KEY;
const ADMIN_TOKEN_KEY = "gh_admin_token";

function getConfiguredAdminToken() {
  return typeof CONFIG !== "undefined" && CONFIG.ADMIN_API_TOKEN
    ? CONFIG.ADMIN_API_TOKEN
    : "";
}

function storeAdminToken() {
  const token = getConfiguredAdminToken();
  if (!token) return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

function isAdminAuthenticated() {
  return (
    localStorage.getItem(ADMIN_AUTH_KEY) === "true" ||
    sessionStorage.getItem(ADMIN_SESSION_KEY) === "true"
  );
}

function setAdminAuthenticated() {
  localStorage.setItem(ADMIN_AUTH_KEY, "true");
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  storeAdminToken();
}

function clearAdminAuth() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

function requireAdminPage() {
  if (!isAdminAuthenticated()) {
    alert("Please log in through Settings on the main website first.");
    window.location.href = "../index.html";
    return false;
  }
  storeAdminToken();
  return true;
}

function getAdminHeaders() {
  const token =
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    sessionStorage.getItem(ADMIN_TOKEN_KEY) ||
    getConfiguredAdminToken() ||
    "";
  return token ? { "X-Admin-Token": token } : {};
}

function apiUrl(path) {
  const base = typeof CONFIG !== "undefined" ? CONFIG.API_BASE_URL : "";
  return `${base}${path}`;
}

async function apiFetch(path, options = {}) {
  const url = apiUrl(path);
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${response.status})`);
  }
  return response.json();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-admin-logout]").forEach((logoutLink) => {
    logoutLink.addEventListener("click", (event) => {
      event.preventDefault();
      clearAdminAuth();
      window.location.href = "../index.html";
    });
  });
});
