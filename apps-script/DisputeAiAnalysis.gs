// ============================================================
//  AI Dispute Review — Content Analysis (Increment A)
//
//  Everything in DisputeReview.gs today (analyseDispute / buildDisputeReport
//  on the client, generateDisputeReport_ here) is deterministic — it reasons
//  only over form answers and file METADATA (category/filename/date), never
//  over what a file actually contains. This module is the first thing in the
//  app that opens an uploaded file's bytes and has an AI model read them.
//
//  Produces: Case Materials Summary, Missing Evidence, Timeline, Key Issues,
//  Preliminary AI Assessment. Working Draft Response is a separate, later
//  increment (highest legal sensitivity — deliberately not built yet).
//
//  Additive, admin-only, generate-on-demand — same posture as
//  generateDisputeReport_ / generateFormTwoDraft_. Never touches Dispute_Files
//  structure, and NO NEW COLUMN is added to Dispute_Reviews: per column-reuse
//  audit, the existing "AI Analysis JSON" column is repurposed with a
//  versioned, namespaced envelope instead —
//    { schemaVersion: 2, ruleAnalysis: {...}, contentAnalysis: {...} }
//  where ruleAnalysis is whatever was already stored there (the deterministic
//  report snapshot from submission — old rows store this as a bare
//  {title,sections:[...]} object with no schemaVersion, which is migrated on
//  read, never mutated in place until this module writes to it), and
//  contentAnalysis is this module's output. No other column is touched.
// ============================================================

var DISPUTE_AI_ANALYSIS_COLUMN = "AI Analysis JSON"; // reused, not a new column
var DISPUTE_AI_ANALYSIS_SCHEMA_VERSION = 2;
var DISPUTE_AI_MAX_FILES_PER_RUN = 25; // mirrors DISPUTE_MAX_FILES_PER_REVIEW
var DISPUTE_AI_MAX_TOTAL_CONTENT_BYTES = 20 * 1024 * 1024; // combined raw-byte budget per run, across all files, so one review's evidence can never blow up a single AI request regardless of the (separate) 15MB per-file upload cap
var DISPUTE_AI_TEXT_MIME_TYPES = ["application/json", "text/csv"];
var DISPUTE_AI_TEXT_PREVIEW_CHARS = 500;

