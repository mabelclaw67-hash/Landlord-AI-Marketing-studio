// ============================================================
//  AI Dispute Review — Examination for Discovery Readiness & Preparation
//  Workspace (Supreme Court Litigation, Defendant, Stage 6)
//
//  Reuses the SAME "AI Analysis JSON" cell as Increments B/C, Evidence
//  Matrix, and Document Discovery (see DisputeAiAnalysis.gs /
//  DisputeWorkingDraft.gs / DisputeEvidenceMatrix.gs /
//  DisputeDocumentDiscovery.gs) and adds one more independent, sibling
//  namespace:
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...},
//      workingDraft: {...}, evidenceMatrix: {...}, documentDiscovery: {...},
//      examinationDiscovery: {...} }
//  No new column, no new sheet. examinationDiscovery is never nested inside
//  the other namespaces and never mutates them.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputeExaminationDiscoveryEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new examinationDiscovery into whatever envelope already exists,
// leaving every other namespace untouched. Pure function — the caller
// stringifies and writes the result to the sheet.
function mergeDisputeExaminationDiscoveryEnvelope_(rawCellValue, examinationDiscovery) {
  var envelope = readDisputeExaminationDiscoveryEnvelope_(rawCellValue);
  envelope.examinationDiscovery = examinationDiscovery;
  return envelope;
}

// Admin-only read of the stored examinationDiscovery, without touching the
// other envelope namespaces. Returns null if none has been created yet.
function getDisputeExaminationDiscovery_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, examinationDiscovery: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputeExaminationDiscoveryEnvelope_(raw);
  return { reviewId: reviewId, examinationDiscovery: envelope.examinationDiscovery || null };
}

// Admin-only save. `data.examinationDiscovery` must be an object with at
// least a `readiness` object and array fields for examinees/preparationIssues/
// undertakings/transcriptReferences — the caller (frontend) owns record
// shape/validation; this just persists it verbatim alongside a
// server-stamped updatedAt/createdAt.
function saveDisputeExaminationDiscovery_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var examinationDiscovery = data && data.examinationDiscovery;
  if (!examinationDiscovery || typeof examinationDiscovery !== "object") {
    throw new Error("examinationDiscovery must be an object.");
  }
  var arrayFields = ["examinees", "preparationIssues", "undertakings", "transcriptReferences"];
  for (var i = 0; i < arrayFields.length; i++) {
    if (!Array.isArray(examinationDiscovery[arrayFields[i]])) {
      throw new Error("examinationDiscovery." + arrayFields[i] + " must be an array.");
    }
  }

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) throw new Error('"' + DISPUTE_AI_ANALYSIS_COLUMN + '" column not found on ' + DISPUTE_REVIEWS_SHEET + '.');

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var existingRaw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var now = new Date().toISOString();
  var toSave = {
    version: examinationDiscovery.version || 1,
    readiness: examinationDiscovery.readiness || {},
    examinees: examinationDiscovery.examinees,
    preparationIssues: examinationDiscovery.preparationIssues,
    undertakings: examinationDiscovery.undertakings,
    transcriptReferences: examinationDiscovery.transcriptReferences,
    createdAt: examinationDiscovery.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputeExaminationDiscoveryEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, examinationDiscovery: toSave, savedAt: now };
}
