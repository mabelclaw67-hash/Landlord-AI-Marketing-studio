"use strict";

// Regression coverage for bounded, read-only collage photo previews.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
const functionSource = source.match(/^function getCollagePhotoData_\([^\n]*\n[\s\S]*?^\}/m)?.[0];
assert.ok(functionSource, "getCollagePhotoData_ exists in Code.gs");

function iterator(items) {
  let index = 0;
  return { hasNext: () => index < items.length, next: () => items[index++] };
}

function runPhotoRead({ photoSizes, missingThumbnailAt = -1 }) {
  const fileIds = photoSizes.map((_, index) => `photo-${index + 1}`);
  let originalReads = 0;
  const files = fileIds.map((id, index) => ({
    getId: () => id,
    getName: () => `${id}.jpg`,
    getMimeType: () => "image/jpeg",
    getThumbnail: () => index === missingThumbnailAt ? null : ({
      getContentType: () => "image/jpeg",
      getBytes: () => Buffer.alloc(photoSizes[index], 7),
    }),
    getBlob: () => { originalReads++; throw new Error("Original photo read is prohibited in this test."); },
  }));
  const sandbox = {
    DriveApp: { getFolderById: () => ({ getFiles: () => iterator(files) }) },
    Utilities: { base64Encode: (bytes) => Buffer.from(bytes).toString("base64") },
    getListingById_: () => ({ driveFolderLink: "https://drive.google.com/drive/folders/test-folder" }),
    extractDriveFolderId_: () => "test-folder",
  };
  vm.runInNewContext(`${functionSource}\nthis.result = getCollagePhotoData_("LST-TEST", ${JSON.stringify(fileIds)}, {});`, sandbox);
  return { result: sandbox.result, originalReads };
}

const bounded = runPhotoRead({ photoSizes: [32, 48, 64, 80, 96] });
assert.equal(bounded.result.length, 5, "all five selected previews are returned");
assert.ok(bounded.result.every((photo) => photo.dataUrl.startsWith("data:image/jpeg;base64,")), "preview data URLs use their actual image type");
assert.equal(bounded.originalReads, 0, "original photo blobs are never read");

assert.throws(
  () => runPhotoRead({ photoSizes: [800_000, 800_000, 800_000, 800_000, 800_000] }),
  /safe response size/,
  "oversized preview batches fail before returning an unsafe response",
);

const missing = runPhotoRead({ photoSizes: [32, 48], missingThumbnailAt: 1 });
assert.match(missing.result[1].error, /preview is not available/i, "a missing Drive thumbnail returns a clear per-photo error");
assert.equal(missing.originalReads, 0, "missing thumbnails do not fall back to full originals");

console.log("PASS: collage photo reads use bounded Drive previews and never load original blobs");
