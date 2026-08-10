// ── Lightweight performance monitoring ─────────────────────────────────────
// Tracks timing/errors for exactly 6 operations (Load Listings, Generate
// Cover Page, Save Cover Page, Upload Image, AI Marketing, Property Update)
// so intermittent slowness / 404s / timeouts can be diagnosed from the
// System Performance admin page.
//
// Storage: last 100 entries in localStorage on this browser — no new
// database, no server changes, no change to any business flow. Every
// public function here is wrapped so a logging failure (e.g. storage full,
// private browsing) can never throw into — or affect the outcome of —
// the operation being measured.
//
// Requests to the Apps Script backends go straight from the browser to
// script.google.com (no Netlify Function in between for these 6 ops), so
// there is no separate "Netlify" timing segment to report. `serverMs` is
// reserved for a future phase where the Apps Script side reports its own
// execution time in the response payload; until then it is always null and
// the UI shows "—" for it.

const STORAGE_KEY = "vanisland_perf_log_v1";
const MAX_ENTRIES = 100;

export const PERF_OPERATIONS = {
  LOAD_LISTINGS:   "Load Listings",
  GENERATE_COVER:  "Generate Cover Page",
  SAVE_COVER:      "Save Cover Page",
  UPLOAD_IMAGE:    "Upload Image",
  AI_MARKETING:    "AI Marketing",
  PROPERTY_UPDATE: "Property Update",
};

// Action name (as sent to the Apps Script `action` param) → operation bucket.
// A few actions are reused for more than one purpose by the backend (e.g.
// "updateSaleListing" also saves the cover photo field) — those are
// disambiguated in classifyOperation() by inspecting the request payload.
const ACTION_MAP = {
  getListings: PERF_OPERATIONS.LOAD_LISTINGS,
  getListingById: PERF_OPERATIONS.LOAD_LISTINGS,
  getSaleListings: PERF_OPERATIONS.LOAD_LISTINGS,
  getSaleListingById: PERF_OPERATIONS.LOAD_LISTINGS,
  saveListing: PERF_OPERATIONS.PROPERTY_UPDATE,
  createSaleListing: PERF_OPERATIONS.PROPERTY_UPDATE,
  updateSaleListing: PERF_OPERATIONS.PROPERTY_UPDATE,
  uploadToSubfolder: PERF_OPERATIONS.UPLOAD_IMAGE,
  uploadSaleToSubfolder: PERF_OPERATIONS.UPLOAD_IMAGE,
  uploadListingFile: PERF_OPERATIONS.UPLOAD_IMAGE,
  uploadFile: PERF_OPERATIONS.UPLOAD_IMAGE,
  uploadSaleMediaFile: PERF_OPERATIONS.UPLOAD_IMAGE,
  uploadSaleEnhancedPhoto: PERF_OPERATIONS.UPLOAD_IMAGE,
  generateHomeSaleMarketingCopy: PERF_OPERATIONS.AI_MARKETING,
  createOrUpdateMarketingCopy: PERF_OPERATIONS.AI_MARKETING,
};

// Requests slower than this are flagged amber ("slow") in the UI even when
// they succeed. Apps Script cold starts routinely take several seconds, so
// this is intentionally generous — tune after real data comes in.
export const SLOW_MS_THRESHOLD = 4000;

function classifyOperation(action, params) {
  if (
    action === "updateSaleListing" &&
    params &&
    params.record &&
    Object.prototype.hasOwnProperty.call(params.record, "Primary Photo URL")
  ) {
    return PERF_OPERATIONS.SAVE_COVER;
  }
  if (
    (action === "uploadToSubfolder" || action === "uploadSaleToSubfolder") &&
    params &&
    params.subfolderName === "03_Cover_Images"
  ) {
    return PERF_OPERATIONS.SAVE_COVER;
  }
  return ACTION_MAP[action] || null;
}

function genRequestId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to manual id
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function readLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full / unavailable (private browsing, quota exceeded, etc).
    // Monitoring must never break the app it's watching.
  }
}

function record(entry) {
  try {
    const entries = readLog();
    entries.unshift(entry);
    writeLog(entries);
  } catch {
    // never throw from logging
  }
}

/**
 * Starts a trace for a network call (apiGet/apiPost/homeSaleApiGet/homeSaleApiPost).
 * Returns null when `action` isn't one of the 6 tracked operations, so
 * unrelated actions (the large majority of API traffic) pay zero cost.
 *
 * Usage:
 *   const trace = beginPerfTrace(action, params);
 *   try {
 *     ...
 *     trace?.finish("success", { httpStatus });
 *   } catch (ex) {
 *     trace?.finish("error", { httpStatus: ex.httpStatus, errorMessage: ex.message });
 *     throw ex;
 *   }
 */
export function beginPerfTrace(action, params) {
  const operation = classifyOperation(action, params);
  if (!operation) return null;

  const requestId = genRequestId();
  const startedAt = Date.now();
  const t0 = now();
  let finished = false;

  return {
    requestId,
    operation,
    finish(status, meta = {}) {
      if (finished) return;
      finished = true;
      try {
        record({
          requestId,
          operation,
          action,
          startedAt,
          durationMs: Math.round(now() - t0),
          status,
          httpStatus: meta.httpStatus ?? null,
          errorMessage: meta.errorMessage ?? null,
          serverMs: meta.serverMs ?? null,
        });
      } catch {
        // never throw from logging
      }
    },
  };
}

/**
 * Times a frontend-only async step that never hits the network (currently:
 * cover-page collage generation, a pure Canvas operation). Always returns/
 * throws exactly what `fn` does — logging is purely observational.
 */
export function traceLocal(operation, action, fn) {
  const requestId = genRequestId();
  const startedAt = Date.now();
  const t0 = now();
  const finish = (status, meta = {}) => {
    try {
      record({
        requestId,
        operation,
        action,
        startedAt,
        durationMs: Math.round(now() - t0),
        status,
        httpStatus: null,
        errorMessage: meta.errorMessage ?? null,
        serverMs: null,
      });
    } catch {
      // never throw from logging
    }
  };
  return fn().then(
    (result) => {
      finish("success");
      return result;
    },
    (err) => {
      finish("error", { errorMessage: err && err.message ? err.message : String(err) });
      throw err;
    }
  );
}

export function getPerfLog() {
  return readLog();
}

export function clearPerfLog() {
  writeLog([]);
}
