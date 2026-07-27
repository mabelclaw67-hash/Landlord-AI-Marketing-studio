# AI Dispute Review — Supreme Court Extension Technical Record

**Version:** 1.2
**Record date:** 2026-07-26 (§11 addendum; original record below is unchanged, dated 2026-07-22)
**Status:** **BC Supreme Court Civil Claim Defendant Workflow v1.0 — Feature Complete.** All 11 workflow stages implemented (§11). Apps Script deployment `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0` is at version `@98` (existing deployment ID reused, exec URL unchanged throughout every phase in §11).
**Repository:** `mabelclaw67-hash/Landlord-AI-Marketing-Studio`, branch `main`
**Baseline Git commit (before this work):** `18eb8f8` → **Final commit (original V1.1 scope):** `074e284` → **Final commit (v1.0 Case Navigator, §11):** see §11.9
**Implementer:** Claude Code, this session (original) and subsequent sessions (§11)

This is a continuation of `AI Dispute Review - Technical Development Record V1.0.md`. It records the Supreme Court Litigation extension implemented against the spec in `docs/AI_Dispute_Review_Supreme_Court_Extension_Claude_Code_Spec.md`.

## 1. Completion status

| Item | Status |
|---|---|
| Frontend + backend code | **Complete** |
| Local build / lint | **Passed** (`npm run build`, `npx eslint`) |
| Analysis-logic scratch tests (5 scenarios A–E) | **Passed** |
| Live browser verification of the public intake wizard | **Passed** — real production submission |
| Live spreadsheet row verification | **Passed** — read back directly from the sheet |
| Admin workspace verification (Form 2 gate/draft, filters) | **Not yet done** — needs the admin access code, which this session does not read or enter (see §6) |
| Apps Script deployment | **Done** — pushed and redeployed to the existing production deployment ID, version `@90` |
| Frontend deployment (Netlify) | **Done** — commit `074e284` pushed to `main`, Netlify auto-deploy `ready`, confirmed live at vanislandproperty.ca |
| Spreadsheet reference updates (`Dropdown_Options`, `Form_Fields`) | **Not applied** — prepared as a reviewable list per your choice, for you to paste in |
| RTB/CRT/Strata/Small Claims regression | Not re-submitted end-to-end, but the redeployed backend responds correctly post-deploy (ping health check) and no existing action handler was modified — see §7 reasoning |

Do not treat this as fully complete: the admin-side Form 2 workflow (filters, eligibility gate, PDF generation/download) has not been click-verified, since it requires your admin access code.

## 2. Baseline and final state

- Git: baseline `18eb8f8` on `main` → final commit `074e284`, pushed to `origin/main`.
- Apps Script project: "Landlord AI Studio API" (script ID `1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp`), identity confirmed by cloning it and diffing `Code.js`/`DisputeReview.js` byte-for-byte against `git show 18eb8f8:apps-script/Code.gs`/`DisputeReview.gs` before pushing anything. Deployment ID `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0` confirmed (by substring match, without printing the secret) to be the exact deployment `VITE_STUDIO_EXEC_URL` points to. Was at version `@89`; pushed and redeployed to the same deployment ID at version `@90`. Post-deploy health check (`action=ping`) returned `{"data":{"status":"connected"}}`.
- Netlify: production site `https://www.vanislandproperty.ca` (Project Id `678aa8d4-81e4-4c19-b4a1-2021c9063e27`). Push to `main` triggered an automatic production deploy (build `6a614a7eab0d9900083c9c2d`, deploy `6a614a7eab0d9900083c9c2f`), confirmed `state: ready`, `secret_scan_result` clean, and confirmed live by loading the production intake wizard and reading the Dispute Type / Client Role / Tribunal dropdowns directly from the deployed page.
- Spreadsheet: `1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90`, 57-column `Dispute_Reviews` header **unchanged** (verified by reading the live sheet before and after the test submission).

## 3. Files changed and why

- **`src/utils/disputeReview.js`** (+422/-a few lines) — the whole extension's logic:
  - New enum values: `DISPUTE_TYPES`, `TRIBUNALS`, `CLIENT_ROLES`, `DOCUMENT_CATEGORIES`, `NEXT_STEPS`, plus `OPTION_LABELS_ZH` entries for all of them.
  - New Supreme-Court-only option arrays (`SC_PROCEEDING_TYPES`, `SC_PLEADING_TYPES`, `SC_SERVICE_LOCATIONS`, `SC_SERVICE_METHODS`, `SC_MATERIALS_STATUS`, `SC_LAWYER_STATUS`, `SC_HOLD_STATUS`, `SC_INSURER_STATUS`, `SC_EXPERT_TYPES`).
  - `getDisputeFollowUpQuestions`: new Supreme Court branch, 23 fields across 4 groups (Proceeding & Registry / Service & Deadlines / Parties & Representation / Risk & Evidence). Two spec fields (`sc_client_role`, `sc_service_date`) were deliberately **not** added — they reuse the existing generic `Client Role` and `Service Date` fields already asked once earlier in the intake, to avoid asking the same question twice.
  - `formatDisputeFollowUpAnswers`: extended to render Multi Select (`sc_expert_evidence`) answers correctly.
  - `analyseDispute`: new Supreme Court block computing all 8 flags from spec §5.2 (`COURT_RESPONSE_DEADLINE_PASSED/URGENT`, `COURT_SERVICE_PROOF_MISSING`, `INJUNCTION_MATERIALS_INCOMPLETE`, `MULTI_DEFENDANT_CONFLICT_REVIEW`, `EXPERT_EVIDENCE_MISSING`, `LITIGATION_HOLD_REQUIRED`, `INSURER_NOT_NOTIFIED`), feeding the existing `deadlineRisks`/`procedureRisks`/`flags` arrays — no new top-level analysis shape.
  - `expectedDocumentsFor`, `buildLegalIssuesToVerify`: new Supreme Court branches.
  - `buildDisputeReport`: title becomes "Preliminary Litigation Assessment Report" / "初步诉讼评估报告" for this dispute type; same 15 sections otherwise.
  - New exports: `assessFormTwoEligibility` (the Form 2 gate from spec §11) and `buildFormTwoWorkingDraft` (the paragraph-by-paragraph scaffolding builder), plus `generateFormTwoDraftPdf` (client action calling the new backend endpoint).
  - **Correctness fix required for this feature to work at all in Admin:** `recordToForm` never restored `followUpAnswers` from the stored record (only a human-readable text summary was persisted, per the existing `Follow-up Answers` column). This meant Admin's "Generate / Update Reports" button silently dropped every dispute-type-specific flag on every dispute type, not just this one, because it recomputes the report from `recordToForm(record)`. Fixed via `encodeFollowUpAnswers`/`splitFollowUpAnswersStored`: the same column now also carries a hidden JSON tail after a `[FOLLOWUP_JSON]` marker, parsed back by `recordToForm`. Old rows without the marker behave exactly as before (empty answers, no regression). **Verified live** — see §7.
