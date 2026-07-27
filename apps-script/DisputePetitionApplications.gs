// ============================================================
//  AI Dispute Review — Petition / Judicial Review Respondent Workflow
//  Interlocutory Application / Stay / Injunction
//  (Supreme Court Litigation, Respondent, Stage 8)
//
//  Entirely separate case population from the Civil Claim Defendant
//  workflow's Applications workspace (see DisputeApplications.gs) — a case
//  uses one workflow or the other, never both. Reuses the SAME "AI Analysis
//  JSON" cell (see DisputeAiAnalysis.gs) and adds one more independent,
//  sibling namespace:
//    { ..., petitionApplications: { version, applications: [...] } }
//  No new column, no new sheet.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputePetitionApplicationsEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

function mergeDisputePetitionApplicationsEnvelope_(rawCellValue, petitionApplications) {
  var envelope = readDisputePetitionApplicationsEnvelope_(rawCellValue);
  envelope.petitionApplications = petitionApplications;
  return envelope;
}

function getDisputePetitionApplications_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, petitionApplications: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputePetitionApplicationsEnvelope_(raw);
  return { reviewId: reviewId, petitionApplications: envelope.petitionApplications || null };
}

function saveDisputePetitionApplications_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var petitionApplications = data && data.petitionApplications;
  if (!petitionApplications || typeof petitionApplications !== "object" || !Array.isArray(petitionApplications.applications)) {
    throw new Error("petitionApplications.applications must be an array.");
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
    version: petitionApplications.version || 1,
    applications: petitionApplications.applications,
    createdAt: petitionApplications.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputePetitionApplicationsEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, petitionApplications: toSave, savedAt: now };
}
