# AI Tenant Screening Report Template Upgrade Plan

## Current Step

This step only adds a public Demo display page for AI tenant screening reports.

It does not change:

- Backend report generation logic
- Google Sheet structure
- Apps Script code
- Existing rental application, screening, or review workflows
- Database tables

## Next Stage

The next stage can upgrade backend-generated markdown/PDF reports to match the same professional report style used by the public Demo.

Recommended future components:

- `src/components/reports/ReportShell.jsx`
- `src/components/reports/ReportCard.jsx`
- `src/components/reports/ReportTable.jsx`
- `src/components/reports/ReportStatusBadge.jsx`

When formal backend report generation is upgraded, it should reuse these components or equivalent shared styles instead of outputting simple markdown-style reports.

## Report Versions

- Internal version: keeps sensitive applicant and verification data for staff review.
- Owner version: automatically redacts sensitive data before owner sharing.
- Demo version: uses fake data and is safe for public display.

## Data Integrity Notes

- Do not add new database tables for this display-only step.
- Do not use `90 Source Tenants` as the tenant master.
- Tenant, owner, property, unit, and mapping lookups must continue to read from Main Database.
- Receipt, invoice, finance, and tax workflows remain in their existing databases.
