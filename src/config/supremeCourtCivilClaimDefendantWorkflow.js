// BC Supreme Court Civil Claim — Defendant Workflow Guide (Case Navigator)
//
// Single source of truth for the guidance content shown by
// src/components/SupremeCourtCaseNavigator.jsx. This is general legal
// information and document-organization guidance, not legal advice — see
// LEGAL_INFORMATION_NOTICE below, which is rendered once by the component.
//
// v1 scope: English only. Stage status is computed client-side from fields
// that already exist on the Dispute_Reviews case record (see
// getWorkflowProgress) — nothing here is persisted back to the sheet.

export const LEGAL_INFORMATION_NOTICE =
  "This workflow provides general legal information and document-organization guidance. " +
  "It is not legal advice and does not replace advice from a qualified lawyer. Court rules, " +
  "forms, deadlines and practice requirements may change. Users must verify current official " +
  "requirements. (Guidance is currently available in English only; Chinese translation is planned " +
  "for a future update.)";

// The two official sources every form card links to. Verified live 2026-07-25.
export const SUPREME_COURT_FORMS_INDEX_URL =
  "https://www2.gov.bc.ca/gov/content/justice/courthouse-services/documents-forms-records/court-forms/sup-civil-forms";
export const SUPREME_COURT_CIVIL_RULES_URL =
  "https://www.bclaws.gov.bc.ca/civix/document/id/crbc/crbc/168_2009_multi";
const LAST_VERIFIED = "2026-07-25";

export const FORM_USAGE = {
  commonly_used: "Commonly used",
  conditional: "Conditional",
  only_if_applicable: "Only if applicable",
};

export const STATUS_META = {
  completed: { label: "Completed", badgeClass: "ccard__badge--completed" },
  in_progress: { label: "In Progress", badgeClass: "ccard__badge--in-progress" },
  not_started: { label: "Not Started", badgeClass: "ccard__badge--not-started" },
  conditional: { label: "Conditional", badgeClass: "ccard__badge--conditional" },
  not_applicable: { label: "Not Applicable", badgeClass: "ccard__badge--not-applicable" },
};

// ── Official BC Supreme Court Civil Rules forms referenced by the stages below.
// sourceUrl/ruleUrl intentionally point to the single official index/rules
// pages rather than per-form deep links, which are not stable enough to
// hard-code — see SUPREME_COURT_FORMS_INDEX_URL / SUPREME_COURT_CIVIL_RULES_URL.
// sourceUrl/ruleUrl/lastVerified are attached uniformly below (see FORMS export).
const RAW_FORMS = [
  {
    id: "form2",
    formNumber: "Form 2",
    name: "Response to Civil Claim",
    purpose: "The defendant's formal response to a Notice of Civil Claim, admitting, denying, or claiming no knowledge of each allegation.",
    stageIds: ["form2"],
    usage: "commonly_used",
  },
  {
    id: "form3",
    formNumber: "Form 3",
    name: "Counterclaim",
    purpose: "Used if the defendant wants to bring their own claim against the plaintiff within the same proceeding.",
    stageIds: ["form2"],
    usage: "only_if_applicable",
  },
  {
    id: "form15",
    formNumber: "Form 15",
    name: "Affidavit of Personal Service",
    purpose: "Sworn proof that a document was personally delivered to a party or witness.",
    stageIds: ["form2", "documentDiscovery"],
    usage: "conditional",
  },
  {
    id: "form16",
    formNumber: "Form 16",
    name: "Affidavit of Ordinary Service",
    purpose: "Sworn proof that a document was served by an accepted method other than personal service (e.g. mail, email where permitted).",
    stageIds: ["form2", "documentDiscovery"],
    usage: "conditional",
  },
  {
    id: "form19",
    formNumber: "Form 19",
    name: "Notice of Case Planning Conference",
    purpose: "Notifies parties of a scheduled case planning conference with the court.",
    stageIds: ["documentDiscovery"],
    usage: "conditional",
  },
  {
    id: "form20",
    formNumber: "Form 20",
    name: "Case Plan Proposal",
    purpose: "A party's proposed schedule and steps for moving the case toward trial, filed before a case planning conference.",
    stageIds: ["documentDiscovery"],
    usage: "conditional",
  },
  {
    id: "form21",
    formNumber: "Form 21",
    name: "Case Plan Order",
    purpose: "The court's order setting the schedule and procedural steps for the case, made after a case planning conference.",
    stageIds: ["documentDiscovery"],
    usage: "conditional",
  },
  {
    id: "form22",
    formNumber: "Form 22",
    name: "List of Documents",
    purpose: "The formal, sworn list of relevant documents in a party's possession, control, or power, disclosed to the other side.",
    stageIds: ["documentDiscovery"],
    usage: "commonly_used",
  },
  {
    id: "form23",
    formNumber: "Form 23",
    name: "Appointment to Examine for Discovery",
    purpose: "Sets the date, time, and place for an oral examination for discovery.",
    stageIds: ["examinationForDiscovery"],
    usage: "conditional",
  },
  {
    id: "form25",
    formNumber: "Form 25",
    name: "Subpoena to Witness",
    purpose: "Compels a witness to attend and give evidence, or produce documents, at trial or another hearing.",
    stageIds: ["trialPreparation"],
    usage: "only_if_applicable",
  },
  {
    id: "form26",
    formNumber: "Form 26",
    name: "Notice to Admit",
    purpose: "Asks the other party to formally admit specific facts or the authenticity of documents, to narrow what needs to be proven at trial.",
    stageIds: ["documentDiscovery"],
    usage: "conditional",
  },
  {
    id: "form32",
    formNumber: "Form 32",
    name: "Notice of Application",
    purpose: "Starts a court application, setting out what order is sought and on what grounds.",
    stageIds: ["applications"],
    usage: "commonly_used",
  },
  {
    id: "form33",
    formNumber: "Form 33",
    name: "Application Response",
    purpose: "The responding party's formal reply to a Notice of Application, indicating their position and any additional materials.",
    stageIds: ["applications"],
    usage: "commonly_used",
  },
  {
    id: "form34",
    formNumber: "Form 34",
    name: "Consent Order",
    purpose: "An order both parties agree to, submitted to the court for approval without a contested hearing.",
    stageIds: ["settlement", "applications"],
    usage: "conditional",
  },
  {
    id: "form35",
    formNumber: "Form 35",
    name: "Order Made After Application",
    purpose: "The formal, signed record of what the court ordered after hearing an application.",
    stageIds: ["applications"],
    usage: "conditional",
  },
  {
    id: "form36",
    formNumber: "Form 36",
    name: "Notice of Discontinuance",
    purpose: "Formally ends a claim, counterclaim, or third party claim, in whole or in part.",
    stageIds: ["settlement"],
    usage: "only_if_applicable",
  },
  {
    id: "form40",
    formNumber: "Form 40",
    name: "Notice of Trial",
    purpose: "Formally sets the trial date and confirms the parties are proceeding to trial.",
    stageIds: ["trialPreparation"],
    usage: "commonly_used",
  },
  {
    id: "form41",
    formNumber: "Form 41",
    name: "Trial Brief",
    purpose: "A short summary filed before trial outlining issues, witnesses, and time estimates for the court's scheduling purposes.",
    stageIds: ["trialPreparation"],
    usage: "commonly_used",
  },
  {
    id: "form42",
    formNumber: "Form 42",
    name: "Trial Certificate",
    purpose: "Confirms the case is ready to proceed to trial on the scheduled date.",
    stageIds: ["trialPreparation"],
    usage: "commonly_used",
  },
  {
    id: "form48",
    formNumber: "Form 48",
    name: "Order After Trial",
    purpose: "The formal, signed record of the court's judgment and orders made after trial.",
    stageIds: ["judgmentCostsEnforcement"],
    usage: "commonly_used",
  },
  {
    id: "form62",
    formNumber: "Form 62",
    name: "Bill of Costs",
    purpose: "An itemized statement of costs claimed by a party, used when costs are to be assessed rather than agreed.",
    stageIds: ["judgmentCostsEnforcement"],
    usage: "conditional",
  },
  {
    id: "form109",
    formNumber: "Form 109",
    name: "Affidavit",
    purpose: "The general sworn-statement form used throughout a proceeding to put evidence before the court in writing.",
    stageIds: ["evidencePreparation", "applications", "trialPreparation"],
    usage: "commonly_used",
  },
];

