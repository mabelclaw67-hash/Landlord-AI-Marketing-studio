// ============================================================
//  AI Dispute Review — Apps Script Backend
//  Drive folder  : 07 AI Dispute Review
//                  1iIMToPAg8EBjiWs-fprXBZW_tpycJ000
//  Spreadsheet   : AI Dispute Review - Data Tables
//                  1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90
//
//  This file is ADDITIVE. It never reads or writes the Property
//  Strategy Assessment spreadsheet, and legal/dispute evidence is
//  stored only under "07 AI Dispute Review", never in a property
//  listing folder.
//
//  The spreadsheet is the SINGLE SOURCE OF TRUTH for the schema.
//  Nothing here creates, renames, reorders or deletes a sheet, a
//  header, or any reference row. Every write resolves its target
//  column by reading the live header row first; a column this code
//  does not recognise is left untouched.
// ============================================================

var DISPUTE_REVIEW_FOLDER_ID       = "1iIMToPAg8EBjiWs-fprXBZW_tpycJ000";
var DISPUTE_REVIEW_SPREADSHEET_ID  = "1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90";
var DISPUTE_FILES_FOLDER_ID        = "1-HGl9Y7g2BfZ6y3XbqXoU05hB7j30l91";
var DISPUTE_REPORTS_FOLDER_ID      = "1uE6oyIGmgzsQggv6W6Jg3DQ6srruYlQc";

var DISPUTE_REVIEWS_SHEET = "Dispute_Reviews";
var DISPUTE_FILES_SHEET   = "Dispute_Files";

var DISPUTE_MAX_FILES_PER_REVIEW = 25;
var DISPUTE_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
var DISPUTE_ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic", "webp", "doc", "docx", "txt", "csv", "xls", "xlsx"];

var DISPUTE_DISCLAIMER_EN = "This report is a preliminary AI-assisted review based on the information and documents provided. It is not legal advice and does not guarantee any tribunal or court outcome. Final conclusions require professional review and verification of current laws, rules, deadlines, and evidence.";
var DISPUTE_DISCLAIMER_ZH = "本报告是基于所提供的信息和文件而生成的 AI 辅助初步审阅，不构成法律意见，也不保证任何仲裁机构或法院的结果。最终结论须经专业审核，并核实当前适用的法律、规则、期限与证据。";

// Columns this backend writes. Used only to verify the live sheet still has
// them — never to create or modify a header.
var DISPUTE_REVIEW_REQUIRED_COLUMNS = [
  "Review ID", "Created At", "Last Updated", "Status", "Client Name", "Email",
  "Client Role", "Dispute Type", "Client Position", "Opposing Party Position",
  "AI Risk Level", "AI Confidence Score", "AI Flags", "Professional Notes",
  "Professional Final Recommendation", "Review Priority", "Next Step",
  "Report ZH JSON", "Report EN JSON", "Report ZH URL", "Report EN URL", "File Folder URL"
];
var DISPUTE_FILE_REQUIRED_COLUMNS = [
  "File ID", "Review ID", "Uploaded At", "Document Category", "File Name",
  "File Type", "Google Drive URL", "Description"
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function getDisputeSheet_(name) {
  var ss = SpreadsheetApp.openById(DISPUTE_REVIEW_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" not found in the AI Dispute Review data tables.');
  return sheet;
}

function disputeHeaders_(sheet) {
  if (sheet.getLastColumn() < 1) throw new Error('"' + sheet.getName() + '" is missing a header row.');
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
    return String(h == null ? "" : h).trim();
  });
}

// Read-only guard so a schema drift fails loudly instead of writing to the
// wrong column.
function verifyDisputeSchema() {
  var problems = [];
  var reviews = disputeHeaders_(getDisputeSheet_(DISPUTE_REVIEWS_SHEET));
  var files = disputeHeaders_(getDisputeSheet_(DISPUTE_FILES_SHEET));
  DISPUTE_REVIEW_REQUIRED_COLUMNS.forEach(function (col) {
    if (reviews.indexOf(col) < 0) problems.push('Dispute_Reviews is missing column "' + col + '"');
  });
  DISPUTE_FILE_REQUIRED_COLUMNS.forEach(function (col) {
    if (files.indexOf(col) < 0) problems.push('Dispute_Files is missing column "' + col + '"');
  });
  return {
    ok: problems.length === 0,
    problems: problems,
    disputeReviewColumns: reviews.length,
    disputeFileColumns: files.length
  };
}

