import { bridge, ipDigest, json, parse, preflight, rateLimit, safeError, verifyTurnstile } from "./_tenant-service-shared.js";

export async function handler(event) {
  const early = preflight(event);
  if (early) return early;
  const origin = event.headers.origin || "";
  try {
    const digest = ipDigest(event);
    if (!rateLimit(`verify:${digest}`, 5, 15 * 60 * 1000)) return json(429, { ok: false, error: "Too many attempts. Please try again later." }, origin);
    const input = parse(event, 20_000);
    if (!(await verifyTurnstile(input.turnstileToken, event))) return json(400, { ok: false, error: "Verification failed. Please try again." }, origin);
    const result = await bridge("verifyTenant", { email: input.email, phoneLast4: input.phoneLast4, turnstileVerified: true, ipDigest: digest });
    return json(result.verified ? 200 : 400, result.verified ? result : { ok: false, verified: false, error: "We could not verify your information. Please contact your property manager." }, origin);
  } catch (error) { const [status, message] = safeError(error); return json(status, { ok: false, error: message }, origin); }
}

