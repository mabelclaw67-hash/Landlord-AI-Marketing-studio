import { matchSupportDocumentsForApplicant } from "./applicantSupportDocuments.js";
import { renderProfessionalReportHtml, renderStructuredProfessionalReportHtml } from "../components/reports/professionalReportHtml.js";
import { reportStatusTone } from "../components/reports/reportTheme.js";

const COPY = {
  en: {
    preparedBy: "Prepared by",
    company: "VanIsland Property Management",
    initialTitle: "Applicant Initial Screening Report",
    fullTitle: "Full Applicant Audit Report",
    listingId: "Listing ID",
    propertyAddress: "Property address",
    generatedDate: "Generated date",
    applicationsReceived: "Applications Received",
    rankingSummary: "Applicant ranking summary",
    comparisonTable: "Applicant comparison table",
    executiveSummary: "Executive Summary",
    applicantRanking: "Applicant Ranking",
    aiRecommendation: "AI Recommendation",
    confidence: "Confidence",
    riskLevel: "Risk Level",
    overview: "Overview",
    candidateDetail: "Candidate Detail",
    candidateDetails: "Candidate Details",
    applicationOverview: "Application Overview",
    incomeOverview: "Income Overview",
    coreFacts: "Core Facts",
    employmentIncomeSummary: "Employment & Income",
    rentalReferenceSummary: "Rental & Reference Summary",
    strengths: "Strengths",
    concerns: "Concerns",
    recommendations: "Recommendations",
    footerNotice: "Landlord review aid only. Final decisions remain manual.",
    overallRecommendation: "Overall recommendation",
    reportConfidence: "Report confidence",
    goodBackup: "Good Backup",
    requiresFurtherVerification: "Requires Further Verification",
    highestRentToIncomeRatio: "Highest Rent-to-Income Ratio",
    recommendation: "Recommendation",
    priority: "Priority",
    nextAction: "Next Action",
    overallAssessment: "Overall Assessment",
    priorityRank: "Rank {rank} of {total}",
    topApplicantChecks: "Proceed with income, reference, and supporting document checks for the top-ranked applicants.",
    nextActionCompleteChecks: "Complete income, reference, and supporting document checks",
    assessments: {
      strong: "Strong candidate pending final verification",
      backup: "Suitable backup pending final verification",
      verify: "Requires further verification before moving forward",
      lower: "Lower priority unless missing information improves the file",
    },
    displayValues: {
      one_year: "1 Year",
      six_months: "6 months",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
      yes: "Yes",
      no: "No",
      none: "None",
      no_pets: "No pets",
      currently_insured: "Currently insured",
      will_obtain_before_move_in: "Will obtain before move-in",
    },
    confidenceLevels: {
      low: "Low",
      medium: "Medium",
      high: "High",
    },
    riskLevels: {
      needs_data: "Needs data",
      lower: "Lower",
      medium: "Medium",
      medium_high: "Medium-high",
    },
    documentStatus: {
      linked: "Documents linked",
      not_confirmed: "Not confirmed",
      available: "Available",
      to_confirm: "To confirm",
      no_pets: "No pets stated",
      adults_minors: "{adults} adults / {minors} minors",
    },
    recommendationKeys: {
      proceed_verification: "Proceed with document verification, references, and landlord review.",
      keep_as_backup: "Keep as backup while completing income, reference, and document checks.",
      request_missing: "Request missing information and documents before moving further.",
    },
    incomeNotes: {
      business_gross: "Business gross / revenue {amount} is not counted as scoring income until disposable monthly income is verified.",
      support_income: "Support / benefit income {amount} is shown as declared income but requires verification for stability.",
      unparsed_income: "Income is stated but cannot be conservatively parsed as monthly income.",
      default_income: "Initial screening uses conservative monthly income; final review requires supporting documents.",
    },
    noApplications: "No applications found for this listing.",
    notProvided: "Not provided",
    initialNotice: "This initial screening summary is for landlord review only. It uses neutral, tenancy-related information from submitted applications. Final decisions remain with the landlord and must follow applicable tenancy and human rights laws.",
    auditNotice: "This audit report is a structured review aid. It does not make a final applicant decision. Final decisions remain with the landlord and must follow applicable tenancy and human rights laws.",
    applicant: "Applicant",
    rank: "Rank",
    initialCategory: "Initial category",
    moveIn: "Move-in",
    leaseTerm: "Lease term",
    incomeStated: "Income stated",
    declaredIncome: "Displayed declared income",
    scoringIncome: "Conservative verified/scoring income",
    rentToIncome: "Rent-to-income ratio",
    incomeVerificationNote: "Income verification note",
    documents: "Documents",
    recommendedNextStep: "Recommended next step",
    keyStrengths: "Key strengths",
    verificationNeeded: "Verification needed",
    neutralRiskNotes: "Neutral risk notes",
    applicationData: "Application data",
    supportChecklist: "Support document checklist",
    incomeReview: "Income proof review",
    employmentNotes: "Employment verification notes",
    landlordReferenceNotes: "Landlord reference notes",
    creditNotes: "Credit/background check notes",
    consistencyCheck: "Consistency check between application and documents",
    riskItems: "Risk items",
    finalRecommendation: "Final screening recommendation",
    conditionsBeforeApproval: "Conditions before approval",
    candidateSummary: "Candidate Summary",
    applicationId: "Application ID",
    reportTypeLabel: "Report Type",
    documentCount: "Document Count",
    verificationStatus: "Verification Status",
    recommendedDecision: "Recommended Decision",
    documentReviewSummary: "Document Review Summary",
    incomeDocuments: "Income Documents",
    idDocuments: "ID Documents",
    bankStatements: "Bank Statements",
    creditBackground: "Credit / Background",
    references: "References",
    missingDocuments: "Missing Documents",
    potentialInconsistencies: "Potential Inconsistencies",
    missingItems: "Missing Items",
    fields: {
      applicantName: "Applicant name",
      jointName: "Joint applicant name",
      phone: "Phone",
      email: "Email",
      currentAddress: "Current address",
      moveInDate: "Preferred move-in date",
      leaseTerm: "Lease term",
      currentRent: "Current monthly rent",
      residencePeriod: "Current residence period",
      employmentStatus: "Employment status",
      employer: "Employer / income source",
      monthlyIncome: "Monthly income",
      jointIncome: "Joint applicant income",
      occupants: "Total occupants",
      adultsMinors: "Adults / minors count only",
      pets: "Pets details",
      smoking: "Smoking / vaping / cannabis use",
      parking: "Vehicles / parking needs",
      reasonForMoving: "Reason for moving",
      references: "Landlord / reference status",
      credit: "Credit history stated",
      eviction: "Eviction / tenancy breach stated",
      insurance: "Tenant insurance status",
      deposit: "Deposit availability",
      supportStatus: "Supporting document status",
      employmentLength: "Employment length",
    },
    otherIncomeDeclared: "Other income declared; verification required.",
    finalAssessment: "Final assessment",
    rankings: {
      strong: "Strong candidate",
      backup: "Good Backup",
      verify: "Requires Additional Verification",
      lower: "Lower priority due to weaker verifiable information",
    },
  },
  zh: {
    preparedBy: "出具方",
    company: "VanIsland Property Management",
    initialTitle: "申请人初步筛选报告",
    fullTitle: "申请人完整审核报告",
    listingId: "房源编号",
    propertyAddress: "物业地址",
    generatedDate: "生成日期",
    applicationsReceived: "收到申请数量",
    rankingSummary: "申请人初步排序摘要",
    comparisonTable: "申请人对比表",
    executiveSummary: "执行摘要",
    applicantRanking: "申请人排序",
    aiRecommendation: "AI 建议",
    confidence: "信心等级",
    riskLevel: "风险等级",
    overview: "总览",
    candidateDetail: "候选人详情",
    candidateDetails: "候选人详情",
    applicationOverview: "申请资料总览",
    incomeOverview: "收入总览",
    coreFacts: "基本情况",
    employmentIncomeSummary: "工作与收入",
    rentalReferenceSummary: "租赁与推荐人摘要",
    strengths: "优势",
    concerns: "关注事项",
    recommendations: "建议",
    footerNotice: "仅供房东审核参考。最终决定仍由人工作出。",
    overallRecommendation: "整体建议",
    reportConfidence: "报告信心",
    goodBackup: "良好备选",
    requiresFurtherVerification: "需进一步核实",
    highestRentToIncomeRatio: "最高租金收入比",
    recommendation: "Recommendation",
    priority: "Priority",
    nextAction: "Next Action",
    overallAssessment: "Overall Assessment",
    priorityRank: "排名 {rank} / {total}",
    topApplicantChecks: "建议优先对排名靠前的申请人完成收入、推荐人和支持文件核实。",
    nextActionCompleteChecks: "完成收入、推荐人和支持文件核实",
    assessments: {
      strong: "适合作为强候选人，仍需完成最终核实",
      backup: "适合作为备选，需完成最终核实",
      verify: "需进一步核实后再决定是否进入下一步",
      lower: "优先级较低，除非补充信息改善审核结果",
    },
    displayValues: {
      one_year: "一年",
      six_months: "6 个月",
      excellent: "优秀",
      good: "良好",
      fair: "一般",
      yes: "是",
      no: "否",
      none: "无",
      no_pets: "无宠物",
      currently_insured: "目前已投保",
      will_obtain_before_move_in: "入住前购买",
    },
    confidenceLevels: {
      low: "低",
      medium: "中",
      high: "高",
    },
    riskLevels: {
      needs_data: "需要资料",
      lower: "较低",
      medium: "中",
      medium_high: "中高",
    },
    documentStatus: {
      linked: "文件已链接",
      not_confirmed: "未确认",
      available: "已提供",
      to_confirm: "待确认",
      no_pets: "未申报宠物",
      adults_minors: "{adults} 成人 / {minors} 未成年人",
    },
    recommendationKeys: {
      proceed_verification: "进入文件核实、推荐人核实和房东最终审核。",
      keep_as_backup: "作为良好备选，同时完成收入、推荐人和文件核实。",
      request_missing: "先要求补充缺失信息和文件，再决定是否进入下一步。",
    },
    incomeNotes: {
      business_gross: "Business gross / revenue {amount} 未直接计入核算收入，需核实可支配月收入。",
      support_income: "Support / benefit income {amount} 可显示为申报收入，但需文件核实稳定性。",
      unparsed_income: "收入已填写，但无法保守解析为月收入。",
      default_income: "按保守月收入进行初筛；最终需以支持文件核实。",
    },
    noApplications: "该房源暂无申请记录。",
    notProvided: "未提供",
    initialNotice: "本初步筛选汇总仅供房东审核参考。内容仅基于申请表中与租赁相关的中性信息整理。最终决定仍由房东作出，并须符合适用的租赁法规和人权法规。",
    auditNotice: "本完整审核报告为结构化审核辅助文件，不作出最终申请决定。最终决定仍由房东作出，并须符合适用的租赁法规和人权法规。",
    applicant: "申请人",
    rank: "排序",
    initialCategory: "初步类别",
    moveIn: "入住日期",
    leaseTerm: "租期",
    incomeStated: "申报收入",
    declaredIncome: "显示的申报收入",
    scoringIncome: "保守核算收入",
    rentToIncome: "租金收入比",
    incomeVerificationNote: "收入核实备注",
    documents: "文件状态",
    recommendedNextStep: "建议下一步",
    keyStrengths: "主要优势",
    verificationNeeded: "需要核实",
    neutralRiskNotes: "中性风险备注",
    applicationData: "申请资料",
    supportChecklist: "支持文件清单",
    incomeReview: "收入证明审核",
    employmentNotes: "工作 / 收入核实备注",
    landlordReferenceNotes: "房东推荐人备注",
    creditNotes: "信用 / 背景核查备注",
    consistencyCheck: "申请表与文件一致性检查",
    riskItems: "风险项目",
    finalRecommendation: "最终筛选建议",
    conditionsBeforeApproval: "批准前条件",
    candidateSummary: "候选人摘要",
    applicationId: "申请编号",
    reportTypeLabel: "报告类型",
    documentCount: "文件数量",
    verificationStatus: "核实状态",
    recommendedDecision: "建议决定",
    documentReviewSummary: "文件审核摘要",
    incomeDocuments: "收入文件",
    idDocuments: "身份文件",
    bankStatements: "银行流水",
    creditBackground: "信用 / 背景",
    references: "推荐人",
    missingDocuments: "缺失文件",
    potentialInconsistencies: "潜在不一致",
    missingItems: "缺失项目",
    fields: {
      applicantName: "申请人姓名",
      jointName: "共同申请人姓名",
      phone: "电话",
      email: "邮箱",
      currentAddress: "当前住址",
      moveInDate: "期望入住日期",
      leaseTerm: "租期",
      currentRent: "当前月租",
      residencePeriod: "当前居住时长",
      employmentStatus: "工作状态",
      employer: "雇主 / 收入来源",
      monthlyIncome: "月收入",
      jointIncome: "共同申请人收入",
      occupants: "总入住人数",
      adultsMinors: "成人 / 未成年人数量",
      pets: "宠物信息",
      smoking: "吸烟 / 电子烟 / 大麻使用情况",
      parking: "车辆 / 停车需求",
      reasonForMoving: "搬迁原因",
      references: "房东 / 推荐人核实状态",
      credit: "自述信用情况",
      eviction: "自述驱逐 / 违约记录",
      insurance: "租客保险状态",
      deposit: "押金准备情况",
      supportStatus: "支持文件状态",
      employmentLength: "工作年限",
    },
    otherIncomeDeclared: "已申报其他收入，需核实。",
    finalAssessment: "最终评估",
    rankings: {
      strong: "强候选人",
      backup: "良好备选",
      verify: "需进一步核实",
      lower: "因可核实信息较弱，优先级较低",
    },
  },
};