function disputeText_(value) {
  if (value === null || value === undefined) return "";
  // Sheets turns a "2026-04-01" cell into a Date, which would otherwise reach
  // the UI as "2026-04-01T07:00:00.000Z". Normalise it back to a plain date.
  if (Object.prototype.toString.call(value) === "[object Date]") {
    if (isNaN(value.getTime())) return "";
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

function generateDisputeReviewId_() {
  var tz = Session.getScriptTimeZone();
  return "ADR-" + Utilities.formatDate(new Date(), tz, "yyyyMMdd-HHmmss");
}

function generateDisputeFileId_() {
  var tz = Session.getScriptTimeZone();
  return "DF-" + Utilities.formatDate(new Date(), tz, "yyyyMMdd-HHmmss") + "-" +
    Math.floor(Math.random() * 900 + 100);
}

// Each review gets its own subfolder under "07 AI Dispute Review/Dispute Files".
function getDisputeReviewFolder_(reviewId) {
  var parent = DriveApp.getFolderById(DISPUTE_FILES_FOLDER_ID);
  var existing = parent.getFoldersByName(reviewId);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(reviewId);
}

function getDisputeReportFolder_(reviewId) {
  var parent = DriveApp.getFolderById(DISPUTE_REPORTS_FOLDER_ID);
  var existing = parent.getFoldersByName(reviewId);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(reviewId);
}

function validateDisputeFile_(fileName, fileSize) {
  var name = String(fileName || "").trim();
  if (!name) throw new Error("File name is required.");
  var ext = name.indexOf(".") >= 0 ? name.split(".").pop().toLowerCase() : "";
  if (DISPUTE_ALLOWED_EXTENSIONS.indexOf(ext) < 0) {
    throw new Error("Unsupported file type: ." + ext + ". Allowed: " + DISPUTE_ALLOWED_EXTENSIONS.join(", ") + ".");
  }
  var size = Number(fileSize || 0);
  if (size > DISPUTE_MAX_FILE_BYTES) {
    throw new Error("File is larger than the 15 MB limit.");
  }
}

function countDisputeFilesForReview_(reviewId) {
  var sheet = getDisputeSheet_(DISPUTE_FILES_SHEET);
  if (sheet.getLastRow() < 2) return 0;
  var headers = disputeHeaders_(sheet);
  var col = headers.indexOf("Review ID");
  if (col < 0) return 0;
  var values = sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1).getValues();
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (disputeText_(values[i][0]) === reviewId) count++;
  }
  return count;
}

function findDisputeReviewRow_(sheet, headers, reviewId) {
  if (sheet.getLastRow() < 2) return 0;
  var col = headers.indexOf("Review ID");
  if (col < 0) return 0;
  var values = sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (disputeText_(values[i][0]) === reviewId) return i + 2;
  }
  return 0;
}

// Writes only the columns present in `record`, resolved against the live header
// row. Any other column in the sheet keeps its current value.
function writeDisputeRow_(sheet, headers, rowNumber, record) {
  var range = sheet.getRange(rowNumber, 1, 1, headers.length);
  var row = range.getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (record.hasOwnProperty(headers[i])) row[i] = record[headers[i]];
  }
  range.setValues([row]);
}

// ── Actions ───────────────────────────────────────────────────────────────────

