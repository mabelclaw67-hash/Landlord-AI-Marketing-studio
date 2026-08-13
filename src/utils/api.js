// ── Apps Script API client ────────────────────────────────────────────────────
// All network traffic goes through the deployed Apps Script web app.
// When VITE_STUDIO_EXEC_URL is not set the functions throw and the storage
// adapter falls back to localStorage automatically.

import { beginPerfTrace } from "./perfLog.js";

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

// Reads are idempotent, and every write listed here overwrites a fixed target
// (same sheet row, or same Drive filename, which uploadToSubfolder_ trashes
// before recreating). Append-style actions — saveContact, saveRentalApplication,
// dispute/strategy intake — are deliberately absent: re-sending those would
// create duplicate records.
const RETRYABLE_POST_ACTIONS = new Set([
  "getListings",
  "getListingById",
  "getCollagePhotoData",
  "getApplicationsByListing",
  "getAllApplications",
  "saveListing",
  "uploadToSubfolder",
  "updateVideoUrl",
  "syncVideoUrl",
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

// GET ?action=xxx[&key=val ...]
export async function apiGet(params) {
  if (!EXEC_URL) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const trace = beginPerfTrace(params.action, params);
  const url = new URL(EXEC_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  try {
    const json = await withRedirectRetry(async () => {
      // Bust the Apps Script GET cache per attempt, not per call.
      url.searchParams.set("_t", String(Date.now()));
      const res = await fetch(url.toString(), { redirect: "follow", cache: "no-store" });
      if (!res.ok) throw Object.assign(new Error(`API GET error: ${res.status}`), { httpStatus: res.status });
      const body = await res.json();
      if (body.error) throw Object.assign(new Error(body.error), { httpStatus: res.status });
      trace?.finish("success", { httpStatus: res.status });
      return body;
    }, true);
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
export async function apiPost(body) {
  if (!EXEC_URL) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const trace = beginPerfTrace(body.action, body);
  const payload = JSON.stringify(body);
  try {
    const json = await withRedirectRetry(async () => {
      const res = await fetch(EXEC_URL, {
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
    }, RETRYABLE_POST_ACTIONS.has(body.action));
    return json.data;
  } catch (ex) {
    trace?.finish("error", { httpStatus: ex.httpStatus ?? null, errorMessage: ex.message });
    throw ex;
  }
}

// Verify the Apps Script deployment is reachable.
export async function pingApi() {
  return apiGet({ action: "ping" });
}
