// Shared helpers for the Admin Studio gateway (admin-auth, admin-api).
//
// The admin session token lives only in an HttpOnly, Secure, SameSite=Strict
// cookie that browser JavaScript cannot read. These functions are the only
// place it is ever attached to a request, together with ADMIN_BRIDGE_TOKEN,
// which proves to Apps Script that the call came from this gateway.
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

export const COOKIE_NAME = "__Host-vip_admin";
export const SESSION_MAX_AGE_SEC = 8 * 60 * 60;
const UPSTREAM_TIMEOUT_MS = 55_000;

const PRODUCTION_ORIGINS = new Set(["https://www.vanislandproperty.ca", "https://vanislandproperty.ca"]);
const attempts = globalThis.__adminRateLimits || (globalThis.__adminRateLimits = new Map());

function isDevOrigin(origin) {
  return process.env.NETLIFY_DEV === "true" &&
    (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));
}

export function header(event, name) {
  const headers = event.headers || {};
  return headers[name] ?? headers[name.toLowerCase()] ?? "";
}

export function json(statusCode, body, cookies = []) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
    ...(cookies.length ? { multiValueHeaders: { "set-cookie": cookies } } : {}),
    body: JSON.stringify(body),
  };
}

// Same-origin only: no CORS headers are ever emitted, the Origin must be ours,
// the browser must mark the request same-origin, and a custom header forces a
// preflight that no other site can pass. Together with SameSite=Strict this
// closes cross-site request forgery.
export function guardRequest(event) {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed." });
  const origin = header(event, "origin");
  if (!PRODUCTION_ORIGINS.has(origin) && !isDevOrigin(origin)) {
    return json(403, { ok: false, error: "Request rejected." });
  }
  const fetchSite = header(event, "sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return json(403, { ok: false, error: "Request rejected." });
  if (header(event, "x-vip-admin") !== "1") return json(403, { ok: false, error: "Request rejected." });
  return null;
}

export function parseBody(event, maxBytes) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || "");
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(raw || "{}");
}

export function readSessionCookie(event) {
  const raw = header(event, "cookie");
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return "";
}

// HINT_COOKIE carries no secret: it only tells the SPA "a session cookie may
// exist, ask the server" so public visitors never trigger a session check.
export const HINT_COOKIE = "vip_admin_hint";

export function sessionCookies(token, maxAgeSec = SESSION_MAX_AGE_SEC) {
  return [
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`,
    `${HINT_COOKIE}=1; Path=/; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`,
  ];
}

export function clearedSessionCookies() {
  return [
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    `${HINT_COOKIE}=; Path=/; Secure; SameSite=Strict; Max-Age=0`,
  ];
}

export function clientKey(event) {
  const ip = String(header(event, "x-nf-client-connection-ip") || header(event, "x-forwarded-for") || "unknown").split(",")[0].trim();
  const salt = process.env.ADMIN_CLIENT_SALT || process.env.ADMIN_BRIDGE_TOKEN || "";
  return crypto.createHash("sha256").update(`${salt}:admin:${ip}`).digest("hex").slice(0, 32);
}

// Best-effort per-instance failure counter (defence in depth; Apps Script
// holds the authoritative lockout). Only failed attempts count.
export function isRateLimited(key, limit, windowMs) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < windowMs);
  attempts.set(key, recent);
  return recent.length >= limit;
}

export function recordFailure(key) {
  const list = attempts.get(key) || [];
  list.push(Date.now());
  attempts.set(key, list);
}

export function isConfigured() {
  return Boolean(process.env.ADMIN_APPS_SCRIPT_URL && process.env.ADMIN_BRIDGE_TOKEN);
}

// Server-to-server call to Apps Script. Returns { status, data, error }.
//
// Apps Script answers a POST with 302 → script.googleusercontent.com/
// macros/echo?user_content_key=…, where the output is stored; fetching that
// URL intermittently 404s, and a stale one can 302 back to /exec (observed
// live). A browser can only follow blindly; here every redirect is handled
// explicitly, and a redirect is NEVER taken as proof the POST did not run:
//   • the POST is sent exactly once per attempt, redirect:"manual";
//   • only the echo GET is retried (on 404) — reading stored output is safe;
//   • nothing outside the echo URL is ever followed (following a bounce to
//     /exec would re-run the script as a parameter-less GET);
//   • any other outcome is "result unknown" → 404 to the caller.
// Re-sending the POST is allowed only with `retryEcho404`, which admin-auth
// uses because every one of its writes is replayed by requestId in Apps
// Script (see handleAdminAuthAction_). Data writes are never re-sent.
const ECHO_URL = /^https:\/\/script\.googleusercontent\.com\/macros\/echo\?/;
const RESULT_UNKNOWN = { status: 404, error: "UPSTREAM_FAILED" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBefore(deadline, url, init) {
  const remaining = deadline - Date.now();
  if (remaining < 1000) throw Object.assign(new Error("deadline"), { name: "AbortError" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function postOnce(deadline, post) {
  const response = await fetchBefore(deadline, process.env.ADMIN_APPS_SCRIPT_URL, post);
  if (response.status >= 200 && response.status < 300) return response;
  const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") || "" : "";
  if (!ECHO_URL.test(location)) return null; // unknown whether the script ran
  let echo = null;
  for (let tryNo = 0; tryNo < 5; tryNo++) {
    echo = await fetchBefore(deadline, location, { redirect: "manual" });
    if (echo.status !== 404) break; // 404 can recover on the same URL
    await sleep(Math.min(600 * (tryNo + 1), Math.max(0, deadline - Date.now() - 1000)));
  }
  return echo && echo.status === 200 ? echo : null;
}

export async function callAppsScript(payload, { retryEcho404 = false } = {}) {
  const deadline = Date.now() + UPSTREAM_TIMEOUT_MS;
  const post = {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, adminBridgeToken: process.env.ADMIN_BRIDGE_TOKEN }),
    redirect: "manual",
  };
  try {
    for (let attempt = 0; attempt < (retryEcho404 ? 3 : 1); attempt++) {
      const response = await postOnce(deadline, post);
      if (!response) continue;
      const parsed = await response.json();
      if (parsed && parsed.error) return { status: 200, error: String(parsed.error) };
      return { status: 200, data: parsed ? parsed.data : null };
    }
    return RESULT_UNKNOWN;
  } catch (error) {
    if (error?.name === "AbortError") return { status: 504, error: "UPSTREAM_TIMEOUT" };
    return { status: 502, error: "UPSTREAM_FAILED" };
  }
}

// Only an explicit, server-confirmed session failure ends the browser session.
// A generic "Admin access required." (e.g. a request that lost its body in
// transit) is surfaced as an error without clearing the cookie.
export function isSessionError(message) {
  return message === "ADMIN_AUTH_SESSION_INVALID";
}
