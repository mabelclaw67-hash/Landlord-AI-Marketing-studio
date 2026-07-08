# VIPM Report Design Standard

## Core Principle

All VIPM reports must follow:

**One Data -> Multi Language -> One Brand**

Professional Report Engine is the unified output layer for company reports.

## Rules

- Business calculation runs once.
- AI analysis, OCR, scoring, recommendation, risk assessment, and income calculation must keep one source of truth.
- Chinese and English are selected only in the display layer.
- Demo PDF and real PDF must use the same template. Demo uses fake data; real reports use backend data.
- Owner-safe versions must hide sensitive information automatically.
- Internal versions may keep full data, but must be clearly marked internal use only.
- Shared layout, brand colors, header, footer, cards, badges, tables, and recommendation boxes must come from the shared report engine.

## Current Engine Components

- `src/components/reports/ReportShell.jsx`
- `src/components/reports/ReportHeader.jsx`
- `src/components/reports/ExecutiveSummary.jsx`
- `src/components/reports/ReportCard.jsx`
- `src/components/reports/StatusBadge.jsx`
- `src/components/reports/ComparisonTable.jsx`
- `src/components/reports/SectionTitle.jsx`
- `src/components/reports/RecommendationBox.jsx`
- `src/components/reports/Footer.jsx`
- `src/components/reports/professionalReportHtml.js`
- `src/components/reports/reportTheme.js`

## Current Phase

Phase 1:

- Applicant Initial Screening Report

Phase 2:

- Complete Applicant Audit Report
- Property Strategy Assessment Report

## Property Strategy Assessment Public Result Route

- `/strategy-assessment/report/:assessmentId` is available for public report viewing.
- Current V1 uses the locally generated session result because no persistent assessment result record is being added in this phase.
- Future upgrades should connect this route to a reliable persistent `assessmentId` in the existing approved backend workflow before sharing links across devices.
- Do not add a new database table for this route unless the data architecture is explicitly approved.
- Public owner-facing output must hide owner contact details and use the shared Professional Report Engine layout.

## Future Reports

These reports should be upgraded later using the same Professional Report Engine:

- Inspection Report
- Owner Monthly Statement
- Rent Collection Report
- Move-out Damage Report

## Privacy

Owner-safe output must not expose:

- Phone numbers
- Email addresses
- Current addresses
- Drive links
- ID numbers
- Bank account numbers
- Reference phone numbers
- Sensitive identifying information

Internal output may include more detail only when clearly marked internal use only.
