// ── AI Dispute Review — review engine (Shadow / V1) ───────────────────────────
// Mirrors the Property Strategy Assessment pipeline:
//   AI Intake -> AI Initial Review -> Professional Review -> Final Report
//
// Single source of truth: analyseDispute() produces one language-neutral
// analysis object. Both the English and the Chinese report are rendered from
// that same object, so the Chinese version can never introduce a fact,
// judgment, or recommendation the English version does not contain.
//
// The English report is the formal original. The Chinese report is the
// corresponding version for Chinese-reading clients.

import { apiPost, isApiConnected } from "./api";
import { getStudioRequestAuth } from "./trialAccess";

export const DISPUTE_REVIEW_SPREADSHEET_ID = "1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90";
export const DISPUTE_REVIEW_FOLDER_URL = "https://drive.google.com/drive/folders/1iIMToPAg8EBjiWs-fprXBZW_tpycJ000";

export const DISPUTE_MAX_FILES = 25;
export const DISPUTE_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const DISPUTE_ACCEPT_ATTRIBUTE =
  ".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.txt,.csv,.xls,.xlsx,image/*,application/pdf";
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic", "webp", "doc", "docx", "txt", "csv", "xls", "xlsx"];

// The exact wording required whenever the file cannot be reliably assessed.
export const INSUFFICIENT_MATERIALS_EN =
  "The available materials are insufficient for a reliable assessment. Additional documents or clarification are required.";
export const INSUFFICIENT_MATERIALS_ZH =
  "现有资料不足以作出可靠评估，需要补充文件或进一步说明。";

export const DISPUTE_DISCLAIMER_EN =
  "This report is a preliminary AI-assisted review based on the information and documents provided. It is not legal advice and does not guarantee any tribunal or court outcome. Final conclusions require professional review and verification of current laws, rules, deadlines, and evidence.";
export const DISPUTE_DISCLAIMER_ZH =
  "本报告是基于所提供的信息和文件而生成的 AI 辅助初步审阅，不构成法律意见，也不保证任何仲裁机构或法院的结果。最终结论须经专业审核，并核实当前适用的法律、规则、期限与证据。";

export const DISPUTE_BRAND_LINE_EN = "AI organizes the facts. Professional experience reviews the risk.";
export const DISPUTE_BRAND_LINE_ZH = "AI 整理事实，专业经验审阅风险。";

function normalizeLang(value) {
  return value === "zh" ? "zh" : "en";
}

function t(pair, lang) {
  if (!pair) return "";
  if (typeof pair === "string") return pair;
  return normalizeLang(lang) === "zh" ? pair.zh : pair.en;
}

function tList(pairs, lang) {
  return (pairs || []).map((pair) => t(pair, lang)).filter(Boolean);
}

// ── Option lists ──────────────────────────────────────────────────────────────
// Every value below is copied verbatim from the Dropdown_Options sheet, which is
// the single source of truth. The English value is what gets stored; ZH is
// display only. Do not add a value here that the sheet does not offer.

export const DISPUTE_TYPES = ["RTB", "CRT", "Strata", "Small Claims", "Other"];

export const CLIENT_ROLES = [
  "Landlord",
  "Tenant",
  "Property Manager",
  "Strata Owner",
  "Strata Corporation",
  "Claimant",
  "Respondent",
  "Other",
];

export const TRIBUNALS = ["BC RTB", "BC CRT", "BC Provincial Court", "Strata Council", "Other"];

export const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

export const REVIEW_PRIORITIES = ["Normal", "High", "Urgent"];

export const NEXT_STEPS = [
  "Provide Missing Evidence",
  "Book Professional Review",
  "Verify Deadline and Service",
  "Prepare Response",
  "Prepare Filing",
  "Prepare Hearing",
  "No Further Action",
];

export const DISPUTE_STATUSES = [
  "New",
  "Intake Incomplete",
  "AI Drafted",
  "Professional Review",
  "More Evidence Required",
  "Report Generated",
  "Completed",
  "Closed",
];

export const RELATIONSHIPS = [
  "Landlord - Tenant",
  "Tenant - Landlord",
  "Strata - Owner",
  "Owner - Strata",
  "Neighbour",
  "Contractor / Service Provider",
  "Buyer / Seller",
  "Other",
];

export const PROCEEDING_STATUS = [
  "Not started",
  "Preparing to file",
  "Application filed",
  "Response received",
  "Hearing scheduled",
  "Decision received",
  "Not sure",
];

export const SERVICE_METHODS = [
  "In person",
  "Registered mail",
  "Regular mail",
  "Email",
  "Posted on door",
  "Not served yet",
  "Not sure",
];

export const YES_NO_NOT_SURE = ["Yes", "No", "Not sure"];

export const CONTACT_OPTIONS = ["Email", "Phone", "Text / WeChat", "WhatsApp", "Other"];

// Form_Fields defines these two as their own option sets.
export const INSPECTION_REPORT_OPTIONS = ["Move-in", "Move-out", "Both", "Neither", "Not applicable"];
export const SMALL_CLAIMS_PLEADING_OPTIONS = ["Claim", "Reply", "Both", "Neither"];

export const DOCUMENT_CATEGORIES = [
  "Tenancy Agreement / Contract",
  "Notice",
  "Application",
  "Response / Counterclaim",
  "Email / Message",
  "Photo",
  "Video",
  "Invoice / Receipt",
  "Payment Record",
  "Inspection Report",
  "Strata Document",
  "Tribunal Document",
  "Court Document",
  "Other",
];

export const CLIENT_SERVICE_INTERESTS = [
  "Professional preliminary review only",
  "Help preparing my application / response",
  "Help organizing evidence",
  "Full representation referral",
  "Not ready yet - keep my intake on file",
];

const OPTION_LABELS_ZH = {
  RTB: "住宅租赁 (RTB)",
  CRT: "民事解决法庭 (CRT)",
  Strata: "分契物业 (Strata)",
  "Small Claims": "小额索偿",
  Other: "其他",
  Landlord: "房东",
  Tenant: "租客",
  "Property Manager": "物业管理人",
  "Strata Owner": "分契业主",
  "Strata Corporation": "分契法团",
  Claimant: "申索方",
  Respondent: "答辩方",
  "BC RTB": "卑诗省住宅租赁办公室 (BC RTB)",
  "BC CRT": "卑诗省民事解决法庭 (BC CRT)",
  "BC Provincial Court": "卑诗省省级法院",
  "Strata Council": "分契物业管委会",
  "Not sure": "不确定",
  Review: "待复核",
  "Landlord - Tenant": "房东对租客",
  "Tenant - Landlord": "租客对房东",
  "Strata - Owner": "法团对业主",
  "Owner - Strata": "业主对法团",
  Neighbour: "邻居",
  "Contractor / Service Provider": "承包商 / 服务提供方",
  "Buyer / Seller": "买方 / 卖方",
  "Not started": "尚未开始",
  "Preparing to file": "准备提交申请",
  "Application filed": "已提交申请",
  "Response received": "已收到答辩",
  "Hearing scheduled": "已安排听证",
  "Decision received": "已收到裁决",
  "In person": "当面送达",
  "Registered mail": "挂号信",
  "Regular mail": "普通邮寄",
  Email: "邮件",
  "Posted on door": "张贴于门上",
  "Not served yet": "尚未送达",
  Yes: "是",
  No: "否",
  Phone: "电话",
  "Text / WeChat": "短信 / 微信",
  WhatsApp: "WhatsApp",
  "Move-in": "入住检查",
  "Move-out": "退租检查",
  Both: "两者都有",
  Neither: "两者都没有",
  "Not applicable": "不适用",
  Claim: "诉状",
  Reply: "答辩",
  "Tenancy Agreement / Contract": "租约 / 合同",
  Notice: "通知书",
  Application: "申请表",
  "Response / Counterclaim": "答辩 / 反诉",
  "Email / Message": "邮件 / 信息记录",
  Photo: "照片",
  Video: "视频",
  "Invoice / Receipt": "发票 / 收据",
  "Payment Record": "付款记录",
  "Inspection Report": "检查报告",
  "Strata Document": "分契物业文件",
  "Tribunal Document": "仲裁机构文件",
  "Court Document": "法院文件",
  "Professional preliminary review only": "仅需专业初步审核",
  "Help preparing my application / response": "协助准备申请 / 答辩",
  "Help organizing evidence": "协助整理证据",
  "Full representation referral": "转介全程代理",
  "Not ready yet - keep my intake on file": "暂未准备好，先保留资料",
  Low: "低",
  Medium: "中",
  High: "高",
  Critical: "极高",
  "Not assessable": "无法评估",
  Urgent: "紧急",
  Normal: "普通",
  "Provide Missing Evidence": "补齐缺失证据",
  "Book Professional Review": "预约专业审核",
  "Verify Deadline and Service": "核实期限与送达",
  "Prepare Response": "准备答辩",
  "Prepare Filing": "准备提交申请",
  "Prepare Hearing": "准备听证",
  "No Further Action": "无需进一步行动",
  "Intake Incomplete": "资料不完整",
  "AI Drafted": "AI 已起草",
  "Professional Review": "专业审核中",
  "More Evidence Required": "需要补充证据",
  "Report Generated": "报告已生成",
  Completed: "已完成",
  Closed: "已关闭",
  New: "新建",
};

