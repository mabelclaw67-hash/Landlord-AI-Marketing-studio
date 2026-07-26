// ============================================================
//  AI Dispute Review — Document Discovery Workspace (Supreme Court
//  Litigation, Defendant, Stage 5)
//
//  Reuses the SAME "AI Analysis JSON" cell as Increments B/C and the
//  Evidence Matrix (see DisputeAiAnalysis.gs / DisputeWorkingDraft.gs /
//  DisputeEvidenceMatrix.gs) and adds one more independent, sibling
//  namespace:
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...},
//      workingDraft: {...}, evidenceMatrix: {...}, documentDiscovery: {...} }
//  No new column, no new sheet. documentDiscovery is never nested inside the
//  other namespaces and never mutates them.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputeDocumentDiscoveryEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new documentDiscovery into whatever envelope already exists,
// leaving ruleAnalysis, contentAnalysis, workingDraft, and evidenceMatrix
// untouched. Pure function — the caller stringifies and writes the result
// to the sheet.
function mergeDisputeDocumentDiscoveryEnvelope_(rawCellValue, documentDiscovery) {
  var envelope = readDisputeDocumentDiscoveryEnvelope_(rawCellValue);
  envelope.documentDiscovery = documentDiscovery;
  return envelope;
}

// Admin-only read of the stored documentDiscovery, without touching the
// other envelope namespaces. Returns null if none has been created yet.
function getDisputeDocumentDiscovery_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, documentDiscovery: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputeDocumentDiscoveryEnvelope_(raw);
  return { reviewId: reviewId, documentDiscovery: envelope.documentDiscovery || null };
}

// Admin-only save. `data.documentDiscovery` must be { version, documents: [...] } —
// the caller (frontend) owns record shape/validation; this just persists it
// verbatim alongside a server-stamped updatedAt/createdAt.
function saveDisputeDocumentDiscovery_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var documentDiscovery = data && data.documentDiscovery;
  if (!documentDiscovery || typeof documentDiscovery !== "object" || !Array.isArray(documentDiscovery.documents)) {
    throw new Error("documentDiscovery.documents must be an array.");
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
    version: documentDiscovery.version || 1,
    documents: documentDiscovery.documents,
    notes: documentDiscovery.notes || "",
    createdAt: documentDiscovery.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputeDocumentDiscoveryEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, documentDiscovery: toSave, savedAt: now };
}
