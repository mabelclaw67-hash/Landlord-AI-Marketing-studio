// ============================================================
//  AI Dispute Review — Evidence Matrix (Supreme Court Litigation, Defendant)
//
//  Reuses the SAME "AI Analysis JSON" cell as Increment B/C (see
//  DisputeAiAnalysis.gs / DisputeWorkingDraft.gs) and adds one more
//  independent, sibling namespace:
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...}, workingDraft: {...}, evidenceMatrix: {...} }
//  No new column, no new sheet. evidenceMatrix is never nested inside the
//  other namespaces and never mutates them.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputeEvidenceMatrixEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new evidenceMatrix into whatever envelope already exists, leaving
// ruleAnalysis, contentAnalysis, and workingDraft untouched. Pure function —
// the caller stringifies and writes the result to the sheet.
function mergeDisputeEvidenceMatrixEnvelope_(rawCellValue, evidenceMatrix) {
  var envelope = readDisputeEvidenceMatrixEnvelope_(rawCellValue);
  envelope.evidenceMatrix = evidenceMatrix;
  return envelope;
}

// Admin-only read of the stored evidenceMatrix, without touching the other
// envelope namespaces. Returns null if none has been created yet.
function getDisputeEvidenceMatrix_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, evidenceMatrix: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputeEvidenceMatrixEnvelope_(raw);
  return { reviewId: reviewId, evidenceMatrix: envelope.evidenceMatrix || null };
}

// Admin-only save. `data.evidenceMatrix` must be { version, rows: [...] } —
// the caller (frontend) owns row shape/validation; this just persists it
// verbatim alongside a server-stamped updatedAt/createdAt.
function saveDisputeEvidenceMatrix_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var evidenceMatrix = data && data.evidenceMatrix;
  if (!evidenceMatrix || typeof evidenceMatrix !== "object" || !Array.isArray(evidenceMatrix.rows)) {
    throw new Error("evidenceMatrix.rows must be an array.");
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
    version: evidenceMatrix.version || 1,
    rows: evidenceMatrix.rows,
    createdAt: evidenceMatrix.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputeEvidenceMatrixEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, evidenceMatrix: toSave, savedAt: now };
}
