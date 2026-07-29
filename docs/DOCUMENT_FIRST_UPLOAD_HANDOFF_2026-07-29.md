# Document-First Upload UX — Handoff

**Date:** 2026-07-29
**Scope:** Reworked document upload as the primary, persistent, first-screen experience in both public intake wizards — AI Dispute Review and Property Strategy Assessment.
**Status:** Frontend complete on both pages, build/lint clean, browser-verified. The Property Strategy backend gap noted in §E below has since been root-caused and closed out in production — see §H for the full closeout record. Property Strategy Assessment uploads now work end-to-end in production.

---

## A. Why

Usability testing on AI Dispute Review kept surfacing the same complaint: testers could not find document upload, even after an earlier pass had relocated the upload UI within the wizard. Root cause was structural, not visual — upload lived behind 7 unrelated question screens, was rebuilt from scratch every time the user navigated away and back (losing the Turnstile token in the process), and blocked file selection until a document category was chosen first.

This was reworked for AI Dispute Review first (see prior session), then the same validated pattern was ported to Property Strategy Assessment, which had the identical structural problem (upload lived inside the final "Review & Submit" step, gated on `isLastStep`).

## B. What changed, in one sentence per page

- **`src/pages/DisputeReview.jsx`** — merged the old "Contact" + "Dispute Type" steps into one first screen, moved the whole upload UI into a persistent `DisputeDocumentsPanel` rendered outside the step switch, reserved the review ID on mount instead of at step 8, dropped the pre-upload category gate, added drag-and-drop, and added a live "commonly needed documents" checklist reusing the existing `analyseDispute()` engine.
- **`src/pages/StrategyAssessment.jsx`** — same pattern, smaller diff: no step merge was needed (contact info was already step 0), moved the upload UI (previously inside the final "Review & Submit" step) into a persistent `PropertyDocumentsPanel`, reserved the assessment ID on mount instead of at `isLastStep`, dropped the pre-upload category gate, added drag-and-drop. No missing-document checklist was added here — there's no existing "expected documents per type" engine for property assessments (unlike Dispute Review's `expectedDocumentsFor()`), and inventing one wasn't in scope.

## C. Shared architecture (reused, not duplicated)