- **`src/pages/DisputeReview.jsx`** (+105/-22) — new dispute type flows automatically through the existing `DISPUTE_TYPES`-driven select; the step-6 follow-up renderer now shows a sub-heading per `item.group` (only visible when a dispute type has more than one group, so RTB/CRT/Strata/Small Claims are unaffected); added Multi Select checkbox rendering (`toggleFollowUpMulti`); upload-step help text mentions the new Supreme Court document categories. No new step, no step-index changes.
- **`src/pages/admin/DisputeReviews.jsx`** (+204/-10) — 7 quick-filter chips (Supreme Court / urgent deadline / injunction / multiple defendants / insurer not notified / expert evidence missing / Form 2 likely eligible); a "Form 2 Working Draft" panel (visible only for Supreme Court Litigation reviews) showing the live `assessFormTwoEligibility` result and, once eligible, a paragraph-row builder (allegation + Admitted/Denied/Outside Knowledge) plus legal-basis/relief-sought fields and a Generate button; fixed the "Follow-up Answers" display to strip the hidden JSON tail via `splitFollowUpAnswersStored`.
- **`apps-script/DisputeReview.gs`** (+58) — one new function, `generateFormTwoDraft_`, admin-gated, reusing the same Google-Docs-template → PDF export approach as the existing report generator, returning PDF bytes directly (nothing written back to the sheet). `DISPUTE_REVIEW_REQUIRED_COLUMNS`/`DISPUTE_FILE_REQUIRED_COLUMNS` are unchanged.
- **`apps-script/Code.gs`** (+1) — one new dispatch line for `generateFormTwoDraft`.
- **`src/styles/global.css`** (+29) — small additions for the multichoice checkbox layout and the new admin sub-heading/filter-chip/Form-2-row styles; reused existing `.strategy-follow-up__group` / `.strategy-check` classes rather than inventing a parallel system.
- **`docs/AI Dispute Review - Supreme Court Spreadsheet Additions.md`** (new) — the reviewable `Dropdown_Options`/`Form_Fields`/`Development_Notes` addition list, per your choice to apply it yourself.

## 4. Spreadsheet changes

**None applied by this session.** No header, no row, no existing value in `Dispute_Reviews`, `Dispute_Files`, `Form_Fields`, `Dropdown_Options`, `Report_Sections`, or `Development_Notes` was touched. The reviewable additions list is in `docs/AI Dispute Review - Supreme Court Spreadsheet Additions.md`, confirmed to be documentation-parity only (the app does not read these two sheets at runtime).

## 5. Safety controls carried through

- No new `Dispute_Reviews` columns (all Supreme Court fields ride in the existing `Follow-up Answers` column).
- No provisioning/schema-mutation function added; `verifyDisputeSchema()` and its required-column lists are untouched.
- Form 2 Working Draft: admin-only, generate-on-demand, never persisted, always stamped `WORKING DRAFT — NOT FOR FILING`, every paragraph position is a deliberate admin choice (no auto-admission), unresolved paragraphs are explicitly listed.
- No fabricated deadlines, win probabilities, or merits conclusions — the insufficiency gate and "verify current rules" language are reused unchanged.
- Existing RTB/CRT/Strata/Small Claims code paths were only ever *added to* (new `else if` / new `if` blocks), never rewritten.

## 6. Known limitation: admin-side verification not completed by this session

The Admin Dispute Reviews workspace requires `VITE_ADMIN_ACCESS_CODE` to authenticate. This session read `.env.local` only with values redacted and deliberately did not retrieve or enter that code — entering access codes/credentials into any field is outside what this session does on its own, even for the project's own admin panel. As a result, the following are implemented and code-reviewed but **not yet click-verified in the browser**:
- Admin quick-filter chips
- Admin display of the Supreme Court follow-up answers (should now show cleanly, without the hidden JSON tail)
- Form 2 eligibility gate rendering and the paragraph-builder UI
- Actually generating and downloading a Form 2 Working Draft PDF (requires the new backend action to be deployed first, in any case — see §8)

**Recommended next step:** you log into `/admin` yourself (locally at `http://localhost:4173/admin` while the preview server from this session is running, or in production after deployment) and open Review ID `ADR-20260722-153929` to confirm the panel looks right, or ask me to continue once you're logged in.

## 7. Test matrix

