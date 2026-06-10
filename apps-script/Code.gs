// ============================================================
//  Vanisland AI Marketing Studio — Apps Script Backend v0.3
//  Spreadsheet ID : 1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4
//  Drive Folder ID: 1NeilrEpNtuwNkru9xNTWDmZ_LL3jIqWD
// ============================================================

var SPREADSHEET_ID  = "1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4";
var DRIVE_FOLDER_ID = "1NeilrEpNtuwNkru9xNTWDmZ_LL3jIqWD";
var DAILY_MARKET_BRIEF_SPREADSHEET_ID = "1kmV7FdBX6S06lGIZy3HveryolVbeMsC0pDXrWn4BcC8";
var ADMIN_ACCESS_CODE = ""; // source of truth is 08 System Settings — no hardcoded fallback
var LISTINGS_SHEET  = "01 Listings";
var CONTACTS_SHEET  = "Contacts";
var INTAKE_SHEET    = "07 Intake Records";
var SYSTEM_SETTINGS_SHEET = "08 System Settings";
var DAILY_MARKET_BRIEF_SHEET = "01 Daily Market Brief";
var DAILY_MARKET_BRIEF_CONFIG_SHEET = "02 Config";
var DAILY_MARKET_BRIEF_SYNC_LOG_SHEET = "03 Sync Log";
var WEBSITE_REPORTS_SHEET = "Website Reports";
var DAILY_MARKET_BRIEF_SYNC_HANDLER = "syncDailyMarketBriefFromLatestReport";

var INTAKE_HEADERS = [
  // System
  "Record ID",                       // A
  "Listing ID",                      // B
  "Submitted At",                    // C
  // Applicant info
  "Applicant Name",                  // D
  "Email",                           // E
  "Phone",                           // F
  "Date of Birth",                   // G
  "Current Address",                 // H
  "WeChat",                          // I
  // Employment / Income
  "Employment Status",               // J
  "Employer",                        // K
  "Monthly Income",                  // L
  // Reference & Credit
  "Landlord Reference",              // M
  "Credit History",                  // N
  // Move-in / Occupancy
  "Move-in Date",                    // O
  "Lease Term Requested",            // P
  "Occupants",                       // Q  (total occupants)
  "Adults",                          // R
  "Minors",                          // S
  "Occupant Names Ages",             // T
  // Joint applicant
  "Has Joint Applicant",             // U
  "Joint Name",                      // V
  "Joint Phone",                     // W
  "Joint Email",                     // X
  "Joint DOB",                       // Y
  "Joint Address",                   // Z
  "Joint Employment",                // AA
  "Joint Income",                    // AB
  "Joint Employer Contact",          // AC
  "Joint Landlord Reference",        // AD
  "Joint Credit Info",               // AE
  "Joint Proof of Income",           // AF
  // Lease / Deposit
  "Deposit Funds Available",         // AF
  "Deposit Agreement",               // AG
  // Pets
  "Has Pets",                        // AH
  "Pet Deposit Funds",               // AI
  "Pet Details",                     // AJ
  // Tenancy history
  "Eviction History",                // AK
  // Smoking
  "Smokes Vapes Cannabis",           // AL
  "No Smoking Agreement",            // AM
  // Supporting documents
  "Proof of Income",                 // AN
  // Tenant insurance
  "Has Tenant Insurance",            // AO
  "Tenant Insurance Agreement",      // AP
  "Proof Insurance Before Move-in",  // AQ
  // Additional info
  "Reason for Moving",               // AR
  "Parking Request",                 // AS
  "Additional Notes",                // AT
  // Admin (managed by backend only)
  "PDF URL",                         // AU
  "Application Download Token",
  "Application Download Expires At",
  "Review Status",                   // AV
  "Internal Notes",                  // AW
  "Updated At",                      // AX
  "Shortlist Status",
  "Document Request Sent",
  "Document Request Sent At",
  "Upload Token",
  "Upload Token Expires At",
  "Upload Link",
  "Support Document Folder URL",
  "Document Upload Status",
  "Uploaded File Count",
  "Last Upload At",
  "Screening Report Status",
  "Screening Report Generated At",
  "Screening Report URL",
  "Screening Report Markdown",
  "Data Retention Status",
  "Retention Expiry Date",
  "Retention Action",
  "Retention Notes",
  "Sensitive Files Deleted At",
  "Archived Tenant File URL",
];

var CONTACT_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "WeChat ID",
  "City",
  "Service Interest",
  "Message",
  "Submitted At",
  "Approval Status",
  "Approved Module",
  "Access Type",
  "Payment Status",
  "Access Code",
  "Approved At",
  "Access Expires At",
  "Approval Email Sent At",
  "Admin Notes",
];

// ── Column reference — actual "01 Listings" header row ────────────────────────
//
//  A  0   Listing ID
//  B  1   Created Date
//  C  2   Owner Name
//  D  3   Owner Email
//  E  4   Property Address
//  F  5   City
//  G  6   Province
//  H  7   Bedrooms
//  I  8   Bathrooms
//  J  9   Rent
//  K  10  Available Date
//  L  11  Lease Term
//  M  12  Utilities
//  N  13  Pet Policy
//  O  14  Parking
//  P  15  Laundry
//  Q  16  Smoking Policy
//  R  17  Key Features
//  S  18  Target Audience
//  T  19  Language
//  U  20  Platforms          (comma-string for manual rows; JSON array for app rows)
//  V  21  Status
//  W  22  Drive Folder Link  ← EXISTING column — source of truth for listing photos
//  X  23  Outputs            JSON object  (app-managed)
//  Y  24  Review Status      JSON object  (app-managed)
//  Z  25  Compliance Flag    JSON object  (app-managed)
//  AA 26  Media Checklist    JSON array   (app-managed)
//  AB 27  Drive Files        JSON array   (app-managed, legacy upload refs)
//
// All read/write uses header-name lookups (getHeaderMap_) so column order
// changes in the sheet will not break the mapping.

var LISTING_HEADERS = [
  "Listing ID",        // A  0
  "Created Date",      // B  1
  "Owner Name",        // C  2
  "Owner Email",       // D  3
  "Property Address",  // E  4
  "City",              // F  5
  "Province",          // G  6
  "Bedrooms",          // H  7
  "Bathrooms",         // I  8
  "Rent",              // J  9
  "Available Date",    // K 10
  "Lease Term",        // L 11
  "Utilities",         // M 12
  "Pet Policy",        // N 13
  "Parking",           // O 14
  "Laundry",           // P 15
  "Smoking Policy",    // Q 16
  "Key Features",      // R 17
  "Target Audience",   // S 18
  "Language",          // T 19
  "Platforms",         // U 20
  "Workflow Status",   // V 21  — actual header name in the sheet
  "Drive Folder Link", // W 22  — existing column, source of truth for photos
  "Final Package Link", // X 23  URL to admin marketing package
  "Published Link",     // Y 24  URL to public tenant-facing listing
  "Listing Status",     // Z 25  tenant-facing public listing status
  "Open House Date / Time", // AA 26
  "Open House Viewing Instructions", // AB 27
  "Open House Parking Notes", // AC 28
  "Outputs",           // Z 25  JSON (generated copy — app-managed)
  "Media Checklist",      // AA 26 JSON
  "Drive Files",          // AB 27 JSON
  "Enhanced Folder ID",   // AC 28 — 02_AI_Enhanced_Photos subfolder Drive ID
  "videoUrl",             // AD 29 — generated MP4 video URL (Google Drive link)
  "publicVideoUrl",       //        Cloudinary CDN URL for playback (set by uploadVideoToCloudinary_)
  "Cover Image File ID",  //        fileId of the selected/generated cover image
  "Created By Email",
  "Created By Access Code",
  "Created By Role",
];

// ── Router ───────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";
    if (action === "ping")               return ok({ status: "connected" });
    var publicGetActions = ["getListings", "getListingById", "getListingFolder", "getListingSubfolder", "getDailyMarketBrief", "getWebsiteReport", "syncDailyMarketBrief", "getApplicationPdfDownloadData", "validateUploadToken"];
    var isPublicGet = publicGetActions.indexOf(action) >= 0;
    var auth = resolveAccessContext_(e.parameter || {}, "rental", { allowAdmin: true, allowTrial: true, allowNoAccess: isPublicGet });
    if (action === "getListings")         return ok(getListings_(auth));
    if (action === "getListingById")      return ok(getListingById_(e.parameter.listingId, auth));
    if (action === "getListingFolder")    return ok(getListingFolderFiles_(e.parameter.folderId, e.parameter.listingId, auth));
    if (action === "getListingSubfolder") return ok(getListingSubfolderFiles_(e.parameter.folderId, e.parameter.subfolderName, e.parameter.listingId, auth));
    if (action === "getDailyMarketBrief") return ok(getDailyMarketBrief_());
    if (action === "getWebsiteReport") return ok(getWebsiteReport_(e.parameter.reportId));
    if (action === "syncDailyMarketBrief") return ok(syncDailyMarketBriefFromLatestReport_());
    if (action === "getApplicationById")  return ok(getApplicationById_(e.parameter.applicationId, auth));
    if (action === "getApplicationPdfDownloadData") return ok(getApplicationPdfDownloadData_(e.parameter.recordId, e.parameter.token));
    if (action === "validateUploadToken") return ok(validateUploadToken_(e.parameter.listingId, e.parameter.recordId, e.parameter.token));
    if (action === "getContactRequests")  return ok(getContactRequests_(auth));
    return err("Unknown GET action: " + action);
  } catch (ex) {
    return err(ex.message);
  }
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action || "";
    // Actions that do not require any session (login/public endpoints)
    var noAuthActions = ["saveContact", "validateAccessCode", "saveRentalApplication", "validateAdminAccessCode", "getListings", "getListingById", "getApplicationPdfDownloadData", "validateUploadToken", "uploadSupportingDocument"];
    var isNoAuth = noAuthActions.indexOf(action) >= 0;
    var auth = resolveAccessContext_(body || {}, "rental", {
      allowAdmin: true,
      allowTrial: !isNoAuth,
      allowNoAccess: isNoAuth,
    });
    if (action === "getListings")       return ok(getListings_(auth));        // POST avoids GET cache
    if (action === "getListingById")    return ok(getListingById_(body.listingId, auth));
    if (action === "generateListingId") return ok({ listingId: generateListingId_() });
    if (action === "saveListing")       return ok(saveListing_(body.data, auth));
    if (action === "saveContact")       return ok(saveContact_(body.data));
    if (action === "uploadFile")        return ok(uploadFile_(body, auth));
    if (action === "uploadToSubfolder") return ok(uploadToSubfolder_(body, auth));
    if (action === "updateVideoUrl")    return ok(updateVideoUrl_(body.listingId, body.videoUrl, auth));
    if (action === "syncVideoUrl")      return ok(syncVideoUrl_(body.listingId, auth));
    if (action === "syncAllVideoUrls")       return ok(syncAllVideoUrls_());
    if (action === "uploadVideoToCloudinary") return ok(uploadVideoToCloudinary_(body.driveFileId, body.listingId));
    if (action === "migrateExistingVideos")  return ok(migrateExistingVideos_());
    if (action === "saveRentalApplication")  return ok(saveRentalApplication_(body.data));
    if (action === "getApplicationsByListing") return ok(getApplicationsByListing_(body.listingId, auth));
    if (action === "getAllApplications")     return ok(getAllApplications_(auth));
    if (action === "getApplicationPdfDownloadData") return ok(getApplicationPdfDownloadData_(body.recordId, body.token));
    if (action === "updateApplicationStatus") return ok(updateApplicationStatus_(body.applicationId, body.reviewStatus, auth));
    if (action === "updateApplicationNotes")  return ok(updateApplicationNotes_(body.applicationId, body.notes, auth));
    if (action === "requestSupportingDocuments") return ok(requestSupportingDocuments_(body.recordId, body.origin || "", auth));
    if (action === "resendSupportingDocumentsEmail") return ok(resendSupportingDocumentsEmail_(body.recordId, auth));
    if (action === "generateDraftScreeningReport") return ok(generateDraftScreeningReport_(body.recordId, auth));
    if (action === "updateApplicationRetentionStatus") return ok(updateApplicationRetentionStatus_(body.recordId, body.retentionStatus, body.notes, auth));
    if (action === "cleanupExpiredApplicationsPreview") return ok(cleanupExpiredApplicationsPreview_(auth));
    if (action === "deleteExpiredApplicantSensitiveFiles") return ok(deleteExpiredApplicantSensitiveFiles_(body.recordId, auth));
    if (action === "validateUploadToken") return ok(validateUploadToken_(body.listingId, body.recordId, body.token));
    if (action === "uploadSupportingDocument") return ok(uploadSupportingDocument_(body));
    if (action === "updateDocumentUploadStatus") return ok(updateDocumentUploadStatus_(body.recordId));
    if (action === "approveContactRequest")   return ok(approveContactRequest_(body, auth));
    if (action === "updateContactRequestNotes") return ok(updateContactRequestNotes_(body.rowNumber, body.notes, auth));
    if (action === "validateAccessCode")      return ok(validateAccessCode_(body.email, body.accessCode));
    if (action === "validateAdminAccessCode") return ok(validateAdminAccessCode_(body.code));
    if (action === "updateAdminAccessCode")   return ok(updateAdminAccessCode_(body, auth));
    if (action === "getAdminSettings")        return ok(getAdminSettings_(auth));
    return err("Unknown POST action: " + action);
  } catch (ex) {
    return err(ex.message);
  }
}

// ── Response helpers ──────────────────────────────────────────────────────────

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────

function getSheet_(name) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(
    "Sheet not found: \"" + name + "\". Please create it manually in the spreadsheet."
  );
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  // Only writes headers when the sheet is completely empty — never overwrites.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight("bold")
         .setBackground("#E8F0FE");
  }
}

// Build a {headerName: columnIndex} map from the sheet's first row.
// Used so all reads/writes are resilient to column order changes.
function getHeaderMap_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) return {};
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim();
    if (h) map[h] = i;
  }
  return map;
}

// Safe cell reader: returns "" when the header doesn't exist in this sheet.
function colVal_(row, headerMap, name) {
  var idx = headerMap[name];
  return (idx !== undefined && idx < row.length) ? (row[idx] || "") : "";
}

function firstHeaderMatch_(headerMap, names) {
  for (var i = 0; i < names.length; i++) {
    if (headerMap[names[i]] !== undefined) return names[i];
  }
  return "";
}

function normalizeCellText_(value) {
  if (value === null || value === undefined) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value).trim();
}

function normalizeBriefDateValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value;
  }

  var text = normalizeCellText_(value);
  if (!text) return null;

  var match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

function getBriefSheet_() {
  var ss = getBriefSpreadsheet_();
  var sheet = ss.getSheetByName(DAILY_MARKET_BRIEF_SHEET);
  if (!sheet) {
    throw new Error('Sheet not found: "' + DAILY_MARKET_BRIEF_SHEET + '".');
  }
  return sheet;
}

function getBriefSpreadsheet_() {
  return SpreadsheetApp.openById(DAILY_MARKET_BRIEF_SPREADSHEET_ID);
}

function getDailyMarketBrief_() {
  var sheet = getBriefSheet_();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) {
    throw new Error("No Daily Market Brief records found.");
  }

  var headerMap = getHeaderMap_(sheet);
  var statusHeader = firstHeaderMatch_(headerMap, ["Status", "Publish Status", "Record Status"]);
  if (!statusHeader) {
    throw new Error('Daily Market Brief sheet is missing a status column. Expected one of: Status, Publish Status, Record Status.');
  }

  var dateHeader = firstHeaderMatch_(headerMap, ["Date", "Published Date", "Publish Date", "Created Date"]);
  if (!dateHeader) {
    throw new Error('Daily Market Brief sheet is missing a date column. Expected one of: Date, Published Date, Publish Date, Created Date.');
  }

  var requiredHeaders = [
    "Title",
    "Policy Summary",
    "BC Rental Summary",
    "BC Sale Summary",
    "Nanaimo Rental Summary",
    "Nanaimo Sale Summary",
    "Landlord Action Notes",
    "Website Summary",
    "WeChat Share Text",
  ];

  for (var i = 0; i < requiredHeaders.length; i++) {
    if (headerMap[requiredHeaders[i]] === undefined) {
      throw new Error('Daily Market Brief sheet is missing required column: "' + requiredHeaders[i] + '".');
    }
  }

  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var displayValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var latest = null;

  for (var rowIndex = 0; rowIndex < values.length; rowIndex++) {
    var row = values[rowIndex];
    var displayRow = displayValues[rowIndex];
    var statusValue = normalizeCellText_(colVal_(row, headerMap, statusHeader)).toLowerCase();
    if (statusValue !== "published") continue;

    // Read the visible sheet date text to avoid timezone shifts on date-only cells.
    var dateValue = normalizeBriefDateValue_(colVal_(displayRow, headerMap, dateHeader));
    if (!dateValue) continue;

    if (!latest || dateValue.getTime() > latest.dateValue.getTime()) {
      latest = {
        row: row,
        displayRow: displayRow,
        dateValue: dateValue,
      };
    }
  }

  if (!latest) {
    throw new Error('No Published record found in "' + DAILY_MARKET_BRIEF_SHEET + '".');
  }

  var latestRow = latest.row;
  var latestDisplayRow = latest.displayRow || latest.row;

  return {
    date: normalizeCellText_(colVal_(latestDisplayRow, headerMap, dateHeader)) ||
      Utilities.formatDate(latest.dateValue, Session.getScriptTimeZone(), "yyyy-MM-dd"),
    title: normalizeCellText_(colVal_(latestRow, headerMap, "Title")),
    policySummary: normalizeCellText_(colVal_(latestRow, headerMap, "Policy Summary")),
    bcRentalSummary: normalizeCellText_(colVal_(latestRow, headerMap, "BC Rental Summary")),
    bcSaleSummary: normalizeCellText_(colVal_(latestRow, headerMap, "BC Sale Summary")),
    nanaimoRentalSummary: normalizeCellText_(colVal_(latestRow, headerMap, "Nanaimo Rental Summary")),
    nanaimoSaleSummary: normalizeCellText_(colVal_(latestRow, headerMap, "Nanaimo Sale Summary")),
    landlordActionNotes: normalizeCellText_(colVal_(latestRow, headerMap, "Landlord Action Notes")),
    websiteSummary: normalizeCellText_(colVal_(latestRow, headerMap, "Website Summary")),
    wechatShareText: normalizeCellText_(colVal_(latestRow, headerMap, "WeChat Share Text")),
    fullReportPath: "/reports/daily-market-brief",
    websiteReports: getPublishedWebsiteReports_(),
  };
}