// Every form links to the same two official pages — see the module comment
// above SUPREME_COURT_FORMS_INDEX_URL for why we don't hard-code per-form
// deep links (they are not stable enough to verify and maintain here).
export const FORMS = RAW_FORMS.map((form) => ({
  ...form,
  sourceUrl: SUPREME_COURT_FORMS_INDEX_URL,
  ruleUrl: SUPREME_COURT_CIVIL_RULES_URL,
  lastVerified: LAST_VERIFIED,
}));

export function getFormsForStage(stageId) {
  return FORMS.filter((form) => form.stageIds.includes(stageId));
}

// ── The 11 Civil Claim Defendant workflow stages ────────────────────────────
export const WORKFLOW_STAGES = [
  {
    id: "intake",
    number: 1,
    title: "Case Intake",
    summary: "Your case details, parties, and documents have been recorded in the system.",
    conditional: false,
    whatItMeans:
      "This is the structured intake already completed for this file: the parties, the dispute type, key dates, and any documents uploaded so far.",
    whenItHappens:
      "Intake happens once, at the start of a file, and is normally complete before any assessment can be prepared.",
    prepare: [
      "Confirm the parties' names and roles are recorded correctly.",
      "Confirm key dates (service date, deadlines) are accurate.",
      "Upload any outstanding documents referenced in the claim.",
    ],
    formIds: [],
    completionChecklist: [
      "Party names, roles, and contact details recorded.",
      "Dispute type and proceeding type recorded.",
      "Initial documents (e.g. the Notice of Civil Claim) uploaded.",
    ],
    cautions: [
      "Incomplete or inaccurate intake information can delay every later stage.",
    ],
  },
  {
    id: "litigationAssessment",
    number: 2,
    title: "Litigation Assessment",
    summary: "The AI preliminary review of the file's strengths, risks, and recommended next step.",
    conditional: false,
    whatItMeans:
      "A preliminary, rule-based review of the intake information — it estimates risk level, flags missing information, and suggests a recommended next step. It is a starting point for a professional reviewer, not a final legal opinion.",
    whenItHappens:
      "Generated automatically once intake is complete enough to assess. It can be regenerated as more information or documents are added.",
    prepare: [
      "Review the flags and missing-information notes in the assessment.",
      "Provide any additional facts or documents the assessment identifies as missing.",
      "Discuss the recommended next step with a reviewer or lawyer.",
    ],
    formIds: [],
    completionChecklist: [
      "Assessment generated and reviewed.",
      "Any flagged gaps addressed or explained.",
    ],
    cautions: [
      "This assessment is preliminary legal information, not a final legal opinion — obtain legal advice before relying on it for a filing decision.",
    ],
  },
  {
    id: "form2",
    number: 3,
    title: "Response to Civil Claim — Form 2",
    summary: "Preparing the defendant's formal response to the Notice of Civil Claim.",
    conditional: false,
    whatItMeans:
      "Form 2 is the defendant's formal, paragraph-by-paragraph response to the plaintiff's Notice of Civil Claim: admitting, denying, or stating no knowledge of each allegation, plus the defendant's own version of events and any relief sought.",
    whenItHappens:
      "A Response to Civil Claim is normally filed within a strict deadline after being served with the Notice of Civil Claim (the deadline depends on where and how service occurred). Missing this deadline can allow the plaintiff to seek default judgment.",
    prepare: [
      "The Notice of Civil Claim, reviewed paragraph by paragraph.",
      "Service records (date, method, and location of service).",
      "A clear position — admitted, denied, or outside knowledge — for each paragraph.",
      "The legal and factual basis for the defence.",
      "Any relief being sought by the defendant.",
    ],
    formIds: ["form2", "form3", "form15", "form16"],
    completionChecklist: [
      "Every paragraph of the claim has a recorded position.",
      "Legal basis and relief sought are drafted.",
      "Draft reviewed and finalized by a lawyer before filing.",
      "Filing and service deadlines confirmed and met.",
    ],
    cautions: [
      "This tool produces a WORKING DRAFT ONLY — it is not for filing until reviewed and finalized by counsel.",
      "Filing deadlines for a Response to Civil Claim are strict; confirm the exact deadline for this file's service method and registry.",
    ],
  },
  {
    id: "evidencePreparation",
    number: 4,
    title: "Evidence Preparation",
    summary: "Organizing the facts, documents, and witnesses that support the defence.",
    conditional: false,
    whatItMeans:
      "The ongoing work of gathering, organizing, and preserving the evidence that supports the defendant's position — building a chronology, collecting documents, and identifying witnesses.",
    whenItHappens:
      "This typically starts as soon as a claim is anticipated or received, and continues throughout the case. It is not a single filing event and is not always formally 'due' by a court deadline, but strong preparation here supports every later stage.",
    prepare: [
      "Build a case chronology of key events, in date order.",
      "Map each piece of evidence to the specific allegations in the Notice of Civil Claim.",
      "Preserve original documents — do not alter, mark up, or discard originals.",
      "Collect contracts, emails, messages, financial records, photographs, and recordings.",
      "Identify possible witnesses and what each one can speak to.",
      "Record the source and date of each document.",
      "Keep factual evidence separate from argument or opinion.",
    ],
    formIds: ["form109"],
    completionChecklist: [
      "Chronology drafted and kept up to date.",
      "Key evidence identified and linked to specific allegations.",
      "Originals preserved and copies organized for review.",
      "Potential witnesses identified.",
    ],
    cautions: [
      "Never alter, annotate, or discard an original document or file — preserve it exactly as received.",
      "Keep factual notes separate from legal argument; do not present opinion as fact.",
      "Some communications may be privileged — do not assume everything must be, or should be, disclosed without advice.",
    ],
  },
  {
    id: "documentDiscovery",
    number: 5,
    title: "Document Discovery",
    summary: "Identifying and formally exchanging relevant documents with the other side.",
    conditional: false,
    whatItMeans:
      "Document discovery is the formal process of identifying every relevant document in a party's possession, control, or power, and exchanging that list (and the documents themselves, where producible) with the other side.",
    whenItHappens:
      "Discovery obligations generally arise once a Response to Civil Claim has been filed and the pleadings define the issues in dispute. It can be shaped by a case planning conference and case plan order, and continues as new relevant documents are found.",
    prepare: [
      "Identify all relevant documents in your possession or control.",
      "Prepare and keep updating a List of Documents.",
      "Distinguish documents that must be produced from those that may be privileged.",
      "Track documents received from the other side.",
      "Track documents you believe are missing from the other side's disclosure.",
      "Continue disclosing if new relevant documents are found later.",
    ],
    formIds: ["form19", "form20", "form21", "form22", "form26", "form15", "form16"],
    completionChecklist: [
      "List of Documents prepared and served.",
      "Privileged documents identified and withheld appropriately.",
      "Opposing party's List of Documents reviewed; gaps tracked.",
      "Process in place to disclose newly found relevant documents.",
    ],
    cautions: [
      "The duty to disclose relevant documents is ongoing — it does not end once the first List of Documents is served.",
      "Do not withhold a document as 'privileged' without understanding what privilege actually covers; get legal advice if unsure.",
      "Missing or incomplete disclosure can have serious consequences, including costs or evidentiary limits at trial.",
    ],
  },
  {
    id: "examinationForDiscovery",
    number: 6,
    title: "Examination for Discovery",
    summary: "An out-of-court oral questioning of a party under oath, before trial.",
    conditional: true,
    whatItMeans:
      "An examination for discovery is an out-of-court process where one party's lawyer questions the other party under oath, to learn the facts and evidence before trial. It is recorded and can be used later in the case.",
    whenItHappens:
      "This stage may not occur in every case — not all matters proceed to a full examination for discovery, and timing depends on the parties, the case plan, or a court order. When it does happen, it is usually scheduled by an Appointment to Examine for Discovery.",
    prepare: [
      "Review the pleadings and identify the key factual issues in dispute.",
      "Prepare clear, accurate, factual answers to likely questions.",
      "Identify questions you may want to ask the opposing party.",
      "Track any undertakings (promises to provide information or documents later).",
      "Keep the transcript and any follow-up responses organized.",
    ],
    formIds: ["form23"],
    completionChecklist: [
      "Date, time, and location confirmed via Appointment to Examine for Discovery.",
      "Key facts and documents reviewed in advance.",
      "Undertakings given are tracked and followed up on.",
      "Transcript received and stored with the file.",
    ],
    cautions: [
      "Answer factually and accurately — never guess, exaggerate, or be coached to misstate evidence; inconsistent answers can be used against you later.",
      "Undertakings are commitments to the court and the other party — track and meet them.",
      "Speak with a lawyer beforehand if you are unsure how to answer a category of questions.",
    ],
  },
  {
    id: "applications",
    number: 7,
    title: "Applications",
    summary: "Court applications for interim orders or procedural relief before trial.",
    conditional: true,
    whatItMeans:
      "An application asks the court to make a specific order before trial — for example, about procedure, disclosure, an injunction, or dismissing part of a claim. A party may bring an application, or may need to respond to one brought by the other side.",
    whenItHappens:
      "Applications are conditional — they only happen if a party chooses to bring one, or if one is brought against this file. They can arise at almost any stage and sometimes on short notice, especially urgent applications.",
    prepare: [
      "Identify precisely what order is being sought and on what grounds.",
      "Draft or gather supporting affidavits and exhibits.",
      "Prepare a draft order reflecting the relief sought.",
      "Confirm filing and service deadlines for the application.",
      "Assemble the hearing materials required by the registry.",
      "If the application is urgent, identify what makes it urgent and respond promptly.",
    ],
    formIds: ["form32", "form33", "form34", "form35", "form109"],
    completionChecklist: [
      "Notice of Application (or Application Response) filed and served on time.",
      "Supporting affidavits and exhibits complete and sworn.",
      "Draft order prepared.",
      "Hearing materials assembled and filed per registry requirements.",
    ],
    cautions: [
      "Application filing and service deadlines are strict and can be short — confirm them as soon as an application is contemplated or received.",
      "Urgent applications may require an immediate response; do not wait to seek legal advice if served with one.",
      "An affidavit is sworn evidence — it must be accurate and within the deponent's own knowledge.",
    ],
  },
  {
    id: "settlement",
    number: 8,
    title: "Settlement",
    summary: "Possible resolution of some or all of the claim without a trial.",
    conditional: true,
    whatItMeans:
      "Settlement is a negotiated resolution of some or all of the dispute, reached directly between the parties, without a trial deciding the outcome.",
    whenItHappens:
      "Settlement discussions can happen at any point in a case — before or after a claim is filed, during discovery, or right up to trial. Not every case settles, and settlement discussions are conditional on both parties being willing to negotiate.",
    prepare: [
      "Clarify monetary and non-monetary terms that would be acceptable.",
      "Consider whether a release of future claims is needed.",
      "Consider how costs will be addressed as part of any settlement.",
      "Clarify payment terms and timing if money is to be paid.",
      "Consider whether a consent order is needed to formalize terms.",
      "Consider whether a Notice of Discontinuance is appropriate once resolved.",
      "Document the final agreement clearly and completely in writing.",
      "Keep settlement communications separate from the general file where appropriate.",
    ],
    formIds: ["form34", "form36"],
    completionChecklist: [
      "Settlement terms documented in writing and agreed by both parties.",
      "Release, consent order, or discontinuance prepared as applicable.",
      "Payment or performance terms confirmed.",
    ],
    cautions: [
      "Settlement communications are often treated differently from other correspondence (e.g. 'without prejudice') — understand this before writing informally about settlement.",
      "Do not treat a verbal or informal settlement as final — document and, where appropriate, formalize it with the court.",
      "Get legal advice before signing a release, especially one that gives up future claims.",
    ],
  },
  {
    id: "trialPreparation",
    number: 9,
    title: "Trial Preparation",
    summary: "Getting the case ready for a scheduled trial date.",
    conditional: false,
    whatItMeans:
      "The structured work of getting a case ready for trial: confirming the trial date, preparing witnesses and documents, and assembling the materials the court and counsel will use at the hearing.",
    whenItHappens:
      "This stage begins once a trial date is set (typically via a Notice of Trial) and intensifies as scheduling deadlines approach. It is mandatory for any case proceeding to trial, and does not apply if the case resolves or is dismissed earlier.",
    prepare: [
      "Confirm the trial date and all related scheduling deadlines.",
      "Prepare the trial brief summarizing issues, witnesses, and time estimates.",
      "File the trial certificate confirming readiness to proceed.",
      "Prepare witnesses for their evidence and possible cross-examination.",
      "Assemble the document book of evidence to be used at trial.",
      "Prepare an exhibit plan for how evidence will be introduced.",
      "Finalize the chronology of events for the court.",
      "Gather relevant legal authorities (cases and legislation).",
      "Draft opening and closing submissions.",
      "Identify any interpretation or accessibility needs for witnesses or parties.",
    ],
    formIds: ["form25", "form40", "form41", "form42", "form109"],
    completionChecklist: [
      "Notice of Trial, Trial Brief, and Trial Certificate filed on time.",
      "Witnesses prepared and, if needed, subpoenaed.",
      "Document book and exhibit plan assembled.",
      "Chronology and authorities finalized.",
      "Interpretation or accessibility needs arranged in advance.",
    ],
    cautions: [
      "Trial scheduling deadlines (trial brief, trial certificate, and related filings) are strict and enforced by the registry.",
      "Book interpretation or accessibility accommodations well in advance — this cannot always be arranged on short notice.",
      "Do not rely on informal notes for evidence you plan to introduce at trial — confirm what is properly admissible with a lawyer.",
    ],
  },
  {
    id: "courtBinder",
    number: 10,
    title: "Hearing / Court Binder",
    summary: "Assembling the physical or electronic materials package for a hearing or trial.",
    conditional: false,
    whatItMeans:
      "The organized package of materials presented at a hearing or trial — cover page, table of contents, tabs, and the underlying pleadings, affidavits, exhibits, orders, and authorities, properly paginated and indexed.",
    whenItHappens:
      "A binder or record is assembled for any hearing or trial that requires one; the exact package required depends on the type of hearing. This work intensifies in the days before a scheduled hearing or trial date.",
    prepare: [
      "Cover page with court file number, parties, and hearing date.",
      "Table of contents with continuous pagination.",
      "Tabs or sections organizing the materials logically.",
      "Filed pleadings included in full.",
      "Affidavits and exhibits included and cross-referenced.",
      "Relevant court orders included.",
      "Book of authorities, where legal authorities will be relied on.",
      "Bookmarks added for any electronic (PDF) copy.",
      "Both printed and electronic copies checked for completeness and accuracy.",
    ],
    formIds: [],
    completionChecklist: [
      "Correct type of package identified for this specific hearing.",
      "All required materials included, paginated, and indexed.",
      "Electronic copy bookmarked; printed copy checked page-for-page against it.",
    ],
    cautions: [
      "An application record, trial record, document book, exhibit book, and book of authorities are not the same thing — confirm exactly which package(s) this hearing requires; using the wrong one can delay or derail a hearing.",
      "Registry formatting requirements (pagination, tabs, binding) are often strictly enforced — confirm current requirements before finalizing.",
      "Check both the printed and electronic copies carefully; missing pages or broken bookmarks can cause real problems during a hearing.",
    ],
  },
  {
    id: "judgmentCostsEnforcement",
    number: 11,
    title: "Judgment, Costs and Enforcement",
    summary: "What happens after a decision — the formal order, costs, payment, and enforcement if needed.",
    conditional: false,
    whatItMeans:
      "After a decision is made, this stage covers getting the formal court order entered, understanding what costs are owed, tracking payment, and — only where necessary — enforcing or complying with the judgment.",
    whenItHappens:
      "This stage follows any final decision, whether after trial, a dispositive application, or a settlement that results in a consent order. Enforcement steps apply only if a party does not voluntarily comply.",
    prepare: [
      "Obtain the entered (formally signed and filed) order.",
      "Review all deadlines triggered by the order, including appeal deadlines.",
      "Understand the costs consequences of the outcome.",
      "Track any payment obligations, for or against this file.",
      "Consider enforcement steps only if payment or compliance does not occur voluntarily.",
      "Record when a judgment has been satisfied.",
      "Flag any appeal or review deadlines immediately — these are often short.",
    ],
    formIds: ["form48", "form62"],
    completionChecklist: [
      "Entered order obtained and stored with the file.",
      "Costs position understood (who pays whom, and how much or how costs will be assessed).",
      "Payment obligations tracked to completion, or enforcement steps identified.",
      "Appeal or review deadlines checked and diarized.",
    ],
    cautions: [
      "Appeal and review deadlines are typically short and run from the date of the order, not the date it is received — confirm the exact deadline immediately.",
      "Enforcement can involve its own procedures and costs — get legal advice before starting enforcement steps.",
      "As a matter becomes more complex (e.g. contested enforcement, an appeal), professional legal review is strongly recommended.",
    ],
  },
];