| Scenario | Expected | Actual | Pass/Fail | Evidence |
|---|---|---|---|---|
| A. Complete defence intake (Pleading + Engineering Report uploaded, registry/file number/service/professional-review present) | Sufficient; Form 2 eligible | `sufficient: true`, `Form2 eligible: true` | Pass | Scratch test output |
| B. Missing pleading | Insufficient; no merits conclusion; Form 2 not eligible | `sufficient: false`, flags include `DECISIVE_DOCUMENT_MISSING`; Form 2 blocked with 3 correct missing-requirement reasons | Pass | Scratch test output |
| C. Response deadline passed | Urgent flag; no definitive extension statement | `COURT_RESPONSE_DEADLINE_PASSED` + `COURT_SERVICE_PROOF_MISSING`, riskLevel `High`; language is phrased as "must be verified immediately", never definitive | Pass | Scratch test output |
| D. Multiple defendants + conflict unresolved | Conflict review flagged; no guarantee of joint counsel | `MULTI_DEFENDANT_CONFLICT_REVIEW` + `INJUNCTION_MATERIALS_INCOMPLETE` | Pass | Scratch test output |
| E. Insurer not notified | Urgent insurance flag | `INSURER_NOT_NOTIFIED` | Pass | Scratch test output |
| F. Live public intake, full 10-step wizard, real production submission | New branch fields render (all 4 groups, 14 new document categories, Multi Select checkboxes); submission succeeds; correct EN/ZH report title; no schema change | Confirmed via browser + direct spreadsheet read-back of Review ID `ADR-20260722-153929` — 57 columns unchanged, correct dispute type/tribunal/role, correct titles, `Follow-up Answers` JSON-tail round-trip confirmed present in the live cell | Pass | Live spreadsheet content (this session) |
| G. Language switch | No data/upload loss; same Review ID | Not separately re-tested this session (mechanism unchanged from V1.0, which already covers this) | Not re-tested | — |
| H. Mobile | Full ten-step workflow works | Not tested this session (desktop viewport only) | Not tested | — |
| I. Admin: filters, Form 2 gate/draft, RTB regression | — | **Not tested** — see §6 | Pending | — |
| J. Real evidence upload (Pleading file → decisive-document match) | Uploading a file categorized "Pleading" clears `DECISIVE_DOCUMENT_MISSING` | Not exercised via the browser in this session — the in-app browser tooling used here has no file-picker automation. Logic is covered by scenario A (Node-level, with a synthetic uploaded-file object) and by the unchanged, already-shipped upload pipeline (`uploadDisputeFile_`/`DOCUMENT_CATEGORIES` already confirmed to list the new categories in the live dropdown). | Not browser-tested | Screenshot/read_page of the categories dropdown |

Test record `ADR-20260722-153929` is clearly marked `TEST — Supreme Court Litigation Extension Verification` and should stay marked `TEST / Closed` if retained, per the same convention as the V1.0 record.

## 8. What remains before this can be called fully done

1. ~~Deploy Apps Script~~ — done, version `@90`.
2. ~~Commit and push the frontend~~ — done, commit `074e284`, Netlify `ready`.
3. **Apply the spreadsheet additions** in `docs/AI Dispute Review - Supreme Court Spreadsheet Additions.md` (optional, documentation-only, but recommended for schema-audit parity).
4. **Admin-side click-through verification** (§6) — filters, Form 2 gate, Form 2 PDF generation and download, and a quick RTB regression check (open an existing RTB record, confirm it still displays and regenerates correctly).
5. Regenerate reports for `ADR-20260722-153929` from Admin, confirm the EN/ZH PDFs download with the correct "Preliminary Litigation Assessment Report" title and the injunction/expert-evidence content, then generate a Form 2 Working Draft PDF and confirm the banner/unresolved-placeholder handling.

## 9. Rollback instructions

- **Frontend:** revert the working-tree changes to `src/utils/disputeReview.js`, `src/pages/DisputeReview.jsx`, `src/pages/admin/DisputeReviews.jsx`, and `src/styles/global.css` (all additive diffs against commit `18eb8f8`; `git checkout 18eb8f8 -- <path>` per file, or `git diff 18eb8f8 -- <path> | git apply -R` if already committed). No data migration is needed since no schema changed.
- **Backend:** to roll back the deployed Apps Script, revert `apps-script/DisputeReview.gs` and `apps-script/Code.gs` to their `18eb8f8` versions and re-run `clasp push` + `clasp deploy --deploymentId AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0` (same deployment ID, exec URL unchanged). All other actions are untouched, so this cannot affect RTB/CRT/Strata/Small Claims.
- **Spreadsheet:** nothing was written by this session, so there is nothing to roll back there. If the reviewable additions in `docs/AI Dispute Review - Supreme Court Spreadsheet Additions.md` are later pasted in and need reverting, simply delete the added rows/values — nothing else references them at runtime.
- **Test record:** `ADR-20260722-153929` can be deleted or marked `Closed` at any time; it holds no real client data.

## 11. Case Navigator: Full 11-Stage Workflow (v1.0 — Feature Complete)

Everything in §1-§10 above covers only the intake extension and the Form 2 gate (Stages 1-3 of what is now an 11-stage workflow). Across several follow-on phases (each a separate, user-approved engineering loop — none of it done in one pass), the **BC Supreme Court Case Navigator** was added: a guided 11-stage workflow, rendered in the same admin case-detail modal, that walks a self-represented defendant from intake through post-judgment. This section is the authoritative record of that work; §1-§10 remain unchanged as the historical record of the intake extension itself.

### 11.1 The 11 stages

| # | Stage | Model | Status |
|---|---|---|---|
| 1 | Case Intake | Existing intake form (no change) | Complete |
| 2 | Litigation Assessment | Existing rule-based report + Gemini Content Analysis/Working Draft (§C-E) | Complete |
| 3 | Response to Civil Claim / Form 2 | Existing Form 2 eligibility gate + working-draft generator (§ above) | Complete |
| 4 | Evidence Preparation | Full operational workspace — Evidence Matrix | Complete |
| 5 | Document Discovery | Full operational workspace | Complete |
| 6 | Examination for Discovery | Full operational workspace (tabbed, 5 sections) | Complete |
| 7 | Applications | Full operational workspace (flat list) | Complete |
| 8 | Settlement | Full operational workspace (flat list of offers) | Complete |
| 9 | Trial Preparation | Simplified guidance: guide + checklist + resources + lawyer-review checkpoint | Complete |
| 10 | Hearing / Court Binder | Simplified guidance (same model as Stage 9) | Complete |
| 11 | Judgment, Costs and Enforcement | Simplified guidance (same model as Stage 9) | Complete |