function getPublishedWebsiteReports_() {
  var ss = getBriefSpreadsheet_();
  var sheet = ss.getSheetByName(WEBSITE_REPORTS_SHEET);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];

  var headerMap = getHeaderMap_(sheet);
  var requiredHeaders = [
    "Report_ID",
    "Date",
    "Category",
    "Title_EN",
    "Title_CN",
    "Description_EN",
    "Description_CN",
    "Report_URL",
    "Status",
    "Sort_Order",
  ];
  for (var i = 0; i < requiredHeaders.length; i++) {
    if (headerMap[requiredHeaders[i]] === undefined) {
      throw new Error('Website Reports sheet is missing required column: "' + requiredHeaders[i] + '".');
    }
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var displayRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var reports = [];

  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var row = rows[rowIndex];
    var displayRow = displayRows[rowIndex];
    var status = normalizeCellText_(colVal_(row, headerMap, "Status")).toLowerCase();
    if (status !== "published") continue;

    var reportUrl = normalizeCellText_(colVal_(row, headerMap, "Report_URL"));
    if (!reportUrl) continue;

    var sortText = normalizeCellText_(colVal_(row, headerMap, "Sort_Order"));
    var sortOrder = sortText === "" ? null : Number(sortText);
    if (sortOrder !== null && isNaN(sortOrder)) sortOrder = null;

    var dateText = normalizeCellText_(colVal_(displayRow, headerMap, "Date"));
    var dateValue = normalizeBriefDateValue_(dateText);

    reports.push({
      reportId: normalizeCellText_(colVal_(row, headerMap, "Report_ID")),
      date: dateText,
      category: normalizeCellText_(colVal_(row, headerMap, "Category")),
      titleEn: normalizeCellText_(colVal_(row, headerMap, "Title_EN")),
      titleCn: normalizeCellText_(colVal_(row, headerMap, "Title_CN")),
      descriptionEn: normalizeCellText_(colVal_(row, headerMap, "Description_EN")),
      descriptionCn: normalizeCellText_(colVal_(row, headerMap, "Description_CN")),
      reportUrl: reportUrl,
      sortOrder: sortOrder,
      dateTime: dateValue ? dateValue.getTime() : 0,
    });
  }

  reports.sort(function(a, b) {
    if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
    if (a.sortOrder !== null) return -1;
    if (b.sortOrder !== null) return 1;
    return b.dateTime - a.dateTime;
  });

  return reports.map(function(report) {
    return {
      reportId: report.reportId,
      date: report.date,
      category: report.category,
      titleEn: report.titleEn,
      titleCn: report.titleCn,
      descriptionEn: report.descriptionEn,
      descriptionCn: report.descriptionCn,
      reportPath: "/reports/" + encodeURIComponent(report.reportId),
      sortOrder: report.sortOrder,
    };
  });
}

function getWebsiteReport_(reportId) {
  reportId = normalizeCellText_(reportId);
  if (!reportId) throw new Error("Missing reportId.");

  var report = findPublishedWebsiteReport_(reportId);
  if (!report) throw new Error("Published report not found: " + reportId);

  var docId = extractGoogleDocId_(report.reportUrl);
  if (!docId) throw new Error("Report URL is not a supported Google Doc URL.");

  var bodyText = DocumentApp.openById(docId).getBody().getText();
  var lines = normalizeReportBodyText_(bodyText);

  return {
    reportId: report.reportId,
    date: report.date,
    category: report.category,
    titleEn: report.titleEn,
    titleCn: report.titleCn,
    descriptionEn: report.descriptionEn,
    descriptionCn: report.descriptionCn,
    lines: lines,
  };
}

function findPublishedWebsiteReport_(reportId) {
  var ss = getBriefSpreadsheet_();
  var sheet = ss.getSheetByName(WEBSITE_REPORTS_SHEET);
  if (!sheet) return null;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return null;

  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var displayRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var displayRow = displayRows[i];
    var rowReportId = normalizeCellText_(colVal_(row, headerMap, "Report_ID"));
    var status = normalizeCellText_(colVal_(row, headerMap, "Status")).toLowerCase();
    if (rowReportId !== reportId || status !== "published") continue;

    return {
      reportId: rowReportId,
      date: normalizeCellText_(colVal_(displayRow, headerMap, "Date")),
      category: normalizeCellText_(colVal_(row, headerMap, "Category")),
      titleEn: normalizeCellText_(colVal_(row, headerMap, "Title_EN")),
      titleCn: normalizeCellText_(colVal_(row, headerMap, "Title_CN")),
      descriptionEn: normalizeCellText_(colVal_(row, headerMap, "Description_EN")),
      descriptionCn: normalizeCellText_(colVal_(row, headerMap, "Description_CN")),
      reportUrl: normalizeCellText_(colVal_(row, headerMap, "Report_URL")),
    };
  }

  return null;
}

function extractGoogleDocId_(url) {
  var text = normalizeCellText_(url);
  var match = text.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

function normalizeReportBodyText_(text) {
  var rawLines = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "\n")
    .split("\n");
  var lines = [];

  for (var i = 0; i < rawLines.length; i++) {
    var line = rawLines[i].replace(/\t/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (line === "第 页") continue;
    lines.push(line);
  }

  return lines;
}

function getBriefConfigValue_(key) {
  var ss = getBriefSpreadsheet_();
  var sheet = ss.getSheetByName(DAILY_MARKET_BRIEF_CONFIG_SHEET);
  if (!sheet) return "";
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return "";
  var rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (normalizeCellText_(rows[i][0]) === key) {
      return normalizeCellText_(rows[i][1]);
    }
  }
  return "";
}

function getBriefSyncLogSheet_() {
  var ss = getBriefSpreadsheet_();
  var sheet = ss.getSheetByName(DAILY_MARKET_BRIEF_SYNC_LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DAILY_MARKET_BRIEF_SYNC_LOG_SHEET);
  }
  ensureHeaders_(sheet, ["Run Time", "Source", "Action", "Status", "Notes", "Updated By"]);
  return sheet;
}

function logBriefSync_(source, action, status, notes, updatedBy) {
  var sheet = getBriefSyncLogSheet_();
  var tz = Session.getScriptTimeZone();
  sheet.appendRow([
    Utilities.formatDate(new Date(), tz, "yyyy-MM-dd hh:mm a z"),
    source || "",
    action || "",
    status || "",
    notes || "",
    updatedBy || "",
  ]);
}

function getBriefSourceFolderId_() {
  var folderId = getBriefConfigValue_("SOURCE_DOC_FOLDER_ID");
  if (!folderId) {
    throw new Error('Missing SOURCE_DOC_FOLDER_ID in "' + DAILY_MARKET_BRIEF_CONFIG_SHEET + '".');
  }
  return folderId;
}

function isSupportedBriefSourceFile_(file) {
  var mimeType = file.getMimeType();
  if (mimeType === MimeType.GOOGLE_DOCS) return true;
  if (mimeType === MimeType.PLAIN_TEXT) return true;
  if (mimeType === "text/markdown") return true;
  if (mimeType === "text/x-markdown") return true;
  var name = file.getName().toLowerCase();
  return /\.md$/i.test(name) || /\.txt$/i.test(name);
}

function getLatestBriefSourceFile_() {
  var rootFolder = DriveApp.getFolderById(getBriefSourceFolderId_());
  var latest = scanBriefFolderForLatestFile_(rootFolder, null);
  if (!latest || !latest.file) {
    throw new Error("No supported Daily Market Brief source file found in configured Drive folder.");
  }
  return latest.file;
}

function scanBriefFolderForLatestFile_(folder, latest) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (!isSupportedBriefSourceFile_(file)) continue;
    var fileDate = getBriefSourceDateForFile_(file);
    if (!latest || fileDate.getTime() > latest.date.getTime()) {
      latest = { file: file, date: fileDate };
    }
  }

  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    latest = scanBriefFolderForLatestFile_(subfolders.next(), latest);
  }
  return latest;
}

function getBriefSourceDateForFile_(file) {
  var fromName = parseBriefDateFromText_(file.getName());
  if (fromName) return fromName;
  return file.getLastUpdated();
}

function parseBriefSourceText_(file) {
  if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
    return DocumentApp.openById(file.getId()).getBody().getText();
  }
  var blob = file.getBlob();
  return blob.getDataAsString("UTF-8");
}

function parseBriefDateFromText_(text) {
  var value = normalizeCellText_(text);
  if (!value) return null;

  var compact = value.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compact) {
    return new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3]));
  }

  var dashed = value.match(/(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (dashed) {
    return new Date(Number(dashed[1]), Number(dashed[2]) - 1, Number(dashed[3]));
  }

  var chineseDate = value.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (chineseDate) {
    return new Date(Number(chineseDate[1]), Number(chineseDate[2]) - 1, Number(chineseDate[3]));
  }

  return null;
}

function extractBriefSection_(text, startMarkers, endMarkers) {
  var start = -1;
  var i;
  for (i = 0; i < startMarkers.length; i++) {
    var idx = text.indexOf(startMarkers[i]);
    if (idx >= 0 && (start < 0 || idx < start)) start = idx;
  }
  if (start < 0) return "";

  var end = text.length;
  for (i = 0; i < endMarkers.length; i++) {
    var endIdx = text.indexOf(endMarkers[i], start + 1);
    if (endIdx >= 0 && endIdx < end) end = endIdx;
  }
  return text.slice(start, end).trim();
}

function escapeRegex_(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineMatchesAnyPattern_(line, patterns) {
  if (!line || !patterns || !patterns.length) return false;
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i].test(line)) return true;
  }
  return false;
}

function isMajorHeadingLine_(line) {
  if (!line) return false;
  if (/^\s*#{1,6}\s+/.test(line)) return true;
  if (/^\s*\d+[\.\)]\s+/.test(line)) return true;
  if (/^\s*(section|part|chapter)\b/i.test(line)) return true;
  return false;
}