// ── Envelope read/migrate/merge (pure — no sheet or Drive access) ────────
// Normalizes whatever is currently stored in "AI Analysis JSON" into
// { schemaVersion, ruleAnalysis, contentAnalysis }, regardless of which
// generation wrote it:
//   - empty cell                → ruleAnalysis: null, contentAnalysis: null
//   - old flat shape ({sections:[...]}, no schemaVersion) → wrapped as ruleAnalysis
//   - already-versioned envelope → passed through as-is
// Never mutates anything — read-side only.
function readDisputeAiAnalysisEnvelope_(rawCellValue) {
  var text = disputeText_(rawCellValue);
  if (!text) {
    return { schemaVersion: DISPUTE_AI_ANALYSIS_SCHEMA_VERSION, ruleAnalysis: null, contentAnalysis: null, workingDraft: null, evidenceMatrix: null, documentDiscovery: null, examinationDiscovery: null };
  }
  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (parseEx) {
    return { schemaVersion: DISPUTE_AI_ANALYSIS_SCHEMA_VERSION, ruleAnalysis: null, contentAnalysis: null, workingDraft: null, evidenceMatrix: null, documentDiscovery: null, examinationDiscovery: null };
  }
  if (parsed && typeof parsed === "object" && parsed.schemaVersion === DISPUTE_AI_ANALYSIS_SCHEMA_VERSION) {
    return {
      schemaVersion: DISPUTE_AI_ANALYSIS_SCHEMA_VERSION,
      ruleAnalysis: parsed.hasOwnProperty("ruleAnalysis") ? parsed.ruleAnalysis : null,
      contentAnalysis: parsed.hasOwnProperty("contentAnalysis") ? parsed.contentAnalysis : null,
      // Increment C sibling namespace (see DisputeWorkingDraft.gs). Read here
      // (not just there) so mergeDisputeAiAnalysisEnvelope_ — used every time
      // Increment B's contentAnalysis is (re)generated — never has to know
      // about workingDraft to still carry it forward untouched.
      workingDraft: parsed.hasOwnProperty("workingDraft") ? parsed.workingDraft : null,
      // Evidence Matrix sibling namespace (see DisputeEvidenceMatrix.gs). Read
      // here for the same reason workingDraft is: so every OTHER envelope
      // writer (content analysis, working draft) carries it forward untouched
      // instead of silently dropping it on their next write.
      evidenceMatrix: parsed.hasOwnProperty("evidenceMatrix") ? parsed.evidenceMatrix : null,
      // Document Discovery sibling namespace (see DisputeDocumentDiscovery.gs).
      // Same reason as evidenceMatrix: every OTHER envelope writer must carry
      // it forward untouched.
      documentDiscovery: parsed.hasOwnProperty("documentDiscovery") ? parsed.documentDiscovery : null,
      // Examination for Discovery sibling namespace (see
      // DisputeExaminationDiscovery.gs). Same reason as the others.
      examinationDiscovery: parsed.hasOwnProperty("examinationDiscovery") ? parsed.examinationDiscovery : null
    };
  }
  // Pre-existing flat shape (the report JSON snapshot submitDisputeReview_
  // has always written here) — preserve it as ruleAnalysis rather than
  // discarding it, and start contentAnalysis/workingDraft/evidenceMatrix/documentDiscovery/examinationDiscovery empty.
  return { schemaVersion: DISPUTE_AI_ANALYSIS_SCHEMA_VERSION, ruleAnalysis: parsed, contentAnalysis: null, workingDraft: null, evidenceMatrix: null, documentDiscovery: null, examinationDiscovery: null };
}

// Merges a freshly generated content analysis into whatever envelope already
// exists in the cell, leaving ruleAnalysis untouched. Pure function — the
// caller stringifies and writes the result to the sheet.
function mergeDisputeAiAnalysisEnvelope_(rawCellValue, contentAnalysis) {
  var envelope = readDisputeAiAnalysisEnvelope_(rawCellValue);
  envelope.contentAnalysis = contentAnalysis;
  return envelope;
}

// ── File content ingestion ───────────────────────────────────────────────
// Builds a normalized content block for one Dispute_Files row. PDFs and
// images are handed to the model natively (base64) — modern multimodal
// models accept both directly, no separate OCR step. DOCX/DOC are NOT
// automatically read in this increment (would require enabling the Drive
// Advanced Service via a new appsscript.json manifest — first time this repo
// would need one; deliberately deferred rather than bundled into this pass).
// Anything unreadable is flagged, never silently skipped, mirroring the
// existing readSupportDocumentText_ graceful-degradation precedent.
function buildDisputeFileContentBlock_(fileRow, headers) {
  var driveUrlCol = headers.indexOf("Google Drive URL");
  var fileNameCol = headers.indexOf("File Name");
  var categoryCol = headers.indexOf("Document Category");
  var driveUrl = disputeText_(fileRow[driveUrlCol]);
  var fileName = disputeText_(fileRow[fileNameCol]);
  var category = disputeText_(fileRow[categoryCol]);

  var match = driveUrl.match(/[-\w]{25,}/);
  if (!match) {
    return { fileName: fileName, category: category, readable: false, reason: "No Drive file ID found in the stored URL." };
  }

  try {
    var file = DriveApp.getFileById(match[0]);
    var mimeType = file.getMimeType();
    var ext = fileName.indexOf(".") >= 0 ? fileName.split(".").pop().toLowerCase() : "";

    if (mimeType === "application/pdf") {
      var pdfBlob = file.getBlob();
      return { fileName: fileName, category: category, readable: true, kind: "document", mimeType: mimeType, base64: Utilities.base64Encode(pdfBlob.getBytes()) };
    }
    if (mimeType.indexOf("image/") === 0) {
      var imgBlob = file.getBlob();
      return { fileName: fileName, category: category, readable: true, kind: "image", mimeType: mimeType, base64: Utilities.base64Encode(imgBlob.getBytes()) };
    }
    if (mimeType.indexOf("text/") === 0 || DISPUTE_AI_TEXT_MIME_TYPES.indexOf(mimeType) >= 0) {
      return { fileName: fileName, category: category, readable: true, kind: "text", text: file.getBlob().getDataAsString().slice(0, 20000) };
    }
    if (ext === "doc" || ext === "docx" || mimeType.indexOf("wordprocessingml") >= 0) {
      return { fileName: fileName, category: category, readable: false, reason: "DOCX/DOC automated reading is not yet supported (planned for a follow-up increment). Manual review required." };
    }
    return { fileName: fileName, category: category, readable: false, reason: "Unsupported file type for automated reading: " + (ext || mimeType) + ". Manual review required." };
  } catch (ex) {
    return { fileName: fileName, category: category, readable: false, reason: "Could not open file: " + ex };
  }
}

