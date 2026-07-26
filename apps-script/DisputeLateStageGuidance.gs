// ============================================================
//  AI Dispute Review — Late-Stage Guidance
//  (Supreme Court Litigation, Defendant, Stages 9-11: Trial Preparation,
//  Hearing / Court Binder, Judgment/Costs/Enforcement)
//
//  Deliberately lighter than the Stage 4-8 workspaces: Stages 9-11 are
//  highly case-specific (courtroom strategy, evidentiary decisions, costs,
//  appeals, enforcement), so this only ever persists a per-item checklist
//  status, not case content. Reuses the SAME "AI Analysis JSON" cell as
//  Increments B/C, Evidence Matrix, Document Discovery, Examination for
//  Discovery, Applications, and Settlement (see DisputeAiAnalysis.gs /
//  DisputeWorkingDraft.gs / DisputeEvidenceMatrix.gs /
//  DisputeDocumentDiscovery.gs / DisputeExaminationDiscovery.gs /
//  DisputeApplications.gs / DisputeSettlement.gs) and adds one more
//  independent, sibling namespace:
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...},
//      workingDraft: {...}, evidenceMatrix: {...}, documentDiscovery: {...},
//      examinationDiscovery: {...}, applications: {...}, settlement: {...},
//      lateStageGuidance: {...} }
//  No new column, no new sheet. lateStageGuidance is never nested inside
//  the other namespaces and never mutates them.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputeLateStageGuidanceEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new lateStageGuidance block into whatever envelope already
// exists, leaving every other namespace untouched. Pure function — the
// caller stringifies and writes the result to the sheet.
function mergeDisputeLateStageGuidanceEnvelope_(rawCellValue, lateStageGuidance) {
  var envelope = readDisputeLateStageGuidanceEnvelope_(rawCellValue);
  envelope.lateStageGuidance = lateStageGuidance;
  return envelope;
}

// Admin-only read of the stored lateStageGuidance block, without touching
// the other envelope namespaces. Returns null if none has been created yet.
function getDisputeLateStageGuidance_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, lateStageGuidance: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputeLateStageGuidanceEnvelope_(raw);
  return { reviewId: reviewId, lateStageGuidance: envelope.lateStageGuidance || null };
}

// Admin-only save. `data.lateStageGuidance` must be an object with
// trialPreparation/courtBinder/judgmentCostsEnforcement sub-objects — the
// caller (frontend) owns record shape/validation; this just persists it
// verbatim alongside a server-stamped updatedAt/createdAt.
function saveDisputeLateStageGuidance_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var lateStageGuidance = data && data.lateStageGuidance;
  if (!lateStageGuidance || typeof lateStageGuidance !== "object") {
    throw new Error("lateStageGuidance must be an object.");
  }
  var requiredStages = ["trialPreparation", "courtBinder", "judgmentCostsEnforcement"];
  for (var i = 0; i < requiredStages.length; i++) {
    if (!lateStageGuidance[requiredStages[i]] || typeof lateStageGuidance[requiredStages[i]] !== "object") {
      throw new Error("lateStageGuidance." + requiredStages[i] + " must be an object.");
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
    version: lateStageGuidance.version || 1,
    trialPreparation: lateStageGuidance.trialPreparation,
    courtBinder: lateStageGuidance.courtBinder,
    judgmentCostsEnforcement: lateStageGuidance.judgmentCostsEnforcement,
    createdAt: lateStageGuidance.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputeLateStageGuidanceEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, lateStageGuidance: toSave, savedAt: now };
}
