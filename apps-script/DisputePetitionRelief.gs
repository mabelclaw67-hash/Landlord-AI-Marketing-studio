// ============================================================
//  AI Dispute Review — Petition / Judicial Review Respondent Workflow
//  Relief & Position Matrix + Judicial Review Screening
//  (Supreme Court Litigation, Respondent, Stages 3-5)
//
//  Entirely separate case population from the Civil Claim Defendant
//  workflow (see DisputeApplications.gs etc.) — a case uses one workflow or
//  the other, never both. Reuses the SAME "AI Analysis JSON" cell (see
//  DisputeAiAnalysis.gs) and adds one more independent, sibling namespace:
//    { ..., petitionRelief: { version, reliefMatrix: {rows:[...]},
//                              jrScreening: {...} } }
//  No new column, no new sheet. petitionRelief is never nested inside the
//  Civil Claim namespaces (evidenceMatrix, applications, etc.) and never
//  mutates them.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputePetitionReliefEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new petitionRelief block into whatever envelope already exists,
// leaving every other namespace untouched. Pure function — the caller
// stringifies and writes the result to the sheet.
function mergeDisputePetitionReliefEnvelope_(rawCellValue, petitionRelief) {
  var envelope = readDisputePetitionReliefEnvelope_(rawCellValue);
  envelope.petitionRelief = petitionRelief;
  return envelope;
}

// Admin-only read of the stored petitionRelief block, without touching the
// other envelope namespaces. Returns null if none has been created yet.
function getDisputePetitionRelief_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, petitionRelief: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputePetitionReliefEnvelope_(raw);
  return { reviewId: reviewId, petitionRelief: envelope.petitionRelief || null };
}

// Admin-only save. `data.petitionRelief` must be { version, reliefMatrix,
// jrScreening } — the caller (frontend) owns record shape/validation; this
// just persists it verbatim alongside a server-stamped updatedAt/createdAt.
function saveDisputePetitionRelief_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var petitionRelief = data && data.petitionRelief;
  if (!petitionRelief || typeof petitionRelief !== "object") {
    throw new Error("petitionRelief must be an object.");
  }
  if (petitionRelief.reliefMatrix && !Array.isArray(petitionRelief.reliefMatrix.rows)) {
    throw new Error("petitionRelief.reliefMatrix.rows must be an array.");
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
    version: petitionRelief.version || 1,
    reliefMatrix: petitionRelief.reliefMatrix || { rows: [] },
    jrScreening: petitionRelief.jrScreening || null,
    createdAt: petitionRelief.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputePetitionReliefEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, petitionRelief: toSave, savedAt: now };
}
