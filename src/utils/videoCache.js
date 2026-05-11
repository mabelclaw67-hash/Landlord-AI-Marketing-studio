// IndexedDB cache for generated video blobs.
// Keyed by "${listingId}_${format}" (e.g. "LST-2026-001_landscape").
// Survives page refresh. Each listing stores at most one video per format.

const DB_NAME = "vanisland_video_cache";
const STORE   = "videos";
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function saveVideoBlob(listingId, format, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ blob, ts: Date.now() }, `${listingId}_${format}`);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

export async function loadVideoBlob(listingId, format) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly")
      .objectStore(STORE)
      .get(`${listingId}_${format}`);
    req.onsuccess = (e) => resolve(e.target.result?.blob || null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function deleteVideoBlob(listingId, format) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(`${listingId}_${format}`);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}
