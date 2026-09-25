// Admin gateway (Netlify functions admin-auth / admin-api) with a mocked
// Apps Script upstream. Run: node tests/adminGateway.test.mjs
import process from "node:process";

process.env.ADMIN_APPS_SCRIPT_URL = "https://script.example.test/exec";
process.env.ADMIN_BRIDGE_TOKEN = "bridge-secret-for-tests-0123456789";
delete process.env.NETLIFY_DEV;

const { handler: auth } = await import("../netlify/functions/admin-auth.js");
const { handler: api } = await import("../netlify/functions/admin-api.js");

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
};

// Mock of Apps Script's real delivery: the POST runs the script and answers
// 302 → script.googleusercontent.com/macros/echo?…; GETting that URL returns
// the stored output. `upstream(body)` may return:
//   { data } / { error }          normal outcome
//   { echo404: n }                the first n echo GETs return 404
//   { echoLost: true }            echo GET redirects back to /exec (output gone)
//   { frontDoor: true }           302 to script.google.com BEFORE executing
//   { oddRedirectAfterRun: true } script RUNS, then 302 somewhere other than echo
//   { httpStatus }                first hop fails with that status
const upstreamCalls = [];   // one entry per script execution (POST that ran)
const echoGets = [];
const stored = new Map();
let upstream = () => ({ data: {} });
let echoSeq = 0;
globalThis.fetch = async (url, init = {}) => {
  if ((init.method || "GET") === "POST") {
    const body = JSON.parse(init.body);
    const result = upstream(body, url);
    if (result.frontDoor && !String(url).includes("/front-door-hop")) {
      return { status: 302, ok: false, headers: { get: () => "https://script.google.com/macros/s/x/exec/front-door-hop" } };
    }
    if (result.httpStatus) return { status: result.httpStatus, ok: false, headers: { get: () => null }, json: async () => ({}) };
    upstreamCalls.push({ url, body });
    if (result.oddRedirectAfterRun) return { status: 302, ok: false, headers: { get: () => "https://script.google.com/macros/s/x/exec/somewhere" } };
    const key = `k${++echoSeq}`;
    stored.set(key, { result, remaining404: result.echo404 || 0 });
    return { status: 302, ok: false, headers: { get: () => `https://script.googleusercontent.com/macros/echo?user_content_key=${key}` } };
  }
  const key = new URL(url).searchParams.get("user_content_key");
  echoGets.push(key);
  const entry = stored.get(key);
  if (entry && entry.result.echoLost) return { status: 302, ok: false, headers: { get: () => "https://script.google.com/macros/s/x/exec" } };
  if (!entry || entry.remaining404-- > 0) return { status: 404, ok: false, json: async () => ({}) };
  const { echo404: _e, frontDoor: _f, echoLost: _l, oddRedirectAfterRun: _o, ...out } = entry.result;
  return { status: 200, ok: true, json: async () => out };
};

let ipCounter = 0;
function event(body, { cookie = "", origin = "https://www.vanislandproperty.ca", site = "same-origin", marker = "1", method = "POST", ip } = {}) {
  return {
    httpMethod: method,
    headers: {
      origin,
      "sec-fetch-site": site,
      "x-vip-admin": marker,
      cookie,
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)",
      "x-nf-client-connection-ip": ip || `203.0.113.${++ipCounter}`,
    },
    body: JSON.stringify(body),
  };
}
const parse = (res) => JSON.parse(res.body);
const cookies = (res) => (res.multiValueHeaders && res.multiValueHeaders["set-cookie"]) || [];

// ── Request guard (CSRF / cross-origin) ──
check((await auth(event({ op: "login" }, { origin: "https://evil.example" }))).statusCode === 403, "Foreign Origin is rejected");
check((await auth(event({ op: "login" }, { site: "cross-site" }))).statusCode === 403, "Cross-site fetch metadata is rejected");
check((await auth(event({ op: "login" }, { marker: "" }))).statusCode === 403, "Missing X-VIP-Admin header is rejected");
check((await auth(event({ op: "login" }, { method: "GET" }))).statusCode === 405, "Only POST is accepted");
check((await auth(event({ op: "login" }, { origin: "http://localhost:5183" }))).statusCode === 403, "localhost origin is rejected outside netlify dev");
check(!("access-control-allow-origin" in (await auth(event({ op: "nope" }))).headers), "No CORS headers are ever emitted");

