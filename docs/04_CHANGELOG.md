# Landlord AI Marketing Studio Changelog

## Version 1.0

Initial listing system.

Included:

- React and Vite frontend
- Public landlord website pages
- Public rental listing pages
- Admin listing dashboard
- Rental listing creation and editing
- Google Sheet-backed rental listing records
- Google Drive folder support for listing media
- Netlify frontend deployment
- Apps Script backend integration

## Version 1.1

Application workflow.

Included:

- Public route `/apply/:listingId`
- Rental application form
- Application submission into `07 Intake Records`
- Submitted application PDF generation
- Internal PDF storage in Google Drive
- Admin application review page
- Leads dashboard reading from `07 Intake Records`
- Manual review status and internal notes

## Version 1.2

Supporting document upload workflow.

Included:

- Admin `Request Supporting Documents` action
- Shortlist status tracking
- Supporting document request email
- Secure upload link generation
- `Supporting Documents` Drive subfolder creation
- Applicant folder creation using `{Record ID} - {Applicant Name}`
- Public route `/support-documents/:listingId/:recordId`
- Multiple upload categories
- Uploaded file count tracking
- Last upload timestamp
- Document upload status tracking

## Version 1.3

Token security.

Included:

- Application download tokens
- `Application Download Expires At`
- Supporting document upload tokens
- `Upload Token Expires At`
- 7-day application download token expiry
- 14-day supporting document upload token expiry
- Expired token message
- Direct applicant Google Drive preview removal for submitted PDF download
- Public and Trial User Drive link exposure cleanup

## Version 1.4

AI Draft Screening Report.

Included:

- `Generate AI Draft Screening Report` admin action
- Uploaded file list reading from support document folder
- Markdown draft report generation
- Internal report file saved to Drive
- `Screening Report Status`
- `Screening Report Generated At`
- `Screening Report URL`
- `Screening Report Markdown`
- In-page report rendering for admin review
- Rule that AI draft is not an approval, rejection, legal opinion, or credit decision

## Version 1.5

Data retention policy.

Included:

- `Data Retention Status`
- `Retention Expiry Date`
- `Retention Action`
- `Retention Notes`
- `Sensitive Files Deleted At`
- `Archived Tenant File URL`
- Retention rules for incomplete, withdrawn, declined, approved-not-signed, and signed tenant records
- Expired retention preview function
- Manual sensitive file deletion function
- Admin confirmation before deleting sensitive applicant files
- Rule that application rows remain for audit purposes

## Version 2.0 (RC2)

Full Applicant Audit Report, Initial Screening Summary restoration, and report language rules. Full
detail in `docs/RC2-Development-Summary.md`.

Included:

- Applicant-level `Full Applicant Audit Report`, generated from application data plus Supporting
  Documents (`generateFullApplicantAuditReport_` in `Code.gs`)
- Supporting Documents fallback matching: record-level folder first, then listing-level `Supporting
  Documents` folder matched by applicant name/email/phone
- Admin-only "Supporting Document Detection Debug" panel on the application review page
- Full Audit report language follows the current admin UI language (English/Chinese), defaulting to
  English only when no language is provided
- Listing-level `Initial Screening Summary` (applicant comparison/ranking across one listing),
  restored after being found only on an unmerged branch — see the Git/Branch Lesson in
  `docs/RC2-Development-Summary.md`
- Both report types save to the listing's `Tenant Screening Reports` Drive folder, distinguished by
  filename prefix and `reportType`, and are never mixed or mislabeled
- Initial Screening Summary entry points on Listing Detail and Leads; Full Audit entry point remains
  Application Review only

## Future Roadmap

### AI Screening V2

- More structured evidence extraction from uploaded files
- Better missing-document detection
- More precise follow-up question generation
- Stronger human-review workflow controls

### Lease Package Automation

- Lease package preparation after manual approval
- Move-in checklist generation
- Tenant file archive support

### DocuSign Integration

- Envelope creation
- Signing status tracking
- Signed lease storage

### QBO Integration

- Deposit/payment tracking
- Invoice or receipt workflow
- Reconciliation support
