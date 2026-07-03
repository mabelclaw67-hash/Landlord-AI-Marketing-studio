import { saveApplicantReportPdf } from "./storage.js";
import { matchSupportDocumentsForApplicant } from "./applicantSupportDocuments.js";

const COPY = {
  en: {
    preparedBy: "Prepared by",
    company: "VanIsland Property Management",
    initialTitle: "Applicant Initial Screening Summary",
    fullTitle: "Full Applicant Audit Report",
    listingId: "Listing ID",
    propertyAddress: "Property address",
    generatedDate: "Generated date",
    applicationsReceived: "Number of applications received",
    rankingSummary: "Applicant ranking summary",
    comparisonTable: "Applicant comparison table",
    noApplications: "No applications found for this listing.",
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
      parking: "Vehicles / parking needs",
      credit: "Credit history stated",
      eviction: "Eviction / tenancy breach stated",
      insurance: "Tenant insurance status",
      deposit: "Deposit availability",
      supportStatus: "Supporting document status",
    },
    rankings: {
      strong: "Strong candidate",
      backup: "Good backup",
      verify: "Requires additional verification",
      lower: "Lower priority due to weaker verifiable information",
    },
  },
  zh: {
    preparedBy: "出具方",
    company: "VanIsland Property Management",
    initialTitle: "申请人初步筛选汇总",
    fullTitle: "申请人完整审核报告",
    listingId: "房源编号",
    propertyAddress: "物业地址",
    generatedDate: "生成日期",
    applicationsReceived: "收到申请数量",
    rankingSummary: "申请人初步排序摘要",
    comparisonTable: "申请人对比表",
    noApplications: "该房源暂无申请记录。",
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
      parking: "车辆 / 停车需求",
      credit: "自述信用情况",
      eviction: "自述驱逐 / 违约记录",
      insurance: "租客保险状态",
      deposit: "押金准备情况",
      supportStatus: "支持文件状态",
    },
    rankings: {
      strong: "强候选人",
      backup: "良好备选",
      verify: "需要进一步核实",
      lower: "因可核实信息较弱，优先级较低",
    },
  },
};

