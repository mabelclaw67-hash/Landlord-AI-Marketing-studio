"use strict";

// In-memory regression coverage for the prospective duplicate/resume/update
// workflow. No Apps Script, Drive, Sheet, or email service is contacted.

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

const listingHeaders = ["Listing ID", "Property Address", "Status", "Created By Email"];
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 60 * 1000).toISOString();

function iterator(items) {
  let index = 0;
  return { hasNext() { return index < items.length; }, next() { return items[index++]; } };
}

function makeFile(id, name) {
  return {
    id,
    name,
    trashed: false,
    getId() { return this.id; },
    getName() { return this.name; },
    getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; },
    getBlob() { return { getContentType: () => "application/pdf", getBytes: () => [1, 2, 3] }; },
    getAs() { return { name: `${this.name}.pdf`, setName(value) { this.name = value; return this; } }; },
    setTrashed(value) { this.trashed = value; },
    setSharing() { return this; },
  };
}

function makeFolder(id, name) {
  const folders = [];
  const files = [];
  return {
    id, name, folders, files,
    getId() { return this.id; },
    getName() { return this.name; },
    setName(value) { this.name = value; },
    setSharing() { return this; },
    getFolders() { return iterator(folders); },
    getFoldersByName(value) { return iterator(folders.filter((folder) => folder.getName() === value)); },
    createFolder(value) {
      const folder = makeFolder(`${this.id}-folder-${folders.length + 1}`, value);
      folders.push(folder);
      return folder;
    },
    getFiles() { return iterator(files.filter((file) => !file.trashed)); },
    getFilesByName(value) { return iterator(files.filter((file) => !file.trashed && file.getName() === value)); },
    createFile(blob) {
      const file = makeFile(`${this.id}-file-${files.length + 1}`, blob.name || "updated.pdf");
      files.push(file);
      return file;
    },
  };
}

function row(fields) {
  return intakeHeaders.map((header) => (header in fields ? fields[header] : ""));
}

function makeSheet(rows) {
  return {
    getLastRow() { return rows.length; },
    getLastColumn() { return rows[0].length; },
    getRange(rowNumber, columnNumber, rowCount = 1, columnCount = 1) {
      return {
        getValues() {
          return rows.slice(rowNumber - 1, rowNumber - 1 + rowCount)
            .map((sourceRow) => sourceRow.slice(columnNumber - 1, columnNumber - 1 + columnCount));
        },
        setValue(value) {
          rows[rowNumber - 1][columnNumber - 1] = value;
          return this;
        },
        setFontWeight() { return this; },
        setBackground() { return this; },
      };
    },
    appendRow(values) { rows.push(values.slice()); },
  };
}

