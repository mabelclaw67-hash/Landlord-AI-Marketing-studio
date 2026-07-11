# Landlord AI Marketing Studio System Architecture

## Executive Summary

Landlord AI Marketing Studio is a React and Vite web platform backed by Google Apps Script, Google Sheets, and Google Drive. The public website lets applicants view rental listings and submit rental applications. The admin workspace lets property managers create listings, review applications, request supporting documents, generate internal AI draft screening reports, and manage retention status.

The system is intentionally lightweight: Netlify hosts the frontend, Apps Script provides backend endpoints, Google Sheets stores structured records, and Google Drive stores internal files. The application master database is the existing `07 Intake Records` sheet. Applicant data must not be duplicated into another applicant database.

## Business Purpose

The platform supports Vanisland Property Management workflows for rental marketing, applicant intake, document collection, internal screening preparation, and staff review. It also includes a home sale marketing workspace for property sale listings, media, marketing copy, videos, buyer inquiries, and sharing tools.

## Core Modules

### Listing Management

Rental listings are stored in the main workbook sheet `01 Listings`. Admin users create and update rental listings from the admin dashboard. Public listing pages read only published listing data. Each listing may have a `Drive Folder Link`, which is the property folder source for listing media and supporting document folders.

### Lead Management

Rental application leads are read from `07 Intake Records` and displayed in `/admin/leads`. Contact and trial access requests are stored in the `Contacts` sheet.

### Rental Applications

Applicants use `/apply/:listingId`. Submissions are sent to Apps Script through `saveRentalApplication` and written into `07 Intake Records`. The submitted application PDF is saved internally to Google Drive, with its internal PDF URL stored in the same intake row. Applicant-facing downloads use a secure token endpoint instead of exposing Drive preview links.

### Supporting Documents

Admin users request supporting documents from an application review page. Apps Script generates an upload token, creates or reuses a folder under the listing's property Drive folder, writes the secure upload link and folder metadata back to `07 Intake Records`, and sends the applicant an email. Applicants upload through `/support-documents/:listingId/:recordId?token=...`.

### AI Draft Screening Reports

After documents are uploaded, admin users can generate an internal draft screening report. The report is saved to Drive internally and its Markdown content is also stored in `07 Intake Records` so it can be displayed inside the admin application review page without exposing the Drive report link to Trial Users.

### Google Drive Storage

Google Drive is internal storage only. It stores listing media, submitted application PDFs, supporting documents, video outputs, enhanced photos, cover images, virtual staging output, and screening reports. Public applicants and Trial Users must not be given direct Drive folder links, Drive file URLs, or Drive preview pages.

### Google Sheets Database

Google Sheets is the structured data layer. The rental workflow uses spreadsheet ID `1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4`. The home sale workflow uses spreadsheet ID `1z-pCCkJt0XcLmbzPL8ZDKw8fEmLNPc9X7CpRj7FspxQ`. Daily market brief content uses spreadsheet ID `1kmV7FdBX6S06lGIZy3HveryolVbeMsC0pDXrWn4BcC8`.

### Apps Script Backend

The rental backend is `apps-script/Code.gs`. It exposes `doGet` and `doPost` actions for listings, contacts, applications, supporting documents, screening reports, retention, daily market brief, and website reports. The frontend calls these endpoints through `src/utils/api.js` and `src/utils/storage.js`.

### Netlify Frontend

The frontend is a React SPA hosted on Netlify. Routes are defined in `src/App.jsx`. Netlify builds from GitHub with `npm run build` and publishes `dist/`. Apps Script deployments are separate from Netlify deployments.

## System Data Flow

```text
Public Listing
-> Rental Application
-> 07 Intake Records
-> Request Supporting Documents
-> Secure Upload
-> Google Drive Storage
-> AI Draft Screening Report
-> Property Manager Review
```

## Database Structure

### Main Rental Workbook

Spreadsheet ID: `1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4`

#### `01 Listings`

Purpose: rental listing master sheet.

Important fields include:

- `Listing ID`
- `Created Date`
- `Owner Name`
- `Owner Email`
- `Property Address`
- `City`
- `Province`
- `Bedrooms`
- `Bathrooms`
- `Rent`
- `Available Date`
- `Lease Term`
- `Utilities`
- `Pet Policy`
- `Parking`
- `Laundry`
- `Smoking Policy`
- `Key Features`
- `Target Audience`
- `Language`
- `Platforms`
- `Workflow Status`
- `Drive Folder Link`
- `Final Package Link`
- `Published Link`
- `Listing Status`
- `Open House Date / Time`
- `Open House Viewing Instructions`
- `Open House Parking Notes`
- `Outputs`
- `Media Checklist`
- `Drive Files`
- `Enhanced Folder ID`
- `videoUrl`
- `publicVideoUrl`
- `Cover Image File ID`
- `Created By Email`
- `Created By Access Code`
- `Created By Role`

The `Drive Folder Link` field is the source of truth for the listing's property Drive folder.

#### `07 Intake Records`