function getCopy(lang = "en") {
  return lang === "zh" ? COPY.zh : COPY.en;
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
    notes.push(lang === "zh"
      ? `Business gross / revenue ${formatCurrency(info.businessGross)} 未直接计入核算收入，需核实可支配月收入。`
      : `Business gross / revenue ${formatCurrency(info.businessGross)} is not counted as scoring income until disposable monthly income is verified.`);
  }
  if (info.otherIncome) {
    notes.push(lang === "zh"
      ? `Support / benefit income ${formatCurrency(info.otherIncome)} 可显示为申报收入，但需文件核实稳定性。`
      : `Support / benefit income ${formatCurrency(info.otherIncome)} is shown as declared income but requires verification for stability.`);
  }
  if (!info.scoringAmount && info.display !== "-") {
    notes.push(lang === "zh" ? "收入已填写，但无法保守解析为月收入。" : "Income is stated but cannot be conservatively parsed as monthly income.");
  }
  return notes.length ? notes.join(" ") : (lang === "zh" ? "按保守月收入进行初筛；最终需以支持文件核实。" : "Initial screening uses conservative monthly income; final review requires supporting documents.");
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

  return {
    score,
    ranking: c.rankings[rankingKey],
    rankingKey,
    incomeRatio: ratio,
    declaredIncomeDisplay: [applicantIncome.display, jointIncome.display !== "-" ? jointIncome.display : ""].filter(Boolean).join(" + ") || "-",
    scoringIncome: income,
    incomeVerificationNote: [incomeVerificationNote(applicantIncome, lang), jointIncome.display !== "-" ? incomeVerificationNote(jointIncome, lang) : ""].filter(Boolean).join(" "),
    strengths: strengths.length ? strengths : [lang === "zh" ? "申请表包含基础审核信息。" : "Application contains basic intake information for review."],
    verificationNeeded: verification.length ? verification : [lang === "zh" ? "仍需完成身份、收入、推荐人和文件标准核实。" : "Standard identity, income, reference, and document verification still required."],
    neutralRiskNotes: notes,
    recommendedNextStep: rankingKey === "strong"
      ? (lang === "zh" ? "进入文件核实、推荐人核实和房东最终审核。" : "Proceed with document verification, references, and landlord review.")
      : rankingKey === "backup"
        ? (lang === "zh" ? "作为备选，同时完成收入、推荐人和文件核实。" : "Keep as backup while completing income, reference, and document checks.")
        : (lang === "zh" ? "先要求补充缺失信息和文件，再决定是否进入下一步。" : "Request missing information and documents before moving further."),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderRows(rows) {
  return rows.map(([label, value]) => `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td>${escapeHtml(value)}</td>
    </tr>
  `).join("");
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
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

function buildReportHtml({ title, fileName, body, lang = "en" }) {
  const c = getCopy(lang);
  return `<!doctype html>
<html lang="${lang === "zh" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(fileName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      color: #26342d;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      line-height: 1.55;
      background: #fff;
    }
    .cover { border-bottom: 2px solid #d9e3d9; margin-bottom: 18px; padding-bottom: 16px; }
    .brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .mark { width: 44px; height: 44px; border-radius: 10px; background: #2f5f46; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; }
    h1 { margin: 0 0 6px; color: #2f5f46; font-size: 25px; }
    h2 { margin: 22px 0 9px; color: #3e5b4b; font-size: 16px; }
    h3 { margin: 14px 0 7px; font-size: 14px; color: #26342d; }
    p, li, td, th { font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; }
    th, td { border: 1px solid #dfe8df; padding: 7px 8px; vertical-align: top; text-align: left; }
    th { width: 26%; background: #f5f8f5; color: #52645a; }
    .comparison th { width: auto; white-space: nowrap; }
    .muted { color: #66756c; font-size: 11px; }
    .notice { border: 1px solid #e8d4a7; background: #fff9ea; padding: 10px 12px; border-radius: 8px; margin: 12px 0; }
    .applicant { break-inside: avoid; border-top: 1px solid #dfe8df; padding-top: 10px; }
    @media print {
      body { padding: 18px; }
      @page { margin: 0.55in; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="brand">
      <div class="mark">VIPM</div>
      <div style="text-align:right">
        <strong>${escapeHtml(c.preparedBy)}</strong><br />
        <span class="muted">${escapeHtml(c.company)}</span>
      </div>
    </div>
    <h1>${escapeHtml(title)}</h1>
    <p class="muted">${escapeHtml(fileName)}</p>
  </div>
  ${body}
  <script>
    window.onload = function() {
      try {
        document.title = ${JSON.stringify(fileName)};
        window.history.replaceState(null, "", ${JSON.stringify(`/${encodeURIComponent(fileName)}`)});
      } catch (error) {}
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;
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

function applicantSummaryRows(app, lang = "en") {
  const c = getCopy(lang);
  return [
    [c.fields.applicantName, clean(app.applicantName)],
    [c.fields.jointName, clean(app.jointName)],
    [c.fields.phone, clean(app.phone)],
    [c.fields.email, clean(app.email)],
    [c.fields.currentAddress, clean(app.currentAddress)],
    [c.fields.moveInDate, dateText(app.moveInDate, lang)],
    [c.fields.leaseTerm, clean(app.leaseTerm)],
    [c.fields.currentRent, money(app.currentMonthlyRent || app.currentRent)],
    [c.fields.residencePeriod, clean(app.currentResidencePeriod || app.residencePeriod)],
    [c.fields.employmentStatus, clean(app.employmentStatus)],
    [c.fields.employer, clean(app.employer || app.incomeSource)],
    [c.fields.monthlyIncome, money(app.monthlyIncome)],
    [c.fields.jointIncome, money(app.jointIncome)],
    [c.fields.occupants, numberText(app.occupants)],
    [c.fields.adultsMinors, lang === "zh" ? `${numberText(app.adults)} 成人 / ${numberText(app.minors)} 未成年人` : `${numberText(app.adults)} adults / ${numberText(app.minors)} minors`],
    [c.fields.pets, isYes(app.hasPets) ? clean(app.petDetails) : clean(app.hasPets || (lang === "zh" ? "未申报宠物" : "No pets stated"))],
    [c.fields.parking, clean(app.parkingRequest)],
    [c.fields.credit, clean(app.creditHistory)],
    [c.fields.eviction, clean(app.evictionHistory)],
    [c.fields.insurance, clean(app.hasTenantInsurance)],
    [c.fields.deposit, clean(app.depositFundsAvailable)],
    [c.fields.supportStatus, clean(app.documentUploadStatus || (hasDocumentSupport(app) ? (lang === "zh" ? "文件已链接" : "Documents linked") : (lang === "zh" ? "未确认" : "Not confirmed")))],
  ];
}

function safeFilePart(value, fallback = "report") {
  return String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|#%{}~&]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 80);
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

  const comparisonRows = evaluated.map(({ app, evaluation }, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(clean(app.applicantName))}</td>
      <td>${escapeHtml(evaluation.ranking)}</td>
      <td>${escapeHtml(dateText(app.moveInDate, lang))}</td>
      <td>${escapeHtml(clean(app.leaseTerm))}</td>
      <td>${escapeHtml(evaluation.declaredIncomeDisplay)}</td>
      <td>${escapeHtml(formatCurrency(evaluation.scoringIncome) || "-")}</td>
      <td>${escapeHtml(evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-")}</td>
      <td>${escapeHtml(clean(app.documentUploadStatus || (hasDocumentSupport(app) ? (lang === "zh" ? "文件已链接" : "Documents linked") : (lang === "zh" ? "未确认" : "Not confirmed"))))}</td>
      <td>${escapeHtml(evaluation.recommendedNextStep)}</td>
    </tr>
  `).join("");

  const applicantBlocks = evaluated.map(({ app, evaluation }, index) => `
    <section class="applicant">
      <h2>${index + 1}. ${escapeHtml(clean(app.applicantName))} - ${escapeHtml(evaluation.ranking)}</h2>
      <table>${renderRows(applicantSummaryRows(app, lang))}</table>
      <table>${renderRows([
        [c.declaredIncome, evaluation.declaredIncomeDisplay],
        [c.scoringIncome, formatCurrency(evaluation.scoringIncome) || "-"],
        [c.rentToIncome, evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-"],
        [c.incomeVerificationNote, evaluation.incomeVerificationNote],
      ])}</table>
      <h3>${escapeHtml(c.keyStrengths)}</h3>
      ${renderList(evaluation.strengths)}
      <h3>${escapeHtml(c.verificationNeeded)}</h3>
      ${renderList(evaluation.verificationNeeded)}
      <h3>${escapeHtml(c.neutralRiskNotes)}</h3>
      ${renderList(evaluation.neutralRiskNotes)}
      <h3>${escapeHtml(c.recommendedNextStep)}</h3>
      <p>${escapeHtml(evaluation.recommendedNextStep)}</p>
    </section>
  `).join("");

  const html = buildReportHtml({
    title: c.initialTitle,
    fileName,
    lang,
    body: `
      <table>
        ${renderRows([
          [c.listingId, listingId],
          [c.propertyAddress, address],
          [c.generatedDate, generatedDate],
          [c.preparedBy, c.company],
          [c.applicationsReceived, String(apps.length)],
        ])}
      </table>
      <div class="notice">${escapeHtml(c.initialNotice)}</div>
      <h2>${escapeHtml(c.rankingSummary)}</h2>
      ${renderList(evaluated.map(({ app, evaluation }, index) => `${index + 1}. ${clean(app.applicantName)} - ${evaluation.ranking}`))}
      <h2>${escapeHtml(c.comparisonTable)}</h2>
      <table class="comparison">
        <thead>
          <tr>
            <th>${escapeHtml(c.rank)}</th>
            <th>${escapeHtml(c.applicant)}</th>
            <th>${escapeHtml(c.initialCategory)}</th>
            <th>${escapeHtml(c.moveIn)}</th>
            <th>${escapeHtml(c.leaseTerm)}</th>
            <th>${escapeHtml(c.incomeStated)}</th>
            <th>${escapeHtml(c.scoringIncome)}</th>
            <th>${escapeHtml(c.rentToIncome)}</th>
            <th>${escapeHtml(c.documents)}</th>
            <th>${escapeHtml(c.recommendedNextStep)}</th>
          </tr>
        </thead>
        <tbody>${comparisonRows || `<tr><td colspan="10">${escapeHtml(c.noApplications)}</td></tr>`}</tbody>
      </table>
      ${applicantBlocks}
    `,
  });
  if (autoOpen) openApplicantReportWindow(html);
  const saveResult = await saveReportToDrive({ listingId, fileName, html, reportType: "Initial Screening Summary" });
  return {
    title: c.initialTitle,
    reportType: "Initial Screening Summary",
    generatedAt: new Date().toISOString(),
    fileName,
    html,
    saveResult,
  };
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

export async function downloadFullApplicantAuditReport({ applicant, listing, lang = "en", supportFiles = [], documentAnalysis = null, autoOpen = false }) {
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
    ? (lang === "zh" ? "支持文件已提供或已匹配" : "Supporting documents available or matched")
    : (lang === "zh" ? "支持文件尚未确认" : "Supporting documents not confirmed");
  const supportFileLines = supportSummary.files.length
    ? supportSummary.files.map((file) => `${file.type}: ${file.name}${file.modifiedAt ? ` (${dateText(file.modifiedAt, lang)})` : ""}`)
    : [lang === "zh" ? "未在该房源 Supporting Documents 文件夹中匹配到此申请人的支持文件，需人工核对。" : "No matching supporting document files were found in this listing's Supporting Documents folder. Manual verification required."];

  const html = buildReportHtml({
    title: c.fullTitle,
    fileName,
    lang,
    body: `
      <table>
        ${renderRows([
          [c.listingId, listingId],
          [c.propertyAddress, [listing?.address, listing?.city].filter(Boolean).join(", ") || "-"],
          [c.applicant, clean(app.applicantName)],
          [c.generatedDate, generatedDate],
          [c.preparedBy, c.company],
        ])}
      </table>
      <div class="notice">${escapeHtml(c.auditNotice)}</div>
      <h2>${escapeHtml(c.applicationData)}</h2>
      <table>${renderRows(applicantSummaryRows(app, lang))}</table>
      <h2>${escapeHtml(c.supportChecklist)}</h2>
      ${renderList([
        supportStatus,
        lang === "zh" ? `匹配文件数量：${supportSummary.count}` : `Matched file count: ${supportSummary.count}`,
        lang === "zh" ? `文件类型：${supportSummary.types.join(", ") || "-"}` : `File types: ${supportSummary.types.join(", ") || "-"}`,
        lang === "zh" ? `最后上传 / 修改：${supportSummary.latestModifiedAt ? dateText(supportSummary.latestModifiedAt, lang) : "-"}` : `Last uploaded / modified: ${supportSummary.latestModifiedAt ? dateText(supportSummary.latestModifiedAt, lang) : "-"}`,
        lang === "zh" ? `收入证明自述：${clean(app.proofOfIncome)}` : `Proof of income stated: ${clean(app.proofOfIncome)}`,
        lang === "zh" ? `共同申请人收入证明自述：${clean(app.jointProofOfIncome)}` : `Joint proof of income stated: ${clean(app.jointProofOfIncome)}`,
        lang === "zh" ? "系统会尝试读取可文本化文件；无法自动读取的文件必须人工核对。" : "The system attempts text extraction for readable files. Any document that cannot be automatically verified requires manual verification.",
      ])}
      <h2>${lang === "zh" ? "支持文件列表" : "Supporting document file list"}</h2>
      ${renderList(supportFileLines)}
      <h2>${lang === "zh" ? "文件读取与结构化摘要" : "Extracted document summary"}</h2>
      ${renderList(extractedDocumentSummaryLines(documentAnalysis, lang))}
      <h2>${escapeHtml(c.incomeReview)}</h2>
      ${renderList([
        lang === "zh" ? `申请人月收入自述：${money(app.monthlyIncome)}` : `Applicant monthly income stated: ${money(app.monthlyIncome)}`,
        lang === "zh" ? `共同申请人收入自述：${money(app.jointIncome)}` : `Joint applicant income stated: ${money(app.jointIncome)}`,
        lang === "zh" ? `文件估算月收入：${extractedSummary?.income?.estimatedMonthlyIncome ? formatCurrency(extractedSummary.income.estimatedMonthlyIncome) : "-"}` : `Document-estimated monthly income: ${extractedSummary?.income?.estimatedMonthlyIncome ? formatCurrency(extractedSummary.income.estimatedMonthlyIncome) : "-"}`,
        lang === "zh" ? `收入文件信心：${clean(extractedSummary?.income?.confidence)}` : `Income document confidence: ${clean(extractedSummary?.income?.confidence)}`,
        ...listFromAnalysis(extractedSummary?.income, "", lang),
        lang === "zh" ? `保守核算收入：${formatCurrency(evaluation.scoringIncome) || "-"}` : `Conservative scoring income: ${formatCurrency(evaluation.scoringIncome) || "-"}`,
        lang === "zh" ? `租金收入比：${evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-"}` : `Rent-to-income ratio: ${evaluation.incomeRatio ? `${evaluation.incomeRatio.toFixed(1)}x` : "-"}`,
        lang === "zh" ? `收入核实备注：${evaluation.incomeVerificationNote}` : `Income verification note: ${evaluation.incomeVerificationNote}`,
        lang === "zh" ? "批准前应将收入文件与申请表进行核对。" : "Verify income documents against the application before approval.",
      ])}
      <h2>${escapeHtml(c.employmentNotes)}</h2>
      ${renderList([
        lang === "zh" ? `工作状态：${clean(app.employmentStatus)}` : `Employment status: ${clean(app.employmentStatus)}`,
        lang === "zh" ? `雇主 / 收入来源：${clean(app.employer || app.incomeSource)}` : `Employer / income source: ${clean(app.employer || app.incomeSource)}`,
        lang === "zh" ? `共同申请人工作信息：${clean(app.jointEmployment)}` : `Joint employment: ${clean(app.jointEmployment)}`,
        ...listFromAnalysis(extractedSummary?.employment, "", lang),
        lang === "zh" ? "应通过支持文件或合适方式核实现有工作 / 收入来源。" : "Confirm current employment or income source using supporting documents or direct verification where appropriate.",
      ])}
      <h2>${lang === "zh" ? "ID / 身份一致性检查" : "ID / identity consistency check"}</h2>
      ${renderList(listFromAnalysis(extractedSummary?.identity, "", lang))}
      <h2>${escapeHtml(c.landlordReferenceNotes)}</h2>
      ${renderList([
        lang === "zh" ? `申请人推荐人：${clean(app.landlordReference)}` : `Applicant reference: ${clean(app.landlordReference)}`,
        lang === "zh" ? `共同申请人推荐人：${clean(app.jointLandlordReference)}` : `Joint applicant reference: ${clean(app.jointLandlordReference)}`,
        ...listFromAnalysis(extractedSummary?.reference, "", lang),
        lang === "zh" ? "最终批准前应核实推荐人信息。" : "Reference details should be verified before final approval.",
      ])}
      <h2>${escapeHtml(c.creditNotes)}</h2>
      ${renderList([
        lang === "zh" ? `自述信用情况：${clean(app.creditHistory)}` : `Credit history stated: ${clean(app.creditHistory)}`,
        lang === "zh" ? `共同申请人自述信用情况：${clean(app.jointCreditInfo)}` : `Joint credit stated: ${clean(app.jointCreditInfo)}`,
        lang === "zh" ? `自述驱逐 / 违约记录：${clean(app.evictionHistory)}` : `Eviction / tenancy breach stated: ${clean(app.evictionHistory)}`,
        ...listFromAnalysis(extractedSummary?.credit, "", lang),
        lang === "zh" ? "应使用中性核实语言，并对所有申请人采用一致流程。" : "Use neutral verification language and apply the same process to all applicants.",
      ])}
      <h2>${lang === "zh" ? "银行流水检查" : "Bank statement check"}</h2>
      ${renderList(listFromAnalysis(extractedSummary?.bank, "", lang))}
      <h2>${lang === "zh" ? "宠物 / 停车 / 物业适配备注" : "Pet / parking / property suitability notes"}</h2>
      ${renderList([
        lang === "zh" ? `宠物：${clean(app.pets)}` : `Pets: ${clean(app.pets)}`,
        lang === "zh" ? `车辆 / 停车：${clean(app.parkingRequest)}` : `Vehicles / parking: ${clean(app.parkingRequest)}`,
        lang === "zh" ? "宠物仅从物业适配、押金、噪音、维护和屋规角度中性记录。" : "Pets are noted only for property suitability, deposit, noise, care, and house rule considerations.",
      ])}
      <h2>${escapeHtml(c.consistencyCheck)}</h2>
      ${renderList([
        ...((extractedSummary?.inconsistencies || []).map((item) => String(item || "").replace(/^Compare /, "Potential inconsistency: compare "))),
        ...(lang === "zh"
        ? [
            "对照申请表和支持文件，核对姓名、住址历史、收入、工作、入住日期、租期、入住人数、宠物、车辆和保险信息。",
            "任何不一致应记录为需要核实事项，而不是最终决定理由。",
          ]
        : [
            "Compare name, address history, income, employment, move-in date, lease term, occupants, pets, vehicles, and insurance details against submitted documents.",
            "Record any mismatch as a verification item, not as a final decision reason.",
          ]),
      ])}
      <h2>${escapeHtml(c.riskItems)}</h2>
      ${renderList([
        ...evaluation.neutralRiskNotes,
        ...((documentAnalysis?.limitations || []).map((item) => lang === "zh" ? `文件读取限制：${item}` : `Document extraction limitation: ${item}`)),
      ])}
      <h2>${escapeHtml(c.finalRecommendation)}</h2>
      <p>${escapeHtml(extractedSummary?.recommendedDecision || evaluation.ranking)}</p>
      <h2>${escapeHtml(c.conditionsBeforeApproval)}</h2>
      ${renderList([
        ...evaluation.verificationNeeded,
        lang === "zh" ? "房东最终审核确认。" : "Landlord final review and confirmation.",
        lang === "zh" ? "签署租约，并按适用规则处理押金。" : "Signed tenancy agreement and required deposit handling under applicable rules.",
      ])}
    `,
  });
  if (autoOpen) openApplicantReportWindow(html);
  const saveResult = await saveReportToDrive({ listingId, fileName, html, reportType: "Full Applicant Audit Report" });
  return {
    title: c.fullTitle,
    reportType: "Full Applicant Audit Report",
    generatedAt: new Date().toISOString(),
    fileName,
    html,
    saveResult,
  };
}
