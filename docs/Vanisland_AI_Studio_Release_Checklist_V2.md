# Vanisland AI Studio Release Checklist V2.0

Created: 2026-07-06
Project: Vanisland AI Studio / Rental AI Marketing Platform
Local folder: `/Users/mabelchen/Mabel Project/04_landlord-ai-marketing-studio`

This checklist is the release map for the V2.0 documentation set. It separates current V2 documents from older V1 / RC reference documents, and records what is live, what still requires manual confirmation, and what should be updated next.

## 1. Documentation Set

### V2.0 Current Documents

These are the current primary reference documents for the rental AI marketing platform.

| Document | File | Created | Purpose | Status |
| --- | --- | --- | --- | --- |
| Administrator Manual V2 | `Vanisland_AI_Studio_Administrator_Manual_V2.md` | 2026-07-06 | Daily admin operating manual | Current |
| System Architecture V2 | `Vanisland_AI_Studio_System_Architecture_V2.md` | 2026-07-06 | Technical architecture and maintenance guide | Current |
| Rental Workflow SOP V2 | `Vanisland_AI_Rental_Workflow_SOP_V2.md` | 2026-07-06 | End-to-end rental business workflow | Current |
| Release Checklist V2 | `Vanisland_AI_Studio_Release_Checklist_V2.md` | 2026-07-06 | Release status, document map, and update checklist | Current |

Google Drive location:

```text
Landlord Rent & Sale Marketing Studio
└── 10 System Control
    └── Docs-important
```

### V1 / Legacy Reference Documents

These files are still useful as historical reference, but they should not be treated as the full current V2 system description.

| Document | File | Original role | Current classification |
| --- | --- | --- | --- |
| System Architecture V1 | `01_SYSTEM_ARCHITECTURE.md` | Early architecture reference | Legacy / V1 reference |
| Operations Manual V1 | `02_OPERATIONS_MANUAL.md` | Early operations manual | Legacy / V1 reference |
| Developer Handbook | `03_DEVELOPER_HANDBOOK.md` | Developer and maintenance notes | Supporting reference |
| Changelog | `04_CHANGELOG.md` | Historical change record | Supporting reference |
| RC2 Development Summary | `RC2-Development-Summary.md` | Stabilization summary | Release history / RC2 reference |

Rule:

- Use the V2 documents for current operations.
- Use V1 / RC documents only to understand history, earlier design decisions, or why certain fixes were made.

## 2. V2.0 Release Status

### Production-ready / Current Workflow

These items are documented as current working platform capabilities.

| Area | Feature | Current status | Primary reference |
| --- | --- | --- | --- |
| Strategy | AI Rental Strategy Assessment | Current | Administrator Manual V2 / SOP V2 |
| Listings | Rental listing creation and admin management | Current | Administrator Manual V2 |
| Listings | Admin newest-first listing sort | Current | System Architecture V2 |
| Marketing | AI rental ad copy and owner summary | Current | Administrator Manual V2 |
| Marketing | Photo/media workflow | Current | Administrator Manual V2 |
| Marketing | Video script and video URL sync workflow | Current | Administrator Manual V2 |
| Website | Public listing page | Current | SOP V2 |
| Website | Online rental application | Current | SOP V2 |
| Application | Application record saved to `07 Intake Records` | Current | System Architecture V2 |
| Application | Application PDF workflow | Current with warning handling | Administrator Manual V2 |
| Email | Applicant application confirmation email | Current | System Architecture V2 |
| Email | Admin application notification email | Current | System Architecture V2 |
| Support Docs | Token-based support document upload | Current | SOP V2 |
| Support Docs | Public support document upload | Current | SOP V2 |
| Email | Applicant support document confirmation email | Current | System Architecture V2 |
| Email | Admin support document notification email | Current | System Architecture V2 |
| Screening | AI Initial Screening Summary | Current | Administrator Manual V2 |
| Screening | Full Applicant Audit Report | Current | Administrator Manual V2 |
| Reports | Screening report PDF save/download | Current | SOP V2 |
| Knowledge | Knowledge Center / FAQ | Current | Administrator Manual V2 |
| Intelligence | Daily BC Rental & Real Estate Intelligence Brief | Current | Administrator Manual V2 |

### Manual / External Workflow

These are part of the business workflow, but they are not fully automated inside the current rental AI marketing platform.