// ── Evidence Matrix (Stage 4, Evidence Preparation) ─────────────────────────
// Single source of truth for the row model's controlled vocabularies, shared
// by src/components/EvidenceMatrix.jsx. Persisted verbatim inside the
// existing "AI Analysis JSON" envelope's evidenceMatrix key — see
// apps-script/DisputeEvidenceMatrix.gs.

export const EVIDENCE_MATRIX_NOTICE =
  "This workspace organizes allegations, evidence and possible witnesses. It does not determine admissibility, " +
  "privilege, legal relevance or litigation strategy. Those issues may require review by a qualified lawyer.";

export const EVIDENCE_MATRIX_CAUTIONS = [
  "Preserve original files — do not alter, annotate, or discard them.",
  "Do not alter file metadata (dates, names) when referencing evidence here.",
  "A document flagged \"Potentially Privileged\" is a reviewer flag only, requiring legal confirmation before disclosure.",
  "Removing a row or evidence item from this matrix does not delete the original source file.",
];

// Reuse Form 2's Admitted/Denied/Outside Knowledge vocabulary where it maps
// directly (see FORM_TWO_POSITION_TO_MATRIX below); the remaining values
// cover positions Form 2's tri-state can't express.
export const POSITION_TYPES = [
  "Admit",
  "Deny",
  "No Knowledge",
  "Partially Admit",
  "Context Required",
  "Not Yet Reviewed",
];