function extractBriefSectionByPatterns_(text, startPatterns, endPatterns) {
  if (!text) return "";

  var lines = text.replace(/\r/g, "\n").split("\n");
  var startIndex = -1;
  var i;

  for (i = 0; i < lines.length; i++) {
    var line = normalizeCellText_(lines[i]);
    if (!line) continue;
    if (!isMajorHeadingLine_(line)) continue;
    if (lineMatchesAnyPattern_(line, startPatterns)) {
      startIndex = i;
      break;
    }
  }

  if (startIndex < 0) return "";

  var endIndex = lines.length;
  for (i = startIndex + 1; i < lines.length; i++) {
    var candidate = normalizeCellText_(lines[i]);
    if (!candidate) continue;
    if (!isMajorHeadingLine_(candidate)) continue;
    if (lineMatchesAnyPattern_(candidate, endPatterns)) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join("\n").trim();
}

function extractBriefSectionSmart_(text, startMarkers, endMarkers, startPatterns, endPatterns) {
  var exact = extractBriefSection_(text, startMarkers || [], endMarkers || []);
  if (exact) return exact;
  return extractBriefSectionByPatterns_(text, startPatterns || [], endPatterns || []);
}

function cleanBriefSection_(section) {
  if (!section) return "";
  return section
    .replace(/\r/g, "\n")
    .replace(/^#{1,6}\s.*$/gm, "")
    .replace(/^\*{2}([^*]+)\*{2}$/gm, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sectionLines_(section) {
  var cleaned = cleanBriefSection_(section);
  if (!cleaned) return [];
  var rawLines = cleaned.split("\n");
  var lines = [];
  for (var i = 0; i < rawLines.length; i++) {
    var line = rawLines[i]
      .replace(/^\s*[-*]\s*/, "")
      .replace(/^\s*\d+\.\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    if (!line) continue;
    if (/^(中文版|CHINESE VERSION|ENGLISH VERSION|英文版)$/i.test(line)) continue;
    if (/^(政策与利率更新|BC租赁市场概览|BC房屋销售市场概览|纳奈莫本地市场|房东与投资者行动建议|微信分享版本)$/i.test(line)) continue;
    if (/^(POLICY & INTEREST RATE UPDATE|BC RENTAL MARKET OVERVIEW|BC HOME SALE MARKET OVERVIEW|NANAIMO LOCAL MARKET|LANDLORD & INVESTOR ACTION NOTES|WECHAT SHARE VERSION)$/i.test(line)) continue;
    if (/^Data Sources/i.test(line)) break;
    if (/^Report Generated/i.test(line)) break;
    if (/^Next Update/i.test(line)) break;
    lines.push(line);
  }
  return lines;
}

function summaryFromSection_(section, maxLines) {
  var lines = sectionLines_(section);
  return lines.slice(0, maxLines || 2).join(" ");
}

function summaryFromSectionSentence_(section) {
  var summary = summaryFromSection_(section, 1);
  if (!summary) return "";
  var match = summary.match(/^(.+?[。！？.!?])(?:\s|$)/);
  return match ? match[1].trim() : summary;
}

function formatBriefActionNotes_(section) {
  var lines = sectionLines_(section);
  var formatted = [];
  for (var i = 0; i < lines.length; i++) {
    formatted.push((i + 1) + ". " + lines[i]);
  }
  return formatted.join("\n");
}

function formatWechatShareText_(section) {
  var lines = sectionLines_(section);
  return lines.join("\n");
}

function buildWebsiteSummary_(englishRental, englishSale, englishNanaimoRental, englishActions) {
  var parts = [];
  var rentalLead = summaryFromSectionSentence_(englishRental);
  var saleLead = summaryFromSectionSentence_(englishSale);
  var nanaimoLead = summaryFromSectionSentence_(englishNanaimoRental);
  var actionLead = sectionLines_(englishActions)[0] || "";

  if (rentalLead) parts.push(rentalLead);
  if (saleLead) parts.push(saleLead);
  if (nanaimoLead) parts.push(nanaimoLead);
  if (actionLead) parts.push("Focus now: " + actionLead.replace(/\.$/, "") + ".");

  return parts.join(" ");
}

function extractMortgageNotes_(englishPolicySection) {
  var lines = sectionLines_(englishPolicySection);
  var picked = [];
  for (var i = 0; i < lines.length; i++) {
    if (/rate|mortgage|CMHC|amortization|insured/i.test(lines[i])) {
      picked.push(lines[i]);
    }
    if (picked.length >= 3) break;
  }
  return picked.join(" ");
}

function extractMarketDataNotes_(englishRentalSection, englishSaleSection, englishNanaimoRentalSection) {
  var parts = [];
  var rentalLead = summaryFromSectionSentence_(englishRentalSection);
  var saleLead = summaryFromSectionSentence_(englishSaleSection);
  var nanaimoLead = summaryFromSectionSentence_(englishNanaimoRentalSection);
  if (rentalLead) parts.push(rentalLead);
  if (saleLead) parts.push(saleLead);
  if (nanaimoLead) parts.push(nanaimoLead);
  return parts.join(" ");
}

function buildFallbackSummaryFromText_(text, keywords, maxLines) {
  if (!text) return "";
  var lines = sectionLines_(text);
  if (!lines.length) return "";

  var picked = [];
  for (var i = 0; i < lines.length; i++) {
    if (keywords && keywords.length) {
      var matched = false;
      for (var j = 0; j < keywords.length; j++) {
        if (keywords[j].test(lines[i])) {
          matched = true;
          break;
        }
      }
      if (!matched) continue;
    }
    picked.push(lines[i]);
    if (picked.length >= (maxLines || 2)) break;
  }

  if (!picked.length) {
    picked = lines.slice(0, maxLines || 2);
  }
  return picked.join(" ");
}

function parseDailyMarketBriefRecord_(file) {
  var text = parseBriefSourceText_(file);
  if (!normalizeCellText_(text)) {
    throw new Error("Latest report file is empty.");
  }

  var titleMatch = text.match(/^#\s+(.+)$/m);
  var title = titleMatch ? normalizeCellText_(titleMatch[1]) : normalizeCellText_(file.getName());

  var dateValue = parseBriefDateFromText_(file.getName()) ||
    parseBriefDateFromText_(title) ||
    parseBriefDateFromText_(text) ||
    file.getLastUpdated();
  var dateText = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "yyyy-MM-dd");

  var zhPolicy = extractBriefSectionSmart_(
    text,
    ["## 1. 政策与利率更新", "1. 政策与利率更新"],
    ["## 2. BC租赁市场概览", "2. BC租赁市场概览"],
    [/政策/i, /利率/i, /央行/i],
    [/BC.*租赁/i, /租赁市场/i]
  );
  var zhRental = extractBriefSectionSmart_(
    text,
    ["## 2. BC租赁市场概览", "2. BC租赁市场概览"],
    ["## 3. BC房屋销售市场概览", "3. BC房屋销售市场概览"],
    [/BC.*租赁/i, /租赁市场/i],
    [/房屋销售/i, /买卖市场/i, /销售市场/i]
  );
  var zhSale = extractBriefSectionSmart_(
    text,
    ["## 3. BC房屋销售市场概览", "3. BC房屋销售市场概览"],
    ["## 4. 纳奈莫本地市场", "4. 纳奈莫本地市场"],
    [/房屋销售/i, /买卖市场/i, /销售市场/i],
    [/纳奈莫/i, /nanaimo/i]
  );
  var zhNanaimo = extractBriefSectionSmart_(
    text,
    ["## 4. 纳奈莫本地市场", "4. 纳奈莫本地市场"],
    ["## 5. 房东与投资者行动建议", "5. 房东与投资者行动建议"],
    [/纳奈莫/i, /nanaimo/i],
    [/行动建议/i, /房东/i, /投资者/i]
  );
  var zhActions = extractBriefSectionSmart_(
    text,
    ["## 5. 房东与投资者行动建议", "5. 房东与投资者行动建议"],
    ["## 6. 微信分享版本", "6. 微信分享版本"],
    [/行动建议/i, /房东/i, /投资者/i],
    [/微信/i, /wechat/i, /分享/i]
  );
  var zhWechat = extractBriefSectionSmart_(
    text,
    ["## 6. 微信分享版本", "6. 微信分享版本"],
    ["# ENGLISH VERSION", "ENGLISH VERSION 英文版"],
    [/微信/i, /wechat/i, /分享/i],
    [/english version/i, /英文版/i]
  );

  var zhNanaimoRental = extractBriefSectionSmart_(
    zhNanaimo,
    ["### 租赁市场——本地强势表现", "### 租赁市场", "租赁市场——本地强势表现"],
    ["### 房屋销售", "房屋销售"],
    [/租赁市场/i, /租金/i, /空置率/i],
    [/房屋销售/i, /买卖/i]
  );
  var zhNanaimoSale = extractBriefSectionSmart_(
    zhNanaimo,
    ["### 房屋销售", "房屋销售"],
    ["### 房东机会", "房东机会"],
    [/房屋销售/i, /买卖/i],
    [/房东机会/i, /行动/i]
  );

  var enPolicy = extractBriefSectionSmart_(
    text,
    ["## 1. POLICY & INTEREST RATE UPDATE", "1. POLICY & INTEREST RATE UPDATE"],
    ["## 2. BC RENTAL MARKET OVERVIEW", "2. BC RENTAL MARKET OVERVIEW"],
    [/policy/i, /interest rate/i, /bank of canada/i, /mortgage/i],
    [/bc.*rental/i, /rental market/i]
  );
  var enRental = extractBriefSectionSmart_(
    text,
    ["## 2. BC RENTAL MARKET OVERVIEW", "2. BC RENTAL MARKET OVERVIEW"],
    ["## 3. BC HOME SALE MARKET OVERVIEW", "2. BC HOME SALE MARKET OVERVIEW"],
    [/bc.*rental/i, /rental market/i],
    [/home sale/i, /\bsales?\b/i, /housing market/i]
  );
  var enSale = extractBriefSectionSmart_(
    text,
    ["## 3. BC HOME SALE MARKET OVERVIEW", "3. BC HOME SALE MARKET OVERVIEW"],
    ["## 4. NANAIMO LOCAL MARKET", "4. NANAIMO LOCAL MARKET"],
    [/home sale/i, /\bsales?\b/i, /housing market/i],
    [/nanaimo/i]
  );
  var enNanaimo = extractBriefSectionSmart_(
    text,
    ["## 4. NANAIMO LOCAL MARKET", "4. NANAIMO LOCAL MARKET"],
    ["## 5. LANDLORD & INVESTOR ACTION NOTES", "5. LANDLORD & INVESTOR ACTION NOTES"],
    [/nanaimo/i],
    [/landlord/i, /investor/i, /action/i]
  );
  var enActions = extractBriefSectionSmart_(
    text,
    ["## 5. LANDLORD & INVESTOR ACTION NOTES", "5. LANDLORD & INVESTOR ACTION NOTES"],
    ["## 6. WECHAT SHARE VERSION", "6. WECHAT SHARE VERSION"],
    [/landlord/i, /investor/i, /action/i, /next steps/i],
    [/wechat/i, /share version/i]
  );
  var enWechat = extractBriefSectionSmart_(
    text,
    ["## 6. WECHAT SHARE VERSION", "6. WECHAT SHARE VERSION"],
    ["Data Sources", "Report Generated", "Next Update"],
    [/wechat/i, /share version/i],
    [/data sources/i, /report generated/i, /next update/i]
  );
  var enNanaimoRental = extractBriefSectionSmart_(
    enNanaimo,
    ["### Rental Market—Local Outperformance", "### Rental Market", "Rental Market—Local Outperformance"],
    ["### Rental Supply", "### Home Sales", "Home Sales"],
    [/rental market/i, /rent/i, /vacancy/i],
    [/home sales/i, /sales/i]
  );
  var enNanaimoSale = extractBriefSectionSmart_(
    enNanaimo,
    ["### Home Sales", "Home Sales"],
    ["### Landlord Opportunity", "Landlord Opportunity"],
    [/home sales/i, /\bsales?\b/i],
    [/landlord opportunity/i, /opportunity/i]
  );

  var policySummary = summaryFromSection_(zhPolicy || enPolicy, 3) ||
    buildFallbackSummaryFromText_(text, [/政策|利率|央行|policy|rate|mortgage|bank of canada/i], 3);
  var bcRentalSummary = summaryFromSection_(zhRental || enRental, 3) ||
    buildFallbackSummaryFromText_(text, [/bc.*租赁|租赁市场|rent|rental|vacancy/i], 3);
  var bcSaleSummary = summaryFromSection_(zhSale || enSale, 3) ||
    buildFallbackSummaryFromText_(text, [/销售|买卖|sale|sales|benchmark|inventory/i], 3);
  var nanaimoRentalSummary = summaryFromSection_(zhNanaimoRental || zhNanaimo || enNanaimoRental || enNanaimo, 3) ||
    buildFallbackSummaryFromText_(text, [/纳奈莫|nanaimo|rent|rental|vacancy/i], 3);
  var nanaimoSaleSummary = summaryFromSection_(zhNanaimoSale || enNanaimoSale || zhNanaimo || enNanaimo, 2) ||
    buildFallbackSummaryFromText_(text, [/纳奈莫|nanaimo|sale|sales|inventory|price/i], 2);
  var landlordActionNotes = formatBriefActionNotes_(zhActions || enActions) ||
    buildFallbackSummaryFromText_(text, [/建议|行动|策略|landlord|investor|action|focus/i], 4);
  var wechatShareText = formatWechatShareText_(zhWechat || enWechat) ||
    buildFallbackSummaryFromText_(text, [/微信|wechat|share/i], 5) ||
    buildFallbackSummaryFromText_(text, [], 5);
  var websiteSummary = buildWebsiteSummary_(enRental || zhRental, enSale || zhSale, enNanaimoRental || zhNanaimoRental || zhNanaimo, enActions || zhActions) ||
    buildFallbackSummaryFromText_(text, [], 4);

  return {
    title: title,
    dateText: dateText,
    dateValue: dateValue,
    briefType: "BC Rent & Sale Intelligence Brief",
    language: getBriefConfigValue_("DEFAULT_LANGUAGE") || "CN_EN",
    sourceDocLink: "https://drive.google.com/file/d/" + file.getId() + "/view",
    policySummary: policySummary,
    bcRentalSummary: bcRentalSummary,
    bcSaleSummary: bcSaleSummary,
    nanaimoRentalSummary: nanaimoRentalSummary,
    nanaimoSaleSummary: nanaimoSaleSummary,
    mortgageNotes: extractMortgageNotes_(enPolicy),
    marketDataNotes: extractMarketDataNotes_(enRental, enSale, enNanaimoRental),
    landlordActionNotes: landlordActionNotes,
    wechatShareText: wechatShareText,
    websiteSummary: websiteSummary,
    fullContent: normalizeCellText_(text),
    status: "Published",
    sourceFileId: file.getId(),
    sourceFileName: file.getName(),
  };
}

function generateBriefId_(sheet, headerMap, dateText) {
  var lastRow = sheet.getLastRow();
  var next = 1;
  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < values.length; i++) {
      var rowDate = normalizeCellText_(colVal_(values[i], headerMap, "Date"));
      if (rowDate !== dateText) continue;
      next += 1;
    }
  }
  var suffix = ("000" + next).slice(-3);
  return "BRIEF-" + dateText + "-" + suffix;
}

function findExistingBriefRow_(sheet, headerMap, record) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var sourceLink = normalizeCellText_(colVal_(row, headerMap, "Source Doc Link"));
    var rowDate = normalizeCellText_(colVal_(row, headerMap, "Date"));
    if (sourceLink && sourceLink === record.sourceDocLink) return i + 2;
    if (rowDate === record.dateText && normalizeCellText_(colVal_(row, headerMap, "Title")) === record.title) return i + 2;
  }
  return 0;
}

function upsertDailyMarketBriefRecord_(record, updatedBy) {
  var sheet = getBriefSheet_();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headerMap = getHeaderMap_(sheet);
  var rowNumber = findExistingBriefRow_(sheet, headerMap, record);
  var tz = Session.getScriptTimeZone();
  var nowText = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd hh:mm a z");
  var briefId = rowNumber
    ? normalizeCellText_(sheet.getRange(rowNumber, headerMap["Brief ID"] + 1).getValue())
    : generateBriefId_(sheet, headerMap, record.dateText);

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var header = normalizeCellText_(headers[i]);
    if (header === "Brief ID") row.push(briefId);
    else if (header === "Date") row.push(record.dateText);
    else if (header === "Brief Type") row.push(record.briefType);
    else if (header === "Language") row.push(record.language);
    else if (header === "Title") row.push(record.title);
    else if (header === "Source Doc Link") row.push(record.sourceDocLink);
    else if (header === "Policy Summary") row.push(record.policySummary);
    else if (header === "BC Rental Summary") row.push(record.bcRentalSummary);
    else if (header === "BC Sale Summary") row.push(record.bcSaleSummary);
    else if (header === "Nanaimo Rental Summary") row.push(record.nanaimoRentalSummary);
    else if (header === "Nanaimo Sale Summary") row.push(record.nanaimoSaleSummary);
    else if (header === "Mortgage / Interest Notes") row.push(record.mortgageNotes);
    else if (header === "Market Data Notes") row.push(record.marketDataNotes);
    else if (header === "Landlord Action Notes") row.push(record.landlordActionNotes);
    else if (header === "WeChat Share Text") row.push(record.wechatShareText);
    else if (header === "Website Summary") row.push(record.websiteSummary);
    else if (header === "Full Content") row.push(record.fullContent);
    else if (header === "Status") row.push(record.status);
    else if (header === "Created At") row.push(rowNumber ? sheet.getRange(rowNumber, i + 1).getValue() : nowText);
    else if (header === "Updated At") row.push(nowText);
    else row.push(rowNumber ? sheet.getRange(rowNumber, i + 1).getValue() : "");
  }

  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  } else {
    rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  }

  logBriefSync_(
    record.sourceFileName,
    "syncDailyMarketBrief",
    rowNumber ? "SUCCESS" : "SUCCESS",
    "Upserted row " + rowNumber + " for " + record.dateText,
    updatedBy || "Apps Script"
  );

  return {
    rowNumber: rowNumber,
    briefId: briefId,
    date: record.dateText,
    title: record.title,
    sourceFileId: record.sourceFileId,
    sourceFileName: record.sourceFileName,
  };
}

function syncDailyMarketBriefFromLatestReport_() {
  var file = getLatestBriefSourceFile_();
  var record = parseDailyMarketBriefRecord_(file);
  return upsertDailyMarketBriefRecord_(record, "Apps Script auto sync");
}

function syncDailyMarketBriefFromLatestReport() {
  try {
    return syncDailyMarketBriefFromLatestReport_();
  } catch (ex) {
    logBriefSync_("Daily Market Brief", "syncDailyMarketBrief", "ERROR", ex.message, "Apps Script");
    throw ex;
  }
}

function installDailyMarketBriefAutoSync() {
  removeDailyMarketBriefAutoSync();
  ScriptApp.newTrigger(DAILY_MARKET_BRIEF_SYNC_HANDLER)
    .timeBased()
    .everyHours(1)
    .create();
  logBriefSync_("Daily Market Brief", "installTrigger", "SUCCESS", "Installed hourly auto sync trigger.", "Apps Script");
  return { installed: true, handler: DAILY_MARKET_BRIEF_SYNC_HANDLER, interval: "hourly" };
}

function removeDailyMarketBriefAutoSync() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === DAILY_MARKET_BRIEF_SYNC_HANDLER) {
      ScriptApp.deleteTrigger(triggers[i]);
      removed += 1;
    }
  }
  if (removed) {
    logBriefSync_("Daily Market Brief", "removeTrigger", "SUCCESS", "Removed " + removed + " trigger(s).", "Apps Script");
  }
  return { removed: removed };
}

// ── System Settings helpers ───────────────────────────────────────────────────

function getSystemSetting_(key) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SYSTEM_SETTINGS_SHEET);
    if (!sheet) return null;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    var rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === key) {
        var val = String(rows[i][1] || "").trim();
        return val || null;
      }
    }
    return null;
  } catch (_) { return null; }
}

function setSystemSetting_(key, value, updatedBy) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SYSTEM_SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SYSTEM_SETTINGS_SHEET);
    var hdr = sheet.getRange(1, 1, 1, 4);
    hdr.setValues([["Setting Key", "Setting Value", "Updated At", "Updated By"]]);
    hdr.setFontWeight("bold").setBackground("#E8F0FE");
  }
  var lastRow = sheet.getLastRow();
  var now = new Date().toISOString();
  if (lastRow >= 2) {
    var rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === key) {
        sheet.getRange(i + 2, 2, 1, 3).setValues([[value, now, updatedBy || ""]]);
        return;
      }
    }
  }
  sheet.appendRow([key, value, now, updatedBy || ""]);
}

function getAdminAccessCode_() {
  try {
    // 1. Sheet is the authoritative source of truth (set by Admin Settings UI)
    var fromSheet = getSystemSetting_("admin_access_code");
    if (fromSheet) {
      // Keep PropertiesService in sync so updateAdminAccessCode_ cache-busts correctly
      PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", fromSheet);
      return fromSheet;
    }
    // 2. Hardcoded bootstrap value — used until Mabel sets a real code via Admin Settings
    //    Intentionally skip PropertiesService here to avoid stale cached values
    //    from previous deployments overriding the hardcoded bootstrap.
    var bootstrap = ADMIN_ACCESS_CODE || "";
    if (bootstrap) PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", bootstrap);
    return bootstrap;
  } catch (_) {
    return ADMIN_ACCESS_CODE || "";
  }
}

// ── Admin Settings action handlers ───────────────────────────────────────────

function validateAdminAccessCode_(code) {
  var entered = String(code || "").trim();
  if (!entered) return { valid: false };
  return { valid: entered === getAdminAccessCode_() };
}

function updateAdminAccessCode_(body, auth) {
  assertAdmin_(auth);
  var newCode    = String(body.newCode     || "").trim();
  var confirmCode = String(body.confirmCode || "").trim();
  if (newCode.length < 10) throw new Error("New code must be at least 10 characters.");
  if (newCode !== confirmCode) throw new Error("New code and confirm code do not match.");
  setSystemSetting_("admin_access_code", newCode, "admin");
  PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", newCode);
  return { success: true, updatedAt: new Date().toISOString() };
}

function getAdminSettings_(auth) {
  assertAdmin_(auth);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SYSTEM_SETTINGS_SHEET);
    if (!sheet) return { codeMasked: "••••••••", updatedAt: null, updatedBy: null };
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { codeMasked: "••••••••", updatedAt: null, updatedBy: null };
    var rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === "admin_access_code") {
        return {
          codeMasked: "••••••••",
          updatedAt:  rows[i][2] ? new Date(rows[i][2]).toISOString() : null,
          updatedBy:  rows[i][3] || null,
        };
      }
    }
  } catch (_) {}
  return { codeMasked: "••••••••", updatedAt: null, updatedBy: null };
}

function resolveAccessContext_(payload, moduleName, options) {
  payload = payload || {};
  options = options || {};
  var adminAccessCode = String(payload.adminAccessCode || "").trim();
  var expectedAdminCode = getAdminAccessCode_();
  if (options.allowAdmin !== false && adminAccessCode && expectedAdminCode && adminAccessCode === expectedAdminCode) {
    return { mode: "admin", module: moduleName || "" };
  }

  var accessEmail = normalizeEmail_(payload.accessEmail || payload.email || "");
  var accessCode = String(payload.accessCode || "").trim().toUpperCase();
  if (options.allowTrial !== false && accessEmail && accessCode) {
    var validated = validateAccessCode_(accessEmail, accessCode);
    if (!validated.valid) throw new Error(validated.message || "Trial access denied.");
    if (moduleName && !approvedModuleAllows_(validated.approvedModule, moduleName)) {
      throw new Error("Access denied for this module.");
    }
    return {
      mode: "trial",
      module: moduleName || "",
      email: validated.email,
      accessCode: validated.accessCode,
      approvedModule: validated.approvedModule,
      accessExpiresAt: validated.accessExpiresAt,
    };
  }

  if (options.allowNoAccess) {
    return { mode: "public", module: moduleName || "" };
  }

  throw new Error("Access denied. Please sign in with an approved trial access code.");
}

function approvedModuleAllows_(approvedModule, moduleName) {
  var text = String(approvedModule || "").toLowerCase();
  var module = String(moduleName || "").toLowerCase();
  if (text.indexOf("both") >= 0) return true;
  if (module === "rental") return text.indexOf("rental") >= 0;
  if (module === "sale") return text.indexOf("sale") >= 0;
  return false;
}

function assertAdmin_(auth) {
  if (!auth || auth.mode !== "admin") throw new Error("Admin access required.");
}

function tryParse_(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str) || fallback; }
  catch (_) { return fallback; }
}

function extractJointEmploymentParts_(rawValue) {
  var raw = String(rawValue || "").trim();
  if (!raw) return { status: "", source: "" };
  var statusMatch = raw.match(/(?:^|\n)Status:\s*(.*?)(?:\n|$)/);
  var sourceMatch = raw.match(/(?:^|\n)Employer \/ Income Source:\s*(.*?)(?:\n|$)/);
  if (statusMatch || sourceMatch) {
    return {
      status: statusMatch ? String(statusMatch[1] || "").trim() : "",
      source: sourceMatch ? String(sourceMatch[1] || "").trim() : "",
    };
  }
  return { status: raw, source: "" };
}

function extractSupportingDocsChoice_(rawValue, label) {
  var raw = String(rawValue || "").trim();
  if (!raw) return "";
  var marker = label + ":";
  var start = raw.indexOf(marker);
  if (start === -1) return "";
  return raw.substring(start + marker.length).split("|")[0].trim();
}

// Handles both legacy comma-separated strings ("Facebook, WeChat")
// and JSON arrays ('["Facebook","WeChat"]') stored in the Platforms column.
function parsePlatforms_(val) {
  if (!val) return [];
  try {
    var parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return String(val).split(",").map(function(s) { return s.trim(); }).filter(Boolean);
}

// ── Listings ──────────────────────────────────────────────────────────────────

function getListings_(auth) {
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];

  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var data      = sheet.getRange(2, 1, last - 1, numCols).getValues();

  return data
    .map(function(row) { return rowToListing_(row, headerMap); })
    .filter(function(l) { return canAccessListingRecord_(l, auth); })
    .map(function(l) { return sanitizeListingForAccess_(l, auth); })
    .filter(function(l) { return !!l.id; });
}

function getListingById_(listingId, auth) {
  if (!listingId) throw new Error("Missing listingId.");
  var listing = findListingById_(listingId);
  if (!listing) throw new Error("Listing not found: " + listingId);
  if (!canAccessListingRecord_(listing, auth)) {
    throw new Error("Access denied for this listing.");
  }
  return sanitizeListingForAccess_(listing, auth);
}

function findListingById_(listingId) {
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || "").trim() === String(listingId).trim()) {
      var row = sheet.getRange(i + 2, 1, 1, numCols).getValues()[0];
      var listing = rowToListing_(row, headerMap);
      listing._rowNumber = i + 2;
      return listing;
    }
  }
  return null;
}

function findListingByIdForEmail_(listingId, email) {
  var listing = findListingById_(listingId);
  if (!listing) return null;
  return normalizeEmail_(listing.createdByEmail) === normalizeEmail_(email) ? listing : null;
}

