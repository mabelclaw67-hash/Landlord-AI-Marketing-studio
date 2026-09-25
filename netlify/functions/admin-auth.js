// Admin Studio sign-in gateway: password + TOTP (or one-time recovery code).
// The session token returned by Apps Script is placed in an HttpOnly cookie
// and is never included in a response body.
import crypto from "node:crypto";
import {
  callAppsScript, clearedSessionCookies, clientKey, guardRequest, header, isConfigured,
  isRateLimited, isSessionError, json, parseBody, readSessionCookie, recordFailure, sessionCookies,
} from "./_admin-shared.js";

const OPS = {
  login:              { action: "adminAuthLogin", session: false, limited: true },
  session:            { action: "adminAuthSession", session: true },
  status:             { action: "adminAuthStatus", session: true },
  logout:             { action: "adminAuthLogout", session: "optional" },
  logoutAll:          { action: "adminAuthLogoutAll", session: true },
  mintTicket:         { action: "adminAuthMintTicket", session: true },
  enrollBegin:        { action: "adminMfaEnrollBegin", session: false, limited: true },
  enrollConfirm:      { action: "adminMfaEnrollConfirm", session: false, limited: true },
  regenerateRecovery: { action: "adminRecoveryCodesRegenerate", session: true, limited: true },
  changePassword:     { action: "adminChangePassword", session: true, limited: true },
};

// Only these fields are forwarded per op, so the browser cannot smuggle
// gateway-only fields (adminBridgeToken, clientKey, adminSessionToken).
const FIELDS = {
  login: ["password", "totp", "recoveryCode"],
  session: [],
  status: [],
  logout: [],
  logoutAll: [],
  mintTicket: ["targetAction", "payloadHash"],
  enrollBegin: ["password", "enrollmentToken"],
  enrollConfirm: ["password", "enrollmentToken", "totp"],
  regenerateRecovery: ["totp"],
  changePassword: ["currentPassword", "newPassword", "confirmPassword", "totp"],
};

const MESSAGES = {
  ADMIN_AUTH_INVALID_CREDENTIALS: [401, "Incorrect password or verification code."],
  ADMIN_AUTH_LOCKED: [429, "Too many failed attempts. Sign-in is temporarily locked — try again in 15 minutes."],
  ADMIN_AUTH_MFA_NOT_ENROLLED: [409, "Two-step verification is not set up yet. Use first-time setup."],
  ADMIN_AUTH_SESSION_INVALID: [401, "Your admin session has ended. Please sign in again."],
  ADMIN_AUTH_BUSY: [503, "The server is still finishing your previous attempt. Please press the button again."],
};

export async function handler(event) {
  const rejected = guardRequest(event);
  if (rejected) return rejected;
  if (!isConfigured()) return json(503, { ok: false, error: "Admin sign-in is not configured on the server." });

  let input;
  try {
    input = parseBody(event, 20_000);
  } catch {
    return json(400, { ok: false, error: "Invalid request." });
  }
  const opName = String(input.op || "");
  const op = OPS[opName];
  if (!op) return json(400, { ok: false, error: "Unsupported request." });

  const key = clientKey(event);
  const limitKey = `admin-auth:${key}`;
  if (op.limited && isRateLimited(limitKey, 10, 15 * 60 * 1000)) {
    return json(429, { ok: false, error: MESSAGES.ADMIN_AUTH_LOCKED[1] });
  }

  const token = readSessionCookie(event);
  if (op.session === true && !token) {
    return json(401, { ok: false, error: MESSAGES.ADMIN_AUTH_SESSION_INVALID[1], code: "SESSION_INVALID" });
  }

  const payload = { action: op.action, clientKey: key, userAgent: String(header(event, "user-agent")).slice(0, 120) };
  for (const field of FIELDS[opName]) {
    if (input[field] !== undefined) payload[field] = String(input[field]).slice(0, 512);
  }
  if (op.session && token) payload.adminSessionToken = token;
  // Lets Apps Script replay the first outcome when a retry follows a lost
  // (echo-404) response. The browser reuses one id per sign-in attempt.
  payload.requestId = /^[A-Za-z0-9_-]{16,64}$/.test(String(input.requestId || ""))
    ? String(input.requestId)
    : crypto.randomBytes(18).toString("base64url");

  // Every admin-auth action is idempotent or replay-protected by requestId,
  // so echo-redirect 404s are retried here instead of surfacing to the user.
  const result = await callAppsScript(payload, { retryEcho404: true });

  if (result.error) {
    if (opName === "logout") return json(200, { ok: true, data: { loggedOut: true } }, clearedSessionCookies());
    if (op.limited && (result.error === "ADMIN_AUTH_INVALID_CREDENTIALS" || result.error === "ADMIN_AUTH_LOCKED")) recordFailure(limitKey);
    const known = MESSAGES[result.error];
    if (isSessionError(result.error)) {
      return json(401, { ok: false, error: MESSAGES.ADMIN_AUTH_SESSION_INVALID[1], code: "SESSION_INVALID" }, clearedSessionCookies());
    }
    if (known) return json(known[0], { ok: false, error: known[1], code: result.error.replace("ADMIN_AUTH_", "") });
    if (result.status !== 200) return json(result.status, { ok: false, error: "The server could not be reached. Please try again." });
    // Validation messages from Apps Script (e.g. password length) are safe to show.
    if (/^New password|^Invalid ticket/.test(result.error)) return json(400, { ok: false, error: result.error });
    return json(500, { ok: false, error: "The request could not be completed. Please try again." });
  }

  const data = result.data || {};
  if (opName === "login") {
    const { sessionToken, ...visible } = data;
    if (!sessionToken) return json(500, { ok: false, error: "The request could not be completed. Please try again." });
    return json(200, { ok: true, data: visible }, sessionCookies(sessionToken));
  }
  if (opName === "logout" || opName === "logoutAll" || (opName === "changePassword" && data.signedOut)) {
    return json(200, { ok: true, data }, clearedSessionCookies());
  }
  return json(200, { ok: true, data });
}
