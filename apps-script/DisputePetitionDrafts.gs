// ============================================================
//  AI Dispute Review — Petition / Judicial Review Respondent Workflow
//  Working-Draft PDF Generation
//  (Form 67, Affidavit / Form 109, Hearing Binder Index)
//
//  Mirrors generateFormTwoDraft_ (DisputeReview.gs) exactly: builds a
//  temporary Google Doc from an already-assembled {title, brandLine,
//  sections:[...]} object (assembled client-side by
//  buildForm67WorkingDraft / buildAffidavitWorkingDraft /
//  buildHearingBinderIndexDraft — see
//  supremeCourtPetitionJudicialReviewRespondentWorkflow.js), exports it to
//  PDF into the same "Dispute Reports/<Review ID>/" folder as every other
//  generated PDF, and returns the bytes directly so Admin can download
//  immediately. Nothing is written back to Dispute_Reviews — content is
//  recomputed fresh every time. One shared builder, three thin action
//  wrappers, so the doc-building logic is not tripled.
// ============================================================

function buildPetitionSectionedDraftPdf_(reviewId, draft, fileNameSuffix) {
  if (!draft) throw new Error("No draft content was provided.");
  var fileName = reviewId + "_" + fileNameSuffix + ".pdf";
  var doc = DocumentApp.create(fileName.replace(/\.pdf$/, "") + "_tmp");
  var docBody = doc.getBody();

  docBody.appendParagraph(draft.title || fileNameSuffix).setHeading(DocumentApp.ParagraphHeading.TITLE);
  if (draft.brandLine) docBody.appendParagraph(draft.brandLine).setBold(true);
  docBody.appendParagraph("Review ID: " + reviewId);
  docBody.appendParagraph("Generated: " + new Date().toISOString());

  (draft.sections || []).forEach(function (section) {
    docBody.appendParagraph(String(section.title || "")).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    if (section.type === "table" && section.rows && section.rows.length) {
      var cells = section.rows.map(function (r) {
        return [String(r.label || ""), String(r.value || "")];
      });
      docBody.appendTable(cells);
    } else {
      (section.items || []).forEach(function (item) {
        docBody.appendListItem(String(item)).setGlyphType(DocumentApp.GlyphType.BULLET);
      });
    }
  });

  doc.saveAndClose();
  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs("application/pdf").setName(fileName);

  var folder = getDisputeReportFolder_(reviewId);
  var existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);
  var pdfFile = folder.createFile(pdfBlob);
  docFile.setTrashed(true);

  return {
    reviewId: reviewId,
    fileName: fileName,
    mimeType: "application/pdf",
    sizeBytes: pdfFile.getSize(),
    base64: Utilities.base64Encode(pdfFile.getBlob().getBytes())
  };
}

// Admin-only. Called as generateForm67Draft_(body.data || body, auth) from
// the dispatcher (mirrors generateFormTwoDraft_) — `data` is
// {reviewId, draft: <JSON string>}, where draft is the {title, brandLine,
// sections} object assembled client-side by buildForm67WorkingDraft from
// the live Relief & Position Matrix — see PetitionReliefWorkspace.jsx.
function generateForm67Draft_(data, auth) {
  assertAdmin_(auth);
  data = data || {};
  var reviewId = disputeText_(data.reviewId);
  if (!reviewId) throw new Error("Review ID is required.");
  var draft = parseDisputeReportJson_(data.draft);
  return buildPetitionSectionedDraftPdf_(reviewId, draft, "Form67_Working_Draft");
}

// Admin-only. Called as generatePetitionAffidavitDraft_(body.data || body,
// auth). `data.draft` is assembled client-side by buildAffidavitWorkingDraft
// — see PetitionEvidenceAffidavitWorkspace.jsx. Never invents facts; the
// draft object itself is entirely assembled from data the admin already
// entered.
function generatePetitionAffidavitDraft_(data, auth) {
  assertAdmin_(auth);
  data = data || {};
  var reviewId = disputeText_(data.reviewId);
  if (!reviewId) throw new Error("Review ID is required.");
  var draft = parseDisputeReportJson_(data.draft);
  return buildPetitionSectionedDraftPdf_(reviewId, draft, "Affidavit_Working_Draft");
}

// Admin-only. Called as generatePetitionHearingBinderIndex_(body.data ||
// body, auth). `data.draft` is assembled client-side by
// buildHearingBinderIndexDraft from verified filed/generated documents only
// — see PetitionGuidanceWorkspace.jsx.
function generatePetitionHearingBinderIndex_(data, auth) {
  assertAdmin_(auth);
  data = data || {};
  var reviewId = disputeText_(data.reviewId);
  if (!reviewId) throw new Error("Review ID is required.");
  var draft = parseDisputeReportJson_(data.draft);
  return buildPetitionSectionedDraftPdf_(reviewId, draft, "Hearing_Binder_Index");
}
