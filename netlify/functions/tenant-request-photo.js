import { bridge, json, parse, preflight, rateLimit, safeError } from "./_tenant-service-shared.js";

export async function handler(event) {
  const early = preflight(event);
  if (early) return early;
  const origin = event.headers.origin || "";
  try {
    const input = parse(event, 2_200_000);
    if (!input.sessionToken || !/^TSR-\d{8}-\d{4}$/.test(String(input.requestId || "")) || !rateLimit(`photo:${input.requestId}`, 10, 60 * 60 * 1000)) return json(400, { ok: false, error: "Upload authorization failed." }, origin);
    const result = await bridge("uploadTenantRequestPhoto", input);
    return json(result.ok ? 200 : 400, result, origin);
  } catch (error) { const [status, message] = safeError(error); return json(status, { ok: false, error: message }, origin); }
}

