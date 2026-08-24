# Production Baseline

## Current production

- Git main: `1e94d24026146b4b50ebf4784e4f176bf3f67710`
- Apps Script version: `117`
- Production deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
- Production and Git were verified file-by-file as identical.
- No production/source fork exists.
- Baseline recorded: `2026-08-23 22:35:55 PDT`

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

- Git SHA: `1e94d24026146b4b50ebf4784e4f176bf3f67710`
- Apps Script version: `117`
- Deployment ID: `AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
- Major change: reconciled production v116 Limited access behavior while preserving the Applicant Sensitive Data architecture.
- Verification: 18 Apps Script files matched the Git commit file-by-file; static syntax checks, core path checks, and synthetic unit tests passed. Real Drive/Sheet runtime regression was not executed because production access permissions were insufficient.
