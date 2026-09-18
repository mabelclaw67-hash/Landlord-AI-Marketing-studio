"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");

const intakeHeaders = [
  "Record ID", "Listing ID", "Submitted At", "Applicant Name", "Email", "Phone", "Date of Birth",
  "Current Address", "WeChat", "Employment Status", "Employer", "Monthly Income", "Landlord Reference",
  "Credit History", "Move-in Date", "Lease Term Requested", "Occupants", "Adults", "Minors", "Occupant Names Ages",
  "Has Joint Applicant", "Joint Name", "Joint Phone", "Joint Email", "Joint DOB", "Joint Address", "Joint Employment",
  "Joint Income", "Joint Employer Contact", "Joint Landlord Reference", "Joint Credit Info", "Joint Proof of Income",
  "Deposit Funds Available", "Deposit Agreement", "Has Pets", "Pet Deposit Funds", "Pet Details", "Eviction History",
  "Smokes Vapes Cannabis", "No Smoking Agreement", "Proof of Income", "Has Tenant Insurance", "Tenant Insurance Agreement",
  "Proof Insurance Before Move-in", "Reason for Moving", "Parking Request", "Additional Notes", "PDF URL",
  "Application Download Token", "Application Download Expires At", "Review Status", "Internal Notes", "Updated At",
  "Shortlist Status", "Document Request Sent", "Document Request Sent At", "Upload Token", "Upload Token Expires At",
  "Upload Link", "Support Document Folder URL", "Document Upload Status", "Uploaded File Count", "Last Upload At",
  "Screening Report Status", "Screening Report Generated At", "Screening Report URL", "Screening Report Markdown",
  "Data Retention Status", "Retention Expiry Date", "Retention Action", "Retention Notes", "Sensitive Files Deleted At",
  "Archived Tenant File URL", "Rented Notification Status", "Rented Notification Sent At", "Rented Notification Failure",
  "Rented Notification Sent",
];

const listingHeaders = [
  "Listing ID", "Property Address", "Workflow Status", "Listing Status", "Tenant Listing Status",
  "Availability Status", "Rental Status", "Application Status", "Created By Email", "Drive Folder Link"
];

function iterator(items) {
  let index = 0;
  return {
    hasNext() { return index < items.length; },
    next() { return items[index++]; },
  };
}

let totalFilesCreated = 0;

function makeFile(id, name, parentFolder) {
  let trashed = false;
  let description = "";
  return {
    id, name, parentFolder, trashed,
    getId() { return this.id; },
    getName() { return this.name; },
    setName(val) { this.name = val; return this; },
    getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; },
    getBlob() { return { getContentType: () => "application/pdf", getBytes: () => [1, 2, 3] }; },
    getParents() { return iterator(this.parentFolder ? [this.parentFolder] : []); },
    setDescription(desc) { description = desc; return this; },
    getDescription() { return description; },
    setTrashed(val) { trashed = val; },
    setSharing() { return this; },
  };
}

function makeFolder(id, name, parentFolder) {
  const folders = [];
  const files = [];
  return {
    id, name, parentFolder, folders, files,
    getId() { return this.id; },
    getName() { return this.name; },
    setName(val) { this.name = val; return this; },
    getUrl() { return `https://drive.google.com/drive/folders/${this.id}`; },
    setSharing() { return this; },
    getParents() { return iterator(this.parentFolder ? [this.parentFolder] : []); },
    getFolders() { return iterator(folders); },
    getFoldersByName(val) { return iterator(folders.filter((f) => f.getName() === val)); },
    createFolder(val) {
      const folder = makeFolder(`${this.id}-sub-${folders.length + 1}`, val, this);
      folders.push(folder);
      return folder;
    },
    getFiles() { return iterator(files.filter((f) => !f.trashed)); },
    getFilesByName(val) { return iterator(files.filter((f) => !f.trashed && f.getName() === val)); },
    createFile(blob) {
      totalFilesCreated++;
      const file = makeFile(`${this.id}-file-${files.length + 1}`, blob.name || "upload.pdf", this);
      files.push(file);
      return file;
    },
  };
}