function canAccessListingRecord_(listing, auth) {
  if (!listing) return false;
  if (!auth) return true;
  if (auth.mode === "admin") return true;
  if (auth.mode === "public") return listing.status === "Published";
  if (auth.mode === "trial") {
    return normalizeEmail_(listing.createdByEmail) === normalizeEmail_(auth.email);
  }
  return false;
}

function sanitizeListingForAccess_(listing, auth) {
  if (!listing) return null;
  if (!auth || auth.mode === "admin") return listing;

  var safe = {};
  for (var key in listing) {
    if (!Object.prototype.hasOwnProperty.call(listing, key)) continue;
    safe[key] = listing[key];
  }

  // Trial users need driveFolderLink to upload photos to their own listings.
  if (auth.mode !== "trial") delete safe.driveFolderLink;
  delete safe.driveFiles;
  delete safe.enhancedFolderId;
  delete safe.reviewStatus;
  delete safe.complianceFlag;
  delete safe.mediaChecklist;
  delete safe.createdByEmail;
  delete safe.createdByAccessCode;
  delete safe.createdByRole;
  return safe;
}

// Convert a sheet row to a listing object using header-name lookup.
function rowToListing_(row, headerMap) {
  function col(name) { return colVal_(row, headerMap, name); }
  return {
    id:              col("Listing ID"),
    createdDate:     col("Created Date"),
    ownerName:       col("Owner Name"),
    ownerEmail:      col("Owner Email"),
    address:         col("Property Address"),
    city:            col("City"),
    province:        col("Province"),
    bedrooms:        col("Bedrooms"),
    bathrooms:       col("Bathrooms"),
    rent:            col("Rent"),
    available:       col("Available Date"),
    leaseTerm:       col("Lease Term"),
    utilities:       col("Utilities"),
    pets:            col("Pet Policy"),
    parking:         col("Parking"),
    laundry:         col("Laundry"),
    smoking:         col("Smoking Policy"),
    features:        col("Key Features"),
    targetAudience:  col("Target Audience"),
    language:        col("Language"),
    platforms:        parsePlatforms_(col("Platforms")),
    status:           col("Workflow Status") || "Draft", // V — actual sheet column name
    driveFolderLink:  col("Drive Folder Link"),          // W — existing column
    finalPackageLink: col("Final Package Link") || null, // X
    publishedLink:    col("Published Link")    || null,  // Y
    listingStatus:    col("Listing Status") || col("Tenant Listing Status") || col("Public Status") || "",
    tenantListingStatus: col("Tenant Listing Status") || col("Listing Status") || "",
    publicStatus:     col("Public Status") || col("Listing Status") || "",
    openHouseDateTime: col("Open House Date / Time") || "",
    openHouseViewingInstructions: col("Open House Viewing Instructions") || "",
    openHouseParkingNotes: col("Open House Parking Notes") || "",
    outputs:          tryParse_(col("Outputs"),         {}),
    reviewStatus:     tryParse_(col("Review Status"),   {}),
    complianceFlag:   tryParse_(col("Compliance Flag"), {}),
    mediaChecklist:  tryParse_(col("Media Checklist"), [false, false, false, false]),
    driveFiles:      tryParse_(col("Drive Files"),     []),
    enhancedFolderId: col("Enhanced Folder ID") || null,
    videoUrl:         col("videoUrl")           || null,
    publicVideoUrl:   col("publicVideoUrl")     || null,
    coverImageFileId: col("Cover Image File ID") || null,
    createdByEmail:   col("Created By Email")   || "",
    createdByAccessCode: col("Created By Access Code") || "",
    createdByRole:    col("Created By Role")    || "",
  };
}

// Build a {headerName: value} map from a listing object.
function makeDataMap_(d) {
  var m = {};
  m["Listing ID"]        = d.id              || "";
  m["Created Date"]      = d.createdDate     || new Date().toLocaleDateString("en-CA");
  m["Owner Name"]        = d.ownerName       || "";
  m["Owner Email"]       = d.ownerEmail      || "";
  m["Property Address"]  = d.address         || "";
  m["City"]              = d.city            || "";
  m["Province"]          = d.province        || "";
  m["Bedrooms"]          = d.bedrooms        || "";
  m["Bathrooms"]         = d.bathrooms       || "";
  m["Rent"]              = d.rent            || "";
  m["Available Date"]    = d.available       || "";
  m["Lease Term"]        = d.leaseTerm       || "";
  m["Utilities"]         = d.utilities       || "";
  m["Pet Policy"]        = d.pets            || "";
  m["Parking"]           = d.parking         || "";
  m["Laundry"]           = d.laundry         || "";
  m["Smoking Policy"]    = d.smoking         || "";
  m["Key Features"]      = d.features        || "";
  m["Target Audience"]   = d.targetAudience  || "";
  m["Language"]          = d.language        || "";
  m["Platforms"]          = JSON.stringify(d.platforms      || []);
  m["Workflow Status"]    = d.status          || "Draft";   // V — actual column name
  m["Drive Folder Link"]  = d.driveFolderLink || "";        // W — never overwrite with blank
  m["Final Package Link"] = d.finalPackageLink || "";       // X
  m["Published Link"]     = d.publishedLink    || "";       // Y
  m["Listing Status"]     = d.listingStatus || d.tenantListingStatus || d.publicStatus || "";
  m["Open House Date / Time"] = d.openHouseDateTime || "";
  m["Open House Viewing Instructions"] = d.openHouseViewingInstructions || "";
  m["Open House Parking Notes"] = d.openHouseParkingNotes || "";
  m["Outputs"]            = JSON.stringify(d.outputs        || {});
  m["Review Status"]      = JSON.stringify(d.reviewStatus   || {});
  m["Compliance Flag"]    = JSON.stringify(d.complianceFlag || {});
  m["Media Checklist"]      = JSON.stringify(d.mediaChecklist || [false, false, false, false]);
  m["Drive Files"]          = JSON.stringify(d.driveFiles     || []);
  m["Enhanced Folder ID"]   = d.enhancedFolderId || "";
  m["videoUrl"]             = d.videoUrl        || "";
  m["Cover Image File ID"]  = d.coverImageFileId || "";
  m["Created By Email"]     = d.createdByEmail || "";
  m["Created By Access Code"] = d.createdByAccessCode || "";
  m["Created By Role"]      = d.createdByRole || "";
  return m;
}

// Appends any headers from `headers` array that don't already exist in the sheet's row 1.
// Safe to call on sheets that already have data — never removes or reorders existing columns.
function addMissingHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E8F0FE");
    return;
  }
  var existing = getHeaderMap_(sheet);
  var lastCol  = sheet.getLastColumn();
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (existing[h] === undefined) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(h).setFontWeight("bold").setBackground("#E8F0FE");
    }
  }
}

// Targeted write: update only the videoUrl cell for one listing.
// Creates the "videoUrl" column header if it doesn't exist yet.
// Returns sheetName, rowNumber, colName, colIndex so the caller can log them.
function updateVideoUrl_(listingId, videoUrl, auth) {
  if (!listingId) throw new Error("updateVideoUrl: listingId required");
  getListingById_(listingId, auth);
  var sheet = getSheet_(LISTINGS_SHEET);

  Logger.log("[updateVideoUrl] listingId: " + listingId);
  Logger.log("[updateVideoUrl] sheet    : " + LISTINGS_SHEET);

  // Ensure the column header exists (safe on existing sheets).
  addMissingHeaders_(sheet, LISTING_HEADERS);

  var headerMap   = getHeaderMap_(sheet);
  var videoColIdx = headerMap["videoUrl"];
  if (videoColIdx === undefined) throw new Error("videoUrl column still missing after addMissingHeaders_");

  Logger.log("[updateVideoUrl] videoUrl col index (0-based): " + videoColIdx);

  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No listing rows found");

  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === listingId) {
      var rowNumber = i + 2;
      sheet.getRange(rowNumber, videoColIdx + 1).setValue(videoUrl || "");
      SpreadsheetApp.flush();
      Logger.log("[updateVideoUrl] wrote to row " + rowNumber + ", col " + (videoColIdx + 1) + " → " + videoUrl);
      return {
        success:   true,
        id:        listingId,
        videoUrl:  videoUrl,
        sheetName: LISTINGS_SHEET,
        rowNumber: rowNumber,
        colName:   "videoUrl",
        colIndex:  videoColIdx + 1,
      };
    }
  }
  throw new Error("Listing not found in sheet \"" + LISTINGS_SHEET + "\": " + listingId);
}

function saveListing_(data, auth) {
  if (!data || !data.id) throw new Error("Listing data missing id");
  var sheet = getSheet_(LISTINGS_SHEET);
  addMissingHeaders_(sheet, LISTING_HEADERS);

  var headerMap = getHeaderMap_(sheet);
  var dataMap   = makeDataMap_(data);

  var last = sheet.getLastRow();
  var existingRow = -1;

  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === data.id) { existingRow = i + 2; break; }
    }
  }

  if (existingRow > 0) {
    var existingListing = findListingById_(data.id);
    if (!canAccessListingRecord_(existingListing, auth)) {
      throw new Error("Access denied for this listing.");
    }
    // Update only the columns that exist in the header row (safe for partial schemas).
    if (auth && auth.mode === "trial") {
      dataMap["Created By Email"] = auth.email;
      dataMap["Created By Access Code"] = auth.accessCode;
      dataMap["Created By Role"] = "Trial User";
    }
    if (auth && auth.mode === "admin" && !existingListing.createdByRole) {
      dataMap["Created By Role"] = "Admin";
    }
    for (var name in dataMap) {
      var colIdx = headerMap[name];
      if (colIdx !== undefined) {
        // Do not blank out Drive Folder Link if the incoming value is empty.
        if (name === "Drive Folder Link" && !dataMap[name]) continue;
        sheet.getRange(existingRow, colIdx + 1).setValue(dataMap[name]);
      }
    }
  } else {
    // New row: build array sized to the current last column.
    if (auth && auth.mode === "trial") {
      dataMap["Created By Email"] = auth.email;
      dataMap["Created By Access Code"] = auth.accessCode;
      dataMap["Created By Role"] = "Trial User";
    } else if (auth && auth.mode === "admin") {
      dataMap["Created By Role"] = "Admin";
    }
    // Auto-create Drive media folder if one isn't already provided.
    if (!dataMap["Drive Folder Link"]) {
      try {
        dataMap["Drive Folder Link"] = createRentalListingFolder_(data.id, data.address || "");
      } catch (e) {
        Logger.log("[saveListing_] Auto-folder creation failed: " + e.message);
      }
    }
    var numCols = sheet.getLastColumn();
    var row = new Array(numCols).fill("");
    for (var name in dataMap) {
      var colIdx = headerMap[name];
      if (colIdx !== undefined) row[colIdx] = dataMap[name];
    }
    sheet.appendRow(row);
  }

  SpreadsheetApp.flush(); // commit writes before returning response
  return { success: true, id: data.id };
}

function generateListingId_() {
  var sheet = getSheet_(LISTINGS_SHEET);
  addMissingHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  var year = new Date().getFullYear();
  var maxNum = 0;
  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var value = String(ids[i][0] || "").trim();
      var prefix = "LST-" + year + "-";
      if (value.indexOf(prefix) !== 0) continue;
      var num = Number(value.slice(prefix.length));
      if (!isNaN(num)) maxNum = Math.max(maxNum, num);
    }
  }
  return "LST-" + year + "-" + String(maxNum + 1).padStart(3, "0");
}

// ── Video URL sync ────────────────────────────────────────────────────────────
// Scans a listing's 04_Video_Output Drive subfolder for
// video__{listingId}__landscape.mp4, sets it to "Anyone with link can view",
// and writes the share URL into the videoUrl column of the sheet.

function extractDriveFolderId_(url) {
  if (!url) return null;
  var m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

function extractDriveFileId_(url) {
  if (!url) return null;
  var m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

function sanitizePdfFilePart_(value, fallback) {
  var cleaned = String(value || fallback || "")
    .replace(/[\\\/:*?"<>|#%\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(fallback || "Application");
}

function buildRentalApplicationPdfName_(recordId, listingId, applicantName) {
  return [
    "Rental Application",
    sanitizePdfFilePart_(recordId, "APP"),
    sanitizePdfFilePart_(listingId, "Listing"),
    sanitizePdfFilePart_(applicantName, "Applicant")
  ].join(" - ") + ".pdf";
}

function isAffirmativeJointApplicant_(value) {
  var normalized = String(value || "").trim();
  return normalized === "Yes / 有" ||
    normalized === "Yes" ||
    normalized === "有" ||
    normalized === "是" ||
    normalized === "Yes / 是";
}

function getRentalApplicationArchiveFolder_(listingId, listingFolderId) {
  var parentFolder = listingFolderId
    ? DriveApp.getFolderById(listingFolderId)
    : DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var applicationsIter = parentFolder.getFoldersByName("Applications");
  var applicationsFolder = applicationsIter.hasNext()
    ? applicationsIter.next()
    : parentFolder.createFolder("Applications");
  var listingFolderName = String(listingId || "Unknown Listing");
  var listingFolderIter = applicationsFolder.getFoldersByName(listingFolderName);
  return listingFolderIter.hasNext()
    ? listingFolderIter.next()
    : applicationsFolder.createFolder(listingFolderName);
}

function trySetDriveViewSharing_(driveItem, label) {
  try {
    driveItem.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("[trySetDriveViewSharing] " + label + " sharing skipped: " + e.message);
    if (e && e.stack) Logger.log(e.stack);
  }
}

// Sync videoUrl for one listing. Can also be called from the Apps Script editor.
function syncVideoUrl_(listingId, auth) {
  if (!listingId) throw new Error("syncVideoUrl: listingId required");
  getListingById_(listingId, auth);

  var sheet     = getSheet_(LISTINGS_SHEET);
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var last      = sheet.getLastRow();
  if (last < 2) throw new Error("No listing rows found");

  // Find the row for this listing.
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  var rowNumber = -1;
  var row       = null;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === listingId) {
      rowNumber = i + 2;
      row       = sheet.getRange(rowNumber, 1, 1, numCols).getValues()[0];
      break;
    }
  }
  if (!row) throw new Error("Listing not found: " + listingId);

  var driveFolderLink = colVal_(row, headerMap, "Drive Folder Link");
  var folderId        = extractDriveFolderId_(driveFolderLink);

  Logger.log("[syncVideoUrl] listingId        : " + listingId);
  Logger.log("[syncVideoUrl] driveFolderLink  : " + driveFolderLink);
  Logger.log("[syncVideoUrl] folderId         : " + folderId);
  Logger.log("[syncVideoUrl] sheet            : " + LISTINGS_SHEET);
  Logger.log("[syncVideoUrl] rowNumber        : " + rowNumber);

  if (!folderId) throw new Error("No Drive Folder Link found for listing: " + listingId);

  // Open 04_Video_Output subfolder.
  var listingFolder   = DriveApp.getFolderById(folderId);
  var videoFolderIter = listingFolder.getFoldersByName("04_Video_Output");
  if (!videoFolderIter.hasNext()) throw new Error("04_Video_Output folder not found for: " + listingId);
  var videoFolder = videoFolderIter.next();
  Logger.log("[syncVideoUrl] 04_Video_Output folder ID: " + videoFolder.getId());

  // Find video__{listingId}__landscape.mp4.
  var targetFileName = "video__" + listingId + "__landscape.mp4";
  var fileIter       = videoFolder.getFilesByName(targetFileName);
  if (!fileIter.hasNext()) throw new Error("File not found in 04_Video_Output: " + targetFileName);

  var videoFile = fileIter.next();
  var fileId    = videoFile.getId();
  Logger.log("[syncVideoUrl] Found file       : " + targetFileName + " (id=" + fileId + ")");

  // Ensure Anyone with link can view.
  videoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileUrl = videoFile.getUrl();
  Logger.log("[syncVideoUrl] Drive URL        : " + fileUrl);

  // Ensure videoUrl column exists and write.
  addMissingHeaders_(sheet, LISTING_HEADERS);
  var freshMap    = getHeaderMap_(sheet);
  var videoColIdx = freshMap["videoUrl"];
  if (videoColIdx === undefined) throw new Error("videoUrl column not found after addMissingHeaders_");

  sheet.getRange(rowNumber, videoColIdx + 1).setValue(fileUrl);
  SpreadsheetApp.flush();
  Logger.log("[syncVideoUrl] Wrote to row " + rowNumber + ", col " + (videoColIdx + 1) + " (videoUrl)");

  // Upload to Cloudinary for CDN playback (non-blocking — failures are logged, not thrown).
  var cloudinaryResult = null;
  try {
    cloudinaryResult = uploadVideoToCloudinary_(fileId, listingId);
    Logger.log("[syncVideoUrl] Cloudinary upload result: " + JSON.stringify(cloudinaryResult));
  } catch (e) {
    Logger.log("[syncVideoUrl] Cloudinary upload failed (non-fatal): " + e.message);
  }

  return {
    success:   true,
    id:        listingId,
    fileId:    fileId,
    fileName:  targetFileName,
    videoUrl:  fileUrl,
    publicVideoUrl: cloudinaryResult && cloudinaryResult.publicVideoUrl || null,
    sheetName: LISTINGS_SHEET,
    rowNumber: rowNumber,
    colName:   "videoUrl",
    colIndex:  videoColIdx + 1,
  };
}

// Sync all listings that have a Drive folder but no videoUrl yet.
// Can be run directly from the Apps Script editor (no underscore wrapper needed).
function syncAllVideoUrls_() {
  var listings = getListings_();
  var results  = [];
  for (var i = 0; i < listings.length; i++) {
    var listing = listings[i];
    if (listing.videoUrl) {
      results.push({ id: listing.id, skipped: true, reason: "already has videoUrl" });
      continue;
    }
    try {
      var r = syncVideoUrl_(listing.id);
      results.push(r);
    } catch (e) {
      results.push({ id: listing.id, success: false, error: e.message });
    }
  }
  return results;
}

// Runnable from Apps Script editor: click Run → syncAllVideoUrls
function syncAllVideoUrls() {
  var results = syncAllVideoUrls_();
  Logger.log(JSON.stringify(results, null, 2));
}

// ── Contact form ──────────────────────────────────────────────────────────────

function saveContact_(data) {
  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var headerMap = getHeaderMap_(sheet);
  var submittedAt = new Date().toISOString();
  var numCols = Math.max(sheet.getLastColumn(), CONTACT_HEADERS.length);
  var row = new Array(numCols).fill("");
  row[headerMap["Name"]]             = data.name    || "";
  row[headerMap["Email"]]            = data.email   || "";
  row[headerMap["Phone"]]            = data.phone   || "";
  row[headerMap["WeChat ID"]]        = data.wechat  || "";
  row[headerMap["City"]]             = data.city    || "";
  row[headerMap["Service Interest"]] = data.service || "";
  row[headerMap["Message"]]          = data.message || "";
  row[headerMap["Submitted At"]]     = submittedAt;
  row[headerMap["Approval Status"]]  = "Pending";
  row[headerMap["Approved Module"]]  = "";
  row[headerMap["Access Type"]]      = "";
  row[headerMap["Payment Status"]]   = "";
  row[headerMap["Access Code"]]      = "";
  row[headerMap["Approved At"]]      = "";
  row[headerMap["Access Expires At"]] = "";
  row[headerMap["Admin Notes"]]      = "";
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  var rowNumber = sheet.getLastRow();

  var emailWarning = null;
  try {
    var body =
      "New trial request submitted via Vanisland AI Marketing Studio.\n\n" +
      "Name:             " + (data.name    || "—") + "\n" +
      "Email:            " + (data.email   || "—") + "\n" +
      "Phone:            " + (data.phone   || "—") + "\n" +
      "WeChat ID:        " + (data.wechat  || "—") + "\n" +
      "City:             " + (data.city    || "—") + "\n" +
      "Service Interest: " + (data.service || "—") + "\n" +
      "Message:\n" + (data.message || "—") + "\n\n" +
      "Submitted At: " + submittedAt + "\n\n" +
      "Please review this request in the Admin backend.";
    MailApp.sendEmail({
      to:      "mabelclaw67@gmail.com",
      subject: "New Trial Request - Vanisland AI Marketing Studio",
      body:    body,
    });
  } catch (emailErr) {
    emailWarning = emailErr.message;
  }

  var result = rowToContactRequest_(sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0], headerMap, rowNumber);
  result.success = true;
  if (emailWarning) result.emailWarning = emailWarning;
  return result;
}

function rowToContactRequest_(row, headerMap, rowNumber) {
  function col(name) { return colVal_(row, headerMap, name); }
  return {
    rowNumber: rowNumber,
    name: col("Name"),
    email: col("Email"),
    phone: col("Phone"),
    wechat: col("WeChat ID"),
    city: col("City"),
    serviceInterest: col("Service Interest"),
    message: col("Message"),
    submittedAt: col("Submitted At"),
    approvalStatus: col("Approval Status") || "Pending",
    approvedModule: col("Approved Module"),
    accessType: col("Access Type"),
    paymentStatus: col("Payment Status"),
    accessCode: col("Access Code"),
    approvedAt: col("Approved At"),
    accessExpiresAt: col("Access Expires At"),
    approvalEmailSentAt: col("Approval Email Sent At"),
    adminNotes: col("Admin Notes"),
  };
}

function getContactRequests_(auth) {
  assertAdmin_(auth);
  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, last - 1, numCols).getValues();
  var results = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var item = rowToContactRequest_(rows[i], headerMap, i + 2);
    if (!item.name && !item.email && !item.submittedAt) continue;
    results.push(item);
  }
  return results;
}

