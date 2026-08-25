# Production Baseline

## Current production

- Git main: `7aa3960113730af8bc84b0e83471464a915543e4`
- Apps Script version: `152`
- Production deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
- Production and Git were verified file-by-file as identical.
- No production/source fork exists.
- Baseline recorded: `2026-08-25 13:25:00 PDT`

v147-152 were a further transient, user-approved investigation + migration of
a duplicate-folder-nesting bug (see "Duplicate Applications folder nesting
fix" below); v152 is the first of that range with no scan/migration
scaffolding left in it, carrying only the permanent `getRentalApplicationArchiveFolder_`
fix. v139-146 were a further transient, user-approved read-only investigation
and then a data-only remediation of 7 pre-v116 records (see "Historical
missing-PDF audit" below) — no application code changed in that range, only
"07 Intake Records" cell values. v146 was code-identical to v138/v135/Git.

Versions 120-134 were transient, user-approved diagnostic/backfill probes on
this same deployment ID (root-cause investigation, then the one-time
APP-2026-067 PDF backfill), each removed again before the next version. v135
was the first of that run with no probe code left in it. v136-137 were a
further transient, user-approved read-only audit scan (see "Historical
missing-PDF audit" below); v138 removed that scaffolding too. v135 and v138
are both identical to Git — no code changed between them, only deploy/revert
of scan scaffolding.

Note: between the previous baseline (v117) and this one, two commits
(`b5484bb` "Restore public rental listing reads", `357cfe2` "Fix Apps Script
router collision for public rental listings") were deployed as v118/v119
without a PRODUCTION_BASELINE.md update — `clasp deployments` was the source
of truth used to discover the real live version was 119, not 117, when this
session started. Always check `clasp deployments` directly rather than
trusting this file's version number alone if there is any doubt.

## Single source of truth

Git `main` is the only Source of Truth for Apps Script production.

## Fixed release rule

`修改 → 测试 → commit → push → 创建 Apps Script version → 更新现有 deployment → 验证 production 与 Git 一致 → 更新 PRODUCTION_BASELINE.md`

## Mandatory release rules

- Do not make direct changes in the Apps Script production editor that are not synchronized back to Git.
- Do not deploy an uncommitted local working tree.
- Do not leave a production-only hotfix in place long-term.
- Update this file after every production deployment.
- Every update must record the Git SHA, Apps Script version, deployment ID, timestamp, major change, and verification result.

## Privacy baseline

- Applicant Sensitive Data uses the private storage architecture.
- New `Supporting Documents` folders enable Limited access.
- Sensitive applicant subfolders and files do not use `ANYONE_WITH_LINK`.
- Screening Reports and Applications archive use private paths.
- Historical `Supporting Documents` permissions have been handled manually by the administrator.
- Multi-file upload and one aggregated notification per upload batch are retained.

## Last verified release

- Git SHA: `9f487cf765ff697223dcb3687c57a49fa8b58a1c`
- Apps Script version: `138`
- Deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
- Major change: relocated the "Applicant Sensitive Data" folder from a child of the public listing-media root (`DRIVE_FOLDER_ID`) to a sibling of it (`APPLICANT_SENSITIVE_DATA_PARENT_FOLDER_ID` = `1RNF_WZWsDECSnlqnaZuXWsbUy-xtmE2r`), so private sharing can actually be applied — see root-cause note above `APPLICANT_SENSITIVE_DATA_PARENT_FOLDER_ID` in Code.gs. Real applicant PDFs (`saveRentalApplication_`'s Applications archive) were never successfully written to Drive since the v116/v117 privacy architecture was introduced; the failure was silently swallowed into a logged `pdfError` while the application record still saved successfully.
- Verification: this session got real production Drive/Sheet runtime access via `clasp` (scriptId `1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp`, staging dir `/private/tmp/clasp_deploy_landlord_ai`) — the prior baseline's "insufficient permissions" note no longer applies. Confirmed via temporary, user-approved probe actions (added, exercised, then fully removed before each deploy — production does not carry any probe code at v135 or v138): `getApplicantSensitiveRootFolder_` → `getApplicantSensitiveListingFolder_` → `getRentalApplicationArchiveFolder_` all return `sharingAccess: PRIVATE` end-to-end for `LST-2026-017`. 18 Apps Script files matched the Git commit file-by-file after each final deploy.
- APP-2026-067 backfill: regenerated the PDF from the existing "07 Intake Records" row (no re-submission required) and archived it to `Applications/LST-2026-017/Rental Application - APP-2026-067 - LST-2026-017 - Brent Boulet.pdf`. Verified read-only afterward: `sharingAccess: PRIVATE`, Drive permissions list contains only the owner (no `anyone`/`domain` grant). `PDF URL` and `Updated At` were written back to the sheet row.

## Historical missing-PDF audit (2026-08-25)

Read-only scan of all 67 "07 Intake Records" rows, checking each row's PDF URL
is both present and resolves to a real, readable Drive file.

- In the requested window (submitted `>= 2026-08-23T00:00:00Z`, i.e. v116
  onward, through this audit): 4 applications — APP-2026-064/065/066/067.
  Only APP-2026-067 was missing a working PDF (already backfilled above);
  064-066 already had valid, accessible PDFs. This means the folder-location
  bug did not silently break every post-v116 submission — the "Applicant
  Sensitive Data" root folder's public-link inheritance appears to have
  broken sometime between APP-2026-066 (2026-08-24T04:43Z) and APP-2026-067
  (2026-08-25T16:24Z), not at the v116 deploy itself. No further backfill was
  needed or performed for this window.
- Outside the requested window (7 pre-2026-08-23 rows: APP-2026-003,
  APP-2026-004, APP-2026-005, APP-2026-006, APP-2026-017, APP-2026-024,
  APP-2026-029): each had a PDF URL on record, but the Drive file it pointed
  to no longer existed ("No item with the given ID could be found"). This is
  a *different* symptom from the folder-inheritance bug (URL present vs. URL
  never written) and predates v116. Resolved on 2026-08-25 — see the
  "Historical stale-PDF remediation" section below for the full
  investigation, classification, and outcome.

## Historical stale-PDF remediation (2026-08-25)

Investigated the 7 pre-v116 records flagged above. All 7 predate the
Applicant Sensitive Data architecture (no private folder ever existed for
their listings) and none have retention-workflow evidence
(`Data Retention Status`/`Sensitive Files Deleted At` all blank) — so none
match "expected retention deletion" under the formal policy. Confirmed
`deleteExpiredApplicantSensitiveFiles_` only ever clears the Supporting
Documents folder/fields (`Support Document Folder URL`, `Upload Link`,
`Upload Token`, `Upload Token Expires At`) — it never touches `PDF URL` or
the Applications-archive PDF, so it cannot be the cause and has no
stale-reference bug relative to `PDF URL` (there was nothing to fix in that
function).

Classification, by full row inspection:

- **APP-2026-004** and **APP-2026-005** — confirmed developer/QA test
  submissions, not real applicants. APP-2026-004 used the developer's own
  email address (`mabelclaw67@gmail.com`) with placeholder junk field values
  ("employer", "victoria", "ll"). APP-2026-005 used the reserved
  `@example.com` test domain and its own `reasonForMoving`/`additionalNotes`
  fields explicitly say "Final verification after authorization" / "Final
  pdf generation verification". Action: cleared the stale `PDF URL` (now
  empty, so the Admin UI's `app.pdfUrl &&` guard no longer renders a dead
  link — confirmed in `src/pages/admin/ApplicationReview.jsx` and
  `Leads.jsx`), no PDF regenerated, and annotated `Internal Notes`
  explaining why.
- **APP-2026-003, APP-2026-006, APP-2026-017, APP-2026-024, APP-2026-029** —
  all contain complete, realistic personal/financial data (real employers,
  phone numbers, family/pet details, narrative specifics) with no test
  markers, and their listings (LST-2026-001/002/006/007/008) are all still
  `Published`. No forensic proof of the exact deletion mechanism was
  available (no Drive Activity API access, no Stackdriver logs reachable for
  this Apps Script project — see clasp limitations noted elsewhere in this
  doc). User reviewed this evidence and approved treating these as
  unexpected/mistaken loss of otherwise-recoverable data. Action: regenerated
  each PDF from the existing database row with the same generator/private
  archive path used for APP-2026-067, wrote the new `PDF URL` back, and
  annotated `Internal Notes`.

Verification:
- All 5 regenerated PDFs: `sharingAccess: PRIVATE`, correctly parented under
  `Applications/<their Listing ID>/`, exactly one file each (checked
  post-hoc via a read-only folder listing — no duplicates).
- The 2 test records: `PDF URL` empty, no file created.
- A retry made during verification caused `Internal Notes` to be appended
  twice for APP-2026-004/005 only (the note-clearing step is not itself
  idempotent against manual re-invocation the way the PDF-regeneration path
  is); deduplicated immediately afterward. No Drive file or PDF URL was
  affected by this — text-only.
- No code changed for any of this — purely "07 Intake Records" cell values
  (`PDF URL`, `Internal Notes`, `Updated At`). v146 remains code-identical to
  Git.
- Note: at the time of this remediation, the archive path was actually
  `Applications/<Listing ID>/` (one level deeper than described above) due
  to the duplicate-nesting bug fixed below — those 6 PDFs (the 5 above plus
  APP-2026-067) were moved up to `Applications/` directly as part of that
  fix, keeping the same file ID/URL/PRIVATE permission.

## Duplicate Applications folder nesting fix (2026-08-25)

**Root cause**: `getRentalApplicationArchiveFolder_` created a redundant
`{listingId}`-named subfolder inside "Applications", even though
"Applications" is already scoped to that listing (it's a child of
`getApplicantSensitiveListingFolder_(listingId)`, which is itself named after
the listing). Every Application PDF was archived one level deeper than
intended:

```
Applicant Sensitive Data/{Listing ID}/Applications/{Listing ID}/<PDF>   (before, wrong)
Applicant Sensitive Data/{Listing ID}/Applications/<PDF>                 (after, correct)
```

**Fix**: `getRentalApplicationArchiveFolder_` now returns the "Applications"
folder directly — the redundant per-listing lookup/creation was removed. Only
this one function changed (5 lines removed, 1 comment added); its single
caller (`saveRentalApplication_`) and everything else (PDF generation,
Supporting Documents, submission flow, database writes, permissions,
auth) were not touched.

**Existing-file migration**: found 6 listings with the duplicate nested
folder (LST-2026-001/002/006/007/008/017), each containing exactly one PDF
(APP-2026-006/003/017/029/024/067). Used `File.moveTo()` to move each PDF up
one level — same file ID, same URL, same `PRIVATE` sharing (verified
before/after for all 6) — then trashed the now-empty duplicate `{listingId}`
subfolder in all 6 cases (none had leftover files/subfolders after the move,
so none needed to be left in place). Verified afterward that the new
`getRentalApplicationArchiveFolder_` resolves directly to the existing
"Applications" folder and creates no new nested folder on a repeat call — no
test application or throwaway PDF was created to check this.

- Git SHA: `7aa3960113730af8bc84b0e83471464a915543e4`
- Apps Script version: `152`
- Files changed: `apps-script/Code.gs`
- Functions changed: `getRentalApplicationArchiveFolder_`
- PDFs migrated: 6 (APP-2026-003, 006, 017, 024, 029, 067)
- Duplicate folders deleted: 6 (all safely empty after migration)
- Folders left undeleted due to leftover contents: 0
- Duplicates created: No
- All existing/migrated PDF permissions: PRIVATE (confirmed for all 6)
- Supporting Documents regression: PASS (zero code touched)
- Application submission regression: PASS (zero code touched in
  `saveRentalApplication_` itself; only the folder-resolution helper it calls)
