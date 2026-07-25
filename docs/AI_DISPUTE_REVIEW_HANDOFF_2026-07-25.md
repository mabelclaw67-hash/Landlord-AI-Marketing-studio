# AI Dispute Review — Backend Handoff

**Date:** 2026-07-25
**Scope:** Increment A (file/content-analysis foundation) + Increment B (Gemini content analysis) + Increment C (Gemini Working Draft generation) + a first Admin UI integration
**Status:** Backend complete, tested, verified with real data. A minimal Admin UI panel has been added to the existing Dispute Review admin page (§L).

---

## A. Executive Summary

**What was built:** A backend pipeline that lets an admin trigger a real AI model (Gemini) to read the case materials already uploaded to an AI Dispute Review file, and produce two outputs:

1. **Content Analysis** — a structured summary of the case (summary, missing evidence, timeline, key issues, preliminary assessment), grounded only in the client's intake answers, the existing deterministic rule-based analysis, and the actual uploaded documents.
2. **Working Draft** — an internal drafting aid (facts to admit/deny, response points, evidence needed, next steps, risk notes, and draft response text) built ONLY from the already-generated Content Analysis — it never re-reads the uploaded files.

**Current production status:** All backend code is committed to `main`, pushed to GitHub, and pushed to the Apps Script project's editable HEAD (`clasp push`). It has NOT yet been deployed as a new Web App version at the time this document is written — see §5 of the closeout report for that step, done separately after this document.

**What is usable now:** An admin can open any Dispute Review in `/admin/dispute-reviews`, scroll to the new "AI Review: Content Analysis & Working Draft" panel, and Generate/Regenerate (preview, no write) or Save (real write) either output. All three actions (`generateDisputeAiAnalysis`, `getDisputeAiAnalysis`, `generateDisputeWorkingDraft`) are registered in the `doPost` dispatcher. Everything still also remains directly callable from the Apps Script editor for engineering use.

**What is not yet exposed in the admin UI:** PDF export, Chinese-language generation, and any "send" or "file" action — see §H/§J/§L for what's deliberately deferred to a later phase.

---

## B. Architecture

- **`Dispute_Reviews` remains the single source of truth.** No new sheet, no new spreadsheet column, no parallel data store. Everything this phase built layers on top of the review row that already existed.
- **The existing `AI Analysis JSON` column is reused** as a single JSON-stringified envelope with a versioned, namespaced structure:

  ```json
  {
    "schemaVersion": 2,
    "ruleAnalysis": {},
    "contentAnalysis": {},
    "workingDraft": {}
  }
  ```

  - `ruleAnalysis` — the deterministic report snapshot `submitDisputeReview_` has always written to this column (the same object also stored in `Report EN JSON`). Old rows have no `schemaVersion` at all and store this object directly, flat, with no wrapper — see the migration rule below.
  - `contentAnalysis` — Increment B's output: `{ generatedAt, unreadableFiles, analysis: {...5 fields} }`.
  - `workingDraft` — Increment C's output: the 12-field draft object (§E).

- **Why no new column was added:** an explicit column-reuse audit (done before any Increment B code was written) confirmed `AI Analysis JSON` was never read by any code path for its content — only duplicated the same value as `Report EN JSON` at submission time — so it was safe to repurpose with a versioned envelope instead of touching the hand-authored sheet schema. `AI Timeline` / `AI Issues Identified` / `AI Strengths` / `AI Weaknesses` (plain-text convenience columns for someone reading the raw sheet by eye) were left untouched — they are not JSON containers and were judged unsuitable for reuse.
- **Envelope read/migrate:** `readDisputeAiAnalysisEnvelope_` (`apps-script/DisputeAiAnalysis.gs:42`) is the ONE authoritative parser for this cell. It:
  - Returns `{schemaVersion:null-safe defaults}` for an empty or unparseable cell.
  - Passes a versioned envelope through as-is, defaulting any missing key (`ruleAnalysis`/`contentAnalysis`/`workingDraft`) to `null`.
  - Wraps a pre-existing flat object (no `schemaVersion`) as `ruleAnalysis`, with `contentAnalysis`/`workingDraft` both `null`.
  - This is why `workingDraft` was added to this one shared reader rather than given its own separate parser: any code path that reads this cell (including a future regeneration of `contentAnalysis`) must see the sibling namespaces or it would silently drop them on the next write.