function getCopy(lang = "en") {
  return lang === "zh" ? COPY.zh : COPY.en;
}

function reportText(lang, path, replacements = {}) {
  const parts = String(path || "").split(".");
  let value = getCopy(lang);
  parts.forEach((part) => {
    value = value && value[part];
  });
  const text = String(value ?? path);
  return Object.entries(replacements).reduce(
    (next, [key, replacement]) => next.replaceAll(`{${key}}`, String(replacement ?? "")),
    text
  );
}

function cleanDisplayValue(value, lang = "en") {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/[，,。.;；]/g, "").trim();
  const map = [
    { key: "one_year", tests: ["1 year", "one year", "一年", "1 year / 一年", "一年 / 1 year"] },
    { key: "six_months", tests: ["6 months", "six months", "6 个月", "半年", "6 months / 6 个月"] },
    { key: "excellent", tests: ["excellent", "优秀", "excellent / 优秀", "优秀 / excellent"] },
    { key: "good", tests: ["good", "良好", "good / 良好", "良好 / good"] },
    { key: "fair", tests: ["fair", "一般", "fair / 一般", "一般 / fair"] },
    { key: "yes", tests: ["yes", "是", "yes / 是", "是 / yes"] },
    { key: "no", tests: ["no", "否", "no / 否", "否 / no"] },
    { key: "none", tests: ["none", "无", "none / 无", "无 / none"] },
    { key: "no_pets", tests: ["no pets", "无宠物", "no / 无宠物", "no pets / 无宠物", "无宠物 / no pets"] },
    { key: "currently_insured", tests: ["currently insured", "目前已投保", "currently insured / 目前已投保"] },
    { key: "will_obtain_before_move_in", tests: ["will obtain before move-in", "入住前购买", "will obtain before move in", "will obtain before move-in / 入住前购买"] },
  ];
  const match = map.find((item) => item.tests.includes(normalized) || item.tests.includes(compact));
  if (match) return reportText(lang, `displayValues.${match.key}`);
  if (raw.includes("/")) {
    const parts = raw.split("/").map((part) => part.trim()).filter(Boolean);
    if (parts.length === 2) {
      const preferred = lang === "zh" ? parts.find((part) => /[\u4e00-\u9fff]/.test(part)) : parts.find((part) => !/[\u4e00-\u9fff]/.test(part));
      if (preferred) return preferred;
    }
  }
  return raw;
}

function clean(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function money(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const income = parseIncomeInfo(raw);
  if (!income.display) return clean(raw);
  return income.display;
}

function dateText(value, lang = "en") {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-CA", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return clean(value);
  }
}

function numberText(value) {
  const text = String(value ?? "").trim();
  return text || "0";
}

function isYes(value) {
  return /^yes\b/i.test(String(value || "").trim());
}

function hasDocumentSupport(app) {
  return Boolean(
    app?.supportDocumentFolderUrl ||
    Number(app?.uploadedFileCount || 0) > 0 ||
    ["uploaded", "complete"].includes(String(app?.documentUploadStatus || "").toLowerCase())
  );
}

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `$${Math.round(num).toLocaleString("en-CA")}`;
}

function formatCadCurrency(value) {
  const amount = formatCurrency(value);
  return amount ? `C${amount}` : "";
}

function extractNumbers(text) {
  return Array.from(String(text || "").matchAll(/(?:c\s*)?\$?\s*\d[\d,]*(?:\.\d+)?/gi))
    .map((match) => Number(match[0].replace(/[^0-9.]/g, "")))
    .filter((num) => Number.isFinite(num) && num > 0);
}

function segmentLooksBusinessGross(segment) {
  const text = String(segment || "").toLowerCase();
  return /\b(business|gross|revenue|sales|company|corp|corporation)\b/.test(text)
    && !/\b(personal|salary|wage|paycheque|paycheck|employment)\b/.test(text);
}

function segmentLooksAnnual(segment) {
  return /\b(annual|annually|year|yearly|per year|\/yr|\/year)\b/i.test(String(segment || ""));
}

