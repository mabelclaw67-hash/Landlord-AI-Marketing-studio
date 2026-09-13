"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const code = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");

function makeSandbox() {
  const rows = [
    ["APP-TEST-001", "LST-TEST-001", "Applicant One"],
    ["APP-TEST-002", "LST-TEST-002", "Applicant Two"],
  ];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => 3,
    getRange: (_row, _column, numRows) => ({
      getValues: () => numRows
        ? rows
        : [["Record ID", "Listing ID", "Applicant Name"]],
    }),
  };
  const output = (value) => ({
    value,
    setMimeType() { return this; },
    getContent() { return this.value; },
  });
  const sandbox = {
    console,
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: output,
    },
    Logger: { log() {} },
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "Code.gs" });

  let enrichmentCalls = 0;
  sandbox.getAdminAccessCode_ = () => "ADMIN-TEST-CODE";
  sandbox.getSheet_ = () => sheet;
  sandbox.addMissingHeaders_ = () => {};
  sandbox.getHeaderMap_ = () => ({ "Record ID": 0, "Listing ID": 1, "Applicant Name": 2 });
  sandbox.colVal_ = (row, map, name) => row[map[name]] || "";
  sandbox.rowToApplication_ = (row) => ({
    recordId: row[0],
    listingId: row[1],
    applicantName: row[2],
  });
  sandbox.enrichApplicationWithFullAudit_ = () => {
    enrichmentCalls += 1;
    throw new Error("Full Audit enrichment must not run for all-applications list");
  };
  sandbox.__rows = rows;
  sandbox.__getEnrichmentCalls = () => enrichmentCalls;
  return sandbox;
}

let failures = 0;
function check(condition, label) {
  try {
    assert.equal(Boolean(condition), true);
    console.log(`PASS ${label}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}: ${error.message}`);
  }
}

const allApplicationsSource = code.slice(
  code.indexOf("function getAllApplications_"),
  code.indexOf("function getApplicationById_")
);
const noAuthMatch = code.match(/var noAuthActions = \[([\s\S]*?)\];/);
const noAuthActions = noAuthMatch ? noAuthMatch[1] : "";

check(!code.includes("allowTrial"), "All-applications path does not restore Trial authorization");
check(!noAuthActions.includes('"getAllApplications"'), "All-applications route remains outside no-auth actions");
check(!allApplicationsSource.includes("enrichApplicationWithFullAudit_"), "All-applications list skips Full Audit enrichment");

const sandbox = makeSandbox();
let denied = null;
try {
  const response = sandbox.rentalDoPost_({
    postData: { contents: JSON.stringify({ action: "getAllApplications" }) },
  });
  denied = JSON.parse(response.getContent());
} catch (error) {
  denied = { error: error.message };
}
check(denied && denied.error === "Admin access required.", "All-applications request without Admin auth is denied");

const allowedResponse = sandbox.rentalDoPost_({
  postData: {
    contents: JSON.stringify({ action: "getAllApplications", adminAccessCode: "ADMIN-TEST-CODE" }),
  },
});
const allowed = JSON.parse(allowedResponse.getContent());
check(Array.isArray(allowed.data), "Admin all-applications request returns normal rows");
check(allowed.data && allowed.data.length === 2, "Admin all-applications row count is preserved");
check(allowed.data && allowed.data[0].recordId === "APP-TEST-001", "Admin all-applications data remains mapped");
check(sandbox.__getEnrichmentCalls() === 0, "Admin all-applications request performs no Full Audit enrichment");

if (failures) process.exit(1);
console.log("All Admin Leads loading checks passed.");