export function displayDisputeOption(value, lang = "en") {
  const text = String(value || "");
  if (normalizeLang(lang) !== "zh") return text;
  return OPTION_LABELS_ZH[text] || text;
}

// Tribunal implied by the dispute type. The client can still override it.
export function suggestedTribunal(disputeType) {
  switch (disputeType) {
    case "RTB": return "BC RTB";
    case "CRT": return "BC CRT";
    case "Strata": return "Strata Council";
    case "Small Claims": return "BC Provincial Court";
    default: return "";
  }
}

// ── Form model ────────────────────────────────────────────────────────────────

export function createEmptyDisputeReview(overrides = {}) {
  return {
    reviewId: "",
    status: "New",
    leadSource: "Website - AI Review Center",
    clientName: "",
    email: "",
    phone: "",
    preferredContact: "",
    clientRole: "",
    disputeType: "",
    tribunal: "",
    propertyAddress: "",
    city: "",
    province: "BC",
    opposingPartyName: "",
    relationshipToOpposingParty: "",
    disputeSummary: "",
    clientPosition: "",
    opposingPosition: "",
    desiredOutcome: "",
    noticeDate: "",
    serviceDate: "",
    filingDeadline: "",
    hearingDate: "",
    limitationDate: "",
    proceedingStatus: "",
    applicationFiled: "",
    responseReceived: "",
    serviceMethod: "",
    monetaryAmount: "",
    keyEvidenceSummary: "",
    missingEvidence: "",
    serviceConcerns: "",
    legalIssues: "",
    clientServiceInterest: "",
    nextStep: "",
    followUpAnswers: {},
    consentToContact: false,
    privacyConsent: false,
    ...overrides,
  };
}

export function createDisputeReviewId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    "ADR",
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-");
}

// ── Dynamic follow-up questions, driven only by Dispute Type ─────────────────
// V1 deliberately keeps this short: a few decisive questions per forum rather
// than a full legal questionnaire.

// The `id` of each question is the exact Field Key from the Form_Fields sheet,
// so the stored Follow-up Answers text stays traceable back to that spec.
export function getDisputeFollowUpQuestions(form) {
  const questions = [];
  const add = (group, id, en, zh, type = "choice", options = YES_NO_NOT_SURE) => {
    questions.push({ group, id, question: { en, zh }, type, options });
  };

  if (form.disputeType === "RTB") {
    add("RTB", "rtb_tenancy_agreement", "Tenancy Agreement Available?", "是否有完整租约");
    add("RTB", "rtb_notice_application", "RTB Notice or Application Available?", "是否有 RTB 通知或申请文件");
    add("RTB", "rtb_proof_service", "Proof of Service Available?", "是否有送达证明");
    add("RTB", "rtb_inspection_reports", "Condition Inspection Reports Available?", "是否有入住或退租检查报告", "choice", INSPECTION_REPORT_OPTIONS);
    add("RTB", "rtb_deposit_amount", "Security Deposit Amount (CAD)", "押金金额（加元）", "text");
    add("RTB", "rtb_rent_amount", "Rent Amount (CAD)", "月租金额（加元）", "text");
  }

  if (form.disputeType === "CRT") {
    add("CRT", "crt_notice", "Notice of Dispute Available?", "是否有 CRT 争议通知");
    add("CRT", "crt_response_deadline", "Response Deadline", "答辩截止日期", "date");
  }

  if (form.disputeType === "Strata") {
    add("Strata", "strata_bylaw", "Bylaw or Rule Involved", "涉及的章程或规则", "textarea");
    add("Strata", "strata_hearing", "Council Hearing Requested?", "是否已申请委员会听证");
  }

  if (form.disputeType === "Small Claims") {
    add("Small Claims", "small_claims_pleadings", "Notice of Claim / Reply Available?", "是否有诉状或答辩", "choice", SMALL_CLAIMS_PLEADING_OPTIONS);
  }

  return questions;
}

