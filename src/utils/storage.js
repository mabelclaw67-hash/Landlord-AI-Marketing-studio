// ── Storage adapter v0.2 ──────────────────────────────────────────────────────
// When VITE_STUDIO_EXEC_URL is set → Google Sheets / Drive via Apps Script.
// When it is absent             → localStorage (prototype mode).
//
// All exports are async Promises so components work identically in both modes.
// In v0.3+, swap the API layer without touching any component.

import { isApiConnected, apiGet, apiPost } from "./api.js";
import { getStudioRequestAuth, isStudioRequestAuthReady } from "./trialAccess.js";
import { publicUpload } from "./publicUpload.js";

const LISTINGS_KEY = "vanisland_listings_v1";
const PUBLIC_LISTINGS_LAST_GOOD_KEY = "vanisland_public_listings_last_good_v1";

// Small browser-only SWR cache for the three high-frequency Rental reads.
// Google Sheets remains the source of truth; this cache only shortens repeat
// reads within the current page session and never persists API data.
const RENTAL_READ_TTLS = {
  listings: 60_000,
  applicationsByListing: 30_000,
  applicationById: 15_000,
};

const rentalReadCache = {
  listings: { value: undefined, expiresAt: 0, refreshPromise: null, generation: 0, listeners: new Set() },
  publicListings: { value: undefined, expiresAt: 0, refreshPromise: null, generation: 0, listeners: new Set() },
  applicationsByListing: new Map(),
  applicationById: new Map(),
};

function cacheEntry(cache, key) {
  if (cache instanceof Map) {
    if (!cache.has(key)) {
      cache.set(key, { value: undefined, expiresAt: 0, refreshPromise: null, generation: 0, listeners: new Set() });
    }
    return cache.get(key);
  }
  return cache;
}

function refreshRentalRead(entry, loader, ttl, options = {}) {
  if (options.onRefresh) entry.listeners.add(options.onRefresh);
  if (entry.refreshPromise && !options.fresh) return entry.refreshPromise;

  const generation = ++entry.generation;
  const request = Promise.resolve()
    .then(loader)
    .then((value) => {
      if (generation !== entry.generation) return value;
      entry.value = value;
      entry.expiresAt = Date.now() + ttl;
      if (options.onSuccess) options.onSuccess(value);
      const listeners = [...entry.listeners];
      entry.listeners.clear();
      listeners.forEach((listener) => {
        try { listener(value); } catch { /* UI refresh callbacks are best effort. */ }
      });
      return value;
    })
    .catch((error) => {
      entry.listeners.clear();
      // A background refresh must not turn an already-rendered page into an
      // error/empty state. Explicit fresh reads still surface the error.
      if (!options.fresh && entry.value !== undefined) return entry.value;
      throw error;
    })
    .finally(() => {
      if (entry.refreshPromise === request) entry.refreshPromise = null;
    });

  entry.refreshPromise = request;
  return request;
}

function cachedRentalRead(cache, key, ttl, loader, options = {}) {
  const entry = cacheEntry(cache, key);
  const hasValue = entry.value !== undefined;
  const isValid = hasValue && entry.expiresAt > Date.now();

  if (!options.fresh && isValid) {
    // Return cached data immediately while refreshing once in the background.
    void refreshRentalRead(entry, loader, ttl, options);
    return Promise.resolve(entry.value);
  }

  return refreshRentalRead(entry, loader, ttl, options);
}

function invalidateRentalListingsCache() {
  [rentalReadCache.listings, rentalReadCache.publicListings].forEach((entry) => {
    entry.value = undefined;
    entry.expiresAt = 0;
    entry.generation += 1;
    entry.listeners.clear();
  });
}

function invalidateRentalApplicationCache(recordId, listingId = "") {
  const id = String(recordId || "").trim();
  if (id) rentalReadCache.applicationById.delete(id);

  const appsCache = rentalReadCache.applicationsByListing;
  if (listingId) {
    appsCache.delete(String(listingId).trim());
    return;
  }

  // Status/notes/retention writes only receive a Record ID. Find the exact
  // listing cache containing that record; do not clear unrelated listings.
  for (const [key, entry] of appsCache.entries()) {
    if (Array.isArray(entry.value) && entry.value.some((app) => String(app?.recordId || "").trim() === id)) {
      appsCache.delete(key);
    }
  }
}