function approveContactRequest_(body, auth) {
  assertAdmin_(auth);
  var rowNumber = Number(body.rowNumber || 0);
  if (!rowNumber || rowNumber < 2) throw new Error("approveContactRequest: valid rowNumber required");

  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var headerMap = getHeaderMap_(sheet);
  if (rowNumber > sheet.getLastRow()) throw new Error("approveContactRequest: row not found");

  var approvalStatus = String(body.approvalStatus || "").trim();
  var approvedModule = String(body.approvedModule || "").trim();
  var accessType = normalizeAccessType_(body.accessType || "");
  var paymentStatus = normalizePaymentStatus_(body.paymentStatus || "");
  var durationDays = normalizeDurationDays_(body.durationDays, accessType);
  var isApproved = approvalStatus === "Approved" || (!approvalStatus && approvedModule);
  var nowIso = new Date().toISOString();

  if (isApproved && !approvedModule) {
    throw new Error("approveContactRequest: approvedModule required when approving");
  }
  if (isApproved && !accessType) {
    accessType = "Trial";
  }
  if (isApproved && !paymentStatus) {
    paymentStatus = defaultPaymentStatusForAccessType_(accessType);
  }

  setContactField_(sheet, headerMap, rowNumber, "Approval Status", isApproved ? "Approved" : (approvalStatus || "Rejected / Not Now"));
  setContactField_(sheet, headerMap, rowNumber, "Approved Module", isApproved ? approvedModule : "");
  setContactField_(sheet, headerMap, rowNumber, "Access Type", isApproved ? accessType : "");
  setContactField_(sheet, headerMap, rowNumber, "Payment Status", isApproved ? paymentStatus : "");
  setContactField_(sheet, headerMap, rowNumber, "Access Code", isApproved ? generateAccessCode_(sheet, headerMap) : "");
  setContactField_(sheet, headerMap, rowNumber, "Approved At", isApproved ? nowIso : "");
  setContactField_(sheet, headerMap, rowNumber, "Access Expires At", isApproved ? addDaysIso_(durationDays) : "");
  setContactField_(sheet, headerMap, rowNumber, "Approval Email Sent At", "");
  if (body.adminNotes !== undefined) {
    setContactField_(sheet, headerMap, rowNumber, "Admin Notes", body.adminNotes || "");
  }
  SpreadsheetApp.flush();

  var approvalEmailSent = false;
  var approvalEmailWarning = "";
  if (isApproved) {
    var approvedRow = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    var approvedRequest = rowToContactRequest_(approvedRow, headerMap, rowNumber);
    try {
      sendTrialApprovalEmail_(approvedRequest);
      approvalEmailSent = true;
      setContactField_(sheet, headerMap, rowNumber, "Approval Email Sent At", new Date().toISOString());
      SpreadsheetApp.flush();
    } catch (emailErr) {
      approvalEmailWarning = emailErr && emailErr.message ? emailErr.message : String(emailErr || "Unknown approval email error");
      Logger.log("[approveContactRequest] approval email error: " + approvalEmailWarning);
      if (emailErr && emailErr.stack) Logger.log(emailErr.stack);
    }
  }

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  var result = rowToContactRequest_(row, headerMap, rowNumber);
  result.approvalEmailSent = approvalEmailSent;
  if (approvalEmailWarning) result.approvalEmailWarning = approvalEmailWarning;
  return result;
}

function sendTrialApprovalEmail_(request) {
  var recipient = String(request && request.email || "").trim();
  if (!recipient) throw new Error("Approval email recipient is missing");

  var name = String(request && request.name || "").trim();
  var greetingName = name || "there";
  var body =
    "Hi " + greetingName + ",\n\n" +
    "Your trial access for Vanisland AI Marketing Studio has been approved.\n\n" +
    "Website:\n" +
    "https://vanislandproperty.ca/\n\n" +
    "Login Email:\n" +
    (request.email || "") + "\n\n" +
    "Access Code:\n" +
    (request.accessCode || "") + "\n\n" +
    "Approved Module:\n" +
    (request.approvedModule || "") + "\n\n" +
    "Access Type:\n" +
    (request.accessType || "") + "\n\n" +
    "Expiry Date:\n" +
    (request.accessExpiresAt || "") + "\n\n" +
    "Please note: this access code is temporary and will automatically expire on the expiry date above.\n\n" +
    "If you have any questions or feedback during testing, please contact Mabel.\n\n" +
    "Thank you,\n" +
    "Mabel\n" +
    "Vanisland AI Marketing Studio";

  MailApp.sendEmail({
    to: recipient,
    subject: "Your Vanisland AI Studio Trial Access Has Been Approved",
    body: body,
  });
}

function updateContactRequestNotes_(rowNumber, notes, auth) {
  assertAdmin_(auth);
  rowNumber = Number(rowNumber || 0);
  if (!rowNumber || rowNumber < 2) throw new Error("updateContactRequestNotes: valid rowNumber required");

  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var headerMap = getHeaderMap_(sheet);
  if (rowNumber > sheet.getLastRow()) throw new Error("updateContactRequestNotes: row not found");

  setContactField_(sheet, headerMap, rowNumber, "Admin Notes", notes || "");
  SpreadsheetApp.flush();

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  return rowToContactRequest_(row, headerMap, rowNumber);
}

function validateAccessCode_(email, accessCode) {
  var normalizedEmail = normalizeEmail_(email);
  var normalizedCode = String(accessCode || "").trim().toUpperCase();
  if (!normalizedEmail || !normalizedCode) {
    return invalidAccessResult_();
  }

  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return invalidAccessResult_();

  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, last - 1, numCols).getValues();

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var item = rowToContactRequest_(row, headerMap, i + 2);
    if (normalizeEmail_(item.email) !== normalizedEmail) continue;
    if (String(item.accessCode || "").trim().toUpperCase() !== normalizedCode) continue;
    if (String(item.approvalStatus || "").trim() !== "Approved") return invalidAccessResult_();
    if (isAccessExpired_(item.accessExpiresAt)) return invalidAccessResult_();
    return {
      valid: true,
      email: item.email,
      name: item.name,
      approvedModule: item.approvedModule,
      accessType: item.accessType,
      paymentStatus: item.paymentStatus,
      accessCode: item.accessCode,
      approvedAt: item.approvedAt,
      accessExpiresAt: item.accessExpiresAt,
    };
  }

  return invalidAccessResult_();
}

function invalidAccessResult_() {
  return {
    valid: false,
    message: "Access code not found, expired, or not approved. Please contact Mabel.",
  };
}

function setContactField_(sheet, headerMap, rowNumber, fieldName, value) {
  var colIdx = headerMap[fieldName];
  if (colIdx === undefined) throw new Error("Missing Contacts column: " + fieldName);
  sheet.getRange(rowNumber, colIdx + 1).setValue(value);
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAccessType_(value) {
  var text = String(value || "").trim().toLowerCase();
  if (text === "trial") return "Trial";
  if (text === "paid") return "Paid";
  if (text === "manual" || text.indexOf("complimentary") >= 0) return "Manual";
  return "";
}

function normalizePaymentStatus_(value) {
  var text = String(value || "").trim().toLowerCase();
  if (text === "paid") return "Paid";
  if (text === "unpaid") return "Unpaid";
  if (text === "manual") return "Manual";
  if (text === "not required" || text === "notrequired") return "Not Required";
  return "";
}

function normalizeDurationDays_(value, accessType) {
  var num = Number(value || 0);
  if (num === 7 || num === 10 || num === 30 || num === 90) return num;
  if (String(accessType || "") === "Trial") return 10;
  if (String(accessType || "") === "Paid") return 30;
  if (String(accessType || "") === "Manual") return 30;
  return 30;
}

function defaultPaymentStatusForAccessType_(accessType) {
  if (accessType === "Paid") return "Paid";
  if (accessType === "Manual") return "Not Required";
  return "Unpaid";
}

function isAccessExpired_(expiresAt) {
  if (!expiresAt) return false;
  var dt = new Date(expiresAt);
  if (isNaN(dt.getTime())) return false;
  return dt.getTime() < Date.now();
}

function addDaysIso_(days) {
  var dt = new Date();
  dt.setDate(dt.getDate() + Number(days || 0));
  return dt.toISOString();
}

function generateAccessCode_(sheet, headerMap) {
  var year = String(new Date().getFullYear());
  var last = sheet.getLastRow();
  var maxSeq = 0;
  if (last >= 2) {
    var rows = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < rows.length; i++) {
      var code = String(colVal_(rows[i], headerMap, "Access Code") || "").trim().toUpperCase();
      var match = code.match(/^VAI-(\d{4})-(\d{4})$/);
      if (!match || match[1] !== year) continue;
      maxSeq = Math.max(maxSeq, Number(match[2]) || 0);
    }
  }
  return "VAI-" + year + "-" + String(maxSeq + 1).padStart(4, "0");
}

// ── Rental listing media folder auto-creation ────────────────────────────────

function createRentalListingFolder_(listingId, address) {
  var parent = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var folderName = listingId + (address ? " - " + address + " - Media" : " - Media");
  // Reuse existing folder with the same name to avoid duplicates on retry.
  var iter = parent.getFoldersByName(folderName);
  var folder = iter.hasNext() ? iter.next() : parent.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder.getUrl();
}

// ── File upload → Drive (legacy — kept for backward compat) ──────────────────

function uploadFile_(body, auth) {
  if (!body.listingId) throw new Error("uploadFile: listingId required");
  if (!body.data)      throw new Error("uploadFile: base64 data required");
  getListingById_(body.listingId, auth);

  var parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var listingFolder;
  var it = parentFolder.getFoldersByName(body.listingId);
  listingFolder = it.hasNext() ? it.next() : parentFolder.createFolder(body.listingId);

  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mimeType || "application/octet-stream",
    body.fileName || ("upload_" + Date.now())
  );
  var file = listingFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId   = file.getId();
  var fileUrl  = file.getUrl();
  var thumbUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";

  // Update Drive Files cell via header-based lookup.
  var sheet     = getSheet_(LISTINGS_SHEET);
  var headerMap = getHeaderMap_(sheet);
  var filesColIdx = headerMap["Drive Files"];
  var last = sheet.getLastRow();
  if (last >= 2 && filesColIdx !== undefined) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === body.listingId) {
        var filesCell = sheet.getRange(i + 2, filesColIdx + 1);
        var existing  = tryParse_(filesCell.getValue(), []);
        existing.push({ name: blob.getName(), fileId: fileId, url: fileUrl, thumbUrl: thumbUrl, uploadedAt: new Date().toISOString() });
        filesCell.setValue(JSON.stringify(existing));
        break;
      }
    }
  }

  return { fileId: fileId, url: fileUrl, thumbUrl: thumbUrl, fileName: blob.getName() };
}

// ── List JPG/PNG files from a listing's own Drive folder ─────────────────────
// Reads the folder via its ID (extracted from the Drive Folder Link on the frontend).
// Does not modify any files.

function getListingFolderFiles_(folderId, listingId, auth) {
  var resolvedFolderId = resolveListingFolderIdForAccess_(folderId, listingId, auth);
  var folder = DriveApp.getFolderById(resolvedFolderId);
  return listDriveMediaFiles_(folder, { includeVideos: false });
}

function getListingSubfolderFiles_(folderId, subfolderName, listingId, auth) {
  if (!subfolderName) throw new Error("getListingSubfolder: subfolderName required");
  var resolvedFolderId = resolveListingFolderIdForAccess_(folderId, listingId, auth);
  var parent = DriveApp.getFolderById(resolvedFolderId);
  var folders = parent.getFoldersByName(subfolderName);
  if (!folders.hasNext()) {
    return {
      subfolderFolderId: "",
      subfolderUrl: "",
      files: [],
    };
  }
  var folder = folders.next();
  return {
    subfolderFolderId: auth && auth.mode === "admin" ? folder.getId() : "",
    subfolderUrl: auth && auth.mode === "admin" ? folder.getUrl() : "",
    files: listDriveMediaFiles_(folder, { includeVideos: true }),
  };
}

function resolveListingFolderIdForAccess_(folderId, listingId, auth) {
  if (folderId) {
    assertFolderAccess_(folderId, listingId, auth);
    return folderId;
  }
  if (!listingId) throw new Error("Listing media lookup requires listingId.");
  var listing = findListingById_(listingId);
  if (!listing || !canAccessListingRecord_(listing, auth)) {
    throw new Error("Access denied for this listing.");
  }
  var resolved = extractDriveFolderId_(listing.driveFolderLink || "");
  if (!resolved) throw new Error("Drive folder not found for this listing.");
  return resolved;
}

function assertFolderAccess_(folderId, listingId, auth) {
  if (auth && auth.mode === "admin") return;
  if (listingId) {
    var listing = findListingById_(listingId);
    if (!listing || !canAccessListingRecord_(listing, auth)) {
      throw new Error("Access denied for this listing.");
    }
    var expected = extractDriveFolderId_(listing.driveFolderLink || "");
    if (expected && expected === folderId) return;
  }
  if (!auth || auth.mode !== "trial") {
    throw new Error("Access denied for this listing folder.");
  }
  var ownedListing = findListingByFolderId_(folderId, auth.email);
  if (!ownedListing) throw new Error("Access denied for this listing folder.");
}

function findListingByFolderId_(folderId, ownerEmail) {
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, last - 1, numCols).getValues();
  var auth = { mode: "trial", email: ownerEmail };
  var listings = rows
    .map(function(row) { return rowToListing_(row, headerMap); })
    .filter(function(item) { return canAccessListingRecord_(item, auth); });
  for (var i = 0; i < listings.length; i++) {
    if (extractDriveFolderId_(listings[i].driveFolderLink || "") === folderId) return listings[i];
  }
  return null;
}

function listDriveMediaFiles_(folder, options) {
  var includeVideos = !!(options && options.includeVideos);
  var files  = [];
  var it     = folder.getFiles();
  while (it.hasNext()) {
    var file = it.next();
    var mime = file.getMimeType();
    var isImage = mime === "image/jpeg" || mime === "image/png";
    var isVideo = includeVideos && mime === "video/mp4";
    if (isImage || isVideo) {
      var fileId = file.getId();
      var entry = {
        name:       file.getName(),
        fileId:     fileId,
        mimeType:   mime,
        url:        file.getUrl(),
        thumbUrl:   "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800",
        thumbUrlLg: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1600",
      };
      if (isImage) {
      var blob = file.getBlob();
      var contentType = blob.getContentType();
      var base64 = Utilities.base64Encode(blob.getBytes());
      var dataUrl = "data:" + contentType + ";base64," + base64;
        entry.dataUrl = dataUrl;
      }
      files.push(entry);
    }
  }
  return files.sort(function(a, b) {
    return compareDriveFileNames_(a.name, b.name);
  });
}

function compareDriveFileNames_(a, b) {
  var left = driveFileNameParts_(a);
  var right = driveFileNameParts_(b);
  var length = Math.max(left.length, right.length);

  for (var i = 0; i < length; i++) {
    if (left[i] === undefined) return -1;
    if (right[i] === undefined) return 1;

    if (left[i].type === "number" && right[i].type === "number") {
      if (left[i].value !== right[i].value) return left[i].value - right[i].value;
      continue;
    }

    if (left[i].type !== right[i].type) {
      return left[i].type === "number" ? -1 : 1;
    }

    var textCompare = String(left[i].value).localeCompare(String(right[i].value));
    if (textCompare !== 0) return textCompare;
  }

  return String(a || "").localeCompare(String(b || ""));
}

function driveFileNameParts_(name) {
  var text = String(name || "").toLowerCase();
  var parts = text.match(/\d+|\D+/g) || [text];
  return parts.map(function(part) {
    if (/^\d+$/.test(part)) return { type: "number", value: Number(part) };
    return { type: "text", value: part };
  });
}

// ── Rental Application Intake ─────────────────────────────────────────────────

