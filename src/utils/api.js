// ── Apps Script API client ────────────────────────────────────────────────────
// All network traffic goes through the deployed Apps Script web app.
// When VITE_STUDIO_EXEC_URL is not set the functions throw and the storage
// adapter falls back to localStorage automatically.

const EXEC_URL = import.meta.env.VITE_STUDIO_EXEC_URL || "";

export function isApiConnected() {
  return !!EXEC_URL;
}

// GET ?action=xxx[&key=val ...]
export async function apiGet(params) {
  if (!EXEC_URL) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const url = new URL(EXEC_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { redirect: "follow" });
  if (!res.ok) throw new Error(`API GET error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// POST { action, ...payload }
// Uses text/plain to avoid CORS preflight — Apps Script parses e.postData.contents.
// Apps Script processes doPost on the initial request, then 302-redirects to serve
// the response via script.googleusercontent.com. redirect:"follow" lets the browser
// fetch that response correctly.
export async function apiPost(body) {
  if (!EXEC_URL) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const res = await fetch(EXEC_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// Verify the Apps Script deployment is reachable.
export async function pingApi() {
  return apiGet({ action: "ping" });
}