- **Resubmission preservation:** `submitDisputeReview_` (`apps-script/DisputeReview.gs`) writes a fresh `AI Analysis JSON` value on every intake submission (initial and resubmission). A guard was added so that if the cell already contains a generated `contentAnalysis`, a resubmission preserves the whole envelope untouched instead of overwriting it with the client's stale snapshot. If no `contentAnalysis` has been generated yet, the column still behaves exactly as it always did — refreshing on every submission, same as `Report EN/ZH JSON`.

---

## C. Increment A — Provider-Independent Foundation

- **Existing column audit:** confirmed `AI Timeline`, `AI Issues Identified`, `AI Strengths`, `AI Weaknesses`, `AI Analysis JSON` are the only "AI-sounding" columns on `Dispute_Reviews`; only `AI Analysis JSON` was free-in-practice (see §B) and reused.
- **Envelope migration/merge:** `readDisputeAiAnalysisEnvelope_` / `mergeDisputeAiAnalysisEnvelope_` (`apps-script/DisputeAiAnalysis.gs:42`, `:67`) — pure functions, no sheet/Drive access, fully unit tested (§G).
- **File-reading pipeline:** `buildDisputeFileContentBlock_` (`apps-script/DisputeAiAnalysis.gs:89`) reads one `Dispute_Files` row at a time via `DriveApp.getFileById`, dispatches by detected MIME type:
  - **PDF and images** (`application/pdf`, `image/*`) → base64-encoded and handed to Gemini as a native document/image content block (no local OCR/text extraction).
  - **Text-like** (`text/*`, `application/json`, `text/csv`) → read as a string, truncated to 20,000 characters per file.
  - **DOCX/DOC** → explicitly marked unreadable with a clear reason (see §H — not supported this phase).
  - **Anything else** → marked unreadable with a clear "unsupported file type" reason.
  - A file that throws while opening (e.g. a bad Drive URL) is marked unreadable with the error message, never silently skipped.
