// ── Storage adapter v0.2 ──────────────────────────────────────────────────────
// When VITE_STUDIO_EXEC_URL is set → Google Sheets / Drive via Apps Script.
// When it is absent             → localStorage (prototype mode).
//
// All exports are async Promises so components work identically in both modes.
// In v0.3+, swap the API layer without touching any component.

import { isApiConnected, apiGet, apiPost } from "./api.js";

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
  if (isApiConnected()) return apiGet({ action: "getListings" });
  return lsGetAll();
}

export async function getListing(id) {
  const all = await getListings();
  return all.find((l) => l.id === id) || null;
}

export async function saveListing(listing) {
  if (isApiConnected()) {
    await apiPost({ action: "saveListing", data: listing });
    return;
  }
  const all = lsGetAll();
  const idx = all.findIndex((l) => l.id === listing.id);
  if (idx >= 0) all[idx] = listing;
  else all.push(listing);
  lsSetAll(all);
}

export async function saveContact(data) {
  if (isApiConnected()) {
    await apiPost({ action: "saveContact", data });
    return;
  }
  // localStorage mode: contacts are not persisted (no contacts sheet in v0.1).
  console.info("[localStorage mode] Contact submission (not persisted):", data);
}

// List JPG/PNG files from a listing's own Drive folder (by folder ID).
export async function getListingFolderFiles(folderId) {
  if (!isApiConnected() || !folderId) return [];
  return apiGet({ action: "getListingFolder", folderId });
}

// Upload a file into a subfolder of the listing's own Drive folder.
// Pass subfolderName="" to upload to the folder root.
export async function uploadToSubfolder(folderId, subfolderName, file) {
  if (!isApiConnected()) {
    throw new Error("Photo upload requires Google Drive integration.");
  }
  const base64 = await fileToBase64(file);
  return apiPost({
    action:        "uploadToSubfolder",
    folderId,
    subfolderName: subfolderName || "",
    fileName:      file.name,
    mimeType:      file.type || "application/octet-stream",
    data:          base64,
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
  });
}

export async function generateListingId() {
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

// v0.3+ swap surface — replace these with API calls without touching components.
export const storageAdapter = {
  getListings,
  getListing,
  saveListing,
  saveContact,
  uploadListingFile,
  generateListingId,
};
