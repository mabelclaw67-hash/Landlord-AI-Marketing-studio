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

/**
 * Split a "Key Features" field into a list of bullet items.
 *
 * The field is documented to landlords as a comma-separated tag list
 * ("Mountain views, hardwood floors, updated kitchen"), so commas are still
 * a valid separator — but a comma should never break a plain-English
 * sentence apart at a thousands separator ("2,000 sq ft") or a date
 * ("September 1, 2026"). Newlines and bullet characters (• ·) are always
 * treated as explicit separators.
 */
export function splitFeatureList(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(/\n+|[•·]+|,(?!\d)(?!\s*\d{4}\b)/)
    .map((f) => f.trim())
    .filter(Boolean);
}

// Known section labels inside a listing's ad-copy field. Matched whole-line,
// case-insensitive, trailing colon optional — never inferred from punctuation.
const AD_COPY_SECTION_HEADINGS = [
  "highlights",
  "location",
  "lease details",
  "utilities",
  "application",
  "open house & contact",
  "open house and contact",
];

function isAdCopyHeadingLine(line) {
  const normalized = line.trim().replace(/:$/, "").toLowerCase();
  return AD_COPY_SECTION_HEADINGS.includes(normalized);
}

// A line counts as an explicit bullet only when it starts (after leading
// whitespace) with a real list marker — never inferred from a comma,
// semicolon, period, or mid-sentence dash.
const AD_COPY_BULLET_LINE = /^[ \t]*[•·\-*][ \t]+/;

/**
 * Parse a listing's free-text ad-copy field ("features") into display
 * blocks — paragraphs, section headings, and bullet lists — without ever
 * treating a comma, semicolon, period, or dash as a list separator.
 *
 * A line becomes a bullet-list item only if it already starts with an
 * explicit marker (•, ·, -, *) or a known section heading (Highlights,
 * Location, Lease Details, Utilities, Application, Open House & Contact)
 * precedes it. Everything else stays a plain paragraph line, exactly as
 * typed. Blank lines end a running list/paragraph run but are otherwise
 * dropped. If the field has no recognizable structure at all, the whole
 * thing falls back to a single paragraph — never a guessed split.
 *
 * Returns an array of:
 *   { type: "heading",   text: string }
 *   { type: "paragraph", text: string }
 *   { type: "list",      items: string[] }
 */
export function parseListingAdCopy(raw) {
  const text = String(raw || "").replace(/\r\n?/g, "\n");
  if (!text.trim()) return [];

  const blocks = [];
  let currentList = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      currentList = null;
      continue;
    }

    if (isAdCopyHeadingLine(line)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      currentList = null;
      continue;
    }

    const bulletMatch = rawLine.match(AD_COPY_BULLET_LINE);
    if (bulletMatch) {
      const item = rawLine.slice(bulletMatch[0].length).trim();
      if (!item) continue;
      if (!currentList) {
        currentList = [];
        blocks.push({ type: "list", items: currentList });
      }
      currentList.push(item);
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
    currentList = null;
  }

  return blocks;
}
