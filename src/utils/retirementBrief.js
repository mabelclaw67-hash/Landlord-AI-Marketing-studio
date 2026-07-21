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

export async function getRetirementBrief(date) {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  const params = { action: "getRetirementBrief" };
  if (date) params.date = date;
  return publicBrief(await apiGet(params));
}

// ── Classification / scoring (frontend, tolerant) ────────────────────────────
// Canonical report-section detection: case-insensitive keyword match on the
// sheet's "Report Section" (falling back to AI Rating). Returns a display
// block key plus a global rank used for intra-section ordering (spec §7):
// 1 Top Pick · 2 Strong Match · 3 Worth Watching · 4 Conditional Match ·
// 5 New Listing · 6 Price Drop · 7 Backup Only · 8 Skip / Avoid.
export function classifySection(listing) {
  const s = String(listing?.reportSection || listing?.aiRating || "").toLowerCase();
  if (s.includes("top") || s.includes("best")) return { block: "top", rank: 1 };
  if (s.includes("strong")) return { block: "top", rank: 2 };
  if (s.includes("conditional") || s.includes("条件")) return { block: "watch", rank: 4 };
  if (s.includes("watch") || s.includes("关注")) return { block: "watch", rank: 3 };
  if (s.includes("new") || s.includes("新上") || s.includes("新房")) return { block: "new", rank: 5 };
  if (s.includes("drop") || s.includes("降价") || s.includes("reduction")) return { block: "drop", rank: 6 };
  if (s.includes("backup") || s.includes("备选")) return { block: "watch", rank: 7 };
  if (s.includes("skip") || s.includes("avoid") || s.includes("回避") || s.includes("跳过")) return { block: "skip", rank: 8 };
  return { block: "watch", rank: 3 };
}

// Parse the numeric AI score (0–100) from aiScore ("88/100") or the aiRating
// string ("Worth Watching · 88/100 · High-Medium Confidence"). null if absent.
export function parseScore(listing) {
  const src = `${listing?.aiScore || ""} ${listing?.aiRating || ""}`;
  const m = src.match(/(\d{1,3})\s*\/\s*100/);
  return m ? parseInt(m[1], 10) : null;
}

// Pull the "... Confidence" phrase out of the AI Rating string, if present.
export function parseConfidence(listing) {
  const m = String(listing?.aiRating || "").match(/([A-Za-z]+(?:[-\s][A-Za-z]+)*)\s+Confidence/i);
  return m ? m[0].trim() : "";
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
