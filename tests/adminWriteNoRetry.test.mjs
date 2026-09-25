// Browser client: a lost response (404) on a write must never trigger a
// second write; reads keep their retry; MFA sign-in keeps its same-requestId
// retry. Loads the real src/utils/api.js + adminSession.js with a mocked
// gateway. Run: node tests/adminWriteNoRetry.test.mjs
const { apiPost, WRITE_RESULT_UNKNOWN } = await import("../src/utils/api.js");
const { loginAdmin } = await import("../src/utils/adminSession.js");

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const calls = [];
let respond = () => ({ status: 404, body: { ok: false, error: "The server could not be reached. Please try again." } });
globalThis.fetch = async (url, init = {}) => {
  const body = init.body ? JSON.parse(init.body) : {};
  calls.push({ url: String(url), body });
  const { status, body: out } = respond(body, calls.length);
  return { ok: status >= 200 && status < 300, status, json: async () => out };
};

async function attempt(payload) {
  try {
    return { data: await apiPost({ __adminSession: true, ...payload }) };
  } catch (error) {
    return { error };
  }
}
const adminApiCalls = () => calls.filter((c) => c.url.endsWith("/.netlify/functions/admin-api"));

// ── The four former auto-retried writes: exactly one request on 404 ──
for (const action of ["saveListing", "uploadToSubfolder", "updateVideoUrl", "syncVideoUrl"]) {
  calls.length = 0;
  respond = () => ({ status: 404, body: { ok: false, error: "The server could not be reached. Please try again." } });
  const { error } = await attempt({ action, listingId: "LST-TEST", data: {} });
  const sent = adminApiCalls();
  check(sent.length === 1 && sent[0].body.payload.action === action, `${action}: 404 → exactly ONE write request (no automatic second write)`);
  check(error?.resultUnknown === true && error.message === WRITE_RESULT_UNKNOWN, `${action}: user is told the result is unknown and to refresh/check before resubmitting`);
}

// ── Append-style write: also never retried ──
calls.length = 0;
const append = await attempt({ action: "saveContact", data: {} });
check(adminApiCalls().length === 1 && append.error?.resultUnknown === true, "Append write (saveContact): 404 → one request, unknown-result message");

// ── Non-404 errors are unchanged ──
calls.length = 0;
respond = () => ({ status: 200, body: { ok: false, error: "Listing not found." } });
const biz = await attempt({ action: "saveListing", data: {} });
check(biz.error?.message === "Listing not found." && !biz.error?.resultUnknown && adminApiCalls().length === 1, "Business errors keep their original message (no unknown-result wrapping)");

// ── Successful write unchanged ──
calls.length = 0;
respond = () => ({ status: 200, body: { ok: true, data: { saved: true } } });
const good = await attempt({ action: "saveListing", data: {} });
check(good.data?.saved === true && adminApiCalls().length === 1, "Successful write: one request, data returned");

// ── Reads keep their retry ──
calls.length = 0;
respond = (_b, n) => (n === 1 ? { status: 404, body: { ok: false, error: "x" } } : { status: 200, body: { ok: true, data: [1, 2, 3] } });
const read = await attempt({ action: "getListings" });
check(read.data?.length === 3 && adminApiCalls().length === 2, "Read (getListings): 404 → retried → succeeds");

// ── MFA sign-in retry still reuses the same requestId ──
calls.length = 0;
respond = (_b, n) => (n === 1
  ? { status: 504, body: { ok: false, error: "Request timed out. Please try again." } }
  : { status: 200, body: { ok: true, data: { expiresAt: "x" } } });
let firstFailed = false;
try { await loginAdmin({ password: "pw", totp: "123456" }); } catch { firstFailed = true; }
await loginAdmin({ password: "pw", totp: "123456" });
const ids = calls.filter((c) => c.url.endsWith("/.netlify/functions/admin-auth")).map((c) => c.body.requestId);
check(firstFailed && ids.length === 2 && ids[0] && ids[0] === ids[1], "MFA login re-submit after a timeout reuses the same requestId");
calls.length = 0;
respond = () => ({ status: 200, body: { ok: true, data: { expiresAt: "x" } } });
await loginAdmin({ password: "pw", totp: "654321" });
const fresh = calls.map((c) => c.body.requestId)[0];
check(fresh && fresh !== ids[0], "A different sign-in attempt gets a new requestId");

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll write-no-retry checks passed.");