// Reserves a Review ID before the intake is submitted, so evidence uploaded
// during the Documents & Evidence step is already linked to the right record.
function startDisputeReview_(payload) {
  payload = payload || {};
  var reviewId = disputeText_(payload.reviewId) || generateDisputeReviewId_();
  var folder = getDisputeReviewFolder_(reviewId);
  return {
    reviewId: reviewId,
    fileFolderUrl: folder.getUrl(),
    maxFiles: DISPUTE_MAX_FILES_PER_REVIEW,
    maxFileBytes: DISPUTE_MAX_FILE_BYTES,
    allowedExtensions: DISPUTE_ALLOWED_EXTENSIONS
  };
}

function uploadDisputeFile_(body) {
  body = body || {};
  var reviewId = disputeText_(body.reviewId);
  if (!reviewId) throw new Error("Review ID is required.");
  if (!body.data) throw new Error("File data is required.");

  var originalFileName = disputeText_(body.fileName);
  validateDisputeFile_(originalFileName, body.fileSize);

  if (countDisputeFilesForReview_(reviewId) >= DISPUTE_MAX_FILES_PER_REVIEW) {
    throw new Error("This review already has the maximum of " + DISPUTE_MAX_FILES_PER_REVIEW + " files.");
  }

  var category = disputeText_(body.documentCategory) || "Other";
  var uploadedAt = new Date().toISOString();
  var folder = getDisputeReviewFolder_(reviewId);
  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mimeType || "application/octet-stream",
    originalFileName // original file name is preserved exactly
  );
  var file = folder.createFile(blob);
  file.setDescription([
    "Review ID: " + reviewId,
    "Document Category: " + category,
    "Uploaded At: " + uploadedAt,
    "Description: " + disputeText_(body.description)
  ].join("\n"));

  var fileId = generateDisputeFileId_();
  var sheet = getDisputeSheet_(DISPUTE_FILES_SHEET);
  var headers = disputeHeaders_(sheet);
  var record = {
    "File ID": fileId,
    "Review ID": reviewId,
    "Uploaded At": uploadedAt,
    "Document Category": category,
    "File Name": originalFileName,
    "File Type": disputeText_(body.mimeType),
    "Google Drive URL": file.getUrl(),
    "Document Date": disputeText_(body.documentDate),
    "Sender / Issuer": disputeText_(body.senderIssuer),
    "Description": disputeText_(body.description),
    "Use in Report": "Yes",
    "Sort Order": countDisputeFilesForReview_(reviewId) + 1
  };
  sheet.appendRow(headers.map(function (h) {
    return record.hasOwnProperty(h) ? record[h] : "";
  }));
  SpreadsheetApp.flush();

  return {
    success: true,
    fileId: fileId,
    reviewId: reviewId,
    fileName: originalFileName,
    documentCategory: category,
    driveFileId: file.getId(),
    driveUrl: file.getUrl(),
    uploadedAt: uploadedAt
  };
}

// Lets the client remove a file they uploaded by mistake before final
// submission. The Drive file is moved to trash, not permanently destroyed.
function deleteDisputeFile_(body) {
  body = body || {};
  var reviewId = disputeText_(body.reviewId);
  var fileId = disputeText_(body.fileId);
  if (!reviewId || !fileId) throw new Error("Review ID and File ID are required.");

  var sheet = getDisputeSheet_(DISPUTE_FILES_SHEET);
  if (sheet.getLastRow() < 2) throw new Error("File not found.");
  var headers = disputeHeaders_(sheet);
  var fileIdCol = headers.indexOf("File ID");
  var reviewIdCol = headers.indexOf("Review ID");
  var urlCol = headers.indexOf("Google Drive URL");
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  for (var i = 0; i < rows.length; i++) {
    if (disputeText_(rows[i][fileIdCol]) !== fileId) continue;
    if (disputeText_(rows[i][reviewIdCol]) !== reviewId) throw new Error("File does not belong to this review.");
    var driveFileId = extractDisputeDriveFileId_(disputeText_(rows[i][urlCol]));
    if (driveFileId) {
      try { DriveApp.getFileById(driveFileId).setTrashed(true); } catch (ex) {
        Logger.log("[deleteDisputeFile_] Drive trash failed for " + fileId + ": " + ex);
      }
    }
    sheet.deleteRow(i + 2);
    SpreadsheetApp.flush();
    return { success: true, fileId: fileId };
  }
  throw new Error("File not found.");
}