// Looks up every Dispute_Files row for a review, oldest-uploaded first (same
// order as Sort Order / upload order in the sheet), capped at
// DISPUTE_AI_MAX_FILES_PER_RUN rows before any content is read.
function getDisputeFileRowsForReview_(reviewId, filesSheet, filesHeaders) {
  var fileRows = [];
  if (filesSheet.getLastRow() > 1) {
    var reviewIdCol = filesHeaders.indexOf("Review ID");
    var allValues = filesSheet.getRange(2, 1, filesSheet.getLastRow() - 1, filesHeaders.length).getValues();
    fileRows = allValues.filter(function (row) { return disputeText_(row[reviewIdCol]) === reviewId; });
  }
  if (fileRows.length > DISPUTE_AI_MAX_FILES_PER_RUN) fileRows = fileRows.slice(0, DISPUTE_AI_MAX_FILES_PER_RUN);
  return fileRows;
}

// Builds content blocks for every file row, enforcing DISPUTE_AI_MAX_TOTAL_CONTENT_BYTES
// across the whole run: once the running total of already-included file bytes
// would exceed the budget, every remaining file (in upload order) is demoted
// to unreadable with a clear reason instead of being silently dropped or
// silently included past the budget. The per-file 15MB upload cap already
// bounds any single file; this bounds the combined size of one AI request.
function buildDisputeAiFileBlocksForReview_(reviewId, filesSheet, filesHeaders) {
  var fileRows = getDisputeFileRowsForReview_(reviewId, filesSheet, filesHeaders);
  var runningBytes = 0;
  return fileRows.map(function (row) {
    var block = buildDisputeFileContentBlock_(row, filesHeaders);
    if (!block.readable) return block;

    var blockBytes = block.base64 ? Math.round(block.base64.length * 0.75) : (block.text ? block.text.length : 0);
    if (runningBytes + blockBytes > DISPUTE_AI_MAX_TOTAL_CONTENT_BYTES) {
      return {
        fileName: block.fileName,
        category: block.category,
        readable: false,
        reason: "Skipped: combined content budget for this run (" + Math.round(DISPUTE_AI_MAX_TOTAL_CONTENT_BYTES / (1024 * 1024)) + "MB) already reached by earlier files. Run again after removing or reviewing some evidence manually."
      };
    }
    runningBytes += blockBytes;
    return block;
  });
}

