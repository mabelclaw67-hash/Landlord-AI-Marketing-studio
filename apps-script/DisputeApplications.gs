// ============================================================
//  AI Dispute Review — Applications Preparation Workspace
//  (Supreme Court Litigation, Defendant, Stage 7)
//
//  Reuses the SAME "AI Analysis JSON" cell as Increments B/C, Evidence
//  Matrix, Document Discovery, and Examination for Discovery (see
//  DisputeAiAnalysis.gs / DisputeWorkingDraft.gs / DisputeEvidenceMatrix.gs /
//  DisputeDocumentDiscovery.gs / DisputeExaminationDiscovery.gs) and adds one
//  more independent, sibling namespace:
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...},
//      workingDraft: {...}, evidenceMatrix: {...}, documentDiscovery: {...},
//      examinationDiscovery: {...}, applications: {...} }
//  No new column, no new sheet. applications is never nested inside the
//  other namespaces and never mutates them.
//
//  Admin-only. Read/write of a plain admin-authored structure — never calls
//  an AI provider, never reads Drive files, only touches the one JSON cell.
// ============================================================

function readDisputeApplicationsEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new applications block into whatever envelope already exists,
// leaving every other namespace untouched. Pure function — the caller
// stringifies and writes the result to the sheet.
function mergeDisputeApplicationsEnvelope_(rawCellValue, applications) {
  var envelope = readDisputeApplicationsEnvelope_(rawCellValue);
  envelope.applications = applications;
  return envelope;
}

// Admin-only read of the stored applications block, without touching the
// other envelope namespaces. Returns null if none has been created yet.
function getDisputeApplications_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var analysisColIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) return { reviewId: reviewId, applications: null };

  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);

  var raw = sheet.getRange(rowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputeApplicationsEnvelope_(raw);
  return { reviewId: reviewId, applications: envelope.applications || null };
}

// Admin-only save. `data.applications` must be { version, applications: [...] } —
// the caller (frontend) owns record shape/validation; this just persists it
// verbatim alongside a server-stamped updatedAt/createdAt.
function saveDisputeApplications_(reviewId, data, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var applications = data && data.applications;
  if (!applications || typeof applications !== "object" || !Array.isArray(applications.applications)) {
    throw new Error("applications.applications must be an array.");
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
    version: applications.version || 1,
    applications: applications.applications,
    createdAt: applications.createdAt || now,
    updatedAt: now
  };

  var updatedEnvelope = mergeDisputeApplicationsEnvelope_(existingRaw, toSave);
  sheet.getRange(rowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return { reviewId: reviewId, applications: toSave, savedAt: now };
}
