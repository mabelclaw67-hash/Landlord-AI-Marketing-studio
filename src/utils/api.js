// ── Apps Script API client ────────────────────────────────────────────────────
// All network traffic goes through the deployed Apps Script web app.
// When VITE_STUDIO_EXEC_URL is not set the functions throw and the storage
// adapter falls back to localStorage automatically.

import { beginPerfTrace } from "./perfLog.js";
import { adminApiRequest } from "./adminSession.js";
import { takeAdminRoute } from "./trialAccess.js";

const EXEC_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_STUDIO_EXEC_URL) || "";

export function isApiConnected() {
  return !!EXEC_URL;
}

// ── Apps Script redirect-delivery retry ──────────────────────────────────────
// Apps Script answers /exec with a 302 to script.googleusercontent.com/macros/echo.
// The script body always runs before that redirect is issued, but fetching the
// echo response intermittently fails with HTTP 404 (measured ~25-30% against
// production, correlated with slow responses; the same echo URL can 404 twice
// and then return 200). A browser fetch cannot retry only the echo leg —
// redirect:"manual" yields an opaque response with no Location — so the whole
// request is re-sent. That is safe only for actions that are idempotent, which
// is why POST retries are opt-in per action below.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;
const READ_TIMEOUT_RETRY_DELAY_MS = 400;

// No request to the Apps Script backend may hang forever — a slow/stuck
// execution must not leave a page stuck on "Loading..." indefinitely. 18s
// sits inside the 15-20s window callers are expected to design around,
// leaving headroom for the redirect-retry loop above it.
const REQUEST_TIMEOUT_MS = 18000;

function timeoutError() {
  return Object.assign(new Error("Request timed out. Please try again."), { isTimeout: true });
}

// fetch() with a hard deadline. AbortController cancels the in-flight
// request at REQUEST_TIMEOUT_MS so a stuck Apps Script execution can never
// leave the caller waiting past that point.
async function fetchWithTimeout(input, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (ex) {
    if (ex?.name === "AbortError") throw timeoutError();
    throw ex;
  } finally {
    clearTimeout(timer);
  }
}

// Only reads are re-sent. A 404 means the script already ran and only its
// response was lost, so no write is ever re-sent automatically — the user is
// asked to refresh and check what was actually saved (WRITE_RESULT_UNKNOWN).
const RETRYABLE_POST_ACTIONS = new Set([
  "getListings",
  "getListingById",
  "getCollagePhotoData",
  "getApplicationsByListing",
  "getAllApplications",
]);

export const WRITE_RESULT_UNKNOWN =
  "保存结果不明（服务器响应丢失），请先刷新页面，确认是否已保存，再决定是否重新提交。 " +
  "The save result is unknown (the server response was lost). Refresh the page and check whether it was saved before submitting again.";

// A lost response on a non-retryable action: the write may have succeeded.
function unknownResultError(ex, action) {
  if (ex?.httpStatus !== 404 || RETRYABLE_POST_ACTIONS.has(action)) return ex;
  return Object.assign(new Error(WRITE_RESULT_UNKNOWN), { httpStatus: 404, resultUnknown: true, cause: ex });
}

