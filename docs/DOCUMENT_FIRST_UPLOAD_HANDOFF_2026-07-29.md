# Document-First Upload UX — Handoff

**Date:** 2026-07-29
**Scope:** Reworked document upload as the primary, persistent, first-screen experience in both public intake wizards — AI Dispute Review and Property Strategy Assessment.
**Status:** Frontend complete on both pages, build/lint clean, browser-verified. One pre-existing backend gap found on the Property Strategy side (see §E) — not caused by this change, not fixed by this change, needs separate attention before this page's upload can work end-to-end.

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

**This was verified, not guessed:** a temporary one-line stub was added to `startPropertyStrategyAssessment()` to bypass the network call, which confirmed the entire frontend rework (panel renders first, stays visible and expanded across steps, category/room-area fields work, file list area works) is correct end-to-end — the stub was reverted immediately after (`git diff` on `src/utils/strategyAssessment.js` is empty). **Before relying on Property Strategy Assessment uploads in this environment, confirm the Apps Script deployment includes `PropertyStrategyFiles.gs`'s actions** (redeploy via `clasp push` + new Web App version if not).

## F. Files changed

- `src/pages/DisputeReview.jsx`, `src/pages/StrategyAssessment.jsx` — wizard reorder, mount-time ID reservation, drag-and-drop handlers, category-gate removal, panel wiring.
- `src/components/DisputeDocumentsPanel.jsx` (refactored to use `CollapsibleCard`), `src/components/PropertyDocumentsPanel.jsx` (new).
- `src/utils/disputeReview.js` — added `guessDocumentCategory()`.
- `src/styles/global.css` — `.dispute-documents-panel`, `.dispute-dropzone*`, `.dispute-documents-panel__checklist*` (shared by both panels; the old custom toggle-button CSS was removed after switching to `CollapsibleCard`).

## G. Verification performed

- `npm run build` and `npx eslint` clean on every changed file (remaining lint errors elsewhere in the repo are pre-existing and untouched by this work).
- Browser-verified both wizards end-to-end: panel visible and expanded on screen 1, stays mounted (not remounted) and collapsible across every subsequent step, missing-document checklist reacts live to dispute type on Dispute Review, bilingual state (including current step, uploaded files, and form values) survives an EN/中文 language switch, final review/submit screen still renders correctly.
- Did not exercise a real file upload or final submission against the live backend in either wizard, to avoid writing test data into the production Google Drive/Sheets the dev environment is connected to.