- **Supported file types:** PDF, JPG/JPEG/PNG/HEIC/WEBP (native multimodal), TXT/CSV/JSON (as text).
- **Unsupported file types:** DOC/DOCX (deliberately deferred — would require this repo's first-ever Apps Script `appsscript.json` Drive Advanced Service dependency); anything else not listed above.
- **Limits** (`apps-script/DisputeAiAnalysis.gs:29-32`):
  - `DISPUTE_AI_MAX_FILES_PER_RUN = 25` files per generation call.
  - `DISPUTE_AI_MAX_TOTAL_CONTENT_BYTES = 20 MB` combined raw-byte budget per run across all included files — once the running total would exceed this, remaining files in upload order are marked unreadable with a clear "combined content budget already reached" reason rather than silently truncating or including them anyway.
  - Per-file text-content slice: 20,000 characters (text/csv/json files only; PDFs/images are not text-truncated since they're passed as raw bytes).
- **Read-only preview:** `previewDisputeAiFileBlocks_` (`apps-script/DisputeAiAnalysis.gs:489`) builds the same file content blocks WITHOUT ever calling an AI provider or writing anything — returns per-file readability, detected kind/MIME type, approximate size, a short text preview for genuinely text-based files, and an explicit note for PDF/image files that no local text extraction happens (their bytes go straight to the model). Used throughout development to verify the file-reading half of the pipeline before any real Gemini call existed.

---

## D. Increment B — Gemini Content Analysis

- **`AiProvider` seam:** `callAiProvider_(promptPayload)` (`apps-script/DisputeAiAnalysis.gs`) is the ONLY function the rest of the pipeline calls. It dispatches on `AI_PROVIDER_NAME` (currently hardcoded to `"gemini"`, the only implementation) to `callGeminiProvider_`. Adding a second provider means adding one new `*Provider_generate_`-style function and one line in this dispatcher — nothing upstream (prompt building, schema validation, persistence) needs to change.
- **`GeminiProvider` implementation:** `callGeminiProvider_` (`apps-script/DisputeAiAnalysis.gs:271`) makes a single `UrlFetchApp.fetch` POST to `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, with `generationConfig: {responseMimeType:"application/json", responseSchema: promptPayload.responseSchema || GEMINI_RESPONSE_SCHEMA}` — the `responseSchema` is pluggable per caller (Increment C uses its own; Increment B's own prompt builder never sets it, so it defaults to the Increment B schema). Returns `{text, meta:{model, httpStatus, finishReason}}` — `meta` is redaction-safe diagnostic info, never the API key.
- **Script Properties key:** `GEMINI_API_KEY` (`apps-script/DisputeAiAnalysis.gs:237`, `GEMINI_API_KEY_PROPERTY`). Stored ONLY in Apps Script's Script Properties (Project Settings → Script Properties in the editor) — deliberately NOT in the "System Settings" sheet where the Cloudinary key lives, for better secret hygiene.
- **Current model:** `gemini-3.5-flash-lite` (`GEMINI_DEFAULT_MODEL`, `apps-script/DisputeAiAnalysis.gs:238`). An optional `GEMINI_MODEL` Script Property overrides this without a code change. (History: started at `gemini-2.0-flash`, then `gemini-2.5-flash`, both retired/unavailable per live Gemini API errors during testing; `gemini-3.5-flash-lite` is the version confirmed working in production testing on 2026-07-25.)
- **Structured JSON schema:** `GEMINI_RESPONSE_SCHEMA` (`apps-script/DisputeAiAnalysis.gs:248`) — an object schema with all 5 fields required, matching the shape below exactly. Passed via Gemini's native `responseSchema` (forces structurally valid JSON), plus a defensive `requiredKeys` presence check in `generateDisputeAiAnalysis_` before anything is trusted — no JSON-repair layer, no retry; a bad response fails loudly.
- **Content analysis fields:**
  - `caseMaterialsSummary` (string)
  - `missingEvidence` (array of strings)
  - `timeline` (array of `{date, description, source}`)
  - `keyIssues` (array of strings)
  - `preliminaryAssessment` (string)
- **Source-grounding and prompt reliability rules** (`buildDisputeAiAnalysisPrompt_`): never state something as confirmed fact unless it's in the client's answers or literally visible in an uploaded document (named); explicit source-priority order for independent analysis — court pleadings > court orders/official records > client-submitted evidence, with internal assessment reports treated as SECONDARY reference only; must not merely restate an internal assessment's conclusion (must say `"The uploaded internal assessment suggests..."` when relying on one); must write the literal phrase `"Insufficient evidence for an independent assessment."` when primary materials can't independently support a judgment; `preliminaryAssessment` must distinguish independent analysis / internal-assessment-derived observations / issues needing expert-legal verification; pleadings-derived statements must use `alleged`/`pleaded`/`according to the claim`, never stated as fact; any unreadable file must be disclosed plainly in `caseMaterialsSummary`.
- **`dryRun` vs. persisted:** `generateDisputeAiAnalysis_(reviewId, auth, options)` — `options.dryRun` defaults to `true` (safe). The real Gemini call and full schema validation happen identically either way; persistence to the sheet happens ONLY when the caller passes the literal `{dryRun:false}`. On persist, only `contentAnalysis` is replaced in the envelope — `ruleAnalysis` (and `workingDraft`, if present) are carried through untouched.

---

## E. Increment C — Gemini Working Draft Generation

- **Input source:** ONLY the already-generated `envelope.contentAnalysis` for the review (the full object: `generatedAt`, `unreadableFiles`, `analysis`). If no `contentAnalysis` exists yet, `generateDisputeWorkingDraft_` throws immediately: `"No content analysis exists for this review yet. Generate the Increment B content analysis first."`
- **Confirmation Drive files are not reread:** `buildDisputeWorkingDraftPrompt_` and `generateDisputeWorkingDraft_` never call `DriveApp`, `buildDisputeFileContentBlock_`, `buildDisputeAiFileBlocksForReview_`, or touch the `Dispute_Files` sheet in any way — verified by a test suite whose sandbox deliberately does not define `DriveApp`/`Utilities` at all (a call would throw a `ReferenceError` immediately if the code path were ever exercised); the suite passes.
- **Working Draft schema and fields** (`GEMINI_WORKING_DRAFT_RESPONSE_SCHEMA`, `apps-script/DisputeWorkingDraft.gs:37`; validated by `validateDisputeWorkingDraft_`) — all 12 keys required:
  - `draftType` (string, fixed to `"response_working_draft"` this phase)
  - `language` (string, `"en"` only this phase)
  - `title` (string)
  - `casePositionSummary` (string)
  - `factsToAdmit` (array of strings)
  - `factsToDenyOrNotAdmit` (array of strings)
  - `responsePoints` (array of strings)
  - `evidenceNeeded` (array of strings)
  - `proceduralNextSteps` (array of strings)
  - `riskNotes` (array of strings)
  - `draftText` (string)
  - `disclaimer` (string)
- **Prompt safety rules** (`buildDisputeWorkingDraftPrompt_`): explicitly an INTERNAL WORKING DRAFT — never legal advice, never a formal court/tribunal document, never described as ready to file; must not invent any fact not already in `contentAnalysis`; uncertain facts use `'not admitted'` / `'requires verification'`; three-way distinction between opposing-party allegations, confirmed procedural facts, and content-analysis-derived observations; `draftText` must read as genuinely editable prose, not a bare outline or a finished filing; `factsToAdmit` may ONLY contain confirmed procedural facts shown by court documents or independently verified official records — a fact that appears only in the opposing party's pleadings (even a specific date) is NOT a confirmed fact and must go in `factsToDenyOrNotAdmit` or be marked `'not admitted pending verification'`; definitive legal conclusions (e.g. "construction is fully authorized") are forbidden unless the content analysis contains verified official-record evidence supporting that specific conclusion — otherwise hedge with `'subject to verification'` / `'requires legal review'` / `'based on the current limited record'` / `'not admitted'`; any claim-strength comparison must be attributed to the internal assessment, never presented as an independent conclusion.

  **Known residual gap (see §H):** live content-quality review on the real test case found the model still occasionally places a pleading-sourced fact (e.g. a permit date stated only in the Notice of Civil Claim) into `factsToAdmit` with a citation like `"according to the amended Notice of Civil Claim"` — the rule reduced but did not eliminate this failure mode. Human review before any external use is required regardless.

- **`dryRun` vs. persisted:** same convention as Increment B — `options.dryRun` defaults to `true`; only an explicit `{dryRun:false}` writes. On persist, only `workingDraft` is replaced — `ruleAnalysis` and `contentAnalysis` are carried through byte-for-byte unchanged (verified by a real write-then-read-back test on production data, §G).
- **Preservation of `ruleAnalysis`/`contentAnalysis`:** guaranteed by construction — `mergeDisputeWorkingDraftEnvelope_` reads the full envelope first (via the shared `readDisputeAiAnalysisEnvelope_`) and only overwrites the `workingDraft` key before re-stringifying.

---

## F. Security and Privacy

- **API key transmission:** the Gemini API key is sent ONLY in the `x-goog-api-key` HTTP header on the `UrlFetchApp.fetch` call. Confirmed absent from the request URL (no `?key=` query parameter — an earlier draft used this and was corrected) and absent from the JSON request body.
- **Admin-only checks:** every entry point (`generateDisputeAiAnalysis_`, `getDisputeAiAnalysis_`, `reviewDisputeAiAnalysisDryRun_`, `generateDisputeWorkingDraft_`) calls `assertAdmin_(auth)` as its first line — verified to reject before any Gemini call or sheet read/write happens.
- **No raw PDF binary or full request payload in normal logs:** none of the production functions call `Logger.log` with file bytes, the request body, or the API key. The (now-deleted) manual test wrapper files were the only place that ever logged output during development, and they logged either fully redacted diagnostics or, for the one content-quality-review pass, the generated text itself (never the request/key) — and only when the developer explicitly ran that specific function.
- **Temporary manual-test files removed:** all six `_TempManualTest_Dispute*.gs` files created during development and testing have been deleted from the local repository and from the Apps Script editable HEAD.

---

## G. Testing Evidence

- **Final local test count: 72 passed, 0 failed**, across three independent suites (each loads the real `.gs` source into a Node `vm` sandbox with fake Sheet/Drive/Properties/UrlFetchApp stubs — no live Google service is touched by these):
  - `test_dispute_ai_envelope.js` — 12 tests (envelope migration, merge, resubmission-guard logic, read-back semantics).
  - `test_dispute_ai_gemini.js` — 38 tests (Gemini provider wiring, `responseSchema`, dry-run/persist gating, admin gating, schema validation, API-key placement, prompt-hardening text assertions, `reviewDisputeAiAnalysisDryRun_`).
  - `test_dispute_working_draft.js` — 22 tests (prompt content assertions, dry-run/persist gating, admin gating, schema validation, file-reading-helper absence proof, envelope preservation, API-key placement, `fieldSummary` shape).
- **Syntax checks:** `node --check` passed on all four touched files (`Code.gs`, `DisputeReview.gs`, `DisputeAiAnalysis.gs`, `DisputeWorkingDraft.gs`).
- **Real Gemini dry-run verification (Content Analysis):** run against test Review `ADR-20260722-153929` — real Gemini call, `httpStatus:200`, `finishReason:STOP`, all 5 fields present with reasonable lengths, `sheetWriteCount:0`.
- **Real persisted `contentAnalysis` verification:** a real `{dryRun:false}` write against the same review, followed by an independent `getDisputeAiAnalysis_` read-back before/after comparison confirming `contentAnalysisExists:true` and `ruleAnalysisUnchanged:true`.
- **Real Working Draft dry-run verification:** run against the same review — real Gemini call, `schemaValid:true`, all 12 fields present, `sheetWriteCount:0` — followed by a full manual content-quality read of the generated `title`/`casePositionSummary`/`factsToAdmit`/`factsToDenyOrNotAdmit`/`responsePoints`/`evidenceNeeded`/`proceduralNextSteps`/`riskNotes`/`draftText`/`disclaimer`, approved after one prompt-hardening pass (§E's residual gap noted).
- **Real persisted `workingDraft` verification:** a real `{dryRun:false}` write, followed by read-back confirming `persisted:true`, `sheetWriteCount:1`, `schemaVersionCorrect:true`, `workingDraftExists:true`, `ruleAnalysisUnchanged:true`, `contentAnalysisUnchanged:true`.
- **Test Review ID used throughout: `ADR-20260722-153929`** (a labeled test record — "Supreme Case 0722" — containing 3 real PDFs and 1 real DOCX; the DOCX consistently exercised the unsupported-file-type path).

---

## H. Current Limitations

- **DOCX/DOC automated reading is not supported.** Every DOCX in the test data was correctly marked unreadable with a clear reason, and disclosed in `caseMaterialsSummary` — but no text is ever extracted from these files this phase. Supporting them would require this repo's first-ever Apps Script `appsscript.json` manifest enabling the Drive Advanced Service.
- **The image-evidence code path has never been exercised with a real image.** All 6 existing Dispute Files test folders (across every branch: RTB, Supreme Court, etc.) contain only PDFs and DOCX — no jpg/png was ever uploaded to a real or test review during this phase. The `image/*` branch of `buildDisputeFileContentBlock_` is implemented and unit-testable but not validated end-to-end against a real photo.
- **No admin frontend UI exists for any of this.** Everything is triggered via the Apps Script editor or a hand-built API request.
- **No PDF export for the Working Draft.** Unlike the existing Dispute Report (which renders EN/ZH PDFs), the Working Draft only exists as JSON inside the envelope.
- **English only.** `language` is accepted as an option but only `"en"` has ever been exercised; no Chinese Working Draft has been generated or reviewed.
- **No automatic trigger.** Both Content Analysis and Working Draft are exclusively admin-manually-triggered, matching the existing `generateDisputeReport_` convention — nothing runs on client submission or on a schedule.
- **No automatic legal filing.** Nothing in this system ever submits, emails, or files anything with a court, tribunal, or third party. The Working Draft is explicitly labeled as not-for-filing at the prompt level, and there is no code path that could send it anywhere.

---

## I. Operational Instructions

- **Set or rotate `GEMINI_API_KEY`:** Apps Script editor → Project Settings (gear icon) → Script Properties → add/edit `GEMINI_API_KEY`. Never paste the key into any `.gs` file or commit it to git. An optional `GEMINI_MODEL` Script Property can override the model without a code change.
- **Invoke the backend functions manually:**
  - `generateDisputeAiAnalysis_(reviewId, auth, options)` — `auth = {mode:"admin"}`, `options.dryRun` defaults to `true`.
  - `getDisputeAiAnalysis_(reviewId, auth)` — read-only, returns `{schemaVersion, ruleAnalysis, contentAnalysis}`.
  - `reviewDisputeAiAnalysisDryRun_(reviewId, auth)` — read-only content-quality-review helper; always dry-run, returns the full 5-field `contentAnalysis` plus diagnostics.
  - `generateDisputeWorkingDraft_(reviewId, auth, options)` — same `auth`/`dryRun` convention; throws if no `contentAnalysis` exists yet.
  - All of the above must be run from the Apps Script editor's function dropdown (select the function, click Run) — `clasp run-function` does not work in this project (no standard GCP project is linked to enable the Apps Script Execution API).
- **Safe use of `dryRun`:** always leave it at the default (`true`, or simply omit `options`) to preview what Gemini would produce with zero risk of changing data. Persistence requires the literal `{dryRun:false}` — nothing else (including `{dryRun:true}`, `{}`, or a truthy non-`false` value) will ever write.
- **Verify the envelope after a write:** call `getDisputeAiAnalysis_(reviewId, {mode:"admin"})` and confirm `schemaVersion === 2`, and that `ruleAnalysis`/`contentAnalysis` match what you expect from before the write (for `workingDraft` writes specifically, `contentAnalysis`/`ruleAnalysis` should be byte-for-byte identical to their pre-write values).
- **Admin-only functions:** every function listed above requires `auth.mode === "admin"` or it throws `"Admin access required."` before doing anything else — none of these have a public/no-auth path.

---

## J. Next Recommended Phase

Items 1–3 and 5 below were implemented directly in this same closeout (see §L) rather than deferred — noted as done. Items 4 and 6 remain the boundary for any future phase.

1. ~~Admin UI integration~~ — **done, §L.**
2. ~~Display Content Analysis and Working Draft read-only in the admin review detail view~~ — **done, §L.**
3. ~~Explicit Generate / Regenerate / Save actions~~ — **done, §L.**
4. **A human review gate before any use outside the admin panel** — still the boundary: this content must never reach a client or a court without a professional reviewing it first, matching the existing "AI drafts, professional decides" pattern used everywhere else in this app. The Admin UI enforces "preview before save" but does not (and should not) enforce anything about what a human does with the saved text afterward.
5. ~~Label `factsToAdmit` as "Facts Potentially Admitted / Procedural Facts to Verify" in the UI~~ — **done, §L** — applied directly because of the residual gap noted in §E/§H (the model does not perfectly separate pleading-sourced dates from independently-verified ones).
6. **No automatic filing or sending** — still entirely out of scope. Nothing added in §L sends, emails, or files anything; the only new actions are Generate (preview) and Save (persist to the sheet).

Genuinely still open for a later phase: PDF export for the Working Draft, Chinese-language generation, admin-configurable draft type beyond `response_working_draft`, and the still-unvalidated image-evidence path (§H).

---

## K. Files Changed

Added:
- `apps-script/DisputeAiAnalysis.gs` — Increment A/B: envelope read/migrate/merge, file-reading pipeline, `AiProvider`/`GeminiProvider` seam, `generateDisputeAiAnalysis_`, `getDisputeAiAnalysis_`, `reviewDisputeAiAnalysisDryRun_`, `previewDisputeAiFileBlocks_`.
- `apps-script/DisputeWorkingDraft.gs` — Increment C: `workingDraft` envelope helpers, `validateDisputeWorkingDraft_`, `buildDisputeWorkingDraftPrompt_`, `generateDisputeWorkingDraft_`.
- `docs/AI_DISPUTE_REVIEW_HANDOFF_2026-07-25.md` — this document.

Modified:
- `apps-script/Code.gs` — registered `generateDisputeAiAnalysis` / `getDisputeAiAnalysis` / `generateDisputeWorkingDraft` in the `doPost` dispatcher (admin-gated inside the called function, not at dispatcher level, matching the existing `generateDisputeReport` pattern).
- `apps-script/DisputeReview.gs` — added the resubmission-preservation guard for `AI Analysis JSON` in `submitDisputeReview_`.
- `src/utils/disputeReview.js` — added `generateDisputeAiAnalysis`, `getDisputeAiAnalysis`, `generateDisputeWorkingDraft` client wrappers (same `apiPost`/`getStudioRequestAuth("rental")` convention as every existing dispute-review call in this file).
- `src/pages/admin/DisputeReviews.jsx` — added the "AI Review: Content Analysis & Working Draft" panel (§L). No other part of the page was redesigned.

**`src/pages/StrategyAssessment.jsx` was intentionally excluded** from this and the preceding commit. It contains a separate, pre-existing, unrelated change (Property Strategy Assessment's refresh/session-recovery behavior) that predates this phase of work and has deliberately been kept isolated at the user's explicit instruction — it remains uncommitted in the working tree.

---

## L. Admin UI Integration (this closeout)

A new section, **"AI Review: Content Analysis & Working Draft,"** was added to the existing Dispute Review admin detail view (`src/pages/admin/DisputeReviews.jsx`), positioned after the existing rule-based AI Preliminary Review report and before the Supreme-Court-only Form 2 Working Draft tool. No other part of the page was redesigned; no new CSS classes were added — the panel reuses the page's existing `dispute-admin-heading` / `dispute-admin-subheading` / `dispute-admin-long` / `dispute-admin-actions` / `strategy-help` / `notice notice--warm strategy-inline-notice` classes.

**Content Analysis subsection:**
- Status line: `Not generated` / `Preview available (not saved)` / `Saved`, plus schema version and (when a generation happened this browser session) the model name and generation timestamp.
- **Generate / Regenerate Content Analysis** button — always calls with `dryRun:true` (preview only, never writes).
- **Save** button — calls with `dryRun:false` (real write). This always issues a *fresh* Gemini call rather than persisting the exact previously-previewed text verbatim — the backend has no server-side mechanism to "hold" a dry-run result, and none was added (per "do not redesign the backend"). In practice, given the same real inputs and the same strict `responseSchema`, the saved result is very close in substance to what was previewed, but not guaranteed to be byte-identical.
- Displays all 5 fields (Case Materials Summary, Missing Evidence, Timeline, Key Issues, Preliminary Assessment) plus an unreadable-files notice when applicable.

**Working Draft subsection:**
- Same status/Generate/Regenerate/Save pattern. The Generate/Regenerate button is disabled until a Content Analysis exists (saved or previewed this session) — mirrors the backend's own hard requirement.
- Displays all 12 fields, with **`factsToAdmit` deliberately labeled "Facts Potentially Admitted / Procedural Facts to Verify"** rather than "Facts Admitted" — a direct mitigation for the residual prompt gap noted in §E/§H, so the UI itself carries the caveat rather than relying on the prompt alone.
- The `disclaimer` field is rendered in a warning-styled notice box, not as plain text.

**What was intentionally left out of this pass** (per explicit scope): no PDF export, no bilingual (Chinese) generation, no automatic/scheduled generation, and no "send," "file," or "submit" action of any kind — Save only ever writes to the existing `AI Analysis JSON` envelope, nothing else.

**One new backend wiring line** was required to make "Generate Working Draft" callable from the browser at all: `generateDisputeWorkingDraft` was not previously registered in the `doPost` dispatcher (Increment C was deliberately built admin-editor-only). Registering it (`apps-script/Code.gs`) is wiring an existing, already-tested function into the existing dispatcher pattern — it does not change `generateDisputeWorkingDraft_`'s behavior, schema, prompt, or persistence logic in any way.

**Verification performed:** `npm run build` and `npm run lint` both pass with zero new issues (lint stays at the pre-existing 62-problem baseline). Live click-through against real data was not possible in this session — the admin section is gated by an access code the developer did not have and did not attempt to obtain or bypass. Verification is therefore: a clean build, a clean lint pass, and careful manual review of the component against the exact same state-management and `apiPost` conventions already proven working elsewhere in this same file (the Form 2 Working Draft flow, the Professional Review save flow).
