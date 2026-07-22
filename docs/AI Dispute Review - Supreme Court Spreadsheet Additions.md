# AI Dispute Review — Supreme Court Litigation: Spreadsheet Additions (for review)

**Spreadsheet:** `AI Dispute Review - Data Tables` (`1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90`)

These are **documentation-parity** additions only — the app does not read `Dropdown_Options` or `Form_Fields` at runtime (the runtime option lists are the hardcoded JS arrays in `src/utils/disputeReview.js`, which already match this list exactly). Nothing below is required for the Supreme Court Litigation branch to work in production; it keeps the reference sheets honest for anyone auditing the schema later. Every addition is a **new row/value appended at the bottom of the relevant column** — no existing row, header, or value is touched.

Two spec fields were deliberately **not** added as new follow-up fields because the app already asks for the same information generically, once, earlier in the intake:
- `sc_client_role` → reuses the existing **Client Role** field (Step "Dispute Type"), whose option list already includes Plaintiff / Defendant / Petitioner / Respondent / Applicant / Application Respondent / Third Party.
- `sc_service_date` → reuses the existing **Service Date** field (Step "Important Dates and Deadlines").

## 1. `Dropdown_Options` — append these values to the existing columns

| Column | New values to append |
|---|---|
| Dispute Type | `Supreme Court Litigation` |
| Tribunal / Authority | `Supreme Court of British Columbia` |
| Client Role | `Plaintiff`, `Defendant`, `Petitioner`, `Applicant`, `Application Respondent`, `Third Party` *(`Respondent` already exists — not duplicated)* |
| Document Category | `Pleading`, `Affidavit`, `Exhibit`, `Court Order`, `Application Record`, `Expert Report`, `Engineering Report`, `Survey`, `Permit / Municipal Record`, `Contract`, `Insurance Document`, `Correspondence`, `Financial Record`, `Title / Property Record` |
| Next Step | `Prepare Litigation Assessment`, `Obtain Legal Counsel`, `Prepare Form 2 Working Draft`, `Prepare Application Response`, `Prepare Injunction Response`, `Notify Insurer`, `Retain Expert`, `Request Particulars`, `Preserve Evidence`, `Consider Counterclaim`, `Consider Third Party Claim` |

No other `Dropdown_Options` column needs a change (Risk Level, Review Priority, Yes/No/Not Sure, Contact Method are unaffected).

## 2. `Form_Fields` — append these 23 rows

All rows use `Section = Supreme Court`, `Required = Conditional`, `AI Follow-up Logic = Show when Dispute Type = Supreme Court Litigation` (plus the dynamic-flag note where applicable).

