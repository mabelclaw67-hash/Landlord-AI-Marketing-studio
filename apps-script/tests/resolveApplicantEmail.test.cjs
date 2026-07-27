// Regression test for the supporting-document recipient privacy fix.
//
// Loads the real apps-script/Code.gs source into a sandboxed VM with mocked
// Google Apps Script globals (an in-memory "spreadsheet"), then exercises
// resolveApplicantEmailByRecordId_ — the canonical resolver used by
// requestSupportingDocuments_ and resendSupportingDocumentsEmail_ — against
// synthetic fixture rows.
//
// This never calls MailApp.sendEmail or any network API: everything runs
// against an in-memory mock sheet, so no email is ever sent by this test.
//
// Run with: node apps-script/tests/resolveApplicantEmail.test.js

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const INTAKE_HEADERS = [
  "Record ID", "Listing ID", "Submitted At",
  "Applicant Name", "Email", "Phone", "Date of Birth", "Current Address", "WeChat",
  "Employment Status", "Employer", "Monthly Income",
  "Landlord Reference", "Credit History",
  "Move-in Date", "Lease Term Requested", "Occupants", "Adults", "Minors", "Occupant Names Ages",
  "Has Joint Applicant", "Joint Name", "Joint Phone", "Joint Email", "Joint DOB", "Joint Address",
  "Joint Employment", "Joint Income", "Joint Employer Contact", "Joint Landlord Reference",
  "Joint Credit Info", "Joint Proof of Income",
  "Deposit Funds Available", "Deposit Agreement",
  "Has Pets", "Pet Deposit Funds", "Pet Details",
  "Eviction History",
  "Smokes Vapes Cannabis", "No Smoking Agreement",
  "Proof of Income",
  "Indicate your and Joint Applicant willingness to provide supporting documents (e.g., proof of income, credit report).",
  "Has Tenant Insurance", "Tenant Insurance Agreement", "Proof Insurance Before Move-in",
  "Reason for Moving", "Parking Request", "Additional Notes",
  "PDF URL", "Application Download Token", "Application Download Expires At",
  "Review Status", "Internal Notes", "Updated At",
  "Shortlist Status", "Document Request Sent", "Document Request Sent At",
  "Upload Token", "Upload Token Expires At", "Upload Link", "Support Document Folder URL",
  "Document Upload Status", "Uploaded File Count", "Last Upload At",
  "Screening Report Status", "Screening Report Generated At", "Screening Report URL", "Screening Report Markdown",
  "Data Retention Status", "Retention Expiry Date", "Retention Action", "Retention Notes",
  "Sensitive Files Deleted At", "Archived Tenant File URL",
];

function rowFrom(fields) {
  return INTAKE_HEADERS.map((h) => (h in fields ? fields[h] : ""));
}

function makeMockSheet(rows) {
  // rows[0] is the header row; subsequent rows are data.
  return {
    getLastRow() { return rows.length; },
    getLastColumn() { return INTAKE_HEADERS.length; },
    getRange(row, col, numRows, numCols) {
      const r = numRows === undefined ? 1 : numRows;
      const c = numCols === undefined ? 1 : numCols;
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < r; i++) {
            const sourceRow = rows[row - 1 + i] || [];
            out.push(sourceRow.slice(col - 1, col - 1 + c));
          }
          return out;
        },
        setValue() { return this; },
        setFontWeight() { return this; },
        setBackground() { return this; },
      };
    },
    appendRow(values) { rows.push(values.slice()); },
  };
}

function loadSandbox(rows) {
  const source = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
  const sheet = makeMockSheet(rows);
  const sentEmails = [];

  const sandbox = {
    console,
    SpreadsheetApp: {
      openById() {
        return { getSheetByName: () => sheet, flush() {} };
      },
      flush() {},
    },
    MailApp: {
      sendEmail(opts) {
        // Recorded only — never an actual send in this Node test environment.
        sentEmails.push(opts);
      },
    },
    DriveApp: {
      getFolderById() {
        throw new Error("DriveApp not mocked for this test (resolver-only coverage).");
      },
    },
    Utilities: {
      base64Decode: () => [],
      formatDate: () => "",
      newBlob: () => ({}),
    },
    Session: { getScriptTimeZone: () => "America/Vancouver" },
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "Code.gs" });
  sandbox.__sentEmails = sentEmails;
  return sandbox;
}

// ── Fixture: LST-2026-010-style listing with several applicants ────────────
// Synthetic data only — no real applicant information.
const rows = [
  rowFrom(Object.fromEntries(INTAKE_HEADERS.map((h) => [h, h]))), // header row (values ignored, only used for length)
];
rows[0] = INTAKE_HEADERS.slice(); // real header row

