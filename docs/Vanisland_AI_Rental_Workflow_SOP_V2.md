# Vanisland AI Rental Workflow SOP V2.0

Last updated: 2026-07-06

This SOP describes the operational workflow from receiving a new property to move-in and ongoing management. It separates system automation from human decisions.

## 1. New Property

Purpose:

- Start a new rental marketing and applicant intake workflow for a property.

Operator:

- Admin / property manager.

System automation:

- Creates or saves a listing record in `01 Listings`.
- Generates or stores a `Listing ID`.
- Connects listing data to the admin workspace.

Human confirmation:

- Owner authorization.
- Property address and legal rental suitability.
- Rent target, availability, lease term, utilities, pets, smoking, parking, laundry.
- Whether the property can be published.

Related pages/files/data:

- `/admin/new`
- `/admin/listing/:id`
- `src/pages/admin/NewListing.jsx`
- `src/pages/admin/ListingDetail.jsx`
- `01 Listings`

Risks:

- Wrong address or rent can affect all downstream marketing.
- Missing Drive folder prevents media/document/report storage.

## 2. AI Rental Strategy Assessment

Purpose:

- Produce a preliminary rental strategy assessment before or during onboarding.

Operator:

- Landlord or admin.

System automation:

- Generates preliminary AI assessment.
- Captures owner/property details.
- Saves assessment through Apps Script.

Human confirmation:

- Legal risk, owner occupancy, suite legality, STR/Airbnb rules, and rent strategy.
- Whether the owner should proceed with Vanisland services.

Related pages/files/data:

- `/landlord-ai/strategy-assessment`
- `src/pages/StrategyAssessment.jsx`
- `src/utils/strategyAssessment.js`
- `apps-script/Code.gs`

Risks:

- AI output is preliminary only.
- BC tenancy and municipal STR rules must be checked manually.

## 3. AI Marketing Content

Purpose:

- Create listing copy and marketing materials for rental promotion.

Operator:

- Admin / marketing staff.

System automation:

- Generates rental ad copy, owner summary, social copy, WeChat/Chinese content, and video script from listing data.
- Reads listing media from Google Drive.

Human confirmation:

- Compliance wording.
- Property facts.
- Rent, availability, restrictions, and owner-approved terms.

Related pages/files/data:

- `/admin/listing/:id`
- `src/pages/admin/ListingDetail.jsx`
- `src/utils/generateContent.js`
- `01 Listings`

Risks:

- AI may overstate property features.
- Marketing copy must not create unsupported promises.

## 4. Website Listing

Purpose:

- Publish a tenant-facing property listing page.

Operator:

- Admin.

System automation:

- Uses listing data to render `/listings/:id`.
- Provides public application entry point `/apply/:listingId`.

Human confirmation:

- Listing status is correct.
- Public page has no internal Drive/admin links.
- Listing is still accepting applications.

Related pages/files/data:

- `/listings/:id`
- `/apply/:listingId`
- `src/pages/PublicListing.jsx`
- `src/pages/RentalApplication.jsx`
- `01 Listings`

Risks:

- Publishing too early can expose incomplete or incorrect listing information.

## 5. Facebook / Social Media Promotion

Purpose:

- Promote the rental listing outside the website.

Operator:

- Admin / marketing staff.

System automation:

- Provides AI-generated copy and public listing URL.
- Can provide public video URL when video output is ready.

Human confirmation:

- Post content and media selection.
- Correct public listing URL.
- No private applicant/owner data included.

Related pages/files/data:

- `/admin/listing/:id`
- Public listing URL
- Video URL fields in `01 Listings`

Risks:

- Social posts can spread outdated availability if status is not maintained.

## 6. Online Application

Purpose:

- Collect structured tenant application information.

Operator:

- Applicant.

System automation:

- Saves the application to `07 Intake Records`.
- Generates `Record ID`.
- Attempts to generate and save application PDF.
- Creates application download token.
- Triggers applicant and admin emails.

Human confirmation:

- Admin reviews submitted details.
- Admin confirms application completeness and next step.

Related pages/files/data:

- `/apply/:listingId`
- `/admin/leads`
- `/admin/application/:recordId`
- `src/pages/RentalApplication.jsx`
- `apps-script/Code.gs`
- `07 Intake Records`

Risks:

- PDF or email warning should not be mistaken for failed application if the intake row was saved.

## 7. Applicant Confirmation Email

Purpose:

- Let the applicant know the application was received.

Operator:

- System.

System automation:

- Sends confirmation email after application submission when applicant email exists.

Human confirmation:

- If applicant reports no email received, check spam and Apps Script logs.
- Confirm applicant email was entered correctly.

Related pages/files/data:

- `apps-script/Code.gs`
- `sendRentalApplicationReceiptEmails_`
- API response `emailWarnings`

Risks:

- Email delivery can fail externally; submission must remain successful.

## 8. Admin Notification Email

Purpose:

- Alert the company when a new rental application arrives.

Operator:

- System.

System automation:

- Sends admin email to the configured admin notification address.
- Includes applicant name, email, phone, property/listing address, submitted time, application ID, and admin link when available.

Human confirmation:

- Admin still checks `/admin/leads`; email is a notification, not the database.

Related pages/files/data:

- `ADMIN_NOTIFICATION_EMAIL`
- `apps-script/Code.gs`
- `07 Intake Records`

Risks:

- Email should not be the only operational record.

## 9. Support Documents Upload

Purpose:

- Collect income proof, ID, references, insurance, and other requested documents.

Operator:

- Applicant, after admin request or through public upload page.

System automation:

- Validates upload token where used.
- Saves files to Google Drive.
- Updates document status and count in `07 Intake Records`.

Human confirmation:

- Confirm documents are readable and belong to the correct applicant.
- Confirm file count and document categories.

Related pages/files/data:

- `/support-documents/:listingId/:recordId?token=...`
- `/supporting-documents`
- `src/pages/SupportDocuments.jsx`
- `apps-script/Code.gs`
- Google Drive `Supporting Documents`
- `07 Intake Records`

Risks:

- Uploaded files can be incomplete, unreadable, or misnamed.
- Manual files placed in Drive may not update `Uploaded File Count`.

## 10. Support Document Confirmation Email

Purpose:

- Confirm to the applicant that support documents were received.

Operator:

- System.

System automation:

- Sends applicant confirmation after upload success.

Human confirmation:

- If email fails, upload should still be treated as successful when the file exists and status updated.

Related pages/files/data:

- `sendSupportDocumentReceiptEmails_`
- `uploadSupportingDocument_`
- `uploadPublicSupportingDocument_`
- API response `emailWarnings`

Risks:

- Email failure should not trigger duplicate uploads unless file is missing.

## 11. Admin Support Document Notification

Purpose:

- Alert the company that support documents were uploaded.

Operator:

- System.

System automation:

- Sends admin email with applicant, contact, property, upload time, document list when safe, and application/admin link when available.

Human confirmation:

- Admin confirms documents inside `/admin/application/:recordId` and Drive.

Related pages/files/data:

- `ADMIN_NOTIFICATION_EMAIL`
- `apps-script/Code.gs`
- `07 Intake Records`

Risks:

- Notification email is secondary. The Drive folder and intake row are the operational record.

## 12. AI Initial Screening Summary

Purpose:

- Compare all applicants for one listing using application form data.

Operator:

- Admin.

System automation:

- Generates listing-level applicant ranking/summary.
- Saves PDF to `Tenant Screening Reports`.

Human confirmation:

- Review for fairness and accuracy.
- Confirm no final decision is made solely from AI summary.

Related pages/files/data:

- `/admin/listing/:id`
- `/admin/leads?listingId=...`
- `src/utils/applicantScreeningReports.js`
- Google Drive `Tenant Screening Reports`

Risks:

- Uses application data only, not document verification.

## 13. AI Support Document Review

Purpose:

- Review one applicant with application data plus supporting documents.

Operator:

- Admin.

System automation:

- Detects and matches support documents.
- Generates Full Applicant Audit Report.
- Saves report PDF and Markdown.

Human confirmation:

- Verify every key document manually.
- Confirm unreadable/unsupported files.
- Check income, ID, employment, reference, and consistency.

Related pages/files/data:

- `/admin/application/:recordId`
- `generateFullApplicantAuditReport`
- `07 Intake Records`
- Google Drive `Tenant Screening Reports`

Risks:

- AI cannot fully verify scanned files, external references, or legal compliance.

## 14. Screening Report PDF

Purpose:

- Provide an internal review artifact for owner/admin discussion.

Operator:

- Admin.

System automation:

- Saves PDF report to Drive.
- Shows or links report in admin UI.

Human confirmation:

- Confirm PDF is saved under the correct listing.
- Confirm report type:
  - Initial Screening Summary
  - Full Applicant Audit Report

Related pages/files/data:

- `/admin/listing/:id`
- `/admin/application/:recordId`
- `Tenant Screening Reports`

Risks:

- Do not confuse listing-level initial summary with applicant-level full audit.

## 15. Owner Review

Purpose:

- Let owner review shortlisted applicants and staff recommendations.

Operator:

- Property manager / owner.

System automation:

- Provides application data, screening summaries, and reports.

Human confirmation:

- Final selection remains human and must follow tenancy/human rights rules.
- Owner questions and conditions must be recorded internally.

Related pages/files/data:

- `/admin/leads`
- `/admin/application/:recordId`
- Screening report PDFs

Risks:

- Owner must not receive private data casually or through insecure channels.

## 16. Conditional Approval

Purpose:

- Move selected applicant toward tenancy while final conditions are completed.

Operator:

- Property manager.

System automation:

- Admin can update review status and notes.

Human confirmation:

- Deposit readiness.
- Tenant insurance.
- Lease terms.
- Move-in date.
- Any missing documents or references.

Related pages/files/data:

- `/admin/application/:recordId`
- `07 Intake Records`

Risks:

- Approval should remain conditional until all business checks are complete.

## 17. Deposit

Purpose:

- Secure the tenancy after conditional approval.

Operator:

- Property manager / applicant.

System automation:

- Current rental marketing platform does not complete payment processing.

Human confirmation:

- Deposit amount.
- Payment method.
- Receipt/accounting workflow.
- Deadline and refund/forfeit rules under applicable law.

Related pages/files/data:

- External finance/receipt workflow
- Internal notes

Risks:

- Do not mark final approval before deposit terms are confirmed.

## 18. DocuSign Lease

Purpose:

- Execute lease documents.

Operator:

- Property manager / applicant / owner if required.

System automation:

- Current platform does not automate DocuSign lease creation.

Human confirmation:

- Tenant names.
- Property address.
- Rent, deposit, lease term, start date.
- Addenda and rules.
- Signatures and final copy storage.

Related pages/files/data:

- External DocuSign workflow
- Final tenant file

Risks:

- Lease terms must match the approved listing and applicant agreement.

## 19. Move-in Inspection

Purpose:

- Complete condition inspection and handover.

Operator:

- Property manager / tenant.

System automation:

- Current platform does not automate inspection reports.

Human confirmation:

- Inspection date/time.
- Photos and condition report.
- Keys/fobs/remotes.
- Utilities and insurance.

Related pages/files/data:

- External move-in inspection workflow
- Tenant file

Risks:

- Missing inspection documentation creates future dispute risk.

## 20. Tenant Log / Ongoing Management

Purpose:

- Move from applicant intake to active tenancy management.

Operator:

- Property manager.

System automation:

- Current rental marketing platform stores application history and reports.
- Ongoing tenant management belongs to the tenant/owner/property management system.

Human confirmation:

- Create or update tenant record in the correct tenant management workflow.
- Preserve required application records according to retention rules.
- Do not use `07 Intake Records` as the long-term tenant master.

Related pages/files/data:

- `07 Intake Records`
- Tenant Log / ongoing management database
- Final tenant file

Risks:

- Applicant intake records and active tenant records must not be confused.

## 21. Knowledge Center, FAQ, Run Log, and Daily Brief

Purpose:

- Support staff training, landlord education, and daily market awareness.

Operator:

- Admin / staff.

System automation:

- Displays FAQ and resources.
- Displays Daily BC Rental & Real Estate Intelligence Brief.

Human confirmation:

- Content accuracy.
- Whether daily brief advice applies to a specific property/client.

Related pages/files/data:

- `/resources`
- `/faq`
- `/admin/faq`
- `/reports/daily-market-brief`
- `src/pages/DailyMarketBriefReport.jsx`
- `src/pages/admin/Faq.jsx`

Risks:

- Knowledge content can become outdated when law, market conditions, or workflow changes.

## 22. Admin Listing Newest-First Sorting

Purpose:

- Keep newest or most recently updated admin listings visible at the top.

Operator:

- System.

System automation:

- Uses shared helper `sortListingsNewestFirst`.
- Admin dashboard and admin listings page both reuse the helper.

Human confirmation:

- Confirm newest listing appears first after create/update.
- Public pages still behave correctly.

Related pages/files/data:

- `src/utils/listingSort.js`
- `src/pages/admin/Dashboard.jsx`
- `src/pages/admin/Listings.jsx`

Risks:

- Do not change public closed/rented listing status behavior while adjusting admin sorting.

