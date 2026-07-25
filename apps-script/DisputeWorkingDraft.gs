// ============================================================
//  AI Dispute Review — Working Draft (Increment C)
//
//  Increment C reuses the SAME "AI Analysis JSON" cell as Increment B (see
//  DisputeAiAnalysis.gs) and adds one more independent, sibling namespace:
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...}, workingDraft: {...} }
//  No new column, no new sheet. workingDraft is never nested inside
//  contentAnalysis, and never mutates ruleAnalysis or contentAnalysis.
//
//  Working Draft generation consumes ONLY the already-generated Increment B
//  contentAnalysis for this review — it never re-reads Drive files, never
//  calls any Dispute_Files helper, and never re-runs the full case-content
//  analysis. If no contentAnalysis exists yet, generation is refused outright
//  rather than falling back to raw files.
//
//  Step 2 (this pass) wires up real Gemini generation, reusing the exact same
//  callAiProvider_/GeminiProvider seam as Increment B (DisputeAiAnalysis.gs) —
//  only the prompt and responseSchema differ per call.
//
//  The generated draft is always an internal drafting aid only — never legal
//  advice, never a document ready to file with a court — and must never
//  invent a fact that isn't already in contentAnalysis; uncertain points are
//  marked "not admitted" / "requires verification" instead.
// ============================================================

var DISPUTE_WORKING_DRAFT_DEFAULT_LANGUAGE = "en";
var DISPUTE_WORKING_DRAFT_DEFAULT_TYPE = "response_working_draft";
var DISPUTE_WORKING_DRAFT_STRING_FIELDS = ["draftType", "language", "title", "casePositionSummary", "draftText", "disclaimer"];
var DISPUTE_WORKING_DRAFT_ARRAY_FIELDS = ["factsToAdmit", "factsToDenyOrNotAdmit", "responsePoints", "evidenceNeeded", "proceduralNextSteps", "riskNotes"];
var DISPUTE_WORKING_DRAFT_REQUIRED_FIELDS = DISPUTE_WORKING_DRAFT_STRING_FIELDS.concat(DISPUTE_WORKING_DRAFT_ARRAY_FIELDS);

// Gemini structured-output schema — kept in exact lockstep with
// validateDisputeWorkingDraft_ above (same 12 keys, same string/array
// split), all required. Passed via promptPayload.responseSchema so
// callGeminiProvider_ (DisputeAiAnalysis.gs) uses this instead of the
// Increment A/B content-analysis schema for this one call.
var GEMINI_WORKING_DRAFT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    draftType: { type: "string" },
    language: { type: "string" },
    title: { type: "string" },
    casePositionSummary: { type: "string" },
    factsToAdmit: { type: "array", items: { type: "string" } },
    factsToDenyOrNotAdmit: { type: "array", items: { type: "string" } },
    responsePoints: { type: "array", items: { type: "string" } },
    evidenceNeeded: { type: "array", items: { type: "string" } },
    proceduralNextSteps: { type: "array", items: { type: "string" } },
    riskNotes: { type: "array", items: { type: "string" } },
    draftText: { type: "string" },
    disclaimer: { type: "string" }
  },
  required: DISPUTE_WORKING_DRAFT_REQUIRED_FIELDS
};

// ── Envelope read/merge (pure — no sheet or Drive access) ────────────────
// Same underlying "AI Analysis JSON" cell as Increment B — reuses
// readDisputeAiAnalysisEnvelope_ (DisputeAiAnalysis.gs) rather than
// re-implementing the JSON parse/migration a second time, so there is only
// ever ONE authoritative parser for this one cell.
function readDisputeWorkingDraftEnvelope_(rawCellValue) {
  return readDisputeAiAnalysisEnvelope_(rawCellValue);
}

// Merges a new workingDraft into whatever envelope already exists, leaving
// ruleAnalysis AND contentAnalysis untouched. Pure function — the caller
// stringifies and writes the result to the sheet.
function mergeDisputeWorkingDraftEnvelope_(rawCellValue, workingDraft) {
  var envelope = readDisputeWorkingDraftEnvelope_(rawCellValue);
  envelope.workingDraft = workingDraft;
  return envelope;
}