// ── Prompt assembly ───────────────────────────────────────────────────────
// Normalized {systemPrompt, userContent} shape, independent of AI provider.
function buildDisputeAiAnalysisPrompt_(review, ruleAnalysis, fileBlocks) {
  var systemPrompt = [
    "You are assisting with a preliminary AI review of a landlord/tenant or civil dispute file for a British Columbia property management studio.",
    "You are given: (1) the client's own intake answers, (2) a deterministic rule-based analysis already computed by this system — treat its dates, deadlines, and risk flags as authoritative facts, do not recompute them, and (3) the actual uploaded case documents/photos.",
    "Produce a single JSON object with exactly these keys: caseMaterialsSummary (string), missingEvidence (array of strings), timeline (array of objects: {date, description, source}), keyIssues (array of strings), preliminaryAssessment (string).",
    "Rules: never state something as a confirmed fact unless it is either in the client's own answers or literally visible in an uploaded document — name which document when you do. If the client alleges something but no document supports it, say so explicitly (e.g. 'The tenant alleges X; no supporting document has been uploaded confirming this.'). If the materials are insufficient to assess something, say so rather than guessing. Do not provide legal advice or predict a case outcome — only organize what is present and flag what is missing.",
    "Source priority for independent analysis, highest first: (1) court pleadings, (2) court orders / official records, (3) client-submitted evidence. Internal assessment reports (any document that is itself a prior assessment, opinion, or draft report rather than a primary case record) are SECONDARY reference only — you must first form your own analysis from the first three categories before consulting them.",
    "Do not merely restate an internal assessment report's conclusions as your own. If you do rely on or adopt a view from an internal assessment report, say so explicitly with wording like: \"The uploaded internal assessment suggests...\" — never present it as an independent finding.",
    "If the primary materials (pleadings, court orders/official records, client-submitted evidence) are not sufficient on their own to independently support a judgment, write exactly: \"Insufficient evidence for an independent assessment.\" for that point, rather than filling the gap from an internal assessment report.",
    "preliminaryAssessment must clearly distinguish three kinds of statements: (a) independent assessment based on primary materials, (b) observations derived from internal assessment reports (marked per the previous rule), and (c) issues requiring expert or legal verification.",
    "Statements drawn from pleadings (e.g. a Notice of Civil Claim, a Notice to End Tenancy, a Dispute Resolution Application) are allegations, not proven facts — describe them using 'alleged', 'pleaded', or 'according to the claim/notice', never as established fact.",
    "If any uploaded file was unreadable, disclose that plainly within caseMaterialsSummary (which file, and that it could not be read), do not silently omit it.",
    "Return ONLY the JSON object, no other text, no markdown code fences."
  ].join("\n");

  var userContent = [];
  userContent.push({ type: "text", text: "INTAKE ANSWERS:\n" + JSON.stringify({
    disputeType: review["Dispute Type"],
    clientRole: review["Client Role"],
    disputeSummary: review["Dispute Summary"],
    clientPosition: review["Client Position"],
    opposingPosition: review["Opposing Party Position"],
    desiredOutcome: review["Desired Outcome"]
  }, null, 2) });
  userContent.push({ type: "text", text: "EXISTING DETERMINISTIC ANALYSIS (authoritative for dates/deadlines/risk):\n" + JSON.stringify(ruleAnalysis, null, 2) });

  fileBlocks.forEach(function (block) {
    if (!block.readable) {
      userContent.push({ type: "text", text: "[UNREADABLE FILE — " + block.category + " — " + block.fileName + "]: " + block.reason });
      return;
    }
    if (block.kind === "document") {
      userContent.push({ type: "text", text: "[DOCUMENT — " + block.category + " — " + block.fileName + "]" });
      userContent.push({ type: "document", source: { type: "base64", media_type: block.mimeType, data: block.base64 } });
    } else if (block.kind === "image") {
      userContent.push({ type: "text", text: "[IMAGE — " + block.category + " — " + block.fileName + "]" });
      userContent.push({ type: "image", source: { type: "base64", media_type: block.mimeType, data: block.base64 } });
    } else {
      userContent.push({ type: "text", text: "[TEXT FILE — " + block.category + " — " + block.fileName + "]:\n" + block.text });
    }
  });

  return { systemPrompt: systemPrompt, userContent: userContent };
}

