// ── Admin Studio session (password + TOTP, server-held) ──────────────────────
// The session credential is an HttpOnly cookie set by the Netlify gateway;
// browser JavaScript can never read it, and nothing about the session is kept
// in sessionStorage/localStorage. This module only tracks, in memory, whether
// the server last told us the session is active, so the UI can render.

import { useSyncExternalStore } from "react";

const AUTH_URL = "/.netlify/functions/admin-auth";
const API_URL = "/.netlify/functions/admin-api";
const REQUEST_TIMEOUT_MS = 18000;
// Sign-in operations wait for the gateway, which itself retries Apps Script's
// intermittent echo-redirect 404s within its 55 s budget.
const AUTH_TIMEOUT_MS = 58000;
// Netlify buffers at most 6 MB per request; anything larger goes straight to
// Apps Script with a single-use, payload-bound ticket minted for this session.
const GATEWAY_MAX_BODY = 4_500_000;
const IDLE_LOCK_MS = 30 * 60 * 1000;
const KEEPALIVE_MS = 5 * 60 * 1000;
const EXEC_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_STUDIO_EXEC_URL) || "";

// Earlier builds kept the plaintext admin code in sessionStorage. Remove it
// from any tab that still has it.
try {
  sessionStorage.removeItem("adminUnlocked");
  sessionStorage.removeItem("adminAccessCode");
} catch { /* storage unavailable */ }

let state = { status: "unknown" }; // unknown | active | inactive
let lastActivity = Date.now();
let lastServerTouch = 0;
let idleTimer = null;
const listeners = new Set();

function setState(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
  if (state.status === "active") startIdleWatch();
  else stopIdleWatch();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAdminSessionStatus() {
  return state.status;
}

export function isAdminSessionActive() {
  return state.status === "active";
}

export function useAdminSessionStatus() {
  return useSyncExternalStore(subscribe, getAdminSessionStatus, getAdminSessionStatus);
}

export function markAdminSessionEnded() {
  if (state.status !== "inactive") setState({ status: "inactive" });
}

async function postJson(url, body, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-VIP-Admin": "1" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (ex) {
    if (ex?.name === "AbortError") throw Object.assign(new Error("Request timed out. Please try again."), { isTimeout: true });
    throw ex;
  } finally {
    clearTimeout(timer);
  }
  let parsed = null;
  try { parsed = await res.json(); } catch { /* non-JSON */ }
  if (res.status === 401 && parsed?.code === "SESSION_INVALID") markAdminSessionEnded();
  if (!res.ok || !parsed?.ok) {
    throw Object.assign(new Error(parsed?.error || `Request failed (${res.status})`), {
      httpStatus: res.status,
      code: parsed?.code || "",
      isTimeout: res.status === 504,
    });
  }
  lastServerTouch = Date.now();
  return parsed.data;
}

function newRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Re-submitting the same sign-in (e.g. after a timeout) reuses its requestId,
// so the server replays the first outcome instead of treating the already
// consumed 6-digit code as a failed replay. Held in memory only.
let lastAttempt = { key: "", id: "" };
function requestIdFor(op, fields) {
  const key = JSON.stringify([op, fields]);
  if (lastAttempt.key !== key) lastAttempt = { key, id: newRequestId() };
  return lastAttempt.id;
}

export async function adminAuthRequest(op, fields = {}) {
  const requestId = requestIdFor(op, fields);
  const data = await postJson(AUTH_URL, { ...fields, op, requestId }, AUTH_TIMEOUT_MS);
  lastAttempt = { key: "", id: "" };
  return data;
}

export async function checkAdminSession() {
  try {
    await adminAuthRequest("session");
    setState({ status: "active" });
    return true;
  } catch (ex) {
    if (ex?.httpStatus === 401 || ex?.httpStatus === 503) {
      setState({ status: "inactive" });
      return false;
    }
    // Network trouble: don't claim a session we could not confirm.
    if (state.status === "unknown") setState({ status: "inactive" });
    return false;
  }
}

export async function loginAdmin({ password, totp, recoveryCode }) {
  const data = await adminAuthRequest("login", recoveryCode ? { password, recoveryCode } : { password, totp });
  lastActivity = Date.now();
  setState({ status: "active" });
  return data;
}

export async function logoutAdmin() {
  try { await adminAuthRequest("logout"); } catch { /* cookie cleared server-side or already gone */ }
  setState({ status: "inactive" });
}

export async function logoutAllAdminSessions() {
  const data = await adminAuthRequest("logoutAll");
  setState({ status: "inactive" });
  return data;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// One admin request through the gateway (or, when too large, via a ticket).
export async function adminApiRequest(method, payload) {
  const payloadText = JSON.stringify(payload);
  if (method === "POST" && payloadText.length > GATEWAY_MAX_BODY) {
    if (!EXEC_URL) throw new Error("VITE_STUDIO_EXEC_URL not configured");
    const { ticket } = await adminAuthRequest("mintTicket", {
      targetAction: payload.action,
      payloadHash: await sha256Hex(payloadText),
    });
    const res = await fetch(EXEC_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ adminTicket: ticket, adminTicketPayload: payloadText }),
    });
    if (!res.ok) throw Object.assign(new Error(`API POST error: ${res.status}`), { httpStatus: res.status });
    const parsed = await res.json();
    if (parsed.error) throw Object.assign(new Error(parsed.error), { httpStatus: res.status });
    lastServerTouch = Date.now();
    return parsed.data;
  }
  return postJson(API_URL, { method, payload });
}

// On page load, ask the server only if the gateway's non-secret hint cookie
// says a session may exist — public visitors never trigger a session check.
function hasSessionHint() {
  try {
    return document.cookie.split(";").some((part) => part.trim().startsWith("vip_admin_hint=1"));
  } catch {
    return false;
  }
}

let bootPromise = null;
export function bootAdminSession() {
  if (!bootPromise) {
    bootPromise = hasSessionHint() ? checkAdminSession() : Promise.resolve(false).then(() => {
      if (state.status === "unknown") setState({ status: "inactive" });
      return false;
    });
  }
  return bootPromise;
}

if (typeof window !== "undefined") bootAdminSession();

// ── Idle lock ────────────────────────────────────────────────────────────────
// The server ends a session after 30 minutes without admin requests. While the
// person is actively using the page, a light keep-alive refreshes it; after 30
// minutes with no keyboard/mouse/touch activity the UI locks and signs out.

function noteActivity() {
  lastActivity = Date.now();
  if (state.status === "active" && Date.now() - lastServerTouch > KEEPALIVE_MS) {
    lastServerTouch = Date.now();
    checkAdminSession();
  }
}

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

function startIdleWatch() {
  if (idleTimer || typeof window === "undefined") return;
  ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, noteActivity, { passive: true }));
  idleTimer = window.setInterval(() => {
    if (Date.now() - lastActivity > IDLE_LOCK_MS) logoutAdmin();
  }, 30_000);
}

function stopIdleWatch() {
  if (!idleTimer) return;
  ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, noteActivity));
  window.clearInterval(idleTimer);
  idleTimer = null;
}