function extractLabeledIncome(text, labelPattern) {
  const match = String(text || "").match(new RegExp(`(?:${labelPattern})\\s*[-:]?\\s*(?:c\\s*)?\\$?\\s*(\\d[\\d,]*(?:\\.\\d+)?)`, "i"));
  return match && match[1] ? Number(match[1].replace(/,/g, "")) : 0;
}

function extractLabeledIncomeRange(text, labelPattern) {
  const source = String(text || "");
  const match = source.match(new RegExp(`(?:${labelPattern})\\s*[-:]?\\s*((?:c\\s*)?\\$?\\s*\\d[\\d,]*(?:\\.\\d+)?(?:\\s*[-–—]\\s*(?:c\\s*)?\\$?\\s*\\d[\\d,]*(?:\\.\\d+)?)?)`, "i"));
  if (!match || !match[1]) return null;
  const nums = extractNumbers(match[1]);
  if (!nums.length) return null;
  return {
    lower: Math.min(...nums),
    upper: nums.length > 1 ? Math.max(...nums) : Math.min(...nums),
    isRange: nums.length > 1,
  };
}

function incomeVerificationNote(info, lang = "en") {
  const notes = [];
  if (info.businessGross) {
    notes.push(reportText(lang, "incomeNotes.business_gross", { amount: formatCurrency(info.businessGross) }));
  }
  if (info.otherIncome) {
    notes.push(reportText(lang, "incomeNotes.support_income", { amount: formatCurrency(info.otherIncome) }));
  }
  if (!info.scoringAmount && info.display !== "-") {
    notes.push(reportText(lang, "incomeNotes.unparsed_income"));
  }
  return notes.length ? notes.join(" ") : reportText(lang, "incomeNotes.default_income");
}

function parseIncomeInfo(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return { monthlyAmount: 0, scoringAmount: 0, display: "-", businessGross: 0, otherIncome: 0, notes: [] };

  const normalized = raw
    .replace(/[–—]/g, "-")
    .replace(/\s+to\s+/gi, " - ");
  const monthlyRange = extractLabeledIncomeRange(normalized, "monthly\\s+income|employment\\s+income");
  const monthlyIncome = monthlyRange ? monthlyRange.lower : extractLabeledIncome(normalized, "monthly\\s+income|employment\\s+income");
  const childTax = extractLabeledIncome(normalized, "child\\s*tax|child\\s*benefit|ccb");
  const support = extractLabeledIncome(normalized, "support|support\\s+payment|support\\s+payments");
  if (monthlyIncome || childTax || support) {
    const otherIncome = childTax + support;
    const total = monthlyIncome + otherIncome;
    const displayParts = [];
    if (monthlyIncome) {
      displayParts.push(monthlyRange && monthlyRange.isRange
        ? `employment income ${formatCadCurrency(monthlyRange.lower)}–${formatCadCurrency(monthlyRange.upper)}`
        : `employment income ${formatCurrency(monthlyIncome)}`);
    }
    if (childTax) displayParts.push(`child tax ${formatCurrency(childTax)}`);
    if (support) displayParts.push(`support ${formatCurrency(support)}`);
    if (total) displayParts.push(`total declared ${formatCurrency(total)}`);
    return {
      monthlyAmount: monthlyIncome,
      scoringAmount: monthlyIncome,
      display: displayParts.join("; "),
      businessGross: 0,
      otherIncome,
      notes: otherIncome ? ["support-income-verification-required"] : [],
    };
  }

  const segments = normalized.split(/(?:,(?!\d{3}\b)|;|\n)+/).map((part) => part.trim()).filter(Boolean);
  const incomeSegments = segments.length ? segments : [normalized];
  const monthlyCandidates = [];
  const businessGrossCandidates = [];
  const notes = [];

  incomeSegments.forEach((segment) => {
    const nums = extractNumbers(segment);
    if (!nums.length) return;
    if (segmentLooksBusinessGross(segment)) {
      businessGrossCandidates.push(...nums);
      notes.push("business-gross-separated");
      return;
    }
    const amount = Math.min(...nums);
    monthlyCandidates.push(segmentLooksAnnual(segment) ? amount / 12 : amount);
  });

  if (!monthlyCandidates.length && incomeSegments.length === 1) {
    const nums = extractNumbers(normalized);
    if (nums.length) monthlyCandidates.push(Math.min(...nums));
  }

  const allNums = extractNumbers(normalized);
  const isRange = allNums.length >= 2 && /-/.test(normalized) && incomeSegments.length === 1;
  const display = isRange
    ? `${formatCadCurrency(Math.min(...allNums))}–${formatCadCurrency(Math.max(...allNums))}`
    : raw.replace(/C\$/gi, "C$").replace(/\s+/g, " ");
  const monthlyAmount = monthlyCandidates.reduce((sum, num) => sum + num, 0);

  return {
    monthlyAmount,
    scoringAmount: monthlyAmount,
    display,
    businessGross: businessGrossCandidates.reduce((sum, num) => sum + num, 0),
    otherIncome: 0,
    notes,
  };
}

function parseIncome(value) {
  return parseIncomeInfo(value).monthlyAmount;
}

function creditLevel(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "unknown";
  if (/\b(excellent|very good|good|strong|clean|no issue|no issues)\b/.test(text)) return "acceptable";
  if (/\b(fair|average)\b/.test(text)) return "fair";
  if (/\b(poor|bad|weak|bankrupt|collection|collections|late payment|late payments)\b/.test(text)) return "concern";
  return "unknown";
}

function employmentStability(value, hasDocs) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "unknown";
  if (/\b(unemployed|not employed|between jobs)\b/.test(text)) return "weak";
  if (/\b(self|contract|contractor|freelance|business owner|owner)\b/.test(text)) {
    return hasDocs ? "verify-stable" : "verify";
  }
  if (/\b(full.?time|permanent|employed|salary|salaried|government|retired|pension)\b/.test(text)) return "stable";
  if (/\b(part.?time|casual|temporary|seasonal)\b/.test(text)) return "verify";
  return "verify";
}

function lowerText(...values) {
  return values.map((value) => String(value || "")).join(" ").toLowerCase();
}

function hasVerificationHeavyIncome(app, applicantIncome, jointIncome) {
  const text = lowerText(app.monthlyIncome, app.jointIncome, app.employmentStatus, app.employer, app.incomeSource, app.proofOfIncome);
  return Boolean(
    applicantIncome.businessGross ||
    jointIncome.businessGross ||
    applicantIncome.otherIncome ||
    jointIncome.otherIncome ||
    /\b(self|self-employed|business owner|contractor|freelance|cash|allowance|support|benefit|child tax|ccb|gross|revenue)\b/.test(text)
  );
}

function hasSelfOrOwnerReference(app) {
  const text = lowerText(app.landlordReference, app.currentAddress, app.currentResidencePeriod);
  return /\b(self|myself|own home|owned home|owner|homeowner|family owned)\b/.test(text);
}

function hasLandlordReference(app) {
  return Boolean(String(app.landlordReference || "").trim()) && !hasSelfOrOwnerReference(app);
}

function isLocalResidence(app, listing) {
  const address = lowerText(app.currentAddress);
  const city = lowerText(listing?.city);
  const community = lowerText(listing?.community, listing?.area, listing?.neighbourhood);
  if (!address) return false;
  if (city && address.includes(city.trim())) return true;
  if (community && address.includes(community.trim())) return true;
  return /\b(nanaimo|lantzville|parksville|qualicum|ladysmith|vancouver island)\b/.test(address);
}

function isRemoteMove(app, listing) {
  const address = lowerText(app.currentAddress);
  const city = lowerText(listing?.city);
  if (!address) return false;
  if (city && address.includes(city.trim())) return false;
  return /\b(alberta|calgary|edmonton|ontario|toronto|saskatchewan|manitoba|winnipeg|quebec|remote move|out of province|usa|united states)\b/.test(address);
}

function currentRentCloseToTarget(app, rentValue) {
  const currentRent = parseIncome(app.currentMonthlyRent || app.currentRent);
  if (!currentRent || !rentValue) return false;
  const ratio = currentRent / rentValue;
  return ratio >= 0.75 && ratio <= 1.35;
}

function hasMultiplePets(app) {
  const text = lowerText(app.petDetails, app.petsDetails, app.hasPets);
  if (!text || /^no\b|none|未申报/.test(text)) return false;
  const nums = extractNumbers(text);
  if (nums.some((num) => num > 1)) return true;
  return /\b(dogs|cats|multiple|several|2\b|3\b|two|three)\b/.test(text);
}