// ── Validation (pure) ─────────────────────────────────────────────────────
function validateDisputeWorkingDraft_(draft) {
  if (!draft || typeof draft !== "object") throw new Error("Working draft must be an object.");
  var missingKeys = DISPUTE_WORKING_DRAFT_REQUIRED_FIELDS.filter(function (key) { return !(key in draft); });
  if (missingKeys.length) throw new Error("Working draft is missing required keys: " + missingKeys.join(", "));
  var wrongType = [];
  DISPUTE_WORKING_DRAFT_STRING_FIELDS.forEach(function (key) {
    if (typeof draft[key] !== "string") wrongType.push(key + " (expected string)");
  });
  DISPUTE_WORKING_DRAFT_ARRAY_FIELDS.forEach(function (key) {
    if (!Array.isArray(draft[key])) wrongType.push(key + " (expected array)");
  });
  if (wrongType.length) throw new Error("Working draft has fields with the wrong type: " + wrongType.join(", "));
  return true;
}

// ── Prompt assembly (pure — no sheet/Drive/network access) ───────────────
// contentAnalysis here is the FULL stored object ({generatedAt,
// unreadableFiles, analysis: {...5 fields}}), not just .analysis — the
// unreadable-files list is useful grounding context (never assume content
// for a file that was never actually read).
function buildDisputeWorkingDraftPrompt_(contentAnalysis, options) {
  options = options || {};
  var language = options.language || DISPUTE_WORKING_DRAFT_DEFAULT_LANGUAGE;
  var draftType = options.draftType || DISPUTE_WORKING_DRAFT_DEFAULT_TYPE;
  var analysis = contentAnalysis.analysis || {};

  var systemPrompt = [
    "You are drafting an INTERNAL WORKING DRAFT of a response to a landlord/tenant or civil dispute, for a British Columbia property management studio's professional reviewer to further edit. This is an internal working draft only — it is NOT legal advice, NOT a formal court or tribunal document, and must never be presented or described as ready to file as-is.",
    "You are given ONLY the already-generated case content analysis for this review (caseMaterialsSummary, missingEvidence, timeline, keyIssues, preliminaryAssessment) — you do not have access to the original uploaded files and must not invent any fact that is not already stated in this content analysis.",
    "Produce a single JSON object with exactly these keys: draftType (string), language (string), title (string), casePositionSummary (string), factsToAdmit (array of strings), factsToDenyOrNotAdmit (array of strings), responsePoints (array of strings), evidenceNeeded (array of strings), proceduralNextSteps (array of strings), riskNotes (array of strings), draftText (string), disclaimer (string).",
    "Set draftType to \"" + draftType + "\" and language to \"" + language + "\" exactly, verbatim.",
    "Rules: never state something as a confirmed fact unless the content analysis already states it as such. For any fact that is uncertain, disputed, or only alleged, use the exact phrase 'not admitted' or 'requires verification' rather than assuming an answer — never fill a gap with invented detail.",
    "Clearly distinguish three kinds of statements throughout, and do not blur them together: (a) the opposing party's allegations / pleaded claims, (b) confirmed procedural facts (dates, filings, deadlines already established in the content analysis), and (c) observations carried over from the content analysis's preliminary assessment.",
    "draftText must read as a genuine working draft response that a lawyer or admin can directly edit further — organized prose covering the case position, which points are admitted/denied/not admitted, and the proposed response — not a bare outline, and not a final polished filing.",
    "disclaimer must plainly state that this is an internal working draft only, has not been reviewed by a lawyer, is not legal advice, and must not be filed with any court or tribunal as-is.",
    "Never claim or imply that this draft is ready to submit to a court or tribunal.",
    "factsToAdmit may ONLY contain: (a) confirmed procedural facts shown by court documents (e.g. filing dates, order dates, hearing dates recorded in the court file), or (b) facts independently verified by uploaded official records. A fact that appears only in the opposing party's pleadings is an allegation, not a confirmed fact, even if it describes a date or procedural step — it must NOT go in factsToAdmit. Put it in factsToDenyOrNotAdmit instead, or mark it 'not admitted pending verification.'",
    "Do not state definitive legal conclusions such as 'construction is fully authorized', 'this claim does not meet the legal threshold', or 'the zoning amendment cannot affect the permit' UNLESS the content analysis contains verified official-record evidence that directly supports that specific conclusion. Otherwise, replace the conclusion with hedged language: 'subject to verification', 'requires legal review', 'based on the current limited record', or 'not admitted.'",
    "Any statement that one claim or argument is legally stronger or weaker than another must be explicitly attributed to the uploaded internal assessment (e.g. 'the uploaded internal assessment suggests...') — never presented as your own independent final conclusion.",
    "Return ONLY the JSON object, no other text, no markdown code fences."
  ].join("\n");

  var userContent = [
    { type: "text", text: "CONTENT ANALYSIS (the only source of case facts you may use):\n" + JSON.stringify(analysis, null, 2) }
  ];
  if (contentAnalysis.unreadableFiles && contentAnalysis.unreadableFiles.length) {
    userContent.push({ type: "text", text: "FILES THAT COULD NOT BE READ (never assume their content):\n" + JSON.stringify(contentAnalysis.unreadableFiles, null, 2) });
  }

  return { systemPrompt: systemPrompt, userContent: userContent, responseSchema: GEMINI_WORKING_DRAFT_RESPONSE_SCHEMA };
}