**Stages 4-8** are full operational workspaces: structured records (rows/offers/applications), controlled vocabularies, computed timing indicators (Overdue/Due Soon/On Track from user-entered dates only), and summary dashboards. **Stages 9-11** are deliberately lighter — courtroom strategy, evidentiary decisions, costs, and enforcement are too case-specific for a structured data model, so they're guide + checklist + official resources + a lawyer-review checkpoint, with only per-item checklist status persisted (no case content).

### 11.2 Architecture (applies to all of Stages 4-11)

- **Single envelope, additive siblings.** Every stage reuses the same `AI Analysis JSON` column via the versioned envelope introduced in §B, adding one new sibling key per stage's workspace — never a new column, never a new sheet:
  ```json
  {
    "schemaVersion": 2,
    "ruleAnalysis": {}, "contentAnalysis": {}, "workingDraft": {},
    "evidenceMatrix": {}, "documentDiscovery": {}, "examinationDiscovery": {},
    "applications": {}, "settlement": {}, "lateStageGuidance": {}
  }
  ```
  `readDisputeAiAnalysisEnvelope_` (`apps-script/DisputeAiAnalysis.gs`) is still the one authoritative reader — every new sibling was added there with an explicit `.hasOwnProperty()` passthrough so any envelope writer (old or new) carries every other sibling forward untouched. This was re-verified after every single phase: save each workspace in turn, reload, confirm every other sibling survived byte-for-byte.
- **Status is always computed, never hand-set.** `getWorkflowProgress` (`src/config/supremeCourtCivilClaimDefendantWorkflow.js`) derives every stage's badge from the underlying workspace data (row/offer/application arrays for Stages 4-8; per-item checklist status for Stages 9-11) — nothing is a manually-set dropdown. A stage only leaves `not_started`/`conditional` because of its OWN recorded data, never because an earlier or later stage has data.
- **Late-stage checklist model (Stages 9-11 only).** One compact `lateStageGuidance` object with three sub-keys (`trialPreparation`/`courtBinder`/`judgmentCostsEnforcement`), each `{status, checklist, notes, updatedAt}` — `checklist` maps a fixed set of item IDs to `Not Started`/`In Progress`/`Completed`/`Not Applicable`. Stage status is a pure rollup: untouched → `not_started`; every applicable item Completed/N-A → `completed`; anything else touched → `in_progress`. This is deliberately the ONLY thing persisted for Stages 9-11 — no case content, no dates beyond what a free-text notes field records.
- **One shared component for Stages 9-11.** `LateStageGuidanceWorkspace.jsx` renders all three stages as `CollapsibleCard`s (progressive disclosure) rather than three separate heavy workspace components — reusing `WORKFLOW_STAGES`' existing guidance content (what it means / when it applies / what to organize / cautions, all written in Phase 1) and `StageForms` (exported from `SupremeCourtCaseNavigator.jsx` for reuse) for official form cards, so no guidance text or form-card markup was duplicated a third time.

### 11.3 Files (cumulative across all Stage 4-11 phases)