// ── Login sets HttpOnly cookie, never returns token ──
upstream = (body) => (body.action === "adminAuthLogin"
  ? { data: { sessionToken: "SESSION-TOKEN-abcdefghijklmnopqrstuvwxyz0123456789", expiresAt: "x", idleTimeoutSec: 1800, maxAgeSec: 28800 } }
  : { data: {} });
const loginRes = await auth(event({ op: "login", password: "pw", totp: "123456", adminBridgeToken: "attacker", clientKey: "spoof" }));
const setCookies = cookies(loginRes);
const sessionCookie = setCookies.find((c) => c.startsWith("__Host-vip_admin="));
check(loginRes.statusCode === 200, "Valid login returns 200");
check(!loginRes.body.includes("SESSION-TOKEN"), "Session token never appears in the response body");
check(sessionCookie && /HttpOnly/.test(sessionCookie) && /Secure/.test(sessionCookie) && /SameSite=Strict/.test(sessionCookie) && /Path=\//.test(sessionCookie) && /Max-Age=28800/.test(sessionCookie) && !/Domain=/i.test(sessionCookie),
  "Session cookie is __Host-, HttpOnly, Secure, SameSite=Strict, 8 h");
const hint = setCookies.find((c) => c.startsWith("vip_admin_hint="));
check(hint && !/HttpOnly/.test(hint) && hint.startsWith("vip_admin_hint=1;"), "UI hint cookie carries no secret");
const sent = upstreamCalls.at(-1).body;
check(sent.adminBridgeToken === process.env.ADMIN_BRIDGE_TOKEN, "Gateway attaches its own bridge secret (browser value ignored)");
check(sent.clientKey !== "spoof" && /^[0-9a-f]{32}$/.test(sent.clientKey), "Client key is derived server-side from the connection IP");
check(sent.password === "pw" && sent.totp === "123456" && !("op" in sent), "Only allow-listed login fields are forwarded");

// ── Error mapping ──
upstream = () => ({ error: "ADMIN_AUTH_INVALID_CREDENTIALS" });
let res = await auth(event({ op: "login", password: "bad", totp: "000000" }));
check(res.statusCode === 401 && parse(res).error === "Incorrect password or verification code." && cookies(res).length === 0, "Bad credentials → generic 401, no cookie");
upstream = () => ({ error: "ADMIN_AUTH_LOCKED" });
res = await auth(event({ op: "login", password: "x", totp: "000000" }));
check(res.statusCode === 429, "Server lockout → 429");

// Gateway-side per-IP limiter (defence in depth; Apps Script is authoritative).
upstream = () => ({ error: "ADMIN_AUTH_INVALID_CREDENTIALS" });
let limited = false;
for (let i = 0; i < 12; i++) {
  const r = await auth(event({ op: "login", password: "x", totp: "000000" }, { ip: "198.51.100.7" }));
  if (r.statusCode === 429) limited = true;
}
check(limited, "Gateway rate-limits repeated attempts from one IP");

// ── Session-bound ops ──
const cookieHeader = "__Host-vip_admin=SESSION-TOKEN-abcdefghijklmnopqrstuvwxyz0123456789; vip_admin_hint=1";
res = await auth(event({ op: "status" }));
check(res.statusCode === 401 && parse(res).code === "SESSION_INVALID", "Session op without cookie → 401");
upstream = () => ({ error: "ADMIN_AUTH_SESSION_INVALID" });
res = await auth(event({ op: "session" }, { cookie: cookieHeader }));
check(res.statusCode === 401 && cookies(res).some((c) => c.startsWith("__Host-vip_admin=;") && /Max-Age=0/.test(c)), "Expired session → 401 and cookie cleared");
upstream = () => ({ data: { revokedSessions: 2 } });
res = await auth(event({ op: "logoutAll" }, { cookie: cookieHeader }));
check(res.statusCode === 200 && cookies(res).some((c) => /Max-Age=0/.test(c)) && upstreamCalls.at(-1).body.adminSessionToken.startsWith("SESSION-TOKEN"), "Sign out everywhere forwards the session and clears cookies");
upstream = () => ({ error: "anything" });
res = await auth(event({ op: "logout" }, { cookie: cookieHeader }));
check(res.statusCode === 200 && cookies(res).some((c) => /Max-Age=0/.test(c)), "Logout always clears cookies");