// ── AiProvider (provider-agnostic contract) ──────────────────────────────
// The ONLY function the rest of the pipeline calls. Everything above this
// line uses the normalized {systemPrompt, userContent} shape regardless of
// provider. A provider implementation must accept that shape and return
// { text, meta }, where text is the model's raw reply (a String the caller
// will JSON.parse) and meta is small, redaction-safe diagnostic info (model
// name, HTTP status, finish reason — never the API key, never full request
// content) that callers can log or surface without dumping case content or
// the full model output. Nothing upstream needs to change if a provider is
// ever swapped or added; only this function's dispatch and the one concrete
// *Provider_generate_ need updating.
var AI_PROVIDER_NAME = "gemini"; // the only implementation right now

function callAiProvider_(promptPayload) {
  if (AI_PROVIDER_NAME === "gemini") return callGeminiProvider_(promptPayload);
  throw new Error("Unknown AI provider: " + AI_PROVIDER_NAME);
}

// ── GeminiProvider (the one concrete implementation) ─────────────────────
// API key lives ONLY in Apps Script's Script Properties (Project Settings →
// Script Properties in the editor), never in a Sheet — unlike the existing
// Cloudinary key, which is intentionally not the precedent followed here.
var GEMINI_API_KEY_PROPERTY = "GEMINI_API_KEY";
var GEMINI_DEFAULT_MODEL = "gemini-3.5-flash-lite";
var GEMINI_MODEL_PROPERTY = "GEMINI_MODEL"; // optional Script Property override

// Constrains Gemini's structured output to exactly the 5 Increment A fields,
// matching the same shape already described in buildDisputeAiAnalysisPrompt_'s
// systemPrompt and checked (key-presence only) by the requiredKeys check in
// generateDisputeAiAnalysis_ below. This does not replace that check — it
// only makes a malformed/missing-key response far less likely to occur in
// the first place; JSON.parse and the requiredKeys check still run exactly
// as before and still throw immediately on anything unexpected.
var GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    caseMaterialsSummary: { type: "string" },
    missingEvidence: { type: "array", items: { type: "string" } },
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          source: { type: "string" }
        },
        required: ["date", "description", "source"]
      }
    },
    keyIssues: { type: "array", items: { type: "string" } },
    preliminaryAssessment: { type: "string" }
  },
  required: ["caseMaterialsSummary", "missingEvidence", "timeline", "keyIssues", "preliminaryAssessment"]
};

