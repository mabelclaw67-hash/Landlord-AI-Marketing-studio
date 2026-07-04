# Landlord AI Marketing Studio Developer Handbook

## Architecture Rules

### Single Source of Truth

`07 Intake Records` is the application master database. Do not create another applicant database. All application workflow status, supporting document status, screening report metadata, and data retention metadata must stay on the same intake row.

### Minimal Complexity

Use the existing React frontend, Apps Script backend, Google Sheets, and Google Drive workflow. Do not introduce new infrastructure unless Mabel explicitly approves it.

### No Duplicate Databases

Do not copy applicant records into a new table, new Sheet, or new local database. If a new field is needed, add a column to `07 Intake Records` through Apps Script header management.

### Reuse Existing Sheets Whenever Possible

Use the current workbook and sheet structure:

- `01 Listings`
- `07 Intake Records`
- `Contacts`
- `08 System Settings`
- `Website Reports`
- Daily Market Brief workbook tabs
- Home Sale workbook tabs

## Security Rules

Google Drive is internal storage only.

Applicants must never see:

- Drive folder links
- Drive preview pages
- Drive file URLs

Trial Users must never see:

- Support document folder URLs
- Screening report Drive URLs
- Application PDF Drive URLs
- Listing Drive folder links
- Direct Drive photo/video links

All applicant-facing uploads and downloads must go through secure website endpoints with token validation.

## User Roles

### Owner

Internal user with Admin-level access. Can see internal Drive links, manage applications, request documents, generate draft reports, and perform retention operations.

### Admin

Internal staff role unlocked by admin access code. Can manage listings, leads, applications, supporting documents, screening reports, retention actions, and internal Drive files.

### Trial User

External trial user approved through the `Contacts` sheet. Can access only approved modules and should see webpage previews/statuses, not internal Drive links. Default trial duration is 10 days.

### Applicant

Public applicant. Can view published listings, submit applications, download their submitted PDF by token, and upload supporting documents by token after request. Cannot access admin pages or internal Drive links.

## Trial User Rules

- Default expiry = 10 days.
- Expiry is stored in `Contacts` as `Access Expires At`.
- Frontend `readTrialAccess()` clears expired localStorage sessions.
- Backend `validateAccessCode_()` rejects expired access codes.
- Expired Trial Users lose access to admin workspace routes and must log in again.
- Trial access must not be treated as Admin access.

## Supporting Documents Rules

- Supporting document upload must be requested by Admin/Owner first.
- Public listing pages must not show supporting document upload actions.
- Public application form must not include document upload.
- Upload route: `/support-documents/:listingId/:recordId`.
- Token must be present and valid.
- Upload token expiry: 14 days.
- Expired token message:

```text
This link has expired. Please contact property management.
```

Uploaded files are saved into:

```text
{Listing Drive Folder}/Supporting Documents/{Record ID} - {Applicant Name}
```

File naming pattern:

```text
{Category} - {Applicant Name} - {originalFilename}
```

## AI Draft Screening Rules

- AI draft screening reports are internal drafts only.
- Never auto-approve applicants.
- Never auto-decline applicants.
- Never make a final legal, credit, or tenancy decision.
- Human review is required before any decision.
- Screening report Drive URLs are Admin/Owner only.
- Trial Users may see report content rendered inside the admin page if allowed by the current UI, but not the internal Drive URL.
- Applicants must never see screening report content or URLs.

## Data Retention Rules

Retention standards:

- Incomplete application: 60 days
- Withdrawn application: 90 days
- Declined / Not selected: 180 days
- Approved but not signed: 180 days
- Signed tenant: archive to tenant file, do not delete

V1.5 retention cleanup is manual:

- `cleanupExpiredApplicationsPreview()` previews expired records only.
- `deleteExpiredApplicantSensitiveFiles(recordId)` requires Admin/Owner and manual confirmation.
- Do not delete application rows.
- Keep audit metadata in `07 Intake Records`.

## Deployment Rules

### Apps Script Deployment Process

1. Edit `apps-script/Code.gs` locally first.
2. Copy the full local `Code.gs` into the live Apps Script project.
3. Save in Apps Script.
4. Deploy a new Apps Script version only when backend behavior changed.
5. Confirm the deployment URL if the web app URL changes.
6. Update Netlify environment variables only if the deployment URL changed.

Do not redeploy Apps Script for frontend-only changes.

### GitHub Workflow

1. Confirm the exact project folder:

```text
/Users/mabelchen/Mabel Project/04_landlord-ai-marketing-studio
```

2. Run `git status`.
3. Review changed files.
4. Build locally when code changes:

```bash
npm run build
```

5. Commit with a clear message.
6. Push to `origin main` only when Mabel approves.

### Branch Discipline

This project maintains exactly one production line:

```text
GitHub main -> Netlify production -> https://www.vanislandproperty.ca
```

- Do not build long-lived features on any branch other than `main` (e.g. `network5`, `nightly5`,
  personal/topic branches). Treat those as temporary or historical only.
- A feature is not considered shipped until it is committed on `main`. Work left on another branch, or
  only in an uncommitted working tree, can effectively disappear from view even though it still exists
  in git history — this happened once already (see `docs/RC2-Development-Summary.md`, Section 9) when
  Initial Screening Summary was built on a branch that was never merged into `main`.
- Before cherry-picking or merging an old branch, audit what else is on it (`git log --oneline
  main..<branch>`, `git diff --stat main <branch>`). Prefer a manual, reviewed integration over a raw
  cherry-pick if the branch has diverged significantly, to avoid silently reintroducing abandoned or
  colliding code.
- Do not delete branches without Mabel's explicit confirmation, even ones that appear stale.

### Netlify Workflow

Netlify deploys from GitHub automatically. Do not manually deploy Netlify unless Mabel specifically requests it.

Expected production flow:

```text
Local changes
-> git commit
-> git push origin main
-> Netlify automatic build
-> Netlify production deploy
```

## Important Files

- `apps-script/Code.gs`: main rental Apps Script backend
- `apps-script/HomeSaleStudioRead.gs`: supporting Apps Script source for home sale reads
- `src/App.jsx`: frontend routes
- `src/utils/storage.js`: rental API adapter
- `src/utils/homeSaleSheet.js`: home sale API adapter and sheet mapping
- `src/utils/trialAccess.js`: Trial/Admin session helpers
- `src/pages/RentalApplication.jsx`: public application form
- `src/pages/SupportDocuments.jsx`: secure document upload page
- `src/pages/admin/ApplicationReview.jsx`: admin application workflow
- `src/pages/admin/Leads.jsx`: application lead dashboard
- `src/pages/PublicListing.jsx`: public rental listing page
- `src/pages/PublicVideoPage.jsx`: public video page

## Copy-Paste Safety

Keep Apps Script changes simple and copy-paste-safe. Avoid partial snippets for large script replacement unless the exact insertion point is clear. Prefer replacing the full `Code.gs` when Mabel is updating the live Apps Script manually.