function makeSandbox(appFields, options = {}) {
  const intakeRows = [intakeHeaders.slice(), row(appFields)];
  const listingRows = [listingHeaders.slice(), ["LST-TEST-001", "123 Main St", "Published", "owner@example.com"]];
  const intakeSheet = makeSheet(intakeRows);
  const listingSheet = makeSheet(listingRows);
  const root = makeFolder("1rP1Z05zTkOh8Rp9NMdXOrWEh8t7Qi2nA", "Applicant Sensitive Data");
  const listingFolder = root.createFolder("LST-TEST-001 - 123 Main St");
  const applicationsFolder = listingFolder.createFolder("Applications");
  const applicantFolder = applicationsFolder.createFolder(`${appFields["Record ID"]} - ${appFields["Applicant Name"]}`);
  applicantFolder.files.push(makeFile("original-pdf", "Rental Application - original.pdf"));
  const sentEmails = [];
  const sandbox = {
    console,
    SpreadsheetApp: {
      openById(_id) {
        return { getSheetByName(name) { return name === "01 Listings" ? listingSheet : intakeSheet; } };
      },
      flush() {},
    },
    DriveApp: {
      Access: { PRIVATE: "PRIVATE" },
      Permission: { VIEW: "VIEW" },
      getFolderById(id) {
        if (id === root.getId()) return root;
        throw new Error(`Unknown folder: ${id}`);
      },
      getFileById(id) {
        if (id === "temp-doc") return makeFile(id, "temp-doc");
        if (id === "original-pdf") return applicantFolder.files.find((file) => file.getId() === id);
        throw new Error(`Unknown file: ${id}`);
      },
    },
    DocumentApp: {
      ParagraphHeading: { HEADING1: "h1", HEADING2: "h2" },
      create() {
        return {
          getId: () => "temp-doc",
          getBody: () => ({ clear() {}, appendParagraph() { return { setHeading() {} }; } }),
          saveAndClose() {},
        };
      },
    },
    GmailApp: { getAliases: () => ["support@vanislandproperty.ca"], sendEmail(to, subject, body) { sentEmails.push({ to, subject, body }); } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: (() => { let n = 0; return () => `uuid-${++n}`; })(),
      computeDigest: (_algorithm, input) => Array.from(crypto.createHash("sha256").update(String(input)).digest()),
      Charset: { UTF_8: "UTF-8" },
      DigestAlgorithm: { SHA_256: "SHA-256" },
      formatDate: (_date, _tz, format) => format === "yyyyMMdd-HHmmss" ? "20260913-120000" : "",
      newBlob: (_bytes, _type, name) => ({ name, setName(value) { this.name = value; return this; }, getAs() { return this; } }),
      base64Decode: () => [],
      base64Encode: () => "encoded",
    },
    Session: { getScriptTimeZone: () => "America/Vancouver" },
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => scriptProperties[key] || null,
        setProperty: (key, value) => { scriptProperties[key] = value; },
      }),
    },
    MimeType: { PDF: "application/pdf", PLAIN_TEXT: "text/plain" },
  };
  const scriptProperties = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "Code.gs" });
  sandbox.__rows = intakeRows;
  sandbox.__root = root;
  sandbox.__applicantFolder = applicantFolder;
  sandbox.__sentEmails = sentEmails;
  return sandbox;
}

function check(condition, label) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) failures++;
}

let failures = 0;
const base = {
  "Record ID": "APP-TEST-001",
  "Listing ID": "LST-TEST-001",
  "Submitted At": "2026-09-12T10:00:00.000Z",
  "Applicant Name": "Jordan Lee",
  "Email": "Jordan.Lee@example.com",
  "Phone": "+1 (250) 555-0100",
  "Application Download Token": "old-token",
  "Application Download Expires At": future,
  "Updated At": "2026-09-12T10:00:00.000Z",
  "Upload Token": "upload-token",
  "Upload Token Expires At": future,
  "Review Status": "Pending",
  "Internal Notes": "keep-private",
  "PDF URL": "https://drive.google.com/file/d/original-pdf/view",
};

// Exact listing + normalized email + normalized phone => one active duplicate.
const duplicateSandbox = makeSandbox(base);
const duplicate = duplicateSandbox.findActiveDuplicateApplication_({
  listingId: "LST-TEST-001", email: " jordan.lee@example.com ", phone: "+1 250-555-0100",
});
check(Boolean(duplicate), "same listing and normalized identity is detected");
const beforeRows = duplicateSandbox.__rows.length;
const beforePdfToken = duplicateSandbox.__rows[1][intakeHeaders.indexOf("Application Download Token")];
const beforePdfExpiry = duplicateSandbox.__rows[1][intakeHeaders.indexOf("Application Download Expires At")];
const duplicateResponse = duplicateSandbox.saveRentalApplication_({
  listingId: "LST-TEST-001", email: "jordan.lee@example.com", phone: "+1 2505550100", origin: "https://example.com",
});
check(duplicateResponse.duplicate === true, "duplicate response is generic duplicate state");
check(!Object.prototype.hasOwnProperty.call(duplicateResponse, "recordId"), "duplicate response does not expose existing Record ID");
check(duplicateSandbox.__rows.length === beforeRows, "duplicate creates zero new rows or Record IDs");
check(duplicateSandbox.__sentEmails.length === 1 && duplicateSandbox.__sentEmails[0].to === base.Email, "resume email uses stored applicant email only");
check(duplicateSandbox.__rows[1][intakeHeaders.indexOf("Application Download Token")] === beforePdfToken, "duplicate leaves PDF download token unchanged");
check(duplicateSandbox.__rows[1][intakeHeaders.indexOf("Application Download Expires At")] === beforePdfExpiry, "duplicate leaves PDF download expiry unchanged");
const issuedResumeToken = duplicateSandbox.__sentEmails[0].body.match(/token=([0-9a-f.]+)/i)[1];
check(issuedResumeToken !== beforePdfToken && /^\d{10,}\.[0-9a-f]{64}$/i.test(issuedResumeToken), "duplicate issues a purpose-separated resume token");

