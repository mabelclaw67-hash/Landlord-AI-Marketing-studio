/**
 * Shared display-formatting helpers for listing dates and rent values.
 * Source data stays untouched — these only affect how values are rendered.
 */

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Format a stored date value (ISO timestamp, YYYY-MM-DD, or other string)
 * for display.
 *   en: "Aug 1, 2026"
 *   zh: "2026年8月1日"
 * Returns "—" for empty values, and the original string if it can't be parsed.
 */
export function formatListingDate(value, lang) {
  if (!value) return "—";
  const s = String(value).trim();
  if (!s) return "—";

  let year, month, day;
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    [, year, month, day] = isoMatch.map(Number);
  } else {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s; // unparseable — show original rather than guess
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  if (lang === "zh") return `${year}年${month}月${day}日`;
  return `${EN_MONTHS[month - 1]} ${day}, ${year}`;
}

/**
 * Format a monthly rent value for display.
 *   en: "$2,800/mo"
 *   zh: "$2,800/月"
 * Returns "—" if rent is empty/zero.
 */
export function formatMonthlyRent(rent, lang) {
  const n = Number(rent);
  if (!rent || isNaN(n)) return "—";
  const suffix = lang === "zh" ? "/月" : "/mo";
  return `$${n.toLocaleString()}${suffix}`;
}