export const FORM_TWO_POSITION_TO_MATRIX = {
  Admitted: "Admit",
  Denied: "Deny",
  "Outside Knowledge": "No Knowledge",
};

export const EVIDENCE_TYPES = [
  "Contract",
  "Email",
  "Message",
  "Photograph",
  "Video",
  "Financial Record",
  "Invoice or Receipt",
  "Court or Tribunal Document",
  "Government Record",
  "Witness Evidence",
  "Other",
];

export const SUPPORTS_POSITION_VALUES = [
  "Supports Defendant",
  "Supports Plaintiff",
  "Mixed",
  "Context Only",
  "Not Yet Assessed",
];

export const DISCLOSURE_STATUSES = [
  "Not Reviewed",
  "Relevant and Producible",
  "Potentially Privileged",
  "Duplicate",
  "Not Relevant",
  "Missing",
  "Produced",
  "Received from Other Party",
];

export const ROW_STATUSES = [
  "Missing Evidence",
  "Evidence Identified",
  "Partially Supported",
  "Ready for Review",
  "Reviewed",
  "Not Applicable",
];

export const ROW_STATUS_META = {
  "Missing Evidence": { label: "Missing Evidence", badgeClass: "ccard__badge--not-started" },
  "Evidence Identified": { label: "Evidence Identified", badgeClass: "ccard__badge--in-progress" },
  "Partially Supported": { label: "Partially Supported", badgeClass: "ccard__badge--conditional" },
  "Ready for Review": { label: "Ready for Review", badgeClass: "ccard__badge--conditional" },
  Reviewed: { label: "Reviewed", badgeClass: "ccard__badge--completed" },
  "Not Applicable": { label: "Not Applicable", badgeClass: "ccard__badge--not-applicable" },
};

