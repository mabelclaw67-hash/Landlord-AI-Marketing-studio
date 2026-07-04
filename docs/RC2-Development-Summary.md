# Landlord AI Marketing Studio — RC2 Development Summary

This document summarizes the RC2 stabilization phase: what was added, what was restored after a
branch-divergence regression, and the rules that must hold going forward. It is a point-in-time
release summary. For the living architecture reference, see `01_SYSTEM_ARCHITECTURE.md`,
`02_OPERATIONS_MANUAL.md`, and `03_DEVELOPER_HANDBOOK.md`. Version-by-version feature history is in
`04_CHANGELOG.md`.

Status at time of writing: all RC2 changes exist in the working tree and are ready to commit. See
"Files Changed This Round" below for the exact file list. Apps Script must be redeployed and the
frontend rebuilt/deployed before any of this is live in production.

## 1. AI Rental Strategy Assessment

Public page: `/landlord-ai/strategy-assessment` (`src/pages/StrategyAssessment.jsx`, backend action
`savePropertyStrategyAssessment` in `apps-script/Code.gs`).

Purpose: a free, self-serve preliminary assessment for landlords and prospective landlords who want
an early read on whether and how to rent out a property, before engaging Vanisland directly. It is a
lead-generation and landlord-education tool, not a paid service and not a substitute for a human
property management assessment.

Bilingual: full English/Chinese UI (`lang` prop), including the generated report copy.

Report sections actually generated (`copy.report` in `StrategyAssessment.jsx`):

- Overall Assessment (`executiveSummary`)
- Property Strengths
- Issues to Watch (rental challenges)
- Rental Strategy Recommendation
- Rent Positioning Recommendation (rent range guidance)
- Suite Potential Analysis / Suite Quality & Privacy Analysis
- Location Value Analysis
- Airbnb / STR Reminder
- Legal Risk Reminder
- AI Confidence & Flags
- Landlord Knowledge Center
- Marketing Suggestions
- Professional Preliminary Recommendation (owner-goal alignment)
- Recommended Service (next step)
- Disclaimer

Submissions are saved via `savePropertyStrategyAssessment_()` to a dedicated
`PROPERTY_STRATEGY_ASSESSMENTS_SHEET` (its own spreadsheet, not `07 Intake Records` — this is
pre-listing lead intake, not a rental application). The record includes legal-risk flags
(`legalRiskFlag`, `ownerOccupancyRelated`, `occupied12Months`) so staff can see BC-tenancy-law-relevant
answers (e.g. owner-move-in eviction rules) at a glance.

This feature predates the RC2 stabilization work below; it is documented here because it had not yet
been captured in `docs/`.

## 2. Initial Screening Summary — listing-level report

**This is a listing-level report. It is not the Full Applicant Audit Report and must never be
labeled or saved as one.**

Purpose: a first-pass comparison across every applicant on a single listing, to help the landlord
decide who moves to the next round. Built entirely from application form data — it does **not**
depend on Supporting Documents.

Implementation:

- `src/utils/applicantScreeningReports.js` → `downloadApplicantInitialScreeningSummary({ listing, applications, lang })`
  builds a scored/ranked HTML report (`buildApplicantEvaluation()` per applicant) and converts it to
  PDF.
- Saved via the generic `saveApplicantReportPdf` Apps Script action (`saveApplicantReportPdf_` in
  `Code.gs`) into the listing's `Tenant Screening Reports` Drive folder.
- Filename pattern: `Applicant_Initial_Screening_Summary_{ListingID}_{Date}.pdf`

Report contents: applicant comparison table, applicant ranking, initial screening notes, a
landlord-readable summary, income-to-rent ratio, and a plain-language recommendation per applicant.

Entry points: `ListingDetail.jsx` (Application Management block) and `Leads.jsx` (shown when a single
listing is selected via `?listingId=`). See Section 7 for the full UI map.

