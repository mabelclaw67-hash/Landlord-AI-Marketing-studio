# Production Baseline

## Current production

- Git main: `9f487cf765ff697223dcb3687c57a49fa8b58a1c`
- Apps Script version: `138`
- Production deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
- Production and Git were verified file-by-file as identical.
- No production/source fork exists.
- Baseline recorded: `2026-08-25 12:35:00 PDT`

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
  APP-2026-029): each has a PDF URL on record, but the Drive file it points
  to no longer exists ("No item with the given ID could be found"). This is
  a *different* symptom from the folder-inheritance bug (URL present vs. URL
  never written) and predates v116, so it is out of scope for this fix and
  was intentionally left untouched — it may be the result of the existing
  data-retention cleanup path (`deleteExpiredApplicantSensitiveFiles_`) or a
  pre-privacy-architecture folder restructuring, not this bug. Flagged here
  for awareness; no action taken.