| Area | Item | Current handling |
| --- | --- | --- |
| Legal/compliance | BC tenancy, human rights, STR/Airbnb, suite legality | Manual staff confirmation |
| Owner decision | Owner review and final applicant selection | Manual |
| Applicant verification | ID, income, employment, references, credit/background | Manual verification supported by AI report |
| Approval | Conditional approval | Manual status/communication |
| Payment | Deposit | External finance/receipt workflow |
| Lease | DocuSign lease | External DocuSign/manual lease workflow |
| Move-in | Move-in inspection | External/manual inspection workflow |
| Ongoing management | Tenant Log / rent collection / owner management | Separate property management system |

## 3. Key V2.0 Workflow Milestones

| Date | Milestone | Notes |
| --- | --- | --- |
| 2026-07-04 | RC2 stabilization documented | Initial Screening Summary and Full Applicant Audit distinction recorded in RC2 summary |
| 2026-07-06 | Email notification workflow completed | Application and support document confirmation/admin notification documented |
| 2026-07-06 | Admin listing newest-first sorting documented | Shared listing sort helper documented |
| 2026-07-06 | V2 documentation set created | Administrator Manual, Architecture, SOP, and this Release Checklist |
| 2026-07-06 | Google Drive documentation copy created | Copied to `10 System Control / Docs-important` |

## 4. Single Source of Truth Reminder

Do not create duplicate operational databases for the same workflow.

| Workflow | Single source of truth |
| --- | --- |
| Rental listing data | `01 Listings` |
| Rental application data | `07 Intake Records` |
| Support document files | Listing Google Drive folder / `Supporting Documents` |
| Screening reports | Listing Google Drive folder / `Tenant Screening Reports` |
| Admin settings | `08 System Settings` |
| Daily market brief | Daily market brief workbook |
| V2 documentation | Local `docs/` folder plus Google Drive `Docs-important` copy |

## 5. Configurations That Must Stay Centralized

| Configuration | Rule |
| --- | --- |
| Apps Script Web App URL | Keep in environment config such as `VITE_STUDIO_EXEC_URL`; update deployment, not random URLs |
| Admin notification email | Use single backend config point `ADMIN_NOTIFICATION_EMAIL` |
| Google Sheet IDs | Keep in Apps Script/backend config |
| Google Drive root/folder IDs | Keep in Apps Script/backend config or sheet fields |
| Public listing status rules | Reuse existing listing public metadata helpers |
| Listing sort behavior | Reuse `src/utils/listingSort.js` |

## 6. Before Future V2.x Updates

Use this checklist before changing the system again.

1. Confirm project folder:

```text
/Users/mabelchen/Mabel Project/04_landlord-ai-marketing-studio
```

2. Confirm branch and git status before code changes:

```text
git branch --show-current
git status
```

3. Decide whether the change is:

- Documentation only
- Frontend display only
- Apps Script backend change
- Google Sheet/Drive workflow change
- Netlify deployment change

4. If backend behavior changes:

- Save `apps-script/Code.gs`.
- Run Apps Script syntax check.
- Update the existing Web App deployment only if approved.
- Do not change Web App URL or permissions without approval.

5. If frontend behavior changes:

- Run `npm run build`.
- Confirm public pages and admin pages still load.
- Do not change public listing detail behavior unless the task requires it.

6. If documentation changes:

- Update the relevant V2 document.
- Copy the updated document to Google Drive `Docs-important`.
- Record date and summary in this release checklist if the update changes platform status.

## 7. Recommended V2.1 Tracking Table

Use this table for the next update.

| Item | Type | Owner | Status | Target date | Notes |
| --- | --- | --- | --- | --- | --- |
| Manual test: application submit email | QA | Admin | Pending | TBD | Test with safe sample application |
| Manual test: support document upload email | QA | Admin | Pending | TBD | Test with safe sample upload |
| Review V2 documents with staff | Documentation | Mabel | Pending | TBD | Confirm wording is usable for non-technical staff |
| Add release screenshots if needed | Documentation | Admin | Optional | TBD | Could help future training |
| V2.1 update after next workflow change | Documentation | Admin/Codex | Future | TBD | Update checklist and affected V2 doc |

## 8. Practical Rule

For future maintenance, treat documents this way:

- V2 documents = current operating truth.
- V1 documents = history and backup reference.
- RC summaries = why certain technical choices were made.
- GitHub = version-control record.
- Google Drive `Docs-important` = business-accessible document copy.

