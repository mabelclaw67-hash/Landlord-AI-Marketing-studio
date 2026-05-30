export function extractDriveVideoFileId(url) {
  const text = String(url || "").trim();
  if (!text) return "";

  const fileMatch = text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  const openMatch = text.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return "";
}

export function resolveStaticVideoUrl(listingId) {
  const cleanId = String(listingId || "").trim();
  if (!cleanId) return "";
  return `/videos/${encodeURIComponent(cleanId)}.mp4`;
}

export function resolvePlayableVideoUrl(input) {
  // 1. Cloudinary CDN — preferred: directly playable, no Drive auth issues
  const publicVideoUrl = typeof input === "object"
    ? String(input?.publicVideoUrl || "").trim()
    : "";
  if (publicVideoUrl) return publicVideoUrl;

  // 2. Local static file bundled with the app
  const listingId = typeof input === "object" ? input?.listingId : "";
  const staticUrl = resolveStaticVideoUrl(listingId);
  if (staticUrl) return staticUrl;

  // 3. Non-Drive direct URL (last resort)
  const sourceUrl = typeof input === "object" ? input?.sourceUrl : input;
  const cleanUrl = String(sourceUrl || "").trim();
  if (!cleanUrl) return "";

  const fileId = extractDriveVideoFileId(cleanUrl);
  if (fileId) return ""; // Drive links can't be embedded; return empty → triggers error state

  return cleanUrl;
}

export function resolveDownloadVideoUrl(originalUrl) {
  const cleanUrl = String(originalUrl || "").trim();
  if (!cleanUrl) return "";

  const fileId = extractDriveVideoFileId(cleanUrl);
  if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;

  return cleanUrl;
}