function buildApplicantEvaluation(app, rentValue, lang = "en", listing = {}) {
  const c = getCopy(lang);
  const missingLabels = lang === "zh"
    ? {
        applicantName: "申请人姓名",
        email: "邮箱",
        phone: "电话",
        currentAddress: "当前住址",
        moveInDate: "入住日期",
        leaseTerm: "租期",
        employmentStatus: "工作状态",
        monthlyIncome: "月收入",
        creditHistory: "信用情况",
        hasTenantInsurance: "租客保险",
        depositFundsAvailable: "押金准备情况",
      }
    : {
        applicantName: "applicant name",
        email: "email",
        phone: "phone",
        currentAddress: "current address",
        moveInDate: "move-in date",
        leaseTerm: "lease term",
        employmentStatus: "employment status",
        monthlyIncome: "monthly income",
        creditHistory: "credit history statement",
        hasTenantInsurance: "tenant insurance status",
        depositFundsAvailable: "deposit availability",
      };

  const missing = [];
  Object.entries(missingLabels).forEach(([field, label]) => {
    if (!app[field]) missing.push(label);
  });

  const strengths = [];
  const verification = [];
  const notes = [];
  const documentsAvailable = hasDocumentSupport(app);
  const applicantIncome = parseIncomeInfo(app.monthlyIncome);
  const jointIncome = parseIncomeInfo(app.jointIncome);
  const income = applicantIncome.monthlyAmount + jointIncome.monthlyAmount;
  const ratio = rentValue && income ? income / rentValue : 0;
  const credit = creditLevel(app.creditHistory);
  const employment = employmentStability(`${app.employmentStatus || ""} ${app.employer || app.incomeSource || ""}`, documentsAvailable);
  const verificationHeavyIncome = hasVerificationHeavyIncome(app, applicantIncome, jointIncome);
  const realLandlordReference = hasLandlordReference(app);
  const selfOrOwnerReference = hasSelfOrOwnerReference(app);
  const localResidence = isLocalResidence(app, listing);
  const remoteMove = isRemoteMove(app, listing);
  const rentClose = currentRentCloseToTarget(app, rentValue);
  const multiplePets = hasMultiplePets(app);

  if (app.email && app.phone) strengths.push(lang === "zh" ? "已提供直接联系方式。" : "Direct contact details provided.");
  if (app.moveInDate && app.leaseTerm) strengths.push(lang === "zh" ? "已说明入住时间和租期。" : "Move-in timing and lease term are stated.");
  if (app.employmentStatus && app.monthlyIncome) strengths.push(lang === "zh" ? "已提供工作状态和收入信息。" : "Employment and income information are stated.");
  if (isYes(app.depositFundsAvailable)) strengths.push(lang === "zh" ? "申请人表示押金已准备。" : "Deposit availability is stated as ready.");
  if (String(app.hasTenantInsurance || "").toLowerCase().includes("yes")) {
    strengths.push(lang === "zh" ? "已说明租客保险状态。" : "Tenant insurance status is stated as active or available.");
  }
  if (documentsAvailable) strengths.push(lang === "zh" ? "支持文件已上传或已链接，可供审核。" : "Supporting documents are uploaded or linked for review.");
  if (realLandlordReference) strengths.push(lang === "zh" ? "已提供房东推荐人信息。" : "Landlord reference information is provided.");
  if (localResidence) strengths.push(lang === "zh" ? "当前住址与本地市场较接近，便于核实租赁背景。" : "Current residence appears local or nearby, which supports practical reference checks.");
  if (rentClose) strengths.push(lang === "zh" ? "当前月租与目标租金较接近，租金承受能力更容易核实。" : "Current rent is close to the target rent, which supports affordability review.");

  if (missing.length) {
    verification.push(lang === "zh"
      ? `缺失或不完整字段：${missing.join("、")}。`
      : `Missing or incomplete fields: ${missing.join(", ")}.`);
  }
  if (app.monthlyIncome && rentValue) {
    if (income) {
      if (ratio >= 2.5) strengths.push(lang === "zh" ? `申报家庭收入约为月租的 ${ratio.toFixed(1)} 倍。` : `Stated household income is approximately ${ratio.toFixed(1)}x monthly rent.`);
      else verification.push(lang === "zh" ? `申报家庭收入约为月租的 ${ratio.toFixed(1)} 倍；建议核实收入证明并评估承租能力。` : `Stated household income is approximately ${ratio.toFixed(1)}x monthly rent; request income proof and review affordability.`);
    } else {
      verification.push(lang === "zh" ? "已填写月收入，但无法解析为数字，需要人工核实。" : "Monthly income is stated but cannot be parsed as a number.");
    }
  }
  if (applicantIncome.businessGross || jointIncome.businessGross) {
    verification.push(lang === "zh"
      ? "申请中包含 business gross / business revenue 信息；初筛评分未将其直接计入个人月收入，需用文件核实可支配收入。"
      : "Business gross / revenue is stated; initial scoring does not count it as personal monthly income until verified.");
  }
  if (verificationHeavyIncome && !(applicantIncome.businessGross || jointIncome.businessGross || applicantIncome.otherIncome || jointIncome.otherIncome)) {
    verification.push(lang === "zh"
      ? "收入来源包含自雇、现金补贴或其他需核实项目；需以文件确认稳定可支配月收入。"
      : "Income includes self-employed, cash allowance, or other verification-heavy sources; confirm stable disposable monthly income with documents.");
  }
  if (applicantIncome.otherIncome || jointIncome.otherIncome) {
    verification.push(lang === "zh"
      ? "申请中包含 child tax / support / benefit 类收入；可作为申报收入参考，但需核实稳定性和可持续性。"
      : "Child tax / support / benefit income is stated; it is useful context but requires verification for stability and continuity.");
  }
  if (!documentsAvailable) verification.push(lang === "zh" ? "支持文件尚未确认。" : "Supporting documents are not yet confirmed.");
  if (!app.landlordReference) verification.push(lang === "zh" ? "仍需收集或核实现任 / 前任房东推荐人。" : "Landlord reference still needs to be collected or confirmed.");
  if (selfOrOwnerReference) verification.push(lang === "zh" ? "推荐人 / 居住历史显示自有住房或自我说明；需要用其他中性文件核实居住与付款记录。" : "Reference or residence history suggests owner-occupied/self reference; verify residence and payment history using other neutral documents.");
  if (remoteMove) verification.push(lang === "zh" ? "当前住址显示可能为异地搬迁；需核实搬迁计划、入住时间和推荐人信息。" : "Current residence suggests a remote move; verify move plan, timing, and references.");
  if (!app.proofOfIncome && !documentsAvailable) verification.push(lang === "zh" ? "最终批准前应要求收入证明。" : "Income proof should be requested before final approval.");
  if (String(app.creditHistory || "").trim()) verification.push(lang === "zh" ? "自述信用情况需要结合当前文件核实。" : "Credit history statement should be verified with current documents.");
  if (credit === "fair") {
    verification.push(lang === "zh" ? "自述信用为 Fair；除非支持文件核实结果更强，否则不应归为强候选人。" : "Credit is stated as Fair; do not treat as a strong candidate unless supporting documents verify a stronger position.");
  } else if (credit === "concern") {
    verification.push(lang === "zh" ? "自述信用存在需要进一步核实的项目。" : "Credit statement includes items requiring additional verification.");
  }
  if (String(app.evictionHistory || "").trim() && !/^no\b|none$/i.test(String(app.evictionHistory).trim())) {
    verification.push(lang === "zh" ? "申请人披露了租赁历史事项；应以中性方式要求说明和佐证。" : "Applicant disclosed a tenancy history item; request neutral context and supporting explanation.");
  }

  if (isYes(app.hasPets)) {
    notes.push(lang === "zh" ? "已披露宠物；应从物业适配、宠物押金、噪音、物业维护和房屋规则角度审核。" : "Pets disclosed; review tenancy suitability, pet deposit, property care expectations, and house rules.");
  }
  if (multiplePets) {
    notes.push(lang === "zh" ? "多只宠物需中性核实物业适配、宠物押金、噪音、清洁维护和房屋规则。" : "Multiple pets require neutral verification of property suitability, pet deposit, noise, care, and house rules.");
  }
  if (app.parkingRequest) notes.push(lang === "zh" ? "停车需求需与实际可用停车位核对。" : "Parking needs should be checked against available parking.");
  if (String(app.smokesVapesCannabis || "").toLowerCase().startsWith("yes")) {
    notes.push(lang === "zh" ? "已披露吸烟 / 电子烟 / cannabis 使用；需确认物业规则和禁烟协议。" : "Smoking / vaping / cannabis use disclosed; confirm property house rules and no-smoking agreement.");
  }
  if (!notes.length) notes.push(lang === "zh" ? "根据已提交字段，暂无明显中性适配备注。" : "No major neutral suitability notes from the submitted fields.");

  let score = 0;
  if (app.applicantName) score += 1;
  if (app.email) score += 1;
  if (app.phone) score += 1;
  if (app.currentAddress) score += 1;
  if (app.moveInDate) score += 1;
  if (app.leaseTerm) score += 1;
  if (employment === "stable") score += 5;
  else if (employment === "verify-stable") score += 3;
  else if (employment === "verify") score += 1;
  else if (employment === "weak") score -= 4;
  if (ratio >= 3) score += 8;
  else if (ratio >= 2.5) score += 5;
  else if (ratio >= 2) score += 2;
  else if (ratio >= 1.5) score -= 2;
  else if (ratio > 0) score -= 6;
  if (verificationHeavyIncome) score -= 3;
  if (realLandlordReference) score += 3;
  if (selfOrOwnerReference) score -= 2;
  if (localResidence) score += 2;
  if (remoteMove) score -= 1;
  if (rentClose) score += 2;
  if (credit === "acceptable") score += 3;
  else if (credit === "fair") score -= 3;
  else if (credit === "concern") score -= 6;
  if (app.hasTenantInsurance) score += 1;
  if (isYes(app.depositFundsAvailable)) score += 1;
  if (documentsAvailable) score += 5;
  else score -= 4;
  if (multiplePets) score -= 1;
  if (missing.length >= 5) score -= 2;

  let rankingKey = "verify";
  const hasMajorVerificationGap = !documentsAvailable || verificationHeavyIncome || credit === "fair" || selfOrOwnerReference || remoteMove;
  if (!income || !rentValue) {
    rankingKey = score <= 3 ? "lower" : "verify";
  } else if (ratio < 2.5) {
    rankingKey = score >= 9 && documentsAvailable && credit !== "fair" && credit !== "concern" ? "verify" : "lower";
  } else if (ratio < 3) {
    rankingKey = score >= 13 && !hasMajorVerificationGap ? "backup" : "verify";
  } else if (
    ratio >= 3 &&
    documentsAvailable &&
    (employment === "stable" || employment === "verify-stable") &&
    credit === "acceptable" &&
    !verificationHeavyIncome
  ) {
    rankingKey = "strong";
  } else if (ratio >= 3) {
    rankingKey = "backup";
  }
  if (!documentsAvailable && rankingKey === "strong") rankingKey = "backup";
  if ((credit === "fair" || credit === "concern") && rankingKey === "strong") rankingKey = "backup";

  const recommendedNextStepKey = rankingKey === "strong"
    ? "proceed_verification"
    : rankingKey === "backup"
      ? "keep_as_backup"
      : "request_missing";

  const incomeNotes = [incomeVerificationNote(applicantIncome, lang)];
  if (jointIncome.display !== "-") {
    const jointNote = incomeVerificationNote(jointIncome, lang);
    if (jointNote && !incomeNotes.includes(jointNote)) incomeNotes.push(jointNote);
  }

  return {
    score,
    ranking: c.rankings[rankingKey],
    rankingKey,
    recommendedNextStepKey,
    incomeRatio: ratio,
    declaredIncomeDisplay: [applicantIncome.display, jointIncome.display !== "-" ? jointIncome.display : ""].filter(Boolean).join(" + ") || "-",
    scoringIncome: income,
    incomeVerificationNote: incomeNotes.join(" "),
    strengths: strengths.length ? strengths : [lang === "zh" ? "申请表包含基础审核信息。" : "Application contains basic intake information for review."],
    verificationNeeded: verification.length ? verification : [lang === "zh" ? "仍需完成身份、收入、推荐人和文件标准核实。" : "Standard identity, income, reference, and document verification still required."],
    neutralRiskNotes: notes,
    recommendedNextStep: reportText(lang, `recommendationKeys.${recommendedNextStepKey}`),
  };
}

