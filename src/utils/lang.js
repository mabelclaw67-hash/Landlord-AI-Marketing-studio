const LANG_STORAGE_KEY = "vanisland_lang_v1";

export const VALID_LANGS = ["en", "zh"];

export function normalizeLang(value, fallback = "en") {
  const text = String(value || "").trim().toLowerCase();
  return VALID_LANGS.includes(text) ? text : fallback;
}

export function readPreferredLang() {
  try {
    return normalizeLang(localStorage.getItem(LANG_STORAGE_KEY), "en");
  } catch {
    return "en";
  }
}

export function persistLang(value) {
  const normalized = normalizeLang(value, "en");
  try {
    localStorage.setItem(LANG_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage failures and keep the UI usable.
  }
  return normalized;
}

export function applyDocumentLang(value) {
  if (typeof document === "undefined") return;
  const normalized = normalizeLang(value, "en");
  document.documentElement.lang = normalized === "zh" ? "zh-CN" : "en";
}
