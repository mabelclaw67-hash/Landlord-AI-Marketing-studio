// ============================================================
//  AI Dispute Review — Petition / Judicial Review Respondent Workflow
//  Evidence & Affidavit Plan
//  (Supreme Court Litigation, Respondent, Stages 6-7)
//
//  Entirely separate case population from the Civil Claim Defendant
//  workflow's Evidence Matrix (see DisputeEvidenceMatrix.gs) — a case uses
//  one workflow or the other, never both. Reuses the SAME "AI Analysis
//  JSON" cell (see DisputeAiAnalysis.gs) and adds one more independent,
//  sibling namespace:
//    { ..., petitionEvidence: { version, evidenceItems: [...],
//                                witnesses: [...] } }
//  No new column, no new sheet.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputePetitionEvidenceEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

function mergeDisputePetitionEvidenceEnvelope_(rawCellValue, petitionEvidence) {
  var envelope = readDisputePetitionEvidenceEnvelope_(rawCellValue);
  envelope.petitionEvidence = petitionEvidence;
  return envelope;
}

function getDisputePetitionEvidence_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, petitionEvidence: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputePetitionEvidenceEnvelope_(raw);
  return { reviewId: reviewId, petitionEvidence: envelope.petitionEvidence || null };
}

// Admin-only save. `data.petitionEvidence` must be { version, evidenceItems:
// [...], witnesses: [...] } — the caller (frontend) owns record
// shape/validation; this just persists it verbatim alongside a
// server-stamped updatedAt/createdAt.
function saveDisputePetitionEvidence_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var petitionEvidence = data && data.petitionEvidence;
  if (!petitionEvidence || typeof petitionEvidence !== "object") {
    throw new Error("petitionEvidence must be an object.");
  }
  if (petitionEvidence.evidenceItems && !Array.isArray(petitionEvidence.evidenceItems)) {
    throw new Error("petitionEvidence.evidenceItems must be an array.");
  }
  if (petitionEvidence.witnesses && !Array.isArray(petitionEvidence.witnesses)) {
    throw new Error("petitionEvidence.witnesses must be an array.");
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
    version: petitionEvidence.version || 1,
    evidenceItems: petitionEvidence.evidenceItems || [],
    witnesses: petitionEvidence.witnesses || [],
    createdAt: petitionEvidence.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputePetitionEvidenceEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, petitionEvidence: toSave, savedAt: now };
}
