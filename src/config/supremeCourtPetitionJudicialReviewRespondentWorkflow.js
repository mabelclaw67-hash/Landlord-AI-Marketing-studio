// BC Supreme Court Petition / Judicial Review — Respondent Workflow (Case Navigator)
//
// Single source of truth for the guidance content shown by
// src/components/SupremeCourtPetitionCaseNavigator.jsx and the Stage 6-11
// workspace components. This is general legal information and
// document-organization guidance, not legal advice — see
// LEGAL_INFORMATION_NOTICE below.
//
// SC_PETITION_JR_RESPONDENT_V1 — structurally parallel to (but not copied
// from) supremeCourtCivilClaimDefendantWorkflow.js: a Petition is not a
// pleading-and-discovery action, it is answered with Form 67, evidence is
// affidavit-centred, and Judicial Review specifically reviews a statutory
// decision-maker's record rather than trying facts at trial. See "Why
// Petition / Judicial Review Is Not Civil Claim" in the handoff doc.
//
// v1 scope: English only (Chinese translation planned for a future update,
// matching the Civil Claim workflow's own v1 scope). Stage status is
// computed client-side from data already on the case record / workspace
// envelopes — nothing here is persisted directly by this file.

import {
  FORM_USAGE,
  STATUS_META,
  SUPREME_COURT_CIVIL_RULES_URL,
  SUPREME_COURT_FORMS_INDEX_URL,
} from "./supremeCourtCivilClaimDefendantWorkflow";

export { FORM_USAGE, STATUS_META, SUPREME_COURT_CIVIL_RULES_URL, SUPREME_COURT_FORMS_INDEX_URL };

export const LEGAL_INFORMATION_NOTICE =
  "This workflow provides general legal information and document-organization guidance for a respondent to a " +
  "BC Supreme Court Petition, including a Petition for Judicial Review. It is not legal advice and does not " +
  "replace advice from a qualified lawyer. It does not generate a filed-ready document, predict the outcome of " +
  "the petition, or evaluate legal merits. Court rules, forms, deadlines and practice requirements may change — " +
  "users and, where applicable, the court registry must verify current official requirements before relying on " +
  "anything shown here. (Guidance is currently available in English only; Chinese translation is planned for a " +
  "future update.)";

export const JUDICIAL_REVIEW_PROCEDURE_ACT_URL =
  "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96241_01";
const LAST_VERIFIED = "2026-07-26";

// ── Proceeding classification (Case Navigator config id: SC_PETITION_JR_RESPONDENT_V1) ──
// The canonical subtype list lives on the intake side as PJR_PROCEEDING_SUBTYPES
// (src/utils/disputeReview.js) so the follow-up question and this workflow
// never drift apart — re-exported here under a workflow-facing name.
export { PJR_PROCEEDING_SUBTYPES as PROCEEDING_BRANCHES } from "../utils/disputeReview";

// ── Official forms referenced by the stages below. Every entry is deliberately
// conservative: sourceUrl/ruleUrl point at the single official index/rules
// pages (not unstable per-form deep links — see the Civil Claim config for
// the same pattern), and confirmNote always states what still needs
// confirming and that the registry or a lawyer may need to confirm it. Do
// not treat any of these as asserted with certainty for a specific case —
// see checkForm67Eligibility / checkAffidavitDraftGate / checkApplicationResponseGate.
const RAW_FORMS = [
  {
    id: "form66",
    formNumber: "Form 66",
    name: "Petition to the Court",
    purpose: "The originating document that starts a petition proceeding, including a petition for judicial review, and sets out the orders sought.",
    sourceRule: "Rule 16-1 (petition proceedings); Judicial Review Procedure Act s.2 where the proceeding is a judicial review.",
    stageIds: ["identification"],
    usage: "commonly_used",
    confirmNote: "Confirm from the filed document itself (style of proceeding, registry, file number, and whether it invokes the Judicial Review Procedure Act) — do not assume from a party's description alone.",
  },
  {
    id: "form67",
    formNumber: "Form 67",
    name: "Response to Petition",
    purpose: "The respondent's formal response to a Petition, setting out the orders consented to, opposed, or on which no position is taken, and the factual and legal basis relied on.",
    sourceRule: "Rule 16-1(4)-(5); Rule 22-3 (form and content of documents).",
    stageIds: ["responsePlanning"],
    usage: "commonly_used",
    confirmNote: "A working draft can only be prepared once the Stage 5 eligibility gate is met (see checkForm67Eligibility) — confirm the filing deadline and any court-ordered timetable with the registry before relying on a provisional date.",
  },
  {
    id: "form32",
    formNumber: "Form 32",
    name: "Notice of Application",
    purpose: "Starts a court application within the petition proceeding, setting out what order is sought and on what grounds — may be brought by either the petitioner or the respondent.",
    sourceRule: "Rule 8-1.",
    stageIds: ["interlocutoryApplication"],
    usage: "conditional",
    confirmNote: "Do not assume this is always a respondent document — confirm which party is bringing the application and whether it responds to the petitioner's application or initiates the respondent's own.",
  },
  {
    id: "form33",
    formNumber: "Form 33",
    name: "Application Response",
    purpose: "The responding party's formal reply to a Notice of Application, indicating their position and any additional materials relied on.",
    sourceRule: "Rule 8-2.",
    stageIds: ["interlocutoryApplication"],
    usage: "conditional",
    confirmNote: "Confirm the application response deadline and hearing date with the registry — this workflow shows a provisional calculation only, never a conclusive one.",
  },
  {
    id: "form34",
    formNumber: "Form 34",
    name: "Requisition",
    purpose: "A general-purpose form used to ask the registry to take a procedural step, including setting a hearing date for a petition or application.",
    sourceRule: "Rule 8-1; Rule 16-1; registry practice directions.",
    stageIds: ["interlocutoryApplication", "hearingReadiness"],
    usage: "conditional",
    confirmNote: "The correct procedural use of a Requisition varies by registry and hearing type — confirm current practice with the registry.",
  },
  {
    id: "form35",
    formNumber: "Form 35",
    name: "Notice of Hearing / Order Made After Application",
    purpose: "Either notifies parties of a scheduled hearing, or records the court's order after an application or petition hearing, depending on registry practice and context.",
    sourceRule: "Rule 8-1; Rule 13-1 (orders).",
    stageIds: ["hearingReadiness", "finalOrder"],
    usage: "conditional",
    confirmNote: "Form 35 is used differently across registries and stages of a petition — confirm the specific form and version required for this hearing or order with the registry before relying on it.",
  },
  {
    id: "orderForm",
    formNumber: "Applicable Order Form",
    name: "Order Made After Petition Hearing",
    purpose: "The formal, signed record of what the court ordered after hearing the petition. The exact form and template depend on the relief granted and registry practice.",
    sourceRule: "Rule 13-1 (orders); Rule 22-3 (form requirements).",
    stageIds: ["finalOrder"],
    usage: "conditional",
    confirmNote: "Do not assume a specific form number — the applicable order form depends on the actual relief granted. Confirm the correct template and entry procedure with the registry or a lawyer.",
  },
  {
    id: "form109",
    formNumber: "Form 109",
    name: "Affidavit",
    purpose: "The general sworn-statement form used to put evidence before the court in writing — the primary evidentiary vehicle in petition proceedings.",
    sourceRule: "Rule 22-2 (affidavits); Rule 22-3 (form requirements).",
    stageIds: ["evidenceAffidavitPlan", "affidavitDraft", "interlocutoryApplication"],
    usage: "commonly_used",
    confirmNote: "Only the affiant can confirm the facts sworn to. A working draft here is never a substitute for the affiant's own review — see the Stage 7 gate.",
  },
  {
    id: "form16",
    formNumber: "Form 16",
    name: "Affidavit of Ordinary Service",
    purpose: "Sworn proof that a document was served by an accepted method other than personal service (e.g. mail, email where permitted).",
    sourceRule: "Service rules applicable to petitions, applications, affidavits and orders; Rule 4-3 (address for service) where applicable.",
    stageIds: ["serviceReview", "interlocutoryApplication"],
    usage: "conditional",
    confirmNote: "Confirm the method of service actually used was an accepted method for this document and this party before relying on this form.",
  },
];