const READ_ONLY_POST_ACTIONS = new Set([
  "getListings",
  "getListingById",
  "getCollagePhotoData",
  "getApplicationsByListing",
  "getAllApplications",
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRedirectRetry(attempt, shouldRetry) {
  let lastError;
  for (let i = 0; i < (shouldRetry ? MAX_ATTEMPTS : 1); i++) {
    try {
      return await attempt();
    } catch (ex) {
      lastError = ex;
      if (ex?.httpStatus !== 404) throw ex;
      if (i < MAX_ATTEMPTS - 1) await sleep(RETRY_DELAY_MS * (i + 1));
    }
  }
  throw lastError;
}

async function withTimeoutRetry(attempt, shouldRetry) {
  try {
    return await attempt();
  } catch (ex) {
    if (!shouldRetry || !ex?.isTimeout) throw ex;
    await sleep(READ_TIMEOUT_RETRY_DELAY_MS);
    return attempt();
  }
}

// GET ?action=xxx[&key=val ...]
// Admin requests (marked by getStudioRequestAuth) go through the Netlify admin
// gateway, which attaches the HttpOnly MFA session cookie; the same retry
// rules apply. Public requests still go straight to Apps Script.
export async function apiGet(rawParams) {
  const { viaAdmin, payload: params } = takeAdminRoute(rawParams);
  if (viaAdmin) return adminGet(params);
  if (!EXEC_URL) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const trace = beginPerfTrace(params.action, params);
  const url = new URL(EXEC_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  try {
    const json = await withTimeoutRetry(() => withRedirectRetry(async () => {
        // Bust the Apps Script GET cache per attempt, not per call.
        url.searchParams.set("_t", String(Date.now()));
        const res = await fetchWithTimeout(url.toString(), { redirect: "follow", cache: "no-store" });
        if (!res.ok) throw Object.assign(new Error(`API GET error: ${res.status}`), { httpStatus: res.status });
        const body = await res.json();
        if (body.error) throw Object.assign(new Error(body.error), { httpStatus: res.status });
        trace?.finish("success", { httpStatus: res.status });
        return body;
      }, true), true);
    return json.data;
  } catch (ex) {
    trace?.finish("error", { httpStatus: ex.httpStatus ?? null, errorMessage: ex.message });
    throw ex;
  }
}

// POST { action, ...payload }
// Uses text/plain to avoid CORS preflight — Apps Script parses e.postData.contents.
// Apps Script processes doPost on the initial request, then 302-redirects to serve
// the response via script.googleusercontent.com. redirect:"follow" lets the browser
// fetch that response correctly.
export async function apiPost(rawBody) {
  const { viaAdmin, payload: body } = takeAdminRoute(rawBody);
  if (viaAdmin) return adminPost(body);
  if (!EXEC_URL) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const trace = beginPerfTrace(body.action, body);
  const payload = JSON.stringify(body);
  try {
    const isReadOnly = READ_ONLY_POST_ACTIONS.has(body.action);
    const json = await withTimeoutRetry(() => withRedirectRetry(async () => {
        const res = await fetchWithTimeout(EXEC_URL, {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain" },
          body: payload,
        });
        if (!res.ok) throw Object.assign(new Error(`API POST error: ${res.status}`), { httpStatus: res.status });
        const parsed = await res.json();
        if (parsed.error) throw Object.assign(new Error(parsed.error), { httpStatus: res.status });
        trace?.finish("success", { httpStatus: res.status });
        return parsed;
      }, RETRYABLE_POST_ACTIONS.has(body.action)), isReadOnly);
    return json.data;
  } catch (ex) {
    trace?.finish("error", { httpStatus: ex.httpStatus ?? null, errorMessage: ex.message });
    throw unknownResultError(ex, body.action);
  }
}

async function adminGet(params) {
  const trace = beginPerfTrace(params.action, params);
  const stringParams = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
  try {
    const data = await withTimeoutRetry(
      () => withRedirectRetry(() => adminApiRequest("GET", stringParams), true),
      true,
    );
    trace?.finish("success", { httpStatus: 200 });
    return data;
  } catch (ex) {
    trace?.finish("error", { httpStatus: ex.httpStatus ?? null, errorMessage: ex.message });
    throw ex;
  }
}

async function adminPost(body) {
  const trace = beginPerfTrace(body.action, body);
  try {
    const data = await withTimeoutRetry(
      () => withRedirectRetry(() => adminApiRequest("POST", body), RETRYABLE_POST_ACTIONS.has(body.action)),
      READ_ONLY_POST_ACTIONS.has(body.action),
    );
    trace?.finish("success", { httpStatus: 200 });
    return data;
  } catch (ex) {
    trace?.finish("error", { httpStatus: ex.httpStatus ?? null, errorMessage: ex.message });
    throw unknownResultError(ex, body.action);
  }
}

// Verify the Apps Script deployment is reachable.
export async function pingApi() {
  return apiGet({ action: "ping" });
}
