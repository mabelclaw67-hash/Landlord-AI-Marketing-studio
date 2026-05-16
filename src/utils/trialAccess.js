const TRIAL_ACCESS_KEY   = "vanisland_trial_access_v1";
const ADMIN_SESSION_KEY  = "adminUnlocked";
const ADMIN_CODE_KEY     = "adminAccessCode";

function normalizeModuleValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("both")) return "Both";
  if (text.includes("rental")) return "Rental Only";
  if (text.includes("sale")) return "Sale Only";
  return "";
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const dt = new Date(expiresAt);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getTime() < Date.now();
}

export function readTrialAccess() {
  try {
    const raw = localStorage.getItem(TRIAL_ACCESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || isExpired(parsed.accessExpiresAt)) {
      clearTrialAccess();
      return null;
    }
    return { ...parsed, approvedModule: normalizeModuleValue(parsed.approvedModule) };
  } catch {
    clearTrialAccess();
    return null;
  }
}

export function saveTrialAccess(session) {
  const value = {
    email: String(session.email || "").trim(),
    name: String(session.name || "").trim(),
    accessCode: String(session.accessCode || "").trim(),
    approvedModule: normalizeModuleValue(session.approvedModule),
    accessType: String(session.accessType || "").trim(),
    paymentStatus: String(session.paymentStatus || "").trim(),
    approvedAt: session.approvedAt || "",
    accessExpiresAt: session.accessExpiresAt || "",
  };
  localStorage.setItem(TRIAL_ACCESS_KEY, JSON.stringify(value));
  return value;
}

export function clearTrialAccess() {
  localStorage.removeItem(TRIAL_ACCESS_KEY);
}

export function canAccessModule(session, module) {
  const approvedModule = normalizeModuleValue(session?.approvedModule);
  if (!approvedModule || isExpired(session?.accessExpiresAt)) return false;
  if (approvedModule === "Both") return true;
  if (module === "rental") return approvedModule === "Rental Only";
  if (module === "sale") return approvedModule === "Sale Only";
  return false;
}

export function getTrialAccessHome(approvedModule) {
  const normalized = normalizeModuleValue(approvedModule);
  if (normalized === "Sale Only") return "/admin/home-sale";
  if (normalized === "Both") return "/admin";
  return "/admin/rental";
}

export function getTrialModuleLabel(module) {
  if (module === "sale") return "Home Sale Studio / 出售模块";
  if (module === "rental") return "Rental Studio / 出租模块";
  return "Vanisland AI Marketing Studio";
}

export function isAdminSessionActive() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
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

export function getStudioRequestAuth(module = "") {
  const payload = {};
  const trial = readTrialAccess();

  if (trial && canAccessModule(trial, module || (trial.approvedModule === "Sale Only" ? "sale" : "rental"))) {
    payload.accessEmail = trial.email;
    payload.accessCode = trial.accessCode;
    payload.approvedModule = trial.approvedModule;
  }

  if (isAdminSessionActive()) {
    // Code stored at login time (validated by backend on first unlock)
    const code = sessionStorage.getItem(ADMIN_CODE_KEY) || "";
    if (code) payload.adminAccessCode = code;
  }

  return payload;
}