function extractDisputeDriveFileId_(url) {
  var match = String(url || "").match(/[-\w]{25,}/);
  return match ? match[0] : "";
}

function getDisputeFilesForReview_(reviewId) {
  var sheet = getDisputeSheet_(DISPUTE_FILES_SHEET);
  if (sheet.getLastRow() < 2) return [];
  var headers = disputeHeaders_(sheet);
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var reviewIdCol = headers.indexOf("Review ID");
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (disputeText_(rows[i][reviewIdCol]) !== reviewId) continue;
    var record = {};
    for (var c = 0; c < headers.length; c++) record[headers[c]] = disputeText_(rows[i][c]);
    out.push(record);
  }
  return out;
}

function submitDisputeReview_(data) {
  data = data || {};
  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);

  var reviewId = disputeText_(data.reviewId) || generateDisputeReviewId_();
  var now = new Date().toISOString();
  var folder = getDisputeReviewFolder_(reviewId);
  var record = buildDisputeReviewRecord_(data, reviewId, now, folder.getUrl());

  var existingRow = findDisputeReviewRow_(sheet, headers, reviewId);
  if (existingRow > 0) {
    // Never clobber Created At or anything the professional reviewer wrote.
    var current = sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0];
    ["Created At", "Professional Notes", "Professional Final Recommendation",
      "Report ZH URL", "Report EN URL"].forEach(function (name) {
      var idx = headers.indexOf(name);
      if (idx >= 0 && disputeText_(current[idx])) record[name] = current[idx];
    });
    writeDisputeRow_(sheet, headers, existingRow, record);
  } else {
    sheet.appendRow(headers.map(function (h) {
      return record.hasOwnProperty(h) ? record[h] : "";
    }));
  }
  SpreadsheetApp.flush();

  return {
    success: true,
    reviewId: reviewId,
    fileFolderUrl: folder.getUrl(),
    fileCount: countDisputeFilesForReview_(reviewId),
    status: record["Status"],
    // Lets this client download their own report later without exposing any
    // other case or the Drive folder itself.
    downloadToken: disputeAccessToken_(reviewId)
  };
}

function buildDisputeReviewRecord_(data, reviewId, now, folderUrl) {
  var ai = data.aiReview || {};
  return {
    "Review ID": reviewId,
    "Created At": disputeText_(data.createdAt) || now,
    "Last Updated": now,
    "Status": disputeText_(data.status) || "New",
    "Lead Source": disputeText_(data.leadSource) || "Website - AI Review Center",
    "Client Name": disputeText_(data.clientName),
    "Email": disputeText_(data.email),
    "Phone": disputeText_(data.phone),
    "Preferred Contact": disputeText_(data.preferredContact),
    "Client Role": disputeText_(data.clientRole),
    "Dispute Type": disputeText_(data.disputeType),
    "Tribunal / Authority": disputeText_(data.tribunal),
    "Property Address": disputeText_(data.propertyAddress),
    "City": disputeText_(data.city),
    "Province": disputeText_(data.province),
    "Opposing Party Name": disputeText_(data.opposingPartyName),
    "Relationship to Opposing Party": disputeText_(data.relationshipToOpposingParty),
    "Dispute Summary": disputeText_(data.disputeSummary),
    "Client Position": disputeText_(data.clientPosition),
    "Opposing Party Position": disputeText_(data.opposingPosition),
    "Desired Outcome": disputeText_(data.desiredOutcome),
    "Important Dates": disputeText_(data.importantDates),
    "Notice Date": disputeText_(data.noticeDate),
    "Service Date": disputeText_(data.serviceDate),
    "Filing Deadline": disputeText_(data.filingDeadline),
    "Hearing Date": disputeText_(data.hearingDate),
    "Limitation Date": disputeText_(data.limitationDate),
    "Current Proceeding Status": disputeText_(data.proceedingStatus),
    "Application Filed": disputeText_(data.applicationFiled),
    "Response / Counterclaim Received": disputeText_(data.responseReceived),
    "Monetary Amount": disputeText_(data.monetaryAmount),
    "Key Evidence Summary": disputeText_(data.keyEvidenceSummary),
    "Missing Evidence": disputeText_(data.missingEvidence),
    "Service / Procedure Concerns": disputeText_(data.serviceConcerns),
    "Legal / Compliance Issues": disputeText_(data.legalIssues),
    "AI Timeline": disputeText_(ai.timelineText),
    "AI Issues Identified": disputeText_(ai.issuesText),
    "AI Strengths": disputeText_(ai.strengthsText),
    "AI Weaknesses": disputeText_(ai.weaknessesText),
    "AI Risk Level": disputeText_(ai.riskLevel),
    "AI Confidence Score": disputeText_(ai.confidenceScore),
    "AI Flags": disputeText_(ai.flags),
    "AI Analysis JSON": disputeText_(data.reportEn),
    "Follow-up Answers": disputeText_(data.followUpAnswersText),
    "Review Priority": disputeText_(ai.reviewPriority) || "Normal",
    "Next Step": disputeText_(data.nextStep) || disputeText_(ai.recommendedNextStep),
    "Client Service Interest": disputeText_(data.clientServiceInterest),
    "Intake Completion Score": disputeText_(ai.intakeCompletionScore),
    "Report ZH JSON": disputeText_(data.reportZh),
    "Report EN JSON": disputeText_(data.reportEn),
    "File Folder URL": folderUrl,
    "Consent to Contact": data.consentToContact ? "Yes" : "",
    "Privacy Consent": data.privacyConsent ? "Yes" : ""
  };
}