- **`CollapsibleCard`** (`src/components/CollapsibleCard.jsx`, pre-existing, already used across the Supreme Court/Petition workspace components) is now the collapse/expand shell for both document panels — `DisputeDocumentsPanel` was refactored to use it too, instead of its own one-off toggle button, so both workflows share the exact same collapsible interaction rather than two look-alike implementations.
- **`DisputeDocumentsPanel.jsx`** and **`PropertyDocumentsPanel.jsx`** are separate components (not one generic shared component) because the two domains have genuinely different upload metadata — Dispute Review tracks category/date/sender/description plus a missing-document checklist; Property Strategy tracks only category/room-area with no checklist. Forcing both into one parameterized component would have added more conditional branching than it saved. What IS shared is the interaction pattern (persistent panel, dropzone, category-optional upload, `CollapsibleCard` shell), which is the part that actually mattered for the UX complaint.
- **The "reserve an ID on mount, not at some later step" pattern** is now identical in both pages: an unconditional `useEffect(() => { requestUploadSession(); }, [])` replaces the old step-gated effect. Retry and "Start Over" call the same `requestUploadSession()` function directly rather than resetting a ref and waiting for the effect to re-fire.
- **The pre-upload "choose a category first" gate was removed on both pages.** This was a frontend-only restriction — both backends (`uploadDisputeFile_` in `apps-script/DisputeReview.gs`, `uploadPropertyStrategyFile_` in `apps-script/PropertyStrategyFiles.gs`) already default an omitted category to `"Other"`. Dispute Review additionally pre-fills a category guess from the filename (`guessDocumentCategory()` in `src/utils/disputeReview.js`); Property Strategy does not attempt this (its categories are things like "Floor Plan" / "Owner Instructions" that aren't reliably filename-guessable, so it was left as a plain optional field rather than inventing an unreliable heuristic).

## D. Property Strategy Assessment also had unrelated in-flight work

Before this session touched `StrategyAssessment.jsx`, there was already an uncommitted change in the working tree adding "resume upload after page refresh" support (`readStoredAssessmentId`/`saveStoredAssessmentId`/`clearStoredAssessmentId`, a `getPropertyStrategyFiles()` restore effect, `restoringFiles`/`restoreNotice` state). That work was **preserved, not discarded** — the restore-on-refresh effect is unchanged; only the separate "reserve a new ID" effect was moved from `isLastStep`-gated to mount-gated, and `startOver`/retry were updated to call the reservation function directly instead of toggling a ref.

## E. Known pre-existing gap (not introduced or fixed by this change)

In local dev (`VITE_STUDIO_EXEC_URL` pointed at the real deployed Apps Script Web App), `startPropertyStrategyAssessment` reliably fails (`uploadAvailable` flips to false, panel shows "unavailable / retry"), while the equivalent `startDisputeReview` call reliably succeeds. Both call the identical `apiPost()` transport with the same `EXEC_URL`, so this is not an env/config issue on the frontend. `apps-script/PropertyStrategyFiles.gs` and its `Code.gs` router wiring for `startPropertyStrategyAssessment` / `uploadPropertyStrategyFile` / `deletePropertyStrategyFile` / `getPropertyStrategyFiles` are already committed to `main`, but Apps Script deployments are a separate manual step from `git commit` in this project (per the existing Dispute Review handoff docs) — the most likely explanation is that this particular action set hasn't been pushed to the live Web App deployment yet.

**This was verified, not guessed:** a temporary one-line stub was added to `startPropertyStrategyAssessment()` to bypass the network call, which confirmed the entire frontend rework (panel renders first, stays visible and expanded across steps, category/room-area fields work, file list area works) is correct end-to-end — the stub was reverted immediately after (`git diff` on `src/utils/strategyAssessment.js` is empty).

> **Correction (2026-07-29, later same day):** the "not yet deployed" theory above was the working hypothesis at the time this section was written, but it was **wrong** — see §H. The actual deployed source was byte-identical to the repo already. The real cause was a missing one-time Drive folder initialization, not a missing deployment. Left here for an honest record of the investigation; do not act on the "redeploy via clasp push" instruction below §H's fix is what actually closed this out.

## F. Files changed

- `src/pages/DisputeReview.jsx`, `src/pages/StrategyAssessment.jsx` — wizard reorder, mount-time ID reservation, drag-and-drop handlers, category-gate removal, panel wiring.
- `src/components/DisputeDocumentsPanel.jsx` (refactored to use `CollapsibleCard`), `src/components/PropertyDocumentsPanel.jsx` (new).
- `src/utils/disputeReview.js` — added `guessDocumentCategory()`.
- `src/styles/global.css` — `.dispute-documents-panel`, `.dispute-dropzone*`, `.dispute-documents-panel__checklist*` (shared by both panels; the old custom toggle-button CSS was removed after switching to `CollapsibleCard`).

## G. Verification performed

- `npm run build` and `npx eslint` clean on every changed file (remaining lint errors elsewhere in the repo are pre-existing and untouched by this work).
- Browser-verified both wizards end-to-end: panel visible and expanded on screen 1, stays mounted (not remounted) and collapsible across every subsequent step, missing-document checklist reacts live to dispute type on Dispute Review, bilingual state (including current step, uploaded files, and form values) survives an EN/中文 language switch, final review/submit screen still renders correctly.
- Did not exercise a real file upload or final submission against the live backend in either wizard, to avoid writing test data into the production Google Drive/Sheets the dev environment is connected to.

---

## H. Production backend closeout (2026-07-29, later same day)

### Root cause

Not a deployment gap. `clasp pull --versionNumber 102` (the version the production deployment ID was pinned to at the time) was diffed against `apps-script/Code.gs` and `apps-script/PropertyStrategyFiles.gs` in the repo — **byte-identical, zero diff.** `startPropertyStrategyAssessment` was already correctly deployed and routed.

The actual cause, found by reading `PropertyStrategyFiles.gs`: `startPropertyStrategyAssessment_` → `getPropertyStrategyAssessmentFolder_` → `getPropertyStrategyFilesFolder_`, which throws `'"Property Strategy Files" Drive folder does not exist yet. Run setupPropertyStrategyFileStorage() once from the Apps Script editor.'` when that folder hasn't been created. `setupPropertyStrategyFileStorage()` is a one-time, idempotent initializer that creates this folder (and only this folder — it never creates or modifies the hand-authored `Assessment_Files`/`Strategy_Assessments` sheets) — by design it was **never wired to any action**, meant to be run manually once. It had never been run in production. `startDisputeReview` has no equivalent one-time dependency, which is why it worked while `startPropertyStrategyAssessment` didn't — both call identical `apiPost()` transport against the identical `EXEC_URL`, ruling out any frontend/env explanation.

### Apps Script version / deployment ID

- Script ID: `1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp` (unchanged)
- Production deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0` (unchanged — confirmed via `clasp deployments` before and after; exec URL never changes)
- Version before this fix: **102** ("Protect public uploads with Turnstile bridge")
- Version after this fix: **103** ("Wire setupPropertyStrategyFileStorage as an admin action (one-time Drive folder init)")
- Confirmed via `clasp deployments`: `AKfycbw01LTH..._pyJj...@103 - Wire setupPropertyStrategyFileStorage as an admin action (one-time Drive folder init)`

### What was actually changed

One line added to `apps-script/Code.gs`'s `doPost` dispatcher, immediately after the existing `verifyPropertyStrategyFileStorage` admin action (same file, same pattern, same `assertAdmin_(auth)` gate):

```js
if (action === "setupPropertyStrategyFileStorage") { assertAdmin_(auth); return ok(setupPropertyStrategyFileStorage()); }
```

No other repo file changed. No refactor. `HEAD` was diffed against v102 before pushing and confirmed identical except this one line, so nothing else got swept into version 103.

This one-line addition is a **permanent** admin action (chosen over adding-then-removing a temporary one) — it mirrors the existing `verifyPropertyStrategyFileStorage` action already in the same dispatcher, it's idempotent and safe to call again, and it gives future sessions a way to re-run this initializer through the API instead of requiring manual Apps Script editor access again.

### Deployment sequence used (from `docs/AI_DEVELOPMENT_RUNBOOK.md`)

1. Clean staging dir pointed at the production `scriptId`, `clasp pull --versionNumber 102` into a separate dir for the diff, `clasp pull` (HEAD) into the working staging dir — confirmed HEAD == v102 except for the one intentional line added afterward.
2. `clasp push --force`, `clasp version "..."` → created version 103.
3. `clasp deploy --deploymentId AKfycbw01LTH... --versionNumber 103 --description "..."` → same deployment ID now serves 103.
4. Confirmed via `clasp deployments` and a GET `?action=ping` (200, `{"status":"connected"}`).

### Running the one-time initializer

Called once via an authenticated Node `fetch()` POST (not curl, per the runbook) with `{action: "setupPropertyStrategyFileStorage", adminAccessCode: "<provided by user, never written to any file>"}`. Response:

```json
{
  "folderId": "1IKvZZCerc87w_2nTiGWZcu9WJ61MfRRR",
  "folderName": "Property Strategy Files",
  "folderCreated": true,
  "sheetName": "Assessment_Files",
  "sheetCreated": false,
  "missingRequiredColumns": [],
  "strategyAssessmentsUnchanged": true
}
```

`folderCreated: true` confirms the folder genuinely did not exist before this call. `strategyAssessmentsUnchanged: true` confirms the unrelated `Strategy_Assessments` sheet was never touched. The temporary script holding the admin code was deleted immediately after this one call; the code itself was never written to any repo file, commit, or persisted doc.

### End-to-end production verification

Run directly against `https://www.vanislandproperty.ca/landlord-ai/strategy-assessment` (the live production site — the frontend document-first rework has not been pushed to `main` yet, so this exercised the current live wizard's existing upload step, which calls the identical backend actions):

1. Filled the wizard through to the final step with clearly-marked throwaway data (`TEST DELETE ME` / `test-delete-me@example.com` / `123 Test St (DELETE ME)`).
2. Reservation succeeded — the upload UI unblocked from "preparing your upload folder..." to the actual dropzone/category form (previously stuck here).
3. Uploaded a harmless 1×1 PNG (`PRODUCTION_TEST_DELETE_ME.png`) — confirmed via network inspection: `POST .../.netlify/functions/public-upload → 200`, i.e. the real Turnstile bridge path succeeded end-to-end (Turnstile solve → Netlify function → Apps Script bridge token → Drive write → Sheet row).
4. The file appeared in the frontend's "已上传的文件" list immediately (two entries, both from this same test — the file-input injection technique used to drive the upload since a real OS file picker wasn't drivable in this session apparently dispatched twice).
5. Deleted both via the UI's own delete button — confirmed via network inspection: two `deletePropertyStrategyFile` POSTs to the Apps Script exec URL, both 200. Frontend confirmed "已上传的文件 (0)" afterward.
6. Confirmed AI Dispute Review still loads and reserves successfully on production (2× 200 against the same exec URL) — the shared dispatcher and unrelated actions are unaffected, as expected from a single new dispatcher line that doesn't touch any existing branch.

