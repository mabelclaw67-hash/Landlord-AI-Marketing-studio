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