// ── Admin-only reads and professional review ─────────────────────────────────

function getDisputeReviews_(auth) {
  assertAdmin_(auth);
  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  if (sheet.getLastRow() < 2) return [];
  var headers = disputeHeaders_(sheet);
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  // The list view never ships the full report JSON — it is large and only the
  // detail view needs it.
  var heavy = ["Report ZH JSON", "Report EN JSON", "AI Analysis JSON"];
  return rows.map(function (row) {
    var record = {};
    for (var c = 0; c < headers.length; c++) {
      if (heavy.indexOf(headers[c]) >= 0) continue;
      record[headers[c]] = disputeText_(row[c]);
    }
    return record;
  }).reverse();
}

function getDisputeReview_(reviewId, auth) {
  assertAdmin_(auth);
  var id = disputeText_(reviewId);
  if (!id) throw new Error("Review ID is required.");
  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var rowNumber = findDisputeReviewRow_(sheet, headers, id);
  if (!rowNumber) throw new Error("Dispute review not found: " + id);
  var row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  var record = {};
  for (var c = 0; c < headers.length; c++) record[headers[c]] = disputeText_(row[c]);
  return {
    review: record,
    files: getDisputeFilesForReview_(id),
    downloadToken: disputeAccessToken_(id)
  };
}

function updateDisputeProfessionalReview_(data, auth) {
  assertAdmin_(auth);
  data = data || {};
  var id = disputeText_(data.reviewId);
  if (!id) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var rowNumber = findDisputeReviewRow_(sheet, headers, id);
  if (!rowNumber) throw new Error("Dispute review not found: " + id);

  var record = { "Last Updated": new Date().toISOString() };
  if (data.hasOwnProperty("professionalNotes")) record["Professional Notes"] = disputeText_(data.professionalNotes);
  if (data.hasOwnProperty("professionalFinalRecommendation")) record["Professional Final Recommendation"] = disputeText_(data.professionalFinalRecommendation);
  if (disputeText_(data.status)) record["Status"] = disputeText_(data.status);
  if (disputeText_(data.reviewPriority)) record["Review Priority"] = disputeText_(data.reviewPriority);
  if (disputeText_(data.nextStep)) record["Next Step"] = disputeText_(data.nextStep);

  writeDisputeRow_(sheet, headers, rowNumber, record);
  SpreadsheetApp.flush();
  return { success: true, reviewId: id, updated: Object.keys(record) };
}