**Residual artifact:** `startPropertyStrategyAssessment_` also reserves an empty, assessment-ID-named Drive subfolder under "Property Strategy Files" as a side effect of the reservation call itself (identical to how `startDisputeReview` has always behaved for any abandoned/incomplete intake) — this is expected architecture behavior, not test data left behind by this verification, and was not separately hunted down and deleted.

### Rollback

If version 103 needs to be rolled back: redeploy version 102 to the same deployment ID —

```bash
clasp deploy --deploymentId AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0 \
  --versionNumber 102 --description "Rollback: revert setupPropertyStrategyFileStorage admin action"
```

This only removes the one dispatcher line — it does **not** undo the "Property Strategy Files" Drive folder creation (folder creation is not reversible via redeploy, and there is no reason to reverse it; the folder is exactly what the feature needs to exist).

### Git

- `apps-script/Code.gs` — one line added, committed to `main` (see commit below). Not yet pushed to `origin` — pushing was out of scope for this backend-only closeout and wasn't requested; flag if a push is wanted.
- No frontend files changed in this closeout (per scope: "do not modify the document-first UX again") — build/lint were not re-run, per the instruction to only do so if frontend code changes.

---

## I. Customer report-delivery closeout (2026-07-29, third session)

### Root cause

The anonymous production UAT in §H's follow-up work found the customer-facing half of Strategy Assessment was incomplete even though the backend was healthy:

- `savePropertyStrategyAssessment_` (`apps-script/Code.gs:1041`) already generated real PDFs via `savePropertyStrategyReportForRow_`/`createPropertyStrategyPdf_` and wrote `Report ZH URL`/`Report EN URL` into `Strategy_Assessments` — but `StrategyAssessment.jsx`'s `handleSubmit` discarded `result.reportUrl`/`result.reportUrls` entirely.
- The "Print / Save PDF" button called `openStrategyAssessmentPdf(..., autoPrint=true)`, which opens a new window and immediately calls `window.print()` — a native, modal browser dialog, not a file download. Live testing confirmed this: the button hung the browser-automation session for 45+ seconds.
- `/strategy-assessment/report/:assessmentId` only ever read from `sessionStorage` (`readStrategyReportSession`) — confirmed live: a fresh tab visiting the exact correct URL for a real assessment ID returned "no report found on this device."
- No confirmation email existed anywhere in the submit path.

### Files changed

- `apps-script/Code.gs` — added `propertyStrategyTokenSecret_()`/`propertyStrategyAccessToken_()` (mirrors `disputeAccessToken_`), `downloadPropertyStrategyReportPdf_()` (mirrors `downloadDisputeReportPdf_`), `recoverPropertyStrategyReport_()` (built from the existing `getPropertyStrategyReport_`/`findPropertyStrategyAssessmentRow_` internals, minus the admin gate, plus an email check), `buildPropertyStrategyReportEmailBody_()`, one added field (`downloadToken`) and one email-send call in `savePropertyStrategyAssessment_`, and two new dispatcher/`noAuthActions` entries.
- `src/utils/strategyAssessment.js` — `downloadPropertyStrategyReportPdf()` (mirrors `downloadDisputeReportPdf` in `disputeReview.js` verbatim), `recoverPropertyStrategyReport()`, and `origin: window.location.origin` added to the existing `submitStrategyAssessment` payload so the confirmation email can build a working link.
- `src/pages/StrategyAssessment.jsx` — `handleSubmit` now captures `downloadToken`; new `recoveryAssessmentId`/`recoveryEmail`/`recovering`/`recoveryError`/`recovered` state and a `handleRecover()` handler; a `?recover=` query param pre-fills the Assessment ID; a new `<CollapsibleCard>` recovery form (reusing the existing component) sits right after the hero, before the wizard; a new `recovered` early-return render branch reuses `StrategyReportResult` as-is; `StrategyReportResult` now takes a `downloadToken` prop and its two `openStrategyAssessmentPdf(...)` buttons were replaced with "Download English PDF"/"Download Chinese PDF" buttons with proper loading/error state. The pre-submission preview's own PDF button (no `assessmentId`/token exists yet at that point) was left untouched. Dispute Review was not touched.