Apps Script (each stage's workspace gets one dedicated `.gs` file mirroring the same read/merge/get/save shape):
- `DisputeEvidenceMatrix.gs`, `DisputeDocumentDiscovery.gs`, `DisputeExaminationDiscovery.gs`, `DisputeApplications.gs`, `DisputeSettlement.gs`, `DisputeLateStageGuidance.gs`
- `DisputeAiAnalysis.gs` — `readDisputeAiAnalysisEnvelope_` extended once per phase to add the new sibling's passthrough (6 additions total across Stages 4-11)
- `Code.gs` — two dispatcher lines added per stage (`getDispute*`/`saveDispute*`)

Frontend:
- `src/components/EvidenceMatrix.jsx`, `DocumentDiscoveryWorkspace.jsx`, `ExaminationDiscoveryWorkspace.jsx`, `ApplicationsWorkspace.jsx`, `SettlementWorkspace.jsx`, `LateStageGuidanceWorkspace.jsx`
- `src/components/SupremeCourtCaseNavigator.jsx` — one workspace-link entry per stage; `StageForms` exported for reuse by the Stage 9-11 workspace
- `src/components/CollapsibleCard.jsx` — reused unchanged throughout, including for Stages 9-11's progressive disclosure
- `src/config/supremeCourtCivilClaimDefendantWorkflow.js` — grew from the original 11-stage guidance-only config (§ above) to also hold every workspace's data model, controlled vocabularies, and progress-derivation logic; `getWorkflowProgress` now takes 8 positional arguments (review, formTwoEligibility, then one per Stage 4-11 workspace)
- `src/pages/admin/DisputeReviews.jsx` — mounts all six workspace components plus the Navigator, one `useState` per workspace, all reset in `openReview`
- `src/utils/disputeReview.js` — one `getDispute*`/`saveDispute*` pair per stage
- `src/styles/global.css` — additive only; reused `.scc-em-*` classes across every workspace, with one small new block (`.scc-late-checklist*`) for the Stage 9-11 checklist rows

### 11.4 Apps Script deployment history for this work

Same deployment ID throughout (`AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`, exec URL never changed), redeployed once per stage after the established clean-staging `clasp` procedure (fresh `clasp pull` → diff against local → clean staging directory with only files confirmed to belong to this project → `clasp push` → `clasp version` → `clasp deploy` to the same deployment ID):

| Version | Stage |
|---|---|
| `@93` | Evidence Matrix (Stage 4) |
| `@94` | Document Discovery (Stage 5) |
| `@95` | Examination for Discovery (Stage 6) |
| `@96` | Applications (Stage 7) |
| `@97` | Settlement (Stage 8) |
| `@98` | Late-stage guidance, Stages 9-11 |

### 11.5 Legal-information boundary (unchanged principle, applied consistently)

Every stage — operational workspace or simplified guidance — carries the same posture as the rest of this app: general legal information and document-organization guidance, never legal advice, never a litigation-strategy or courtroom-advocacy tool. Stages 9-11 make this explicit with a shared notice ("Trial preparation, courtroom procedure, evidentiary decisions, costs, appeals and enforcement are highly case-specific...") plus a one-line lawyer-review checkpoint per stage. No stage generates a court-ready document; every "official forms" card links to the live BC Government/BC Laws source, never a hosted copy.

### 11.6 Known limitations

- English only throughout (Chinese translation explicitly deferred at every phase, consistent with §H).
- No document generation anywhere in Stages 4-11 (no Form 22/23/32/33/34/36/40/41/42/48/62, no draft orders, no affidavits, no trial briefs, no bills of costs) — every workspace tracks whether a document is needed and its status, never generates it.
- Stages 9-11 persist only checklist status and free-text notes — no structured judgment/costs/deadline fields (a deliberate scope decision; see the Stage 11 architecture note in that phase's completion report).
- No OCR or automated document-content parsing anywhere in the Navigator (distinct from the separate Gemini Content Analysis pipeline in §D, which reads file bytes but only for the Litigation Assessment stage).
- Progress is entirely computed client-side from workspace data; there is no independent audit trail of status changes beyond each workspace's own `updatedAt` timestamps.

### 11.7 Future routes

- **Petition / Judicial Review Respondent Workflow** — **built, see §12.** A parallel guided workflow for a different BC Supreme Court proceeding type, using this Civil Claim Defendant workflow as the structural reference model (not a copy — see §12.9).
- **RTB (Residential Tenancy Branch) guided workflow** — the RTB dispute branch currently has only the original rule-based assessment (no stage-by-stage navigator equivalent to what Civil Claim Defendant now has). Not started.

### 11.8 Verification methodology (applied identically in every phase)

Each phase (one workspace) went through the same loop: inspect existing architecture → implement → `npm run build` + `npm run lint` (lint held at the same pre-existing baseline problem count throughout — 62 problems, 0 new, in every phase) → browser-verify end-to-end against the labeled test case `ADR-20260722-153929` (create a real record, save, reload, confirm every OTHER envelope sibling survived byte-for-byte, confirm the Navigator badge derivation) → deploy backend → re-verify against production → remove the verification-only test data → confirm the removal itself persisted after another reload → commit.

### 11.9 Commits

`8f43a93` (Case Navigator + Evidence Matrix), `4f285ba` (Document Discovery), `f2867a0` (Examination for Discovery), `1c778a6` (Applications), `5d0016a` (Settlement), and the commit recorded in the completion report for this final phase (late-stage guidance, Stages 9-11 — see that report for the exact hash).

---

## 12. Petition / Judicial Review — Respondent Workflow v1.0

Built 2026-07-26 as a second, entirely separate Case Navigator (`SC_PETITION_JR_RESPONDENT_V1`), structurally parallel to the Civil Claim Defendant workflow (§11) but not copied from it — a Petition is not a pleading-and-discovery action (see §12.9). Covers a BC Supreme Court respondent to a Petition, including a Petition for Judicial Review.

### 12.1 Architecture reviewed before implementation

Inspected and reused without modification: the intake wizard (`src/pages/DisputeReview.jsx`), the Admin AI Review Center (`src/pages/admin/DisputeReviews.jsx`), the API envelope (`src/utils/api.js`), the Civil Claim Case Navigator and its 11-stage config (`src/components/SupremeCourtCaseNavigator.jsx`, `src/config/supremeCourtCivilClaimDefendantWorkflow.js`), the Applications and Late-Stage Guidance workspace components as the CRUD/checklist UI patterns to mirror, the Apps Script dispatch pattern and `readDisputeAiAnalysisEnvelope_` sibling-namespace envelope (`apps-script/Code.gs`, `apps-script/DisputeAiAnalysis.gs`), the Drive folder helpers (`getDisputeReviewFolder_`/`getDisputeReportFolder_`), and the `generateFormTwoDraft_` temp-Doc-to-PDF pattern. No committed automated test harness existed for either the frontend logic or the Apps Script backend prior to this build (see §11.8's methodology note — verification there was always live/manual against a labeled test record, never an automated suite).

### 12.2 Real-case process reference (anonymized)

The user's own real 2025 BC Supreme Court petition matter (a tenant's Petition for judicial review of an RTB possession order, landlord as respondent) was reviewed as a process map only — no personal names, addresses, or the real court file number appear anywhere in code, config, or the test record. Procedural sequence observed: RTB decision → Petition filed → interim stay/requisition activity → respondent's Notice of Application (Form 32) and first affidavit (Form 109) → Response to Petition (Form 67) and Affidavit of Ordinary Service (Form 16) → second affidavit → hearing binder assembled → tenant's Application Response and Reply exchanged → hearing (oral submissions, bilingual) → final court order → notice of mandatory vacate / writ of possession. This sequence directly shaped the 11-stage list in §12.4 and the anonymized test scenario in §12.8.

### 12.3 Files changed

**New frontend files:**
- `src/config/supremeCourtPetitionJudicialReviewRespondentWorkflow.js` — single source of truth: 11 stage definitions, `FORMS` (Forms 66/67/32/33/34/35/109/16, each with `sourceRule`/`confirmNote`), relief-matrix model, JR-screening model, evidence/affidavit-plan model, interlocutory-application model (reuses `computeApplicationTiming` from the Civil Claim config by import, not duplication), hearing-binder model, guidance-checklist model for Stages 9-11, all eligibility gates, `getWorkflowProgress`, and the three working-draft builders.
- `src/components/SupremeCourtPetitionCaseNavigator.jsx` — top-level 11-stage renderer, gated by `isPetitionJrRespondentCase`.
- `src/components/PetitionReliefWorkspace.jsx` — Stages 3-5 (Relief & Position Matrix, conditional JR Screening, Form 67 gate + working-draft trigger).
- `src/components/PetitionEvidenceAffidavitWorkspace.jsx` — Stages 6-7 (evidence inventory, affidavit witness matrix, per-witness affidavit-draft gate + trigger).
- `src/components/PetitionApplicationsWorkspace.jsx` — Stage 8 (interlocutory application / stay / injunction, 9 subroutes).
- `src/components/PetitionGuidanceWorkspace.jsx` — Stages 9-11 shared checklist workspace (Hearing Readiness, Hearing Binder + index trigger, Final Order).

**Modified frontend files:**
- `src/utils/disputeReview.js` — added `pjr_*` follow-up questions (gated on Respondent/Application Respondent role + Petition/Judicial Review proceeding type, reusing `sc_registry`/`sc_court_file_number`/`sc_service_*`/`sc_response_deadline*`/`sc_injunction_requested`/`sc_lawyer_retained`/Opposing Party Name rather than duplicating them), `PJR_*` option constants + Chinese labels, `isPetitionJrRespondentCase`, four get/save API wrapper pairs, three working-draft-PDF wrappers sharing one `generatePetitionDraftPdf_` client helper.
- `src/pages/admin/DisputeReviews.jsx` — added `isPetitionJrRespondent`/`isCivilClaimDefendant` branch (single source of truth via `isPetitionJrRespondentCase`), mounted the four new workspaces + new Navigator only for Petition/JR cases, re-gated all seven Civil-Claim-only mounts (Evidence Matrix, Document Discovery, Examination for Discovery, Applications, Settlement, Late-Stage Guidance, Form 2 builder) to `isCivilClaimDefendant` so the two workflows can never both render, added a "Petition / JR Respondent" quick-filter chip.

**New Apps Script files:**
- `apps-script/DisputePetitionRelief.gs`, `DisputePetitionEvidence.gs`, `DisputePetitionApplications.gs`, `DisputePetitionGuidance.gs` — one get/save action pair each, identical pattern to `DisputeApplications.gs`/`DisputeLateStageGuidance.gs`.
- `apps-script/DisputePetitionDrafts.gs` — one shared `buildPetitionSectionedDraftPdf_` helper (mirrors `generateFormTwoDraft_`'s temp-Doc-to-PDF logic) plus three thin action wrappers (Form 67, Affidavit, Hearing Binder Index).

**Modified Apps Script files:**
- `apps-script/DisputeAiAnalysis.gs` — `readDisputeAiAnalysisEnvelope_` extended with four new sibling keys (`petitionRelief`, `petitionEvidence`, `petitionApplications`, `petitionGuidance`) in all four return branches, so every existing writer (content analysis, working draft, and every Civil Claim workspace) continues to carry these forward untouched.
- `apps-script/Code.gs` — nine new dispatch lines (four get/save pairs + three draft-PDF actions), inserted immediately after the existing `generateFormTwoDraft` line; zero existing dispatch lines changed.

`src/config/supremeCourtCivilClaimDefendantWorkflow.js` and every Civil Claim workspace component/`.gs` file are **byte-for-byte unchanged** (confirmed via `git diff --stat`, zero output).

### 12.4 The 11 stages

1. Proceeding Identification — 2. Service and Response Deadline Review — 3. Petition and Relief Analysis — 4. Judicial Review Screening (conditional) — 5. Response to Petition Planning (Form 67 gate) — 6. Evidence and Affidavit Plan — 7. Affidavit Working Draft Route (conditional, per-witness gate) — 8. Interlocutory Application / Stay / Injunction (conditional) — 9. Hearing Readiness — 10. Hearing Binder and Submission Plan — 11. Final Order and Post-Decision.

### 12.5 Routing rules

One-way, single authoritative stage state: `getWorkflowProgress` in the config file derives every stage's status purely from live workspace data (relief-matrix rows, JR-screening fields, evidence/witness records, interlocutory-application records, guidance checklists) — nothing is separately stored as a "current stage" field, so frontend state, the spreadsheet, and generated reports can never disagree. A case routes to this Navigator instead of the Civil Claim one, or to neither, based on a single boolean (`isPetitionJrRespondentCase`): Dispute Type = Supreme Court Litigation AND Client Role in {Respondent, Application Respondent} AND `sc_proceeding_type` in {Petition, Judicial Review}.

### 12.6 Official Rules/Forms source map

Every form entry (`FORMS` in the config file) carries `formNumber`/`name`/`purpose`/`sourceRule`/`stageIds`/`usage`/`sourceUrl` (BC Government forms index)/`ruleUrl` (Supreme Court Civil Rules)/`confirmNote` (explicit facts-still-needed + registry/lawyer-confirmation warning) — Forms 66, 67, 32, 33, 34, 35 (dual-purpose, flagged), an unnumbered "Applicable Order Form" (deliberately not asserting a specific number — see its `confirmNote`), 109, and 16. Rules referenced in guidance text: 2-1, 4-3, 8-1, 8-2, 13-1, 14-1, 16-1, 22-2, 22-3; Judicial Review Procedure Act linked via `JUDICIAL_REVIEW_PROCEDURE_ACT_URL`. No filing deadline is ever asserted as conclusive — every deadline-bearing stage/gate carries a registry-confirmation warning, matching the Civil Claim workflow's existing posture.

### 12.7 Document-generation gates (never silently generated)

- **Form 67 working draft** (`checkForm67Eligibility`) — requires Petition uploaded, registry, file number, at least one relief-matrix row, at least one assigned position, and factual basis for every *opposed* row (No Position/Consent rows do not require one — fixed during testing, see §12.8).
- **Affidavit working draft** (`checkAffidavitDraftGate`) — requires affiant role, factual purpose, ≥1 linked evidence item, ≥1 exhibit, and the affiant's own verification acknowledgement.
- **Hearing binder index** (`checkHearingBinderGate`) — requires filed-document list confirmed, affidavits identified, applications/orders identified, duplicate check completed, and the missing-document warning explicitly accepted.

Every generated draft is labelled `Working Draft`/`Unsigned Working Draft — Facts Must Be Verified by the Affiant`/`Preliminary Binder` — never "final," "filed," or "court-ready." No stage auto-generates Form 32/33/34/35/an order form.

### 12.8 Testing

Two layers, both passing, neither touching the live production spreadsheet/Drive/deployment (see §12.10 for why):
1. **Pure-logic harness** (Node, no network calls) exercising an anonymized synthetic case modeled on the real matter's procedural shape (RTB decision, Judicial Review petition, stay requested, multiple relief orders with mixed positions, respondent affidavit, interlocutory stay application, hearing binder) against every export in the config file — classification routing (including confirming Civil Claim and Petitioner-role cases are correctly excluded), the 11-stage list, all three eligibility gates, all three working-draft builders, and `getWorkflowProgress`. Caught and fixed one real bug: `checkForm67Eligibility` originally required a factual basis for "No Position" rows, which don't need one (only "Oppose" does).
2. **Live browser check** of the public intake wizard (frontend-only, no submission) confirming the new Step 7 follow-up sections ("Petition Classification," "Decision Under Review," "Relief and Risk Flags," "Filing Status") render correctly for Client Role = Respondent + Proceeding Type = Judicial Review, in both English and Chinese — caught and fixed two missing Chinese option labels (`Available`, `Not Applicable`).

Confirmed via `git diff --stat`: zero effect on any Civil Claim Defendant file. Confirmed via a direct function call: Civil Claim Defendant intake renders zero `pjr_*` questions.

### 12.9 Why Petition / Judicial Review Is Not Civil Claim

Petition proceedings are not based on Notice of Civil Claim/Response to Civil Claim pleadings — the response is Form 67, not Form 2, and there is no admit/deny paragraph structure to import (the relief-matrix positions are Consent/Oppose/No Position/Unclear, not Admitted/Denied/Outside Knowledge). Evidence is affidavit-centred rather than pleading-and-discovery-centred — there is no document-discovery or examination-for-discovery stage, because petitions do not automatically carry action-style discovery. Judicial Review specifically reviews a statutory decision-maker's record (reasons, tribunal record, enabling statute) rather than trying facts at trial, hence the dedicated conditional JR Screening stage with its own issue-category taxonomy. Interim stay/injunction applications can create a genuinely urgent, separate route (Stage 8's 9 subroutes) rather than being folded into a general "Applications" stage. The hearing and binder structure differs from a conventional civil trial (no trial brief/trial certificate/notice of trial — instead a hearing-readiness checklist and a binder built from confirmed-filed documents only). Not every Petition is a Judicial Review, and not every Civil Claim tool (Form 2, document discovery, examination for discovery, settlement-offer tracking under Rule 9-1) applies — which is why this is a second, independently-gated Navigator rather than a branch inside the existing one.

### 12.10 What was deliberately NOT done in this cycle

Per the agreed scope boundary: no Petitioner-side workflow, no Court of Appeal workflow, no automatic filing/service, no legal-merits prediction, no case-law engine, no automatic filed-ready hearing binder, no automatic appeal documents. The Applications workspace's per-application "generate response PDF" action was also left as an eligibility indicator only (no dedicated PDF generator wired), consistent with the spec listing it as one of several *possible* Stage 8 outputs rather than a mandatory one.

### 12.11 Production closeout — 2026-07-26/27

Following user go-ahead, the build was committed, pushed, and deployed to the live production system, then verified against the real backend using an anonymized test record.

**Git:** Commit `dc5414322a94a81a0e2c39d1c6414d78a341b652` ("Add Petition / Judicial Review Respondent Workflow v1.0"), 16 files, pushed to `origin/main` on `mabelclaw67-hash/Landlord-AI-Marketing-Studio` as a clean fast-forward (`83d4374..dc54143`). (GitHub reports the repo's canonical URL is now lowercase `-studio`; the existing `-Studio` remote still works via redirect — no action taken, flagged for the user's awareness only.) `.claude/launch.json` and `src/pages/StrategyAssessment.jsx` were pre-existing unrelated uncommitted changes from before this build and were deliberately left out of the commit.

**PII sweep:** grepped every new/changed file for the real case's names, addresses, and file/registry numbers — zero matches in anything this build touched. Two unrelated pre-existing strings matched the search pattern (the repo's own public GitHub owner name in the doc header, and the site's own admin notification email in an unrelated trial-request feature in `Code.gs`); both confirmed via `git diff` to be outside this session's changes.

**Apps Script deployment:** Found the correct, previously-used `clasp` project (scriptId `1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp`, staged historically at `/private/tmp/clasp_verify3`) by content-matching its files against this repo — two *other* candidate `.clasp.json` files found on disk belonged to a completely unrelated project (`01_Vanisland_UI_Portal`) and were correctly not used. Pulled the live project fresh and diffed it byte-for-byte against this repo's pre-change baseline (identical — confirming no untracked live drift), pushed the 17-file project (12 unchanged + `Code.gs`/`DisputeAiAnalysis.gs` updated + 5 new Petition files), then updated the existing deployment in place: **`AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0` moved from `@98` ("Late-stage guidance backend") to `@99`** ("Petition/Judicial Review Respondent workflow backend (SC_PETITION_JR_RESPONDENT_V1)") — same deployment ID, same exec URL, matching `VITE_STUDIO_EXEC_URL`. Re-pulled after deploy and diffed again: live HEAD is byte-for-byte identical to the local repo for every changed/new backend file.

**Live execution verification (source-level plus unauthenticated-path only):** The app's `doPost` runs a trial/admin access gate (`resolveAccessContext_`) before any action dispatch, so an unauthenticated probe cannot distinguish "action exists but requires admin" from "action doesn't exist" — both return the same generic access-denied response. Source-level diffing (above) is the rigorous confirmation that the dispatcher and backend functions are live. The public, no-auth path was exercised end-to-end for real:
- Ran the full 10-step public intake wizard (both languages) against the live production backend (via the local dev server, which is configured to talk to the same production exec URL as the deployed site).
- Created anonymized test record **`ADR-20260726-201811`**, Client Name field literally set to `TEST — ANONYMIZED PETITION/JR WORKFLOW`.
- Confirmed via direct spreadsheet read (bypassing the app entirely, using the Drive/Sheets connector) that the row landed correctly: `Client Role = Respondent`, `Dispute Type = Supreme Court Litigation`, all 6 reused `sc_*` fields and all 18 new `pjr_*` fields present in `Follow-up Answers` with the exact anonymized values entered, both `Report EN JSON` and `Report ZH JSON` populated (titles "Preliminary Litigation Assessment Report" / "初步诉讼评估报告").
- Confirmed via direct Drive search that a real evidence subfolder `ADR-20260726-201811` was created under the `Dispute Files` root — folder placement confirmed.
- The on-page bilingual rule-based report rendered correctly (timeline, missing-evidence flags, AI flags including `COURT_RESPONSE_DEADLINE_PASSED`, confidence/priority scoring) for a Petition/JR case, confirming `analyseDispute`/`buildDisputeReport` (shared, unmodified logic) handle this dispute type correctly.
- Clicking "Download English PDF" correctly returned no PDF (report PDFs are only generated by the admin-only `generateDisputeReport` action, per existing, unmodified app design — this is expected behavior, not a defect; confirmed by reading `downloadDisputeReportPdf_`'s source, and by confirming no `Dispute Reports/ADR-20260726-201811` folder exists yet).

**Not verified in this closeout (requires the user's own admin login):** the Admin AI Review Center's Petition/JR panel display and stage badges; the four new workspace save/load round-trips against the live backend; the Form 67 / Affidavit / Hearing Binder Index gated PDF generators; `generateDisputeReport`'s admin-triggered PDF write-back. I do not have and did not seek admin/trial access credentials — entering them was out of scope regardless, and the public-path + source-level verification above is the maximum rigor achievable without them. These remain to be exercised by the user (or a future session with the user's admin session) as a final acceptance check before the workflow is used on a real matter.

---

## 10. Change Log

### V1.3 — 2026-07-26

- Built the Petition / Judicial Review — Respondent Workflow v1.0 as a second, independent Case Navigator (`SC_PETITION_JR_RESPONDENT_V1`) — see §12 for the full record.
- Four new envelope sibling keys added (`petitionRelief`, `petitionEvidence`, `petitionApplications`, `petitionGuidance`) — no new Sheet columns, no changes to any existing Civil Claim envelope key.
- Added 18 new `pjr_*` follow-up intake fields, gated on Respondent/Application Respondent role + Petition/Judicial Review proceeding type; zero new top-level `Dispute_Reviews` columns.
- Verified via a pure-logic test harness against an anonymized synthetic case and a live (frontend-only) browser check of the public intake wizard, in both English and Chinese; zero regression to the Civil Claim Defendant workflow confirmed via `git diff --stat` and direct function calls.
- **Production closeout (2026-07-26/27):** committed (`dc54143`) and pushed to `origin/main`; Apps Script deployed to the existing production deployment `AKfycbw01LTH...` (`@98` → `@99`); live deployment content verified byte-for-byte via `clasp pull`; anonymized test record `ADR-20260726-201811` created through the real public intake against production, with spreadsheet write-back and Drive folder placement confirmed by direct read. See §12.11 for full detail and for what remains to be verified through the admin panel.

### V1.2 — 2026-07-26

- Added the full BC Supreme Court Case Navigator: 11 guided stages covering the entire Civil Claim Defendant workflow (see §11 for the complete record).
- Stages 4-8 (Evidence Preparation, Document Discovery, Examination for Discovery, Applications, Settlement) implemented as full operational workspaces across five separate phases, each its own complete engineering loop.
- Stages 9-11 (Trial Preparation, Hearing/Court Binder, Judgment/Costs/Enforcement) implemented as one shared, deliberately lighter guidance + checklist workspace in a final closeout phase.
- Nine new envelope sibling keys added across all phases (`evidenceMatrix`, `documentDiscovery`, `examinationDiscovery`, `applications`, `settlement`, `lateStageGuidance`) — no new Sheet columns at any point.
- Apps Script redeployed once per phase to the same production deployment ID, ending at version `@98`.
- **Marked BC Supreme Court Civil Claim Defendant Workflow v1.0 — Feature Complete.**

### V1.1 — 2026-07-22

- Added Supreme Court Litigation as a sixth dispute branch, reusing the existing single-source-of-truth architecture with zero new `Dispute_Reviews` columns.
- Added 23 new dynamic follow-up fields, 8 new AI flags, Supreme-Court-flavored report content, and a "Preliminary Litigation Assessment Report" title variant within the existing 15 report sections.
- Added an admin-only, generate-on-demand Form 2 (Response to Civil Claim) Working Draft tool with an explicit eligibility gate and no fact invention.
- Fixed a pre-existing gap where Admin's "Generate / Update Reports" action silently lost every dispute-type-specific follow-up answer on regeneration, for all dispute types.
- Verified end-to-end against the live production backend and spreadsheet from the public intake side; admin-side click-through and deployment remain outstanding pending your go-ahead.

---

**Continuation rule:** update this file after every material schema, route, deployment, security, report, or storage change, adding a dated Change Log entry rather than rewriting historical records.