// The exact ID matching rule does not expand to name-only or incomplete identity.
check(!duplicateSandbox.findActiveDuplicateApplication_({ listingId: "LST-OTHER", email: base.Email, phone: base.Phone }), "different listing is not intercepted");
check(!duplicateSandbox.findActiveDuplicateApplication_({ listingId: base["Listing ID"], email: "other@example.com", phone: base.Phone }), "different email is not intercepted");
check(!duplicateSandbox.findActiveDuplicateApplication_({ listingId: base["Listing ID"], email: base.Email, phone: "2505550199" }), "different phone is not intercepted");
check(!duplicateSandbox.findActiveDuplicateApplication_({ listingId: base["Listing ID"], email: "", phone: base.Phone }), "missing email preserves normal submission behavior");
check(!duplicateSandbox.findActiveDuplicateApplication_({ listingId: base["Listing ID"], email: base.Email, phone: "" }), "missing phone preserves normal submission behavior");
check(!duplicateSandbox.findActiveDuplicateApplication_({ listingId: base["Listing ID"], email: "new@example.com", phone: "2505550100", applicantName: base["Applicant Name"] }), "same name alone is not intercepted");

// Terminal applications are not active under the existing fail-closed status rules.
const terminal = makeSandbox({ ...base, "Review Status": "Selected Tenant" });
check(!terminal.findActiveDuplicateApplication_({ listingId: base["Listing ID"], email: base.Email, phone: base.Phone }), "terminal application is not treated as active");

// Resume validation returns only post-verification editable data.
const resumeSandbox = makeSandbox(base);
let invalidError = "";
try { resumeSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], base["Application Download Token"]); } catch (e) { invalidError = e.message; }
check(invalidError === "This application link is invalid or expired.", "invalid token returns generic error without application data");
const resumeToken = resumeSandbox.rentalApplicationResumeToken_(base["Listing ID"], base["Record ID"], future, base["Updated At"]);
let pdfTokenOnResumeError = "";
try { resumeSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], base["Application Download Token"]); } catch (e) { pdfTokenOnResumeError = e.message; }
check(pdfTokenOnResumeError === "This application link is invalid or expired.", "PDF download token fails for resume endpoint");
const modifiedResumeToken = resumeToken.slice(0, -1) + (resumeToken.slice(-1) === "0" ? "1" : "0");
let modifiedTokenError = "";
try { resumeSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], modifiedResumeToken); } catch (e) { modifiedTokenError = e.message; }
check(modifiedTokenError === "This application link is invalid or expired.", "modified resume token fails closed");
let wrongListingError = "";
try { resumeSandbox.getRentalApplicationResume_("LST-WRONG", base["Record ID"], resumeToken); } catch (e) { wrongListingError = e.message; }
check(wrongListingError === "This application link is invalid or expired.", "valid token cannot be used with the wrong listing");
const expiredSandbox = makeSandbox({ ...base, "Application Download Expires At": past });
let expiredError = "";
const expiredResumeToken = expiredSandbox.rentalApplicationResumeToken_(base["Listing ID"], base["Record ID"], past, base["Updated At"]);
try { expiredSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], expiredResumeToken); } catch (e) { expiredError = e.message; }
check(expiredError === "This application link is invalid or expired.", "expired token returns generic error without application data");
const resumed = resumeSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], resumeToken);
check(resumed.data.email === base.Email && resumed.data.applicantName === base["Applicant Name"], "valid token loads the correct existing applicant form data");
check(!Object.prototype.hasOwnProperty.call(resumed.data, "pdfUrl") && !Object.prototype.hasOwnProperty.call(resumed.data, "applicationDownloadToken"), "resume payload excludes PDF URL and token");
const changedVersionToken = resumeSandbox.rentalApplicationResumeToken_(base["Listing ID"], base["Record ID"], future, "2026-09-13T10:00:00.000Z");
let changedVersionError = "";
try { resumeSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], changedVersionToken); } catch (e) { changedVersionError = e.message; }
check(changedVersionError === "This application link is invalid or expired.", "changed application version invalidates the resume token");