### Recovery security model

- **Download** (`downloadPropertyStrategyReportPdf_`): gated on a token = `SHA-256(assessmentId + "|" + secret)`, secret stored only in Apps Script Script Properties (`PROPERTY_STRATEGY_REPORT_TOKEN_SECRET`), admin bypass via `auth.mode === "admin"`. Never exposes the raw Drive URL — only base64 PDF bytes streamed through this endpoint, same posture as Dispute Review's proven pattern.
- **Recovery** (`recoverPropertyStrategyReport_`): requires Assessment ID **and** the email address stored on that row; a mismatch on either (including "row doesn't exist") returns the identical generic message, so a guess can't be used to enumerate valid IDs. On success it returns report content and a fresh download token — never the raw Drive URL. No new auth system: this is a plain stored-value comparison against data already collected at submission time, and the download gate reuses the same token construction already proven for Dispute Review.
- **Email**: best-effort only, via the existing `sendApplicantWorkflowEmail_`/`sendCompanyEmail_` (verified-alias sender). A send failure is logged and returned as `emailWarning` but never blocks the save and never surfaces to the customer. No attachments, no PDF content, no source documents in the email body — just the Assessment ID and a link to the recovery form.

### Apps Script versions

- Before this work: **104** was not yet deployed; production was at **103** (from §H).
- **104** — "Add report download token, PDF streaming, and email+ID recovery for Property Strategy Assessment" — the real, permanent change.
- **105** — TEMPORARY: added a one-off `cleanupTestPropertyStrategyAssessment_` admin action to remove UAT test records. Never committed to git — built and pushed directly from an isolated `/private/tmp` clasp staging copy, diffed against the committed repo state both before adding it and after removing it.
- **106** — reverted 105's addition; diffed byte-identical to the committed `apps-script/Code.gs` (same as 104's content). **This is the current production state.**
- Deployment ID unchanged throughout: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`.
- **Rollback**: redeploy version **103** to this same deployment ID to remove all of this closeout's backend changes (`clasp deploy --deploymentId AKfycbw01LTH... --versionNumber 103 --description "Rollback"`).

### Netlify (frontend) deployment

- Committed as `70dd2f9` ("Give Property Strategy Assessment customers a real report download and recovery path"), pushed to `origin/main` with the user's explicit confirmation.
- Netlify deploy `6a6a825d70efea0007a3d139` — `state: ready`, `commit_ref: 70dd2f9b8fb7ea3273dd670ba253109ea37b3768` (matches the push), live at `https://www.vanislandproperty.ca`.
- **Rollback**: revert commit `70dd2f9` on `main` and push — Netlify auto-deploys the revert.