export const FORMS = RAW_FORMS.map((form) => ({
  ...form,
  sourceUrl: SUPREME_COURT_FORMS_INDEX_URL,
  ruleUrl: SUPREME_COURT_CIVIL_RULES_URL,
  lastVerified: LAST_VERIFIED,
}));

export function getFormsForStage(stageId) {
  return FORMS.filter((form) => form.stageIds.includes(stageId));
}

// ── The 11 Petition / Judicial Review Respondent workflow stages ───────────
export const WORKFLOW_STAGES = [
  {
    id: "identification",
    number: 1,
    title: "Proceeding Identification",
    summary: "Confirm this is a Petition, classify the proceeding, and map the parties and relief requested.",
    conditional: false,
    whatItMeans:
      "Before anything else, confirm the received document is actually a Petition (not a Notice of Civil Claim or a tribunal notice), determine whether it is a Judicial Review or another kind of petition, and record the respondent's role.",
    whenItHappens:
      "As soon as a Petition is received or uploaded, before any working draft is prepared.",
    prepare: [
      "The filed Petition (Form 66) and any attached materials.",
      "Confirmation of the style of proceeding, registry, and court file number.",
      "A first read of Part 1 to see what orders are actually being asked for.",
      "Identification of every other party named as a respondent.",
    ],
    completionChecklist: [
      "Proceeding classification recorded (see PROCEEDING_BRANCHES).",
      "Petitioner / respondent / decision-maker map recorded.",
      "Relief-request inventory started from Part 1.",
      "Any urgent-risk flags (stay, injunction, short timeline) identified.",
    ],
    cautions: [
      "Do not assume every Petition is a Judicial Review — confirm from the document itself.",
      "Do not assume every Judicial Review challenges an RTB decision — the decision-maker must be confirmed.",
      "A Form 67 working draft is not available yet at this stage — see Stage 5.",
    ],
  },
  {
    id: "serviceReview",
    number: 2,
    title: "Service and Response Deadline Review",
    summary: "Record how and when the Petition was served, and calculate a provisional (not conclusive) response deadline.",
    conditional: false,
    whatItMeans:
      "Records when, where, and how service occurred, flags incomplete or disputed service, and calculates a provisional response period from the applicable Rule — always shown with its triggering event, assumptions, and a registry-confirmation warning.",
    whenItHappens:
      "Immediately after Stage 1, and again whenever new service information is confirmed.",
    prepare: [
      "The date, location, and method of service actually used.",
      "Any proof of service already received (e.g. Form 16).",
      "Any court-ordered timetable that might override a standard period.",
    ],
    completionChecklist: [
      "Service analysis recorded (date, location, method).",
      "Provisional deadline calculated with stated assumptions.",
      "Deadline confidence and registry-confirmation warning shown.",
      "Immediate action list reviewed if deadline risk is high.",
    ],
    cautions: [
      "This system never states a deadline is conclusively correct — the registry or a lawyer must confirm it.",
      "Disputed or incomplete service can change the applicable deadline entirely.",
      "A court order or special enactment may override the standard Rules-based period.",
    ],
  },
  {
    id: "petitionReliefAnalysis",
    number: 3,
    title: "Petition and Relief Analysis",
    summary: "Break down each order requested in Part 1 into a paragraph-by-paragraph relief and position matrix.",
    conditional: false,
    whatItMeans:
      "Each order requested in Part 1 of the Petition is classified as consent, oppose, no position, or unclear/manual review, alongside the petitioner's stated factual and legal basis and which issues appear to need affidavit evidence.",
    whenItHappens:
      "After service is reviewed, and before Judicial Review Screening or Response Planning.",
    prepare: [
      "Part 1 of the Petition, paragraph by paragraph.",
      "Any supporting materials the petitioner has already filed.",
      "A first sense of which orders can be conceded and which are contested.",
    ],
    completionChecklist: [
      "Paragraph-by-paragraph relief matrix built (see makeReliefMatrixRow).",
      "Issue matrix identifying what needs affidavit evidence.",
      "Response-position matrix (consent / oppose / no position / unclear) assigned.",
      "Missing-information list reviewed.",
    ],
    cautions: [
      "This matrix does not decide jurisdictional or procedural issues — it only flags them for review.",
      "An 'unclear / manual review' position must not be silently defaulted to oppose or consent.",
    ],
  },
  {
    id: "jrScreening",
    number: 4,
    title: "Judicial Review Screening",
    summary: "Only activates for Judicial Review — screens the decision, decision-maker, record, and possible issue categories.",
    conditional: true,
    whatItMeans:
      "Identifies the decision under review, the decision-maker, the enabling statute, whether reasons and the tribunal record are available, the remedy sought, and whether interim relief or a stay is requested. Screening categories (procedural fairness, jurisdiction, statutory interpretation, reasonableness, correctness, bias, failure to consider evidence, inadequate reasons, unauthorized exercise of statutory power, delay/alternate remedy/discretionary relief) are labels for issues that may be raised — never a conclusion that a legal standard has been met.",
    whenItHappens:
      "Only when Stage 1 classification indicates Judicial Review, or a proceeding subtype reasonably suggests it.",
    prepare: [
      "The decision under review and the reasons, if received.",
      "The enabling statute or authority the decision-maker acted under.",
      "Whether the tribunal record has been requested or received.",
      "Any notice issues involving the decision-maker or the Attorney General.",
    ],
    completionChecklist: [
      "Decision-maker and decision under review recorded.",
      "Reasons and tribunal record availability recorded.",
      "Remedy sought, interim relief, and stay flags recorded.",
      "Screening issue categories reviewed (flags only, not conclusions).",
    ],
    cautions: [
      "The system does not conclude that a legal standard (e.g. reasonableness, procedural fairness) has been satisfied.",
      "Distinguish facts from legal grounds — do not let argument masquerade as fact in the record.",
    ],
  },
  {
    id: "responsePlanning",
    number: 5,
    title: "Response to Petition Planning",
    summary: "Map relief positions into a working Form 67 structure once the eligibility gate is met.",
    conditional: false,
    whatItMeans:
      "Maps Petition Part 1 paragraph numbers into orders consented to, opposed, or on which no position is taken, organizes the factual and legal basis, and identifies supporting affidavits — feeding a gated Form 67 working draft.",
    whenItHappens:
      "After the relief matrix (Stage 3) and, where applicable, Judicial Review Screening (Stage 4) are underway.",
    prepare: [
      "The completed relief and position matrix from Stage 3.",
      "The factual basis for each opposed or no-position order.",
      "The legal basis, where known, for each opposed order.",
      "Which affidavits will support the response.",
    ],
    completionChecklist: [
      "Form 67 eligibility checked (see checkForm67Eligibility).",
      "Form 67 completion checklist reviewed.",
      "Working-draft data structure populated.",
      "Unresolved legal/factual questions listed.",
    ],
    cautions: [
      "No Form 67 output may be labelled final, filed, or court-ready — only 'Working Draft — Requires Human Review'.",
      "The working draft preserves the official form structure and clearly marks placeholders — it does not invent content.",
    ],
  },
  {
    id: "evidenceAffidavitPlan",
    number: 6,
    title: "Evidence and Affidavit Plan",
    summary: "Build the respondent's evidence inventory, map it to disputed relief, and plan affidavit witnesses and exhibits.",
    conditional: false,
    whatItMeans:
      "Separates evidence from argument, maps evidence to disputed relief and factual issues, identifies the appropriate proposed affidavit witness(es), exhibit requirements, and flags inadmissibility, hearsay, confidentiality, or translation issues for manual review.",
    whenItHappens:
      "Alongside or after Response Planning, before any affidavit working draft is started.",
    prepare: [
      "All documents and records relevant to the disputed relief.",
      "A first list of who could give sworn evidence on each issue.",
      "Any documents needing translation or redaction.",
    ],
    completionChecklist: [
      "Evidence inventory built by category (see EVIDENCE_CATEGORIES).",
      "Evidence-to-issue map completed.",
      "Affidavit witness matrix drafted (not yet one affidavit per witness assumed).",
      "Missing-evidence and authenticity/foundation concerns listed.",
    ],
    cautions: [
      "Do not merge all witnesses into one affidavit by default — each affiant swears only to their own knowledge.",
      "Do not automatically draft affidavits merely because evidence exists — see the Stage 7 gate.",
    ],
  },
  {
    id: "affidavitDraft",
    number: 7,
    title: "Affidavit Working Draft Route",
    summary: "Only activates once an affiant, purpose, evidence, and exhibits are identified — produces an unsigned outline, never invented facts.",
    conditional: true,
    whatItMeans:
      "Produces an affidavit preparation checklist, proposed outline, exhibit index, and contradiction/date-conflict warnings, plus an optional Form 109 working draft, always labelled 'Unsigned Working Draft — Facts Must Be Verified by the Affiant'.",
    whenItHappens:
      "Only once checkAffidavitDraftGate is satisfied for a specific affiant.",
    prepare: [
      "The identified affiant and their relationship to the facts.",
      "The verified evidence list and exhibit assignment for that affiant.",
      "Source-document references for every fact the affidavit will contain.",
    ],
    completionChecklist: [
      "Affiant, purpose, and source facts confirmed.",
      "Exhibits assigned and indexed.",
      "Chronology/date conflicts reviewed.",
      "Affiant has acknowledged factual verification responsibility.",
    ],
    cautions: [
      "The system must never invent dates, conversations, personal knowledge, service events, document receipt, exhibit descriptions, or legal conclusions.",
      "An affidavit contains evidence, not legal argument — keep the two separated.",
    ],
  },
  {
    id: "interlocutoryApplication",
    number: 8,
    title: "Interlocutory Application / Stay / Injunction",
    summary: "Only activates when an application, stay, or injunction is in play — routes to the correct subroute for that situation.",
    conditional: true,
    whatItMeans:
      "Covers responding to the petitioner's application, the respondent bringing their own application, a stay application, an injunction response, procedural directions, an extension of time, production of the tribunal record, an adjournment, or another matter requiring manual review.",
    whenItHappens:
      "Whenever a Notice of Application exists, interim relief or a stay/injunction is requested, or a court order requires a procedural application.",
    prepare: [
      "The Notice of Application or the terms of the application to be brought.",
      "The hearing date, if known, and the filing/service timetable.",
      "The orders sought and the supporting affidavits.",
    ],
    completionChecklist: [
      "Application subroute identified (see INTERLOCUTORY_SUBROUTES).",
      "Form 32 / Form 33 applicability analysis reviewed.",
      "Evidentiary requirements and hearing-date/filing timetable reviewed.",
      "Urgency flag reviewed if applicable.",
    ],
    cautions: [
      "Do not assume Form 32 is always a respondent document — confirm which party is applying.",
      "This system does not generate an injunction or stay merits opinion.",
    ],
  },
  {
    id: "hearingReadiness",
    number: 9,
    title: "Hearing Readiness",
    summary: "Checks whether the Petition is ready to be set or heard — a readiness tool, not a prediction of success.",
    conditional: false,
    whatItMeans:
      "Identifies outstanding affidavits, outstanding service, application results, incomplete tribunal records, and unresolved objections, and organizes the hearing issues into a readiness score and task list.",
    whenItHappens:
      "Once Response Planning, Evidence/Affidavit Plan, and any Interlocutory Application route are substantially resolved.",
    prepare: [
      "A current list of all filed materials (Petition, Response, affidavits, applications, orders).",
      "Confirmation of the tribunal record status, if this is a Judicial Review.",
      "Any unresolved evidentiary or procedural objections.",
    ],
    completionChecklist: [
      "Hearing-readiness checklist reviewed (see HEARING_READINESS_CHECKLIST_ITEMS).",
      "Evidence, service, and order status reviewed.",
      "Hearing-date status and estimated hearing length recorded.",
    ],
    cautions: [
      "A high readiness score is an organizational signal only — it does not predict the outcome of the hearing.",
    ],
  },
  {
    id: "hearingBinder",
    number: 10,
    title: "Hearing Binder and Submission Plan",
    summary: "A guided binder plan built only from materials actually filed or generated — never a fictional or unfiled document.",
    conditional: false,
    whatItMeans:
      "Organizes the hearing binder into standard sections (see BINDER_SECTIONS), separates authorities from evidence, maps oral submissions to the filed record, and prevents unfiled evidence from silently entering the hearing package.",
    whenItHappens:
      "Once Hearing Readiness is substantially complete and a hearing date is known or the binder is explicitly marked preliminary.",
    prepare: [
      "The confirmed list of filed documents (Petition, Response, affidavits, applications, orders).",
      "The tribunal decision and record, if applicable.",
      "A chronology and an issue/relief matrix summary.",
    ],
    completionChecklist: [
      "Binder index generated from verified filed/generated documents only.",
      "Missing-document and duplicate-document warnings reviewed.",
      "Authorities checklist and oral-submission framework reviewed.",
      "Draft-order checklist reviewed.",
    ],
    cautions: [
      "Do not generate a binder containing documents that are not actually present.",
      "If PDF assembly is used, it must only assemble verified uploaded or generated files.",
    ],
  },
  {
    id: "finalOrder",
    number: 11,
    title: "Final Order and Post-Decision",
    summary: "Records what occurred at the hearing, tracks the entered order, and flags compliance and possible appeal issues for legal review.",
    conditional: false,
    whatItMeans:
      "Records the outcome, oral or written reasons, the entered order and its service, compliance tasks, cost consequences, and possible appeal, reconsideration, or enforcement issues requiring legal review.",
    whenItHappens:
      "After the hearing has occurred and an outcome or order exists.",
    prepare: [
      "The oral or written reasons, if released.",
      "The entered order once available.",
      "Any costs award and compliance deadlines.",
    ],
    completionChecklist: [
      "Outcome summary and order-status tracker recorded.",
      "Compliance and service checklist reviewed.",
      "Appeal/legal-advice warning reviewed if a deadline may apply.",
      "Case-closeout checklist and archive package reviewed.",
    ],
    cautions: [
      "Appeal deadlines are never calculated conclusively without a verified order date, reasons date, and the applicable legislation — get legal advice promptly.",
      "Enforcement and reconsideration procedures are outside this workflow's scope — see a lawyer.",
    ],
  },
];