async function applicationWriteWithInvalidation(write, recordId, listingId = "") {
  const result = await write();
  invalidateRentalApplicationCache(recordId, listingId);
  return result;
}

// ── localStorage helpers (synchronous, private) ───────────────────────────────

function lsGetAll() {
  try {
    return JSON.parse(localStorage.getItem(LISTINGS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSetAll(listings) {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

function getPublicListingsLastGood() {
  try {
    const cached = JSON.parse(localStorage.getItem(PUBLIC_LISTINGS_LAST_GOOD_KEY) || "null");
    return Array.isArray(cached) ? cached : undefined;
  } catch {
    return undefined;
  }
}

function setPublicListingsLastGood(listings) {
  if (!Array.isArray(listings)) return;
  try {
    localStorage.setItem(PUBLIC_LISTINGS_LAST_GOOD_KEY, JSON.stringify(listings));
  } catch {
    // Public rendering remains network/memory based if browser storage is unavailable.
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getListings(options = {}) {
  // apiGet adds _t=Date.now() and cache:"no-store" to bust GET caching
  if (isApiConnected()) {
    return cachedRentalRead(
      rentalReadCache.listings,
      "",
      RENTAL_READ_TTLS.listings,
      () => apiGet({ action: "getListings", ...getStudioRequestAuth("rental") }),
      options,
    );
  }
  return lsGetAll();
}

// Public variant: no auth sent — backend returns only Published listings visible to everyone.
export async function getPublicListings(options = {}) {
  if (isApiConnected()) {
    const entry = rentalReadCache.publicListings;
    if (entry.value === undefined) {
      const lastGood = getPublicListingsLastGood();
      if (lastGood !== undefined) {
        entry.value = lastGood;
        entry.expiresAt = Date.now() + RENTAL_READ_TTLS.listings;
      }
    }
    return cachedRentalRead(
      rentalReadCache.publicListings,
      "",
      RENTAL_READ_TTLS.listings,
      () => apiPost({ action: "getListings" }),
      { ...options, onSuccess: setPublicListingsLastGood },
    );
  }
  return lsGetAll();
}

// Public variant: no auth sent. Public pages must not be affected by stale
// Admin access is stored only for the current browser session.
export async function getPublicListing(id) {
  if (isApiConnected()) {
    return apiPost({ action: "getListingById", listingId: id });
  }
  const all = await getPublicListings();
  return all.find((l) => l.id === id) || null;
}

export async function getListing(id) {
  if (isApiConnected()) {
    try {
      return await apiGet({ action: "getListingById", listingId: id, ...getStudioRequestAuth("rental") });
    } catch (error) {
      const message = String(error?.message || "");
      if (!message.includes("Unknown GET action: getListingById")) {
        throw error;
      }
      const all = await getListings();
      const match = all.find((l) => l.id === id) || null;
      if (!match) {
        throw new Error(`Listing not found: ${id}`, { cause: error });
      }
      return match;
    }
  }
  const all = await getListings();
  return all.find((l) => l.id === id) || null;
}

export async function saveListing(listing) {
  if (isApiConnected()) {
    const result = await apiPost({ action: "saveListing", data: listing, ...getStudioRequestAuth("rental") });
    invalidateRentalListingsCache();
    return result;
  }
  const all = lsGetAll();
  const idx = all.findIndex((l) => l.id === listing.id);
  if (idx >= 0) all[idx] = listing;
  else all.push(listing);
  lsSetAll(all);
}

// Scan the listing's 04_Video_Output Drive folder, find the landscape MP4,
// set its permission to anyone-with-link, and write the URL to the sheet.
// This is the primary post-generation sync path.
export async function syncVideoUrl(listingId) {
  if (isApiConnected()) {
    const result = await apiPost({ action: "syncVideoUrl", listingId, ...getStudioRequestAuth("rental") });
    invalidateRentalListingsCache();
    return result;
  }
  console.info("[localStorage mode] syncVideoUrl no-op for", listingId);
}

// Targeted write: update only the videoUrl field for one listing.
// More reliable than saveListing for post-generation write-back because it
// also creates the column header if it doesn't yet exist in the sheet.
export async function updateVideoUrl(listingId, videoUrl) {
  if (isApiConnected()) {
    const result = await apiPost({ action: "updateVideoUrl", listingId, videoUrl, ...getStudioRequestAuth("rental") });
    invalidateRentalListingsCache();
    return result;
  }
  // localStorage mode: patch the listing object in place
  const all = lsGetAll();
  const idx = all.findIndex((l) => l.id === listingId);
  if (idx >= 0) { all[idx].videoUrl = videoUrl; lsSetAll(all); }
}

export async function saveContact(data) {
  if (isApiConnected()) {
    return apiPost({ action: "saveContact", data });
  }
  // localStorage mode: contacts are not persisted (no contacts sheet in v0.1).
  console.info("[localStorage mode] Contact submission (not persisted):", data);
  return { success: true, approvalStatus: "Contact Inquiry" };
}

// List JPG/PNG files from a listing's own Drive folder (by folder ID).
export async function getListingFolderFiles(folderId, listingId = "") {
  if (!isApiConnected() || (!folderId && !listingId)) return [];
  return apiGet({ action: "getListingFolder", folderId, listingId, ...getStudioRequestAuth("rental") });
}

// Read only the selected photos needed for a Collage Cover. The backend caps
// this request at five files; normal listing photo reads stay metadata-only.
export async function getCollagePhotoData(listingId, fileIds) {
  if (!isApiConnected()) {
    throw new Error("Collage photo loading requires Google Drive integration.");
  }
  // Collage photo data is the authenticated counterpart to the public
  // metadata/photo-package read. Reuse the canonical page session and fail
  // locally if it is incomplete; never send an empty auth payload.
  const auth = getStudioRequestAuth("rental");
  if (!isStudioRequestAuthReady(auth)) {
    throw new Error("Admin access required.");
  }
  return apiPost({
    action: "getCollagePhotoData",
    listingId,
    fileIds,
    ...auth,
  });
}

export async function getPublicListingFolderFiles(folderId, listingId = "") {
  if (!isApiConnected() || (!folderId && !listingId)) return [];
  return apiPost({ action: "getListingFolder", folderId, listingId });
}

export async function getListingSubfolderFiles(folderId, subfolderName, listingId = "") {
  if (!isApiConnected() || (!folderId && !listingId) || !subfolderName) {
    return { subfolderFolderId: "", subfolderUrl: "", files: [] };
  }
  return apiGet({ action: "getListingSubfolder", folderId, subfolderName, listingId, ...getStudioRequestAuth("rental") });
}

export async function getPublicListingSubfolderFiles(folderId, subfolderName, listingId = "") {
  if (!isApiConnected() || (!folderId && !listingId) || !subfolderName) {
    return { subfolderFolderId: "", subfolderUrl: "", files: [] };
  }
  return apiPost({ action: "getListingSubfolder", folderId, subfolderName, listingId });
}

// Batched cover-photo source data for every published listing in one call —
// replaces what used to be a getListingFolder + getListingSubfolder round
// trip per listing on the /rentals grid (2N Apps Script requests for N
// listings). Returns { [listingId]: { rootFiles, coverFiles } }; callers
// still run resolveRentalListingCover() locally so the picked photo is
// identical to the old per-listing behavior.
export async function getPublicListingCoverBundle() {
  if (!isApiConnected()) return {};
  return apiPost({ action: "getPublicListingCovers" });
}

// Upload a file into a subfolder of the listing's own Drive folder.
// Pass subfolderName="" to upload to the folder root.
export async function uploadToSubfolder(folderId, subfolderName, file, listingId = "") {
  if (!isApiConnected()) {
    throw new Error("Photo upload requires Google Drive integration.");
  }
  const base64 = await fileToBase64(file);
  return apiPost({
    action:        "uploadToSubfolder",
    folderId,
    listingId,
    subfolderName: subfolderName || "",
    fileName:      file.name,
    mimeType:      file.type || "application/octet-stream",
    data:          base64,
    ...getStudioRequestAuth("rental"),
  });
}

// Collage Cover save uses an already-generated base64 payload. The transient
// Apps Script redirect 404 is retried centrally in api.js (uploadToSubfolder is
// on the idempotent allow-list — the backend trashes an existing same-name file
// before recreating it, and fileName is fixed by the caller across retries).
export async function uploadBase64ToSubfolder({ folderId, listingId = "", subfolderName = "", fileName, mimeType, data }) {
  if (!isApiConnected()) {
    throw new Error("Photo upload requires Google Drive integration.");
  }
  return apiPost({
    action: "uploadToSubfolder",
    folderId,
    listingId,
    subfolderName,
    fileName,
    mimeType,
    data,
    ...getStudioRequestAuth("rental"),
  });
}

// Save a generated applicant report (Initial Screening Summary, etc.) as a PDF
// into the listing's Tenant Screening Reports folder. Used by
// src/utils/applicantScreeningReports.js. Additive endpoint - does not affect
// the existing generateFullApplicantAuditReport flow.
export async function saveApplicantReportPdf({ listingId, fileName, html, reportType = "Applicant Report" }) {
  if (!isApiConnected()) {
    throw new Error("Report saving requires Google Drive integration.");
  }
  return apiPost({
    action: "saveApplicantReportPdf",
    listingId,
    fileName,
    reportType,
    html,
    ...getStudioRequestAuth("rental"),
  });
}

export async function emailApplicantReportToOwner({ listingId, fileId }) {
  if (!isApiConnected()) {
    throw new Error("Report email requires Google Apps Script integration.");
  }
  if (!listingId || !fileId) {
    throw new Error("A saved applicant report is required before emailing the owner.");
  }
  return apiPost({
    action: "emailApplicantReportToOwner",
    listingId,
    fileId,
    ...getStudioRequestAuth("rental"),
  });
}

// Upload a File object to Drive. Requires API connection.
export async function uploadListingFile(listingId, file) {
  if (!isApiConnected()) {
    throw new Error(
      "Photo upload requires Google Drive integration. Set VITE_STUDIO_EXEC_URL and redeploy."
    );
  }
  const base64 = await fileToBase64(file);
  return apiPost({
    action:    "uploadFile",
    listingId,
    fileName:  file.name,
    mimeType:  file.type || "application/octet-stream",
    data:      base64,
    ...getStudioRequestAuth("rental"),
  });
}

export async function generateListingId() {
  if (isApiConnected()) {
    const result = await apiPost({ action: "generateListingId", ...getStudioRequestAuth("rental") });
    return result?.listingId || "";
  }
  const all  = await getListings();
  const year = new Date().getFullYear();
  const num  = String(all.length + 1).padStart(3, "0");
  return `LST-${year}-${num}`;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Rental Application Intake ──────────────────────────────────────────────────

export async function saveRentalApplication(data) {
  if (isApiConnected()) {
    const result = await apiPost({ action: "saveRentalApplication", data: { ...data, origin: window.location.origin } });
    invalidateRentalApplicationCache(result?.recordId, data?.listingId);
    return result;
  }
  // localStorage fallback: generate a fake record ID so the UI can show success
  const year = new Date().getFullYear();
  const num  = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  console.info("[localStorage mode] saveRentalApplication (not persisted):", data);
  return { success: true, recordId: `APP-${year}-${num}`, pdfUrl: "", submittedAt: new Date().toISOString() };
}

export async function getRentalApplicationResume(listingId, recordId, token) {
  if (!isApiConnected() || !listingId || !recordId || !token) {
    throw new Error("This application link is invalid or expired.");
  }
  return apiPost({
    action: "getRentalApplicationResume",
    listingId,
    recordId,
    token,
  });
}

export async function updateRentalApplication(listingId, recordId, token, data) {
  if (!isApiConnected() || !listingId || !recordId || !token) {
    throw new Error("This application link is invalid or expired.");
  }
  return applicationWriteWithInvalidation(
    () => apiPost({
      action: "updateRentalApplication",
      listingId,
      recordId,
      token,
      data,
    }),
    recordId,
    listingId,
  );
}

export async function getApplicationsByListing(listingId, options = {}) {
  if (!isApiConnected() || !listingId) return [];
  const key = String(listingId).trim();
  return cachedRentalRead(
    rentalReadCache.applicationsByListing,
    key,
    RENTAL_READ_TTLS.applicationsByListing,
    () => apiPost({ action: "getApplicationsByListing", listingId, ...getStudioRequestAuth("rental") }),
    options,
  );
}

export async function getAllApplications() {
  if (!isApiConnected()) return [];
  return apiPost({ action: "getAllApplications", ...getStudioRequestAuth("rental") });
}

export async function getApplicationById(applicationId, options = {}) {
  if (!isApiConnected() || !applicationId) return null;
  const key = String(applicationId).trim();
  return cachedRentalRead(
    rentalReadCache.applicationById,
    key,
    RENTAL_READ_TTLS.applicationById,
    () => apiGet({ action: "getApplicationById", applicationId, ...getStudioRequestAuth("rental") }),
    options,
  );
}

export async function downloadApplicationPdf(recordId, token) {
  if (!isApiConnected() || !recordId || !token) {
    throw new Error("Submitted PDF download is not available.");
  }
  const result = await apiGet({ action: "getApplicationPdfDownloadData", recordId, token });
  if (!result?.data) throw new Error("Submitted PDF file data is missing.");
  const binary = atob(result.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: result.mimeType || "application/pdf" });
  const url = URL.createObjectURL(blob);
  const safeName = String(result.fileName || `${recordId}-application.pdf`).replace(/[\\/:*?"<>|]/g, "-");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return result;
}

export async function updateApplicationStatus(applicationId, reviewStatus) {
  if (isApiConnected()) {
    return applicationWriteWithInvalidation(
      () => apiPost({ action: "updateApplicationStatus", applicationId, reviewStatus, ...getStudioRequestAuth("rental") }),
      applicationId,
    );
  }
  console.info("[localStorage mode] updateApplicationStatus (not persisted):", applicationId, reviewStatus);
}

export async function updateApplicationNotes(applicationId, notes) {
  if (isApiConnected()) {
    return applicationWriteWithInvalidation(
      () => apiPost({ action: "updateApplicationNotes", applicationId, notes, ...getStudioRequestAuth("rental") }),
      applicationId,
    );
  }
  console.info("[localStorage mode] updateApplicationNotes (not persisted):", applicationId);
}

// Canonical recipient resolver. Always call this immediately before showing
// a send-confirmation dialog so the dialog reflects the backend's fresh,
// verified applicant email for this exact Record ID — never the locally
// cached row/list data, which may be stale.
export async function resolveApplicantEmailByRecordId(recordId) {
  if (!isApiConnected() || !recordId) {
    return { recordId, applicantName: "", email: "", verified: false };
  }
  return apiPost({
    action: "resolveApplicantEmailByRecordId",
    recordId,
    ...getStudioRequestAuth("rental"),
  });
}

export async function requestSupportingDocuments(recordId) {
  if (!isApiConnected()) {
    throw new Error("Supporting document requests require Google Apps Script integration.");
  }
  return applicationWriteWithInvalidation(
    () => apiPost({
      action: "requestSupportingDocuments",
      recordId,
      origin: window.location.origin,
      ...getStudioRequestAuth("rental"),
    }),
    recordId,
  );
}

export async function resendSupportingDocumentsEmail(recordId) {
  if (!isApiConnected()) {
    throw new Error("Supporting document requests require Google Apps Script integration.");
  }
  return applicationWriteWithInvalidation(
    () => apiPost({
      action: "resendSupportingDocumentsEmail",
      recordId,
      ...getStudioRequestAuth("rental"),
    }),
    recordId,
  );
}

export async function generateDraftScreeningReport(recordId) {
  if (!isApiConnected()) {
    throw new Error("Screening report generation requires Google Apps Script integration.");
  }
  return applicationWriteWithInvalidation(
    () => apiPost({
      action: "generateDraftScreeningReport",
      recordId,
      ...getStudioRequestAuth("rental"),
    }),
    recordId,
  );
}

export async function generateFullApplicantAuditReport(recordId, language) {
  if (!isApiConnected()) {
    throw new Error("Full Applicant Audit Report generation requires Google Apps Script integration.");
  }
  return applicationWriteWithInvalidation(
    () => apiPost({
      action: "generateFullApplicantAuditReport",
      recordId,
      language,
      ...getStudioRequestAuth("rental"),
    }),
    recordId,
  );
}

export async function updateApplicationRetentionStatus(recordId, retentionStatus, notes = "") {
  if (!isApiConnected()) {
    throw new Error("Data retention actions require Google Apps Script integration.");
  }
  return applicationWriteWithInvalidation(
    () => apiPost({
      action: "updateApplicationRetentionStatus",
      recordId,
      retentionStatus,
      notes,
      ...getStudioRequestAuth("rental"),
    }),
    recordId,
  );
}

export async function cleanupExpiredApplicationsPreview() {
  if (!isApiConnected()) {
    throw new Error("Data retention preview requires Google Apps Script integration.");
  }
  return apiPost({
    action: "cleanupExpiredApplicationsPreview",
    ...getStudioRequestAuth("rental"),
  });
}

export async function deleteExpiredApplicantSensitiveFiles(recordId) {
  if (!isApiConnected()) {
    throw new Error("Sensitive file cleanup requires Google Apps Script integration.");
  }
  return applicationWriteWithInvalidation(
    () => apiPost({
      action: "deleteExpiredApplicantSensitiveFiles",
      recordId,
      ...getStudioRequestAuth("rental"),
    }),
    recordId,
  );
}

export async function validateUploadToken(listingId, recordId, token) {
  if (!isApiConnected()) {
    throw new Error("This upload link is invalid or expired.");
  }
  return apiGet({ action: "validateUploadToken", listingId, recordId, token });
}

export async function uploadSupportingDocument(listingId, recordId, token, category, file, turnstileToken) {
  if (!isApiConnected()) {
    throw new Error("Supporting document upload requires Google Apps Script integration.");
  }
  const base64 = await fileToBase64(file);
  return publicUpload("uploadSupportingDocument", {
    listingId,
    recordId,
    token,
    category,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size || 0,
    data: base64,
    origin: window.location.origin,
  }, turnstileToken);
}

export async function uploadPublicSupportingDocument({ listingId, applicantName, email, phone, notes, category, file, turnstileToken, recordId }) {
  if (!isApiConnected()) {
    throw new Error("Supporting document upload requires Google Apps Script integration.");
  }
  const base64 = await fileToBase64(file);
  return publicUpload("uploadPublicSupportingDocument", {
    listingId,
    applicantName,
    email,
    phone,
    notes,
    category,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size || 0,
    data: base64,
    origin: window.location.origin,
    recordId: recordId || undefined,
  }, turnstileToken);
}

// Fires exactly one "Supporting Documents Uploaded" admin email for a whole
// upload submission, regardless of how many files were selected together.
// `documents` is the list of {fileId, fileName} for files that individually
// finished uploading — the backend re-verifies each fileId against Drive
// before trusting it, so this is a claim, not an authorization.
export async function notifySupportingDocumentsUploaded(listingId, recordId, token, documents, turnstileToken) {
  if (!isApiConnected()) {
    throw new Error("Supporting document upload requires Google Apps Script integration.");
  }
  return publicUpload("notifySupportingDocumentsUploaded", {
    listingId,
    recordId,
    token,
    documents,
    origin: window.location.origin,
  }, turnstileToken);
}

export async function notifyPublicSupportingDocumentsUploaded({ listingId, applicantName, email, phone, notes, documents, turnstileToken, recordId }) {
  if (!isApiConnected()) {
    throw new Error("Supporting document upload requires Google Apps Script integration.");
  }
  return publicUpload("notifyPublicSupportingDocumentsUploaded", {
    listingId,
    applicantName,
    email,
    phone,
    notes,
    documents,
    origin: window.location.origin,
    recordId: recordId || undefined,
  }, turnstileToken);
}

// v0.3+ swap surface — replace these with API calls without touching components.
export const storageAdapter = {
  getListings,
  getListing,
  saveListing,
  saveContact,
  uploadListingFile,
  generateListingId,
};