Purpose: application master database and single source of truth for applicant workflow.

Core fields include:

- `Record ID`
- `Listing ID`
- `Submitted At`
- `Applicant Name`
- `Email`
- `Phone`
- `Date of Birth`
- `Current Address`
- `Employment Status`
- `Employer`
- `Monthly Income`
- `Landlord Reference`
- `Credit History`
- `Move-in Date`
- `Occupants`
- `Has Joint Applicant`
- `Deposit Funds Available`
- `Has Pets`
- `Eviction History`
- `Smokes Vapes Cannabis`
- `Proof of Income`
- `Has Tenant Insurance`
- `Reason for Moving`
- `Additional Notes`
- `PDF URL`
- `Application Download Token`
- `Application Download Expires At`
- `Review Status`
- `Internal Notes`
- `Updated At`
- `Shortlist Status`
- `Document Request Sent`
- `Document Request Sent At`
- `Upload Token`
- `Upload Token Expires At`
- `Upload Link`
- `Support Document Folder URL`
- `Document Upload Status`
- `Uploaded File Count`
- `Last Upload At`
- `Screening Report Status`
- `Screening Report Generated At`
- `Screening Report URL`
- `Screening Report Markdown`
- `Data Retention Status`
- `Retention Expiry Date`
- `Retention Action`
- `Retention Notes`
- `Sensitive Files Deleted At`
- `Archived Tenant File URL`

#### `Contacts`

Purpose: website contact requests and trial access requests.

Fields include:

- `Name`
- `Email`
- `Phone`
- `WeChat ID`
- `City`
- `Service Interest`
- `Message`
- `Submitted At`
- `Approval Status`
- `Approved Module`
- `Access Type`
- `Payment Status`
- `Access Code`
- `Approved At`
- `Access Expires At`
- `Approval Email Sent At`
- `Admin Notes`

#### `08 System Settings`

Purpose: stores admin settings, including the admin access code. `Code.gs` does not use a hardcoded admin fallback.

#### `Website Reports`

Purpose: stores website report data used by `/reports/:reportId`.

### Daily Market Brief Workbook

Spreadsheet ID: `1kmV7FdBX6S06lGIZy3HveryolVbeMsC0pDXrWn4BcC8`

Sheets used by `apps-script/Code.gs`:

- `01 Daily Market Brief`
- `02 Config`
- `03 Sync Log`

### Home Sale Workbook

Spreadsheet ID: `1z-pCCkJt0XcLmbzPL8ZDKw8fEmLNPc9X7CpRj7FspxQ`

Configured tabs:

- `01 Sale Listings`
- `02 Media Assets`
- `03 Marketing Copy`
- `05 Video Scripts`

The frontend integration is in `src/utils/homeSaleSheet.js` and uses a separate `VITE_HOME_SALE_EXEC_URL`.

## Google Drive Structure

Main rental Drive root ID in `apps-script/Code.gs`: `1NeilrEpNtuwNkru9xNTWDmZ_LL3jIqWD`

Observed folder structure:

```text
Rental Drive Root
└── {Listing ID} - {Property Address} - Media
    ├── 02_AI_Enhanced_Photos
    ├── 03_Cover_Images
    ├── 04_Video_Output
    └── Supporting Documents
        └── {Record ID} - {Applicant Name}
            ├── Government Photo ID - {Applicant Name} - {originalFilename}
            ├── Income Proof / Pay Stubs - {Applicant Name} - {originalFilename}
            └── AI Draft Tenant Screening Report files
```

The exact property folder source is the listing row's `Drive Folder Link` in `01 Listings`.

## Security Architecture

### Applicant

Applicants can view public listing pages, submit rental applications, download their submitted application through a token endpoint, and upload supporting documents through a token-protected website route. Applicants must not see internal Drive links.

### Trial User

Trial Users access the admin workspace through approved access codes stored in `Contacts`. Default expiry is 10 days. Trial Users can access only their approved module and their own listing data as enforced by frontend session logic and backend access validation. Trial Users must not see Google Drive links, support document folder links, or screening report Drive URLs.

### Admin

Admins unlock the admin workspace with the admin access code. Admins can manage listings, applications, supporting documents, screening reports, retention actions, and internal Drive links.

### Owner

Owner-level access is treated as internal/admin-level access for Drive visibility and operational review. Owner/Admin users may see internal Drive links that are hidden from Trial Users and applicants.

## Data Retention Policy

- Incomplete application: 60 days
- Withdrawn application: 90 days
- Declined / Not selected: 180 days
- Approved but not signed: 180 days
- Signed tenant: archive to tenant file, do not delete sensitive files

V1.5 does not delete files automatically. Admin users must explicitly confirm manual cleanup.

## Token Security

- Application Download Token: 7 days
- Supporting Document Upload Token: 14 days

Expired token message:

```text
This link has expired. Please contact property management.
```

## Single Source of Truth

`07 Intake Records` is the application master database. Do not create duplicate applicant databases. Application status, document request status, upload status, screening report status, retention status, and related audit fields must remain on the same intake row.