const pdfDownload = resumeSandbox.getApplicationPdfDownloadData_(base["Record ID"], base["Application Download Token"]);
check(pdfDownload.recordId === base["Record ID"] && pdfDownload.data === "encoded", "PDF download token works for PDF endpoint");
let resumeOnPdfError = "";
try { resumeSandbox.getApplicationPdfDownloadData_(base["Record ID"], resumeToken); } catch (e) { resumeOnPdfError = e.message; }
check(resumeOnPdfError === "This download link is invalid or expired.", "resume token fails for PDF endpoint");
let uploadOnResumeError = "";
try { resumeSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], base["Upload Token"]); } catch (e) { uploadOnResumeError = e.message; }
check(uploadOnResumeError === "This application link is invalid or expired.", "supporting-document token fails for resume endpoint");
let uploadOnPdfError = "";
try { resumeSandbox.getApplicationPdfDownloadData_(base["Record ID"], base["Upload Token"]); } catch (e) { uploadOnPdfError = e.message; }
check(uploadOnPdfError === "This download link is invalid or expired.", "supporting-document token fails for PDF endpoint");
check(resumeSandbox.validateUploadToken_(base["Listing ID"], base["Record ID"], base["Upload Token"]).recordId === base["Record ID"], "supporting-document token remains valid for upload endpoint");

// Update keeps the same row, preserves immutable fields, rotates the token,
// and adds a new PDF without trashing the original.
const updateSandbox = makeSandbox(base);
const updateResumeToken = updateSandbox.rentalApplicationResumeToken_(base["Listing ID"], base["Record ID"], future, base["Updated At"]);
let pdfTokenOnUpdateError = "";
try { updateSandbox.updateRentalApplication_(base["Listing ID"], base["Record ID"], base["Application Download Token"], {}); } catch (e) { pdfTokenOnUpdateError = e.message; }
check(pdfTokenOnUpdateError === "This application link is invalid or expired.", "PDF download token fails for update endpoint");
const updated = updateSandbox.updateRentalApplication_(base["Listing ID"], base["Record ID"], updateResumeToken, {
  applicantName: "Jordan Lee Updated",
  email: "jordan.updated@example.com",
  phone: "2505550111",
  moveInDate: "2026-10-01",
  agreed: true,
  reviewStatus: "Declined",
  internalNotes: "attacker-change",
});
const updatedRow = updateSandbox.__rows[1];
const idx = (name) => intakeHeaders.indexOf(name);
check(updated.updated === true && updated.recordId === base["Record ID"], "update uses the same Record ID");
check(updateSandbox.__rows.length === 2, "update creates no additional row");
check(updatedRow[idx("Listing ID")] === base["Listing ID"] && updatedRow[idx("Submitted At")] === base["Submitted At"], "Listing ID and original Submitted At remain unchanged");
check(updatedRow[idx("Applicant Name")] === "Jordan Lee Updated" && updatedRow[idx("Email")] === "jordan.updated@example.com", "editable fields update on the existing row");
check(updatedRow[idx("Review Status")] === base["Review Status"] && updatedRow[idx("Internal Notes")] === base["Internal Notes"], "internal/admin fields cannot be changed by applicant payload");
check(updatedRow[idx("Application Download Token")] !== base["Application Download Token"], "PDF token rotates only after successful update");
check(updatedRow[idx("PDF URL")] === updated.pdfUrl && updatedRow[idx("PDF URL")] !== base["PDF URL"], "PDF URL points to the new version");
check(updateSandbox.__applicantFolder.files.length === 2, "updated PDF is a separate file in the same Record folder");
check(updateSandbox.__applicantFolder.files[0].trashed === false, "original PDF remains intact");
let staleError = "";
try { updateSandbox.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], updateResumeToken); } catch (e) { staleError = e.message; }
check(staleError === "This application link is invalid or expired.", "old resume token cannot resume after update");

if (failures) process.exit(1);
console.log("All duplicate/resume/update checks passed.");