function callGeminiProvider_(promptPayload) {
  var apiKey = PropertiesService.getScriptProperties().getProperty(GEMINI_API_KEY_PROPERTY);
  if (!apiKey) {
    throw new Error('Gemini is not configured yet. Add a "' + GEMINI_API_KEY_PROPERTY + '" Script Property (Project Settings → Script Properties) before generating an analysis.');
  }
  var model = PropertiesService.getScriptProperties().getProperty(GEMINI_MODEL_PROPERTY) || GEMINI_DEFAULT_MODEL;

  // promptPayload.responseSchema lets a caller (e.g. DisputeWorkingDraft.gs)
  // constrain Gemini's structured output to its OWN schema instead of the
  // Increment A/B content-analysis one. Increment A/B's own prompt builder
  // never sets this, so it keeps defaulting to GEMINI_RESPONSE_SCHEMA exactly
  // as before — fully backward compatible.
  var requestBody = {
    system_instruction: { parts: [{ text: promptPayload.systemPrompt }] },
    contents: [{ role: "user", parts: convertToGeminiParts_(promptPayload.userContent) }],
    generationConfig: { responseMimeType: "application/json", responseSchema: promptPayload.responseSchema || GEMINI_RESPONSE_SCHEMA }
  };

  // Per Google's current Gemini API guidance, the key goes in the
  // "x-goog-api-key" header, never in the URL query string — a URL is far
  // more likely to end up copied into logs, error traces, or debugging
  // output than a header value ever is.
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": apiKey },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  var status = response.getResponseCode();
  var rawText = response.getContentText();
  if (status < 200 || status >= 300) {
    // rawText is the response BODY only — never the request, so this can
    // never echo back the api key or the "x-goog-api-key" header.
    throw new Error("Gemini API error (" + status + "): " + rawText.slice(0, 500));
  }

  var parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseEx) {
    throw new Error("Gemini response envelope was not valid JSON: " + parseEx);
  }

  var candidate = parsed && parsed.candidates && parsed.candidates[0];
  var finishReason = candidate && candidate.finishReason;
  if (finishReason && finishReason !== "STOP") {
    throw new Error("Gemini did not finish normally (finishReason: " + finishReason + ").");
  }
  var candidateText = candidate && candidate.content && candidate.content.parts &&
    candidate.content.parts[0] && candidate.content.parts[0].text;
  if (!candidateText) {
    throw new Error("Gemini response did not contain the expected candidate text.");
  }
  return { text: candidateText, meta: { model: model, httpStatus: status, finishReason: finishReason || null } };
}