// ── Orchestration ──────────────────────────────────────────────────────────
// options.dryRun defaults to true (safe) — same convention as
// generateDisputeAiAnalysis_: only an explicit {dryRun:false} persists.
function generateDisputeWorkingDraft_(reviewId, auth, options) {
  assertAdmin_(auth);
  options = options || {};
  var dryRun = options.dryRun !== false;
  var language = options.language || DISPUTE_WORKING_DRAFT_DEFAULT_LANGUAGE;
  var draftType = options.draftType || DISPUTE_WORKING_DRAFT_DEFAULT_TYPE;
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var reviewSheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var reviewHeaders = disputeHeaders_(reviewSheet);
  var analysisColIndex = reviewHeaders.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) throw new Error('"' + DISPUTE_AI_ANALYSIS_COLUMN + '" column not found on ' + DISPUTE_REVIEWS_SHEET + '.');

  var reviewRowNum = findDisputeReviewRow_(reviewSheet, reviewHeaders, reviewId);
  if (!reviewRowNum) throw new Error("Review not found: " + reviewId);
  var existingRaw = reviewSheet.getRange(reviewRowNum, analysisColIndex + 1).getValue();
  var envelope = readDisputeWorkingDraftEnvelope_(existingRaw);

  if (!envelope.contentAnalysis) {
    throw new Error("No content analysis exists for this review yet. Generate the Increment B content analysis first.");
  }

  var promptPayload = buildDisputeWorkingDraftPrompt_(envelope.contentAnalysis, { language: language, draftType: draftType });
  var providerResult = callAiProvider_(promptPayload); // { text, meta: {model, httpStatus, finishReason} } — same seam as Increment B, no file reading involved

  var parsed;
  try {
    parsed = JSON.parse(providerResult.text);
  } catch (parseEx) {
    throw new Error("AI response was not valid JSON: " + parseEx);
  }
  validateDisputeWorkingDraft_(parsed); // throws a clear error on missing keys or wrong types — no repair layer, no retry

  var fieldSummary = {};
  DISPUTE_WORKING_DRAFT_REQUIRED_FIELDS.forEach(function (key) {
    var value = parsed[key];
    fieldSummary[key] = {
      present: key in parsed,
      approxLength: typeof value === "string" ? value.length : (Array.isArray(value) ? value.length : null)
    };
  });

  var updatedEnvelope = mergeDisputeWorkingDraftEnvelope_(existingRaw, parsed);

  if (dryRun) {
    return {
      reviewId: reviewId, dryRun: true, persisted: false, sheetWriteCount: 0, envelope: updatedEnvelope,
      providerMeta: providerResult.meta, fieldSummary: fieldSummary, schemaValid: true
    };
  }

  reviewSheet.getRange(reviewRowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return {
    reviewId: reviewId, dryRun: false, persisted: true, sheetWriteCount: 1, envelope: updatedEnvelope,
    providerMeta: providerResult.meta, fieldSummary: fieldSummary, schemaValid: true
  };
}
