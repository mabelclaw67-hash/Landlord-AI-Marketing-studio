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
  const listingId = typeof input === "object" ? input?.listingId : "";
  const staticUrl = resolveStaticVideoUrl(listingId);
  if (staticUrl) return staticUrl;

  const publicVideoUrl = typeof input === "object"
    ? String(input?.publicVideoUrl || "").trim()
    : "";
  if (publicVideoUrl) return publicVideoUrl;

  const sourceUrl = typeof input === "object" ? input?.sourceUrl : input;
  const cleanUrl = String(sourceUrl || "").trim();
  if (!cleanUrl) return "";

  const fileId = extractDriveVideoFileId(cleanUrl);
  if (fileId) return "";

  return cleanUrl;
}

export function resolveDownloadVideoUrl(originalUrl) {
  const cleanUrl = String(originalUrl || "").trim();
  if (!cleanUrl) return "";

  const fileId = extractDriveVideoFileId(cleanUrl);
  if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;

  return cleanUrl;
}
