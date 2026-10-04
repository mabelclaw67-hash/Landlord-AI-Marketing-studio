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
  "Joint Applicant Current Landlord Reference",
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
    getParent() { return { getSpreadsheetTimeZone: () => "UTC" }; },
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
        setNumberFormat() { return this; },
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
  const pdfParagraphs = [];
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
          getBody: () => ({ clear() {}, appendParagraph(text) { pdfParagraphs.push(String(text)); return { setHeading() {} }; } }),
          saveAndClose() {},
        };
      },
    },
    GmailApp: {
      getAliases: () => ["support@vanislandproperty.ca"],
      sendEmail(to, subject, body) {
        if (options.throwOnEmail) {
          throw new Error(options.throwOnEmail === true ? "Gmail send failed: daily quota exceeded" : options.throwOnEmail);
        }
        sentEmails.push({ to, subject, body });
      },
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: (() => { let n = 0; return () => `uuid-${++n}`; })(),
      computeDigest: (_algorithm, input) => Array.from(crypto.createHash("sha256").update(String(input)).digest()),
      Charset: { UTF_8: "UTF-8" },
      DigestAlgorithm: { SHA_256: "SHA-256" },
      formatDate: (date, tz, format) => format === "yyyy-MM-dd"
        ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
        : format === "yyyyMMdd-HHmmss" ? "20260913-120000" : "",
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
  sandbox.__pdfParagraphs = pdfParagraphs;
  return sandbox;
}

module.exports = { makeSandbox, intakeHeaders };

if (require.main === module) {

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

// ── Applicant resume eligibility is separate from owner-screening eligibility ──
// A record carrying ANY Data Retention Status (an owner-facing
// reporting/lifecycle label an admin sets, e.g. "Declined" for a routine
// retention pass) must not lose the applicant's own self-service access to
// their still-open application. Only review-status "closed out" states
// affect resume eligibility, same as before this fix.
const retentionTaggedButOpen = makeSandbox({
  ...base,
  "Review Status": "Pending",
  "Data Retention Status": "Declined", // legitimate, non-empty retention label
});
const retentionDuplicate = retentionTaggedButOpen.findActiveDuplicateApplication_({
  listingId: base["Listing ID"], email: base.Email, phone: base.Phone,
});
check(Boolean(retentionDuplicate), "non-empty Data Retention Status does not block duplicate detection");
const retentionResumeToken = retentionTaggedButOpen.rentalApplicationResumeToken_(
  base["Listing ID"], base["Record ID"], future, base["Updated At"]
);
const retentionResumed = retentionTaggedButOpen.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], retentionResumeToken);
check(retentionResumed.data.email === base.Email, "resume succeeds for a legitimate existing application even when Data Retention Status is non-empty");

// Owner-screening eligibility keeps its own, independent, otherwise-unchanged
// behavior: documented inactive retention/review states are still excluded,
// but a non-empty retention value that is NOT one of those states no longer
// wrongly excludes the applicant (the bug this fix removes).
check(retentionTaggedButOpen.isEligibleApplicantForOwnerScreening_({ recordId: "X", dataRetentionStatus: "Declined", reviewStatus: "Pending" }) === false, "owner screening still excludes a documented inactive retention state");
check(retentionTaggedButOpen.isEligibleApplicantForOwnerScreening_({ recordId: "X", dataRetentionStatus: "Reviewed", reviewStatus: "Pending" }) === true, "owner screening no longer excludes a non-empty retention value outside the inactive list");
check(retentionTaggedButOpen.isEligibleApplicantForOwnerScreening_({ recordId: "X", dataRetentionStatus: "", reviewStatus: "Declined" }) === false, "owner screening still excludes a documented inactive review state");
check(retentionTaggedButOpen.isEligibleApplicantForOwnerScreening_({ recordId: "X", dataRetentionStatus: "", reviewStatus: "Pending" }) === true, "owner screening still includes a normal active application");

