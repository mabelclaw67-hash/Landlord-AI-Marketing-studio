import { bridgePublicUpload, ipDigest, json, parse, preflight, rateLimit, safeError, verifyTurnstile } from "./_tenant-service-shared.js";

const ALLOWED_ACTIONS = new Set([
  "uploadSupportingDocument",
  "notifySupportingDocumentsUploaded",
  "uploadPublicSupportingDocument",
  "notifyPublicSupportingDocumentsUploaded",
  "uploadDisputeFile",
  "uploadPropertyStrategyFile",
]);

export async function handler(event) {
  const early = preflight(event);
  if (early) return early;
  const origin = event.headers.origin || "";
  try {
    const input = parse(event, 21_000_000);
    if (!ALLOWED_ACTIONS.has(input.action)) return json(400, { ok: false, error: "Unsupported upload request." }, origin);
    const digest = ipDigest(event);
    if (!rateLimit(`public-upload:${digest}`, 30, 15 * 60 * 1000)) return json(429, { ok: false, error: "Too many upload attempts. Please try again later." }, origin);
    if (!(await verifyTurnstile(input.turnstileToken, event))) return json(400, { ok: false, error: "Security verification failed. Please complete it again and retry." }, origin);
    delete input.turnstileToken;
    const result = await bridgePublicUpload(input.action, input);
    if (result?.error) return json(400, { ok: false, error: result.error }, origin);
    return json(200, { ok: true, data: result }, origin);
  } catch (error) {
    const [status, message] = safeError(error);
    return json(status, { ok: false, error: message }, origin);
  }
}
