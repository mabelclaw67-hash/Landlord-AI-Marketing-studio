import { bridge, ipDigest, json, parse, preflight, rateLimit, safeError } from "./_tenant-service-shared.js";

export async function handler(event) {
  const early = preflight(event);
  if (early) return early;
  const origin = event.headers.origin || "";
  try {
    const input = parse(event, 50_000);
    if (!input.sessionToken || !rateLimit(`submit:${String(input.sessionToken).slice(0, 32)}`, 3, 60 * 60 * 1000)) return json(429, { ok: false, error: "Submission limit reached. Please try again later." }, origin);
    const result = await bridge("createTenantServiceRequest", { ...input, ipDigest: ipDigest(event) });
    return json(result.ok ? 200 : 400, result, origin);
  } catch (error) { const [status, message] = safeError(error); return json(status, { ok: false, error: message }, origin); }
}