// Converts the provider-agnostic userContent blocks ({type: "text"|"document"|"image", ...})
// into Gemini's "parts" array shape. Pure function — no network/sheet access —
// so it is unit-testable on its own.
function convertToGeminiParts_(userContent) {
  return userContent.map(function (block) {
    if (block.type === "text") return { text: block.text };
    if (block.type === "document" || block.type === "image") {
      return { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
    }
    throw new Error("Unsupported content block type for Gemini: " + block.type);
  });
}

// ── Orchestration ─────────────────────────────────────────────────────────
// options.dryRun defaults to true (safe): calling this with no options, or
// with any options object that doesn't set dryRun to exactly false, still
// calls the real AI provider and validates its response, but never writes to
// the sheet. Persistence happens ONLY when the caller explicitly passes
// { dryRun: false } — a typo, an omitted flag, or a truthy-but-not-exactly-
// false value can never accidentally trigger a real write.
function generateDisputeAiAnalysis_(reviewId, auth, options) {
  assertAdmin_(auth);
  options = options || {};
  var dryRun = options.dryRun !== false;
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var reviewSheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var reviewHeaders = disputeHeaders_(reviewSheet);
  var analysisColIndex = reviewHeaders.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (analysisColIndex < 0) throw new Error('"' + DISPUTE_AI_ANALYSIS_COLUMN + '" column not found on ' + DISPUTE_REVIEWS_SHEET + '.');

  var reviewRowNum = findDisputeReviewRow_(reviewSheet, reviewHeaders, reviewId);
  if (!reviewRowNum) throw new Error("Review not found: " + reviewId);
  var reviewValues = reviewSheet.getRange(reviewRowNum, 1, 1, reviewHeaders.length).getValues()[0];
  var review = {};
  reviewHeaders.forEach(function (h, i) { review[h] = reviewValues[i]; });

  var existingRaw = reviewValues[analysisColIndex];
  var existingEnvelope = readDisputeAiAnalysisEnvelope_(existingRaw);
  var ruleAnalysis = existingEnvelope.ruleAnalysis || {};

  var filesSheet = getDisputeSheet_(DISPUTE_FILES_SHEET);
  var filesHeaders = disputeHeaders_(filesSheet);
  var fileBlocks = buildDisputeAiFileBlocksForReview_(reviewId, filesSheet, filesHeaders);
  var promptPayload = buildDisputeAiAnalysisPrompt_(review, ruleAnalysis, fileBlocks);
  var providerResult = callAiProvider_(promptPayload); // { text, meta: {model, httpStatus, finishReason} }

  var parsed;
  try {
    parsed = JSON.parse(providerResult.text);
  } catch (parseEx) {
    throw new Error("AI response was not valid JSON: " + parseEx);
  }
  var requiredKeys = ["caseMaterialsSummary", "missingEvidence", "timeline", "keyIssues", "preliminaryAssessment"];
  var missingKeys = requiredKeys.filter(function (key) { return !(key in parsed); });
  if (missingKeys.length) throw new Error("AI response is missing required keys: " + missingKeys.join(", "));

  // Redaction-safe, per-field shape summary (present + approximate length)
  // so a caller (e.g. a dry-run report) can confirm the response looks
  // complete and reasonably sized WITHOUT logging the actual case content
  // or the full model output.
  var fieldSummary = {};
  requiredKeys.forEach(function (key) {
    var value = parsed[key];
    var approxLength = null;
    if (typeof value === "string") approxLength = value.length;
    else if (Array.isArray(value)) approxLength = value.length;
    else if (value !== undefined) approxLength = JSON.stringify(value).length;
    fieldSummary[key] = { present: key in parsed, approxLength: approxLength };
  });

  var contentAnalysis = {
    generatedAt: new Date().toISOString(),
    unreadableFiles: fileBlocks.filter(function (b) { return !b.readable; }).map(function (b) { return { fileName: b.fileName, category: b.category, reason: b.reason }; }),
    analysis: parsed
  };
  var updatedEnvelope = mergeDisputeAiAnalysisEnvelope_(existingRaw, contentAnalysis);

  var fileStats = {
    filesIncluded: fileBlocks.length,
    readableFiles: fileBlocks.filter(function (b) { return b.readable; }).length,
    unreadableFiles: fileBlocks.filter(function (b) { return !b.readable; }).length,
    totalBytesProcessed: fileBlocks.reduce(function (sum, b) {
      return sum + (b.base64 ? Math.round(b.base64.length * 0.75) : (b.text ? b.text.length : 0));
    }, 0)
  };

  if (dryRun) {
    return {
      reviewId: reviewId, dryRun: true, persisted: false, envelope: updatedEnvelope,
      providerMeta: providerResult.meta, fieldSummary: fieldSummary, schemaValid: true, fileStats: fileStats
    };
  }

  reviewSheet.getRange(reviewRowNum, analysisColIndex + 1).setValue(JSON.stringify(updatedEnvelope));
  return {
    reviewId: reviewId, dryRun: false, persisted: true, envelope: updatedEnvelope,
    providerMeta: providerResult.meta, fieldSummary: fieldSummary, schemaValid: true, fileStats: fileStats
  };
}

// Admin-only, read-only content quality review: runs the real dry-run
// pipeline (real Gemini call, real schema validation) and returns the full
// 5-field contentAnalysis for an admin to read and judge quality — WITHOUT
// ever persisting anything. Thin wrapper around generateDisputeAiAnalysis_'s
// existing dryRun path; does not touch the prompt, model, schema, file
// reading, or provider layer at all. Does not call Logger.log with the
// content — the caller decides how (or whether) to display the returned
// object, keeping the case content out of the Apps Script execution log.
function reviewDisputeAiAnalysisDryRun_(reviewId, auth) {
  assertAdmin_(auth);
  var result = generateDisputeAiAnalysis_(reviewId, auth, { dryRun: true });
  return {
    reviewId: result.reviewId,
    dryRun: true,
    persisted: false,
    contentAnalysis: result.envelope.contentAnalysis.analysis, // {caseMaterialsSummary, missingEvidence, timeline, keyIssues, preliminaryAssessment}
    providerMeta: result.providerMeta,
    fieldSummary: result.fieldSummary,
    schemaValid: result.schemaValid,
    fileStats: result.fileStats
  };
}

// Admin-only read of the stored "AI Analysis JSON" cell, without regenerating
// anything. Returns the full envelope { schemaVersion, ruleAnalysis,
// contentAnalysis } so a caller can confirm both that a content analysis
// exists AND that ruleAnalysis was left untouched by that write — not just
// contentAnalysis in isolation. contentAnalysis is null if none has been
// generated yet (including for reviews whose cell still holds only the old
// flat ruleAnalysis shape, with no schemaVersion).
function getDisputeAiAnalysis_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");
  var sheet = getDisputeSheet_(DISPUTE_REVIEWS_SHEET);
  var headers = disputeHeaders_(sheet);
  var colIndex = headers.indexOf(DISPUTE_AI_ANALYSIS_COLUMN);
  if (colIndex < 0) return { schemaVersion: DISPUTE_AI_ANALYSIS_SCHEMA_VERSION, ruleAnalysis: null, contentAnalysis: null };
  var rowNum = findDisputeReviewRow_(sheet, headers, reviewId);
  if (!rowNum) throw new Error("Review not found: " + reviewId);
  var raw = sheet.getRange(rowNum, colIndex + 1).getValue();
  return readDisputeAiAnalysisEnvelope_(raw);
}

