/**
 * listingSort.js
 * Shared sort utility for public rental and sale listing pages.
 *
 * Rules:
 *  1. Active / for-sale listings first.
 *  2. Sold / closed / unavailable listings last.
 *  3. Within each group, newest date descending.
 *
 * Each caller passes its own keyword sets so rental and sale logic
 * stay independent without duplicating the sort pattern.
 */

/**
 * Returns true if any value in statusFields (checked in order) contains
 * one of the closedKeywords.
 */
function isClosedListing(listing, statusFields, closedKeywords) {
  for (const field of statusFields) {
    const val = String(listing[field] || "").toLowerCase().trim();
    if (val && closedKeywords.some((kw) => val.includes(kw))) return true;
  }
  return false;
}

/**
 * Returns a Date from the first truthy field in dateFields.
 * Falls back to epoch (0) so closed listings without dates still sort consistently.
 */
function bestDate(listing, dateFields) {
  for (const field of dateFields) {
    const val = listing[field];
    if (val) {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date(0);
}

/**
 * Sort listings: active first, closed last; newest first within each group.
 *
 * @param {object[]} listings     Array of listing objects.
 * @param {string[]} statusFields Fields to inspect for status value, in priority order.
 * @param {string[]} closedWords  Keywords that identify a closed/sold/inactive listing.
 * @param {string[]} dateFields   Date fields to try, in priority order.
 * @returns {object[]} New sorted array (original is not mutated).
 */
export function sortListingsByStatusAndDate(listings, statusFields, closedWords, dateFields) {
  return [...listings].sort((a, b) => {
    const aClosed = isClosedListing(a, statusFields, closedWords);
    const bClosed = isClosedListing(b, statusFields, closedWords);
    if (aClosed !== bClosed) return aClosed ? 1 : -1;
    return bestDate(b, dateFields) - bestDate(a, dateFields);
  });
}

// ── Pre-configured callers ───────────────────────────────────────────────────

const RENTAL_STATUS_FIELDS = ["status", "listingStatus", "tenantListingStatus", "publicStatus"];
const RENTAL_CLOSED_WORDS   = ["rented", "closed", "unavailable", "leased"];
const RENTAL_DATE_FIELDS    = ["createdDate", "createdAt", "listingDate", "available", "availableDate", "updatedAt"];

/**
 * Sort public rental listings.
 * Active (Available / Open House / Pending) first; Rented / Application Closed last.
 */
export function sortRentalListings(listings) {
  return sortListingsByStatusAndDate(
    listings,
    RENTAL_STATUS_FIELDS,
    RENTAL_CLOSED_WORDS,
    RENTAL_DATE_FIELDS,
  );
}

const SALE_STATUS_FIELDS = ["status", "listingStatus", "saleStatus", "propertyStatus", "displayStatus", "internalStatus"];
const SALE_CLOSED_WORDS  = ["sold", "closed", "unavailable", "off-market", "off market", "inactive", "archived"];
const SALE_DATE_FIELDS   = ["createdAt", "listingDate", "listedDate", "availableDate", "updatedAt"];

/**
 * Sort public sale listings.
 * Active (Published / Active / Open House / Pending) first; Sold / Archived / Closed last.
 */
export function sortSaleListings(listings) {
  return sortListingsByStatusAndDate(
    listings,
    SALE_STATUS_FIELDS,
    SALE_CLOSED_WORDS,
    SALE_DATE_FIELDS,
  );
}