## 3. Full Applicant Audit Report — applicant-level report

**This is an applicant-level report. It is not the Initial Screening Summary and must never be
labeled or saved as one.**

Purpose: a detailed, second-round review of one specific applicant, combining their application form
data with their Supporting Documents.

Implementation: `apps-script/Code.gs` — `generateFullApplicantAuditReport_()` builds a Markdown report
(`buildFullApplicantAuditMarkdown_()`) from the application record plus matched supporting documents,
converts it to a Google Doc and then PDF, and saves it via `saveFullApplicantAuditToDrive_()`.

Report sections: Applicant Overview, Documents Reviewed, Extracted Document Summary, Income
Verification, Employment Verification, ID/Identity Consistency Check, Bank Statement Review, Credit/
Background Review, Reference/Landlord Check, Potential Inconsistencies, Missing Items, Risk Analysis,
Strengths, Concerns, Recommended Decision, Confidence Level, Manual Verification Required Items,
Disclaimer. See Section 5 for how these are localized.

Filename pattern: `Full_Applicant_Audit_{ApplicantName}_{RecordID}_{ListingID}_{Date}.pdf`

Saved to: the listing's `Tenant Screening Reports` Drive folder (same folder as the Initial Screening
Summary — see Section 6 for how the two are kept distinguishable).

Entry point: `ApplicationReview.jsx` only (`/admin/application/:recordId`), plus status/links surfaced
in `Leads.jsx`. It is intentionally **not** generated from `ListingDetail.jsx` or `Leads.jsx` directly
— those pages link to the Application Review page for this.

## 4. Supporting Documents Detection — stable rule

Full Audit generation looks for supporting documents in this order:

1. Applicant record-level support folder (`record.supportDocumentFolderUrl`, written when the
   applicant uploads through the standard `Request Supporting Documents` email flow).
2. If record-level is empty, fall back to the listing-level `Supporting Documents` Drive folder and
   match files to this applicant by identity:
   - full name
   - first name + last name (tokens can appear in any order/position in the filename)
   - email
   - phone number
   - Matching is case-insensitive and tolerant of spaces, hyphens, and underscores.
3. Once matched (from either source), Full Audit generation is allowed to proceed.
4. If a matched document cannot be read automatically (e.g. scanned PDF, unsupported format), the
   report shows: `This document could not be automatically verified. Manual verification is required.`
   — it does not claim the document is missing.

**Important, recurring point of confusion:** `Uploaded File Count: 0` on an application record does
**not** mean there are no supporting documents. It only means the applicant record was never updated
by the record-level upload flow (e.g. the files were placed directly into the listing's Supporting
Documents folder by staff). The system must always fall back to listing-level matching before
concluding documents are missing.

Admin-only diagnostics: the Application Review page shows a "Supporting Document Detection Debug"
panel (`buildSupportDocumentDebugInfo_()` in `Code.gs`) with: applicant name used for matching,
listing ID, record-level document count, whether the listing-level folder was found, listing-level
matched count, matched file names, unmatched file names, and the final document set used for the
report.

## 5. Report Language Rule

- Chinese admin UI → Chinese report content.
- English admin UI → English report content.
- This applies to the Full Applicant Audit Report: section headings, field labels, status wording,
  and the "manual verification required" message.
- Language is threaded end to end: `ApplicationReview.jsx` reads `lang` from `useLang()` →
  `generateFullApplicantAuditReport(recordId, lang)` → `storage.js` sends `language` in the request
  body → `Code.gs` dispatcher passes `body.language` → `generateFullApplicantAuditReport_(recordId,
  auth, language)` → `fullAuditI18n_(language)` selects the English or Chinese string table
  (`FULL_AUDIT_REPORT_STRINGS_`).
- If `language` is missing or not `"zh"`, the system defaults to English. **Do not hardcode a
  permanent English default that ignores the UI language when it is present** — the default is only a
  fallback for a missing/unrecognized value.