| Field Label EN | Field Label ZH | Field Key | Field Type | Options / Validation | Why This Is Asked |
|---|---|---|---|---|---|
| Proceeding Type | 程序类型 | `sc_proceeding_type` | Single Select | Notice of Civil Claim, Petition, Notice of Application, Injunction Application, Counterclaim, Third Party Notice, Judicial Review, Other | Identifies which type of proceeding governs deadlines and next steps. |
| Court Registry | 法院登记处 | `sc_registry` | Text | — | Identifies which Supreme Court registry holds the file. |
| Court File Number | 法院档案号 | `sc_court_file_number` | Text | — | Required to locate and reference the court file. |
| Pleading Received | 收到的诉讼文件 | `sc_pleading_type` | Single Select | Notice of Civil Claim, Petition, Notice of Application, Counterclaim, Third Party Notice, Other | Identifies the pleading actually served on the client. |
| Place of Service | 送达地点 | `sc_service_location` | Single Select | British Columbia, Elsewhere in Canada, United States, Outside Canada and United States, Not sure | Affects deemed-service rules and time to respond. |
| Method of Service | 送达方式 | `sc_service_method` | Single Select | Personal service, Lawyer acceptance, Registered mail, Email, Substitutional service, Other, Not sure | Service validity can determine whether the proceeding is properly before the court. |
| Proof of Service Available? | 是否有送达证明 | `sc_proof_service` | Single Select | Yes, No, Not sure | Missing proof of service is a common procedural risk. Flags `COURT_SERVICE_PROOF_MISSING` if No/Not sure. |
| Response Deadline Known? | 是否知道答辩期限 | `sc_response_deadline_known` | Single Select | Yes, No, Not sure | Confirms whether the deadline itself still needs to be established. |
| Response Deadline | 答辩截止日期 | `sc_response_deadline` | Date | — | Drives urgency and default-judgment risk. Flags `COURT_RESPONSE_DEADLINE_PASSED` / `COURT_RESPONSE_DEADLINE_URGENT` (≤7 days). |
| Application Hearing Date | 申请听证日期 | `sc_application_hearing_date` | Date | — | Controls preparation urgency for a scheduled application. |
| Injunction Requested? | 是否申请禁令 | `sc_injunction_requested` | Single Select | Yes, No, Not sure | Injunctions are time-sensitive and require a complete record. |
| Application Materials Received? | 是否收到申请材料 | `sc_application_materials` | Single Select | Complete, Partial, None, Not sure | Confirms whether the injunction/application record is complete. Flags `INJUNCTION_MATERIALS_INCOMPLETE`. |
| Multiple Plaintiffs? | 是否有多名原告 | `sc_multiple_plaintiffs` | Single Select | Yes, No, Not sure | Identifies additional parties relevant to the claim. |
| Multiple Defendants? | 是否有多名被告 | `sc_multiple_defendants` | Single Select | Yes, No, Not sure | Multiple defendants may raise conflict-of-interest and indemnity issues. |
| Number of Defendants | 被告人数 | `sc_defendant_count` | Number (min. 1) | — | Supports the multi-defendant conflict review. |
| Joint Representation Considered? | 是否考虑共同代理 | `sc_joint_representation` | Single Select | Yes, No, Not sure | One lawyer acting for multiple defendants requires a conflict check. Flags `MULTI_DEFENDANT_CONFLICT_REVIEW`. |
| Lawyer Retained? | 是否已经聘请律师 | `sc_lawyer_retained` | Single Select | Yes, No, Consultation booked, Not sure | Tracks representation status for next-step planning. |
| Insurance Notified? | 是否已通知保险公司 | `sc_insurer_notified` | Single Select | Yes, No, Not applicable, Not sure | Late notice to an insurer can jeopardize coverage. Flags `INSURER_NOT_NOTIFIED` if No. |
| Counterclaim Considered? | 是否考虑反诉 | `sc_counterclaim_considered` | Single Select | Yes, No, Not sure | Identifies a possible additional claim for professional review. |
| Third Party Claim Considered? | 是否考虑第三方诉讼 | `sc_third_party_claim` | Single Select | Yes, No, Not sure | Identifies a possible third party claim for professional review. |
| Expert Evidence Required? | 是否需要专家证据 | `sc_expert_evidence` | Multi Select | Engineering, Survey, Appraisal, Accounting, Medical, Construction, Other, Not sure | Identifies what expert evidence the claim may depend on. Flags `EXPERT_EVIDENCE_MISSING` if selected but no matching document is uploaded. |
| Immediate Safety or Preservation Issue? | 是否存在紧急安全或证据保全问题 | `sc_urgent_preservation_issue` | Single Select | Yes, No, Not sure | Identifies urgent physical or evidentiary risk. |
| Documents Preserved? | 是否已保全文件和电子记录 | `sc_litigation_hold` | Single Select | Yes, No, Partly, Not sure | Confirms whether a litigation hold is in place. Flags `LITIGATION_HOLD_REQUIRED`. |

## 3. `Development_Notes` — one optional row

| Area | Decision | Reason | V1 Scope |
|---|---|---|---|
| Supreme Court Extension | No new `Dispute_Reviews` columns; Supreme Court fields ride in the existing `Follow-up Answers` column (JSON tail after the human-readable text) | Keeps the 57-column schema untouched; matches the existing dynamic-follow-up pattern already used for RTB/CRT/Strata/Small Claims | Form 2 Working Draft is generated on demand and never persisted back to the sheet |

## 4. `Report_Sections` — no changes

The Supreme Court branch reuses all 15 existing sections; only the report **title** changes (`Preliminary Litigation Assessment Report` / `初步诉讼评估报告`), which is computed in code, not stored in this sheet.
