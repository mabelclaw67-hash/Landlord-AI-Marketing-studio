// Focused transport regression. Real API module, synthetic fetch responses.
// No production endpoint or applicant data is contacted.
import assert from "node:assert/strict";
import fs from "node:fs/promises";

let source = await fs.readFile(new URL("../src/utils/api.js", import.meta.url), "utf8");
source = source.replace(/from "\.\/(.+?)"/g, (_, path) => `from "${new URL(`../src/utils/${path}`, import.meta.url).href}"`);
source = source.replace(/^const EXEC_URL = .*;$/m, 'const EXEC_URL = "https://synthetic.invalid/exec";');
const { apiPost } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const originalTimer = globalThis.setTimeout;
const originalFetch = globalThis.fetch;
globalThis.setTimeout = (fn, ms, ...args) => originalTimer(fn, ms === 18000 ? 5 : 0, ...args);
let requests = 0;
let backendWrites = 0;
const attempt = async (action) => {
  try { return { result: await apiPost({ action, data: { applicantName: "TEST ONLY" } }) }; }
  catch (error) { return { error }; }
};

try {
  for (const action of ["saveRentalApplication", "updateRentalApplication"]) {
    requests = backendWrites = 0;
    globalThis.fetch = async (_url, init) => {
      requests++;
      backendWrites++; // Simulates a committed write before response loss.
      await new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    };
    const { error } = await attempt(action);
    assert.equal(requests, 1);
    assert.equal(backendWrites, 1);
    assert.equal(error.resultUnknown, true);
    assert.equal(error.isTimeout, true);
    assert.match(error.message, /may have been received/);
    assert.match(error.message, /Do not submit another application/);
    assert.doesNotMatch(error.message, /Please try again/);
    console.log(`PASS ${action}: committed backend write + timeout → unknown outcome, one request, no retry encouragement`);

    for (const fault of [new TypeError("Failed to fetch"), new SyntaxError("Response lost")]) {
      requests = 0;
      globalThis.fetch = async () => { requests++; throw fault; };
      assert.equal((await attempt(action)).error.resultUnknown, true);
      assert.equal(requests, 1);
    }
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ error: "This application link is invalid or expired." }) });
    const invalid = await attempt(action);
    assert.equal(invalid.error.resultUnknown, undefined);
    assert.equal(invalid.error.message, "This application link is invalid or expired.");
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: { success: true, recordId: "APP-TEST-001" } }) });
    assert.equal((await attempt(action)).result.recordId, "APP-TEST-001");
    console.log(`PASS ${action}: network/JSON loss is uncertain; explicit validation errors and confirmed success remain distinct`);
  }
} finally {
  globalThis.setTimeout = originalTimer;
  globalThis.fetch = originalFetch;
}