- A generated report keeps whatever language it was generated in. Refreshing the page does not
  re-translate an already-saved report; regenerating it does.

## 6. Report Storage Rule

All tenant-screening-related reports are saved to:

```text
{Listing Drive Folder}/Tenant Screening Reports
```

This includes both the Initial Screening Summary and the Full Applicant Audit Report. They share the
same folder but are always distinguishable by filename prefix and by an explicit `reportType` value:

- `Applicant_Initial_Screening_Summary_...` → `reportType: "Initial Screening Summary"`
- `Full_Applicant_Audit_...` → `reportType: "Full Applicant Audit Report"`

`inferApplicantReportType()` (`ListingDetail.jsx`) classifies saved PDFs by filename when listing what
already exists in the folder, so the two report types are never mixed or mislabeled in the UI.

Do not save either report to: the `Supporting Documents` folder, an applicant's individual support
folder, the Drive root, the wrong listing's folder, or browser `localStorage` only (a report is not
"Saved" unless it has a real Drive file and URL).

## 7. Admin UI / Workflow Map

**Listing Detail** (`/admin/listing/:id`, Application Management block):

- View Applications for This Listing
- Open Application Link (application portal)
- Generate / Regenerate Initial Screening Summary
- View Initial Screening Summary
- Download Initial Summary PDF
- Initial Summary status: Not generated / Generated / Drive save failed
- Applicant Screening Reports list (shows saved Initial Summary and Full Audit PDFs from Drive, each
  correctly labeled by type) + in-page viewer

**Leads / Application Management** (`/admin/leads`, optionally `?listingId=...`):

- Listing filter (`?listingId=`)
- Listing-level Initial Screening Summary card (Generate + link to view on Listing Detail), shown only
  when a single listing is selected
- Per-applicant row/card: review status, Supporting Documents status (`Uploaded File Count`), Full
  Audit status badge (Not generated / Generated / Drive save failed), View Application, Generate/View
  Full Audit, Download Full Audit PDF

**Application Review** (`/admin/application/:recordId`):

- Applicant details, rule-based Screening Summary panel
- Supporting Documents status (record-level count)
- Supporting Document Detection Debug panel (admin-only)
- Generate / Regenerate Full Applicant Audit Report
- View / Download Full Audit PDF, Open Drive PDF
- Full Audit report viewer (rendered Markdown)

Initial Screening Summary is **not** generated from the Application Review page — that page is
applicant-level only.

## 8. Access Isolation

**Internal Admin:**

- Can view all listings and all applications.
- Can filter applications by listing.
- Can generate/view Initial Screening Summary and Full Applicant Audit Report for any listing.

**Trial / external user:**

- Can only view listings/applications they are authorized for (enforced by
  `canAccessListingRecord_()` / `findListingByIdForEmail_()` on the backend, and
  `isTrialUser`/`accessDenied`/`trialNeedsListing` state on `Leads.jsx`).
- Cannot browse all applications, and cannot reach another listing's applicants by guessing a URL —
  the backend re-checks listing ownership on every request, not just at page load.
- Cannot generate or view reports for a listing they are not authorized for.
- Never see internal Drive links/URLs; only Admin/Owner sessions see those.

## 9. Git / Branch Lesson (why this stabilization round was needed)

During RC2 it was discovered that "Initial Screening Summary" appeared to be missing from the admin
UI. Investigation (`git log --all`) showed this was **not** a deleted-code regression — it was a
branch divergence:

- Both lines shared a common ancestor commit.
- One line (`e37ee5b` "Add applicant screening reports workflow" → `2db9855`) added the listing-level
  Initial Screening Summary. It only ever existed on the local `main` branch and on
  `origin/network5`/`origin/nightly5` — it was never pushed to `origin/main`.
- The other line (`f8a6aae` → `9efecf6` → `96af883` → `199eb05`) added and stabilized the Full
  Applicant Audit Report. This line **is** `origin/main` — the branch Netlify actually builds from.

