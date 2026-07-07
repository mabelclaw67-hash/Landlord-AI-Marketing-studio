// ── Retirement Living Brief (退休生活房源简报) data client ─────────────────────
// Frontend-only display module. Reads the latest retirement-condo-summary JSON
// produced daily by the Cowork Scheduled Task.
//
// Data source resolution (no Apps Script, no sync code here — display only):
//   1. VITE_RETIREMENT_BRIEF_URL   (optional override, e.g. a published URL)
//   2. /retirement/latest.json     (static file served by the app; default)
//
// The daily task drops the newest summary at public/retirement/latest.json.
// A dated copy (retirement-condo-summary-YYYY-MM-DD.json) is kept alongside it.

const BRIEF_URL =
  import.meta.env.VITE_RETIREMENT_BRIEF_URL || "/retirement/latest.json";

export async function getRetirementBrief() {
  const url = `${BRIEF_URL}${BRIEF_URL.includes("?") ? "&" : "?"}_t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Retirement brief load error: ${res.status}`);
  return res.json();
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
