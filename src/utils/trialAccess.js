const ADMIN_SESSION_KEY  = "adminUnlocked";
const ADMIN_CODE_KEY     = "adminAccessCode";

export function isAdminSessionActive() {
  try {
    // The flag and the validated code are one session. A stale flag without
    // its code must never make the admin UI look authenticated.
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1" &&
      Boolean(sessionStorage.getItem(ADMIN_CODE_KEY));
  } catch {
    return false;
  }
}

/** Store a validated admin code in session (called after backend confirms the code). */
export function storeAdminSession(code) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  sessionStorage.setItem(ADMIN_CODE_KEY, code);
}

/** Clear admin session completely (lock out). */
export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_CODE_KEY);
}

/** Overwrite the stored admin code after a successful code change. */
export function refreshAdminCode(newCode) {
  if (isAdminSessionActive()) {
    sessionStorage.setItem(ADMIN_CODE_KEY, newCode);
  }
}

export function getStudioRequestAuth() {
  const payload = {};
  if (isAdminSessionActive()) {
    // Code stored at login time (validated by backend on first unlock)
    const code = sessionStorage.getItem(ADMIN_CODE_KEY) || "";
    if (code) payload.adminAccessCode = code;
  }

  return payload;
}

export function isStudioRequestAuthReady(auth) {
  return Boolean(auth?.adminAccessCode);
}