// ── admin-api proxy ──
res = await api(event({ method: "POST", payload: { action: "getAllApplications" } }));
check(res.statusCode === 401, "Admin API without session cookie → 401 (no upstream call)");
upstream = (body) => ({ data: { echoed: body.action } });
res = await api(event({ method: "POST", payload: { action: "getAllApplications", adminAccessCode: "old", adminBridgeToken: "evil", adminSessionToken: "evil", adminProxyGet: true } }, { cookie: cookieHeader }));
const proxied = upstreamCalls.at(-1).body;
check(res.statusCode === 200 && parse(res).data.echoed === "getAllApplications", "Admin API proxies with a valid cookie");
check(proxied.adminSessionToken.startsWith("SESSION-TOKEN") && proxied.adminBridgeToken === process.env.ADMIN_BRIDGE_TOKEN && !("adminAccessCode" in proxied) && !("adminProxyGet" in proxied),
  "Browser-supplied credential fields are stripped and replaced server-side");
await api(event({ method: "GET", payload: { action: "getApplicationById", applicationId: "A1" } }, { cookie: cookieHeader }));
check(upstreamCalls.at(-1).body.adminProxyGet === true && !String(upstreamCalls.at(-1).url).includes("SESSION"), "GET reads are relayed as POST (token never in a URL)");
res = await api(event({ method: "POST", payload: { action: "adminAuthLogoutAll" } }, { cookie: cookieHeader }));
check(res.statusCode === 400, "Auth actions cannot be tunnelled through the data proxy");
upstream = () => ({ error: "ADMIN_AUTH_SESSION_INVALID" });
res = await api(event({ method: "POST", payload: { action: "getAllApplications" } }, { cookie: cookieHeader }));
check(res.statusCode === 401 && cookies(res).some((c) => /Max-Age=0/.test(c)), "Server-confirmed session expiry → 401 and cookie cleared");
upstream = () => ({ error: "Admin access required." });
res = await api(event({ method: "POST", payload: { action: "getAllApplications" } }, { cookie: cookieHeader }));
check(res.statusCode === 200 && parse(res).ok === false && cookies(res).length === 0, "A generic 'Admin access required.' does NOT log the user out");
upstream = () => ({ error: "Listing not found." });
res = await api(event({ method: "POST", payload: { action: "getListingById" } }, { cookie: cookieHeader }));
check(res.statusCode === 200 && parse(res).error === "Listing not found.", "Business errors pass through unchanged");
{
  const runs = upstreamCalls.length;
  upstream = () => ({ echo404: 2, data: { saved: true } });
  res = await api(event({ method: "POST", payload: { action: "saveListing" } }, { cookie: cookieHeader }));
  check(res.statusCode === 200 && parse(res).data.saved && upstreamCalls.length === runs + 1, "Echo 404 on a WRITE is recovered by re-reading the echo URL; the script ran exactly once");
}
{
  const runs = upstreamCalls.length;
  upstream = () => ({ echo404: 99, data: {} });
  res = await api(event({ method: "POST", payload: { action: "saveListing" } }, { cookie: cookieHeader }));
  check(res.statusCode === 404 && upstreamCalls.length === runs + 1, "If the echo never recovers, a write is NOT re-sent (no duplicate saves); 404 returned");
}
{
  const runs = upstreamCalls.length;
  upstream = () => ({ frontDoor: true, data: {} });
  res = await api(event({ method: "POST", payload: { action: "saveListing" } }, { cookie: cookieHeader }));
  check(res.statusCode === 404 && upstreamCalls.length === runs, "Non-echo redirect: not followed, write not re-sent → 404 (result unknown)");
}
{
  const runs = upstreamCalls.length;
  upstream = () => ({ oddRedirectAfterRun: true });
  res = await api(event({ method: "POST", payload: { action: "saveListing" } }, { cookie: cookieHeader }));
  check(res.statusCode === 404 && upstreamCalls.length === runs + 1, "A 302 is never taken as 'not executed': write ran once and is NOT re-sent");
  let n = 0;
  upstream = () => (++n < 2 ? { oddRedirectAfterRun: true } : { data: { sessionToken: "SESSION-TOKEN-odd-abcdefghijklmnopqrstuvwxyz", expiresAt: "x" } });
  const before = upstreamCalls.length;
  const r = await auth(event({ op: "login", password: "pw", totp: "123456", requestId: "client-req-odd-000001" }));
  const ids = upstreamCalls.slice(before).map((c) => c.body.requestId);
  check(r.statusCode === 200 && ids.length === 2 && ids.every((id) => id === "client-req-odd-000001"), "Login after an unknown result is re-sent only with the same requestId (server replays)");
}
const big = { method: "POST", payload: { action: "uploadToSubfolder", data: "x".repeat(6_000_000) } };
res = await api(event(big, { cookie: cookieHeader }));
check(res.statusCode === 413, "Over-limit bodies are refused (client uses the ticket path instead)");