function rowToApplication_(row, headerMap) {
  function col(name) { return colVal_(row, headerMap, name); }
  var legacySupportingDocs = col("Indicate your and Joint Applicant willingness to provide supporting documents (e.g., proof of income, credit report).");
  return {
    // System
    recordId:        col("Record ID"),
    listingId:       col("Listing ID"),
    submittedAt:     col("Submitted At"),
    // Applicant info
    applicantName:   col("Applicant Name"),
    email:           col("Email"),
    phone:           col("Phone"),
    dateOfBirth:     col("Date of Birth"),
    currentAddress:  col("Current Address"),
    wechat:          col("WeChat"),
    // Employment
    employmentStatus: col("Employment Status"),
    employer:        col("Employer"),
    monthlyIncome:   col("Monthly Income"),
    // Reference & credit
    landlordReference: col("Landlord Reference"),
    creditHistory:   col("Credit History"),
    // Occupancy
    moveInDate:      col("Move-in Date"),
    leaseTerm:       col("Lease Term Requested"),
    occupants:       col("Occupants"),
    adults:          col("Adults"),
    minors:          col("Minors"),
    occupantNamesAges: col("Occupant Names Ages"),
    // Joint applicant
    hasJointApplicant:      col("Has Joint Applicant") || col("Joint Applicant / Co-Applicant Information"),
    jointName:              col("Joint Name") || col("Joint Applicant Full Legal Name"),
    jointPhone:             col("Joint Phone") || col("Joint Applicant Phone Number"),
    jointEmail:             col("Joint Email") || col("Joint Applicant Email Address"),
    jointDob:               col("Joint DOB") || col("Joint Applicant's Date of Birth (DD/MM/YYYY)"),
    jointAddress:           col("Joint Address") || col("Joint Applicant Current Address"),
    jointEmployment:        col("Joint Employment") || col("Joint Applicant Employment / Income Source"),
    jointIncome:            col("Joint Income") || col("Joint Applicant Monthly Income"),
    jointEmployerContact:   col("Joint Employer Contact") || col("Joint Applicant Employer Contact ") || col("Joint Applicant Employer Contact"),
    jointLandlordReference: col("Joint Landlord Reference") || col("Joint Applicant Current Landlord Reference"),
    jointCreditInfo:        col("Joint Credit Info") || col("Joint Applicant Credit Information"),
    jointProofOfIncome:     col("Joint Proof of Income") || extractSupportingDocsChoice_(legacySupportingDocs, "Joint Applicant"),
    // Deposit
    depositFundsAvailable: col("Deposit Funds Available"),
    depositAgreement:      col("Deposit Agreement"),
    // Pets
    hasPets:         col("Has Pets"),
    petDepositFunds: col("Pet Deposit Funds"),
    petDetails:      col("Pet Details"),
    // Tenancy history
    evictionHistory: col("Eviction History"),
    // Smoking
    smokesVapesCannabis: col("Smokes Vapes Cannabis"),
    noSmokingAgreement:  col("No Smoking Agreement"),
    // Documents
    proofOfIncome:   col("Proof of Income") || extractSupportingDocsChoice_(legacySupportingDocs, "Applicant"),
    // Insurance
    hasTenantInsurance:        col("Has Tenant Insurance"),
    tenantInsuranceAgreement:  col("Tenant Insurance Agreement"),
    proofInsuranceBeforeMoveIn: col("Proof Insurance Before Move-in"),
    // Additional
    reasonForMoving: col("Reason for Moving"),
    parkingRequest:  col("Parking Request"),
    additionalNotes: col("Additional Notes"),
    // Admin
    pdfUrl:        col("PDF URL"),
    applicationDownloadToken: col("Application Download Token"),
    applicationDownloadExpiresAt: col("Application Download Expires At"),
    reviewStatus:  col("Review Status") || "Pending",
    internalNotes: col("Internal Notes"),
    updatedAt:     col("Updated At"),
    shortlistStatus: col("Shortlist Status"),
    documentRequestSent: col("Document Request Sent"),
    documentRequestSentAt: col("Document Request Sent At"),
    uploadToken: col("Upload Token"),
    uploadTokenExpiresAt: col("Upload Token Expires At"),
    uploadLink: col("Upload Link"),
    supportDocumentFolderUrl: col("Support Document Folder URL"),
    documentUploadStatus: col("Document Upload Status"),
    uploadedFileCount: col("Uploaded File Count"),
    lastUploadAt: col("Last Upload At"),
    screeningReportStatus: col("Screening Report Status"),
    screeningReportGeneratedAt: col("Screening Report Generated At"),
    screeningReportUrl: col("Screening Report URL"),
    screeningReportMarkdown: col("Screening Report Markdown"),
    dataRetentionStatus: col("Data Retention Status"),
    retentionExpiryDate: col("Retention Expiry Date"),
    retentionAction: col("Retention Action"),
    retentionNotes: col("Retention Notes"),
    sensitiveFilesDeletedAt: col("Sensitive Files Deleted At"),
    archivedTenantFileUrl: col("Archived Tenant File URL"),
  };
}

function findApplicationRowByRecordId_(recordId) {
  if (!recordId) throw new Error("Application recordId required");
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No application records found");
  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var idCol = headerMap["Record ID"];
  if (idCol === undefined) throw new Error('"07 Intake Records" is missing Record ID column.');
  var ids = sheet.getRange(2, idCol + 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || "").trim() === String(recordId).trim()) {
      var rowNumber = i + 2;
      var row = sheet.getRange(rowNumber, 1, 1, numCols).getValues()[0];
      return {
        sheet: sheet,
        rowNumber: rowNumber,
        row: row,
        headerMap: headerMap,
        app: rowToApplication_(row, headerMap),
      };
    }
  }
  throw new Error("Application not found: " + recordId);
}

function setApplicationCells_(sheet, rowNumber, headerMap, values) {
  for (var name in values) {
    if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
    var colIdx = headerMap[name];
    if (colIdx !== undefined) sheet.getRange(rowNumber, colIdx + 1).setValue(values[name]);
  }
}

function getOrCreateChildFolder_(parent, name) {
  var safeName = sanitizePdfFilePart_(name, "Applicant");
  var it = parent.getFoldersByName(safeName);
  return it.hasNext() ? it.next() : parent.createFolder(safeName);
}

function generateUploadToken_() {
  var bytes = Utilities.getUuid() + "-" + Utilities.getUuid() + "-" + Date.now();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes, Utilities.Charset.UTF_8);
  return digest.map(function(b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function getExpiryIso_(days) {
  return new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
}

function isExpiredIso_(isoValue) {
  if (!isoValue) return true;
  var expiresAt = new Date(isoValue);
  return isNaN(expiresAt.getTime()) || Date.now() > expiresAt.getTime();
}

function expiredLinkError_() {
  throw new Error("This link has expired. Please contact property management.");
}

function buildUploadPath_(listingId, recordId, token) {
  return "/support-documents/" + encodeURIComponent(listingId) + "/" + encodeURIComponent(recordId) + "?token=" + encodeURIComponent(token);
}

function buildSupportingDocumentsEmailBody_(applicantName, propertyAddress, uploadLink) {
  return [
    "Dear " + applicantName + ",",
    "",
    "Thank you for submitting your rental application for " + propertyAddress + ".",
    "",
    "Your application has been shortlisted for further review. Please upload your supporting documents using the secure link below:",
    "",
    uploadLink,
    "",
    "Please upload the documents that apply to your situation, such as:",
    "- Government-issued photo ID",
    "- Proof of income or employment",
    "- Recent pay stubs",
    "- NOA / T4, if applicable",
    "- Credit report",
    "- Bank statements or proof of funds, if requested",
    "- Landlord references",
    "- Tenant insurance information, if available",
    "- Any other supporting documents",
    "",
    "Please do not email sensitive documents separately unless requested.",
    "",
    "Thank you,",
    "Vanisland Property Management"
  ].join("\n");
}

function sendSupportingDocumentsEmail_(toEmail, applicantName, propertyAddress, uploadLink) {
  if (!toEmail) throw new Error("Applicant email is missing.");
  if (!uploadLink) throw new Error("Upload Link is missing.");
  MailApp.sendEmail({
    to: toEmail,
    subject: "Supporting Documents Required for Your Rental Application",
    body: buildSupportingDocumentsEmailBody_(applicantName || "Applicant", propertyAddress || "", uploadLink),
  });
}

function requestSupportingDocuments_(recordId, origin, auth) {
  var found = findApplicationRowByRecordId_(recordId);
  var app = found.app;
  if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
    throw new Error("Access denied for this listing.");
  }
  if (!app.email) throw new Error("Applicant email is missing.");
  if (!app.listingId) throw new Error("Listing ID is missing.");

  var listing = findListingById_(app.listingId);
  if (!listing) throw new Error("Listing not found: " + app.listingId);
  if (!listing.driveFolderLink) throw new Error("Drive Folder Link is missing for listing: " + app.listingId);
  var listingFolderId = extractDriveFolderId_(listing.driveFolderLink);
  if (!listingFolderId) throw new Error("Could not read Drive folder ID from listing Drive Folder Link.");

  var listingFolder = DriveApp.getFolderById(listingFolderId);
  var supportFolder = getOrCreateChildFolder_(listingFolder, "Supporting Documents");
  var applicantFolder = getOrCreateChildFolder_(supportFolder, recordId + " - " + (app.applicantName || "Applicant"));
  trySetDriveViewSharing_(applicantFolder, "supporting document folder");

  var token = generateUploadToken_();
  var tokenExpiresAt = getExpiryIso_(14);
  var path = buildUploadPath_(app.listingId, recordId, token);
  var cleanOrigin = String(origin || "").replace(/\/+$/, "");
  var uploadLink = cleanOrigin ? cleanOrigin + path : path;
  var now = new Date().toISOString();

  sendSupportingDocumentsEmail_(app.email, app.applicantName || "Applicant", listing.address || app.listingId, uploadLink);

  setApplicationCells_(found.sheet, found.rowNumber, found.headerMap, {
    "Shortlist Status": "Shortlisted",
    "Document Request Sent": "Yes",
    "Document Request Sent At": now,
    "Upload Token": token,
    "Upload Token Expires At": tokenExpiresAt,
    "Upload Link": uploadLink,
    "Support Document Folder URL": applicantFolder.getUrl(),
    "Document Upload Status": "Pending",
    "Updated At": now,
  });
  SpreadsheetApp.flush();

  return {
    success: true,
    recordId: recordId,
    uploadLink: uploadLink,
    supportDocumentFolderUrl: applicantFolder.getUrl(),
    documentUploadStatus: "Pending",
    documentRequestSent: "Yes",
    documentRequestSentAt: now,
    uploadTokenExpiresAt: tokenExpiresAt,
    shortlistStatus: "Shortlisted",
  };
}

function resendSupportingDocumentsEmail_(recordId, auth) {
  var found = findApplicationRowByRecordId_(recordId);
  var app = found.app;
  if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
    throw new Error("Access denied for this listing.");
  }
  if (!app.email) throw new Error("Applicant email is missing.");
  if (!app.listingId) throw new Error("Listing ID is missing.");
  if (!app.uploadLink) throw new Error("Upload Link is missing. Please request supporting documents first.");
  if (!app.uploadToken || isExpiredIso_(app.uploadTokenExpiresAt)) expiredLinkError_();

  var listing = findListingById_(app.listingId);
  if (!listing) throw new Error("Listing not found: " + app.listingId);

  var now = new Date().toISOString();
  sendSupportingDocumentsEmail_(app.email, app.applicantName || "Applicant", listing.address || app.listingId, app.uploadLink);
  setApplicationCells_(found.sheet, found.rowNumber, found.headerMap, {
    "Document Request Sent": "Yes",
    "Document Request Sent At": now,
    "Updated At": now,
  });
  SpreadsheetApp.flush();

  return {
    success: true,
    recordId: recordId,
    emailTo: app.email,
    uploadLink: app.uploadLink,
    documentRequestSent: "Yes",
    documentRequestSentAt: now,
  };
}

function validateUploadToken_(listingId, recordId, token) {
  if (!listingId || !recordId || !token) throw new Error("This upload link is invalid or expired.");
  var found = findApplicationRowByRecordId_(recordId);
  var app = found.app;
  if (String(app.listingId || "") !== String(listingId || "")) throw new Error("This upload link is invalid or expired.");
  if (!app.uploadToken || String(app.uploadToken) !== String(token)) throw new Error("This upload link is invalid or expired.");
  if (isExpiredIso_(app.uploadTokenExpiresAt)) expiredLinkError_();
  var listing = findListingById_(listingId);
  if (!listing) throw new Error("This upload link is invalid or expired.");
  return {
    valid: true,
    listingId: listingId,
    recordId: recordId,
    applicantName: app.applicantName || "",
    propertyAddress: listing.address || "",
    documentUploadStatus: app.documentUploadStatus || "Pending",
    uploadedFileCount: app.uploadedFileCount || 0,
    lastUploadAt: app.lastUploadAt || "",
    uploadTokenExpiresAt: app.uploadTokenExpiresAt || "",
  };
}

function updateDocumentUploadStatus_(recordId) {
  var found = findApplicationRowByRecordId_(recordId);
  var folderUrl = found.app.supportDocumentFolderUrl;
  var folderId = extractDriveFolderId_(folderUrl);
  if (!folderId) throw new Error("Support Document Folder URL is missing.");
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var count = 0;
  while (files.hasNext()) {
    files.next();
    count++;
  }
  var now = new Date().toISOString();
  var status = count > 0 ? "Uploaded" : "Pending";
  setApplicationCells_(found.sheet, found.rowNumber, found.headerMap, {
    "Document Upload Status": status,
    "Uploaded File Count": count,
    "Last Upload At": count > 0 ? now : found.app.lastUploadAt,
    "Updated At": now,
  });
  SpreadsheetApp.flush();
  return { success: true, recordId: recordId, documentUploadStatus: status, uploadedFileCount: count, lastUploadAt: count > 0 ? now : found.app.lastUploadAt };
}

function uploadSupportingDocument_(body) {
  validateUploadToken_(body.listingId, body.recordId, body.token);
  if (!body.category) throw new Error("Document category is required.");
  if (!body.data) throw new Error("File data is required.");
  var found = findApplicationRowByRecordId_(body.recordId);
  var folderUrl = found.app.supportDocumentFolderUrl;
  var folderId = extractDriveFolderId_(folderUrl);
  if (!folderId) throw new Error("Support Document Folder URL is missing.");

  var folder = DriveApp.getFolderById(folderId);
  var fileName = [
    sanitizePdfFilePart_(body.category, "Document"),
    sanitizePdfFilePart_(found.app.applicantName, "Applicant"),
    sanitizePdfFilePart_(body.fileName, "upload")
  ].join(" - ");
  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mimeType || "application/octet-stream",
    fileName
  );
  var file = folder.createFile(blob);
  trySetDriveViewSharing_(file, "supporting document");
  var status = updateDocumentUploadStatus_(body.recordId);
  return {
    success: true,
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    documentUploadStatus: status.documentUploadStatus,
    uploadedFileCount: status.uploadedFileCount,
    lastUploadAt: status.lastUploadAt,
  };
}

var SCREENING_REPORT_CATEGORIES = [
  "Government Photo ID",
  "Income Proof / Pay Stubs",
  "Employment Letter",
  "NOA / T4",
  "Credit Report",
  "Bank Statements / Proof of Funds",
  "Landlord Reference",
  "Tenant Insurance",
  "Other Documents"
];

function inferSupportDocumentCategory_(fileName) {
  var lower = String(fileName || "").toLowerCase();
  if (lower.indexOf("government photo id") >= 0 || lower.indexOf("photo id") >= 0 || lower.indexOf("passport") >= 0 || lower.indexOf("driver") >= 0) return "Government Photo ID";
  if (lower.indexOf("income") >= 0 || lower.indexOf("pay") >= 0 || lower.indexOf("stub") >= 0) return "Income Proof / Pay Stubs";
  if (lower.indexOf("employment") >= 0 || lower.indexOf("employer") >= 0 || lower.indexOf("letter") >= 0) return "Employment Letter";
  if (lower.indexOf("noa") >= 0 || lower.indexOf("t4") >= 0) return "NOA / T4";
  if (lower.indexOf("credit") >= 0) return "Credit Report";
  if (lower.indexOf("bank") >= 0 || lower.indexOf("fund") >= 0) return "Bank Statements / Proof of Funds";
  if (lower.indexOf("landlord") >= 0 || lower.indexOf("reference") >= 0) return "Landlord Reference";
  if (lower.indexOf("insurance") >= 0) return "Tenant Insurance";
  return "Other Documents";
}

function listUploadedSupportFiles_(folderUrl) {
  var folderId = extractDriveFolderId_(folderUrl);
  if (!folderId) throw new Error("Support Document Folder URL is missing.");
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var uploaded = [];
  while (files.hasNext()) {
    var file = files.next();
    uploaded.push({
      name: file.getName(),
      url: file.getUrl(),
      category: inferSupportDocumentCategory_(file.getName()),
    });
  }
  return uploaded;
}

function markdownValue_(value) {
  var text = normalizeCellText_(value);
  return text || "-";
}

function markdownBullet_(label, value) {
  return "- " + label + ": " + markdownValue_(value);
}

function hasUploadedCategory_(uploadedFiles, category) {
  for (var i = 0; i < uploadedFiles.length; i++) {
    if (uploadedFiles[i].category === category) return true;
  }
  return false;
}

function uploadedFilesByCategory_(uploadedFiles, category) {
  var lines = [];
  for (var i = 0; i < uploadedFiles.length; i++) {
    if (uploadedFiles[i].category === category) {
      lines.push("  - [" + uploadedFiles[i].name + "](" + uploadedFiles[i].url + ")");
    }
  }
  return lines.length ? lines : ["  - Not uploaded or not clearly categorized"];
}

function buildMissingScreeningItems_(record, uploadedFiles) {
  var missing = [];
  if (!hasUploadedCategory_(uploadedFiles, "Income Proof / Pay Stubs")) missing.push("Missing income proof - draft only, needs manual review.");
  if (!hasUploadedCategory_(uploadedFiles, "Government Photo ID")) missing.push("Missing ID - draft only, needs manual review.");
  if (!hasUploadedCategory_(uploadedFiles, "Credit Report")) missing.push("Missing credit report - draft only, needs manual review.");
  if (!hasUploadedCategory_(uploadedFiles, "Landlord Reference") && !record.landlordReference) missing.push("Missing landlord reference - draft only, needs manual review.");
  if (!hasUploadedCategory_(uploadedFiles, "NOA / T4")) missing.push("Outdated or missing NOA/T4 - verify manually if required.");
  if (!hasUploadedCategory_(uploadedFiles, "Tenant Insurance") && !record.hasTenantInsurance && !record.proofInsuranceBeforeMoveIn) missing.push("Missing tenant insurance confirmation - draft only, needs manual review.");
  if (!record.monthlyIncome || !record.employer) missing.push("Applicant income or employment information appears incomplete.");
  if (!missing.length) missing.push("No obvious missing items detected by the draft checklist. Manual verification is still required.");
  return missing;
}

