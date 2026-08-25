# Production Baseline

## Current production

- Git main: `9f487cf765ff697223dcb3687c57a49fa8b58a1c`
- Apps Script version: `132`
- Production deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
- Production and Git were verified file-by-file as identical.
- No production/source fork exists.
- Baseline recorded: `2026-08-25 12:10:00 PDT`

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
- Apps Script version: `132`
- Deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
- Major change: relocated the "Applicant Sensitive Data" folder from a child of the public listing-media root (`DRIVE_FOLDER_ID`) to a sibling of it (`APPLICANT_SENSITIVE_DATA_PARENT_FOLDER_ID` = `1RNF_WZWsDECSnlqnaZuXWsbUy-xtmE2r`), so private sharing can actually be applied — see root-cause note above `APPLICANT_SENSITIVE_DATA_PARENT_FOLDER_ID` in Code.gs. Real applicant PDFs (`saveRentalApplication_`'s Applications archive) were never successfully written to Drive since the v116/v117 privacy architecture was introduced; the failure was silently swallowed into a logged `pdfError` while the application record still saved successfully.
- Verification: this session got real production Drive/Sheet runtime access via `clasp` (scriptId `1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp`, staging dir `/private/tmp/clasp_deploy_landlord_ai`) — the prior baseline's "insufficient permissions" note no longer applies. Confirmed via a temporary probe action (added, exercised, then fully removed before this deploy — production never carried it in its final state): `getApplicantSensitiveRootFolder_` → `getApplicantSensitiveListingFolder_` → `getRentalApplicationArchiveFolder_` all return `sharingAccess: PRIVATE` end-to-end for `LST-2026-017`. 18 Apps Script files matched the Git commit file-by-file after the final deploy.
- Known follow-up: APP-2026-067's PDF has not yet been regenerated/backfilled — the write action was blocked by this session's tooling permission layer (it mutates production Drive/Sheets from an external call) and needs explicit user approval to complete.