// ── Secure-link email delivery failure must not be reported as success ──
const emailFailureSandbox = makeSandbox(base, { throwOnEmail: "Domain policy prohibits sending mail from this address." });
let emailFailureError = "";
try {
  emailFailureSandbox.saveRentalApplication_({
    listingId: base["Listing ID"], email: base.Email, phone: base.Phone, origin: "https://example.com",
  });
} catch (e) { emailFailureError = e.message; }
check(
  emailFailureError === "We found your existing application, but we were unable to send the secure access link. Please contact support@vanislandproperty.ca for assistance.",
  "duplicate + failed resume email returns a safe, generic delivery-error message instead of success"
);
check(!emailFailureError.includes("Domain policy"), "the internal Gmail error text is never exposed to the applicant");
check(emailFailureSandbox.__sentEmails.length === 0, "no email is recorded as sent when delivery fails");

// The happy path (duplicate detected + email actually sends) keeps returning
// the normal, non-error secure-link message.
check(duplicateResponse.success === true, "duplicate + successful email still returns success: true");
check(duplicateResponse.message.indexOf("existing application") !== -1, "duplicate + successful email keeps the normal secure-link guidance message");

if (failures) process.exit(1);
console.log("All duplicate/resume/update checks passed.");

// Reproduce actual Sheets types and run the REAL page's submit serializer.
// The old fixture only used strings, hiding Date/0 and multiline defects.
const pageSource = fs.readFileSync(path.join(__dirname, "..", "..", "src", "pages", "RentalApplication.jsx"), "utf8");
const pageHelpers = pageSource.slice(pageSource.indexOf("function clean("), pageSource.indexOf("export default function RentalApplication"));
const pageSubmit = pageSource.slice(pageSource.indexOf("  async function handleSubmit("), pageSource.indexOf("  if (loading || resumeLoading"));
const multiline = "\n  First line\n\n  Indented second line: preserve punctuation\n第三行 / third line  \n";
const full = {
  ...base,
  "Date of Birth": new Date("1990-01-02T00:00:00.000Z"),
  "Move-in Date": new Date("2026-12-01T00:00:00.000Z"),
  "Joint DOB": new Date("1991-02-03T00:00:00.000Z"),
  "Current Address": "TEST Current Address",
  "Employment Status": "Employed Full-Time / 全职",
  "Employer": "Employment & Income\nEmployer / Income Source: TEST Employer\nLength of Employment: 2 years\nEmployer Contact: employer@example.invalid\nOther Income: " + multiline,
  "Monthly Income": 0, "Occupants": 2, "Adults": 2, "Minors": 0,
  "Landlord Reference": "Current Residence\nLandlord / Manager: TEST Current Manager\nLandlord Contact: current@example.invalid\nCurrent Monthly Rent: 1500\nResidence Period: 2 years\n\nPrevious Residence\nAddress: TEST Previous Address\nResidence Period: 2022-2024\nMonthly Rent: 1400\nLandlord / Manager: TEST Previous Manager\nLandlord Contact: previous@example.invalid\n\nReferences\nReference 1: TEST Ref One | Relationship: Colleague | Contact: ref1@example.invalid\nReference 2: TEST Ref Two | Relationship: Friend | Contact: ref2@example.invalid",
  "Has Joint Applicant": "Yes / 是", "Joint Name": "TEST Joint Applicant",
  "Joint Phone": "2505550198", "Joint Email": "joint@example.invalid", "Joint Address": "TEST Joint Address",
  "Joint Employment": "Status: Employed Part-Time / 兼职\nEmployer / Income Source: TEST Joint Employer",
  "Joint Income": 0, "Joint Employer Contact": "joint-employer@example.invalid", "Joint Landlord Reference": multiline,
  "Joint Credit Info": "Good / 良好", "Joint Proof of Income": "Yes / 是",
  "Deposit Funds Available": "Yes / 是", "Deposit Agreement": "Agreed",
  "Has Pets": "Yes / 有宠物", "Pet Deposit Funds": "Yes / 是", "Pet Details": multiline,
  "Eviction History": "Background / Credit\nEvictions / tenancy breaches: " + multiline + "\nAdditional background or credit notes: " + multiline,
  "Smokes Vapes Cannabis": "No / 否", "No Smoking Agreement": "Agreed", "Proof of Income": "Yes / 是",
  "Has Tenant Insurance": "No, but will obtain before move-in / 否，但将在入住前购买",
  "Tenant Insurance Agreement": "Agreed", "Proof Insurance Before Move-in": "In progress / 办理中",
  "Reason for Moving": multiline, "Parking Request": "Vehicles: 0\nVehicle details: TEST Sedan",
  "Additional Notes": "Emergency Contact\nName: TEST Emergency\nRelationship: Sibling\nPhone: 2505550197\nEmail: emergency@example.invalid\n\nSupporting Documents\nAvailable documents / notes: " + multiline + "\n\nOther Notes\n" + multiline,
  "Support Document Folder URL": "https://drive.google.com/drive/folders/synthetic-only",
  "Document Upload Status": "Uploaded", "Uploaded File Count": 1,
};