function makeSheet(rows, headers) {
  return {
    getLastRow() { return rows.length; },
    getLastColumn() { return headers.length; },
    getRange(rowNumber, colNumber, numRows = 1, numCols = 1) {
      return {
        getValues() {
          return rows.slice(rowNumber - 1, rowNumber - 1 + numRows)
            .map((r) => r.slice(colNumber - 1, colNumber - 1 + numCols));
        },
        setValue(val) { rows[rowNumber - 1][colNumber - 1] = val; return this; },
        setValues(matrix) {
          for (let r = 0; r < matrix.length; r++)
            for (let c = 0; c < matrix[r].length; c++)
              rows[rowNumber - 1 + r][colNumber - 1 + c] = matrix[r][c];
          return this;
        },
        setFontWeight() { return this; },
        setBackground() { return this; },
      };
    },
    appendRow(val) { rows.push(val.slice()); },
  };
}

function rowFromFields(headers, fields) {
  return headers.map((h) => (h in fields ? fields[h] : ""));
}

function setupSandbox(appRowsList = [], listingRowsList = []) {
  const intakeRows = [intakeHeaders.slice(), ...appRowsList.map((f) => rowFromFields(intakeHeaders, f))];
  const listingRows = [
    listingHeaders.slice(),
    ...(listingRowsList.length > 0
      ? listingRowsList.map((f) => rowFromFields(listingHeaders, f))
      : [[
          "LST-TEST-001", "123 Main St", "Published", "Active", "Active",
          "Available", "Active", "Accepting Applications", "admin@vanislandproperty.ca", ""
        ]])
  ];

  const intakeSheet = makeSheet(intakeRows, intakeHeaders);
  const listingSheet = makeSheet(listingRows, listingHeaders);

  const root = makeFolder("1rP1Z05zTkOh8Rp9NMdXOrWEh8t7Qi2nA", "Applicant Sensitive Data");
  const listingFolder = root.createFolder("LST-TEST-001 - 123 Main St");
  const applicationsFolder = listingFolder.createFolder("Applications");
  const legacyListingSupportDocsFolder = listingFolder.createFolder("Supporting Documents");

  const folderRegistry = new Map();
  function registerFolder(f) {
    folderRegistry.set(f.getId(), f);
    for (const sub of f.folders) registerFolder(sub);
  }
  registerFolder(root);

  const sentEmails = [];
  const scriptProperties = { APPLICANT_SENSITIVE_DATA_FOLDER_ID: root.getId() };

  const sandbox = {
    console,
    SpreadsheetApp: {
      openById() {
        return {
          getSheetByName(name) {
            if (name === "01 Listings") return listingSheet;
            if (name === "07 Intake Records") return intakeSheet;
            return null;
          }
        };
      },
      flush() {},
    },
    DriveApp: {
      Access: { PRIVATE: "PRIVATE" },
      Permission: { VIEW: "VIEW" },
      getFolderById(id) {
        registerFolder(root);
        if (folderRegistry.has(id)) return folderRegistry.get(id);
        throw new Error(`DriveApp.getFolderById: unknown folder ${id}`);
      },
      getFileById(id) {
        function findFile(f) {
          for (const file of f.files) if (file.getId() === id) return file;
          for (const sub of f.folders) { const found = findFile(sub); if (found) return found; }
          return null;
        }
        const file = findFile(root);
        if (file) return file;
        throw new Error(`DriveApp.getFileById: unknown file ${id}`);
      },
    },
    DocumentApp: {
      ParagraphHeading: { HEADING1: "h1", HEADING2: "h2" },
      create() {
        return { getId: () => "temp-doc", getBody: () => ({ clear() {}, appendParagraph() { return { setHeading() {} }; } }), saveAndClose() {} };
      },
    },
    GmailApp: { getAliases: () => ["support@vanislandproperty.ca"], sendEmail(to, subject, body) { sentEmails.push({ to, subject, body }); } },
    MailApp: { sendEmail(options) { sentEmails.push(options); } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: (() => { let n = 0; return () => `uuid-${++n}`; })(),
      computeDigest: (_alg, input) => Array.from(crypto.createHash("sha256").update(String(input)).digest()),
      Charset: { UTF_8: "UTF-8" },
      DigestAlgorithm: { SHA_256: "SHA-256" },
      formatDate: (_d, _tz, fmt) => fmt === "yyyyMMdd-HHmmss" ? "20260918-120000" : "2026-09-18",
      newBlob: (_b, _t, name) => ({ name, setName(v) { this.name = v; return this; }, getAs() { return this; } }),
      base64Decode: () => [1, 2, 3],
      base64Encode: () => "dGVzdA==",
    },
    Session: { getScriptTimeZone: () => "America/Vancouver" },
    Logger: { log() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => scriptProperties[k] || null, setProperty: (k, v) => { scriptProperties[k] = v; } }) },
    UrlFetchApp: { fetch() { return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ inheritedPermissionsDisabled: true }) }; } },
    ScriptApp: { getOAuthToken: () => "mock-oauth-token" },
    MimeType: { PDF: "application/pdf", PLAIN_TEXT: "text/plain" },
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "Code.gs" });

  sandbox.__root = root;
  sandbox.__listingFolder = listingFolder;
  sandbox.__applicationsFolder = applicationsFolder;
  sandbox.__legacyListingSupportDocsFolder = legacyListingSupportDocsFolder;
  sandbox.__intakeRows = intakeRows;
  sandbox.__sentEmails = sentEmails;

  return sandbox;
}

