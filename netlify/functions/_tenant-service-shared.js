import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

const attempts = globalThis.__tsrRateLimits || (globalThis.__tsrRateLimits = new Map());
const allowedOrigins = new Set(["https://www.vanislandproperty.ca", "https://vanislandproperty.ca"]);

export const json = (statusCode, body, origin = "") => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://www.vanislandproperty.ca",
    "vary": "Origin",
  },
  body: JSON.stringify(body),
});

export function preflight(event, method = "POST") {
  const origin = event.headers.origin || "";
  if (event.httpMethod === "OPTIONS") return json(204, {}, origin);
  if (event.httpMethod !== method) return json(405, { ok: false, error: "Method not allowed." }, origin);
  const local = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  if (origin && !allowedOrigins.has(origin) && !local && !origin.endsWith("--landlord-ai-marketing-studio.netlify.app")) {
    return json(403, { ok: false, error: "Request rejected." }, origin);
  }
  return null;
}

export function parse(event, maxBytes = 2_200_000) {
  if (Buffer.byteLength(event.body || "", "utf8") > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(event.body || "{}");
}

export function ipDigest(event) {
  const ip = String(event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  return crypto.createHash("sha256").update(`${process.env.TENANT_SERVICE_IP_SALT || process.env.TENANT_SERVICE_BRIDGE_TOKEN || ""}:${ip}`).digest("hex");
}

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const prior = (attempts.get(key) || []).filter((time) => now - time < windowMs);
  if (prior.length >= limit) return false;
  prior.push(now);
  attempts.set(key, prior);
  return true;
}

export async function verifyTurnstile(token, event) {
  if (!process.env.TURNSTILE_SECRET || !token) return false;
  const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: String(token) });
  const ip = String(event.headers["x-nf-client-connection-ip"] || "");
  if (ip) form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  return response.ok && (await response.json()).success === true;
}

export async function bridge(action, payload) {
  const url = process.env.TENANT_SERVICE_APPS_SCRIPT_URL;
  const bridgeToken = process.env.TENANT_SERVICE_BRIDGE_TOKEN;
  if (!url || !bridgeToken) throw new Error("SERVER_NOT_CONFIGURED");
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, action, bridgeToken }),
    redirect: "follow",
  });
  if (!response.ok) throw new Error("BRIDGE_FAILED");
  return response.json();
}

export function safeError(error) {
  if (error?.message === "PAYLOAD_TOO_LARGE") return [413, "Upload is too large."];
  return [500, "The request could not be completed. Please try again."];
}
