// ============================================================
//  AI Dispute Review — Settlement Preparation Workspace
//  (Supreme Court Litigation, Defendant, Stage 8)
//
//  Reuses the SAME "AI Analysis JSON" cell as Increments B/C, Evidence
//  Matrix, Document Discovery, Examination for Discovery, and Applications
//  (see DisputeAiAnalysis.gs / DisputeWorkingDraft.gs / DisputeEvidenceMatrix.gs /
//  DisputeDocumentDiscovery.gs / DisputeExaminationDiscovery.gs /
//  DisputeApplications.gs) and adds one more independent, sibling namespace:
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...},
//      workingDraft: {...}, evidenceMatrix: {...}, documentDiscovery: {...},
//      examinationDiscovery: {...}, applications: {...}, settlement: {...} }
//  No new column, no new sheet. settlement is never nested inside the
//  other namespaces and never mutates them.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputeSettlementEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new settlement block into whatever envelope already exists,
// leaving every other namespace untouched. Pure function — the caller
// stringifies and writes the result to the sheet.
function mergeDisputeSettlementEnvelope_(rawCellValue, settlement) {
  var envelope = readDisputeSettlementEnvelope_(rawCellValue);
  envelope.settlement = settlement;
  return envelope;
}

// Admin-only read of the stored settlement block, without touching the
// other envelope namespaces. Returns null if none has been created yet.
function getDisputeSettlement_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, settlement: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputeSettlementEnvelope_(raw);
  return { reviewId: reviewId, settlement: envelope.settlement || null };
}

// Admin-only save. `data.settlement` must be { version, offers: [...] } —
// the caller (frontend) owns record shape/validation; this just persists it
// verbatim alongside a server-stamped updatedAt/createdAt.
function saveDisputeSettlement_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var settlement = data && data.settlement;
  if (!settlement || typeof settlement !== "object" || !Array.isArray(settlement.offers)) {
    throw new Error("settlement.offers must be an array.");
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
    version: settlement.version || 1,
    offers: settlement.offers,
    createdAt: settlement.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputeSettlementEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, settlement: toSave, savedAt: now };
}