Neither branch alone had both features. The two lines were never merged. RC2 fixed this by manually
integrating the Initial Screening Summary code into the current `origin/main`-based working tree
(deliberately skipping a colliding, unused, OCR-based competing "Full Audit" implementation that also
lived on the `e37ee5b` line — see the working-tree comments in `Code.gs` around
`saveApplicantReportPdf_`), rather than merging or cherry-picking the old branch wholesale.

**Going forward, this project has exactly one production line:**

```text
GitHub main -> Netlify production -> https://www.vanislandproperty.ca
```

Rules:

- Do not develop long-lived features on `network5`, `nightly5`, or any other non-`main` branch.
- Do not cherry-pick from old/stale branches without first auditing what else is on that branch and
  what it might collide with. Prefer a manual, reviewed integration over a raw cherry-pick when the
  branches have diverged for more than a trivial amount of history.
- A feature is not "done" until it is on `main`. Work sitting on any other branch, or only in an
  uncommitted working tree, should be treated as not shipped and at risk of being "lost" the same way
  Initial Screening Summary was.
- Stale branches (`network5`, `nightly5`, `nightly-5`, old `claude/*` worktree branches) are left
  untouched until Mabel explicitly confirms deletion. Auditing them is safe; deleting or merging them
  is not done automatically.

## 10. Regression Checklist

Run through this list before and after any change that touches applications, listings, or reports.

- [ ] Desktop admin entry point works
- [ ] Mobile admin entry point works
- [ ] Listing sorting is newest-first
- [ ] Listing Detail → Leads navigation carries the `listingId` filter
- [ ] Listing-based application isolation holds (trial/external users cannot see other listings' data)
- [ ] Initial Screening Summary can be generated, viewed, and downloaded
- [ ] Full Applicant Audit Report can be generated, viewed, and downloaded
- [ ] Supporting Documents fallback matching (record-level → listing-level) still works
- [ ] Report language follows the current UI language (not hardcoded to English)
- [ ] Reports save to `Tenant Screening Reports`, not Supporting Documents / Drive root / wrong listing
- [ ] Report status (Generated / Not generated / Drive save failed) persists correctly after a page refresh
- [ ] View / Download PDF actions work for both report types
- [ ] Trial/external access isolation holds (cannot view or generate reports for unauthorized listings)
- [ ] No fake "Saved" or "Generated" status is shown without a real Drive file + URL to back it up

## Files Changed This Round

New:

- `src/utils/applicantScreeningReports.js`
- `src/utils/applicantSupportDocuments.js`

Modified:

- `apps-script/Code.gs`
- `src/pages/admin/ApplicationReview.jsx`
- `src/pages/admin/Leads.jsx`
- `src/pages/admin/ListingDetail.jsx`
- `src/utils/storage.js`

## Known Gaps / Follow-ups (not done this round, flagged for a future round)

- `01_SYSTEM_ARCHITECTURE.md` and `02_OPERATIONS_MANUAL.md` still describe the pre-RC2 system (AI
  Draft Screening Report only) and have not been rewritten to include Initial Screening Summary, Full
  Applicant Audit Report, or the Strategy Assessment module. This document is the authoritative RC2
  reference in the meantime.
- `applicantScreeningReports.js` and `applicantSupportDocuments.js` (imported from the old `e37ee5b`
  branch) also contain a second, unused, OCR-based "Full Applicant Audit Report" implementation
  (`downloadFullApplicantAuditReport`). It is not wired into any page and should stay that way unless
  Mabel decides to replace the current Markdown-based Full Audit with it. It should eventually be
  deleted or clearly archived to avoid confusion.
- The "Suggested Follow-up Questions" panel on Application Review (`buildFollowUpQuestions()`) is
  still English-only regardless of UI language — same class of issue as the Screening Summary panel
  fixed this round, but out of scope until explicitly requested.
