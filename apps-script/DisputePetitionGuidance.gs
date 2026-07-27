// ============================================================
//  AI Dispute Review — Petition / Judicial Review Respondent Workflow
//  Hearing Readiness / Hearing Binder / Final Order Guidance
//  (Supreme Court Litigation, Respondent, Stages 9-11)
//
//  Deliberately lighter than Stages 6-8, mirroring
//  DisputeLateStageGuidance.gs's pattern for the Civil Claim workflow: only
//  ever persists a per-item checklist status, not case content. Entirely
//  separate case population from that Civil Claim namespace — a case uses
//  one workflow or the other, never both. Reuses the SAME "AI Analysis
//  JSON" cell (see DisputeAiAnalysis.gs) and adds one more independent,
//  sibling namespace:
//    { ..., petitionGuidance: { version, hearingReadiness: {...},
//                                hearingBinder: {...}, finalOrder: {...} } }
//  No new column, no new sheet.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputePetitionGuidanceEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

function mergeDisputePetitionGuidanceEnvelope_(rawCellValue, petitionGuidance) {
  var envelope = readDisputePetitionGuidanceEnvelope_(rawCellValue);
  envelope.petitionGuidance = petitionGuidance;
  return envelope;
}

function getDisputePetitionGuidance_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, petitionGuidance: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputePetitionGuidanceEnvelope_(raw);
  return { reviewId: reviewId, petitionGuidance: envelope.petitionGuidance || null };
}

// Admin-only save. `data.petitionGuidance` must be an object with
// hearingReadiness/hearingBinder/finalOrder sub-objects — the caller
// (frontend) owns record shape/validation; this just persists it verbatim
// alongside a server-stamped updatedAt/createdAt.
function saveDisputePetitionGuidance_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var petitionGuidance = data && data.petitionGuidance;
  if (!petitionGuidance || typeof petitionGuidance !== "object") {
    throw new Error("petitionGuidance must be an object.");
  }
  var requiredStages = ["hearingReadiness", "hearingBinder", "finalOrder"];
  for (var i = 0; i < requiredStages.length; i++) {
    if (!petitionGuidance[requiredStages[i]] || typeof petitionGuidance[requiredStages[i]] !== "object") {
      throw new Error("petitionGuidance." + requiredStages[i] + " must be an object.");
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
    version: petitionGuidance.version || 1,
    hearingReadiness: petitionGuidance.hearingReadiness,
    hearingBinder: petitionGuidance.hearingBinder,
    finalOrder: petitionGuidance.finalOrder,
    createdAt: petitionGuidance.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputePetitionGuidanceEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, petitionGuidance: toSave, savedAt: now };
}
