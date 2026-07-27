// ── Storage adapter v0.2 ──────────────────────────────────────────────────────
// When VITE_STUDIO_EXEC_URL is set → Google Sheets / Drive via Apps Script.
// When it is absent             → localStorage (prototype mode).
//
// All exports are async Promises so components work identically in both modes.
// In v0.3+, swap the API layer without touching any component.

import { isApiConnected, apiGet, apiPost } from "./api.js";
import { getStudioRequestAuth } from "./trialAccess.js";

const LISTINGS_KEY = "vanisland_listings_v1";

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

// ── Public API ────────────────────────────────────────────────────────────────

export async function getListings() {
  // apiGet adds _t=Date.now() and cache:"no-store" to bust GET caching
  if (isApiConnected()) {
    return apiGet({ action: "getListings", ...getStudioRequestAuth("rental") });
  }
  return lsGetAll();
}

// Public variant: no auth sent — backend returns only Published listings visible to everyone.
export async function getPublicListings() {
  if (isApiConnected()) {
    return apiGet({ action: "getListings" });
  }
  return lsGetAll();
}

// Public variant: no auth sent. Public pages must not be affected by stale
// trial/admin access stored in a visitor's browser.
export async function getPublicListing(id) {
  if (isApiConnected()) {
    return apiGet({ action: "getListingById", listingId: id });
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
    return apiPost({ action: "saveListing", data: listing, ...getStudioRequestAuth("rental") });
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
    return apiPost({ action: "syncVideoUrl", listingId, ...getStudioRequestAuth("rental") });
  }
  console.info("[localStorage mode] syncVideoUrl no-op for", listingId);
}

// Targeted write: update only the videoUrl field for one listing.
// More reliable than saveListing for post-generation write-back because it
// also creates the column header if it doesn't yet exist in the sheet.
export async function updateVideoUrl(listingId, videoUrl) {
  if (isApiConnected()) {
    return apiPost({ action: "updateVideoUrl", listingId, videoUrl, ...getStudioRequestAuth("rental") });
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
  return { success: true, approvalStatus: "Pending" };
}

export async function getContactRequests() {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiGet({ action: "getContactRequests", ...getStudioRequestAuth("rental") });
}

export async function approveContactRequest(rowNumber, approvedModule, adminNotes = "", approvalStatus = "Approved", accessType = "Trial", durationDays = 10, paymentStatus = "Unpaid") {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiPost({
    action: "approveContactRequest",
    rowNumber,
    approvedModule,
    adminNotes,
    approvalStatus,
    accessType,
    durationDays,
    paymentStatus,
    ...getStudioRequestAuth("rental"),
  });
}

export async function updateContactRequestNotes(rowNumber, notes) {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiPost({ action: "updateContactRequestNotes", rowNumber, notes, ...getStudioRequestAuth("rental") });
}

export async function validateAccessCode(email, accessCode) {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiPost({ action: "validateAccessCode", email, accessCode });
}

// List JPG/PNG files from a listing's own Drive folder (by folder ID).
export async function getListingFolderFiles(folderId, listingId = "") {
  if (!isApiConnected() || (!folderId && !listingId)) return [];
  return apiGet({ action: "getListingFolder", folderId, listingId, ...getStudioRequestAuth("rental") });
}

export async function getPublicListingFolderFiles(folderId, listingId = "") {
  if (!isApiConnected() || (!folderId && !listingId)) return [];
  return apiGet({ action: "getListingFolder", folderId, listingId });
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
  return apiGet({ action: "getListingSubfolder", folderId, subfolderName, listingId });
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
    return apiPost({ action: "saveRentalApplication", data: { ...data, origin: window.location.origin } });
  }
  // localStorage fallback: generate a fake record ID so the UI can show success
  const year = new Date().getFullYear();
  const num  = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  console.info("[localStorage mode] saveRentalApplication (not persisted):", data);
  return { success: true, recordId: `APP-${year}-${num}`, pdfUrl: "", submittedAt: new Date().toISOString() };
}

export async function getApplicationsByListing(listingId) {
  if (!isApiConnected() || !listingId) return [];
  return apiPost({ action: "getApplicationsByListing", listingId, ...getStudioRequestAuth("rental") });
}

export async function getAllApplications() {
  if (!isApiConnected()) return [];
  return apiPost({ action: "getAllApplications", ...getStudioRequestAuth("rental") });
}

export async function getApplicationById(applicationId) {
  if (!isApiConnected() || !applicationId) return null;
  return apiGet({ action: "getApplicationById", applicationId, ...getStudioRequestAuth("rental") });
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
    return apiPost({ action: "updateApplicationStatus", applicationId, reviewStatus, ...getStudioRequestAuth("rental") });
  }
  console.info("[localStorage mode] updateApplicationStatus (not persisted):", applicationId, reviewStatus);
}

export async function updateApplicationNotes(applicationId, notes) {
  if (isApiConnected()) {
    return apiPost({ action: "updateApplicationNotes", applicationId, notes, ...getStudioRequestAuth("rental") });
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
  return apiPost({
    action: "requestSupportingDocuments",
    recordId,
    origin: window.location.origin,
    ...getStudioRequestAuth("rental"),
  });
}

export async function resendSupportingDocumentsEmail(recordId) {
  if (!isApiConnected()) {
    throw new Error("Supporting document requests require Google Apps Script integration.");
  }
  return apiPost({
    action: "resendSupportingDocumentsEmail",
    recordId,
    ...getStudioRequestAuth("rental"),
  });
}

export async function generateDraftScreeningReport(recordId) {
  if (!isApiConnected()) {
    throw new Error("Screening report generation requires Google Apps Script integration.");
  }
  return apiPost({
    action: "generateDraftScreeningReport",
    recordId,
    ...getStudioRequestAuth("rental"),
  });
}

export async function generateFullApplicantAuditReport(recordId, language) {
  if (!isApiConnected()) {
    throw new Error("Full Applicant Audit Report generation requires Google Apps Script integration.");
  }
  return apiPost({
    action: "generateFullApplicantAuditReport",
    recordId,
    language,
    ...getStudioRequestAuth("rental"),
  });
}

export async function updateApplicationRetentionStatus(recordId, retentionStatus, notes = "") {
  if (!isApiConnected()) {
    throw new Error("Data retention actions require Google Apps Script integration.");
  }
  return apiPost({
    action: "updateApplicationRetentionStatus",
    recordId,
    retentionStatus,
    notes,
    ...getStudioRequestAuth("rental"),
  });
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
  return apiPost({
    action: "deleteExpiredApplicantSensitiveFiles",
    recordId,
    ...getStudioRequestAuth("rental"),
  });
}

export async function validateUploadToken(listingId, recordId, token) {
  if (!isApiConnected()) {
    throw new Error("This upload link is invalid or expired.");
  }
  return apiGet({ action: "validateUploadToken", listingId, recordId, token });
}

export async function uploadSupportingDocument(listingId, recordId, token, category, file) {
  if (!isApiConnected()) {
    throw new Error("Supporting document upload requires Google Apps Script integration.");
  }
  const base64 = await fileToBase64(file);
  return apiPost({
    action: "uploadSupportingDocument",
    listingId,
    recordId,
    token,
    category,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    data: base64,
    origin: window.location.origin,
  });
}

export async function uploadPublicSupportingDocument({ listingId, applicantName, email, phone, notes, category, file }) {
  if (!isApiConnected()) {
    throw new Error("Supporting document upload requires Google Apps Script integration.");
  }
  const base64 = await fileToBase64(file);
  return apiPost({
    action: "uploadPublicSupportingDocument",
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
  });
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