### Production verification (live, anonymous, no admin)

Full 8-step check from the user's checklist, run against `https://www.vanislandproperty.ca/landlord-ai/strategy-assessment` with a new, clearly-marked throwaway submission (`E2E CLEANUP TEST` / `e2e-cleanup-test@example.com` / `789 E2E Test Blvd (DELETE ME)`):

1. Submitted → Assessment ID `PSA-20260729-154555` assigned.
2. Report displayed immediately on the same screen (no separate load/fetch needed).
3. Clicked "下载英文 PDF" (Download English PDF): the actual backend call succeeded (confirmed via network inspection — the `script.googleusercontent.com` redirect responses that Apps Script POSTs resolve through both returned `200`), and no `downloadError` notice appeared. **Caveat, stated plainly:** I could not independently confirm the file landed in `~/Downloads` in this automated browser session (no error either) — Chrome's file-save step for a programmatically-clicked download can behave differently under CDP-driven automation than a genuine mouse click; this is a test-harness limitation, not a code-path I could fully observe, and is the same caveat the 2026-07-28 Turnstile handoff already noted for file *uploads* in this environment.
4. Closed the tab (full navigation away, which also discards all in-memory/session state — equivalent to a real tab close for this purpose).
5. Opened a fresh anonymous load of the same URL.
6. Used the recovery form with the correct Assessment ID + `e2e-cleanup-test@example.com` → the full report reappeared via the `recovered` render branch, including working Download PDF buttons.
7. Retried recovery with the same Assessment ID + `wrong-email@example.com` → rejected with "We could not find a report matching that Assessment ID and email." (the one generic message, confirming no enumeration signal).
8. Deleted all test data (see below).

Also confirmed: AI Dispute Review still loads and reserves successfully on production (unaffected — no dispute code path was touched, and the frontend document-first rework from §A-G is now also live for the first time, since this session's `git push` was the first push since that work was completed).

### Test-data cleanup

- **`PSA-20260729-154555`** (created during this verification): deleted via the temporary v105 cleanup action — row removed from `Strategy_Assessments`, both generated PDF files (`1J8osFTjN9GhlxGhIaRPB5pYsn4LVdcsG`, `1-UyzI7aMYP9B-2JI_wfb08YwXlZVEoak`) trashed in Drive. Confirmed via the action's own response (`rowDeleted: true`).
- **`PSA-20260729-151853`** (from the prior session's customer-journey UAT): queried directly against production (`getPropertyStrategyReports_` admin listing) — **this ID does not exist in `Strategy_Assessments`**. The sheet currently contains exactly one row, an unrelated pre-existing record ("Production Verification", 2026-07-10, `production-test@vanislandproperty.ca`) that predates this work and was not touched. Whatever that prior test displayed on-screen as a success state, it was not actually persisted as a sheet row (or was already gone before this session) — there was nothing to delete for it. Not touching the one unrelated legitimate-looking record was a deliberate choice, not an oversight.
- The temporary cleanup action itself (v105) was fully reverted (v106) immediately after use, confirmed byte-identical to the committed repo file. The admin access code was used only for these two POST calls and the two calls made during this closeout; it was never written to any file, commit, or persisted doc.

### Git

- Code: `70dd2f9` — "Give Property Strategy Assessment customers a real report download and recovery path" (`apps-script/Code.gs`, `src/pages/StrategyAssessment.jsx`, `src/utils/strategyAssessment.js`). Pushed to `origin/main`.
- Docs: this update, plus `docs/AI_DEVELOPMENT_RUNBOOK.md`'s production version bump — committed separately (see repo history for the exact SHA following this one).