// ── Echo that bounces back to /exec (seen live) is never followed ──
{
  const runs = upstreamCalls.length, gets = echoGets.length;
  upstream = () => ({ echoLost: true, data: {} });
  const t = Date.now();
  res = await api(event({ method: "POST", payload: { action: "saveListing" } }, { cookie: cookieHeader }));
  check(res.statusCode === 404 && upstreamCalls.length === runs + 1 && echoGets.length === gets + 1 && Date.now() - t < 2000,
    "Echo redirect back to /exec: not followed, not retried, write not re-sent → 404 at once");
  let n = 0;
  upstream = () => (++n < 2 ? { echoLost: true } : { data: { sessionToken: "SESSION-TOKEN-lost-abcdefghijklmnopqrstuvwxyz", expiresAt: "x" } });
  const r = await auth(event({ op: "login", password: "pw", totp: "123456", requestId: "client-req-lost-00001" }));
  check(r.statusCode === 200 && n === 2, "Login whose echo was lost is re-sent once and succeeds (replayed by requestId)");
}

// ── Sign-in survives lost responses without burning the 6-digit code ──
{
  const runs = upstreamCalls.length;
  upstream = () => ({ echo404: 2, data: { sessionToken: "SESSION-TOKEN-echo-abcdefghijklmnopqrstuvwxyz", expiresAt: "x" } });
  const r = await auth(event({ op: "login", password: "pw", totp: "123456", requestId: "client-req-0123456789" }));
  check(r.statusCode === 200 && upstreamCalls.length === runs + 1, "Echo 404s during login are recovered by re-reading the echo URL; login ran once");
}
{
  const runs = upstreamCalls.length;
  let n = 0;
  upstream = () => (++n < 3 ? { echo404: 99 } : { data: { sessionToken: "SESSION-TOKEN-resend-abcdefghijklmnopqrstuvwxyz", expiresAt: "x" } });
  const r = await auth(event({ op: "login", password: "pw", totp: "123456", requestId: "client-req-9876543210" }));
  const ids = upstreamCalls.slice(runs).map((c) => c.body.requestId);
  check(r.statusCode === 200 && ids.length === 3, "If the echo never recovers, login is re-sent (Apps Script replays it by requestId)");
  check(ids.every((id) => id === "client-req-9876543210"), "Every re-send carries the browser's requestId");
}

// ── Not configured ──
delete process.env.ADMIN_BRIDGE_TOKEN;
res = await auth(event({ op: "login", password: "x", totp: "1" }));
check(res.statusCode === 503, "Missing server config fails closed (503)");

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll admin gateway checks passed.");