// Regenerates both language reports and both PDFs together, so English and
// Chinese can never drift apart. The English report is the source of truth: the
// professional recommendation is authored once and carried verbatim into the
// Chinese version, which never adds a fact or judgment of its own.
function generateDisputeReport_(reviewId, data, auth) {
  assertAdmin_(auth);
  var id = disputeText_(reviewId);
  if (!id) throw new Error("Review ID is required.");
  data = data || {};

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var rowNumber = findDisputeReviewRow_(sheet, headers, id);
  if (!rowNumber) throw new Error("Dispute review not found: " + id);
  var row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  var current = {};
  for (var c = 0; c < headers.length; c++) current[headers[c]] = disputeText_(row[c]);

  var reportEn = parseDisputeReportJson_(data.reportEn || current["Report EN JSON"]);
  var reportZh = parseDisputeReportJson_(data.reportZh || current["Report ZH JSON"]);
  if (!reportEn) throw new Error("No English report content is available to generate from.");
  if (!reportZh) throw new Error("No Chinese report content is available to generate from.");

  var professionalText = current["Professional Final Recommendation"];
  var professionalNotes = current["Professional Notes"];
  var generatedAt = new Date().toISOString();

  applyProfessionalRecommendation_(reportEn, professionalText, professionalNotes, "en", generatedAt);
  applyProfessionalRecommendation_(reportZh, professionalText, professionalNotes, "zh", generatedAt);

  var folder = getDisputeReportFolder_(id);
  var enUrl = createDisputeReportPdf_(reportEn, id, "EN", folder);
  var zhUrl = createDisputeReportPdf_(reportZh, id, "ZH", folder);

  writeDisputeRow_(sheet, headers, rowNumber, {
    "Report EN JSON": JSON.stringify(reportEn),
    "Report ZH JSON": JSON.stringify(reportZh),
    "Report EN URL": enUrl,
    "Report ZH URL": zhUrl,
    "Status": "Report Generated",
    "Last Updated": generatedAt
  });
  SpreadsheetApp.flush();

  return {
    success: true,
    reviewId: id,
    generatedAt: generatedAt,
    reportEnUrl: enUrl,
    reportZhUrl: zhUrl,
    reportEnFileName: disputeReportFileName_(id, "EN"),
    reportZhFileName: disputeReportFileName_(id, "ZH"),
    reportFolderUrl: folder.getUrl(),
    downloadToken: disputeAccessToken_(id),
    professionalReviewIncluded: !!professionalText
  };
}

function parseDisputeReportJson_(text) {
  var raw = disputeText_(text);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    return (parsed && parsed.sections) ? parsed : null;
  } catch (ex) {
    return null;
  }
}

// Replaces the placeholder in section 13 with the reviewer's actual words.
// The reviewer writes once, in English; the Chinese report carries that exact
// text so the two versions state the same recommendation.
function applyProfessionalRecommendation_(report, recommendation, notes, language, generatedAt) {
  var zh = language === "zh";
  report.generatedAt = generatedAt;
  report.professionalReviewed = !!recommendation;
  for (var i = 0; i < report.sections.length; i++) {
    if (report.sections[i].key !== "professionalRecommendation") continue;
    if (recommendation) {
      var items = [recommendation];
      if (notes) items.push(notes);
      if (zh) {
        items.push("以上专业初步建议由专业审核人以英文原文出具，中文版本保留其原文，不作改写，以确保两个语言版本的结论完全一致。");
      }
      report.sections[i].items = items;
    } else {
      report.sections[i].items = [zh
        ? "本节保留给专业审核人。专业审核尚未完成，本报告中的 AI 初评仍为草稿。"
        : "This section is reserved for the professional reviewer. Professional review is not yet complete, so the AI review in this report remains a draft."];
    }
    break;
  }
  return report;
}

