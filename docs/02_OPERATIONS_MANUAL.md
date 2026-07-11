# Landlord AI Marketing Studio Operations Manual

## Listing Workflow

### Create Listing

1. Go to `/admin`.
2. Log in as Admin/Owner, or use an approved Trial access code for the correct module.
3. For rental listings, open `/admin/new`.
4. Enter the property details, owner information, rent, availability, policies, features, language, and platform outputs.
5. Confirm the listing has a `Listing ID`.
6. Save the listing. The record is written to `01 Listings`.

### Publish Listing

1. Open `/admin/listings`.
2. Select the listing.
3. Review the generated copy, compliance notes, media, open house information, and public listing status.
4. Set the public listing status/workflow status as appropriate.
5. Confirm the public route opens at `/listings/:id`.
6. Do not add document upload links to the public listing page.

### Manage Photos

1. Confirm the listing row has a valid `Drive Folder Link`.
2. Open the listing media tools from the admin listing detail page.
3. Load photos from the listing Drive folder.
4. Select cover images, generate cover collages, or run light enhancement as needed.
5. Keep original Drive files unchanged.
6. Trial Users should preview images inside the webpage only. Admin/Owner users may open internal Drive folders.

### Manage Videos

1. Open the listing video workflow from the admin listing detail page.
2. Generate or update video script content.
3. Save generated video output to `04_Video_Output` under the listing Drive folder.
4. Publish only website-safe playback URLs to public pages.
5. Do not expose direct Google Drive video URLs to public applicants or Trial Users.

## Application Workflow

### Receive Application

1. Applicant opens a public listing.
2. Applicant clicks Apply Now and submits `/apply/:listingId`.
3. Apps Script writes the application into `07 Intake Records`.
4. Apps Script saves the submitted PDF internally to Google Drive.
5. The intake row stores the internal `PDF URL`, `Application Download Token`, and `Application Download Expires At`.
6. Applicant-facing PDF download uses the website endpoint, not a Drive preview page.

### Review Application

1. Staff opens `/admin/leads`.
2. Select the application row.
3. Open `/admin/application/:recordId`.
4. Review applicant information, employment/income, landlord reference, move-in details, pets, smoking, tenant insurance, and rule-based screening notes.
5. Update manual review status if needed.

### Shortlist Applicant

1. Confirm applicant email exists.
2. Confirm `Listing ID` exists.
3. Confirm the matching listing has a `Drive Folder Link`.
4. Open the application review page.
5. Click `Request Supporting Documents`.
6. Confirm before sending.

### Request Supporting Documents

The system will:

1. Set `Shortlist Status` to `Shortlisted`.
2. Generate an upload token.
3. Set `Upload Token Expires At` to 14 days from generation.
4. Generate a website upload link.
5. Create or reuse `Supporting Documents` inside the listing property folder.
6. Create or reuse `{Record ID} - {Applicant Name}` inside `Supporting Documents`.
7. Save `Support Document Folder URL`, `Upload Token`, `Upload Link`, `Document Request Sent`, `Document Request Sent At`, and `Document Upload Status`.
8. Send the applicant an email with the secure upload link.

## Screening Workflow

### Review Uploaded Documents

1. Wait until `Document Upload Status` is `Uploaded` or `Complete`.
2. Review `Uploaded File Count` and `Last Upload At`.
3. Admin/Owner users may open the internal support folder.
4. Trial Users should see status and count only, not Drive links.

### Generate AI Draft Screening Report

1. Open the application review page.
2. Confirm `Document Upload Status` is `Uploaded` or `Complete`.
3. Confirm `Support Document Folder URL` exists.
4. Click `Generate AI Draft Screening Report`.
5. Review the generated draft inside the application review page.
6. The report is saved internally to Drive and also stored as Markdown in `07 Intake Records`.

### Manual Review

1. Read the AI draft as an internal aid only.
2. Verify all applicant information manually.
3. Check documents against the original application.
4. Do not use the AI draft as a final approval, rejection, legal opinion, or credit decision.

### Request Clarifications

Use the report's follow-up questions and the application details to ask practical clarification questions. Record important notes in the internal notes field.

## Approval Workflow

### Conditional Approval

1. Confirm application details and supporting documents are complete enough for manual review.
2. Confirm rent, move-in date, lease term, occupants, pets, smoking, and tenant insurance requirements.
3. Communicate any conditions clearly to the applicant.
4. Keep internal notes in the application row.

### Deposit Collection

1. Confirm deposit amount and due date.
2. Confirm payment instructions with the applicant.
3. Record the payment status in the appropriate internal finance workflow outside this applicant intake documentation.

### Lease Preparation

1. Prepare lease package only after manual approval.
2. Do not connect DocuSign or lease automation until that feature is intentionally added.
3. Verify tenant names, unit address, rent, deposits, dates, and addenda manually.

### Move-in Coordination

1. Confirm tenant insurance.
2. Confirm move-in date and key handoff.
3. Confirm condition inspection requirements.
4. Archive the applicant as a signed tenant when the tenancy is complete and signed.

## Rejection Workflow

### Mark Not Selected

1. Open the application review page.
2. In `Data Retention`, click `Mark as Not Selected`.
3. The system sets:
   - `Data Retention Status` = `Declined`
   - `Retention Expiry Date` = today + 180 days
   - `Retention Action` = `Pending deletion after expiry`

### Apply Retention Policy

Do not delete sensitive files automatically. Use preview first. Delete files only after admin confirmation and only when policy allows.

## Data Retention Workflow

### Incomplete

Use when an application is incomplete and will not proceed.

- Expiry: 60 days
- Action: pending deletion after expiry

### Withdrawn

Use when the applicant withdraws.

- Expiry: 90 days
- Action: pending deletion after expiry

### Declined

Use when the applicant is not selected.

- Expiry: 180 days
- Action: pending deletion after expiry

### Archived

Use when the applicant becomes a signed tenant.

- Action: move to tenant file / keep
- Do not delete sensitive files

### Cleanup Preview

1. Click `Preview Expired Retention`.
2. Review the returned list.
3. Confirm record ID, applicant name, email, listing ID, status, expiry date, and support folder URL.
4. Do not delete files from preview alone.

### Manual Sensitive File Deletion

1. Confirm the application is expired under the retention policy.
2. Click the manual delete button.
3. Confirm the warning:

```text
This will delete sensitive applicant files from Google Drive. The application record will remain for audit purposes. Continue?
```

4. The application row remains.
5. Sensitive file links are cleared or marked as deleted.
6. `Sensitive Files Deleted At` is updated.
7. `Retention Action` becomes `Sensitive files deleted`.
