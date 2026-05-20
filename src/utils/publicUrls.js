export const PUBLIC_SITE_BASE_URL = "https://vanislandproperty.ca";
export const OLD_PUBLIC_SITE_BASE_URL = "https://landlord-ai-marketing-studio.netlify.app";

const REWRITABLE_HOSTS = new Set([
  "vanislandproperty.ca",
  "www.vanislandproperty.ca",
  "landlord-ai-marketing-studio.netlify.app",
  "localhost",
  "127.0.0.1",
]);

export function buildPublicSiteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_BASE_URL}${normalizedPath}`;
}

export function buildRentalListingPublicUrl(listingId) {
  if (!listingId) return "";
  return buildPublicSiteUrl(`/listings/${listingId}`);
}

export function buildRentalApplyUrl(listingId) {
  if (!listingId) return buildPublicSiteUrl("/examples");
  return buildPublicSiteUrl(`/apply/${listingId}`);
}

export function buildHomeSalePublicUrl(listingId) {
  if (!listingId) return "";
  return buildPublicSiteUrl(`/home-sale-studio/listings/${listingId}`);
}

export function normalizePublicFacingUrl(url, fallbackPath = "") {
  const text = String(url || "").trim();
  if (!text) return fallbackPath ? buildPublicSiteUrl(fallbackPath) : "";
  if (text.startsWith("/")) return buildPublicSiteUrl(text);

  try {
    const parsed = new URL(text);
    if (REWRITABLE_HOSTS.has(parsed.hostname)) {
      return buildPublicSiteUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    }
    return text;
  } catch {
    return text;
  }
}