async function pageRoundTrip(fields = full) {
  const env = makeSandbox(fields);
  const token = env.rentalApplicationResumeToken_(base["Listing ID"], base["Record ID"], future, base["Updated At"]);
  const data = env.getRentalApplicationResume_(base["Listing ID"], base["Record ID"], token).data;
  check(data.moveInDate === "2026-12-01" && data.dateOfBirth === "1990-01-02" && data.jointDob === "1991-02-03", "native Sheet Dates restore as YYYY-MM-DD");
  check(env.rentalApplicationResumeDate_(new Date("2026-11-30T16:00:00Z"), "Asia/Hong_Kong") === "2026-12-01", "native Date normalization uses the Sheet timezone, not UTC truncation");
  check(env.rentalApplicationResumeDate_("2026-12-01T00:00:00.000Z", "UTC") === "2026-12-01", "ISO string normalization preserves the date portion");
  check(env.rentalApplicationResumeDate_("03/02/1991", "UTC") === "1991-02-03", "documented legacy DD/MM/YYYY joint dates normalize");
  check(data.minors === 0 && data.monthlyIncome === 0 && data.jointIncome === 0, "actual numeric zero survives the Sheet reader and resume mapping");
  for (const key of ["otherIncome", "evictionHistory", "backgroundNotes", "supportingDocsNotes", "additionalNotes", "petDetails", "jointLandlordReference", "currentResidenceReasonForLeaving"]) {
    check(data[key] === multiline, `${key}: exact multiline, internal blank lines, indentation and Chinese text restored`);
  }
  const stored = new Map();
  const page = {
    form: { ...data, agreed: true }, listingId: base["Listing ID"],
    resumeSession: { recordId: base["Record ID"], token, requestKey: "test" },
    resumeRequestKey: "test", loadedRequestKey: "test", resumeRequested: true, resumeError: "",
    submissionPending: false, submissionInFlight: { current: false },
    window: { location: { pathname: "/apply/LST-TEST-001", search: "?resumeRecordId=APP-TEST-001&token=synthetic" } },
    sessionStorage: { getItem: (k) => stored.get(k), setItem: (k, v) => stored.set(k, v), removeItem: (k) => stored.delete(k) },
    setError() {}, setDuplicateNotice() {}, setSubmitting() {}, setSubmitted() {}, setSubmissionPending() {}, setResumeError() {},
    saveRentalApplication: async () => { throw new Error("Resume must NEVER select new-application save"); },
    updateRentalApplication: async (listing, id, secureToken, payload) => env.updateRentalApplication_(listing, id, secureToken, payload),
  };
  vm.createContext(page);
  vm.runInContext(pageHelpers + "\n" + pageSubmit, page);
  await page.handleSubmit({ preventDefault() {} });
  const after = env.__rows[1];
  for (const key of Object.keys(fields)) {
    if (["PDF URL", "Application Download Token", "Application Download Expires At", "Updated At"].includes(key)) continue;
    const previous = fields[key];
    const actual = after[intakeHeaders.indexOf(key)];
    check(previous instanceof Date ? actual === previous.toISOString().slice(0, 10) : String(actual) === String(previous), `untouched resume → REAL page serialize → update preserves ${key}`);
  }
  check(env.__rows.length === 2, "untouched resubmit keeps same row and creates no duplicate");
  check(env.__applicantFolder.files.length === 2 && !env.__applicantFolder.files[0].trashed, "new PDF generated and original kept");
  check(env.__pdfParagraphs.includes("Minors: 0"), "generated PDF renders numeric zero, not a blank/dash");
  check(env.__pdfParagraphs.join("\n").includes(multiline), "generated PDF receives complete multiline text");
  check(!stored.size, "confirmed write clears the pending-submission flag");
  let forbiddenCalls = 0;
  page.updateRentalApplication = page.saveRentalApplication = async () => { forbiddenCalls++; };
  for (const scenario of [
    { resumeSession: null },
    { resumeSession: { requestKey: "stale" } },
    { resumeSession: { requestKey: "test" }, resumeError: "invalid" },
    { resumeError: "", submissionPending: true },
    { submissionPending: false, loadedRequestKey: "stale" },
  ]) {
    Object.assign(page, scenario);
    await page.handleSubmit({ preventDefault() {} });
  }
  check(forbiddenCalls === 0, "invalid/missing/stale resume, uncertain write and route transition cannot submit");
  // A request already in flight must not display its APP or error on a new URL.
  Object.assign(page, { resumeSession: { requestKey: "test", recordId: base["Record ID"], token }, resumeError: "", submissionPending: false, loadedRequestKey: "test" });
  for (const outcome of ["success", "timeout"]) {
    let finish;
    let start;
    const started = new Promise((resolve) => { start = resolve; });
    const response = new Promise((resolve, reject) => { finish = outcome === "success" ? resolve : reject; });
    let staleUpdates = 0;
    page.setSubmitted = page.setSubmissionPending = page.setDuplicateNotice = page.setResumeError = () => { staleUpdates++; };
    page.updateRentalApplication = async () => { start(); return response; };
    const pending = page.handleSubmit({ preventDefault() {} });
    await started;
    staleUpdates = 0;
    page.window.location.search = "?new-url=" + outcome;
    finish(outcome === "success" ? { success: true, recordId: base["Record ID"] } : { resultUnknown: true });
    await pending;
    check(staleUpdates === 0, `in-flight ${outcome} does not overwrite the new URL's page state`);
    stored.clear();
  }
  const legacy = makeSandbox({ ...fields, "Joint Landlord Reference": "", "Joint Applicant Current Landlord Reference": multiline });
  const legacyApp = legacy.rowToApplication_(legacy.__rows[1], legacy.getHeaderMap_(legacy.getSheet_(legacy.INTAKE_SHEET)));
  check(legacy.buildRentalApplicationResumeData_(legacyApp, "UTC").jointLandlordReference === multiline, "legacy joint landlord reference restores complete multiline text");
  const legacyToken = legacy.rentalApplicationResumeToken_(base["Listing ID"], base["Record ID"], future, base["Updated At"]);
  legacy.updateRentalApplication_(base["Listing ID"], base["Record ID"], legacyToken, { jointLandlordReference: multiline, moveInDate: "2026-12-01" });
  check(legacy.__rows[1][intakeHeaders.indexOf("Joint Landlord Reference")] === "", "untouched legacy reference does not populate an originally blank canonical cell");
  check(legacy.__rows[1][intakeHeaders.indexOf("Joint Applicant Current Landlord Reference")] === multiline, "untouched legacy reference remains exactly as stored");
  const nextLegacyToken = legacy.rentalApplicationResumeToken_(base["Listing ID"], base["Record ID"], future, legacy.__rows[1][intakeHeaders.indexOf("Updated At")]);
  legacy.updateRentalApplication_(base["Listing ID"], base["Record ID"], nextLegacyToken, { jointLandlordReference: "Updated legacy\nsecond line", moveInDate: "2026-12-01" });
  check(legacy.__rows[1][intakeHeaders.indexOf("Joint Applicant Current Landlord Reference")] === "Updated legacy\nsecond line", "update writes the same legacy joint reference column that the reader uses");
  if (failures) process.exitCode = 1;
}
pageRoundTrip().then(() => pageRoundTrip({
  ...full,
  "Employer": "Employment & Income\nOther Income: " + multiline,
  "Current Address": "",
  "Joint Employment": "Employed Full-Time / 全职",
})).catch((error) => { console.error(error); process.exitCode = 1; });
}