export function debugApplicantScreeningForListing({ listing, applications, lang = "en" }) {
  const apps = Array.isArray(applications) ? applications : [];
  const rentValue = parseIncome(listing?.rent);
  const rows = apps.map((app) => {
    const evaluation = buildApplicantEvaluation(app, rentValue, lang, listing);
    return {
      listingId: listing?.id || app.listingId || "",
      applicant: clean(app.applicantName),
      rawMonthlyIncome: clean(app.monthlyIncome),
      rawJointIncome: clean(app.jointIncome),
      displayedDeclaredIncome: evaluation.declaredIncomeDisplay,
      conservativeScoringIncome: formatCurrency(evaluation.scoringIncome) || "-",
      rentToIncomeRatio: evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(2)}x` : "-",
      credit: clean(app.creditHistory),
      documents: hasDocumentSupport(app) ? "available" : "missing",
      category: evaluation.ranking,
      rankingKey: evaluation.rankingKey,
      incomeVerificationNote: evaluation.incomeVerificationNote,
    };
  });
  if (typeof console !== "undefined") {
    console.info("[Applicant Screening Debug]", listing?.id || apps[0]?.listingId || "", rows);
    if (console.table) console.table(rows);
  }
  return rows;
}

export function openApplicantReportWindow(reportHtml) {
  const printWindow = window.open("", "_blank", "width=980,height=1100");
  if (!printWindow) return;
  printWindow.document.write(reportHtml);
  printWindow.document.close();
}

async function saveReportToDrive({ listingId, fileName, html, reportType }) {
  if (!listingId || listingId === "-") return null;
  try {
    const { saveApplicantReportPdf } = await import("./storage.js");
    const result = await saveApplicantReportPdf({ listingId, fileName, html, reportType });
    if (typeof console !== "undefined") {
      console.info("[Applicant Report Save Response]", result);
    }
    return result;
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn("[Applicant Report Save Failed]", error);
    }
    return {
      success: false,
      error: error?.message || "Report save failed",
      manualVerificationRequired: false,
    };
  }
}

function withPlaceholder(value, lang) {
  const text = String(value ?? "").trim();
  return text && text !== "-" ? text : reportText(lang, "notProvided");
}

// Parses a composite "Label: value" block (as built by the intake form's
// formatSection/joinSections helpers, one "Label: value" pair per line) into
// a { Label: value } map. Used to pull a couple of specific sub-fields out of
// a long free-text blob for the compact Initial Screening Summary without
// reproducing the whole paragraph. Never invents a value — a line that
// doesn't match "Label: value" is simply not added to the map.
function parseLabeledLines(text) {
  const map = {};
  String(text || "").split(/\n+/).forEach((line) => {
    const match = line.match(/^([^:]{1,60}):\s*(.+)$/);
    if (match && !(match[1].trim() in map)) map[match[1].trim()] = match[2].trim();
  });
  return map;
}

// Compresses the employer/income-source free-text blob into a short
// structured summary (employer, employment length, whether other income was
// declared) for the Initial Screening Summary. Falls back to the raw value
// (truncated, never fabricated) when it isn't in the expected labeled format
// — e.g. legacy records that stored a plain employer name.
function summarizeEmployerBlob(raw) {
  const text = String(raw || "").trim();
  if (!text) return { employer: "", employmentLength: "", otherIncomeNoted: false };
  const map = parseLabeledLines(text);
  const employer = map["Employer / Income Source"] || "";
  const employmentLength = map["Length of Employment"] || "";
  const otherIncomeNoted = Boolean(map["Other Income"]);
  if (!employer && !employmentLength && !otherIncomeNoted) {
    return { employer: text.length > 140 ? `${text.slice(0, 140)}…` : text, employmentLength: "", otherIncomeNoted: false };
  }
  return { employer, employmentLength, otherIncomeNoted };
}

// Row 2 — Core Facts: contact, move-in timing, household, and lifestyle
// details in a compact grid rather than a tall single-column table.
function candidateCoreFacts(app, lang) {
  const c = getCopy(lang);
  const rows = [
    [c.fields.phone, clean(app.phone)],
    [c.fields.email, clean(app.email)],
    [c.fields.currentAddress, cleanDisplayValue(app.currentAddress, lang)],
    [c.fields.moveInDate, dateText(app.moveInDate, lang)],
    [c.fields.leaseTerm, cleanDisplayValue(app.leaseTerm, lang)],
    [c.fields.occupants, `${numberText(app.occupants)} (${reportText(lang, "documentStatus.adults_minors", { adults: numberText(app.adults), minors: numberText(app.minors) })})`],
    [c.fields.pets, isYes(app.hasPets) ? cleanDisplayValue(app.petDetails, lang) : cleanDisplayValue(app.hasPets || reportText(lang, "documentStatus.no_pets"), lang)],
    [c.fields.smoking, cleanDisplayValue(app.smokesVapesCannabis, lang)],
    [c.fields.parking, cleanDisplayValue(app.parkingRequest, lang)],
    [c.fields.reasonForMoving, clean(app.reasonForMoving)],
  ];
  return rows.map(([label, value]) => ({ label, value: withPlaceholder(value, lang) }));
}

// Row 3 — Employment and Income: summarized employer info plus the income
// figures already computed by buildApplicantEvaluation (no recalculation).
function candidateEmploymentIncome(app, evaluation, lang) {
  const c = getCopy(lang);
  const employerInfo = summarizeEmployerBlob(app.employer || app.incomeSource);
  const rows = [
    [c.fields.employmentStatus, cleanDisplayValue(app.employmentStatus, lang)],
    [c.fields.employer, employerInfo.employer],
    [c.fields.employmentLength, employerInfo.employmentLength],
    [c.fields.monthlyIncome, money(app.monthlyIncome)],
    [c.fields.jointIncome, money(app.jointIncome)],
    [c.scoringIncome, formatCurrency(evaluation.scoringIncome) || "-"],
    [c.rentToIncome, evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-"],
    [c.incomeVerificationNote, evaluation.incomeVerificationNote],
  ];
  if (employerInfo.otherIncomeNoted) rows.push([reportText(lang, "otherIncomeDeclared"), reportText(lang, "otherIncomeDeclared")]);
  return rows
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => ({ label, value: withPlaceholder(value, lang) }));
}

// Row 4 — Rental and Reference Summary. Landlord/reference is a status flag
// only here (never the full contact blob with names/phones/emails) — the
// complete text remains available in the original application record and
// the Full Applicant Audit Report.
function candidateRentalReference(app, lang) {
  const c = getCopy(lang);
  const rows = [
    [c.fields.currentRent, money(app.currentMonthlyRent || app.currentRent)],
    [c.fields.residencePeriod, cleanDisplayValue(app.currentResidencePeriod || app.residencePeriod, lang)],
    [c.fields.references, app.landlordReference ? reportText(lang, "documentStatus.to_confirm") : reportText(lang, "documentStatus.not_confirmed")],
    [c.fields.credit, cleanDisplayValue(app.creditHistory, lang)],
    [c.fields.eviction, cleanDisplayValue(app.evictionHistory, lang)],
    [c.fields.insurance, cleanDisplayValue(app.hasTenantInsurance, lang)],
    [c.fields.deposit, cleanDisplayValue(app.depositFundsAvailable, lang)],
    [c.fields.supportStatus, documentStatusText(app, lang)],
  ];
  return rows.map(([label, value]) => ({ label, value: withPlaceholder(value, lang) }));
}

function safeFilePart(value, fallback = "report") {
  return String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|#%{}~&]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 80);
}

function riskKeyFromEvaluations(evaluated) {
  if (!evaluated.length) return "needs_data";
  const hasLower = evaluated.some((item) => item.evaluation.rankingKey === "lower");
  const hasVerify = evaluated.some((item) => item.evaluation.rankingKey === "verify");
  const hasStrong = evaluated.some((item) => item.evaluation.rankingKey === "strong");
  if (hasLower) return "medium_high";
  if (hasVerify) return "medium";
  if (hasStrong) return "lower";
  return "medium";
}

function confidenceKeyFromEvaluations(evaluated) {
  if (!evaluated.length) return "low";
  const withDocs = evaluated.filter(({ app }) => hasDocumentSupport(app)).length;
  if (withDocs === evaluated.length) return "high";
  if (withDocs > 0) return "medium";
  return "low";
}

function recommendationTone(rankingKey) {
  if (rankingKey === "strong") return "success";
  if (rankingKey === "backup") return "success";
  if (rankingKey === "verify") return "warning";
  if (rankingKey === "lower") return "danger";
  return "neutral";
}

function documentStatusText(app, lang = "en", mode = "linked") {
  if (app.documentUploadStatus) return clean(app.documentUploadStatus);
  if (hasDocumentSupport(app)) {
    return reportText(lang, mode === "short" ? "documentStatus.available" : "documentStatus.linked");
  }
  return reportText(lang, mode === "short" ? "documentStatus.to_confirm" : "documentStatus.not_confirmed");
}

function buildInitialScreeningReportData({ listing, applications, evaluated, lang, fileName, generatedDate, listingId, address }) {
  const c = getCopy(lang);
  const top = evaluated[0];
  const confidenceKey = confidenceKeyFromEvaluations(evaluated);
  const riskKey = riskKeyFromEvaluations(evaluated);
  const confidence = reportText(lang, `confidenceLevels.${confidenceKey}`);
  const riskLevel = reportText(lang, `riskLevels.${riskKey}`);
  const goodBackupCount = evaluated.filter((item) => item.evaluation.rankingKey === "backup").length;
  const verifyCount = evaluated.filter((item) => item.evaluation.rankingKey === "verify").length;
  const highestRatio = evaluated.reduce((max, item) => Math.max(max, item.evaluation.incomeRatio || 0), 0);
  const topRecommendation = top
    ? `${clean(top.app.applicantName)} - ${top.evaluation.recommendedNextStep}`
    : c.noApplications;

  const comparisonColumns = [
    { key: "rank", label: c.rank },
    { key: "applicant", label: c.applicant },
    { key: "category", label: c.initialCategory, isBadge: true },
    { key: "moveIn", label: c.moveIn },
    { key: "leaseTerm", label: c.leaseTerm },
    { key: "declaredIncome", label: c.incomeStated },
    { key: "scoringIncome", label: c.scoringIncome },
    { key: "rentRatio", label: c.rentToIncome },
    { key: "documents", label: c.documents },
    { key: "nextStep", label: c.recommendedNextStep },
  ];

  const comparisonRows = evaluated.map(({ app, evaluation }, index) => ({
    rank: String(index + 1),
    applicant: clean(app.applicantName),
    category: c.rankings[evaluation.rankingKey] || evaluation.ranking,
    categoryTone: recommendationTone(evaluation.rankingKey),
    moveIn: dateText(app.moveInDate, lang),
    leaseTerm: clean(app.leaseTerm),
    declaredIncome: evaluation.declaredIncomeDisplay,
    scoringIncome: formatCurrency(evaluation.scoringIncome) || "-",
    rentRatio: evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-",
    documents: documentStatusText(app, lang),
    nextStep: reportText(lang, `recommendationKeys.${evaluation.recommendedNextStepKey}`),
  }));

  const candidates = evaluated.map(({ app, evaluation }, index) => ({
    rank: String(index + 1),
    name: clean(app.applicantName),
    category: c.rankings[evaluation.rankingKey] || evaluation.ranking,
    categoryTone: recommendationTone(evaluation.rankingKey),
    recommendation: reportText(lang, `recommendationKeys.${evaluation.recommendedNextStepKey}`),
    recommendationTone: recommendationTone(evaluation.rankingKey),
    metrics: [
      { label: c.rentToIncome, value: evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-" },
      { label: c.documents, value: documentStatusText(app, lang, "short") },
    ],
    coreFacts: candidateCoreFacts(app, lang),
    employmentIncome: candidateEmploymentIncome(app, evaluation, lang),
    rentalReference: candidateRentalReference(app, lang),
    strengths: evaluation.strengths,
    concerns: evaluation.neutralRiskNotes,
    recommendations: [reportText(lang, `recommendationKeys.${evaluation.recommendedNextStepKey}`), ...evaluation.verificationNeeded],
    finalAssessment: reportText(lang, `assessments.${evaluation.rankingKey}`),
  }));

  return {
    reportType: "Initial Screening Summary",
    language: lang,
    title: c.initialTitle,
    fileName,
    copy: c,
    meta: [
      { label: c.listingId, value: listingId },
      { label: c.propertyAddress, value: address },
      { label: c.generatedDate, value: generatedDate },
      { label: c.preparedBy, value: c.company },
      { label: c.applicationsReceived, value: String(applications.length) },
    ],
    executiveSummary: [
      { label: c.applicationsReceived, value: String(applications.length) },
      { label: c.goodBackup, value: String(goodBackupCount) },
      { label: c.requiresFurtherVerification, value: String(verifyCount) },
      { label: c.highestRentToIncomeRatio, value: highestRatio ? `${highestRatio.toFixed(1)}x` : "-" },
      { label: c.recommendedNextStep, value: c.topApplicantChecks },
    ],
    aiRecommendation: topRecommendation,
    recommendationTone: top ? recommendationTone(top.evaluation.rankingKey) : "neutral",
    riskLevel,
    riskTone: reportStatusTone(riskLevel),
    ranking: evaluated.map(({ app, evaluation }, index) => ({
      rank: String(index + 1),
      name: clean(app.applicantName),
      category: c.rankings[evaluation.rankingKey] || evaluation.ranking,
      tone: recommendationTone(evaluation.rankingKey),
      recommendation: reportText(lang, `recommendationKeys.${evaluation.recommendedNextStepKey}`),
    })),
    comparisonColumns,
    comparisonRows,
    candidates,
    notice: c.initialNotice,
    emptyText: c.noApplications,
  };
}

export async function downloadApplicantInitialScreeningSummary({ listing, applications, lang = "en", autoOpen = false }) {
  const c = getCopy(lang);
  const apps = Array.isArray(applications) ? applications : [];
  const rentValue = parseIncome(listing?.rent);
  debugApplicantScreeningForListing({ listing, applications: apps, lang });
  const evaluated = apps
    .map((app) => ({ app, evaluation: buildApplicantEvaluation(app, rentValue, lang, listing) }))
    .sort((a, b) => b.evaluation.score - a.evaluation.score);
  const generatedDate = dateText(new Date().toISOString(), lang);
  const listingId = clean(listing?.id || apps[0]?.listingId);
  const address = [listing?.address, listing?.city].filter(Boolean).join(", ") || "-";
  const reportDate = new Date().toISOString().slice(0, 10);
  const fileName = `Applicant_Initial_Screening_Summary_${safeFilePart(listingId)}_${reportDate}.pdf`;

  const reportData = buildInitialScreeningReportData({
    listing,
    applications: apps,
    evaluated,
    lang,
    fileName,
    generatedDate,
    listingId,
    address,
  });
  const html = renderProfessionalReportHtml(reportData);
  if (autoOpen) openApplicantReportWindow(html);
  const saveResult = await saveReportToDrive({ listingId, fileName, html, reportType: "Initial Screening Summary" });
  return {
    title: c.initialTitle,
    reportType: "Initial Screening Summary",
    generatedAt: new Date().toISOString(),
    fileName,
    reportData,
    html,
    saveResult,
  };
}

export function buildApplicantInitialScreeningDemoReport(lang = "en") {
  const safeLang = lang === "zh" ? "zh" : "en";
  const reportDate = new Date().toISOString().slice(0, 10);
  const listing = {
    id: "DEMO-LST-001",
    address: safeLang === "zh" ? "123 Bowen Road" : "123 Bowen Road",
    city: "Nanaimo",
    rent: "2800",
  };
  const applications = [
    {
      listingId: listing.id,
      applicantName: safeLang === "zh" ? "申请人 A" : "Applicant A",
      phone: "250-000-0101",
      email: "applicant-a@example.com",
      currentAddress: "Nanaimo, BC",
      moveInDate: "2026-08-01",
      leaseTerm: safeLang === "zh" ? "一年" : "One year",
      currentMonthlyRent: "2100",
      currentResidencePeriod: safeLang === "zh" ? "2 年" : "2 years",
      employmentStatus: safeLang === "zh" ? "全职" : "Full-time",
      employer: safeLang === "zh" ? "本地雇主" : "Local employer",
      monthlyIncome: "$8,600 monthly employment income",
      jointIncome: "$2,200 monthly part-time income",
      occupants: "3",
      adults: "2",
      minors: "1",
      hasPets: safeLang === "zh" ? "否" : "No",
      parkingRequest: safeLang === "zh" ? "1 辆车" : "1 vehicle",
      creditHistory: safeLang === "zh" ? "良好" : "Good",
      evictionHistory: safeLang === "zh" ? "无" : "No",
      hasTenantInsurance: safeLang === "zh" ? "愿意购买" : "Will obtain",
      depositFundsAvailable: "Yes",
      documentUploadStatus: safeLang === "zh" ? "文件已上传" : "Documents uploaded",
      supportDocumentFolderUrl: "demo",
      landlordReference: safeLang === "zh" ? "当前房东推荐人" : "Current landlord reference",
      reasonForMoving: safeLang === "zh" ? "需要更大空间" : "Needs more space",
    },
    {
      listingId: listing.id,
      applicantName: safeLang === "zh" ? "申请人 B" : "Applicant B",
      phone: "250-000-0102",
      email: "applicant-b@example.com",
      currentAddress: "Victoria, BC",
      moveInDate: "2026-08-15",
      leaseTerm: safeLang === "zh" ? "一年" : "One year",
      currentMonthlyRent: "1900",
      currentResidencePeriod: safeLang === "zh" ? "1 年" : "1 year",
      employmentStatus: safeLang === "zh" ? "自雇" : "Self-employed",
      employer: safeLang === "zh" ? "自营业务" : "Self-employed business",
      monthlyIncome: "Business gross revenue $12,000 monthly, personal income to verify",
      jointIncome: "",
      occupants: "2",
      adults: "2",
      minors: "0",
      hasPets: safeLang === "zh" ? "有，一只猫" : "Yes, one cat",
      petDetails: safeLang === "zh" ? "一只猫" : "One cat",
      parkingRequest: safeLang === "zh" ? "2 辆车" : "2 vehicles",
      creditHistory: safeLang === "zh" ? "一般" : "Fair",
      evictionHistory: safeLang === "zh" ? "无" : "No",
      hasTenantInsurance: safeLang === "zh" ? "未确认" : "Not confirmed",
      depositFundsAvailable: "Yes",
      documentUploadStatus: safeLang === "zh" ? "部分文件" : "Partial documents",
      supportDocumentFolderUrl: "",
      landlordReference: safeLang === "zh" ? "业主本人" : "Owner/self reference",
      reasonForMoving: safeLang === "zh" ? "工作地点变动" : "Work location change",
    },
    {
      listingId: listing.id,
      applicantName: safeLang === "zh" ? "申请人 C" : "Applicant C",
      phone: "250-000-0103",
      email: "applicant-c@example.com",
      currentAddress: "Vancouver, BC",
      moveInDate: "2026-09-01",
      leaseTerm: safeLang === "zh" ? "6 个月" : "6 months",
      currentMonthlyRent: "1600",
      currentResidencePeriod: safeLang === "zh" ? "6 个月" : "6 months",
      employmentStatus: safeLang === "zh" ? "待确认" : "To verify",
      employer: "",
      monthlyIncome: "$4,200 monthly income",
      jointIncome: "",
      occupants: "1",
      adults: "1",
      minors: "0",
      hasPets: safeLang === "zh" ? "否" : "No",
      parkingRequest: "",
      creditHistory: safeLang === "zh" ? "未提供" : "Not provided",
      evictionHistory: safeLang === "zh" ? "未提供" : "Not provided",
      hasTenantInsurance: "",
      depositFundsAvailable: "",
      documentUploadStatus: safeLang === "zh" ? "未确认" : "Not confirmed",
      supportDocumentFolderUrl: "",
      landlordReference: "",
      reasonForMoving: "",
    },
  ];
  const rentValue = parseIncome(listing.rent);
  const evaluated = applications
    .map((app) => ({ app, evaluation: buildApplicantEvaluation(app, rentValue, safeLang, listing) }))
    .sort((a, b) => b.evaluation.score - a.evaluation.score);
  const c = getCopy(safeLang);
  const reportData = buildInitialScreeningReportData({
    listing,
    applications,
    evaluated,
    lang: safeLang,
    fileName: `VIPM_Initial_Applicant_Screening_Report_Demo_${safeLang.toUpperCase()}_${reportDate}.pdf`,
    generatedDate: dateText(new Date().toISOString(), safeLang),
    listingId: listing.id,
    address: [listing.address, listing.city].filter(Boolean).join(", "),
  });
  const html = renderProfessionalReportHtml(reportData);
  return {
    title: c.initialTitle,
    reportType: "Initial Screening Summary Demo",
    fileName: reportData.fileName,
    reportData,
    html,
  };
}

export function openApplicantInitialScreeningDemoReport(lang = "en") {
  const result = buildApplicantInitialScreeningDemoReport(lang);
  openApplicantReportWindow(result.html);
  return result;
}

function listFromAnalysis(section, fallback, lang = "en") {
  const notes = section?.notes || [];
  if (notes.length) return notes;
  return [fallback || (lang === "zh" ? "未提取到可核实信息，需人工核对。" : "No verifiable details extracted. Manual verification required.")];
}

function extractedDocumentSummaryLines(documentAnalysis, lang = "en") {
  const files = documentAnalysis?.files || [];
  if (!files.length) {
    return [lang === "zh" ? "未匹配到可读取支持文件。" : "No readable matching supporting documents were found."];
  }
  return files.map((file) => {
    const status = file.extractionStatus || "Manual verification required";
    const method = file.extractionMethod || "-";
    const snippet = file.snippet ? ` - ${String(file.snippet).slice(0, 220)}` : " - This document could not be automatically verified. Manual verification is required.";
    return `${file.type || "Other"}: ${file.name} (${status}, ${method})${snippet}`;
  });
}

export async function downloadFullApplicantAuditReport({ applicant, listing, lang = "en", supportFiles = [], documentAnalysis = null, autoOpen = false, saveToDrive = true }) {
  const c = getCopy(lang);
  const app = applicant || {};
  const supportSummary = matchSupportDocumentsForApplicant(app, supportFiles);
  const extractedSummary = documentAnalysis?.extractedSummary || {};
  const rentValue = parseIncome(listing?.rent);
  const evaluation = buildApplicantEvaluation(app, rentValue, lang, listing);
  const generatedDate = dateText(new Date().toISOString(), lang);
  const listingId = clean(app.listingId || listing?.id);
  const reportDate = new Date().toISOString().slice(0, 10);
  const fileName = `Full_Applicant_Audit_${safeFilePart(app.applicantName, "Applicant")}_${safeFilePart(app.recordId, "Record")}_${reportDate}.pdf`;
  const supportStatus = supportSummary.available || hasDocumentSupport(app)
    ? reportText(lang, "documentStatus.available")
    : reportText(lang, "documentStatus.not_confirmed");
  const supportFileLines = supportSummary.files.length
    ? supportSummary.files.map((file) => `${file.type}: ${file.name}${file.modifiedAt ? ` (${dateText(file.modifiedAt, lang)})` : ""}`)
    : [lang === "zh" ? "未匹配到支持文件，需人工核对。" : "No matching supporting document files were found. Manual verification required."];
  const confidenceKey = supportSummary.available || documentAnalysis ? "medium" : "low";
  const confidence = reportText(lang, `confidenceLevels.${confidenceKey}`);
  const recommendedDecision = extractedSummary?.recommendedDecision || c.rankings[evaluation.rankingKey] || evaluation.ranking;
  const sections = [
    { type: "checklist", title: c.documentReviewSummary, items: [
      { label: c.incomeDocuments, status: supportStatus },
      { label: c.idDocuments, status: listFromAnalysis(extractedSummary?.identity, reportText(lang, "documentStatus.to_confirm"), lang)[0] },
      { label: c.bankStatements, status: listFromAnalysis(extractedSummary?.bank, reportText(lang, "documentStatus.to_confirm"), lang)[0] },
      { label: c.creditBackground, status: cleanDisplayValue(app.creditHistory, lang) },
      { label: c.references, status: app.landlordReference ? reportText(lang, "documentStatus.to_confirm") : reportText(lang, "documentStatus.not_confirmed") },
      { label: c.missingDocuments, status: supportSummary.count ? "-" : reportText(lang, "documentStatus.to_confirm") },
    ] },
    { title: lang === "zh" ? "支持文件列表" : "Supporting Document List", items: supportFileLines },
    { title: lang === "zh" ? "文件读取摘要" : "Extracted Document Summary", items: extractedDocumentSummaryLines(documentAnalysis, lang) },
    { title: c.incomeReview, items: [
      `${c.declaredIncome}: ${money(app.monthlyIncome)}`,
      `${c.scoringIncome}: ${formatCurrency(evaluation.scoringIncome) || "-"}`,
      `${c.rentToIncome}: ${evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-"}`,
      `${c.verificationStatus}: ${clean(extractedSummary?.income?.confidence || confidence)}`,
      evaluation.incomeVerificationNote,
    ] },
    { title: c.employmentNotes, items: [
      `${c.fields.employmentStatus}: ${cleanDisplayValue(app.employmentStatus, lang)}`,
      `${c.fields.employer}: ${cleanDisplayValue(app.employer || app.incomeSource, lang)}`,
      ...listFromAnalysis(extractedSummary?.employment, "", lang),
    ] },
    { title: lang === "zh" ? "身份一致性" : "Identity Consistency", items: listFromAnalysis(extractedSummary?.identity, reportText(lang, "documentStatus.to_confirm"), lang) },
    { title: lang === "zh" ? "银行流水" : "Bank Statement Review", items: listFromAnalysis(extractedSummary?.bank, reportText(lang, "documentStatus.to_confirm"), lang) },
    { title: c.creditNotes, items: [
      `${c.fields.credit}: ${cleanDisplayValue(app.creditHistory, lang)}`,
      ...listFromAnalysis(extractedSummary?.credit, "", lang),
    ] },
    { title: c.landlordReferenceNotes, items: [
      app.landlordReference ? reportText(lang, "documentStatus.to_confirm") : reportText(lang, "documentStatus.not_confirmed"),
      ...listFromAnalysis(extractedSummary?.reference, "", lang),
    ] },
    { title: c.potentialInconsistencies, items: [
      ...((extractedSummary?.inconsistencies || []).map(String)),
      lang === "zh" ? "任何不一致应记录为需要核实事项，而不是最终决定理由。" : "Record any mismatch as a verification item, not as a final decision reason.",
    ] },
    { title: c.missingItems, items: evaluation.verificationNeeded },
    { title: c.strengths, items: evaluation.strengths },
    { title: c.concerns, items: evaluation.neutralRiskNotes },
    { title: c.finalRecommendation, items: [recommendedDecision, reportText(lang, `recommendationKeys.${evaluation.recommendedNextStepKey}`)] },
  ];

  const html = renderStructuredProfessionalReportHtml({
    reportType: "Full Applicant Audit Report",
    language: lang,
    title: c.fullTitle,
    subtitle: c.auditNotice,
    fileName,
    copy: c,
    meta: [
      { label: c.generatedDate, value: generatedDate },
      { label: c.preparedBy, value: c.company },
    ],
    candidateSummary: [
      { label: c.applicationId, value: clean(app.recordId) },
      { label: c.listingId, value: listingId },
      { label: c.applicant, value: clean(app.applicantName) },
      { label: c.fields.moveInDate, value: dateText(app.moveInDate, lang) },
      { label: c.fields.occupants, value: numberText(app.occupants) },
      { label: c.fields.pets, value: cleanDisplayValue(app.hasPets || reportText(lang, "documentStatus.no_pets"), lang) },
      { label: c.reportTypeLabel, value: c.fullTitle },
      { label: c.confidence, value: confidence },
    ],
    executiveSummary: [
      { label: c.applicant, value: clean(app.applicantName) },
      { label: c.listingId, value: listingId },
      { label: c.documentCount, value: String(supportSummary.count || 0) },
      { label: c.verificationStatus, value: supportStatus },
      { label: c.confidence, value: confidence },
      { label: c.recommendedDecision, value: recommendedDecision },
    ],
    aiRecommendation: reportText(lang, `recommendationKeys.${evaluation.recommendedNextStepKey}`),
    recommendationTone: recommendationTone(evaluation.rankingKey),
    notice: c.auditNotice,
    continuousFlow: true,
    sections,
  });
  if (autoOpen) openApplicantReportWindow(html);
  const saveResult = saveToDrive ? await saveReportToDrive({ listingId, fileName, html, reportType: "Full Applicant Audit Report" }) : null;
  return {
    title: c.fullTitle,
    reportType: "Full Applicant Audit Report",
    generatedAt: new Date().toISOString(),
    fileName,
    html,
    saveResult,
  };
}