// ── Stage 3 / 5 — Relief and Position Matrix ────────────────────────────────
// Persisted inside the existing "AI Analysis JSON" envelope's
// petitionReliefMatrix key — see apps-script/DisputePetitionRelief.gs.

export const RELIEF_MATRIX_NOTICE =
  "This workspace organizes each order requested in Part 1 of the Petition and the respondent's position on it. " +
  "It does not decide jurisdictional or procedural issues, evaluate legal merits, or determine what position to " +
  "take. Those issues may require review by a qualified lawyer.";

export const RELIEF_POSITIONS = ["Consent", "Oppose", "No Position", "Unclear / Manual Review"];

export const RELIEF_MATRIX_ROW_STATUSES = [
  "Not Yet Reviewed",
  "Position Assigned",
  "Factual Basis Added",
  "Affidavit Identified",
  "Ready for Review",
  "Reviewed",
];

export function makeReliefMatrixRow(overrides = {}) {
  return {
    id: overrides.id || `relief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    paragraphNumber: null,
    orderSought: "",
    petitionerFactualBasis: "",
    petitionerLegalBasis: "",
    respondentPosition: "Unclear / Manual Review",
    factualBasis: "",
    legalBasis: "",
    needsAffidavitEvidence: false,
    linkedAffidavitWitnessIds: [],
    status: "Not Yet Reviewed",
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function reliefMatrixSummary(rows) {
  const list = rows || [];
  return {
    total: list.length,
    consent: list.filter((r) => r.respondentPosition === "Consent").length,
    oppose: list.filter((r) => r.respondentPosition === "Oppose").length,
    noPosition: list.filter((r) => r.respondentPosition === "No Position").length,
    unclear: list.filter((r) => r.respondentPosition === "Unclear / Manual Review").length,
    needsAffidavit: list.filter((r) => r.needsAffidavitEvidence).length,
  };
}

// ── Stage 4 — Judicial Review Screening ─────────────────────────────────────
// Persisted inside the existing "AI Analysis JSON" envelope's jrScreening key
// — see apps-script/DisputePetitionRelief.gs (shares a file with the relief
// matrix; both are Stage-3/4 companions and both are lightweight singleton
// objects rather than flat lists).

export const JR_SCREENING_NOTICE =
  "This workspace screens for possible judicial review issue categories. It labels issues for review only — it " +
  "does not conclude that a legal standard (such as reasonableness, correctness, or procedural fairness) has " +
  "been met or not met. Those conclusions require legal analysis.";

export const JR_ISSUE_CATEGORIES = [
  "Procedural Fairness",
  "Jurisdiction",
  "Statutory Interpretation",
  "Reasonableness",
  "Correctness",
  "Bias or Reasonable Apprehension of Bias",
  "Failure to Consider Evidence",
  "Inadequate Reasons",
  "Unauthorized Exercise of Statutory Power",
  "Delay, Alternate Remedy, or Discretionary Relief",
];

export const TRIBUNAL_RECORD_STATUSES = ["Available", "Requested", "Not Yet Requested", "Not Applicable", "Not Sure"];
export const AG_NOTICE_STATUSES = ["Required", "Given", "Not Required", "Not Sure"];

export function makeJrScreening(overrides = {}) {
  return {
    version: 1,
    isJudicialReview: "Not Sure",
    decisionMaker: "",
    decisionUnderReview: "",
    enablingStatute: "",
    decisionDate: "",
    reasonsReceivedDate: "",
    reasonsAvailable: "Not Sure",
    tribunalRecordStatus: "Not Yet Requested",
    remedySought: "",
    interimReliefRequested: "Not Sure",
    stayRequested: "Not Sure",
    agNoticeStatus: "Not Sure",
    noticeIssuesNotes: "",
    issueFlags: {},
    factsVsGroundsNotes: "",
    updatedAt: "",
    ...overrides,
  };
}

// ── Stage 6 — Evidence and Affidavit Plan ───────────────────────────────────
// Persisted inside the existing "AI Analysis JSON" envelope's
// evidenceAffidavitPlan key — see apps-script/DisputePetitionEvidence.gs.

export const EVIDENCE_AFFIDAVIT_PLAN_NOTICE =
  "This workspace organizes the respondent's evidence inventory and affidavit plan. It does not determine " +
  "admissibility, privilege, hearsay, or litigation strategy, and it does not draft affidavits automatically. " +
  "Those issues may require review by a qualified lawyer.";

export const EVIDENCE_AFFIDAVIT_PLAN_CAUTIONS = [
  "Preserve original files — do not alter, annotate, or discard them.",
  "A document flagged 'Potential Admissibility Concern' is a reviewer flag only, requiring legal confirmation.",
  "Do not merge multiple witnesses' knowledge into a single affidavit by default.",
  "Confidential or sensitive exhibits may need redaction before filing — flag them here, do not redact automatically.",
];

export const EVIDENCE_CATEGORIES = [
  "Originating Petition",
  "Petitioner Affidavits",
  "Decision Under Review",
  "Reasons for Decision",
  "Tribunal Record",
  "Correspondence",
  "Contracts or Agreements",
  "Notices",
  "Photographs",
  "Video or Audio",
  "Financial Records",
  "Expert Reports",
  "Government or Tribunal Records",
  "Service Records",
  "Prior Orders",
  "Chronology Documents",
  "Other",
];

export const AFFIDAVIT_WITNESS_ROLES = [
  "Respondent (Personal Knowledge)",
  "Employee or Agent of Respondent",
  "Third-Party Witness",
  "Records Custodian",
  "Not Yet Determined",
];

export const EVIDENCE_ITEM_STATUSES = ["Identified", "Exhibit Assigned", "Confidentiality Reviewed", "Translation Needed", "Ready for Review"];

export function makeEvidenceItem(overrides = {}) {
  return {
    id: overrides.id || `pjrev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    evidenceCategory: "Other",
    sourceDocumentReference: "",
    date: "",
    linkedReliefRowIds: [],
    exhibitLabel: "",
    admissibilityConcern: false,
    admissibilityNotes: "",
    confidentialityFlag: false,
    translationRequired: false,
    status: "Identified",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeAffidavitWitness(overrides = {}) {
  return {
    id: overrides.id || `witness-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    roleDescription: "Not Yet Determined",
    factualPurpose: "",
    sourceEvidenceIds: [],
    exhibitIndex: [],
    verificationAcknowledged: false,
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function evidenceAffidavitPlanSummary(evidenceItems, witnesses) {
  const items = evidenceItems || [];
  const list = witnesses || [];
  return {
    totalEvidence: items.length,
    admissibilityConcerns: items.filter((e) => e.admissibilityConcern).length,
    translationNeeded: items.filter((e) => e.translationRequired).length,
    exhibitsAssigned: items.filter((e) => e.exhibitLabel).length,
    totalWitnesses: list.length,
    witnessesReady: list.filter((w) => w.verificationAcknowledged && w.factualPurpose).length,
  };
}

// ── Stage 7 — Affidavit Working Draft Gate ──────────────────────────────────

export const AFFIDAVIT_DRAFT_LABEL = "Unsigned Working Draft — Facts Must Be Verified by the Affiant";

export function checkAffidavitDraftGate(witness) {
  const missing = [];
  if (!witness) return { eligible: false, missing: ["No affiant selected."] };
  if (!witness.roleDescription || witness.roleDescription === "Not Yet Determined") missing.push("Affiant not identified.");
  if (!witness.factualPurpose) missing.push("Factual purpose not defined.");
  if (!Array.isArray(witness.sourceEvidenceIds) || witness.sourceEvidenceIds.length === 0) missing.push("No verified evidence linked to this affiant.");
  if (!Array.isArray(witness.exhibitIndex) || witness.exhibitIndex.length === 0) missing.push("No exhibits assigned.");
  if (!witness.verificationAcknowledged) missing.push("Affiant has not acknowledged factual-verification responsibility.");
  return { eligible: missing.length === 0, missing };
}

// ── Stage 8 — Interlocutory Application / Stay / Injunction ────────────────
// Persisted inside the existing "AI Analysis JSON" envelope's
// petitionApplications key — see apps-script/DisputePetitionApplications.gs.
// Re-uses computeApplicationTiming (pure date math, no petition-specific
// assumptions) from the Civil Claim config rather than duplicating it.

export { computeApplicationTiming } from "./supremeCourtCivilClaimDefendantWorkflow";

export const INTERLOCUTORY_NOTICE =
  "This workspace helps organize preparation for interlocutory applications, stays, and injunctions arising " +
  "within the petition. It does not determine whether an application should be brought, what relief to " +
  "request, or whether materials are legally sufficient. Those issues may require review by a qualified lawyer.";

export const INTERLOCUTORY_CAUTIONS = [
  "Application and response deadlines within a petition can be short — confirm them as soon as an application is contemplated or received.",
  "Urgent stay or injunction applications may require an immediate response — do not wait to seek legal advice.",
  "This system does not generate a stay or injunction merits opinion.",
  "Confirm which party is bringing a given application before assuming a form's role.",
];

export const INTERLOCUTORY_SUBROUTES = [
  "Responding to Petitioner's Application",
  "Respondent Bringing an Application",
  "Stay Application",
  "Injunction Response",
  "Procedural Directions",
  "Extension of Time",
  "Production of Record",
  "Adjournment",
  "Other / Manual Review",
];

export const INTERLOCUTORY_STATUSES = [
  "Not Yet Started",
  "Anticipated",
  "Materials in Preparation",
  "Filed",
  "Served",
  "Response Received",
  "Scheduled",
  "Heard",
  "Decided",
  "Withdrawn",
  "Not Applicable",
];

export const INTERLOCUTORY_TERMINAL_STATUSES = ["Decided", "Withdrawn", "Not Applicable"];

export function makeInterlocutoryApplication(overrides = {}) {
  return {
    id: overrides.id || `iapp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    subroute: "Other / Manual Review",
    status: "Not Yet Started",
    reliefSought: "",
    groundsSummary: "",
    hearingDate: "",
    filingDeadline: "",
    serviceDeadline: "",
    noticeOfApplicationFiled: false,
    applicationResponseFiled: false,
    affidavitsNeeded: false,
    draftOrderNeeded: false,
    urgent: false,
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function interlocutoryApplicationsSummary(applications) {
  const list = applications || [];
  return {
    total: list.length,
    urgent: list.filter((a) => a.urgent && !INTERLOCUTORY_TERMINAL_STATUSES.includes(a.status)).length,
    active: list.filter((a) => !INTERLOCUTORY_TERMINAL_STATUSES.includes(a.status)).length,
    decided: list.filter((a) => a.status === "Decided").length,
  };
}

// ── Stage 9 — Hearing Readiness ─────────────────────────────────────────────

export const HEARING_READINESS_NOTICE =
  "This checklist is an organizational readiness tool. It does not predict the outcome of the hearing or " +
  "evaluate the strength of either party's position.";

export const HEARING_READINESS_CHECKLIST_ITEMS = [
  { id: "responseFiled", label: "Response to Petition (Form 67) filed" },
  { id: "affidavitsOutstanding", label: "Outstanding affidavits identified and resolved" },
  { id: "serviceComplete", label: "Service confirmed complete for all filed materials" },
  { id: "applicationsResolved", label: "Interlocutory application results resolved" },
  { id: "tribunalRecordComplete", label: "Tribunal record complete (if Judicial Review)" },
  { id: "objectionsResolved", label: "Evidentiary or procedural objections resolved" },
  { id: "hearingDateConfirmed", label: "Hearing date confirmed" },
  { id: "hearingLengthEstimated", label: "Estimated hearing length recorded" },
  { id: "lawyerReviewConsidered", label: "Limited-scope lawyer review considered" },
];

// ── Stage 10 — Hearing Binder and Submission Plan ───────────────────────────
// Persisted inside the existing "AI Analysis JSON" envelope's
// petitionGuidance.hearingBinder key — see apps-script/DisputePetitionGuidance.gs.

export const HEARING_BINDER_NOTICE =
  "This binder plan only includes materials that have actually been filed or generated in this system. It " +
  "does not create or assume the existence of documents that are not present.";

export const BINDER_SECTIONS = [
  "Cover and Style of Proceeding",
  "Table of Contents",
  "Petition",
  "Response to Petition",
  "Petitioner Affidavits",
  "Respondent Affidavits",
  "Exhibits or Referenced Filed Documents",
  "Interlocutory Applications and Responses",
  "Relevant Entered Orders",
  "Tribunal Decision and Record",
  "Chronology",
  "Issue and Relief Matrix",
  "Authorities List",
  "Draft Order",
  "Oral-Submission Outline",
  "Registry or Judge-Specific Materials",
];

export const BINDER_CHECKLIST_ITEMS = [
  { id: "hearingDateKnown", label: "Hearing date known (or binder marked preliminary)" },
  { id: "filedDocumentListConfirmed", label: "Filed document list confirmed" },
  { id: "affidavitsIdentified", label: "Affidavits identified" },
  { id: "applicationsOrdersIdentified", label: "Applications and orders identified" },
  { id: "duplicateCheckCompleted", label: "Duplicate-document check completed" },
  { id: "missingDocumentWarningAccepted", label: "Missing-document warning reviewed and accepted" },
  { id: "authoritiesListed", label: "Authorities listed separately from evidence" },
  { id: "paginationPlanned", label: "Page-numbering plan prepared" },
  { id: "oralSubmissionOutlined", label: "Oral-submission outline prepared" },
  { id: "draftOrderChecked", label: "Draft-order checklist reviewed" },
];

export function makeBinderState(overrides = {}) {
  return {
    version: 1,
    preliminary: true,
    sections: {},
    // Free-text, one confirmed filed/generated document per line — the
    // admin's own attestation of what is actually present, never inferred.
    // Feeds buildHearingBinderIndexDraft so the generated index only ever
    // lists what was explicitly confirmed here.
    confirmedDocumentsText: "",
    missingDocumentWarningAccepted: false,
    checklist: {},
    notes: "",
    updatedAt: "",
    ...overrides,
  };
}

// Minimum requirements for the Hearing Binder gate (spec §7). Returns which
// requirements are still unmet — never silently assembles a binder.
export function checkHearingBinderGate(binderState) {
  const missing = [];
  const checklist = binderState?.checklist || {};
  if (!checklist.filedDocumentListConfirmed || checklist.filedDocumentListConfirmed === "Not Started") missing.push("Filed document list not confirmed.");
  if (!checklist.affidavitsIdentified || checklist.affidavitsIdentified === "Not Started") missing.push("Affidavits not identified.");
  if (!checklist.applicationsOrdersIdentified || checklist.applicationsOrdersIdentified === "Not Started") missing.push("Applications and orders not identified.");
  if (!checklist.duplicateCheckCompleted || checklist.duplicateCheckCompleted === "Not Started") missing.push("Duplicate-document check not completed.");
  if (!binderState?.missingDocumentWarningAccepted) missing.push("Missing-document warning not yet accepted.");
  return { eligible: missing.length === 0, missing };
}

// ── Stage 11 — Final Order and Post-Decision ────────────────────────────────
// Persisted inside the existing "AI Analysis JSON" envelope's
// petitionGuidance.finalOrder key — see apps-script/DisputePetitionGuidance.gs.

export const FINAL_ORDER_NOTICE =
  "This checklist tracks what occurred at the hearing and the entered order. It does not calculate an appeal " +
  "deadline conclusively, and appeal, reconsideration, or enforcement questions should be reviewed by a lawyer.";

export const FINAL_ORDER_CHECKLIST_ITEMS = [
  { id: "outcomeRecorded", label: "Outcome recorded" },
  { id: "reasonsReceived", label: "Oral or written reasons received" },
  { id: "orderEntered", label: "Entered order confirmed" },
  { id: "orderServed", label: "Entered order served" },
  { id: "complianceTasksIdentified", label: "Compliance tasks identified" },
  { id: "costsOutcomeRecorded", label: "Costs consequences recorded" },
  { id: "appealDeadlineFlagged", label: "Possible appeal/reconsideration deadline flagged for legal review" },
  { id: "enforcementIssueIdentified", label: "Enforcement issue identified, if any" },
  { id: "caseCloseoutReviewed", label: "Case closeout checklist reviewed" },
];

export const LATE_STAGE_CHECKLIST_STATUSES = ["Not Started", "In Progress", "Completed", "Not Applicable"];

// Shared checklist-driven guidance model for Stages 4 (JR Screening
// checklist companion), 9, 10, and 11 — deliberately one shared shape/status
// rule (mirrors deriveLateStageStatus in the Civil Claim config) so a single
// PetitionGuidanceWorkspace component can render all of them instead of four
// bespoke components.
export const PETITION_GUIDANCE_CHECKLIST_ITEMS = {
  hearingReadiness: HEARING_READINESS_CHECKLIST_ITEMS,
  hearingBinder: BINDER_CHECKLIST_ITEMS,
  finalOrder: FINAL_ORDER_CHECKLIST_ITEMS,
};

function makeGuidanceSubState(overrides = {}) {
  return { status: "not_started", checklist: {}, notes: "", updatedAt: "", ...overrides };
}

export function makePetitionGuidance(overrides = {}) {
  return {
    version: 1,
    hearingReadiness: makeGuidanceSubState(overrides.hearingReadiness),
    hearingBinder: makeGuidanceSubState(overrides.hearingBinder),
    finalOrder: makeGuidanceSubState(overrides.finalOrder),
  };
}

export function deriveGuidanceStatus(stageId, checklist) {
  const items = PETITION_GUIDANCE_CHECKLIST_ITEMS[stageId] || [];
  const map = checklist || {};
  const touched = items.some((item) => map[item.id] && map[item.id] !== "Not Started");
  if (!touched) return "not_started";
  const allResolved = items.every((item) => ["Completed", "Not Applicable"].includes(map[item.id]));
  return allResolved ? "completed" : "in_progress";
}

// ── Stage 5 — Form 67 Working Draft Gate ────────────────────────────────────

export const FORM67_DRAFT_LABEL = "Form 67 Working Draft — Requires Human Review";

export function checkForm67Eligibility(review, reliefRows) {
  const missing = [];
  if (!review?.["Uploaded Files"] && !(review?.uploadedFiles?.length)) missing.push("Petition not uploaded.");
  if (!review?.["Court Registry"] && !review?.followUpAnswers?.sc_registry) missing.push("Registry not identified.");
  if (!review?.["Court File Number"] && !review?.followUpAnswers?.sc_court_file_number) missing.push("Court file number not identified.");
  const rows = reliefRows || [];
  if (rows.length === 0) missing.push("Part 1 requested orders not extracted or manually entered.");
  const unassigned = rows.filter((r) => !r.respondentPosition || r.respondentPosition === "Unclear / Manual Review");
  if (rows.length > 0 && unassigned.length === rows.length) missing.push("No respondent position assigned to any requested order yet.");
  // Only an opposed order needs its own factual basis to answer with —
  // "No Position" and "Consent" legitimately require none.
  const noFactualBasis = rows.filter((r) => r.respondentPosition === "Oppose" && !r.factualBasis);
  if (noFactualBasis.length > 0) missing.push(`Factual basis missing for ${noFactualBasis.length} opposed order(s).`);
  return { eligible: missing.length === 0, missing };
}

// ── Stage 8 — Application Response Gate ─────────────────────────────────────

export function checkApplicationResponseGate(application) {
  const missing = [];
  if (!application) return { eligible: false, missing: ["No application selected."] };
  if (!application.title && !application.reliefSought) missing.push("Notice of Application not uploaded or application terms not entered.");
  if (!application.reliefSought) missing.push("Orders sought not identified.");
  if (!application.reviewerNotes && application.status === "Not Yet Started") missing.push("Respondent position not yet entered.");
  return { eligible: missing.length === 0, missing };
}

// ── Overall workflow progress ───────────────────────────────────────────────

const STAGE_ORDER = WORKFLOW_STAGES.map((stage) => stage.id);

// Derives every stage's status from workspace data already captured by this
// case's envelope siblings — nothing is persisted here. Mirrors
// getWorkflowProgress in the Civil Claim config but with Petition/JR-specific
// stage semantics (see WORKFLOW_STAGES above for why the stage list differs).
export function getWorkflowProgress(review, reliefMatrix, jrScreening, form67Eligibility, evidenceAffidavitPlan, interlocutoryApplications, petitionGuidance) {
  const progress = {};

  progress.identification = "completed";
  progress.serviceReview = review?.["Status"] === "Intake Incomplete" ? "not_started" : "completed";

  const reliefRows = reliefMatrix?.rows || [];
  if (reliefRows.length === 0) {
    progress.petitionReliefAnalysis = "not_started";
  } else {
    const allResolved = reliefRows.every((r) => r.respondentPosition && r.respondentPosition !== "Unclear / Manual Review" && r.status === "Reviewed");
    progress.petitionReliefAnalysis = allResolved ? "completed" : "in_progress";
  }

  const isJr = jrScreening?.isJudicialReview === "Yes";
  if (jrScreening?.isJudicialReview === "No") {
    progress.jrScreening = "not_applicable";
  } else if (!isJr && jrScreening?.isJudicialReview !== "Yes") {
    progress.jrScreening = jrScreening?.decisionMaker ? "in_progress" : "conditional";
  } else {
    const jrComplete = Boolean(jrScreening?.decisionMaker && jrScreening?.decisionUnderReview && jrScreening?.remedySought);
    progress.jrScreening = jrComplete ? "completed" : "in_progress";
  }

  if (form67Eligibility?.eligible) {
    progress.responsePlanning = "in_progress";
  } else if (reliefRows.length > 0) {
    progress.responsePlanning = "in_progress";
  } else {
    progress.responsePlanning = "not_started";
  }

  const evidenceItems = evidenceAffidavitPlan?.evidenceItems || [];
  const witnesses = evidenceAffidavitPlan?.witnesses || [];
  if (evidenceItems.length === 0 && witnesses.length === 0) {
    progress.evidenceAffidavitPlan = "not_started";
  } else {
    const witnessesReady = witnesses.length > 0 && witnesses.every((w) => w.verificationAcknowledged);
    progress.evidenceAffidavitPlan = witnessesReady ? "completed" : "in_progress";
  }

  if (witnesses.length === 0) {
    progress.affidavitDraft = "conditional";
  } else {
    const anyEligible = witnesses.some((w) => checkAffidavitDraftGate(w).eligible);
    progress.affidavitDraft = anyEligible ? "in_progress" : "conditional";
  }

  const applications = interlocutoryApplications?.applications || [];
  if (applications.length === 0) {
    progress.interlocutoryApplication = "conditional";
  } else {
    const allTerminal = applications.every((a) => INTERLOCUTORY_TERMINAL_STATUSES.includes(a.status));
    progress.interlocutoryApplication = allTerminal ? "completed" : "in_progress";
  }

  for (const stageId of ["hearingReadiness", "hearingBinder", "finalOrder"]) {
    const stageData = petitionGuidance?.[stageId];
    if (stageData?.checklist && Object.keys(stageData.checklist).length > 0) {
      progress[stageId] = deriveGuidanceStatus(stageId, stageData.checklist);
    } else {
      progress[stageId] = "not_started";
    }
  }

  const currentStage =
    STAGE_ORDER.find((id) => !["completed", "not_applicable", "conditional"].includes(progress[id])) ||
    STAGE_ORDER[STAGE_ORDER.length - 1];

  return { ...progress, currentStage };
}

// ── Working-draft builders (Stages 5, 7, 10) ────────────────────────────────
// Pure functions that assemble the {title, sections:[...]} shape the shared
// Apps Script sectioned-PDF builder consumes (see
// apps-script/DisputePetitionDrafts.gs, which mirrors the existing
// generateFormTwoDraft_ doc-building pattern). English only, matching v1
// scope. Never invents content — every unresolved field is rendered as an
// explicit placeholder, never silently omitted.

function hasText(value) {
  return Boolean(String(value || "").trim());
}

export function buildForm67WorkingDraft(review, reliefRows) {
  const rows = reliefRows || [];
  return {
    title: "Response to Petition (Form 67) — Working Draft",
    brandLine: FORM67_DRAFT_LABEL,
    sections: [
      {
        title: "Working Draft Status",
        items: [
          "WORKING DRAFT — NOT FOR FILING",
          "This document must be reviewed and finalized by British Columbia legal counsel before filing or service.",
        ],
      },
      {
        title: "Parties and File Information",
        type: "table",
        rows: [
          { label: "Court Registry", value: String(review?.followUpAnswers?.sc_registry || review?.["Court Registry"] || "") },
          { label: "Court File Number", value: String(review?.followUpAnswers?.sc_court_file_number || review?.["Court File Number"] || "") },
          { label: "Respondent (Client)", value: review?.["Client Name"] || review?.clientName || "" },
          { label: "Petitioner", value: review?.["Opposing Party Name"] || review?.opposingPartyName || "" },
        ],
      },
      {
        title: "Paragraph-by-Paragraph Response",
        items: rows.length
          ? rows.map((row) => {
            const label = row.paragraphNumber ? `¶${row.paragraphNumber}` : "[paragraph number to be entered]";
            const order = hasText(row.orderSought) ? row.orderSought : "[order sought to be entered]";
            const position = row.respondentPosition || "Unclear / Manual Review";
            const basis = hasText(row.factualBasis) ? row.factualBasis : "[factual basis to be entered]";
            return `${label}. ${order} — ${position}. Basis: ${basis}`;
          })
          : ["No requested orders have been entered yet."],
      },
      {
        title: "Unresolved Matters",
        items: rows.filter((r) => !r.factualBasis || r.respondentPosition === "Unclear / Manual Review").length
          ? rows
            .filter((r) => !r.factualBasis || r.respondentPosition === "Unclear / Manual Review")
            .map((r) => `¶${r.paragraphNumber || "?"} — ${r.orderSought || "(order not yet described)"}`)
          : ["None recorded."],
      },
      {
        title: "Disclaimer",
        items: [
          "This is general legal information and document-organization guidance, not legal advice.",
          "This working draft does not replace review by a qualified lawyer and is not a substitute for registry confirmation of filing requirements.",
        ],
      },
    ],
  };
}

export function buildAffidavitWorkingDraft(review, witness, evidenceItems) {
  const linked = (evidenceItems || []).filter((e) => (witness?.sourceEvidenceIds || []).includes(e.id));
  return {
    title: "Affidavit (Form 109) — Working Draft",
    brandLine: AFFIDAVIT_DRAFT_LABEL,
    sections: [
      {
        title: "Working Draft Status",
        items: [
          "UNSIGNED WORKING DRAFT — FACTS MUST BE VERIFIED BY THE AFFIANT",
          "Every fact below must be personally verified by the affiant before this document is sworn. No date, conversation, or exhibit description has been invented.",
        ],
      },
      {
        title: "Parties and File Information",
        type: "table",
        rows: [
          { label: "Court Registry", value: String(review?.followUpAnswers?.sc_registry || review?.["Court Registry"] || "") },
          { label: "Court File Number", value: String(review?.followUpAnswers?.sc_court_file_number || review?.["Court File Number"] || "") },
          { label: "Proposed Affiant Role", value: witness?.roleDescription || "" },
        ],
      },
      {
        title: "Factual Purpose",
        items: [hasText(witness?.factualPurpose) ? witness.factualPurpose : "[factual purpose to be entered]"],
      },
      {
        title: "Exhibit Index",
        items: linked.length
          ? linked.map((e) => `${e.exhibitLabel || "[exhibit label to be assigned]"} — ${e.title || "(untitled)"}${e.date ? ` (${e.date})` : ""}`)
          : ["No exhibits linked to this affiant yet."],
      },
      {
        title: "Disclaimer",
        items: [
          "This is general legal information and document-organization guidance, not legal advice.",
          "This working draft does not replace the affiant's own review and is not a substitute for review by a qualified lawyer before swearing.",
        ],
      },
    ],
  };
}

export function buildHearingBinderIndexDraft(review, binderState, filedDocumentLabels) {
  const labels = filedDocumentLabels || [];
  return {
    title: "Hearing Binder Index",
    brandLine: binderState?.preliminary ? "Preliminary Binder" : "Binder Index",
    sections: [
      {
        title: "Working Draft Status",
        items: [
          binderState?.preliminary ? "PRELIMINARY BINDER — hearing date not yet confirmed" : "BINDER INDEX",
          "This index only includes materials confirmed as actually filed or generated in this system.",
        ],
      },
      {
        title: "Parties and File Information",
        type: "table",
        rows: [
          { label: "Court Registry", value: String(review?.followUpAnswers?.sc_registry || review?.["Court Registry"] || "") },
          { label: "Court File Number", value: String(review?.followUpAnswers?.sc_court_file_number || review?.["Court File Number"] || "") },
        ],
      },
      {
        title: "Binder Sections",
        items: BINDER_SECTIONS,
      },
      {
        title: "Confirmed Filed / Generated Documents",
        items: labels.length ? labels : ["No filed or generated documents have been confirmed yet."],
      },
      {
        title: "Disclaimer",
        items: [
          "This is general legal information and document-organization guidance, not legal advice.",
          "This index does not replace registry or lawyer confirmation of the correct hearing package for this proceeding.",
        ],
      },
    ],
  };
}