// ── Diagnostics ───────────────────────────────────────────────────────────
// Read-only: builds the file content blocks for a review WITHOUT calling any
// AI provider, so the file-reading half of the pipeline can be verified on
// its own (which files are readable, detected MIME types, sizes, per-file and
// combined-run budget enforcement) before a provider is chosen and wired into
// callAiProvider_. Never writes to any sheet or Drive file.
//
// Note on "text preview": this increment does NOT run OCR or local text
// extraction on PDFs/images — their raw bytes are handed to the (not yet
// configured) AI model natively as document/image content blocks. So a
// human-readable text preview only exists for genuinely text-based files
// (txt/csv/json); PDF and image rows report their detected kind, MIME type,
// and size, with an explicit note instead of a fabricated preview.
function previewDisputeAiFileBlocks_(reviewId, auth) {
  assertAdmin_(auth);
  reviewId = disputeText_(reviewId);
  if (!reviewId) throw new Error("Review ID is required.");

  var filesSheet = getDisputeSheet_(DISPUTE_FILES_SHEET);
  var filesHeaders = disputeHeaders_(filesSheet);
  var totalFileCount = getDisputeFileRowsForReview_(reviewId, filesSheet, filesHeaders).length;
  var blocks = buildDisputeAiFileBlocksForReview_(reviewId, filesSheet, filesHeaders);

  var summary = blocks.map(function (b) {
    var isTextKind = b.readable && b.kind === "text";
    return {
      fileName: b.fileName,
      category: b.category,
      readable: b.readable,
      kind: b.kind || null,
      mimeType: b.mimeType || null,
      approxBytes: b.base64 ? Math.round(b.base64.length * 0.75) : (b.text ? b.text.length : null),
      extractedTextLength: isTextKind ? b.text.length : null,
      textPreview: isTextKind ? b.text.slice(0, DISPUTE_AI_TEXT_PREVIEW_CHARS) : null,
      note: b.readable && !isTextKind
        ? "No local text extraction in this increment — raw bytes are passed natively to the AI model as a " + b.kind + " content block."
        : null,
      reason: b.reason || null
    };
  });

  var result = {
    reviewId: reviewId,
    filesFoundForReview: totalFileCount,
    filesIncludedInThisRun: blocks.length,
    perFileRunCap: DISPUTE_AI_MAX_FILES_PER_RUN,
    combinedContentBudgetBytes: DISPUTE_AI_MAX_TOTAL_CONTENT_BYTES,
    combinedContentBudgetUsedBytes: blocks.reduce(function (sum, b) {
      return sum + (b.base64 ? Math.round(b.base64.length * 0.75) : (b.text ? b.text.length : 0));
    }, 0),
    files: summary
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
