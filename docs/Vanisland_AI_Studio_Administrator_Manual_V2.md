# Vanisland AI Studio Administrator Manual V2.0

Last updated: 2026-07-06

This manual is for daily administrators of Vanisland AI Studio / Rental AI Marketing Platform. It reflects the current project code in the React frontend, Google Apps Script backend, Google Sheets, and Google Drive workflow.

## 1. Admin Access

Admin workspace:

- `/admin`
- `/admin/rental`
- `/admin/listings`
- `/admin/leads`
- `/admin/application/:recordId`
- `/admin/settings`
- `/admin/faq`

Admin access is controlled through the current admin access code workflow. Trial users have limited access based on approved module and listing ownership. Trial users must not see internal Google Drive links.

## 2. Daily Admin Dashboard

Open `/admin` to review current rental and sale listing activity.

For rental work, use:

- `/admin/rental` for rental dashboard
- `/admin/listings` for rental listing list
- `/admin/listing/:id` for one listing workspace
- `/admin/leads` for rental applications

The admin rental listing list uses the shared `sortListingsNewestFirst` helper. Newest updated or created listings appear first. This is an admin display rule only and does not change public listing detail pages.

## 3. Create a Rental Listing

1. Go to `/admin/new`.
2. Enter owner and property information.
3. Enter rent, available date, bedrooms, bathrooms, lease terms, policies, parking, laundry, pet policy, smoking policy, key features, target audience, and language/platform output needs.
4. Save the listing.
5. Confirm a `Listing ID` is created.
6. Confirm the listing row is saved to `01 Listings`.
7. Confirm the listing has or can create a Google Drive property folder.

Main data source:

- Google Sheet: `01 Listings`
- Frontend: `src/pages/admin/NewListing.jsx`
- Backend: `apps-script/Code.gs`

Manual confirmation:

- Property details are accurate.
- Rent and available date are correct.
- Owner consent and listing status are correct.
- Drive folder is linked before relying on media, support documents, or report storage.

## 4. AI Rental Strategy Assessment

Public page:

- `/landlord-ai/strategy-assessment`

Purpose:

- Help landlords get a preliminary AI rental strategy assessment before creating a full listing.
- Capture early lead information.
- Provide preliminary guidance on rental strategy, rent positioning, suite potential, Airbnb / STR risk, legal risk reminders, and next steps.

System automation:

- Generates a bilingual preliminary assessment.
- Saves submitted assessment data through Apps Script.
- Stores the strategy assessment outside the applicant intake sheet.

Manual confirmation:

- This is not a final legal, rent, or property management decision.
- Staff must review BC tenancy, STR, suite, and owner-occupancy issues before giving final advice.

Related files:

- `src/pages/StrategyAssessment.jsx`
- `src/utils/strategyAssessment.js`
- `apps-script/Code.gs`

## 5. AI Marketing Content

Rental listing detail page:

- `/admin/listing/:id`

Current rental marketing tools include:

- AI-generated rental listing copy
- Facebook / social media copy
- Craigslist-style copy
- WeChat / Chinese owner summary content
- Short video script
- Owner summary
- Listing media review
- Cover image / collage support
- Video output sync
- Public listing URL and QR / share tools

System automation:

- Generates marketing outputs from listing data.
- Reads media from the listing's Drive folder.
- Saves or syncs media outputs where configured.

Manual confirmation:

- Check fair housing and tenancy wording.
- Remove promises the owner has not approved.
- Confirm rent, availability, pet policy, utilities, parking, smoking policy, and open house instructions.
- Confirm photos are accurate and not misleading.

Related files:

- `src/pages/admin/ListingDetail.jsx`
- `src/utils/generateContent.js`
- `src/utils/storage.js`
- `apps-script/Code.gs`

## 6. Photos and Videos

Photos:

1. Open `/admin/listing/:id`.
2. Confirm `Drive Folder Link` exists.
3. Upload or load listing photos.
4. Select cover photo or generate collage if needed.
5. Keep original property photos intact.

Videos:

1. Generate or review the short video script.
2. Confirm video output is stored under the listing Drive folder.
3. Sync public video URL when available.
4. Test public playback before sharing.

Manual confirmation:

- Do not expose internal Drive folders to public tenants or trial users.
- Use website-safe video playback links for public pages.

## 7. Publish Listing

1. Open `/admin/listing/:id`.
2. Review all listing details, media, and marketing copy.
3. Confirm listing status and public visibility.
4. Confirm public page:
   - `/listings/:id`
5. Confirm application page:
   - `/apply/:listingId`
6. Confirm the listing appears in the public rental listing list only when it should be public.

Manual confirmation:

- Listing is still available.
- Public listing does not contain private owner/admin notes.
- Public page does not expose internal Google Drive links.

## 8. Online Rental Applications

Applicant page:

- `/apply/:listingId`

Admin pages:

- `/admin/leads`
- `/admin/application/:recordId`

When an applicant submits a rental application:

System automation:

- Writes the application to `07 Intake Records`.
- Generates a `Record ID`.
- Saves a submitted application PDF to Google Drive when possible.
- Creates an application download token.
- Sends applicant confirmation email when applicant email exists.
- Sends admin notification email to the configured company admin notification address.
- Returns `emailWarnings` if email sending fails.

Important behavior:

- Email failure must not block application submission.
- PDF/Drive failure is logged and returned as warning data, but the intake row is still saved.

Manual confirmation:

- Open `/admin/leads`.
- Open the specific application review page.
- Review applicant details, income, references, pets, smoking, insurance, deposit, and move-in date.
- Download or open the PDF where available.

Related files:

- `src/pages/RentalApplication.jsx`
- `src/utils/storage.js`
- `apps-script/Code.gs`
- Google Sheet: `07 Intake Records`

## 9. Support Documents

There are two support document paths:

1. Token-based upload after admin requests documents:
   - `/support-documents/:listingId/:recordId?token=...`
2. Public support document upload:
   - `/supporting-documents`

Admin request flow:

1. Open `/admin/application/:recordId` or `/admin/leads`.
2. Click request supporting documents.
3. System creates or reuses the applicant support folder.
4. System generates upload token and upload link.
5. System emails the applicant the secure upload link.
6. Applicant uploads files through the website.

After successful upload:

System automation:

- Saves the file to Google Drive.
- Updates document upload status in `07 Intake Records`.
- Updates uploaded file count and last upload time.
- Sends applicant support document confirmation email.
- Sends admin support document notification email.
- Returns `emailWarnings` if notification fails.

Important behavior:

- Upload success is the main workflow.
- Listing lookup or email notification failure after upload must not make the upload API fail.

Manual confirmation:

- Confirm document count and upload status.
- Review document names and folder contents.
- Confirm uploaded documents belong to the right applicant and listing.
- Do not rely only on `Uploaded File Count` if staff manually placed files in a listing-level folder.

Related files:

- `src/pages/SupportDocuments.jsx`
- `src/utils/storage.js`
- `apps-script/Code.gs`
- Google Drive: listing folder / `Supporting Documents`
- Google Sheet: `07 Intake Records`

## 10. AI Initial Screening Summary

Purpose:

- Listing-level comparison of all applicants for one listing.
- Uses submitted application form data.
- Does not depend on support documents.

Where to use:

- `/admin/listing/:id`
- `/admin/leads?listingId=...`

System automation:

- Ranks and summarizes applicants for the selected listing.
- Generates a PDF.
- Saves the PDF to the listing's `Tenant Screening Reports` Drive folder through Apps Script.

Manual confirmation:

- Treat as an internal review aid.
- Do not use it as a final approval or rejection decision.
- Verify income, references, credit, pets, smoking, occupancy, and legal compliance manually.

Related files:

- `src/utils/applicantScreeningReports.js`
- `src/pages/admin/ListingDetail.jsx`
- `src/pages/admin/Leads.jsx`
- `apps-script/Code.gs`

## 11. AI Support Document Review / Full Applicant Audit Report

Purpose:

- Applicant-level review combining application data and available support documents.
- Produces a structured screening report for internal review.

Where to use:

- `/admin/application/:recordId`

System automation:

- Reads the application record from `07 Intake Records`.
- Detects support documents from the applicant support folder.
- Falls back to listing-level support document matching when needed.
- Builds a Markdown report.
- Saves a Google Doc/PDF report to `Tenant Screening Reports`.
- Stores report status and Markdown back to `07 Intake Records`.

Manual confirmation:

- Review every document manually.
- Check unsupported or unreadable documents.
- Verify ID, income, employment, references, and consistency.
- The report is not legal advice and not a final decision.

Related files:

- `src/pages/admin/ApplicationReview.jsx`
- `src/utils/storage.js`
- `src/utils/applicantSupportDocuments.js`
- `apps-script/Code.gs`

## 12. PDF Downloads

Available PDF-related outputs:

- Submitted rental application PDF
- Applicant Initial Screening Summary PDF
- Full Applicant Audit Report PDF

Rules:

- Applicant-facing application PDF download uses a token endpoint.
- Admin users may open internal Drive PDF links.
- Trial users and public applicants must not receive internal Drive folder links.
- If a PDF save fails, the system should show a warning and keep the submitted record where possible.

## 13. Email Notification Handling

Configured company admin notification email:

- `support@vanislandproperty.ca`

This must remain configured in one backend configuration point, not scattered through multiple frontend files.

Application submission emails:

- Applicant receives confirmation that the rental application was received.
- Admin receives applicant name, email, phone, property/listing address, submitted time, application ID, and admin link when available.

Support document upload emails:

- Applicant receives confirmation that supporting documents were received.
- Admin receives applicant name, email, phone when available, property/listing address, upload time, document list when safe, application ID/admin link when available.

Troubleshooting:

- If the submission succeeded but email did not arrive, check Apps Script logs.
- Check `emailWarnings` returned by the API.
- Confirm Apps Script Web App deployment is updated after backend code changes.

## 14. Listing Sorting and Status

Admin rental listing pages use newest-first sorting:

Priority:

1. `updatedAt`, `lastModified`, `modifiedDate`, `modified`
2. `createdAt`, `createdDate`, `listingDate`
3. `availableDate`, `available`
4. Original stable fallback through the browser sort behavior when dates are equal

Admin pages using the helper:

- `/admin`
- `/admin/rental`
- `/admin/listings`

Public listing pages still use public rental listing status sorting. Closed/rented public listing behavior should not be changed casually.

Related file:

- `src/utils/listingSort.js`

## 15. Daily BC Rental & Real Estate Intelligence Brief

Public report route:

- `/reports/daily-market-brief`

Purpose:

- Show daily BC rental and real estate intelligence content.
- Includes policy, BC rental, BC sale, Nanaimo rental, Nanaimo sale, landlord action notes, and website summary sections.

Data source:

- Daily market brief Google Sheet
- Apps Script `getDailyMarketBrief` action

Manual confirmation:

- Verify daily content before relying on it for public or owner-facing advice.
- Confirm dates and source accuracy.

## 16. Knowledge Center / FAQ / Run Log

Knowledge and help pages:

- `/resources`
- `/faq`
- `/admin/faq`
- `/admin/photo-tips`

Purpose:

- Help staff, landlords, trial users, and public visitors understand the system.
- Provide property management education and operational guidance.

Manual confirmation:

- Keep content current when workflows change.
- Avoid adding legal promises or unsupported service claims.

## 17. What Is Live vs. Manual

Live system features:

- AI Rental Strategy Assessment
- Rental listing creation and admin management
- AI marketing copy generation
- Photo/media workflow
- Video URL sync workflow
- Public listing pages
- Online rental application
- Application PDF generation/download workflow
- Applicant confirmation email
- Admin application notification email
- Support document request and upload workflow
- Support document confirmation email
- Admin support document notification email
- AI Initial Screening Summary
- Full Applicant Audit Report / AI support document review
- Screening report PDF save/download workflow
- Daily market brief page
- Knowledge Center / FAQ
- Admin newest-first listing sort

Still requiring human confirmation:

- Final rent strategy
- Legal compliance and BC tenancy interpretation
- STR / Airbnb compliance
- Owner approval
- Applicant approval/rejection
- Income and ID verification
- Reference checks
- Deposit confirmation
- Lease preparation
- DocuSign or external lease signing
- Move-in inspection
- Tenant onboarding and ongoing management

