import { buildRentalListingPublicUrl } from "./publicUrls";

export function getListingSharePayload(listingOrId) {
  const listing = typeof listingOrId === "object" && listingOrId !== null ? listingOrId : { id: listingOrId };
  const listingId = String(listing.id || listing.listingId || "").trim();
  const address = String(listing.address || "").trim();
  const city = String(listing.city || "").trim();
  const title = address || "Rental Listing";
  const location = [address, city ? `${city}, BC` : ""].filter(Boolean).join(", ");
  const text = location
    ? `Check out this rental listing: ${location}`
    : "Check out this rental listing";

  return {
    title,
    text,
    url: buildRentalListingPublicUrl(listingId),
  };
}

export async function shareListing(listingOrId) {
  const payload = getListingSharePayload(listingOrId);
  const fallbackText = [payload.text, payload.url].filter(Boolean).join("\n");

  if (navigator.share) {
    await navigator.share(payload);
    return "shared";
  }

  await navigator.clipboard.writeText(fallbackText || payload.url || payload.text);
  return "copied";
}
