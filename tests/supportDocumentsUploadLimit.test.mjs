// Supporting Documents upload size regression. Source inspection + synthetic fetch only;
// no production endpoint, Drive, Sheet or e-mail is contacted.
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (p) => fs.readFile(new URL(`../${p}`, import.meta.url), "utf8");
const page = await read("src/pages/SupportDocuments.jsx");
const gs = await read("apps-script/Code.gs");

const MiB = 1024 * 1024;
const NETLIFY_BUFFERED_LIMIT = 6_000_000; // docs say "6 MB"; assume the smaller decimal reading
const MIN_HEADROOM = 300_000; // JSON fields, Turnstile token, headers

const maxExpr = page.match(/^const MAX_FILE_SIZE = (\d+) \* 1024 \* 1024;$/m);
assert.ok(maxExpr, "MAX_FILE_SIZE is defined as N MiB");
const maxBytes = Number(maxExpr[1]) * MiB;
assert.equal(maxBytes, 4 * MiB, "client limit is 4 MiB");

// Worst-case request body at the limit, with long text fields.
const body = JSON.stringify({
  action: "uploadSupportingDocument", turnstileToken: "t".repeat(2100), listingId: "LST-2026-001",
  recordId: "APP-2026-001", token: "k".repeat(64), category: "Proof of Income",
  fileName: "f".repeat(251) + ".pdf", mimeType: "application/pdf", fileSize: maxBytes,
  data: "A".repeat(Math.ceil(maxBytes / 3) * 4), origin: "https://www.vanislandproperty.ca",
});
assert.ok(NETLIFY_BUFFERED_LIMIT - Buffer.byteLength(body) >= MIN_HEADROOM, `4 MiB request leaves >= ${MIN_HEADROOM} bytes headroom`);
const oldBody = Math.ceil(10 * MiB / 3) * 4;
assert.ok(oldBody > NETLIFY_BUFFERED_LIMIT, "the old 10 MiB limit could not fit the platform limit");

// Client validation boundary (real validateFile source).
const arr = (name) => JSON.parse(page.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`))[1].replace(/,\s*\]/, "]"));
const ALLOWED_EXTENSIONS = arr("ALLOWED_EXTENSIONS");
const ALLOWED_TYPES = arr("ALLOWED_TYPES");
const fnSrc = page.match(/function validateFile\(file\) \{[\s\S]*?\n\}\n/)[0];
const validateFile = new Function("ALLOWED_EXTENSIONS", "ALLOWED_TYPES", "MAX_FILE_SIZE", `${fnSrc}; return validateFile;`)(ALLOWED_EXTENSIONS, ALLOWED_TYPES, maxBytes);
assert.equal(validateFile({ name: "a.pdf", type: "application/pdf", size: maxBytes }), "", "exactly 4 MiB passes");
assert.equal(validateFile({ name: "a.pdf", type: "application/pdf", size: 1024 }), "", "small file passes");
const tooBig = validateFile({ name: "a.pdf", type: "application/pdf", size: maxBytes + 1 });
assert.match(tooBig, /4 MB/, "over 4 MiB rejected with 4 MB message");
assert.match(validateFile({ name: "a.exe", type: "application/pdf", size: 10 }), /PDF, JPG/, "bad extension rejected");

// Messages: nothing in the page still advertises 10 MB; the server's stricter-or-equal bound holds.
assert.ok(!/10 MB/.test(page), "page no longer mentions 10 MB");
const gsMax = gs.match(/var SUPPORTING_DOCUMENT_MAX_BYTES = (\d+) \* 1024 \* 1024;/);
assert.ok(gsMax && Number(gsMax[1]) * MiB >= maxBytes, "server accepts everything the client allows");

// Transport: a platform 413 (non-JSON body) yields a clear, size-specific message.
const { publicUpload } = await import(new URL("../src/utils/publicUpload.js", import.meta.url));
const realFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => ({ ok: false, status: 413, json: async () => { throw new Error("not json"); } });
  await assert.rejects(publicUpload("uploadSupportingDocument", {}, "tok"), /up to 4 MB each/);
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ ok: false, error: "Security verification failed." }) });
  await assert.rejects(publicUpload("uploadSupportingDocument", {}, "tok"), /Security verification failed/);
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, data: { fileId: "x" } }) });
  assert.deepEqual(await publicUpload("uploadSupportingDocument", {}, "tok"), { fileId: "x" });
  await assert.rejects(publicUpload("uploadSupportingDocument", {}, ""), /security check/);
} finally { globalThis.fetch = realFetch; }

console.log("supportDocumentsUploadLimit: all checks passed");

// Friendly, specific messages (named file, size, reason, what to do).
const big = validateFile({ name: "lease.pdf", type: "application/pdf", size: 6 * MiB });
assert.match(big, /"lease\.pdf" is 6\.0 MB/);
assert.match(big, /PDF and Word files cannot be reduced automatically/);
assert.match(big, /support@vanislandproperty\.ca/);
assert.match(validateFile({ name: "id.jpg", type: "image/jpeg", size: 6 * MiB }), /could not reduce this photo/);
assert.match(validateFile({ name: "x.exe", type: "", size: 10 }), /"x\.exe" can't be uploaded/);
try {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(publicUpload("uploadSupportingDocument", {}, "tok"), /check your internet connection/);
} finally { globalThis.fetch = realFetch; }
console.log("friendly messages: passed");
