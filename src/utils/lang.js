const LANG_STORAGE_KEY = "vanisland_lang_v1";

export const VALID_LANGS = ["en", "zh"];

export function normalizeLang(value, fallback = "en") {
  const text = String(value || "").trim().toLowerCase();
  return VALID_LANGS.includes(text) ? text : fallback;
}

function detectBrowserLang() {
  if (typeof navigator === "undefined") return "en";
  const values = [...(navigator.languages || []), navigator.language]
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  return values.some((item) => item.startsWith("zh")) ? "zh" : "en";
}

export function readPreferredLang() {
  const fallback = detectBrowserLang();
  try {
    return normalizeLang(localStorage.getItem(LANG_STORAGE_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function persistLang(value) {
  const normalized = normalizeLang(value, detectBrowserLang());
  try {
    localStorage.setItem(LANG_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage failures and keep the UI usable.
  }
  return normalized;
}

export function applyDocumentLang(value) {
  if (typeof document === "undefined") return;
  const normalized = normalizeLang(value, detectBrowserLang());
  document.documentElement.lang = normalized === "zh" ? "zh-CN" : "en";
}