export function formatDisputeFollowUpAnswers(form, lang = "en") {
  const safeLang = normalizeLang(lang);
  const answers = form.followUpAnswers || {};
  return getDisputeFollowUpQuestions(form)
    .map((item) => {
      const answer = String(answers[item.id] || "").trim();
      if (!answer) return "";
      return `- ${t(item.question, safeLang)} ${displayDisputeOption(answer, safeLang)}`;
    })
    .filter(Boolean)
    .join("\n");
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parsed = new Date(`${text}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysFromToday(value) {
  const date = parseDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function hasText(value, min = 1) {
  return String(value || "").trim().length >= min;
}

// ── Step 1-8: the analysis, in the required order ─────────────────────────────

export function analyseDispute(form, files = []) {
  const answers = form.followUpAnswers || {};
  const uploaded = Array.isArray(files) ? files : [];
  const categories = new Set(uploaded.map((file) => file.documentCategory));

  // 1. Is the intake complete?
  const intakeChecks = [
    { key: "clientRole", ok: hasText(form.clientRole), label: { en: "Your role in the dispute", zh: "您在争议中的身份" } },
    { key: "disputeType", ok: hasText(form.disputeType), label: { en: "Dispute type", zh: "争议类型" } },
    { key: "opposingPartyName", ok: hasText(form.opposingPartyName), label: { en: "Opposing party", zh: "对方当事人" } },
    { key: "disputeSummary", ok: hasText(form.disputeSummary, 40), label: { en: "Dispute summary in sufficient detail", zh: "足够详细的争议概述" } },
    { key: "clientPosition", ok: hasText(form.clientPosition, 20), label: { en: "Your position", zh: "您的立场" } },
    { key: "opposingPosition", ok: hasText(form.opposingPosition, 20), label: { en: "Opposing party's position", zh: "对方立场" } },
    { key: "desiredOutcome", ok: hasText(form.desiredOutcome), label: { en: "Desired outcome", zh: "期望结果" } },
    { key: "keyDates", ok: !!(form.noticeDate || form.serviceDate || form.filingDeadline || form.hearingDate || form.limitationDate), label: { en: "At least one key date", zh: "至少一个关键日期" } },
    { key: "proceedingStatus", ok: hasText(form.proceedingStatus), label: { en: "Current proceeding status", zh: "当前程序状态" } },
  ];
  const intakeMissing = intakeChecks.filter((check) => !check.ok);
  const intakeCompletionScore = Math.round(((intakeChecks.length - intakeMissing.length) / intakeChecks.length) * 100);

  // 2. Are the key documents present?
  const expectedDocuments = expectedDocumentsFor(form);
  const documentsPresent = expectedDocuments.filter((doc) => categories.has(doc.category));
  const documentsAbsent = expectedDocuments.filter((doc) => !categories.has(doc.category));

  // 3. Are the documents signed and dated?
  const undated = uploaded.filter((file) => !String(file.documentDate || "").trim());
  const unattributed = uploaded.filter((file) => !String(file.senderIssuer || "").trim());
  const contractFiles = uploaded.filter((file) => file.documentCategory === "Tenancy Agreement / Contract");

  // 4. Is there proof of service?
  const serviceRelevant = ["RTB", "Small Claims", "CRT"].includes(form.disputeType);
  const serviceMethodGiven = hasText(form.serviceMethod) && form.serviceMethod !== "Not sure";
  const serviceDateGiven = !!form.serviceDate;
  const serviceProofAnswered = answers.rtb_proof_service === "Yes";
  const serviceEstablished = serviceRelevant
    ? serviceMethodGiven && serviceDateGiven
    : true;

  // 5. Is the timeline internally consistent?
  const timeline = buildTimeline(form);
  const timelineConflicts = findTimelineConflicts(form);

  // 6. Is each assertion supported by evidence?
  const assertions = [
    { made: hasText(form.clientPosition, 20), supported: uploaded.length > 0, label: { en: "Your account of events", zh: "您对事件经过的陈述" } },
    { made: hasText(form.monetaryAmount), supported: categories.has("Invoice / Receipt") || categories.has("Payment Record"), label: { en: "The amount claimed or disputed", zh: "所主张或争议的金额" } },
    { made: !!form.noticeDate, supported: categories.has("Notice"), label: { en: "The notice relied on", zh: "所依据的通知书" } },
    { made: form.applicationFiled === "Yes", supported: categories.has("Application") || categories.has("Tribunal Document") || categories.has("Court Document"), label: { en: "That an application was filed", zh: "已提交申请这一事实" } },
    { made: form.responseReceived === "Yes", supported: categories.has("Response / Counterclaim"), label: { en: "That a response or counterclaim was received", zh: "已收到答辩或反诉这一事实" } },
  ];
  const unsupportedAssertions = assertions.filter((item) => item.made && !item.supported);

  // 7. Is decisive material missing?
  const decisiveMissing = documentsAbsent.filter((doc) => doc.decisive);
  const clientReportedMissing = hasText(form.missingEvidence);

  // 8. Procedural and deadline risk.
  const deadlineRisks = [];
  const filingIn = daysFromToday(form.filingDeadline);
  const limitationIn = daysFromToday(form.limitationDate);
  const hearingIn = daysFromToday(form.hearingDate);
  if (filingIn !== null && filingIn < 0) {
    deadlineRisks.push({ code: "FILING_DEADLINE_PASSED", severity: "high", text: { en: "The filing deadline entered has already passed. Whether any extension or relief is available must be verified immediately.", zh: "所填写的提交期限已过。是否仍可申请延期或救济，必须立即核实。" } });
  } else if (filingIn !== null && filingIn <= 14) {
    deadlineRisks.push({ code: "FILING_DEADLINE_IMMINENT", severity: "high", text: { en: `The filing deadline is about ${filingIn} day(s) away, which leaves very little time to prepare.`, zh: `提交期限约在 ${filingIn} 天后，准备时间非常有限。` } });
  }
  if (limitationIn !== null && limitationIn < 0) {
    deadlineRisks.push({ code: "LIMITATION_DATE_PASSED", severity: "high", text: { en: "The limitation date entered has already passed. A limitation period is generally absolute and must be verified before anything else.", zh: "所填写的时效期限已过。时效通常是绝对的，必须优先核实。" } });
  } else if (limitationIn !== null && limitationIn <= 30) {
    deadlineRisks.push({ code: "LIMITATION_DATE_IMMINENT", severity: "high", text: { en: `The limitation date is about ${limitationIn} day(s) away.`, zh: `时效期限约在 ${limitationIn} 天后。` } });
  }
  if (hearingIn !== null && hearingIn >= 0 && hearingIn <= 14) {
    deadlineRisks.push({ code: "HEARING_IMMINENT", severity: "high", text: { en: `A hearing is scheduled in about ${hearingIn} day(s).`, zh: `听证会约在 ${hearingIn} 天后举行。` } });
  }
  if (!form.filingDeadline && !form.limitationDate) {
    deadlineRisks.push({ code: "NO_DEADLINE_PROVIDED", severity: "medium", text: { en: "No filing deadline or limitation date was provided, so no deadline risk could be checked.", zh: "未提供提交期限或时效日期，因此无法检查期限风险。" } });
  }

  const procedureRisks = [];
  if (serviceRelevant && !serviceMethodGiven) {
    procedureRisks.push({ code: "SERVICE_METHOD_UNKNOWN", text: { en: "The method of service was not stated. Service validity is a common reason for an application to fail before the merits are considered.", zh: "未说明送达方式。送达是否有效，常常导致申请在进入实质审理前即告失败。" } });
  }
  if (serviceRelevant && serviceMethodGiven && !serviceDateGiven) {
    procedureRisks.push({ code: "SERVICE_DATE_MISSING", text: { en: "A service method was given but no service date, so the deemed-service timing cannot be checked.", zh: "已说明送达方式但未提供送达日期，因此无法核对推定送达的时间。" } });
  }
  if (form.disputeType === "RTB" && answers.rtb_notice_application === "No") {
    procedureRisks.push({ code: "RTB_NOTICE_DOCUMENT_MISSING", text: { en: "The RTB notice or application being relied on is not available. Whether the document used meets the current form requirements cannot be checked.", zh: "所依据的 RTB 通知或申请文件无法提供。所用文件是否符合当前表格要求，无从核对。" } });
  }
  if (form.disputeType === "RTB" && answers.rtb_tenancy_agreement === "No") {
    procedureRisks.push({ code: "RTB_TENANCY_AGREEMENT_MISSING", text: { en: "No complete tenancy agreement is available, so the governing terms cannot be confirmed.", zh: "无法提供完整租约，因此无法确认适用条款。" } });
  }
  if (form.disputeType === "Strata" && answers.strata_hearing === "No") {
    procedureRisks.push({ code: "STRATA_COUNCIL_HEARING_NOT_REQUESTED", text: { en: "No council hearing has been requested. Whether the strata's internal process must be exhausted first should be verified against the Strata Property Act and the strata's own bylaws.", zh: "尚未申请委员会听证。是否必须先用尽分契物业的内部程序，须对照 Strata Property Act 及该分契物业自身的 Bylaw 核实。" } });
  }
  if (form.disputeType === "CRT" && !String(answers.crt_response_deadline || "").trim()) {
    procedureRisks.push({ code: "CRT_RESPONSE_DEADLINE_UNKNOWN", text: { en: "The CRT response deadline is not known. A missed response deadline can result in a default decision.", zh: "尚不清楚 CRT 的答辩截止日期。错过答辩期限可能导致缺席裁决。" } });
  }
  if (form.disputeType === "Small Claims" && answers.small_claims_pleadings === "Neither") {
    procedureRisks.push({ code: "SMALL_CLAIMS_PLEADINGS_MISSING", text: { en: "Neither the Notice of Claim nor the Reply is available, so the issues actually pleaded cannot be confirmed.", zh: "诉状与答辩均无法提供，因此无法确认实际主张的争点。" } });
  }
  if (hasText(form.serviceConcerns)) {
    procedureRisks.push({ code: "CLIENT_REPORTED_SERVICE_CONCERN", text: { en: "You raised a concern about service or procedure, which is carried forward for professional review.", zh: "您提出了关于送达或程序的疑虑，此项已转交专业审核。" } });
  }

  // Evidence sufficiency gate — everything above feeds this one decision.
  const blockingReasons = [];
  if (intakeMissing.length >= 3) {
    blockingReasons.push({ en: "Several core intake questions are unanswered.", zh: "多个核心问询项目尚未回答。" });
  }
  if (!hasText(form.disputeSummary, 40)) {
    blockingReasons.push({ en: "The dispute summary is too short to establish what happened.", zh: "争议概述过短，无法确定事件经过。" });
  }
  if (uploaded.length === 0) {
    blockingReasons.push({ en: "No documents or evidence were uploaded.", zh: "未上传任何文件或证据。" });
  }
  if (decisiveMissing.length) {
    blockingReasons.push({
      en: `Decisive documents for this dispute type are missing: ${decisiveMissing.map((doc) => doc.category).join(", ")}.`,
      zh: `本争议类型的决定性文件缺失：${decisiveMissing.map((doc) => displayDisputeOption(doc.category, "zh")).join("、")}。`,
    });
  }
  const sufficient = blockingReasons.length === 0;

  // Strengths and weaknesses are only assessed once sufficiency is established.
  const strengths = sufficient ? buildStrengths(form, answers, categories, {
    serviceEstablished, serviceProofAnswered, timelineConflicts, unsupportedAssertions,
  }) : [];
  const weaknesses = buildWeaknesses(form, {
    unsupportedAssertions, timelineConflicts, undated, unattributed, contractFiles,
    clientReportedMissing, documentsAbsent, deadlineRisks, procedureRisks, uploaded,
  });

  const flags = [];
  if (!sufficient) flags.push("INSUFFICIENT_MATERIALS");
  if (intakeMissing.length) flags.push("INTAKE_INCOMPLETE");
  if (!hasText(form.opposingPosition, 20)) flags.push("INTAKE_OPPOSING_POSITION_MISSING");
  if (decisiveMissing.length) flags.push("DECISIVE_DOCUMENT_MISSING");
  if (unsupportedAssertions.length) flags.push("UNSUPPORTED_ASSERTION");
  if (timelineConflicts.length) flags.push("TIMELINE_INCONSISTENT");
  if (undated.length) flags.push("UNDATED_DOCUMENT");
  deadlineRisks.forEach((risk) => flags.push(risk.code));
  procedureRisks.forEach((risk) => flags.push(risk.code));
  if (!flags.length) flags.push("NO_MAJOR_AI_FLAGS");

  // Confidence: starts from intake completeness, then is reduced by every
  // unresolved evidentiary or procedural gap. It is never a merits prediction.
  let confidenceScore = intakeCompletionScore;
  confidenceScore -= decisiveMissing.length * 12;
  confidenceScore -= unsupportedAssertions.length * 6;
  confidenceScore -= timelineConflicts.length * 8;
  confidenceScore -= undated.length * 2;
  if (uploaded.length === 0) confidenceScore -= 25;
  if (serviceRelevant && !serviceEstablished) confidenceScore -= 10;
  confidenceScore = Math.max(5, Math.min(90, Math.round(confidenceScore)));

  const highRisk = deadlineRisks.some((risk) => risk.severity === "high");
  // A date that has already passed is the only thing that reaches "Critical".
  const expired = deadlineRisks.some((risk) =>
    risk.code === "FILING_DEADLINE_PASSED" || risk.code === "LIMITATION_DATE_PASSED");

  // AI Risk Level is written blank when the file cannot be assessed at all, so
  // the stored value always stays inside the Dropdown_Options set. The report
  // and Admin show "Not assessable" for that case, derived from `sufficient`.
  const riskLevel = !sufficient
    ? ""
    : expired
      ? "Critical"
      : highRisk || procedureRisks.length >= 2
        ? "High"
        : procedureRisks.length || weaknesses.length >= 3
          ? "Medium"
          : "Low";
  const riskLevelDisplay = { en: sufficient ? riskLevel : "Not assessable", zh: sufficient ? riskLevel : "Not assessable" };

  const reviewPriority = highRisk
    ? "Urgent"
    : (hearingIn !== null && hearingIn >= 0 && hearingIn <= 30) || procedureRisks.length
      ? "High"
      : "Normal";

  const recommendedNextStep = !sufficient
    ? "Provide Missing Evidence"
    : highRisk
      ? "Verify Deadline and Service"
      : form.responseReceived === "Yes"
        ? "Prepare Response"
        : unsupportedAssertions.length || undated.length || decisiveMissing.length
          ? "Provide Missing Evidence"
          : hearingIn !== null && hearingIn >= 0
            ? "Prepare Hearing"
            : form.applicationFiled === "No"
              ? "Prepare Filing"
              : "Book Professional Review";

  return {
    sufficient,
    blockingReasons,
    intakeChecks,
    intakeMissing,
    intakeCompletionScore,
    expectedDocuments,
    documentsPresent,
    documentsAbsent,
    decisiveMissing,
    uploaded,
    undated,
    unattributed,
    serviceRelevant,
    serviceEstablished,
    serviceProofAnswered,
    timeline,
    timelineConflicts,
    unsupportedAssertions,
    deadlineRisks,
    procedureRisks,
    legalIssuesToVerify: buildLegalIssuesToVerify(form),
    strengths,
    weaknesses,
    flags,
    confidenceScore,
    riskLevel,
    riskLevelDisplay,
    reviewPriority,
    recommendedNextStep,
  };
}

function expectedDocumentsFor(form) {
  const base = [];
  const push = (category, decisive, en, zh) => base.push({ category, decisive, why: { en, zh } });

  if (form.disputeType === "RTB") {
    push("Tenancy Agreement / Contract", true, "Establishes the tenancy and its terms.", "确立租赁关系及其条款。");
    push("Notice", true, "The notice is the document the dispute turns on.", "通知书是争议的核心文件。");
    push("Payment Record", false, "Rent and deposit history.", "租金与押金记录。");
    push("Inspection Report", false, "Condition inspection reports at move-in and move-out.", "入住与退租的物业状况检查报告。");
    push("Email / Message", false, "Communication between the parties.", "双方之间的往来沟通。");
  } else if (form.disputeType === "CRT") {
    push("Application", true, "Notice of Dispute or CRT application.", "Notice of Dispute 或 CRT 申请文件。");
    push("Response / Counterclaim", false, "The other party's Response.", "对方的 Response（答辩）。");
    push("Email / Message", false, "Communication between the parties.", "双方之间的往来沟通。");
    push("Strata Document", false, "Resolutions or correspondence, if strata related.", "如涉及分契物业，相关决议或信件。");
  } else if (form.disputeType === "Strata") {
    push("Strata Document", true, "The bylaw, rule, warning letter, fine notice, or minutes in issue.", "涉及的 Bylaw、规则、警告信、罚款通知或会议记录。");
    push("Email / Message", false, "Correspondence with the strata council.", "与管委会的往来信件。");
    push("Photo", false, "Condition or conduct evidence, where relevant.", "在相关情况下，状况或行为的照片证据。");
  } else if (form.disputeType === "Small Claims") {
    push("Application", true, "The Notice of Claim.", "Notice of Claim（索偿通知）。");
    push("Tenancy Agreement / Contract", true, "The contract the claim is based on.", "索偿所依据的合同。");
    push("Invoice / Receipt", true, "Documents proving the amount claimed.", "证明索偿金额的文件。");
    push("Response / Counterclaim", false, "The Reply, if one was filed.", "如已提交，对方的 Reply。");
  } else {
    push("Tenancy Agreement / Contract", false, "Any written agreement between the parties.", "双方之间的任何书面协议。");
    push("Email / Message", false, "Communication between the parties.", "双方之间的往来沟通。");
  }

  if (form.monetaryAmount) {
    if (!base.some((doc) => doc.category === "Invoice / Receipt")) {
      push("Invoice / Receipt", false, "Supports the amount in dispute.", "支持争议金额。");
    }
  }
  return base;
}

function buildTimeline(form) {
  const entries = [
    { date: form.noticeDate, label: { en: "Notice date", zh: "通知日期" } },
    { date: form.serviceDate, label: { en: "Service date", zh: "送达日期" } },
    { date: form.filingDeadline, label: { en: "Filing deadline", zh: "提交期限" } },
    { date: form.limitationDate, label: { en: "Limitation date", zh: "时效期限" } },
    { date: form.hearingDate, label: { en: "Hearing date", zh: "听证日期" } },
  ].filter((entry) => !!entry.date);
  return entries.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function findTimelineConflicts(form) {
  const conflicts = [];
  const notice = parseDate(form.noticeDate);
  const service = parseDate(form.serviceDate);
  const filing = parseDate(form.filingDeadline);
  const hearing = parseDate(form.hearingDate);
  if (notice && service && service < notice) {
    conflicts.push({ en: "The service date is earlier than the notice date, which cannot be correct as entered.", zh: "送达日期早于通知日期，按所填内容不可能成立。" });
  }
  if (filing && hearing && hearing < filing) {
    conflicts.push({ en: "The hearing date is earlier than the filing deadline, which needs to be confirmed.", zh: "听证日期早于提交期限，需要确认。" });
  }
  if (form.applicationFiled === "No" && hearing) {
    conflicts.push({ en: "A hearing date is recorded although no application has been filed.", zh: "记录了听证日期，但尚未提交申请。" });
  }
  if (form.applicationFiled === "No" && form.responseReceived === "Yes") {
    conflicts.push({ en: "A response is recorded although no application has been filed.", zh: "记录了已收到答辩，但尚未提交申请。" });
  }
  return conflicts;
}

function buildStrengths(form, answers, categories, context) {
  const strengths = [];
  if (categories.has("Tenancy Agreement / Contract")) {
    strengths.push({ en: "A written agreement has been provided, which establishes the terms in issue.", zh: "已提供书面协议，可确立争议所涉条款。" });
  }
  if (context.serviceEstablished && context.serviceProofAnswered) {
    strengths.push({ en: "A service method, a service date, and proof of service are all recorded.", zh: "送达方式、送达日期及送达证明均已记录。" });
  }
  if (!context.timelineConflicts.length && form.noticeDate && form.serviceDate) {
    strengths.push({ en: "The dates provided are internally consistent as entered.", zh: "所提供的日期在所填内容范围内彼此一致。" });
  }
  if (!context.unsupportedAssertions.length) {
    strengths.push({ en: "Each factual assertion in the intake has at least one supporting document category on file.", zh: "问询中的每项事实主张，档案中至少有一类对应的支持文件。" });
  }
  if (categories.has("Payment Record") || categories.has("Invoice / Receipt")) {
    strengths.push({ en: "Financial records have been provided to support the amounts referred to.", zh: "已提供财务记录以支持所提及的金额。" });
  }
  if (answers.rtb_inspection_reports === "Both") {
    strengths.push({ en: "Both move-in and move-out condition inspection reports are available.", zh: "入住与退租的物业状况检查报告均可提供。" });
  }
  if (answers.rtb_tenancy_agreement === "Yes") {
    strengths.push({ en: "A complete tenancy agreement is available.", zh: "可提供完整租约。" });
  }
  if (answers.strata_bylaw && String(answers.strata_bylaw).trim()) {
    strengths.push({ en: "The specific bylaw or rule relied on has been identified.", zh: "已明确指出所依据的具体章程或规则。" });
  }
  if (answers.small_claims_pleadings === "Both") {
    strengths.push({ en: "Both the Notice of Claim and the Reply are available.", zh: "诉状与答辩均可提供。" });
  }
  return strengths;
}

function buildWeaknesses(form, context) {
  const weaknesses = [];
  context.unsupportedAssertions.forEach((item) => {
    weaknesses.push({
      en: `${item.label.en} is asserted but no corresponding document has been uploaded.`,
      zh: `已主张「${item.label.zh}」，但未上传相应文件。`,
    });
  });
  context.timelineConflicts.forEach((conflict) => weaknesses.push(conflict));
  if (context.undated.length) {
    weaknesses.push({
      en: `${context.undated.length} uploaded document(s) have no document date recorded, which weakens their evidentiary value.`,
      zh: `有 ${context.undated.length} 份已上传文件未记录文件日期，会削弱其证据价值。`,
    });
  }
  if (context.unattributed.length) {
    weaknesses.push({
      en: `${context.unattributed.length} uploaded document(s) have no sender or issuer recorded.`,
      zh: `有 ${context.unattributed.length} 份已上传文件未记录发出方或签发方。`,
    });
  }
  if (context.contractFiles.length === 0 && ["RTB", "Small Claims"].includes(form.disputeType)) {
    weaknesses.push({ en: "No signed agreement or contract has been provided, so the governing terms cannot be confirmed from the file.", zh: "未提供已签署的协议或合同，因此无法从档案中确认适用条款。" });
  }
  if (context.clientReportedMissing) {
    weaknesses.push({ en: "You have identified evidence you know to be missing; that material should be obtained before the file is assessed on its merits.", zh: "您已指出自知缺失的证据；应在对案件作实质评估之前取得该等材料。" });
  }
  context.documentsAbsent.forEach((doc) => {
    weaknesses.push({
      en: `No document in the "${doc.category}" category has been uploaded. ${doc.why.en}`,
      zh: `未上传「${displayDisputeOption(doc.category, "zh")}」类别的文件。${doc.why.zh}`,
    });
  });
  context.deadlineRisks.forEach((risk) => weaknesses.push(risk.text));
  context.procedureRisks.forEach((risk) => weaknesses.push(risk.text));
  return weaknesses;
}

// Every legal reference is phrased as something to verify, never as settled law.
function buildLegalIssuesToVerify(form) {
  const items = [];
  const push = (en, zh) => items.push({ en, zh });

  push(
    "Confirm which forum has jurisdiction over this dispute and over the amount involved, as forum limits change.",
    "确认哪一机构对本争议及所涉金额具有管辖权，因为各机构的受理范围会有变动。"
  );
  push(
    "Verify the current filing deadlines, limitation periods, and evidence submission deadlines directly with the tribunal or court.",
    "直接向该仲裁机构或法院核实当前的提交期限、时效期间及证据提交截止日期。"
  );

  if (form.disputeType === "RTB") {
    push("Verify that the notice used the current official RTB form and contains all required particulars.", "核实通知书是否使用了当前的 RTB 官方表格，并载明所有必要事项。");
    push("Verify the permitted methods of service and the deemed-receipt rules that apply to that method.", "核实允许的送达方式，以及该方式对应的推定收讫规则。");
    push("Verify the current rules on security and pet damage deposits, including any time limits and consequences.", "核实关于押金与宠物损坏押金的现行规则，包括时限及其后果。");
  }
  if (form.disputeType === "CRT") {
    push("Verify the CRT's current process stage requirements and the evidence upload deadline for this file.", "核实 CRT 当前各阶段的程序要求，以及本案证据上传的截止日期。");
    push("Verify whether the claim falls within the CRT's mandatory or optional jurisdiction.", "核实本索偿是属于 CRT 的强制管辖还是可选管辖范围。");
  }
  if (form.disputeType === "Strata") {
    push("Verify the exact bylaw or rule text as filed in the Land Title Office, not only the version circulated to owners.", "以在土地业权登记处备案的 Bylaw 或规则原文为准核实，而不仅依据向业主传阅的版本。");
    push("Verify the steps required under the Strata Property Act before a fine may be imposed, including notice and the opportunity for a hearing.", "核实依 Strata Property Act 在处以罚款前所必须完成的步骤，包括通知及给予听证的机会。");
  }
  if (form.disputeType === "Small Claims") {
    push("Verify the current monetary limit for Small Claims and whether the claim must instead proceed at the CRT.", "核实小额索偿的现行金额上限，以及本索偿是否必须改由 CRT 处理。");
    push("Verify the service requirements and the time allowed for filing a Reply.", "核实送达要求，以及提交 Reply 的期限。");
  }
  if (form.monetaryAmount) {
    push("Verify how the amount claimed is calculated and whether each component is recoverable in this forum.", "核实索偿金额的计算方式，以及其中各项在本机构是否可获支持。");
  }
  return items;
}

// ── Report builder ────────────────────────────────────────────────────────────
// Both languages are rendered from the same analysis object.

export function buildDisputeReport(form, files, lang = "en", analysis = null) {
  const safeLang = normalizeLang(lang);
  const zh = safeLang === "zh";
  const a = analysis || analyseDispute(form, files);
  const opt = (value) => displayDisputeOption(value, safeLang);
  const notProvided = zh ? "未提供" : "Not provided";
  const value = (raw) => (String(raw || "").trim() || notProvided);

  const executiveSummary = [];
  executiveSummary.push(zh
    ? `本文件为 ${opt(form.disputeType) || "未指定类型"} 争议的 AI 初步审阅，客户身份为${opt(form.clientRole) || "未指定"}。`
    : `This is a preliminary AI review of a ${form.disputeType || "unspecified"} dispute in which you are the ${form.clientRole || "unspecified party"}.`);
  if (!a.sufficient) {
    executiveSummary.push(zh ? INSUFFICIENT_MATERIALS_ZH : INSUFFICIENT_MATERIALS_EN);
    a.blockingReasons.forEach((reason) => executiveSummary.push(t(reason, safeLang)));
  } else {
    executiveSummary.push(zh
      ? `所提供的资料足以进行初步审阅。当前风险等级判断为「${opt(a.riskLevel)}」，AI 信心为 ${a.confidenceScore}%。`
      : `The materials provided are sufficient for a preliminary review. The current risk level is assessed as "${a.riskLevel}", with an AI confidence of ${a.confidenceScore}%.`);
  }
  const urgent = a.deadlineRisks.filter((risk) => risk.severity === "high");
  if (urgent.length) {
    executiveSummary.push(zh
      ? `存在需要立即处理的期限问题：${t(urgent[0].text, "zh")}`
      : `There is a deadline issue requiring immediate attention: ${t(urgent[0].text, "en")}`);
  }
  executiveSummary.push(zh
    ? "本审阅整理事实并指出需要核实之处，最终判断由专业审核人作出。"
    : "This review organizes the facts and identifies what must be verified; the final judgment is made by the professional reviewer.");

  const sections = [
    {
      key: "partiesAndDisputeType",
      title: zh ? "当事人与争议类型" : "Parties and Dispute Type",
      type: "table",
      rows: [
        { label: zh ? "客户" : "Client", value: value(form.clientName) },
        { label: zh ? "客户身份" : "Client role", value: value(opt(form.clientRole)) },
        { label: zh ? "对方当事人" : "Opposing party", value: value(form.opposingPartyName) },
        { label: zh ? "双方关系" : "Relationship", value: value(opt(form.relationshipToOpposingParty)) },
        { label: zh ? "争议类型" : "Dispute type", value: value(opt(form.disputeType)) },
        { label: zh ? "机构 / 主管" : "Tribunal / Authority", value: value(opt(form.tribunal)) },
        { label: zh ? "物业地址" : "Property address", value: value([form.propertyAddress, form.city, form.province].filter(Boolean).join(", ")) },
        { label: zh ? "涉及金额" : "Monetary amount", value: value(formatDisputeMoney(form.monetaryAmount)) },
        { label: zh ? "程序状态" : "Proceeding status", value: value(opt(form.proceedingStatus)) },
      ],
    },
    {
      key: "clientPosition",
      title: zh ? "客户主张" : "Client Position",
      items: [value(form.clientPosition)],
    },
    {
      key: "opposingPosition",
      title: zh ? "对方主张" : "Opposing Party Position",
      items: [hasText(form.opposingPosition, 20)
        ? form.opposingPosition
        : (zh
          ? "客户未提供对方立场的说明。在评估任何有利因素之前，应先了解对方的主张。"
          : "No account of the opposing party's position was provided. The other side's case should be understood before any strength is assessed.")],
    },
    {
      key: "keyTimeline",
      title: zh ? "关键时间线" : "Key Timeline",
      type: "table",
      rows: a.timeline.length
        ? a.timeline.map((entry) => ({ label: t(entry.label, safeLang), value: formatDisputeDate(entry.date, safeLang) }))
        : [{ label: zh ? "日期" : "Dates", value: zh ? "未提供任何关键日期。" : "No key dates were provided." }],
    },
    {
      key: "evidenceAvailable",
      title: zh ? "现有证据" : "Evidence Available",
      type: "table",
      rows: a.uploaded.length
        ? a.uploaded.map((file) => ({
          label: opt(file.documentCategory),
          value: [file.fileName, formatDisputeDate(file.documentDate, safeLang), file.senderIssuer, file.description].filter(Boolean).join(" · "),
        }))
        : [{ label: zh ? "已上传文件" : "Uploaded documents", value: zh ? "无。" : "None." }],
    },
    {
      key: "missingEvidence",
      title: zh ? "缺失或有缺陷的证据" : "Missing or Defective Evidence",
      items: buildMissingEvidenceItems(form, a, safeLang),
    },
    {
      key: "serviceAndProcedure",
      title: zh ? "送达与程序审查" : "Service and Procedural Review",
      items: buildServiceItems(form, a, safeLang),
    },
    {
      key: "legalIssuesToVerify",
      title: zh ? "需核实的法规与合规问题" : "Legal / Compliance Issues to Verify",
      items: tList(a.legalIssuesToVerify, safeLang),
    },
    {
      key: "strengths",
      title: zh ? "有利因素" : "Strengths",
      items: a.sufficient
        ? (a.strengths.length ? tList(a.strengths, safeLang) : [zh
          ? "根据现有资料，尚未确认明显的有利因素。"
          : "No clear supporting factor is confirmed on the current materials."])
        : [zh
          ? `${INSUFFICIENT_MATERIALS_ZH}在补齐资料之前，本节不作评估。`
          : `${INSUFFICIENT_MATERIALS_EN} No strengths are assessed until that is done.`],
    },
    {
      key: "risksAndWeaknesses",
      title: zh ? "风险与薄弱环节" : "Risks and Weaknesses",
      items: a.weaknesses.length ? tList(a.weaknesses, safeLang) : [zh
        ? "根据现有资料，尚未发现突出的风险；仍须经专业审核确认。"
        : "No standout risk is identified on the current materials; professional review is still required."],
    },
    {
      key: "aiConfidenceFlags",
      title: zh ? "AI信心与风险标记" : "AI Confidence and Flags",
      type: "table",
      rows: [
        { label: zh ? "AI 信心" : "AI confidence", value: `${a.confidenceScore}%` },
        { label: zh ? "问询完整度" : "Intake completion", value: `${a.intakeCompletionScore}%` },
        { label: zh ? "风险等级" : "Risk level", value: a.sufficient ? opt(a.riskLevel) : opt("Not assessable") },
        { label: zh ? "审核优先级" : "Review priority", value: opt(a.reviewPriority) },
        { label: zh ? "AI 标记" : "AI flags", value: a.flags.join(", ") },
      ],
    },
    {
      key: "professionalRecommendation",
      title: zh ? "专业初步建议" : "Professional Preliminary Recommendation",
      items: [zh
        ? "本节保留给专业审核人。以上 AI 初评仅为草稿，在 Mabel 完成审核并确认之前，不得作为结论使用。"
        : "This section is reserved for the professional reviewer. The AI review above is a draft only and must not be treated as a conclusion until it has been reviewed and confirmed."],
    },
    {
      key: "recommendedNextStep",
      title: zh ? "建议下一步" : "Recommended Next Step",
      items: [opt(a.recommendedNextStep)],
    },
    {
      key: "disclaimer",
      title: zh ? "免责声明" : "Disclaimer",
      items: [zh ? DISPUTE_DISCLAIMER_ZH : DISPUTE_DISCLAIMER_EN],
    },
  ];

  return {
    language: safeLang,
    reviewId: form.reviewId || "",
    title: zh ? "AI 争议初步审阅" : "AI Preliminary Dispute Review",
    brandLine: zh ? DISPUTE_BRAND_LINE_ZH : DISPUTE_BRAND_LINE_EN,
    sufficient: a.sufficient,
    riskLevel: a.riskLevel,
    riskLevelLabel: a.sufficient ? displayDisputeOption(a.riskLevel, safeLang) : displayDisputeOption("Not assessable", safeLang),
    confidenceScore: a.confidenceScore,
    intakeCompletionScore: a.intakeCompletionScore,
    reviewPriority: a.reviewPriority,
    recommendedNextStep: a.recommendedNextStep,
    flags: a.flags,
    executiveSummary,
    sections,
    disclaimer: zh ? DISPUTE_DISCLAIMER_ZH : DISPUTE_DISCLAIMER_EN,
  };
}

function buildMissingEvidenceItems(form, a, lang) {
  const zh = lang === "zh";
  const items = [];
  a.documentsAbsent.forEach((doc) => {
    items.push(zh
      ? `缺少「${displayDisputeOption(doc.category, "zh")}」：${doc.why.zh}`
      : `Missing "${doc.category}": ${doc.why.en}`);
  });
  a.undated.forEach((file) => {
    items.push(zh
      ? `${file.fileName} 未记录文件日期。`
      : `${file.fileName} has no document date recorded.`);
  });
  a.unattributed.forEach((file) => {
    items.push(zh
      ? `${file.fileName} 未记录发出方或签发方。`
      : `${file.fileName} has no sender or issuer recorded.`);
  });
  a.unsupportedAssertions.forEach((item) => {
    items.push(zh
      ? `「${item.label.zh}」目前没有文件支持。`
      : `${item.label.en} is currently unsupported by any document.`);
  });
  if (hasText(form.missingEvidence)) {
    items.push(zh
      ? `客户自述缺失的证据：${form.missingEvidence}`
      : `Evidence you identified as missing: ${form.missingEvidence}`);
  }
  if (!items.length) {
    items.push(zh
      ? "根据现有资料，未发现明显缺失或有瑕疵的证据。"
      : "No obvious missing or defective evidence is identified on the current materials.");
  }
  return items;
}

function buildServiceItems(form, a, lang) {
  const zh = lang === "zh";
  const items = [];
  if (!a.serviceRelevant) {
    items.push(zh
      ? "本争议类型下，送达要求须依所选机构的规则核实。"
      : "For this dispute type, service requirements must be verified against the rules of the chosen forum.");
  }
  items.push(zh
    ? `送达方式：${displayDisputeOption(form.serviceMethod, "zh") || "未提供"}。送达日期：${formatDisputeDate(form.serviceDate, "zh") || "未提供"}。`
    : `Method of service: ${form.serviceMethod || "not provided"}. Service date: ${formatDisputeDate(form.serviceDate, "en") || "not provided"}.`);
  a.procedureRisks.forEach((risk) => items.push(t(risk.text, lang)));
  a.deadlineRisks.forEach((risk) => items.push(t(risk.text, lang)));
  if (a.serviceRelevant && a.serviceEstablished && !a.procedureRisks.length) {
    items.push(zh
      ? "根据所填内容，送达方式与日期均已记录；其是否符合当前规则仍须核实。"
      : "As entered, both a method and a date of service are recorded; whether they meet the current rules still requires verification.");
  }
  return items;
}

// ── Client helpers ────────────────────────────────────────────────────────────

export function validateDisputeFile(file) {
  const name = String(file?.name || "").trim();
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, code: "type", ext };
  }
  if (file.size > DISPUTE_MAX_FILE_BYTES) {
    return { ok: false, code: "size" };
  }
  return { ok: true };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

// Reserves the Review ID up front so every uploaded file is linked to the
// correct record and Drive folder before the intake is submitted.
export async function startDisputeReview(reviewId = "") {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  return apiPost({ action: "startDisputeReview", data: { reviewId } });
}

export async function uploadDisputeFile(reviewId, file, meta = {}) {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const data = await fileToBase64(file);
  return apiPost({
    action: "uploadDisputeFile",
    data: {
      reviewId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      documentCategory: meta.documentCategory || "Other",
      documentDate: meta.documentDate || "",
      senderIssuer: meta.senderIssuer || "",
      description: meta.description || "",
      data,
    },
  });
}

export async function deleteDisputeFile(reviewId, fileId) {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  return apiPost({ action: "deleteDisputeFile", data: { reviewId, fileId } });
}

export async function submitDisputeReview(form, files, lang = "en") {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const safeLang = normalizeLang(lang);
  const reviewId = form.reviewId || createDisputeReviewId();
  const analysis = analyseDispute(form, files);

  // English is drafted first and is the formal original; the Chinese version is
  // rendered from the same analysis object so the two cannot diverge.
  const reportEn = buildDisputeReport({ ...form, reviewId }, files, "en", analysis);
  const reportZh = buildDisputeReport({ ...form, reviewId }, files, "zh", analysis);

  const payload = {
    ...form,
    reviewId,
    serviceConcerns: composeServiceConcerns(form.serviceMethod, form.serviceConcerns),
    status: analysis.sufficient ? "AI Drafted" : "Intake Incomplete",
    importantDates: analysis.timeline.map((entry) => `${entry.label.en}: ${entry.date}`).join("; "),
    followUpAnswersText: formatDisputeFollowUpAnswers(form, "en"),
    aiReview: {
      timelineText: analysis.timeline.map((entry) => `${entry.label.en}: ${entry.date}`).join("\n"),
      issuesText: tList(analysis.legalIssuesToVerify, "en").join("\n"),
      strengthsText: tList(analysis.strengths, "en").join("\n"),
      weaknessesText: tList(analysis.weaknesses, "en").join("\n"),
      riskLevel: analysis.riskLevel,
      confidenceScore: analysis.confidenceScore,
      flags: analysis.flags.join(", "),
      reviewPriority: analysis.reviewPriority,
      recommendedNextStep: analysis.recommendedNextStep,
      intakeCompletionScore: analysis.intakeCompletionScore,
    },
    reportEn: JSON.stringify(reportEn),
    reportZh: JSON.stringify(reportZh),
  };

  const result = await apiPost({ action: "submitDisputeReview", data: payload });
  return {
    reviewId,
    analysis,
    reports: { en: reportEn, zh: reportZh },
    preferred: safeLang,
    ...(result || {}),
  };
}

// ── Admin (authorized reviewers only) ────────────────────────────────────────

export async function getDisputeReviews() {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  return apiPost({ action: "getDisputeReviews", ...getStudioRequestAuth("rental") });
}

export async function getDisputeReview(reviewId) {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  return apiPost({ action: "getDisputeReview", reviewId, ...getStudioRequestAuth("rental") });
}

export async function updateDisputeProfessionalReview(payload) {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  return apiPost({ action: "updateDisputeProfessionalReview", data: payload, ...getStudioRequestAuth("rental") });
}

// Regenerates the English report from the stored record plus the professional
// reviewer's edits, then regenerates the Chinese version from that same result,
// and writes both PDFs to Drive. English stays the single source of truth.
export async function generateDisputeReport(reviewId, reports) {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  return apiPost({
    action: "generateDisputeReport",
    reviewId,
    data: { reportEn: JSON.stringify(reports.en), reportZh: JSON.stringify(reports.zh) },
    ...getStudioRequestAuth("rental"),
  });
}

// Rebuilds both language reports from a stored record so the Admin screen and
// the server agree on exactly what the client will see.
export function rebuildReportsFromRecord(record, files) {
  const form = recordToForm(record);
  const analysis = analyseDispute(form, files);
  return {
    analysis,
    en: buildDisputeReport(form, files, "en", analysis),
    zh: buildDisputeReport(form, files, "zh", analysis),
  };
}

// Column name -> form field. Mirrors buildDisputeReviewRecord_ in DisputeReview.gs.
export function recordToForm(record = {}) {
  const get = (key) => String(record[key] || "");
  return createEmptyDisputeReview({
    reviewId: get("Review ID"),
    status: get("Status"),
    clientName: get("Client Name"),
    email: get("Email"),
    phone: get("Phone"),
    preferredContact: get("Preferred Contact"),
    clientRole: get("Client Role"),
    disputeType: get("Dispute Type"),
    tribunal: get("Tribunal / Authority"),
    propertyAddress: get("Property Address"),
    city: get("City"),
    province: get("Province"),
    opposingPartyName: get("Opposing Party Name"),
    relationshipToOpposingParty: get("Relationship to Opposing Party"),
    disputeSummary: get("Dispute Summary"),
    clientPosition: get("Client Position"),
    opposingPosition: get("Opposing Party Position"),
    desiredOutcome: get("Desired Outcome"),
    noticeDate: get("Notice Date"),
    serviceDate: get("Service Date"),
    filingDeadline: get("Filing Deadline"),
    hearingDate: get("Hearing Date"),
    limitationDate: get("Limitation Date"),
    proceedingStatus: get("Current Proceeding Status"),
    applicationFiled: get("Application Filed"),
    responseReceived: get("Response / Counterclaim Received"),
    monetaryAmount: get("Monetary Amount"),
    keyEvidenceSummary: get("Key Evidence Summary"),
    missingEvidence: get("Missing Evidence"),
    serviceConcerns: get("Service / Procedure Concerns"),
    legalIssues: get("Legal / Compliance Issues"),
    clientServiceInterest: get("Client Service Interest"),
    nextStep: get("Next Step"),
    ...parseServiceConcerns(get("Service / Procedure Concerns")),
  });
}

const SERVICE_METHOD_PREFIX = "Method of service:";

// The 57-column sheet has no Service Method column, so the intake value is kept
// as a labelled first line inside Service / Procedure Concerns and parsed back
// out here. No schema change, and the value survives a round trip.
export function composeServiceConcerns(serviceMethod, concerns) {
  const method = String(serviceMethod || "").trim();
  const rest = String(concerns || "").trim();
  if (!method) return rest;
  return [`${SERVICE_METHOD_PREFIX} ${method}`, rest].filter(Boolean).join("\n");
}

function parseServiceConcerns(stored) {
  const text = String(stored || "");
  const lines = text.split("\n");
  if (!lines[0] || !lines[0].startsWith(SERVICE_METHOD_PREFIX)) {
    return { serviceMethod: "", serviceConcerns: text.trim() };
  }
  return {
    serviceMethod: lines[0].slice(SERVICE_METHOD_PREFIX.length).trim(),
    serviceConcerns: lines.slice(1).join("\n").trim(),
  };
}

// ── Report download ───────────────────────────────────────────────────────────

export function disputeReportFileName(reviewId, language) {
  return `${reviewId}_AI_Dispute_Review_${language === "zh" ? "ZH" : "EN"}.pdf`;
}

// Pulls the real PDF bytes through the authorized backend and saves them as a
// genuine .pdf file. Drive preview URLs cannot be downloaded cross-origin, and
// the Dispute Reports folder is deliberately not shared, so the bytes come back
// base64-encoded from an endpoint that checks admin rights or a review token.
export async function downloadDisputeReportPdf(reviewId, language, token = "") {
  if (!isApiConnected()) throw new Error("VITE_STUDIO_EXEC_URL not configured");
  const result = await apiPost({
    action: "downloadDisputeReportPdf",
    data: { reviewId, language: language === "zh" ? "ZH" : "EN", token },
    ...getStudioRequestAuth("rental"),
  });

  const binary = atob(result.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the browser has started the save.
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return { fileName: result.fileName, sizeBytes: result.sizeBytes, mimeType: result.mimeType };
}

// ── Display formatting ────────────────────────────────────────────────────────

const ZH_MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// Accepts "2026-04-01" or a full ISO timestamp and never shows raw ISO text.
export function formatDisputeDate(value, lang = "en") {
  // Older records stored a JSON-stringified Date, so strip any wrapping quotes.
  const text = String(value || "").trim().replace(/^"+|"+$/g, "");
  if (!text) return "";
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return text;
  const [, y, m, d] = match;
  const monthIndex = Number(m) - 1;
  if (monthIndex < 0 || monthIndex > 11) return text;
  return normalizeLang(lang) === "zh"
    ? `${y}年${ZH_MONTHS[monthIndex]}月${Number(d)}日`
    : `${EN_MONTHS[monthIndex]} ${Number(d)}, ${y}`;
}

export function formatDisputeDateTime(value, lang = "en") {
  const text = String(value || "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return formatDisputeDate(text, lang);
  const datePart = formatDisputeDate(parsed.toISOString().slice(0, 10), lang);
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mm = String(parsed.getMinutes()).padStart(2, "0");
  return `${datePart} ${hh}:${mm}`;
}

// "4200" and "$4,200" both render as "$4,200.00 CAD".
export function formatDisputeMoney(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const numeric = Number(text.replace(/[$,\s]/g, "").replace(/CAD/i, ""));
  if (!Number.isFinite(numeric)) return text;
  return `$${numeric.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`;
}

// Chinese labels for the Dispute_Reviews columns shown in the Admin detail view.
// The sheet's English header stays the stored name; this is display only.
const COLUMN_LABELS_ZH = {
  "Review ID": "案件编号",
  "Created At": "创建时间",
  "Last Updated": "最后更新",
  "Status": "状态",
  "Lead Source": "来源",
  "Client Name": "客户姓名",
  "Email": "电子邮箱",
  "Phone": "联系电话",
  "Preferred Contact": "首选联系方式",
  "Client Role": "客户身份",
  "Dispute Type": "争议类型",
  "Tribunal / Authority": "审理机构",
  "Property Address": "物业地址",
  "City": "城市",
  "Province": "省份",
  "Opposing Party Name": "对方姓名或名称",
  "Relationship to Opposing Party": "与对方的关系",
  "Dispute Summary": "争议概述",
  "Client Position": "客户主张",
  "Opposing Party Position": "对方主张",
  "Desired Outcome": "希望达到的结果",
  "Important Dates": "重要日期",
  "Notice Date": "通知日期",
  "Service Date": "送达日期",
  "Filing Deadline": "提交截止日期",
  "Hearing Date": "听证日期",
  "Limitation Date": "时效期限",
  "Current Proceeding Status": "当前程序状态",
  "Application Filed": "是否已提交申请",
  "Response / Counterclaim Received": "是否收到答辩或反诉",
  "Monetary Amount": "争议金额",
  "Key Evidence Summary": "关键证据概述",
  "Missing Evidence": "缺失的证据",
  "Service / Procedure Concerns": "送达 / 程序疑虑",
  "Legal / Compliance Issues": "法律与合规问题",
  "AI Risk Level": "AI 风险等级",
  "AI Confidence Score": "AI 信心分数",
  "AI Flags": "AI 风险标记",
  "Follow-up Answers": "补充问题答案",
  "Professional Notes": "专业审核备注",
  "Professional Final Recommendation": "专业最终建议",
  "Review Priority": "审核优先级",
  "Next Step": "建议下一步",
  "Client Service Interest": "希望获得的协助",
  "Intake Completion Score": "问询完整度",
  "File Folder URL": "证据文件夹",
  "Consent to Contact": "同意联系",
  "Privacy Consent": "隐私同意",
};

export function disputeColumnLabel(column, lang = "en") {
  if (normalizeLang(lang) !== "zh") return column;
  return COLUMN_LABELS_ZH[column] || column;
}

const DATE_COLUMNS = ["Notice Date", "Service Date", "Filing Deadline", "Hearing Date", "Limitation Date"];
const DATETIME_COLUMNS = ["Created At", "Last Updated"];
const MONEY_COLUMNS = ["Monetary Amount"];

// One place that decides how a stored cell is rendered, so the Admin list, the
// detail view and the report all agree.
export function formatDisputeFieldValue(column, value, lang = "en") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (DATE_COLUMNS.includes(column)) return formatDisputeDate(text, lang);
  if (DATETIME_COLUMNS.includes(column)) return formatDisputeDateTime(text, lang);
  if (MONEY_COLUMNS.includes(column)) return formatDisputeMoney(text);
  if (column === "Intake Completion Score" || column === "AI Confidence Score") return `${text}%`;
  return displayDisputeOption(text, lang);
}
