# Vanisland AI Studio System Architecture V2.0

Last updated: 2026-07-06

This document describes the current Vanisland AI Studio / Rental AI Marketing Platform architecture as implemented in the local project.

## 1. System Overview

Vanisland AI Studio is a React/Vite single-page application hosted on Netlify. The backend is Google Apps Script. Structured data is stored in Google Sheets. Files, PDFs, photos, videos, and reports are stored in Google Drive.

High-level relationship:

```text
React / Netlify website
-> Google Apps Script Web App
-> Google Sheets
-> Google Drive
-> Reports / Emails
```

The system is intentionally lightweight and should stay low-risk. Do not introduce a new database, backend framework, or file storage system unless the business explicitly decides to migrate.

## 2. Main Components

Frontend:

- React + Vite
- Hosted on Netlify
- Routes in `src/App.jsx`
- API adapter in `src/utils/api.js`
- Storage adapter in `src/utils/storage.js`

Backend:

- Google Apps Script
- Main file: `apps-script/Code.gs`
- Exposes `doGet` and `doPost` actions
- Sends emails through `MailApp`
- Reads/writes Google Sheets
- Reads/writes Google Drive

Data stores:

- Rental workbook
- Property strategy assessment workbook
- Daily market brief workbook
- Google Drive listing folders

## 3. Core Runtime Configuration

Frontend configuration:

- `VITE_STUDIO_EXEC_URL`
  - Apps Script Web App `/exec` URL for the rental platform.
- `VITE_HOME_SALE_EXEC_URL`
  - Separate Apps Script endpoint for the home-sale side where configured.

Backend configuration:

- Spreadsheet IDs in `apps-script/Code.gs`
- Drive root IDs in `apps-script/Code.gs`
- Admin notification email in one backend config point:
  - `ADMIN_NOTIFICATION_EMAIL`

Do not hardcode the same company email in multiple places. If the admin notification destination changes, update only the single backend configuration point.

## 4. Apps Script Web App Deployment URL Mechanism

The website calls the Apps Script Web App deployment URL, not the Apps Script editor head directly.

Important rule:

- Editing and saving `apps-script/Code.gs` is not enough for production.
- If the frontend uses a Web App deployment `/exec` URL, backend changes require updating the existing Web App deployment.
- Do not create a new Web App URL unless intentionally migrating.
- Do not change execution user or access permission unless approved.

Current known production Web App URL from prior deployment work:

- `https://script.google.com/macros/s/AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0/exec`

This URL should be treated as operational configuration and verified before future deployment changes.

## 5. Single Source of Truth

Rental listing master:

- Google Sheet: `01 Listings`
- Used for rental listing data, owner/property fields, listing status, media links, Drive folder links, public link, video URL, and listing metadata.

Application master:

- Google Sheet: `07 Intake Records`
- Single source of truth for rental applications and applicant workflow.
- Do not create a second applicant master table.

Support document storage:

- Google Drive listing folder
- `Supporting Documents`
- Applicant-level folder when token upload flow is used

Screening report storage:

- Listing Drive folder
- `Tenant Screening Reports`

Strategy assessment storage:

- Dedicated strategy assessment sheet/workbook
- Not `07 Intake Records`, because strategy assessment is pre-listing landlord intake, not a tenant application.

Daily brief storage:

- Daily market brief Google Sheet
- Read by Apps Script and displayed on `/reports/daily-market-brief`

## 6. Main Data Flow

Rental listing flow:

```text
Admin creates listing
-> React form
-> Apps Script saveListing
-> Google Sheet 01 Listings
-> Google Drive listing folder / media folders
-> Public listing page
```

Rental application flow:

```text
Applicant opens /apply/:listingId
-> React form
-> Apps Script saveRentalApplication
-> Google Sheet 07 Intake Records
-> Google Drive application PDF
-> Applicant confirmation email
-> Admin notification email
```

Support document flow:

```text
Admin requests documents
-> Apps Script creates token and support folder
-> Applicant receives secure upload link
-> Applicant uploads files
-> Google Drive support folder
-> 07 Intake Records status update
-> Applicant confirmation email
-> Admin notification email
```

Screening report flow:

```text
Admin opens listing or application review
-> Initial Screening Summary or Full Applicant Audit
-> Apps Script / frontend report generator
-> Google Drive Tenant Screening Reports
-> 07 Intake Records report fields where applicable
-> PDF download / internal review
```

## 7. Email Notification Workflow

Email sender:

- `MailApp.sendEmail` in `apps-script/Code.gs`

Admin notification destination:

- `ADMIN_NOTIFICATION_EMAIL`

Applicant application confirmation:

- Triggered after successful rental application intake row is created.
- Email explains the application was received, admin will review, and staff will contact the applicant if more information is needed.