rows.push(rowFrom({
  "Record ID": "APP-TEST-001",
  "Listing ID": "LST-TEST-010",
  "Applicant Name": "Jordan Lee",
  "Email": "jordan.lee.001@example.com",
  "Employer": "Acme Co",
  "Landlord Reference": "Current landlord: Pat Smith | Contact: pat.smith@example.com",
  "Joint Email": "",
}));

rows.push(rowFrom({
  "Record ID": "APP-TEST-002",
  "Listing ID": "LST-TEST-010",
  "Applicant Name": "Jordan Lee", // duplicate display name, different record
  "Email": "jordan.lee.002@example.com",
  "Employer": "Beta Inc",
  "Landlord Reference": "",
  "Joint Email": "joint.002@example.com",
}));

rows.push(rowFrom({
  "Record ID": "APP-TEST-003",
  "Listing ID": "LST-TEST-010",
  "Applicant Name": "Casey Nguyen",
  "Email": "", // missing applicant email
  "Employer": "Gamma LLC",
  "Landlord Reference": "Ref: someone@example.com",
}));

rows.push(rowFrom({
  "Record ID": "APP-TEST-004",
  "Listing ID": "LST-TEST-010",
  "Applicant Name": "Riley Chen",
  // Simulates the reported production defect: the Email cell itself was
  // populated with the exact same string as a non-applicant contact field
  // on the same row (e.g. an employer contact address), rather than the
  // applicant's own address.
  "Email": "info@example-employer.ca",
  "Employer": "info@example-employer.ca",
  "Landlord Reference": "",
}));

// ── Test runner ──────────────────────────────────────────────────────────
let failures = 0;
function assertEqual(actual, expected, label) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  if (!ok) failures++;
}
function assertTrue(cond, label) {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}`);
  if (!cond) failures++;
}

const sandbox = loadSandbox(rows);

// 1. Correct applicant, resolved by immutable Record ID.
const r1 = sandbox.resolveApplicantEmailByRecordId_("APP-TEST-001");
assertTrue(r1.verified, "APP-TEST-001 resolves as verified");
assertEqual(r1.email, "jordan.lee.001@example.com", "APP-TEST-001 email matches its own row");
assertEqual(r1.applicantName, "Jordan Lee", "APP-TEST-001 applicant name matches");

// 2. Duplicate applicant name across two different records must not cross-contaminate.
const r2 = sandbox.resolveApplicantEmailByRecordId_("APP-TEST-002");
assertTrue(r2.verified, "APP-TEST-002 (duplicate name) resolves as verified");
assertEqual(r2.email, "jordan.lee.002@example.com", "APP-TEST-002 gets its own email, not APP-TEST-001's");
assertTrue(r2.email !== r1.email, "APP-TEST-001 and APP-TEST-002 emails are distinct despite same applicant name");

// 3. Joint applicant email present — must never be returned as the recipient.
assertTrue(r2.email !== "joint.002@example.com", "APP-TEST-002 never resolves to the joint applicant's email");

// 4. Missing applicant email — must block, never fall back.
const r3 = sandbox.resolveApplicantEmailByRecordId_("APP-TEST-003");
assertTrue(!r3.verified, "APP-TEST-003 (missing email) is not verified");
assertEqual(r3.email, "", "APP-TEST-003 never falls back to landlord reference or any other field");

// 5. Email cell contaminated with an employer contact string — must block.
const r4 = sandbox.resolveApplicantEmailByRecordId_("APP-TEST-004");
assertTrue(!r4.verified, "APP-TEST-004 (email collides with employer field) is blocked, not sent");

// 6. Rapid/out-of-order lookups (simulates rapid clicking between rows and a
//    reordered/filtered/sorted table) — resolution must depend only on
//    Record ID, never on call order or table position.
const shuffledOrder = ["APP-TEST-002", "APP-TEST-001", "APP-TEST-003", "APP-TEST-001", "APP-TEST-002"];
const shuffledResults = shuffledOrder.map((id) => sandbox.resolveApplicantEmailByRecordId_(id));
assertEqual(shuffledResults[1].email, "jordan.lee.001@example.com", "Out-of-order resolve of APP-TEST-001 is still correct");
assertEqual(shuffledResults[0].email, "jordan.lee.002@example.com", "Out-of-order resolve of APP-TEST-002 is still correct");
assertTrue(!shuffledResults[2].verified, "Out-of-order resolve of APP-TEST-003 is still correctly blocked");

// 7. Unknown Record ID must throw, never silently resolve to another row.
let threw = false;
try {
  sandbox.resolveApplicantEmailByRecordId_("APP-DOES-NOT-EXIST");
} catch (e) {
  threw = true;
}
assertTrue(threw, "Unknown Record ID throws instead of resolving to a fallback row");

// 8. No email was ever actually sent by this regression test.
assertEqual(sandbox.__sentEmails.length, 0, "No MailApp.sendEmail call occurred during this test run");

console.log("");
if (failures) {
  console.log(`${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log("All checks passed.");
}
