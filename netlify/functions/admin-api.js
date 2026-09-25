// Admin Studio data gateway. Every admin read/write from the browser goes
// through here: the HttpOnly session cookie is attached server-side together
// with the gateway secret, and Apps Script re-validates the session (8 h max,
// 30 min idle, revocable) on every request.
import {
  callAppsScript, clearedSessionCookies, guardRequest, isConfigured, isSessionError,
  json, parseBody, readSessionCookie,
} from "./_admin-shared.js";

const SESSION_ENDED = "Your admin session has ended. Please sign in again.";

export async function handler(event) {
  const rejected = guardRequest(event);
  if (rejected) return rejected;
  if (!isConfigured()) return json(503, { ok: false, error: "Admin gateway is not configured on the server." });

  let input;
  try {
    // Netlify caps buffered request bodies at 6 MB; larger uploads use a
    // single-use ticket sent straight to Apps Script instead (admin-auth mintTicket).
    input = parseBody(event, 5_900_000);
  } catch (error) {
    if (error?.message === "PAYLOAD_TOO_LARGE") return json(413, { ok: false, error: "Upload is too large." });
    return json(400, { ok: false, error: "Invalid request." });
  }

  const token = readSessionCookie(event);
  if (!token) return json(401, { ok: false, error: SESSION_ENDED, code: "SESSION_INVALID" });

  const method = input.method === "GET" ? "GET" : "POST";
  const payload = input.payload && typeof input.payload === "object" ? { ...input.payload } : {};
  const action = String(payload.action || "");
  if (!/^[A-Za-z][A-Za-z0-9]{1,60}$/.test(action) || /^admin(Auth|Mfa|Recovery|Change)/.test(action)) {
    return json(400, { ok: false, error: "Unsupported request." });
  }
  // Never let the browser supply gateway-only fields.
  delete payload.adminBridgeToken;
  delete payload.adminSessionToken;
  delete payload.adminTicket;
  delete payload.adminAccessCode;
  delete payload.adminProxyGet;

  const result = await callAppsScript({
    ...payload,
    adminSessionToken: token,
    ...(method === "GET" ? { adminProxyGet: true } : {}),
  });

  if (result.error) {
    if (isSessionError(result.error)) {
      return json(401, { ok: false, error: SESSION_ENDED, code: "SESSION_INVALID" }, clearedSessionCookies());
    }
    if (result.status !== 200) {
      return json(result.status, { ok: false, error: result.status === 504 ? "Request timed out. Please try again." : "The server could not be reached. Please try again." });
    }
    // Business-logic errors from Apps Script pass through unchanged, exactly as
    // they did when the browser called Apps Script directly.
    return json(200, { ok: false, error: result.error });
  }
  return json(200, { ok: true, data: result.data });
}
