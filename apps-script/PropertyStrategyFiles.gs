// ============================================================
//  AI Property Strategy Assessment — File Upload Backend
//  Spreadsheet : existing PROPERTY_STRATEGY_SPREADSHEET_ID (declared in Code.gs)
//  Sheet       : Assessment_Files — this ALREADY EXISTED, hand-authored, with
//                14 columns, before this file was written. It was never wired
//                to any upload code (0 data rows). This module reuses it as-is
//                and never creates, renames, or reorders its header row.
//  New folder  : "Property Strategy Files" (created once, sibling of the
//                existing Reports output folder)
//
//  This file is ADDITIVE, mirroring DisputeReview.gs's isolation pattern: it
//  never reads or writes Dispute_Reviews, Dispute_Files, or the "Dispute
//  Files" / "Dispute Reports" Drive folders, and it never modifies the
//  existing Strategy_Assessments header row. Property Strategy source
//  material (photos, floor plans, bylaws, etc.) is kept in Assessment_Files
//  and its own Drive folder, separate from the AI-generated report PDFs.
//
//  Columns this code writes (a subset of the 14 that already exist):
//    Assessment ID, File ID, Uploaded At, File Type, File Name,
//    Google Drive URL, Photo Category, Room / Area (optional)
//  Columns that already exist but this code never writes (reserved for a
//  later AI-vision / admin-curation phase — see Task 3 in the project notes):
//    AI Image Notes, Visible Strengths, Visible Concerns, Use in Report,
//    Sort Order, Internal Notes
// ============================================================

var PROPERTY_STRATEGY_FILES_SHEET = "Assessment_Files";
var PROPERTY_STRATEGY_FILES_FOLDER_NAME = "Property Strategy Files";
var PROPERTY_STRATEGY_FILES_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
var PROPERTY_STRATEGY_FILES_MAX_PER_ASSESSMENT = 25;
var PROPERTY_STRATEGY_FILES_ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];

// The columns this backend writes. Verify/init both resolve against this
// list only — it is checked against the sheet's live header row and never
// used to create or reorder a column.
var PROPERTY_STRATEGY_FILES_REQUIRED_COLUMNS = [
  "Assessment ID", "File ID", "Uploaded At", "File Type", "File Name",
  "Google Drive URL", "Photo Category"
];
// Present in the sheet, optional to fill: "Room / Area" (user-provided) plus
// AI/admin-curation columns the upload path deliberately leaves blank.

var PROPERTY_STRATEGY_FILE_CATEGORIES = [
  "Photo", "Floor Plan", "Rental Advertisement",
  "Strata Bylaws / Rental Restriction", "Property Details", "Utility Information",
  "Inspection / Condition Record", "Owner Instructions",
  "Comparable Rental Information", "Other"
];

// Assessment IDs always look like PSA-YYYYMMDD-HHMMSS (see
// generatePropertyStrategyAssessmentId_ in Code.gs). Anything else is
// rejected before it ever reaches Drive or the sheet.
var PROPERTY_STRATEGY_ASSESSMENT_ID_PATTERN = /^PSA-\d{8}-\d{6}$/;

function isValidPropertyStrategyAssessmentId_(value) {
  return PROPERTY_STRATEGY_ASSESSMENT_ID_PATTERN.test(String(value || "").trim());
}

// ── Storage discovery (read-only; safe to call from any request path) ──────

function findPropertyStrategyFilesFolder_() {
  var reportsFolder = DriveApp.getFolderById(PROPERTY_STRATEGY_REPORTS_FOLDER_ID);
  var parents = reportsFolder.getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var existing = parent.getFoldersByName(PROPERTY_STRATEGY_FILES_FOLDER_NAME);
  return existing.hasNext() ? existing.next() : null;
}

function findPropertyStrategyFilesSheet_() {
  var ss = SpreadsheetApp.openById(PROPERTY_STRATEGY_SPREADSHEET_ID);
  return ss.getSheetByName(PROPERTY_STRATEGY_FILES_SHEET);
}

// Throws a clear error instead of a raw Drive/Sheets exception when the
// one-time setup has not been run yet in this environment.
function getPropertyStrategyFilesFolder_() {
  var folder = findPropertyStrategyFilesFolder_();
  if (!folder) {
    throw new Error('"' + PROPERTY_STRATEGY_FILES_FOLDER_NAME + '" Drive folder does not exist yet. Run setupPropertyStrategyFileStorage() once from the Apps Script editor.');
  }
  return folder;
}