function buildDraftScreeningReportMarkdown_(record, listing, uploadedFiles) {
  var missingItems = buildMissingScreeningItems_(record, uploadedFiles);
  var draftRecommendation = "Ready for manual review";
  if (!uploadedFiles.length) draftRecommendation = "Not enough information for review";
  else if (missingItems.length > 2) draftRecommendation = "Needs more documents";
  else if (!record.monthlyIncome || !record.employer) draftRecommendation = "Needs clarification";

  var lines = [
    "# AI Draft Tenant Screening Report",
    "",
    "Generated At: " + new Date().toISOString(),
    "Application ID: " + markdownValue_(record.recordId),
    "",
    "## 1. Applicant Basic Information",
    markdownBullet_("Applicant Name", record.applicantName),
    markdownBullet_("Email", record.email),
    markdownBullet_("Phone", record.phone),
    markdownBullet_("Listing ID", record.listingId),
    markdownBullet_("Property Address", listing && listing.address),
    markdownBullet_("Desired Move-in Date", record.moveInDate),
    markdownBullet_("Occupants", record.occupants),
    markdownBullet_("Pets", record.hasPets || record.petDetails),
    markdownBullet_("Smoking", record.smokesVapesCannabis || record.noSmokingAgreement),
    markdownBullet_("Tenant Insurance Status", record.hasTenantInsurance || record.proofInsuranceBeforeMoveIn || record.tenantInsuranceAgreement),
    "",
    "## 2. Application Summary",
    markdownBullet_("Employment Status", record.employmentStatus),
    markdownBullet_("Employer / Income Source", record.employer),
    markdownBullet_("Monthly Income", record.monthlyIncome),
    markdownBullet_("Current Address", record.currentAddress),
    markdownBullet_("Current Landlord / Reference", record.landlordReference),
    markdownBullet_("Reason for Moving", record.reasonForMoving),
    markdownBullet_("Additional Notes", record.additionalNotes),
    "",
    "## 3. Uploaded Document Checklist"
  ];

  for (var i = 0; i < SCREENING_REPORT_CATEGORIES.length; i++) {
    var category = SCREENING_REPORT_CATEGORIES[i];
    lines.push("- " + category + ":");
    lines = lines.concat(uploadedFilesByCategory_(uploadedFiles, category));
  }

  lines.push("");
  lines.push("## 4. Missing / Unclear Items");
  for (var j = 0; j < missingItems.length; j++) lines.push("- " + missingItems[j]);

  lines = lines.concat([
    "",
    "## 5. Preliminary Risk Notes",
    "- Needs manual review. This draft does not verify document authenticity.",
    "- Potential concern: incomplete or unclear income, identity, credit, landlord reference, or insurance information should be reviewed manually.",
    "- Document not yet verified. Uploaded files are listed for internal review only.",
    "- Information appears incomplete where application fields or uploaded documents are missing.",
    "",
    "## 6. Recommended Follow-up Questions",
    "- Please confirm any missing or unclear income information and provide supporting documents if required.",
    "- Please confirm whether government photo ID and credit report have been provided and are current.",
    "- Please confirm landlord reference details and whether the reference can be contacted.",
    "- Please confirm tenant insurance status before move-in if applicable.",
    "- Please clarify any incomplete application answers before a final decision is made.",
    "",
    "## 7. Draft Recommendation",
    draftRecommendation,
    "",
    "## 8. Disclaimer",
    "This is an AI-generated draft for internal property management review only.",
    "It is not a final approval, rejection, legal opinion, or credit decision.",
    "The property manager must verify all information manually before making a decision."
  ]);

  return lines.join("\n");
}

function saveScreeningReportToDrive_(folderUrl, markdown, recordId, applicantName) {
  var folderId = extractDriveFolderId_(folderUrl);
  if (!folderId) throw new Error("Support Document Folder URL is missing.");
  var folder = DriveApp.getFolderById(folderId);
  var safeName = String(applicantName || "Applicant").replace(/[\\/:*?"<>|#%{}]/g, " ").replace(/\s+/g, " ").trim();
  var fileName = recordId + " - " + safeName + " - AI Draft Tenant Screening Report.md";
  var existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);
  var file = folder.createFile(fileName, markdown, MimeType.PLAIN_TEXT);
  return file.getUrl();
}

function updateScreeningReportStatus_(recordId, reportUrl, markdown) {
  var found = findApplicationRowByRecordId_(recordId);
  var now = new Date().toISOString();
  setApplicationCells_(found.sheet, found.rowNumber, found.headerMap, {
    "Screening Report Status": "Draft Generated",
    "Screening Report Generated At": now,
    "Screening Report URL": reportUrl,
    "Screening Report Markdown": markdown,
    "Updated At": now,
  });
  SpreadsheetApp.flush();
  return { status: "Draft Generated", generatedAt: now, reportUrl: reportUrl };
}

function generateDraftScreeningReport_(recordId, auth) {
  var found = findApplicationRowByRecordId_(recordId);
  var record = found.app;
  if (auth && auth.mode === "trial" && !findListingByIdForEmail_(record.listingId, auth.email)) {
    throw new Error("Access denied for this listing.");
  }
  if (!record.supportDocumentFolderUrl) throw new Error("Support Document Folder URL is missing.");
  var uploadStatus = String(record.documentUploadStatus || "").toLowerCase();
  if (uploadStatus !== "uploaded" && uploadStatus !== "complete") {
    throw new Error("Document Upload Status must be Uploaded or Complete before generating a screening report.");
  }
  var listing = findListingById_(record.listingId);
  if (!listing) throw new Error("Listing not found: " + record.listingId);
  var uploadedFiles = listUploadedSupportFiles_(record.supportDocumentFolderUrl);
  var markdown = buildDraftScreeningReportMarkdown_(record, listing, uploadedFiles);
  var reportUrl = saveScreeningReportToDrive_(record.supportDocumentFolderUrl, markdown, recordId, record.applicantName);
  var updated = updateScreeningReportStatus_(recordId, reportUrl, markdown);
  return {
    success: true,
    recordId: recordId,
    screeningReportStatus: updated.status,
    screeningReportGeneratedAt: updated.generatedAt,
    screeningReportUrl: updated.reportUrl,
    screeningReportMarkdown: markdown,
  };
}

function requireAdminRetentionAuth_(auth) {
  if (!auth || auth.mode !== "admin") {
    throw new Error("Admin access is required for data retention actions.");
  }
}

function retentionRuleForStatus_(status) {
  var normalized = normalizeCellText_(status).toLowerCase();
  if (normalized === "declined" || normalized === "not selected") {
    return { status: "Declined", days: 180, action: "Pending deletion after expiry" };
  }
  if (normalized === "withdrawn") {
    return { status: "Withdrawn", days: 90, action: "Pending deletion after expiry" };
  }
  if (normalized === "incomplete") {
    return { status: "Incomplete", days: 60, action: "Pending deletion after expiry" };
  }
  if (normalized === "approved but not signed") {
    return { status: "Approved but not signed", days: 180, action: "Pending deletion after expiry" };
  }
  if (normalized === "signed tenant" || normalized === "archived") {
    return { status: "Archived", days: null, action: "Move to tenant file / keep" };
  }
  throw new Error("Unknown retention status: " + status);
}

function addDaysIsoDate_(days) {
  var date = new Date();
  date.setDate(date.getDate() + Number(days));
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function updateApplicationRetentionStatus_(recordId, retentionStatus, notes, auth) {
  requireAdminRetentionAuth_(auth);
  var rule = retentionRuleForStatus_(retentionStatus);
  var found = findApplicationRowByRecordId_(recordId);
  var now = new Date().toISOString();
  var values = {
    "Data Retention Status": rule.status,
    "Retention Expiry Date": rule.days ? addDaysIsoDate_(rule.days) : "",
    "Retention Action": rule.action,
    "Retention Notes": notes || "",
    "Updated At": now,
  };
  setApplicationCells_(found.sheet, found.rowNumber, found.headerMap, values);
  SpreadsheetApp.flush();
  return {
    success: true,
    recordId: recordId,
    dataRetentionStatus: values["Data Retention Status"],
    retentionExpiryDate: values["Retention Expiry Date"],
    retentionAction: values["Retention Action"],
    retentionNotes: values["Retention Notes"],
  };
}

function parseRetentionDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  var date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function cleanupExpiredApplicationsPreview_(auth) {
  requireAdminRetentionAuth_(auth);
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return { success: true, count: 0, records: [] };
  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  var today = new Date();
  today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var records = [];
  for (var i = 0; i < rows.length; i++) {
    var app = rowToApplication_(rows[i], headerMap);
    var expiry = parseRetentionDate_(app.retentionExpiryDate);
    if (!expiry || expiry > today) continue;
    if (app.sensitiveFilesDeletedAt) continue;
    records.push({
      recordId: app.recordId,
      applicantName: app.applicantName,
      email: app.email,
      listingId: app.listingId,
      retentionStatus: app.dataRetentionStatus,
      expiryDate: app.retentionExpiryDate,
      supportFolderUrl: app.supportDocumentFolderUrl,
    });
  }
  return { success: true, count: records.length, records: records };
}

function deleteExpiredApplicantSensitiveFiles_(recordId, auth) {
  requireAdminRetentionAuth_(auth);
  var found = findApplicationRowByRecordId_(recordId);
  var app = found.app;
  var folderUrl = app.supportDocumentFolderUrl;
  var folderId = extractDriveFolderId_(folderUrl);
  if (!folderId) throw new Error("Support Document Folder URL is missing.");
  DriveApp.getFolderById(folderId).setTrashed(true);
  var now = new Date().toISOString();
  setApplicationCells_(found.sheet, found.rowNumber, found.headerMap, {
    "Support Document Folder URL": "",
    "Upload Link": "",
    "Upload Token": "",
    "Upload Token Expires At": "",
    "Document Upload Status": "Sensitive files deleted",
    "Sensitive Files Deleted At": now,
    "Retention Action": "Sensitive files deleted",
    "Updated At": now,
  });
  SpreadsheetApp.flush();
  return {
    success: true,
    recordId: recordId,
    sensitiveFilesDeletedAt: now,
    retentionAction: "Sensitive files deleted",
  };
}

function saveRentalApplication_(body) {
  if (!body.listingId) throw new Error("saveRentalApplication: listingId required");

  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var headerMap = getHeaderMap_(sheet);

  // Generate Record ID based on total existing rows (not just for this listing).
  var last = sheet.getLastRow();
  var existingCount = last >= 2 ? last - 1 : 0;
  var year = new Date().getFullYear();
  var num  = String(existingCount + 1).padStart(3, "0");
  var recordId = "APP-" + year + "-" + num;
  var submittedAt = new Date().toISOString();
  var applicationDownloadToken = generateUploadToken_();
  var applicationDownloadExpiresAt = getExpiryIso_(7);
  var supportingDocsValue = [
    body.proofOfIncome ? "Applicant: " + body.proofOfIncome : "",
    body.jointProofOfIncome ? "Joint Applicant: " + body.jointProofOfIncome : ""
  ].filter(Boolean).join(" | ");

  // Build data map.
  var dataMap = {
    // System
    "Record ID":    recordId,
    "Listing ID":   body.listingId,
    "Submitted At": submittedAt,
    // Applicant info
    "Applicant Name":  body.applicantName   || "",
    "Email":           body.email           || "",
    "Phone":           body.phone           || "",
    "Date of Birth":   body.dateOfBirth     || "",
    "Current Address": body.currentAddress  || "",
    "WeChat":          body.wechat          || "",
    // Employment
    "Employment Status": body.employmentStatus || "",
    "Employer":          body.employer         || "",
    "Monthly Income":    body.monthlyIncome    || "",
    // Reference & Credit
    "Landlord Reference": body.landlordReference || "",
    "Credit History":     body.creditHistory     || "",
    // Occupancy
    "Move-in Date":        body.moveInDate        || "",
    "Lease Term Requested": body.leaseTerm        || "",
    "Occupants":           body.occupants         || "",
    "Adults":              body.adults            || "",
    "Minors":              body.minors            || "",
    "Occupant Names Ages": body.occupantNamesAges || "",
    // Joint applicant
    "Has Joint Applicant":      body.hasJointApplicant      || "",
    "Joint Name":               body.jointName              || "",
    "Joint Phone":              body.jointPhone             || "",
    "Joint Email":              body.jointEmail             || "",
    "Joint DOB":                body.jointDob               || "",
    "Joint Address":            body.jointAddress           || "",
    "Joint Employment":         body.jointEmployment        || "",
    "Joint Income":             body.jointIncome            || "",
    "Joint Employer Contact":   body.jointEmployerContact   || "",
    "Joint Landlord Reference": body.jointLandlordReference || "",
    "Joint Credit Info":        body.jointCreditInfo        || "",
    "Joint Proof of Income":    body.jointProofOfIncome     || "",
    // Legacy joint applicant columns kept for sheet compatibility
    "Joint Applicant / Co-Applicant Information": body.hasJointApplicant || "",
    "Joint Applicant Full Legal Name": body.jointName || "",
    "Joint Applicant Phone Number": body.jointPhone || "",
    "Joint Applicant Email Address": body.jointEmail || "",
    "Joint Applicant's Date of Birth (DD/MM/YYYY)": body.jointDob || "",
    "Joint Applicant Current Address": body.jointAddress || "",
    "Joint Applicant Employment / Income Source": body.jointEmployment || "",
    "Joint Applicant Monthly Income": body.jointIncome || "",
    "Joint Applicant Employer Contact ": body.jointEmployerContact || "",
    "Joint Applicant Current Landlord Reference": body.jointLandlordReference || "",
    "Joint Applicant Credit Information": body.jointCreditInfo || "",
    // Deposit
    "Deposit Funds Available": body.depositFundsAvailable || "",
    "Deposit Agreement":       body.depositAgreement      || "",
    // Pets
    "Has Pets":         body.hasPets         || "",
    "Pet Deposit Funds": body.petDepositFunds || "",
    "Pet Details":      body.petDetails      || "",
    // Tenancy history
    "Eviction History": body.evictionHistory || "",
    // Smoking
    "Smokes Vapes Cannabis": body.smokesVapesCannabis || "",
    "No Smoking Agreement":  body.noSmokingAgreement  || "",
    // Documents
    "Proof of Income": body.proofOfIncome || "",
    "Indicate your and Joint Applicant willingness to provide supporting documents (e.g., proof of income, credit report).": supportingDocsValue,
    // Insurance
    "Has Tenant Insurance":        body.hasTenantInsurance        || "",
    "Tenant Insurance Agreement":  body.tenantInsuranceAgreement  || "",
    "Proof Insurance Before Move-in": body.proofInsuranceBeforeMoveIn || "",
    // Additional
    "Reason for Moving": body.reasonForMoving || "",
    "Parking Request":   body.parkingRequest  || "",
    "Additional Notes":  body.additionalNotes || "",
    // Admin
    "PDF URL":       "",
    "Application Download Token": applicationDownloadToken,
    "Application Download Expires At": applicationDownloadExpiresAt,
    "Review Status": "Pending",
    "Internal Notes": "",
    "Updated At":    submittedAt,
  };

  // Append initial row (without PDF URL yet).
  var numCols = Math.max(sheet.getLastColumn(), INTAKE_HEADERS.length);
  var row = new Array(numCols).fill("");
  for (var key in dataMap) {
    var idx = headerMap[key];
    if (idx !== undefined) row[idx] = dataMap[key];
  }
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  var newRowNumber = sheet.getLastRow();

  // Look up listing's Drive folder (Apps Script side, avoids passing folderId from client).
  var folderId = null;
  try {
    var listingsSheet = getSheet_(LISTINGS_SHEET);
    var lNumCols  = listingsSheet.getLastColumn();
    var lHeaderMap = getHeaderMap_(listingsSheet);
    var lLast = listingsSheet.getLastRow();
    if (lLast >= 2) {
      var lIds = listingsSheet.getRange(2, 1, lLast - 1, 1).getValues();
      for (var i = 0; i < lIds.length; i++) {
        if (lIds[i][0] === body.listingId) {
          var lRow = listingsSheet.getRange(i + 2, 1, 1, lNumCols).getValues()[0];
          var dfl  = colVal_(lRow, lHeaderMap, "Drive Folder Link");
          folderId = extractDriveFolderId_(dfl);
          break;
        }
      }
    }
  } catch (e) {
    Logger.log("[saveRentalApplication] Could not look up folderId: " + e.message);
  }

  // Generate PDF and upload to the listing's Applications archive folder.
  var pdfUrl = "";
  var pdfError = "";
  var subfolderUrl = "";
  try {
    var appFolder = getRentalApplicationArchiveFolder_(body.listingId, folderId);
    trySetDriveViewSharing_(appFolder, "archive folder");
    subfolderUrl = appFolder.getUrl();

    var pdfBlob = generateApplicationPdf_(dataMap, recordId);
    var pdfFileName = buildRentalApplicationPdfName_(
      recordId,
      body.listingId,
      body.applicantName || body.applicantFullName || "Applicant"
    );
    var existingPdf = appFolder.getFilesByName(pdfFileName);
    while (existingPdf.hasNext()) { existingPdf.next().setTrashed(true); }
    var pdfFile = appFolder.createFile(pdfBlob.setName(pdfFileName));
    trySetDriveViewSharing_(pdfFile, "pdf file");
    pdfUrl = pdfFile.getUrl();

    // Write PDF URL back to row.
    var pdfColIdx       = headerMap["PDF URL"];
    var updatedAtColIdx = headerMap["Updated At"];
    if (pdfColIdx !== undefined) {
      sheet.getRange(newRowNumber, pdfColIdx + 1).setValue(pdfUrl);
    }
    if (updatedAtColIdx !== undefined) {
      sheet.getRange(newRowNumber, updatedAtColIdx + 1).setValue(new Date().toISOString());
    }
    SpreadsheetApp.flush();
  } catch (e) {
    pdfError = e && e.message ? e.message : String(e);
    Logger.log("[saveRentalApplication] PDF/upload error: " + e.message);
    if (e && e.stack) Logger.log(e.stack);
  }

  return {
    success:      true,
    recordId:     recordId,
    pdfUrl:       pdfUrl,
    applicationDownloadToken: applicationDownloadToken,
    applicationDownloadExpiresAt: applicationDownloadExpiresAt,
    pdfError:     pdfError,
    subfolderUrl: subfolderUrl,
    submittedAt:  submittedAt,
  };
}

function generateApplicationPdf_(data, recordId) {
  var doc  = DocumentApp.create("temp_application_" + recordId);
  var body = doc.getBody();
  var hasJointApplicant = isAffirmativeJointApplicant_(
    data["Has Joint Applicant"] || data["Joint Applicant / Co-Applicant Information"] || ""
  );
  var jointEmployment = extractJointEmploymentParts_(data["Joint Employment"] || data["Joint Applicant Employment / Income Source"]);
  var jointProofOfIncome = data["Joint Proof of Income"] || extractSupportingDocsChoice_(
    data["Indicate your and Joint Applicant willingness to provide supporting documents (e.g., proof of income, credit report)."],
    "Joint Applicant"
  );

  function field(label, key) {
    body.appendParagraph(label + ": " + (data[key] || "—"));
  }
  function fieldValue(label, value) {
    body.appendParagraph(label + ": " + (value || "—"));
  }
  function section(title) {
    body.appendParagraph("");
    body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  }

  body.appendParagraph("RESIDENTIAL TENANCY APPLICATION").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("");
  body.appendParagraph("Record ID:    " + (data["Record ID"] || recordId));
  body.appendParagraph("Listing ID:   " + (data["Listing ID"] || ""));
  body.appendParagraph("Submitted At: " + (data["Submitted At"] || ""));

  section("APPLICANT INFORMATION");
  field("Name",             "Applicant Name");
  field("Email",            "Email");
  field("Phone",            "Phone");
  field("Date of Birth",    "Date of Birth");
  field("Current Address",  "Current Address");
  field("WeChat",           "WeChat");

  section("EMPLOYMENT / INCOME");
  field("Employment Status", "Employment Status");
  field("Employer",          "Employer");
  field("Monthly Income",    "Monthly Income");

  section("LANDLORD REFERENCE & CREDIT");
  field("Landlord Reference", "Landlord Reference");
  field("Credit History",     "Credit History");

  section("MOVE-IN & OCCUPANCY");
  field("Preferred Move-in Date", "Move-in Date");
  field("Lease Term",             "Lease Term Requested");
  field("Total Occupants",        "Occupants");
  field("Adults",                 "Adults");
  field("Minors",                 "Minors");
  field("Occupant Names & Ages",  "Occupant Names Ages");

  if (hasJointApplicant) {
    section("JOINT APPLICANT");
    field("Joint Applicant Name",             "Joint Name");
    field("Joint Applicant Phone",            "Joint Phone");
    field("Joint Applicant Email",            "Joint Email");
    field("Joint Applicant DOB",              "Joint DOB");
    field("Joint Applicant Address",          "Joint Address");
    fieldValue("Joint Applicant Employment Status", jointEmployment.status);
    fieldValue("Joint Applicant Employer / Income Source", jointEmployment.source);
    field("Joint Applicant Monthly Income",   "Joint Income");
    field("Joint Applicant Employer Contact", "Joint Employer Contact");
    field("Joint Applicant Landlord Ref",     "Joint Landlord Reference");
    field("Joint Applicant Credit History",   "Joint Credit Info");
    fieldValue("Joint Applicant Proof of Income", jointProofOfIncome);
  }

  section("LEASE & DEPOSIT");
  field("Deposit Funds Available", "Deposit Funds Available");
  field("Deposit Agreement",       "Deposit Agreement");

  section("PETS");
  field("Has Pets",         "Has Pets");
  field("Pet Deposit Funds", "Pet Deposit Funds");
  field("Pet Details",       "Pet Details");

  section("TENANCY HISTORY");
  field("Eviction History", "Eviction History");

  section("SMOKING / VAPING / CANNABIS");
  field("Smokes/Vapes/Cannabis", "Smokes Vapes Cannabis");
  field("No Smoking Agreement",  "No Smoking Agreement");

  section("SUPPORTING DOCUMENTS");
  field("Can Provide Proof of Income", "Proof of Income");

  section("TENANT INSURANCE");
  field("Has Tenant Insurance",          "Has Tenant Insurance");
  field("Insurance Agreement",           "Tenant Insurance Agreement");
  field("Proof of Insurance Before Move-in", "Proof Insurance Before Move-in");

  section("ADDITIONAL INFORMATION");
  field("Reason for Moving", "Reason for Moving");
  field("Parking Request",   "Parking Request");
  field("Additional Notes",  "Additional Notes");

  doc.saveAndClose();
  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs("application/pdf");
  docFile.setTrashed(true);
  return pdfBlob;
}

function getApplicationsByListing_(listingId, auth) {
  if (!listingId) throw new Error("getApplicationsByListing: listingId required");
  getListingById_(listingId, auth);
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows      = sheet.getRange(2, 1, last - 1, numCols).getValues();
  return rows
    .filter(function(row) { return colVal_(row, headerMap, "Listing ID") === listingId; })
    .map(function(row) { return rowToApplication_(row, headerMap); });
}

function getAllApplications_(auth) {
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows      = sheet.getRange(2, 1, last - 1, numCols).getValues();
  return rows
    .filter(function(row) { return !!colVal_(row, headerMap, "Record ID"); })
    .map(function(row) { return rowToApplication_(row, headerMap); })
    .filter(function(app) {
      if (!auth || auth.mode === "admin") return true;
      return !!findListingByIdForEmail_(app.listingId, auth.email);
    });
}

function getApplicationById_(applicationId, auth) {
  if (!applicationId) throw new Error("getApplicationById: applicationId required");
  var sheet = getSheet_(INTAKE_SHEET);
  var last  = sheet.getLastRow();
  if (last < 2) throw new Error("No application records found");
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows      = sheet.getRange(2, 1, last - 1, numCols).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (colVal_(rows[i], headerMap, "Record ID") === applicationId) {
      var app = rowToApplication_(rows[i], headerMap);
      if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
        throw new Error("Access denied for this listing.");
      }
      return app;
    }
  }
  throw new Error("Application not found: " + applicationId);
}

