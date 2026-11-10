"use strict";

// Public (not signed in) listing reads must never carry owner identity or
// internal links, and the brief sync (a sheet write) must be admin-only.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const code = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
const homeSale = fs.readFileSync(path.join(__dirname, "..", "HomeSaleStudioRead.gs"), "utf8");

const sandbox = { console, Logger: { log() {} } };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "Code.gs" });
vm.runInContext(homeSale, sandbox, { filename: "HomeSaleStudioRead.gs" });

const listing = {
  id: "LST-TEST-001", status: "Published", address: "1 Test St",
  ownerName: "Test Owner", ownerEmail: "owner@example.com",
  driveFolderLink: "https://drive.google.com/drive/folders/x", outputs: { a: 1 },
  createdByEmail: "x@example.com", createdByAccessCode: "c", createdByRole: "r",
};

const pub = sandbox.sanitizeListingForAccess_(listing, { mode: "public" });
for (const key of ["ownerName", "ownerEmail", "driveFolderLink", "outputs", "createdByEmail", "createdByAccessCode", "createdByRole"]) {
  assert.equal(key in pub, false, `public listing must not include ${key}`);
}
assert.equal(pub.address, "1 Test St");
assert.equal(listing.ownerName, "Test Owner", "source record is not mutated");

const admin = sandbox.sanitizeListingForAccess_(listing, { mode: "admin" });
assert.equal(admin.ownerName, "Test Owner");
assert.equal(admin.ownerEmail, "owner@example.com");

const sale = { listingId: "SALE-TEST-001", ownerName: "Test Seller", contactEmail: "c@example.com", notes: "n", googleDriveFolderUrl: "u" };
const salePub = sandbox.homeSaleSanitizeListingForAccess_(sale, { mode: "public" });
for (const key of ["ownerName", "notes", "googleDriveFolderUrl"]) {
  assert.equal(key in salePub, false, `public sale listing must not include ${key}`);
}
assert.equal(salePub.contactEmail, "c@example.com", "published sale contact stays public");
assert.equal(sandbox.homeSaleSanitizeListingForAccess_(sale, { mode: "admin" }).ownerName, "Test Seller");

assert.equal(/publicGetActions = \[[^\]]*syncDailyMarketBrief/.test(code), false, "syncDailyMarketBrief must not be a public GET action");
assert.match(code, /action === "syncDailyMarketBrief"\) \{ assertAdmin_\(auth\);/);

console.log("publicListingPrivacy: all checks passed");