function getPropertyStrategyFilesSheet_() {
  var sheet = findPropertyStrategyFilesSheet_();
  if (!sheet) {
    throw new Error('"' + PROPERTY_STRATEGY_FILES_SHEET + '" sheet was not found in the spreadsheet.');
  }
  return sheet;
}

function propertyStrategyFilesHeaders_(sheet) {
  if (sheet.getLastColumn() < 1) throw new Error('"' + sheet.getName() + '" is missing a header row.');
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
    return String(h == null ? "" : h).trim();
  });
}

// Read-only. Safe to call any time (e.g. an admin diagnostics action) — never
// creates or modifies anything.
function verifyPropertyStrategyFileStorage() {
  var folder = findPropertyStrategyFilesFolder_();
  var sheet = findPropertyStrategyFilesSheet_();
  var problems = [];
  var headers = [];

  if (!folder) {
    problems.push('Drive folder "' + PROPERTY_STRATEGY_FILES_FOLDER_NAME + '" does not exist yet. Run setupPropertyStrategyFileStorage() once.');
  }
  if (!sheet) {
    problems.push('Sheet "' + PROPERTY_STRATEGY_FILES_SHEET + '" was not found in the spreadsheet.');
  } else {
    headers = propertyStrategyFilesHeaders_(sheet);
    PROPERTY_STRATEGY_FILES_REQUIRED_COLUMNS.forEach(function (col) {
      if (headers.indexOf(col) < 0) problems.push('Sheet "' + PROPERTY_STRATEGY_FILES_SHEET + '" is missing column "' + col + '".');
    });
  }

  var result = {
    ok: problems.length === 0,
    problems: problems,
    folderId: folder ? folder.getId() : "",
    sheetName: sheet ? sheet.getName() : "",
    headers: headers
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ── One-time controlled initialization ──────────────────────────────────────
// Not wired to any action / doPost path. Must be run manually, once, from the
// Apps Script editor (select this function → Run). Idempotent: safe to run
// again later. Assessment_Files already exists (hand-authored, 14 columns) so
// this never creates or modifies that sheet — it only creates the Drive
// folder, and only if missing. Strategy_Assessments is never touched either.
function setupPropertyStrategyFileStorage() {
  var ss = SpreadsheetApp.openById(PROPERTY_STRATEGY_SPREADSHEET_ID);

  // 1. Read everything that already exists before creating anything.
  var existingSheetNames = ss.getSheets().map(function (s) { return s.getName(); });
  var assessmentsSheetBefore = ss.getSheetByName(PROPERTY_STRATEGY_ASSESSMENTS_SHEET);
  var assessmentsHeadersBefore = assessmentsSheetBefore
    ? assessmentsSheetBefore.getRange(1, 1, 1, assessmentsSheetBefore.getLastColumn()).getValues()[0]
    : [];

  var filesSheet = ss.getSheetByName(PROPERTY_STRATEGY_FILES_SHEET);
  if (!filesSheet) {
    throw new Error('Expected sheet "' + PROPERTY_STRATEGY_FILES_SHEET + '" was not found. This function reuses that existing, hand-authored sheet and deliberately does not create a new one.');
  }

  var folderCreated = false;
  var folder = findPropertyStrategyFilesFolder_();
  if (!folder) {
    var reportsFolder = DriveApp.getFolderById(PROPERTY_STRATEGY_REPORTS_FOLDER_ID);
    var parents = reportsFolder.getParents();
    var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
    folder = parent.createFolder(PROPERTY_STRATEGY_FILES_FOLDER_NAME);
    folderCreated = true;
  }

  // Confirm Strategy_Assessments was never touched by this run.
  var assessmentsSheetAfter = ss.getSheetByName(PROPERTY_STRATEGY_ASSESSMENTS_SHEET);
  var assessmentsHeadersAfter = assessmentsSheetAfter
    ? assessmentsSheetAfter.getRange(1, 1, 1, assessmentsSheetAfter.getLastColumn()).getValues()[0]
    : [];
  var assessmentsUnchanged = JSON.stringify(assessmentsHeadersBefore) === JSON.stringify(assessmentsHeadersAfter);

  var headers = propertyStrategyFilesHeaders_(filesSheet);
  var missing = PROPERTY_STRATEGY_FILES_REQUIRED_COLUMNS.filter(function (col) { return headers.indexOf(col) < 0; });

  var result = {
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderCreated: folderCreated,
    sheetName: filesSheet.getName(),
    sheetCreated: false,
    headers: headers,
    missingRequiredColumns: missing,
    existingSheetNamesBeforeRun: existingSheetNames,
    strategyAssessmentsHeaderCountBefore: assessmentsHeadersBefore.length,
    strategyAssessmentsUnchanged: assessmentsUnchanged
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function propertyStrategyText_(value) {
  return String(value == null ? "" : value).trim();
}

// Each assessment gets its own subfolder under "Property Strategy Files".
function getPropertyStrategyAssessmentFolder_(assessmentId) {
  var parent = getPropertyStrategyFilesFolder_();
  var existing = parent.getFoldersByName(assessmentId);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(assessmentId);
}

// Blocks path traversal and other unsafe characters while still preserving
// the original filename for display/round-trip purposes.
function sanitizePropertyStrategyFileName_(name) {
  var clean = String(name || "").replace(/[\/\\]/g, "_").replace(/\.\./g, "_").trim();
  if (!clean) throw new Error("File name is required.");
  return clean;
}

function propertyStrategyFileExtension_(fileName) {
  var name = String(fileName || "");
  return name.indexOf(".") >= 0 ? name.split(".").pop().toLowerCase() : "";
}

function validatePropertyStrategyFile_(fileName, fileSize) {
  var name = sanitizePropertyStrategyFileName_(fileName);
  var ext = propertyStrategyFileExtension_(name);
  if (PROPERTY_STRATEGY_FILES_ALLOWED_EXTENSIONS.indexOf(ext) < 0) {
    throw new Error("Unsupported file type: ." + ext + ". Allowed: " + PROPERTY_STRATEGY_FILES_ALLOWED_EXTENSIONS.join(", ") + ".");
  }
  var size = Number(fileSize || 0);
  if (size > PROPERTY_STRATEGY_FILES_MAX_FILE_BYTES) {
    throw new Error("File is larger than the 15 MB limit.");
  }
  return name;
}

function countPropertyStrategyFilesForAssessment_(assessmentId) {
  var sheet = getPropertyStrategyFilesSheet_();
  if (sheet.getLastRow() < 2) return 0;
  var headers = propertyStrategyFilesHeaders_(sheet);
  var col = headers.indexOf("Assessment ID");
  if (col < 0) return 0;
  var values = sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1).getValues();
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (propertyStrategyText_(values[i][0]) === assessmentId) count++;
  }
  return count;
}

function findPropertyStrategyFileRow_(sheet, headers, assessmentId, fileId) {
  if (sheet.getLastRow() < 2) return 0;
  var assessmentCol = headers.indexOf("Assessment ID");
  var fileCol = headers.indexOf("File ID");
  if (assessmentCol < 0 || fileCol < 0) return 0;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (propertyStrategyText_(values[i][assessmentCol]) === assessmentId &&
        propertyStrategyText_(values[i][fileCol]) === fileId) {
      return i + 2;
    }
  }
  return 0;
}

function generatePropertyStrategyFileId_() {
  return "PSF-" + new Date().getTime() + "-" + Math.floor(Math.random() * 900 + 100);
}

// ── Actions ───────────────────────────────────────────────────────────────────

// Reserves/reuses the Assessment ID's Drive subfolder before any file is
// uploaded, mirroring startDisputeReview_. Does not write to Strategy_Assessments.
function startPropertyStrategyAssessment_(payload) {
  payload = payload || {};
  var assessmentId = propertyStrategyText_(payload.assessmentId) || generatePropertyStrategyAssessmentId_();
  if (!isValidPropertyStrategyAssessmentId_(assessmentId)) {
    throw new Error("Invalid Assessment ID format.");
  }
  var folder = getPropertyStrategyAssessmentFolder_(assessmentId);
  return {
    assessmentId: assessmentId,
    fileFolderUrl: folder.getUrl(),
    maxFiles: PROPERTY_STRATEGY_FILES_MAX_PER_ASSESSMENT,
    maxFileBytes: PROPERTY_STRATEGY_FILES_MAX_FILE_BYTES,
    allowedExtensions: PROPERTY_STRATEGY_FILES_ALLOWED_EXTENSIONS,
    categories: PROPERTY_STRATEGY_FILE_CATEGORIES
  };
}

function uploadPropertyStrategyFile_(body) {
  body = body || {};
  var assessmentId = propertyStrategyText_(body.assessmentId);
  if (!isValidPropertyStrategyAssessmentId_(assessmentId)) {
    throw new Error("A valid Assessment ID is required.");
  }
  if (!body.data) throw new Error("File data is required.");

  var fileName = validatePropertyStrategyFile_(body.fileName, body.fileSize);

  if (countPropertyStrategyFilesForAssessment_(assessmentId) >= PROPERTY_STRATEGY_FILES_MAX_PER_ASSESSMENT) {
    throw new Error("You can upload at most " + PROPERTY_STRATEGY_FILES_MAX_PER_ASSESSMENT + " files.");
  }

  // The client never supplies a Drive folder — the server derives it solely
  // from the (validated) Assessment ID.
  var folder = getPropertyStrategyAssessmentFolder_(assessmentId);
  var mimeType = propertyStrategyText_(body.mimeType) || "application/octet-stream";
  var bytes = Utilities.base64Decode(body.data);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var driveFile = folder.createFile(blob);

  var fileId = generatePropertyStrategyFileId_();
  var uploadedAt = new Date().toISOString();
  var category = propertyStrategyText_(body.category) || "Other";
  var roomArea = propertyStrategyText_(body.roomArea);
  var fileType = propertyStrategyFileExtension_(fileName).toUpperCase();

  var sheet = getPropertyStrategyFilesSheet_();
  var headers = propertyStrategyFilesHeaders_(sheet);
  var record = {
    "Assessment ID": assessmentId,
    "File ID": fileId,
    "Uploaded At": uploadedAt,
    "File Type": fileType,
    "File Name": fileName,
    "Google Drive URL": driveFile.getUrl(),
    "Photo Category": category,
    "Room / Area": roomArea
    // AI Image Notes / Visible Strengths / Visible Concerns / Use in Report /
    // Sort Order / Internal Notes are intentionally left blank here — this
    // upload path never analyzes file content and never writes a curation
    // decision on the user's behalf.
  };
  var row = headers.map(function (h) { return record.hasOwnProperty(h) ? record[h] : ""; });
  sheet.appendRow(row);

  return {
    fileId: fileId,
    fileName: fileName,
    category: category,
    roomArea: roomArea,
    driveUrl: driveFile.getUrl(),
    uploadedAt: uploadedAt
  };
}

function deletePropertyStrategyFile_(body) {
  body = body || {};
  var assessmentId = propertyStrategyText_(body.assessmentId);
  var fileId = propertyStrategyText_(body.fileId);
  if (!isValidPropertyStrategyAssessmentId_(assessmentId)) throw new Error("A valid Assessment ID is required.");
  if (!fileId) throw new Error("File ID is required.");

  var sheet = getPropertyStrategyFilesSheet_();
  var headers = propertyStrategyFilesHeaders_(sheet);
  var rowNumber = findPropertyStrategyFileRow_(sheet, headers, assessmentId, fileId);
  if (!rowNumber) throw new Error("File not found for this assessment.");

  var driveUrlCol = headers.indexOf("Google Drive URL");
  var driveUrl = driveUrlCol >= 0 ? sheet.getRange(rowNumber, driveUrlCol + 1).getValue() : "";
  var match = String(driveUrl || "").match(/[-\w]{25,}/);
  if (match) {
    try {
      DriveApp.getFileById(match[0]).setTrashed(true);
    } catch (ex) {
      Logger.log("[deletePropertyStrategyFile_] Drive trash failed for " + fileId + ": " + ex);
    }
  }

  // Assessment_Files has no "Upload Status" column, so a delete removes the
  // row outright rather than leaving a status marker behind.
  sheet.deleteRow(rowNumber);

  return { fileId: fileId, deleted: true };
}

function getPropertyStrategyFiles_(body) {
  body = body || {};
  var assessmentId = propertyStrategyText_(body.assessmentId);
  if (!isValidPropertyStrategyAssessmentId_(assessmentId)) throw new Error("A valid Assessment ID is required.");

  var sheet = getPropertyStrategyFilesSheet_();
  if (sheet.getLastRow() < 2) return { files: [] };
  var headers = propertyStrategyFilesHeaders_(sheet);
  var assessmentCol = headers.indexOf("Assessment ID");
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();

  var files = [];
  for (var i = 0; i < values.length; i++) {
    if (propertyStrategyText_(values[i][assessmentCol]) !== assessmentId) continue;
    var record = {};
    headers.forEach(function (h, idx) { record[h] = values[i][idx]; });
    files.push(record);
  }
  return { files: files };
}