export function makeEvidenceMatrixRow(overrides = {}) {
  return {
    id: overrides.id || `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceParagraphNumber: null,
    allegationOrIssue: "",
    defendantPosition: "",
    positionType: "Not Yet Reviewed",
    evidenceItems: [],
    witnesses: [],
    relevance: "",
    status: "Missing Evidence",
    reviewerNotes: "",
    sourceSnapshotText: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeEvidenceItem(overrides = {}) {
  return {
    id: overrides.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    evidenceType: "Other",
    date: "",
    source: "",
    fileReference: "",
    description: "",
    supportsPosition: "Not Yet Assessed",
    disclosureStatus: "Not Reviewed",
    ...overrides,
  };
}

// Builds initial rows from the admin's current (session-local, unsaved) Form
// 2 paragraphs — see the architecture note on why defendantPosition starts
// blank (Form 2 paragraphs have no free-text position field to carry over).
export function buildRowsFromFormTwoParagraphs(paragraphs) {
  return (paragraphs || [])
    .map((paragraph, index) => ({ paragraph, number: index + 1 }))
    .filter(({ paragraph }) => (paragraph.allegationText || "").trim())
    .map(({ paragraph, number }) =>
      makeEvidenceMatrixRow({
        sourceParagraphNumber: number,
        allegationOrIssue: paragraph.allegationText.trim(),
        positionType: FORM_TWO_POSITION_TO_MATRIX[paragraph.position] || "Not Yet Reviewed",
        sourceSnapshotText: paragraph.allegationText.trim(),
      })
    );
}

// Sync rule: create rows for Form 2 paragraphs with no matching row yet;
// never touch an existing row's edited content; flag (via sourceChanged,
// computed by the caller) when the live paragraph text no longer matches
// what was captured at last sync.
export function syncRowsFromFormTwoParagraphs(existingRows, paragraphs) {
  const existingByParagraph = new Map(
    existingRows.filter((row) => row.sourceParagraphNumber != null).map((row) => [row.sourceParagraphNumber, row])
  );
  const newRows = buildRowsFromFormTwoParagraphs(paragraphs).filter(
    (row) => !existingByParagraph.has(row.sourceParagraphNumber)
  );
  return [...existingRows, ...newRows];
}

export function evidenceMatrixSummary(rows) {
  const list = rows || [];
  return {
    total: list.length,
    hasEvidence: list.filter((row) => row.status !== "Missing Evidence").length,
    missingEvidence: list.filter((row) => row.status === "Missing Evidence").length,
    readyForReview: list.filter((row) => row.status === "Ready for Review").length,
  };
}

// ── Document Discovery (Stage 5) ─────────────────────────────────────────
// Single source of truth for the discovery-document row model, shared by
// src/components/DocumentDiscoveryWorkspace.jsx. Persisted verbatim inside
// the existing "AI Analysis JSON" envelope's documentDiscovery key — see
// apps-script/DisputeDocumentDiscovery.gs. Documents REFERENCE Evidence
// Matrix evidence items and Dispute_Files by id — never copy/duplicate them.

export const DOCUMENT_DISCOVERY_NOTICE =
  "This workspace helps organize documents for discovery preparation. It does not determine legal relevance, " +
  "privilege, possession or control, or whether a document must be disclosed or produced. Those issues may " +
  "require review by a qualified lawyer.";

export const DOCUMENT_DISCOVERY_CAUTIONS = [
  "Preserve original files — do not alter, annotate, or discard them.",
  "Do not alter file metadata (dates, names) when referencing documents here.",
  "Potentially privileged documents should not be produced without appropriate review.",
  "Removing a workspace reference never deletes the underlying Drive file.",
  "Discovery obligations may continue if new relevant documents are found later.",
];

export const DOCUMENT_TYPES = [
  "Agreement or Contract",
  "Email",
  "Message or Chat",
  "Letter",
  "Photograph",
  "Video or Audio",
  "Financial Record",
  "Invoice or Receipt",
  "Court or Tribunal Record",
  "Government Record",
  "Corporate Record",
  "Property Record",
  "Expert or Technical Record",
  "Witness-Related Document",
  "Other",
];

export const SOURCE_TYPES = [
  "Uploaded Case File",
  "Evidence Matrix",
  "Manual Reference",
  "Received from Other Party",
  "Third-Party Source",
];

export const POSSESSION_STATUSES = [
  "Available",
  "Missing",
  "Requested",
  "Expected from Other Party",
  "Not in Defendant's Possession or Control",
  "Needs Confirmation",
];

export const DISCOVERY_REVIEW_STATUSES = [
  "Not Reviewed",
  "In Review",
  "Reviewed",
  "Needs Legal Review",
  "Not Relevant",
  "Duplicate",
];

export const PRIVILEGE_FLAGS = [
  "Not Flagged",
  "Potentially Privileged",
  "Privilege Confirmed Externally",
  "Privilege Waived or Not Claimed",
  "Needs Legal Review",
];

export const PRODUCTION_STATUSES = [
  "Not Assessed",
  "Potentially Producible",
  "Not Producible — Review Required",
  "Ready for Production",
  "Produced",
  "Received from Other Party",
  "Withheld Pending Review",
  "Not Applicable",
];

// Evidence Matrix evidenceType -> closest Document Discovery documentType.
const EVIDENCE_TYPE_TO_DOCUMENT_TYPE = {
  Contract: "Agreement or Contract",
  Email: "Email",
  Message: "Message or Chat",
  Photograph: "Photograph",
  Video: "Video or Audio",
  "Financial Record": "Financial Record",
  "Invoice or Receipt": "Invoice or Receipt",
  "Court or Tribunal Document": "Court or Tribunal Record",
  "Government Record": "Government Record",
  "Witness Evidence": "Witness-Related Document",
  Other: "Other",
};

// Evidence Matrix disclosureStatus -> a reasonable Document Discovery
// productionStatus starting point. The reviewer can always change it.
const DISCLOSURE_STATUS_TO_PRODUCTION_STATUS = {
  "Not Reviewed": "Not Assessed",
  "Relevant and Producible": "Potentially Producible",
  "Potentially Privileged": "Withheld Pending Review",
  Duplicate: "Not Applicable",
  "Not Relevant": "Not Applicable",
  Missing: "Not Assessed",
  Produced: "Produced",
  "Received from Other Party": "Received from Other Party",
};

export function makeDiscoveryDocument(overrides = {}) {
  return {
    id: overrides.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    documentDate: "",
    documentType: "Other",
    sourceType: "Manual Reference",
    linkedFileId: "",
    linkedEvidenceItemIds: [],
    linkedIssueIds: [],
    description: "",
    relevanceNote: "",
    possessionStatus: "Needs Confirmation",
    reviewStatus: "Not Reviewed",
    privilegeFlag: "Not Flagged",
    productionStatus: "Not Assessed",
    productionDate: "",
    receivedFrom: "",
    receivedDate: "",
    duplicateOf: "",
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Import from Evidence Matrix: one discovery record per evidence item, only
// for items not already linked. Never touches an existing linked record.
export function importDocumentsFromEvidenceMatrix(evidenceMatrix, existingDocuments) {
  const existing = existingDocuments || [];
  const alreadyLinkedItemIds = new Set(existing.flatMap((doc) => doc.linkedEvidenceItemIds || []));
  const created = [];
  let alreadyLinked = 0;

  for (const row of evidenceMatrix?.rows || []) {
    for (const item of row.evidenceItems || []) {
      if (alreadyLinkedItemIds.has(item.id)) {
        alreadyLinked += 1;
        continue;
      }
      created.push(
        makeDiscoveryDocument({
          title: item.title || row.allegationOrIssue || "(untitled evidence item)",
          documentDate: item.date || "",
          documentType: EVIDENCE_TYPE_TO_DOCUMENT_TYPE[item.evidenceType] || "Other",
          sourceType: "Evidence Matrix",
          linkedFileId: /^DF-/.test(item.fileReference || "") ? item.fileReference : "",
          linkedEvidenceItemIds: [item.id],
          linkedIssueIds: [row.id],
          description: item.description || "",
          relevanceNote: row.relevance || "",
          possessionStatus: item.disclosureStatus === "Missing" ? "Missing" : item.fileReference ? "Available" : "Needs Confirmation",
          privilegeFlag: item.disclosureStatus === "Potentially Privileged" ? "Potentially Privileged" : "Not Flagged",
          productionStatus: DISCLOSURE_STATUS_TO_PRODUCTION_STATUS[item.disclosureStatus] || "Not Assessed",
        })
      );
      alreadyLinkedItemIds.add(item.id);
    }
  }

  return { documents: [...existing, ...created], added: created.length, alreadyLinked };
}

// Import from an uploaded Dispute_Files record — links by File ID, never
// duplicates/moves/renames the underlying Drive file.
export function importDocumentFromFile(file, existingDocuments) {
  const existing = existingDocuments || [];
  if (existing.some((doc) => doc.linkedFileId === file.fileId)) {
    return { documents: existing, added: false };
  }
  const created = makeDiscoveryDocument({
    title: file.fileName || "(untitled file)",
    documentDate: file.documentDate || "",
    sourceType: "Uploaded Case File",
    linkedFileId: file.fileId,
    description: file.description || "",
    possessionStatus: "Available",
  });
  return { documents: [...existing, created], added: true };
}

export function documentDiscoverySummary(documents) {
  const list = documents || [];
  return {
    total: list.length,
    available: list.filter((d) => d.possessionStatus === "Available").length,
    missingOrRequested: list.filter((d) => ["Missing", "Requested", "Expected from Other Party"].includes(d.possessionStatus)).length,
    needsReview: list.filter((d) => ["Not Reviewed", "In Review", "Needs Legal Review"].includes(d.reviewStatus)).length,
    potentiallyPrivileged: list.filter((d) => ["Potentially Privileged", "Needs Legal Review"].includes(d.privilegeFlag)).length,
    readyForProduction: list.filter((d) => d.productionStatus === "Ready for Production").length,
    produced: list.filter((d) => d.productionStatus === "Produced").length,
    receivedFromOtherParty: list.filter((d) => d.sourceType === "Received from Other Party" || d.productionStatus === "Received from Other Party").length,
  };
}

// Organizational readiness only — never a legal-compliance or "ready to
// file" conclusion. See DOCUMENT_DISCOVERY_NOTICE for the boundary.
export function getDiscoveryReadiness(documents) {
  const list = documents || [];
  if (list.length === 0) return { label: "Document collection incomplete", flags: [] };

  const flags = [];
  if (list.some((d) => !d.title.trim())) flags.push("One or more records have no title.");
  if (list.some((d) => !d.possessionStatus)) flags.push("One or more records are missing a possession status.");
  if (list.some((d) => (d.linkedIssueIds || []).length === 0)) flags.push("One or more records are not linked to an Evidence Matrix issue.");
  if (list.some((d) => d.productionStatus === "Ready for Production" && !d.linkedFileId && !d.description.trim())) {
    flags.push("One or more records are marked Ready for Production without a linked file or reference.");
  }

  const hasOutstandingPossession = list.some((d) => ["Missing", "Requested", "Expected from Other Party"].includes(d.possessionStatus));
  const hasOutstandingPrivilege = list.some((d) => ["Potentially Privileged", "Needs Legal Review"].includes(d.privilegeFlag));
  const allReviewed = list.every((d) => ["Reviewed", "Not Relevant", "Duplicate"].includes(d.reviewStatus));

  let label;
  if (hasOutstandingPossession) label = "Missing documents remain outstanding";
  else if (hasOutstandingPrivilege) label = "Potentially privileged documents require review";
  else if (!allReviewed) label = "Review in progress";
  else label = "Organizational preparation complete";

  return { label, flags };
}

// ── Examination for Discovery (Stage 6) ─────────────────────────────────────
// Single source of truth for the readiness/examinee/preparation-issue/
// undertaking/transcript-reference models, shared by
// src/components/ExaminationDiscoveryWorkspace.jsx. Persisted verbatim
// inside the existing "AI Analysis JSON" envelope's examinationDiscovery
// key — see apps-script/DisputeExaminationDiscovery.gs. Preparation issues
// REFERENCE Form 2 paragraphs, Evidence Matrix rows, and Document Discovery
// records by id — never copy them.

export const EXAMINATION_DISCOVERY_NOTICE =
  "This workspace helps organize preparation for a possible Examination for Discovery. It does not determine " +
  "whether an examination is required, who should be examined, what questions should be asked, whether an " +
  "answer is sufficient, or whether an undertaking has been satisfied. Those issues may require review by a " +
  "qualified lawyer.";

export const EXAMINATION_DISCOVERY_CAUTIONS = [
  "Answers given at an examination must be truthful.",
  "Review pleadings and relevant documents before the examination.",
  "Privileged material should not be disclosed without appropriate review.",
  "Preserve original documents and transcripts.",
  "Track undertakings carefully.",
  "Court rules and scheduling directions may change.",
];

export const APPLICABILITY_STATUSES = [
  "Not Yet Assessed",
  "Not Currently Expected",
  "Possible",
  "Expected",
  "Scheduled",
  "Completed",
  "Not Applicable",
];

export const LOCATION_METHODS = ["In Person", "Video Conference", "Telephone", "Not Yet Confirmed", "Other"];

export const READINESS_PREPARATION_STATUSES = [
  "Not Started",
  "In Progress",
  "Ready for Review",
  "Organizational Preparation Complete",
  "Completed",
  "Not Applicable",
];

export const EXAMINEE_SIDES = ["Defendant", "Plaintiff", "Third Party", "Other"];

export const EXAMINATION_STATUSES = [
  "Not Assessed",
  "Possible Examinee",
  "Expected Examinee",
  "Scheduled",
  "Completed",
  "Not Applicable",
];

export const ISSUE_SOURCE_TYPES = ["Form 2", "Evidence Matrix", "Document Discovery", "Manual Issue", "Multiple Sources"];

export const ISSUE_PREPARATION_STATUSES = [
  "Not Reviewed",
  "Review Needed",
  "In Preparation",
  "Ready for Review",
  "Organizationally Prepared",
  "Not Applicable",
];

export const UNDERTAKING_RESPONSE_STATUSES = [
  "Open",
  "In Progress",
  "Response Prepared",
  "Response Delivered",
  "Disputed",
  "Withdrawn",
  "Completed",
  "Not Applicable",
];

export function makeExaminationReadiness(overrides = {}) {
  return {
    applicabilityStatus: "Not Yet Assessed",
    scheduledDate: "",
    scheduledTime: "",
    locationOrMethod: "Not Yet Confirmed",
    noticeReceived: false,
    noticeDate: "",
    appointmentFormReference: "",
    estimatedDuration: "",
    interpreterNeeded: false,
    accessibilityNeeds: "",
    counselOrAdvisorReviewRecommended: false,
    preparationStatus: "Not Started",
    generalNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeExaminee(overrides = {}) {
  return {
    id: overrides.id || `exm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    partyOrRole: "",
    organization: "",
    side: "Defendant",
    examinationStatus: "Not Assessed",
    scheduledDate: "",
    estimatedDuration: "",
    interpreterNeeded: false,
    preparationNotes: "",
    linkedIssueIds: [],
    linkedDocumentIds: [],
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makePreparationIssue(overrides = {}) {
  return {
    id: overrides.id || `pi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    sourceType: "Manual Issue",
    linkedFormTwoParagraphIds: [],
    linkedEvidenceMatrixRowIds: [],
    linkedDocumentDiscoveryIds: [],
    factualSummary: "",
    clarificationNeeded: "",
    knownAnswer: "",
    uncertaintyOrGap: "",
    supportingDocumentIds: [],
    relatedExamineeIds: [],
    preparationStatus: "Not Reviewed",
    reviewerNotes: "",
    sourceSnapshotText: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeUndertaking(overrides = {}) {
  return {
    id: overrides.id || `ut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    undertakingNumber: "",
    description: "",
    givenBy: "",
    relatedExamineeId: "",
    dateGiven: "",
    dueDate: "",
    responseStatus: "Open",
    responseSummary: "",
    responseDocumentIds: [],
    servedDate: "",
    followUpRequired: false,
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeTranscriptReference(overrides = {}) {
  return {
    id: overrides.id || `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    examineeId: "",
    transcriptAvailable: false,
    transcriptDate: "",
    transcriptReference: "",
    pageReference: "",
    issueSummary: "",
    followUpNeeded: false,
    linkedUndertakingIds: [],
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Computed display-only timing indicator from a user-entered due date — never
// a stored status value, and never a universally-invented deadline.
export function computeUndertakingTiming(undertaking) {
  if (["Completed", "Not Applicable", "Withdrawn"].includes(undertaking.responseStatus)) return null;
  if (!undertaking.dueDate) return null;
  const due = new Date(undertaking.dueDate + "T00:00:00");
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays <= 7) return "Due Soon";
  return "On Track";
}

// Import preparation issues from Evidence Matrix rows not already linked.
export function importIssuesFromEvidenceMatrix(evidenceMatrix, existingIssues) {
  const existing = existingIssues || [];
  const linkedRowIds = new Set(existing.flatMap((i) => i.linkedEvidenceMatrixRowIds || []));
  const created = [];
  for (const row of evidenceMatrix?.rows || []) {
    if (linkedRowIds.has(row.id)) continue;
    created.push(
      makePreparationIssue({
        title: row.allegationOrIssue || "(untitled issue)",
        sourceType: "Evidence Matrix",
        linkedEvidenceMatrixRowIds: [row.id],
        factualSummary: row.defendantPosition || "",
        sourceSnapshotText: row.allegationOrIssue || "",
      })
    );
    linkedRowIds.add(row.id);
  }
  return { issues: [...existing, ...created], added: created.length, alreadyLinked: (evidenceMatrix?.rows?.length || 0) - created.length };
}

// Import preparation issues from Document Discovery records not already linked.
export function importIssuesFromDocumentDiscovery(documentDiscovery, existingIssues) {
  const existing = existingIssues || [];
  const linkedDocIds = new Set(existing.flatMap((i) => i.linkedDocumentDiscoveryIds || []));
  const created = [];
  for (const doc of documentDiscovery?.documents || []) {
    if (linkedDocIds.has(doc.id)) continue;
    created.push(
      makePreparationIssue({
        title: doc.title || "(untitled document)",
        sourceType: "Document Discovery",
        linkedDocumentDiscoveryIds: [doc.id],
        factualSummary: doc.description || "",
        sourceSnapshotText: doc.title || "",
      })
    );
    linkedDocIds.add(doc.id);
  }
  return { issues: [...existing, ...created], added: created.length, alreadyLinked: (documentDiscovery?.documents?.length || 0) - created.length };
}

export function examinationDiscoverySummary(examinationDiscovery) {
  const examinees = examinationDiscovery?.examinees || [];
  const issues = examinationDiscovery?.preparationIssues || [];
  const undertakings = examinationDiscovery?.undertakings || [];
  const transcripts = examinationDiscovery?.transcriptReferences || [];
  return {
    applicabilityStatus: examinationDiscovery?.readiness?.applicabilityStatus || "Not Yet Assessed",
    examinees: examinees.length,
    preparationIssues: issues.length,
    issuesReadyForReview: issues.filter((i) => ["Ready for Review", "Organizationally Prepared"].includes(i.preparationStatus)).length,
    openUndertakings: undertakings.filter((u) => !["Completed", "Not Applicable", "Withdrawn"].includes(u.responseStatus)).length,
    overdueUndertakings: undertakings.filter((u) => computeUndertakingTiming(u) === "Overdue").length,
    transcriptFollowUps: transcripts.filter((t) => t.followUpNeeded).length,
  };
}

// Organizational readiness only — never a legal-compliance conclusion.
export function getExaminationReadiness(examinationDiscovery) {
  const readiness = examinationDiscovery?.readiness || makeExaminationReadiness();
  const examinees = examinationDiscovery?.examinees || [];
  const issues = examinationDiscovery?.preparationIssues || [];
  const undertakings = examinationDiscovery?.undertakings || [];
  const transcripts = examinationDiscovery?.transcriptReferences || [];

  if (readiness.applicabilityStatus === "Not Yet Assessed") return "Applicability not yet assessed";
  if (readiness.applicabilityStatus === "Scheduled" && (!readiness.scheduledDate || readiness.locationOrMethod === "Not Yet Confirmed")) {
    return "Scheduling details incomplete";
  }
  if (["Possible", "Expected", "Scheduled"].includes(readiness.applicabilityStatus)) {
    if (examinees.some((e) => !e.preparationNotes.trim())) return "Examinee preparation incomplete";
    if (issues.some((i) => !["Ready for Review", "Organizationally Prepared", "Not Applicable"].includes(i.preparationStatus))) {
      return "Preparation issues remain unresolved";
    }
    if (undertakings.some((u) => !["Completed", "Not Applicable", "Withdrawn"].includes(u.responseStatus))) {
      return "Open undertakings remain";
    }
    if (transcripts.some((t) => t.followUpNeeded)) return "Transcript follow-up remains";
  }
  return "Organizational preparation complete";
}

// ── Applications (Stage 7) ───────────────────────────────────────────────────
// Single source of truth for the application-record model, shared by
// src/components/ApplicationsWorkspace.jsx. Persisted verbatim inside the
// existing "AI Analysis JSON" envelope's applications key — see
// apps-script/DisputeApplications.gs. A case may face or bring multiple,
// distinct applications over its life, so this is modeled as a flat list
// rather than a single readiness object (unlike Examination for Discovery).

export const APPLICATIONS_NOTICE =
  "This workspace helps organize preparation for court applications the case may bring or respond to. It does " +
  "not determine whether an application should be brought, what relief to request, what evidence to rely on, " +
  "or whether materials are legally sufficient. Those issues may require review by a qualified lawyer.";

export const APPLICATIONS_CAUTIONS = [
  "Application filing and service deadlines are strict and can be short — confirm them as soon as an application is contemplated or received.",
  "Urgent applications may require an immediate response — do not wait to seek legal advice if served with one.",
  "An affidavit is sworn evidence — it must be accurate and within the deponent's own knowledge.",
  "A draft order should reflect only relief actually sought and should be reviewed by counsel before submission.",
  "Preserve original documents and evidence referenced in application materials.",
];

export const APPLICATION_ROLES = ["Not Yet Determined", "Bringing", "Responding", "Both"];

export const APPLICATION_TYPES = [
  "Procedural",
  "Production / Discovery",
  "Injunction",
  "Dismissal / Strike",
  "Case Management",
  "Costs",
  "Other",
];

export const APPLICATION_STATUSES = [
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

export const APPLICATION_TERMINAL_STATUSES = ["Decided", "Withdrawn", "Not Applicable"];

export const APPLICATION_MATERIALS_STATUSES = ["Not Started", "In Progress", "Ready for Review", "Filed", "Not Applicable"];

export const APPLICATION_PREPARATION_STATUSES = [
  "Not Reviewed",
  "In Preparation",
  "Ready for Review",
  "Organizationally Prepared",
  "Not Applicable",
];

export function makeApplication(overrides = {}) {
  return {
    id: overrides.id || `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    applicationRole: "Not Yet Determined",
    applicationType: "Other",
    status: "Not Yet Started",
    reliefSought: "",
    groundsSummary: "",
    hearingDate: "",
    hearingTime: "",
    locationOrMethod: "Not Yet Confirmed",
    filingDeadline: "",
    serviceDeadline: "",
    noticeOfApplicationFiled: false,
    applicationResponseFiled: false,
    affidavitsNeeded: false,
    affidavitsStatus: "Not Started",
    draftOrderNeeded: false,
    draftOrderStatus: "Not Started",
    urgent: false,
    linkedEvidenceMatrixRowIds: [],
    linkedDocumentDiscoveryIds: [],
    preparationStatus: "Not Reviewed",
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Computed display-only timing indicator from the user-entered filing
// deadline — never a stored status value, and never a universally-invented
// deadline. Only meaningful while the application is still active.
export function computeApplicationTiming(application) {
  if (APPLICATION_TERMINAL_STATUSES.includes(application.status)) return null;
  if (!application.filingDeadline) return null;
  const due = new Date(application.filingDeadline + "T00:00:00");
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays <= 7) return "Due Soon";
  return "On Track";
}

export function applicationsSummary(applications) {
  const list = applications || [];
  return {
    total: list.length,
    urgent: list.filter((a) => a.urgent && !APPLICATION_TERMINAL_STATUSES.includes(a.status)).length,
    scheduled: list.filter((a) => a.status === "Scheduled" || (a.hearingDate && !APPLICATION_TERMINAL_STATUSES.includes(a.status))).length,
    materialsOutstanding: list.filter(
      (a) =>
        !APPLICATION_TERMINAL_STATUSES.includes(a.status) &&
        ((a.affidavitsNeeded && !["Filed", "Not Applicable"].includes(a.affidavitsStatus)) ||
          (a.draftOrderNeeded && !["Filed", "Not Applicable"].includes(a.draftOrderStatus)))
    ).length,
    overdue: list.filter((a) => computeApplicationTiming(a) === "Overdue").length,
    filed: list.filter((a) => ["Filed", "Served", "Response Received", "Scheduled", "Heard"].includes(a.status)).length,
    decided: list.filter((a) => a.status === "Decided").length,
  };
}

// Organizational readiness only — never a legal-compliance conclusion.
export function getApplicationsReadiness(applications) {
  const list = applications || [];
  if (list.length === 0) return "No applications recorded";
  if (list.some((a) => a.urgent && !APPLICATION_TERMINAL_STATUSES.includes(a.status))) return "Urgent application requires immediate attention";
  if (list.some((a) => computeApplicationTiming(a) === "Overdue")) return "Filing deadline appears overdue — verify immediately";
  if (list.some((a) => computeApplicationTiming(a) === "Due Soon")) return "Filing deadline approaching";
  const summary = applicationsSummary(list);
  if (summary.materialsOutstanding > 0) return "Materials in preparation";
  if (list.some((a) => !APPLICATION_TERMINAL_STATUSES.includes(a.status) && a.preparationStatus !== "Organizationally Prepared")) {
    return "Preparation remains incomplete";
  }
  return "Organizational preparation complete";
}

export const SETTLEMENT_NOTICE =
  "This workspace helps organize preparation for settlement discussions and track offers exchanged. It does " +
  "not determine what terms to offer or accept, whether a settlement is advisable, or whether draft release " +
  "or consent order language is legally sufficient. Those issues may require review by a qualified lawyer.";

export const SETTLEMENT_CAUTIONS = [
  "Settlement communications are often treated differently from other correspondence (e.g. 'without prejudice') — understand this before writing informally about settlement.",
  "Do not treat a verbal or informal settlement as final — document and, where appropriate, formalize it with the court.",
  "Get legal advice before signing a release, especially one that gives up future claims.",
  "A formal offer to settle (Rule 9-1) has specific costs consequences — confirm the formal requirements before relying on it.",
  "Confirm any settlement involving a minor, represented party, or third-party payer meets required approvals.",
];

export const SETTLEMENT_OFFER_DIRECTIONS = ["Made by Client", "Received from Other Party", "Joint / Mediated Proposal"];

export const SETTLEMENT_OFFER_TYPES = ["Informal", "Formal Offer to Settle (Rule 9-1)", "Mediation Proposal", "Consent Terms Draft"];

export const SETTLEMENT_STATUSES = [
  "Draft",
  "Sent / Delivered",
  "Under Review",
  "Countered",
  "Accepted",
  "Rejected",
  "Expired",
  "Withdrawn",
];

export const SETTLEMENT_TERMINAL_STATUSES = ["Accepted", "Rejected", "Expired", "Withdrawn"];

export const SETTLEMENT_DOCUMENTATION_STATUSES = ["Not Started", "In Progress", "Ready for Review", "Finalized"];

export function makeSettlementOffer(overrides = {}) {
  return {
    id: overrides.id || `stl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    offerDirection: "Made by Client",
    offerType: "Informal",
    status: "Draft",
    monetaryAmount: "",
    nonMonetaryTerms: "",
    releaseRequired: false,
    releaseScope: "",
    costsTerms: "",
    paymentTerms: "",
    dateMade: "",
    responseDeadline: "",
    consentOrderNeeded: false,
    consentOrderStatus: "Not Started",
    discontinuanceNeeded: false,
    discontinuanceStatus: "Not Started",
    documentationStatus: "Not Started",
    reviewerNotes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Computed display-only timing indicator from the user-entered response
// deadline — never a stored status value, and never a universally-invented
// deadline. Only meaningful while the offer is still active.
export function computeSettlementTiming(offer) {
  if (SETTLEMENT_TERMINAL_STATUSES.includes(offer.status)) return null;
  if (!offer.responseDeadline) return null;
  const due = new Date(offer.responseDeadline + "T00:00:00");
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays <= 7) return "Due Soon";
  return "On Track";
}

export function settlementSummary(offers) {
  const list = offers || [];
  return {
    total: list.length,
    active: list.filter((o) => !SETTLEMENT_TERMINAL_STATUSES.includes(o.status)).length,
    awaitingResponse: list.filter((o) => ["Sent / Delivered", "Under Review"].includes(o.status)).length,
    overdue: list.filter((o) => computeSettlementTiming(o) === "Overdue").length,
    accepted: list.filter((o) => o.status === "Accepted").length,
    formalOffers: list.filter((o) => o.offerType === "Formal Offer to Settle (Rule 9-1)").length,
    formalizationOutstanding: list.filter(
      (o) =>
        o.status === "Accepted" &&
        (o.documentationStatus !== "Finalized" ||
          (o.consentOrderNeeded && !["Filed", "Not Applicable"].includes(o.consentOrderStatus)) ||
          (o.discontinuanceNeeded && !["Filed", "Not Applicable"].includes(o.discontinuanceStatus)))
    ).length,
  };
}

// Organizational readiness only — never a legal-compliance conclusion.
export function getSettlementReadiness(offers) {
  const list = offers || [];
  if (list.length === 0) return "No settlement discussions recorded";
  if (list.some((o) => computeSettlementTiming(o) === "Overdue")) return "Response deadline appears overdue — verify immediately";
  if (list.some((o) => computeSettlementTiming(o) === "Due Soon")) return "Response deadline approaching";
  const summary = settlementSummary(list);
  if (summary.formalizationOutstanding > 0) return "Accepted settlement needs to be documented or formalized";
  if (summary.awaitingResponse > 0) return "Offer awaiting response";
  return "No outstanding settlement action items";
}

const STAGE_ORDER = WORKFLOW_STAGES.map((stage) => stage.id);

// Fields the "Next Step" value can map to, for nudging a later stage from its
// default status to "in_progress" using data that already exists on the case
// record — no new backend fields required.
const NEXT_STEP_STAGE_HINTS = {
  "Prepare Litigation Assessment": "litigationAssessment",
  "Prepare Form 2 Working Draft": "form2",
  "Prepare Application Response": "applications",
  "Prepare Injunction Response": "applications",
  "Prepare Hearing": "trialPreparation",
  "Prepare Filing": "documentDiscovery",
  "Prepare Response": "form2",
};

// Derives every stage's status from data already present on the case record
// (Dispute Type, Status, Next Step) plus the existing Form 2 eligibility
// check — nothing is persisted. See docs/plan for why this is computed
// client-side rather than stored on the sheet.
export function getWorkflowProgress(review, formTwoEligibility, evidenceMatrix, documentDiscovery, examinationDiscovery, applications, settlement) {
  const status = review?.["Status"] || "";
  const nextStep = review?.["Next Step"] || "";
  const isSupremeCourtDefendant =
    review?.["Dispute Type"] === "Supreme Court Litigation" && review?.["Client Role"] === "Defendant";

  const progress = {};

  progress.intake = "completed";
  progress.litigationAssessment = status === "Intake Incomplete" ? "not_started" : "completed";

  if (!isSupremeCourtDefendant) {
    progress.form2 = "not_applicable";
  } else if (nextStep && nextStep !== "Prepare Form 2 Working Draft" && NEXT_STEP_STAGE_HINTS[nextStep]) {
    // A later Next Step implies Form 2 preparation has moved on.
    progress.form2 = "completed";
  } else if (formTwoEligibility?.eligible) {
    progress.form2 = "in_progress";
  } else {
    progress.form2 = "not_started";
  }

  const defaultLaterStatus = {
    evidencePreparation: "not_started",
    documentDiscovery: "not_started",
    examinationForDiscovery: "conditional",
    applications: "conditional",
    settlement: "conditional",
    trialPreparation: "not_started",
    courtBinder: "not_started",
    judgmentCostsEnforcement: "not_started",
  };

  for (const [stageId, defaultStatus] of Object.entries(defaultLaterStatus)) {
    progress[stageId] = defaultStatus;
  }

  const hintedStage = NEXT_STEP_STAGE_HINTS[nextStep];
  if (hintedStage && Object.prototype.hasOwnProperty.call(defaultLaterStatus, hintedStage)) {
    progress[hintedStage] = "in_progress";
  }

  // Evidence Matrix, where it exists, is the source of truth for Stage 4 —
  // overrides the Next-Step heuristic above.
  const matrixRows = evidenceMatrix?.rows;
  if (Array.isArray(matrixRows) && matrixRows.length > 0) {
    const allDone = matrixRows.every((row) => row.status === "Reviewed" || row.status === "Not Applicable");
    progress.evidencePreparation = allDone ? "completed" : "in_progress";
  } else {
    progress.evidencePreparation = "not_started";
  }

  // Document Discovery workspace, where it exists, is the source of truth
  // for Stage 5 — overrides the Next-Step heuristic above.
  const discoveryDocs = documentDiscovery?.documents;
  if (Array.isArray(discoveryDocs) && discoveryDocs.length > 0) {
    const hasOutstandingPossession = discoveryDocs.some((d) => ["Missing", "Requested", "Expected from Other Party"].includes(d.possessionStatus));
    const hasOutstandingPrivilege = discoveryDocs.some((d) => ["Potentially Privileged", "Needs Legal Review"].includes(d.privilegeFlag));
    const allReviewed = discoveryDocs.every((d) => ["Reviewed", "Not Relevant", "Duplicate"].includes(d.reviewStatus));
    progress.documentDiscovery = allReviewed && !hasOutstandingPossession && !hasOutstandingPrivilege ? "completed" : "in_progress";
  } else {
    progress.documentDiscovery = "not_started";
  }

  // Examination for Discovery workspace, where it exists, is the source of
  // truth for Stage 6 — overrides the "conditional" default above. Stays
  // conditional unless the reviewer has actually recorded an applicability
  // status indicating an examination is possible/expected/scheduled/done.
  const applicability = examinationDiscovery?.readiness?.applicabilityStatus;
  if (!applicability || ["Not Yet Assessed", "Not Currently Expected"].includes(applicability)) {
    progress.examinationForDiscovery = "conditional";
  } else if (applicability === "Not Applicable" || applicability === "Completed") {
    progress.examinationForDiscovery = "completed";
  } else {
    // Possible / Expected / Scheduled
    const examinees = examinationDiscovery?.examinees || [];
    const issues = examinationDiscovery?.preparationIssues || [];
    const undertakings = examinationDiscovery?.undertakings || [];
    const hasRecords = examinees.length > 0 || issues.length > 0 || undertakings.length > 0;
    if (!hasRecords) {
      progress.examinationForDiscovery = "not_started";
    } else {
      const orgPrepComplete = ["Organizational Preparation Complete", "Completed"].includes(
        examinationDiscovery?.readiness?.preparationStatus
      );
      const unresolvedIssues = issues.some((i) => !["Organizationally Prepared", "Not Applicable"].includes(i.preparationStatus));
      const openUndertakings = undertakings.some((u) => !["Completed", "Not Applicable", "Withdrawn"].includes(u.responseStatus));
      progress.examinationForDiscovery = orgPrepComplete && !unresolvedIssues && !openUndertakings ? "completed" : "in_progress";
    }
  }

  // Applications workspace, where it exists, is the source of truth for
  // Stage 7 — overrides the "conditional" default above. Stays conditional
  // unless the reviewer has actually recorded a real application.
  const applicationRecords = applications?.applications;
  if (!Array.isArray(applicationRecords) || applicationRecords.length === 0) {
    progress.applications = "conditional";
  } else {
    const allTerminal = applicationRecords.every((a) => APPLICATION_TERMINAL_STATUSES.includes(a.status));
    progress.applications = allTerminal ? "completed" : "in_progress";
  }

  // Settlement workspace, where it exists, is the source of truth for
  // Stage 8 — overrides the "conditional" default above. Stays conditional
  // unless the reviewer has actually recorded a real offer.
  const settlementOffers = settlement?.offers;
  if (!Array.isArray(settlementOffers) || settlementOffers.length === 0) {
    progress.settlement = "conditional";
  } else {
    const allTerminal = settlementOffers.every((o) => SETTLEMENT_TERMINAL_STATUSES.includes(o.status));
    progress.settlement = allTerminal ? "completed" : "in_progress";
  }

  // A conditional stage must not silently steal focus as "the current stage"
  // just because it hasn't been resolved — only stages with real, actionable
  // status (not_started/in_progress) should auto-expand.
  const currentStage =
    STAGE_ORDER.find((id) => !["completed", "not_applicable", "conditional"].includes(progress[id])) ||
    STAGE_ORDER[STAGE_ORDER.length - 1];

  return { ...progress, currentStage };
}
