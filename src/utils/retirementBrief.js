// ── Retirement Living Brief (退休生活房源简报) data client ─────────────────────
// Reads the latest Published row from the Daily Market Brief Google Sheet via
// the same Apps Script API path used by the BC market brief.

import { apiGet, isApiConnected } from "./api";

const PRIVATE_NAME_RE = /\bMabel\b/gi;
const INTERNAL_GOOGLE_URL_RE = /^https:\/\/(?:docs|drive)\.google\.com\//i;
const INTERNAL_LINK_FIELDS = new Set([
  "reportDocUrl",
  "sourceLink",
  "sourceDocLink",
  "reportLink",
  "driveLink",
  "docLink",
  "reportDocLink",
  "sourceDocLink",
]);

function publicText(value) {
  if (typeof value !== "string") return value;
  const text = value.replace(PRIVATE_NAME_RE, "Vanisland AI Studio").trim();
  return INTERNAL_GOOGLE_URL_RE.test(text) ? "" : text;
}

function publicBrief(value) {
  if (Array.isArray(value)) return value.map(publicBrief);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !INTERNAL_LINK_FIELDS.has(key))
        .map(([key, item]) => [key, publicBrief(item)])
    );
  }
  return publicText(value);
}

export async function getRetirementBrief() {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return publicBrief(await apiGet({ action: "getRetirementBrief" }));
}

// ── Safe field access ────────────────────────────────────────────────────────
// Never throw on missing fields; return a caller-supplied fallback instead.
export function field(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str === "" ? fallback : str;
}

// "2房/2卫" from bed/bath. Falls back to 待确认 when neither is present.
export function roomType(listing, fallback) {
  const combined = field(listing?.bedBath, "");
  if (combined) return combined;
  const bed = field(listing?.bed, "");
  const bath = field(listing?.bath, "");
  if (!bed && !bath) return fallback;
  const parts = [];
  if (bed) parts.push(`${bed}房`);
  if (bath) parts.push(`${bath}卫`);
  return parts.join("/");
}

// Retirement strategy score is not always present in the JSON yet.
// Per spec: show 评分待生成 (not an error) when absent.
export function strategyScore(listing, brief) {
  const raw =
    listing?.retirementScore ??
    listing?.strategyScore ??
    listing?.score ??
    brief?.retirementScore ??
    brief?.strategyScore;
  return field(raw, "评分待生成");
}

// Pull the single "best retirement pick" for the homepage card.
// Priority: Best Opportunity → first Strong Match → first New Listing.
export function bestPick(brief) {
  const sections = brief?.sections || {};
  const best = sections["Best Opportunity"];
  if (Array.isArray(best) && best.length) return best[0];
  const all = Object.values(sections).flat().filter(Boolean);
  const strong = all.find(
    (l) => String(l?.aiRating || "").toLowerCase() === "strong match"
  );
  return strong || all[0] || null;
}