function getApplicationPdfDownloadData_(recordId, token) {
  if (!recordId) throw new Error("getApplicationPdfDownloadData: recordId required");
  if (!token) throw new Error("This download link is invalid or expired.");
  var found = findApplicationRowByRecordId_(recordId);
  if (!found.app.applicationDownloadToken || String(found.app.applicationDownloadToken) !== String(token)) {
    throw new Error("This download link is invalid or expired.");
  }
  if (isExpiredIso_(found.app.applicationDownloadExpiresAt)) expiredLinkError_();
  var pdfUrl = found.app.pdfUrl;
  if (!pdfUrl) throw new Error("No submitted application PDF found for: " + recordId);
  var fileId = extractDriveFileId_(pdfUrl);
  if (!fileId) throw new Error("Could not read PDF file ID from saved PDF URL.");
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  return {
    recordId: recordId,
    fileName: sanitizePdfFilePart_(recordId, "application") + "-application.pdf",
    mimeType: blob.getContentType() || "application/pdf",
    data: Utilities.base64Encode(blob.getBytes()),
  };
}

function updateApplicationStatus_(applicationId, reviewStatus, auth) {
  if (!applicationId) throw new Error("updateApplicationStatus: applicationId required");
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No records found");
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var ids       = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === applicationId) {
      var row = sheet.getRange(i + 2, 1, 1, numCols).getValues()[0];
      var app = rowToApplication_(row, headerMap);
      if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
        throw new Error("Access denied for this listing.");
      }
      var rowNumber = i + 2;
      var statusColIdx    = headerMap["Review Status"];
      var updatedAtColIdx = headerMap["Updated At"];
      if (statusColIdx !== undefined) {
        sheet.getRange(rowNumber, statusColIdx + 1).setValue(reviewStatus);
      }
      if (updatedAtColIdx !== undefined) {
        sheet.getRange(rowNumber, updatedAtColIdx + 1).setValue(new Date().toISOString());
      }
      SpreadsheetApp.flush();
      return { success: true, recordId: applicationId, reviewStatus: reviewStatus };
    }
  }
  throw new Error("Application not found: " + applicationId);
}

function updateApplicationNotes_(applicationId, notes, auth) {
  if (!applicationId) throw new Error("updateApplicationNotes: applicationId required");
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No records found");
  var headerMap = getHeaderMap_(sheet);
  var ids       = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === applicationId) {
      var row = sheet.getRange(i + 2, 1, 1, sheet.getLastColumn()).getValues()[0];
      var app = rowToApplication_(row, headerMap);
      if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
        throw new Error("Access denied for this listing.");
      }
      var rowNumber       = i + 2;
      var notesColIdx     = headerMap["Internal Notes"];
      var updatedAtColIdx = headerMap["Updated At"];
      if (notesColIdx !== undefined) {
        sheet.getRange(rowNumber, notesColIdx + 1).setValue(notes || "");
      }
      if (updatedAtColIdx !== undefined) {
        sheet.getRange(rowNumber, updatedAtColIdx + 1).setValue(new Date().toISOString());
      }
      SpreadsheetApp.flush();
      return { success: true, recordId: applicationId };
    }
  }
  throw new Error("Application not found: " + applicationId);
}

// ── Upload into a subfolder of the listing's own Drive folder ─────────────────
// body: { folderId, subfolderName (optional), fileName, mimeType, data (base64) }
//
// subfolderName examples:
//   ""                     → listing folder root  (Add More Photos)
//   "02_AI_Enhanced_Photos" → AI-beautified images
//   "03_Cover_Images"       → social media covers
//   "04_Video_Output"       → video exports
//
// Subfolders are created on first use; existing ones are reused.
// Original photos in the folder root are never moved or modified.

function uploadToSubfolder_(body, auth) {
  if (!body.folderId) throw new Error("uploadToSubfolder: folderId required");
  if (!body.data)     throw new Error("uploadToSubfolder: base64 data required");
  assertFolderAccess_(body.folderId, body.listingId || "", auth);

  var parent = DriveApp.getFolderById(body.folderId);

  var target;
  if (body.subfolderName) {
    var it = parent.getFoldersByName(body.subfolderName);
    target = it.hasNext() ? it.next() : parent.createFolder(body.subfolderName);
  } else {
    target = parent;
  }

  // Delete any existing file with the same name so re-runs overwrite cleanly.
  var fileName = body.fileName || ("upload_" + Date.now());
  var existing = target.getFilesByName(fileName);
  while (existing.hasNext()) { existing.next().setTrashed(true); }

  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mimeType || "application/octet-stream",
    fileName
  );
  var file = target.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  return {
    fileId:          fileId,
    url:             file.getUrl(),
    thumbUrl:        "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400",
    fileName:        blob.getName(),
    subfolderFolderId: target.getId(),
    subfolderUrl:    target.getUrl(),
  };
}

// ── Cloudinary Video Upload ───────────────────────────────────────────────────
//
// Uploads a Google Drive video file to Cloudinary by URL (Cloudinary fetches
// the file directly — no byte transfer through Apps Script).
// On success, writes the Cloudinary secure_url to the publicVideoUrl column.
// On failure, logs the error and returns { success: false, error: ... }.
//
// Requires these rows in "08 System Settings":
//   CLOUDINARY_CLOUD_NAME   → your cloud name
//   CLOUDINARY_API_KEY      → numeric API key
//   CLOUDINARY_API_SECRET   → API secret
//
function uploadVideoToCloudinary_(driveFileId, listingId) {
  if (!driveFileId) throw new Error("uploadVideoToCloudinary: driveFileId required");
  if (!listingId)   throw new Error("uploadVideoToCloudinary: listingId required");

  // ── 1. Read Cloudinary credentials from System Settings ──────────────────
  var cloudName = getSystemSetting_("CLOUDINARY_CLOUD_NAME");
  var apiKey    = getSystemSetting_("CLOUDINARY_API_KEY");
  var apiSecret = getSystemSetting_("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    Logger.log("[uploadVideoToCloudinary] Missing Cloudinary credentials in 08 System Settings");
    return { success: false, error: "Missing Cloudinary credentials" };
  }

  // ── 2. Build the Drive direct-download URL ────────────────────────────────
  var fileUrl = "https://drive.google.com/uc?export=download&id=" + driveFileId;

  // ── 3. Build signed upload parameters ────────────────────────────────────
  var publicId  = "listings/" + listingId + "/video";
  var timestamp = Math.floor(Date.now() / 1000).toString();

  // Parameters to sign: ONLY the params that go into the signature string.
  // Exclude: file, api_key, resource_type, cloud_name — Cloudinary ignores those.
  var sigParams = {
    overwrite:  "true",
    public_id:  publicId,
    timestamp:  timestamp,
  };

  // Build the string-to-sign: "key1=val1&key2=val2...{secret}" (no trailing &)
  var paramKeys = Object.keys(sigParams).sort();
  var sigStr = paramKeys.map(function(k) { return k + "=" + sigParams[k]; }).join("&") + apiSecret;

  // Cloudinary requires SHA-1, not SHA-256.
  var sigBytes  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, sigStr, Utilities.Charset.UTF_8);
  var signature = sigBytes.map(function(b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");

  // ── 4. POST to Cloudinary Upload API (resource_type: video) ──────────────
  var uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/video/upload";

  var payload = {
    file:          fileUrl,
    public_id:     publicId,
    overwrite:     "true",
    api_key:       apiKey,
    timestamp:     timestamp,
    signature:     signature,
    resource_type: "video",
  };

  Logger.log("[uploadVideoToCloudinary] listingId   : " + listingId);
  Logger.log("[uploadVideoToCloudinary] driveFileId : " + driveFileId);
  Logger.log("[uploadVideoToCloudinary] public_id   : " + publicId);

  var response;
  try {
    response = UrlFetchApp.fetch(uploadUrl, {
      method:             "post",
      payload:            payload,
      muteHttpExceptions: true,
    });
  } catch (fetchErr) {
    Logger.log("[uploadVideoToCloudinary] UrlFetch error: " + fetchErr.message);
    return { success: false, error: fetchErr.message };
  }

  var code = response.getResponseCode();
  var body = response.getContentText();
  Logger.log("[uploadVideoToCloudinary] HTTP " + code + " — " + body.substring(0, 300));

  if (code !== 200) {
    return { success: false, error: "Cloudinary HTTP " + code, body: body };
  }

  var parsed;
  try { parsed = JSON.parse(body); } catch (_) {
    return { success: false, error: "Cloudinary response not JSON", body: body };
  }

  var secureUrl = parsed.secure_url;
  if (!secureUrl) {
    return { success: false, error: "Cloudinary response missing secure_url", body: body };
  }

  // ── 5. Write publicVideoUrl back to the sheet ─────────────────────────────
  try {
    updatePublicVideoUrl_(listingId, secureUrl);
    Logger.log("[uploadVideoToCloudinary] publicVideoUrl written: " + secureUrl);
  } catch (writeErr) {
    Logger.log("[uploadVideoToCloudinary] Failed to write publicVideoUrl: " + writeErr.message);
    return { success: false, error: writeErr.message };
  }

  return { success: true, listingId: listingId, publicVideoUrl: secureUrl };
}

// Write the Cloudinary CDN URL to the publicVideoUrl column.
function updatePublicVideoUrl_(listingId, publicVideoUrl) {
  var sheet = getSheet_(LISTINGS_SHEET);
  addMissingHeaders_(sheet, LISTING_HEADERS);
  var headerMap = getHeaderMap_(sheet);
  var colIdx    = headerMap["publicVideoUrl"];
  if (colIdx === undefined) throw new Error("publicVideoUrl column not found after addMissingHeaders_");

  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No listing rows found");

  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === listingId) {
      sheet.getRange(i + 2, colIdx + 1).setValue(publicVideoUrl);
      SpreadsheetApp.flush();
      return;
    }
  }
  throw new Error("Listing not found: " + listingId);
}

// ── Migration: upload existing Drive videos to Cloudinary ────────────────────
//
// Run once from the Apps Script editor:
//   1. Open Extensions → Apps Script
//   2. Select "migrateExistingVideos" from the function dropdown
//   3. Click Run
//   4. View → Logs to see progress
//
// Skips rows with no listingId, no videoUrl, or publicVideoUrl already set.
//
function migrateExistingVideos() {
  return migrateExistingVideos_();
}

function migrateExistingVideos_() {
  var sheet     = getSheet_(LISTINGS_SHEET);
  var headerMap = getHeaderMap_(sheet);
  var last      = sheet.getLastRow();
  if (last < 2) { Logger.log("[migrateExistingVideos] No rows found"); return []; }

  var numCols = sheet.getLastColumn();
  var rows    = sheet.getRange(2, 1, last - 1, numCols).getValues();
  var results = [];

  for (var i = 0; i < rows.length; i++) {
    var row       = rows[i];
    var listingId = String(row[headerMap["Listing ID"]] || "").trim();
    var videoUrl  = String(row[headerMap["videoUrl"]]   || "").trim();
    var pubUrl    = String(row[headerMap["publicVideoUrl"]] || "").trim();

    if (!listingId) {
      Logger.log("[migrateExistingVideos] row " + (i + 2) + ": no listingId, skip");
      continue;
    }
    if (!videoUrl) {
      Logger.log("[migrateExistingVideos] " + listingId + ": no videoUrl, skip");
      results.push({ id: listingId, skipped: true, reason: "no videoUrl" });
      continue;
    }
    if (pubUrl) {
      Logger.log("[migrateExistingVideos] " + listingId + ": publicVideoUrl already set, skip");
      results.push({ id: listingId, skipped: true, reason: "already has publicVideoUrl" });
      continue;
    }

    var fileId = extractDriveVideoFileId_(videoUrl);
    if (!fileId) {
      Logger.log("[migrateExistingVideos] " + listingId + ": could not extract fileId from: " + videoUrl);
      results.push({ id: listingId, success: false, error: "cannot extract Drive fileId" });
      continue;
    }

    Logger.log("[migrateExistingVideos] " + listingId + ": uploading fileId=" + fileId);
    try {
      var r = uploadVideoToCloudinary_(fileId, listingId);
      Logger.log("[migrateExistingVideos] " + listingId + ": " + JSON.stringify(r));
      results.push(r);
    } catch (e) {
      Logger.log("[migrateExistingVideos] " + listingId + " error: " + e.message);
      results.push({ id: listingId, success: false, error: e.message });
    }

    if (i < rows.length - 1) Utilities.sleep(2000);
  }

  Logger.log("[migrateExistingVideos] Done. " + results.length + " processed.");
  return results;
}

// Extract a Google Drive file ID from common Drive URL formats:
//   https://drive.google.com/file/d/{id}/view...
//   https://drive.google.com/open?id={id}
//   https://drive.google.com/uc?id={id}
function extractDriveVideoFileId_(url) {
  if (!url) return null;
  var m;
  // /file/d/{id}
  m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  // ?id={id} or &id={id}
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}
