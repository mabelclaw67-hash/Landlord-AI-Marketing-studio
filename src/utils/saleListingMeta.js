/**
 * saleListingMeta.js
 *
 * Bilingual status badge + newest-first ordering for Home Sale Studio listings.
 * This is display-only mapping. Public visibility is decided by the backend
 * (apps-script/HomeSaleStudioRead.gs), mirroring the rental model — the frontend
 * does NOT re-filter what the backend returns.
 *
 * The original Google Sheet "Status" value is never mutated; it is only mapped
 * to a display badge. Sold / Pending / Subject Removed keep showing (like a
 * Rented rental) so completed deals remain a public track record.
 */

// status (lowercased) → { bilingual label, badge colors }
const SALE_STATUS_META = {
  "active":          { en: "For Sale",        zh: "在售",       bg: "#e7f7ed", color: "#20623d", border: "#b8e1c7" },
  "for sale":        { en: "For Sale",        zh: "在售",       bg: "#e7f7ed", color: "#20623d", border: "#b8e1c7" },
  "published":       { en: "For Sale",        zh: "在售",       bg: "#e7f7ed", color: "#20623d", border: "#b8e1c7" },
  "open house":      { en: "Open House",      zh: "开放看房",   bg: "#fff4df", color: "#8a4b16", border: "#efd09b" },
  "subject removed": { en: "Subject Removed", zh: "条件已解除", bg: "#e7f0fb", color: "#2a5599", border: "#bcd4f2" },
  "pending":         { en: "Pending",         zh: "交易中",     bg: "#fef3c7", color: "#8a5b00", border: "#f4d77a" },
  "sold":            { en: "Sold",            zh: "已售出",     bg: "#edf2f7", color: "#455468", border: "#ced6e0" },
};

function normalize(status) {
  return String(status || "").trim().toLowerCase();
}

/**
 * Bilingual badge meta for a sale listing's status.
 * Unknown statuses fall back to the raw text with a neutral badge.
 */
export function getSaleStatusMeta(listing, lang = "en") {
  const raw = String(listing?.status || "").trim();
  const meta = SALE_STATUS_META[normalize(raw)];
  const zh = lang === "zh";
  if (!meta) {
    return {
      label: raw || (zh ? "在售" : "For Sale"),
      background: "#eef2f0",
      color: "#455468",
      border: "#ced6e0",
    };
  }
  return {
    label: zh ? meta.zh : meta.en,
    background: meta.bg,
    color: meta.color,
    border: meta.border,
  };
}

const SALE_DATE_FIELDS = [
  "updatedAt", "lastModified", "modifiedDate", "modified",
  "createdAt", "createdDate", "listingDate", "listedDate",
  "availableDate", "available",
];

function bestTime(listing) {
  for (const field of SALE_DATE_FIELDS) {
    const value = listing?.[field];
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
  }
  return 0;
}

/**
 * Sort public sale listings newest-first. All statuses (Pending, Sold, etc.)
 * are kept — nothing is removed by status, so completed deals stay as history.
 * Does not mutate the input array.
 */
export function sortSaleListingsNewestFirst(listings = []) {
  return [...listings].sort((a, b) => bestTime(b) - bestTime(a));
}
