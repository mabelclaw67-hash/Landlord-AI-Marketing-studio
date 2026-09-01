"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const code = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
const headers = ["Listing ID", "Property Address"];
const listingRows = [headers, ["LST-TEST-001", "123 Main St"]];

function iterator(items) {
  let index = 0;
  return {
    hasNext() { return index < items.length; },
    next() { return items[index++]; },
  };
}

function makeFolder(id, name) {
  return {
    id,
    name,
    getId() { return this.id; },
    getName() { return this.name; },
    setName(next) { this.name = next; return this; },
    setSharing() { return this; },
  };
}

function makeSheet() {
  return {
    getLastRow() { return listingRows.length; },
    getLastColumn() { return headers.length; },
    getRange(row, col, numRows = 1, numCols = 1) {
      return {
        getValues() {
          return listingRows.slice(row - 1, row - 1 + numRows)
            .map((source) => source.slice(col - 1, col - 1 + numCols));
        },
      };
    },
  };
}

function loadSandbox(options = {}) {
  const canonicalRoot = makeFolder(
    "1rP1Z05zTkOh8Rp9NMdXOrWEh8t7Qi2nA",
    options.rootName || "Applicant Sensitive Data"
  );
  const children = options.children || [];
  let createCount = 0;
  canonicalRoot.getFolders = () => iterator(children);
  canonicalRoot.createFolder = (name) => {
    createCount++;
    const folder = makeFolder(`created-${createCount}`, name);
    children.push(folder);
    return folder;
  };

  const logs = [];
  const requestedFolderIds = [];
  const sandbox = {
    console,
    SpreadsheetApp: {
      openById() { return { getSheetByName: () => makeSheet() }; },
    },
    DriveApp: {
      Access: { PRIVATE: "PRIVATE" },
      Permission: { VIEW: "VIEW" },
      getFolderById(id) {
        requestedFolderIds.push(id);
        if (options.rootUnavailable) throw new Error("No access");
        if (id !== canonicalRoot.getId()) throw new Error(`Unexpected folder ID: ${id}`);
        return canonicalRoot;
      },
    },
    LockService: {
      getScriptLock() {
        return { waitLock() {}, releaseLock() {} };
      },
    },
    Logger: { log(value) { logs.push(String(value)); } },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }),
    },
    Utilities: { formatDate: () => "", base64Decode: () => [], newBlob: () => ({}) },
    Session: { getScriptTimeZone: () => "America/Vancouver" },
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "Code.gs" });
  return { sandbox, canonicalRoot, children, logs, requestedFolderIds, getCreateCount: () => createCount };
}

let failures = 0;
function check(condition, label) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) failures++;
}

// Existing folder is found by Listing ID, reused, and renamed from the exact
// Property Address in the Main Database sheet.
const existing = makeFolder("listing-folder-1", "LST-TEST-001 - Old Address");
const first = loadSandbox({ children: [existing] });
const resolved = first.sandbox.getApplicantSensitiveListingFolder_("LST-TEST-001");
check(resolved.getId() === "listing-folder-1", "reuses the existing Listing ID folder");
check(resolved.getName() === "LST-TEST-001 - 123 Main St", "renames from exact 01 Listings Property Address");
check(first.getCreateCount() === 0, "does not create a second listing folder");
check(first.requestedFolderIds.every((id) => id === "1rP1Z05zTkOh8Rp9NMdXOrWEh8t7Qi2nA"), "uses only the canonical root ID");

// A missing listing folder is created once; the second call reuses it.
const second = loadSandbox();
const created = second.sandbox.getApplicantSensitiveListingFolder_("LST-TEST-001");
const reused = second.sandbox.getApplicantSensitiveListingFolder_("LST-TEST-001");
check(created.getId() === reused.getId(), "repeat lookup is idempotent");
check(second.getCreateCount() === 1, "creates exactly one listing folder");

// Duplicate Listing ID folders fail closed instead of silently choosing one.
const duplicate = loadSandbox({
  children: [
    makeFolder("duplicate-a", "LST-TEST-001 - Address A"),
    makeFolder("duplicate-b", "LST-TEST-001 - Address B"),
  ],
});
let duplicateError = "";
try {
  duplicate.sandbox.getApplicantSensitiveListingFolder_("LST-TEST-001");
} catch (error) {
  duplicateError = error.message;
}
check(duplicateError.includes("Duplicate private listing folders"), "duplicate listing folders fail closed");

// The canonical root is never created by name. Missing access throws and logs
// the fixed root ID before any caller can continue with a write.
const unavailable = loadSandbox({ rootUnavailable: true });
let rootError = "";
try {
  unavailable.sandbox.getApplicantSensitiveRootFolder_();
} catch (error) {
  rootError = error.message;
}
check(rootError.includes("Canonical Applicant Sensitive Data root is unavailable"), "missing canonical root throws a clear error");
check(unavailable.logs.some((line) => line.includes("1rP1Z05zTkOh8Rp9NMdXOrWEh8t7Qi2nA")), "missing canonical root logs its fixed ID");

if (failures) process.exit(1);
console.log("All checks passed.");
