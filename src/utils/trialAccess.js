// Admin request auth for the shared studio API helpers.
//
// Admin requests no longer carry any credential from the browser. When the
// server-held MFA session is active, callers spread a routing marker into
// their payload; api.js / homeSaleSheet.js see it and send the request through
// the Netlify admin gateway, which attaches the HttpOnly session cookie.
import { isAdminSessionActive, logoutAdmin, markAdminSessionEnded } from "./adminSession.js";

export { isAdminSessionActive };

export const ADMIN_ROUTE_MARKER = "__adminSession";

/** Sign out on the server and locally. */
export function clearAdminSession() {
  markAdminSessionEnded();
  return logoutAdmin();
}

export function getStudioRequestAuth() {
  return isAdminSessionActive() ? { [ADMIN_ROUTE_MARKER]: true } : {};
}

export function isStudioRequestAuthReady(auth) {
  return Boolean(auth?.[ADMIN_ROUTE_MARKER]);
}

/** Split a request payload into { viaAdmin, payload } with the marker removed. */
export function takeAdminRoute(body) {
  if (!body || !body[ADMIN_ROUTE_MARKER]) return { viaAdmin: false, payload: body };
  const payload = { ...body };
  delete payload[ADMIN_ROUTE_MARKER];
  return { viaAdmin: true, payload };
}