export async function buildFullApplicantAuditDemoReport(lang = "en") {
  const safeLang = lang === "zh" ? "zh" : "en";
  return downloadFullApplicantAuditReport({
    lang: safeLang,
    saveToDrive: false,
    listing: {
      id: "DEMO-LST-001",
      address: "123 Bowen Road",
      city: "Nanaimo",
      rent: "2800",
    },
    applicant: {
      recordId: "DEMO-APP-001",
      listingId: "DEMO-LST-001",
      applicantName: safeLang === "zh" ? "申请人 A" : "Applicant A",
      moveInDate: "2026-08-01",
      occupants: "3",
      hasPets: safeLang === "zh" ? "否" : "No",
      leaseTerm: safeLang === "zh" ? "一年" : "1 Year",
      employmentStatus: safeLang === "zh" ? "全职" : "Full-time",
      employer: safeLang === "zh" ? "本地雇主" : "Local employer",
      monthlyIncome: "$8,600 monthly employment income",
      jointIncome: "$2,200 monthly part-time income",
      creditHistory: safeLang === "zh" ? "优秀" : "Excellent",
      evictionHistory: safeLang === "zh" ? "无" : "None",
      hasTenantInsurance: safeLang === "zh" ? "入住前购买" : "Will obtain before move-in",
      depositFundsAvailable: "Yes",
      supportDocumentFolderUrl: "demo",
      documentUploadStatus: safeLang === "zh" ? "文件已上传" : "Documents uploaded",
      proofOfIncome: safeLang === "zh" ? "工资单和银行流水" : "Pay stubs and bank statements",
      landlordReference: safeLang === "zh" ? "已提供推荐人" : "Reference provided",
      parkingRequest: safeLang === "zh" ? "1 辆车" : "1 vehicle",
    },
    supportFiles: [
      { type: safeLang === "zh" ? "收入文件" : "Income Document", name: "pay-stub-demo.pdf", modifiedAt: new Date().toISOString() },
      { type: safeLang === "zh" ? "身份文件" : "ID Document", name: "id-demo.pdf", modifiedAt: new Date().toISOString() },
      { type: safeLang === "zh" ? "银行流水" : "Bank Statement", name: "bank-statement-demo.pdf", modifiedAt: new Date().toISOString() },
    ],
    documentAnalysis: {
      extractedSummary: {
        income: { confidence: safeLang === "zh" ? "中高" : "Medium-high", notes: [safeLang === "zh" ? "收入文件与申请表基本一致。" : "Income documents generally align with the application."] },
        identity: { notes: [safeLang === "zh" ? "姓名需要最终人工核对。" : "Name match requires final manual review."] },
        bank: { notes: [safeLang === "zh" ? "银行流水需人工确认稳定入账。" : "Bank statements require manual review for stable deposits."] },
        credit: { notes: [safeLang === "zh" ? "信用信息需按统一流程核实。" : "Credit information should be verified using the standard process."] },
        reference: { notes: [safeLang === "zh" ? "推荐人信息需完成电话或书面核实。" : "Reference information requires phone or written verification."] },
        recommendedDecision: safeLang === "zh" ? "良好备选，完成最终核实后可进入下一步。" : "Good backup pending final verification.",
        inconsistencies: [],
      },
      files: [],
      limitations: [],
    },
  });
}