let failures = 0;
function check(condition, label) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) failures++;
}

const EXPECTED_REJECT_MSG = "We could not find a submitted rental application matching this property, email address, and phone number. Please submit your Rental Application first or verify your contact information.";

function makeUploadBody(overrides = {}) {
  return {
    listingId: "LST-TEST-001",
    applicantName: "Jordan Lee",
    email: "jordan.lee@example.com",
    phone: "250-555-0100",
    category: "Government Photo ID",
    fileName: "doc.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    data: "fake-base64",
    ...overrides,
  };
}

const BASE_APP = {
  "Record ID": "APP-TEST-001",
  "Listing ID": "LST-TEST-001",
  "Applicant Name": "Jordan Lee",
  "Email": "Jordan.Lee@example.com",
  "Phone": "+1 (250) 555-0100",
  "Submitted At": "2026-09-15T10:00:00.000Z",
  "Support Document Folder URL": "",
};

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 1. No recordId + correct listing/email/phone → canonical folder ===");
{
  const sb = setupSandbox([{ ...BASE_APP }]);
  const result = sb.uploadPublicSupportingDocument_(makeUploadBody({ email: "  jordan.lee@example.com  ", phone: "250-555-0100" }));
  check(result && result.success === true, "upload succeeds");
  check(result.recordId === "APP-TEST-001", "binds to APP-TEST-001");
  check(sb.__legacyListingSupportDocsFolder.files.length === 0, "zero files in legacy listing folder");
  const appFolder = sb.__applicationsFolder.folders.find((f) => f.getName() === "APP-TEST-001 - Jordan Lee");
  check(Boolean(appFolder), "canonical application folder exists");
  const sdFolder = appFolder && appFolder.folders.find((f) => f.getName() === "Supporting Documents");
  check(sdFolder && sdFolder.files.length === 1, "one file in canonical Supporting Documents");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 2. recordId + matching listing/email/phone → canonical folder ===");
{
  const sb = setupSandbox([{ ...BASE_APP }]);
  const result = sb.uploadPublicSupportingDocument_(makeUploadBody({ recordId: "APP-TEST-001" }));
  check(result && result.success === true, "upload with recordId succeeds");
  check(result.recordId === "APP-TEST-001", "binds to APP-TEST-001");
  check(sb.__legacyListingSupportDocsFolder.files.length === 0, "zero files in legacy listing folder");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 3. SECURITY: recordId + correct listing but WRONG EMAIL → rejected ===");
{
  const sb = setupSandbox([{ ...BASE_APP }]);
  const before = totalFilesCreated;
  let err = null;
  try { sb.uploadPublicSupportingDocument_(makeUploadBody({ recordId: "APP-TEST-001", email: "attacker@evil.com" })); } catch (e) { err = e; }
  check(err !== null, "error thrown");
  check(err && err.message === EXPECTED_REJECT_MSG, "generic rejection (no recordId leak)");
  check(totalFilesCreated === before, "zero Drive files created");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 4. SECURITY: recordId + correct listing but WRONG PHONE → rejected ===");
{
  const sb = setupSandbox([{ ...BASE_APP }]);
  const before = totalFilesCreated;
  let err = null;
  try { sb.uploadPublicSupportingDocument_(makeUploadBody({ recordId: "APP-TEST-001", phone: "604-999-0000" })); } catch (e) { err = e; }
  check(err !== null, "error thrown");
  check(err && err.message === EXPECTED_REJECT_MSG, "generic rejection (no recordId leak)");
  check(totalFilesCreated === before, "zero Drive files created");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 5. recordId belongs to another listing → rejected ===");
{
  const sb = setupSandbox([{ ...BASE_APP, "Record ID": "APP-OTHER", "Listing ID": "LST-TEST-OTHER" }]);
  const before = totalFilesCreated;
  let err = null;
  try { sb.uploadPublicSupportingDocument_(makeUploadBody({ recordId: "APP-OTHER" })); } catch (e) { err = e; }
  check(err !== null, "error thrown");
  check(err && err.message === EXPECTED_REJECT_MSG, "generic rejection");
  check(totalFilesCreated === before, "zero Drive files created");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 6. Zero identity matches → rejected ===");
{
  const sb = setupSandbox([{ ...BASE_APP }]);
  const before = totalFilesCreated;
  let err = null;
  try { sb.uploadPublicSupportingDocument_(makeUploadBody({ email: "nobody@nowhere.com", phone: "000-000-0000" })); } catch (e) { err = e; }
  check(err !== null, "error thrown");
  check(err && err.message === EXPECTED_REJECT_MSG, "correct error message");
  check(totalFilesCreated === before, "zero Drive files created");
  check(sb.__legacyListingSupportDocsFolder.files.length === 0, "zero files in legacy listing folder");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 7. Multiple valid application matches → rejected ===");
{
  const sb = setupSandbox([
    { ...BASE_APP },
    { ...BASE_APP, "Record ID": "APP-TEST-002", "Applicant Name": "Jordan Lee (dup)" },
  ]);
  const before = totalFilesCreated;
  let err = null;
  try { sb.uploadPublicSupportingDocument_(makeUploadBody()); } catch (e) { err = e; }
  check(err !== null, "error thrown");
  check(err && err.message.includes("Multiple rental applications"), "ambiguity error");
  check(totalFilesCreated === before, "zero Drive files created");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 8. Stale/wrong Support Document Folder URL → corrected ===");
{
  const sb = setupSandbox([{ ...BASE_APP, "Support Document Folder URL": "https://drive.google.com/drive/folders/STALE_LEGACY_FOLDER_ID" }]);
  const result = sb.uploadPublicSupportingDocument_(makeUploadBody());
  check(result && result.success === true, "upload succeeds despite stale URL");
  const folderUrlIdx = intakeHeaders.indexOf("Support Document Folder URL");
  const updatedUrl = sb.__intakeRows[1][folderUrlIdx];
  check(!updatedUrl.includes("STALE_LEGACY_FOLDER_ID"), "stale URL was replaced");
  check(updatedUrl.includes("/drive/folders/"), "new URL is a valid folder URL");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 9. Blank Support Document Folder URL → populated ===");
{
  const sb = setupSandbox([{ ...BASE_APP, "Support Document Folder URL": "" }]);
  const result = sb.uploadPublicSupportingDocument_(makeUploadBody());
  check(result && result.success === true, "upload succeeds");
  const folderUrlIdx = intakeHeaders.indexOf("Support Document Folder URL");
  check(sb.__intakeRows[1][folderUrlIdx].includes("/drive/folders/"), "URL was populated");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 10. Already-canonical Support Document Folder URL → unchanged ===");
{
  const sb = setupSandbox([{ ...BASE_APP }]);
  // First upload populates the URL
  sb.uploadPublicSupportingDocument_(makeUploadBody({ fileName: "first.pdf" }));
  const folderUrlIdx = intakeHeaders.indexOf("Support Document Folder URL");
  const canonicalUrl = sb.__intakeRows[1][folderUrlIdx];
  check(canonicalUrl.includes("/drive/folders/"), "URL was set after first upload");
  // Second upload should not change it
  sb.uploadPublicSupportingDocument_(makeUploadBody({ fileName: "second.pdf" }));
  check(sb.__intakeRows[1][folderUrlIdx] === canonicalUrl, "URL unchanged after second upload");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 11. Token/admin workflow → unchanged ===");
{
  const sb = setupSandbox([{
    ...BASE_APP,
    "Upload Token": "valid-secret-token",
    "Upload Token Expires At": new Date(Date.now() + 86400000).toISOString(),
  }]);
  const appFolder = sb.__applicationsFolder.createFolder("APP-TEST-001 - Jordan Lee");
  const sdFolder = appFolder.createFolder("Supporting Documents");
  sb.__intakeRows[1][intakeHeaders.indexOf("Support Document Folder URL")] = sdFolder.getUrl();

  const result = sb.uploadSupportingDocument_({
    listingId: "LST-TEST-001",
    recordId: "APP-TEST-001",
    token: "valid-secret-token",
    category: "Bank Statements / Proof of Funds",
    fileName: "bank.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    data: "fake-base64",
  });
  check(result && result.success === true, "token upload succeeds");
  check(sdFolder.files.length === 1, "file in canonical folder");
  check(sb.__legacyListingSupportDocsFolder.files.length === 0, "zero files in legacy listing folder");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 12. No public write path reaches listing-level Supporting Documents ===");
{
  // Static analysis
  check(!source.includes("getApplicantSupportingDocumentsFolder_"), "dead legacy write helper has been REMOVED from codebase");

  const uploadPublicBody = (source.match(/function uploadPublicSupportingDocument_[\s\S]*?\n\}/) || [""])[0];
  const notifyPublicBody = (source.match(/function notifyPublicSupportingDocumentsUploaded_[\s\S]*?\n\}/) || [""])[0];
  const tokenUploadBody = (source.match(/function uploadSupportingDocument_[\s\S]*?\n\}/) || [""])[0];

  check(Boolean(uploadPublicBody), "found uploadPublicSupportingDocument_");
  check(Boolean(notifyPublicBody), "found notifyPublicSupportingDocumentsUploaded_");
  check(Boolean(tokenUploadBody), "found uploadSupportingDocument_");

  check(!uploadPublicBody.includes("getApplicantSensitiveSupportingDocumentsFolder_"), "upload does not call listing-level folder creator");
  check(!notifyPublicBody.includes("getApplicantSensitiveSupportingDocumentsFolder_"), "notify does not call listing-level folder creator");
  check(!tokenUploadBody.includes("getApplicantSensitiveSupportingDocumentsFolder_"), "token upload does not call listing-level folder creator");
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n=== 13. Notification resolves same application/canonical folder ===");
{
  const sb = setupSandbox([{ ...BASE_APP }]);
  const uploadResult = sb.uploadPublicSupportingDocument_(makeUploadBody());
  const notifyResult = sb.notifyPublicSupportingDocumentsUploaded_({
    listingId: "LST-TEST-001",
    applicantName: "Jordan Lee",
    email: "jordan.lee@example.com",
    phone: "250-555-0100",
    documents: [{ fileId: uploadResult.fileId, fileName: uploadResult.fileName }],
    origin: "https://www.vanislandproperty.ca",
  });
  check(notifyResult && notifyResult.success === true, "notification succeeds");
  check(sb.__sentEmails.length >= 2, "receipt emails sent");
  // Verify notification email references the correct application
  const adminEmail = sb.__sentEmails.find((e) => typeof e.body === "string" && e.body.includes("APP-TEST-001"));
  check(Boolean(adminEmail), "admin notification references APP-TEST-001");
}

// ═══════════════════════════════════════════════════════════════════════════
if (failures > 0) {
  console.error(`\nFAILED: ${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log("\nALL 13 VERIFICATION SUITES PASSED.");
}