// ── Report download ───────────────────────────────────────────────────────────
// The Dispute Reports folder is never shared. A report is downloadable only by
// an admin, or by whoever holds the per-review token issued when the intake was
// submitted. The token is derived from the Review ID plus a script-side secret,
// so it needs no extra column in the sheet and cannot be guessed from the ID.

function disputeTokenSecret_() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("DISPUTE_REPORT_TOKEN_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + "-" + Utilities.getUuid();
    props.setProperty("DISPUTE_REPORT_TOKEN_SECRET", secret);
  }
  return secret;
}

function disputeAccessToken_(reviewId) {
  var raw = String(reviewId || "") + "|" + disputeTokenSecret_();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return digest.map(function (b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function disputeReportFileName_(reviewId, languageTag) {
  return reviewId + "_AI_Dispute_Review_" + languageTag + ".pdf";
}

// Returns the actual PDF bytes as base64 so the browser can save a real .pdf
// file. Drive preview links cannot be turned into a reliable cross-origin
// download, so the file is streamed through this authorized endpoint instead.
function downloadDisputeReportPdf_(body, auth) {
  body = body || {};
  var reviewId = disputeText_(body.reviewId);
  var language = disputeText_(body.language).toUpperCase() === "ZH" ? "ZH" : "EN";
  if (!reviewId) throw new Error("Review ID is required.");

  var isAdmin = auth && auth.mode === "admin";
  if (!isAdmin) {
    var token = disputeText_(body.token);
    if (!token || token !== disputeAccessToken_(reviewId)) {
      throw new Error("This report link is invalid or has expired.");
    }
  }

  var fileName = disputeReportFileName_(reviewId, language);
  var parent = DriveApp.getFolderById(DISPUTE_REPORTS_FOLDER_ID);
  var folders = parent.getFoldersByName(reviewId);
  if (!folders.hasNext()) {
    throw new Error("No report has been generated for " + reviewId + " yet.");
  }
  var files = folders.next().getFilesByName(fileName);
  if (!files.hasNext()) {
    throw new Error("The " + language + " report has not been generated for " + reviewId + " yet.");
  }

  var file = files.next();
  var blob = file.getBlob();
  return {
    reviewId: reviewId,
    language: language,
    fileName: fileName,
    mimeType: "application/pdf",
    sizeBytes: blob.getBytes().length,
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

// ── Supreme Court: Form 2 (Response to Civil Claim) Working Draft ───────────
// Admin-only. Builds a Google Doc from the already-assembled draft object (the
// client builds it with buildFormTwoWorkingDraft — allegation admit/deny
// choices, legal basis, relief sought), exports it to PDF into the same
// "Dispute Reports/<Review ID>/" folder as the EN/ZH reports, and returns the
// PDF bytes directly in this one call so Admin can download it immediately.
// Nothing is written back to Dispute_Reviews: eligibility and the draft
// content are recomputed fresh every time this is generated.
function generateFormTwoDraft_(body, auth) {
  assertAdmin_(auth);
  body = body || {};
  var reviewId = disputeText_(body.reviewId);
  if (!reviewId) throw new Error("Review ID is required.");
  var draft = parseDisputeReportJson_(body.draft);
  if (!draft) throw new Error("No Form 2 draft content was provided.");

  var fileName = reviewId + "_Form2_Working_Draft.pdf";
  var doc = DocumentApp.create(fileName.replace(/\.pdf$/, "") + "_tmp");
  var docBody = doc.getBody();

  docBody.appendParagraph(draft.title || "Form 2 Working Draft").setHeading(DocumentApp.ParagraphHeading.TITLE);
  if (draft.brandLine) docBody.appendParagraph(draft.brandLine).setBold(true);
  docBody.appendParagraph("Review ID: " + reviewId);
  docBody.appendParagraph("Generated: " + new Date().toISOString());

  (draft.sections || []).forEach(function (section) {
    docBody.appendParagraph(String(section.title || "")).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    if (section.type === "table" && section.rows && section.rows.length) {
      var cells = section.rows.map(function (r) {
        return [String(r.label || ""), String(r.value || "")];
      });
      docBody.appendTable(cells);
    } else {
      (section.items || []).forEach(function (item) {
        docBody.appendListItem(String(item)).setGlyphType(DocumentApp.GlyphType.BULLET);
      });
    }
  });

  doc.saveAndClose();
  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs("application/pdf").setName(fileName);

  var folder = getDisputeReportFolder_(reviewId);
  var existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);
  var pdfFile = folder.createFile(pdfBlob);
  docFile.setTrashed(true);

  return {
    reviewId: reviewId,
    fileName: fileName,
    mimeType: "application/pdf",
    sizeBytes: pdfFile.getSize(),
    base64: Utilities.base64Encode(pdfFile.getBlob().getBytes())
  };
}

// Builds a Google Doc from the report object, exports it to PDF into
// "Dispute Reports/<Review ID>/", then removes the temporary Doc.
function createDisputeReportPdf_(report, reviewId, languageTag, folder) {
  var zh = languageTag === "ZH";
  var docName = reviewId + "_AI_Dispute_Review_" + languageTag;
  var doc = DocumentApp.create(docName + "_tmp");
  var body = doc.getBody();

  body.appendParagraph(report.title || (zh ? "AI 争议初步审阅" : "AI Preliminary Dispute Review"))
    .setHeading(DocumentApp.ParagraphHeading.TITLE);
  if (report.brandLine) body.appendParagraph(report.brandLine).setItalic(true);

  body.appendParagraph((zh ? "案件编号：" : "Review ID: ") + reviewId);
  body.appendParagraph((zh ? "生成时间：" : "Generated: ") + (report.generatedAt || new Date().toISOString()));
  if (report.riskLevelLabel || report.riskLevel) {
    body.appendParagraph((zh ? "风险等级：" : "Risk level: ") + (report.riskLevelLabel || report.riskLevel));
  }
  if (report.confidenceScore !== undefined && report.confidenceScore !== null) {
    body.appendParagraph((zh ? "AI 信心：" : "AI confidence: ") + report.confidenceScore + "%");
  }
  body.appendParagraph(report.professionalReviewed
    ? (zh ? "专业审核状态：已完成专业审核。" : "Professional review status: reviewed.")
    : (zh ? "专业审核状态：尚未完成，本报告为 AI 草稿。" : "Professional review status: not yet complete; this report is an AI draft."));

  body.appendHorizontalRule();
  body.appendParagraph(zh ? "争议摘要" : "Executive Summary").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  (report.executiveSummary || []).forEach(function (line) {
    body.appendListItem(String(line)).setGlyphType(DocumentApp.GlyphType.BULLET);
  });

  (report.sections || []).forEach(function (section) {
    body.appendParagraph(String(section.title || "")).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    if (section.type === "table" && section.rows && section.rows.length) {
      var cells = section.rows.map(function (r) {
        return [String(r.label || ""), String(r.value || "")];
      });
      body.appendTable(cells);
    } else {
      (section.items || []).forEach(function (item) {
        body.appendListItem(String(item)).setGlyphType(DocumentApp.GlyphType.BULLET);
      });
    }
  });

  // The disclaimer is fixed wording and must always be present. Section 15
  // normally carries it; append it only if the report somehow lacks that
  // section, so it appears exactly once.
  var hasDisclaimer = (report.sections || []).some(function (section) {
    return section.key === "disclaimer";
  });
  if (!hasDisclaimer) {
    body.appendHorizontalRule();
    body.appendParagraph(zh ? "免责声明" : "Disclaimer").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(zh ? DISPUTE_DISCLAIMER_ZH : DISPUTE_DISCLAIMER_EN);
  }

  doc.saveAndClose();

  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs("application/pdf").setName(docName + ".pdf");

  // Replace any earlier PDF for this review and language so the folder always
  // holds exactly one current copy of each.
  var existing = folder.getFilesByName(docName + ".pdf");
  while (existing.hasNext()) existing.next().setTrashed(true);

  var pdfFile = folder.createFile(pdfBlob);
  docFile.setTrashed(true);
  return pdfFile.getUrl();
}
