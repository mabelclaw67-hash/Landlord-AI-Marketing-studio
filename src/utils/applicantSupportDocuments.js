function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactMatch(value) {
  return normalizeForMatch(value).replace(/\s+/g, "");
}

function applicantNameTokens(app) {
  const name = normalizeForMatch(app?.applicantName);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { first: parts[0], last: parts[parts.length - 1], full: compactMatch(name) };
  return { first: parts[0] || "", last: "", full: compactMatch(name) };
}

export function classifySupportDocument(fileName = "") {
  const text = normalizeForMatch(fileName);
  if (/\b(photo id|drivers license|driver license|passport|identification|government id|id)\b/.test(text)) {
    return "Photo ID";
  }
  if (/\b(proof of income|income|employment|employer|pay stub|paystub|pay stubs|paystubs|t4|notice of assessment|noa|job letter|work letter)\b/.test(text)) {
    return "Proof of income / employment";
  }
  if (/\b(bank statement|bank|statement)\b/.test(text)) {
    return "Bank statement";
  }
  if (/\b(credit|background|equifax|transunion)\b/.test(text)) {
    return "Credit / background";
  }
  if (/\b(reference|landlord|tenancy)\b/.test(text)) {
    return "Landlord / reference";
  }
  return "Other";
}

// normalizeForMatch keeps ASCII letters/digits only, so a CJK-only name (e.g.
// "申请人 A") collapses to whatever stray Latin fragment it happened to
// contain — here a single "a" — instead of disappearing to "". A 1-2
// character token then substring-matches almost any English file name,
// producing false-positive document matches. Real first/last name tokens
// and full-name strings are essentially never this short, so tokens below
// this length are treated as "no usable name to match on" rather than a
// match key, keeping English and CJK applicant names equally strict.
const MIN_NAME_TOKEN_LENGTH = 3;

export function matchSupportDocumentsForApplicant(app, files = []) {
  const recordId = compactMatch(app?.recordId);
  const { first, last, full } = applicantNameTokens(app);
  const safeFull = full.length >= MIN_NAME_TOKEN_LENGTH ? full : "";
  const safeFirst = first.length >= 2 ? first : "";
  const safeLast = last.length >= 2 ? last : "";
  const matched = (files || []).filter((file) => {
    const fileName = compactMatch(file?.name || file?.fileName);
    const spacedFileName = normalizeForMatch(file?.name || file?.fileName);
    if (!fileName) return false;
    if (recordId && fileName.includes(recordId)) return true;
    if (safeFull && fileName.includes(safeFull)) return true;
    return Boolean(safeFirst && safeLast && spacedFileName.includes(safeFirst) && spacedFileName.includes(safeLast));
  }).map((file) => ({
    name: file.name || file.fileName || "Document",
    type: classifySupportDocument(file.name || file.fileName),
    mimeType: file.mimeType || "",
    modifiedAt: file.modifiedAt || file.lastUpdated || file.uploadedAt || "",
    fileId: file.fileId || "",
    url: file.url || "",
  }));

  const latestModifiedAt = matched
    .map((file) => file.modifiedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || "";
  const types = [...new Set(matched.map((file) => file.type))];

  return {
    available: matched.length > 0,
    count: matched.length,
    files: matched,
    types,
    latestModifiedAt,
  };
}

export function formatSupportDocumentStatus(summary, lang = "en") {
  if (summary?.available) {
    return lang === "zh" ? "支持文件：已提交" : "Supporting Documents: Available";
  }
  return lang === "zh" ? "支持文件：未提交" : "Supporting Documents: Not submitted";
}

export function formatSupportDocumentTypes(summary, lang = "en") {
  const types = summary?.types || [];
  if (!types.length) return lang === "zh" ? "文件类型：-" : "File types: -";
  return `${lang === "zh" ? "文件类型" : "File types"}: ${types.join(", ")}`;
}