Admin application notification:

- Triggered after successful rental application submission.
- Includes applicant name, email, phone, property/listing address, submitted time, application ID, and admin link when available.

Applicant support document confirmation:

- Triggered after support document upload succeeds.
- Email explains supporting documents were received and will be reviewed.

Admin support document notification:

- Triggered after support document upload succeeds.
- Includes applicant name, email, phone when available, property/listing address, upload time, document list when safe, and application/admin link when available.

Failure behavior:

- Email failure must not block rental application submission.
- Email failure must not block support document upload success.
- Failures are logged with `Logger.log`.
- API responses can include `emailWarnings` for frontend/debug visibility.

## 8. AI Screening Workflow

Initial Screening Summary:

- Listing-level report.
- Generated from application form data.
- Entry points:
  - `/admin/listing/:id`
  - `/admin/leads?listingId=...`
- Frontend helper:
  - `src/utils/applicantScreeningReports.js`
- Save action:
  - `saveApplicantReportPdf`
- Stored in:
  - `Tenant Screening Reports`

Full Applicant Audit Report:

- Applicant-level report.
- Generated from application record plus support documents.
- Entry point:
  - `/admin/application/:recordId`
- Backend action:
  - `generateFullApplicantAuditReport`
- Stored in:
  - `Tenant Screening Reports`
- Status/Markdown saved back to:
  - `07 Intake Records`

Important distinction:

- Initial Screening Summary is listing-level.
- Full Applicant Audit Report is applicant-level.
- Do not rename or combine these workflows.

## 9. Listing Sort Helper

Shared helper:

- `src/utils/listingSort.js`

Admin newest-first sort:

- `sortListingsNewestFirst`
- Used by:
  - `src/pages/admin/Dashboard.jsx`
  - `src/pages/admin/Listings.jsx`

Public listing sort:

- `sortRentalListings`
- Keeps status-aware behavior for public rental listing pages.

Admin sort priority:

1. `updatedAt`, `lastModified`, `modifiedDate`, `modified`
2. `createdAt`, `createdDate`, `listingDate`
3. `availableDate`, `available`
4. Original order/date fallback when values cannot be parsed

Do not change closed/rented public listing behavior when fixing admin display order.

## 10. Security and Access Boundaries

Public applicants can:

- View public listings.
- Submit rental applications.
- Download their submitted PDF through tokenized download.
- Upload support documents through secure token/public website workflow.

Public applicants must not:

- See internal Google Drive folders.
- See admin notes.
- See other applicants.

Trial users can:

- Access approved module/listings only.
- Use permitted listing and marketing workflow features.

Trial users must not:

- Browse all applications.
- Open another listing's applicant records by guessing URLs.
- See internal Drive folders or sensitive report links.

Internal admin users can:

- View all listings and applications.
- Open internal Drive links where shown.
- Generate reports.
- Update statuses and notes.

## 11. Configuration That Must Not Be Duplicated

Do not hardcode multiple copies of:

- Admin notification email
- Apps Script deployment URL
- Spreadsheet IDs outside backend/config layer
- Drive root IDs outside backend/config layer
- Admin access code fallback
- Public listing status rules
- Support document allowed file rules

Preferred approach:

- Reuse existing helpers and config.
- Add one single config item only if absolutely necessary.

## 12. Modules That Should Not Be Casually Refactored

High-risk areas:

- `apps-script/Code.gs`
- `src/utils/storage.js`
- `src/utils/api.js`
- `src/utils/trialAccess.js`
- `src/utils/listingSort.js`
- `src/pages/RentalApplication.jsx`
- `src/pages/SupportDocuments.jsx`
- `src/pages/admin/ApplicationReview.jsx`
- `src/pages/admin/Leads.jsx`
- `src/pages/admin/ListingDetail.jsx`

Business data areas:

- `01 Listings`
- `07 Intake Records`
- `08 System Settings`
- `Contacts`
- Listing Google Drive folders
- Supporting document folders
- Tenant Screening Reports folders

Maintenance principle:

- Make the smallest safe change.
- Preserve existing sheet structure.
- Preserve existing Drive folder workflow.
- Preserve public/private access boundaries.
- Preserve email non-blocking behavior.
- Preserve applicant record integrity.

## 13. Production Maintenance Checklist

Before frontend release:

- Run `npm run build`.
- Confirm routes load locally or in preview.
- Confirm no public page exposes Drive links.

Before Apps Script release:

- Save latest `Code.gs`.
- Run syntax check.
- Update existing Web App deployment if backend behavior changed.
- Do not change Web App URL or permissions unless approved.

After deployment:

- Test application submission if safe.
- Test support document upload if safe.
- Confirm email warnings do not block success.
- Confirm admin listing sort newest-first.
- Confirm public listing detail pages still work.

