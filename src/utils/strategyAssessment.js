import { apiPost, isApiConnected } from "./api";
import { computeLocalRentJudgment, getRegionNarrative } from "./nanaimoRentalPricing";

export const STRATEGY_ASSESSMENT_SPREADSHEET_ID = "1F3rPmEMsOoTFWYo3CPD76BS4RuRbSPTCB47g5YTHopE";

export const STRATEGY_ASSESSMENT_DISCLAIMER =
  "This report is generated from the available property details, community knowledge base, and local property-management experience for preliminary decision support.";

export const STRATEGY_ASSESSMENT_DISCLAIMER_ZH =
  "本报告基于现有物业资料、社区知识库及本地物业管理经验生成，供初步决策参考。";

const KNOWLEDGE_CENTER_GUIDE = {
  en: "Please review the latest guide in the Landlord Knowledge Center and confirm through professional review before making a final decision.",
  zh: "请查看房东知识中心最新指南，并经专业审核后再作最终决定。",
};

const OPTION_LABELS_ZH = {
  Yes: "是",
  No: "否",
  Unsure: "不确定",
  "Not sure": "不确定",
  "Almost / soon": "快满 / 即将满",
  "Rooms only": "只出租房间",
  "Whole home": "整套出租",
  "Operate myself": "自己运营",
  "Third-party operator": "第三方运营",
  Separated: "已分开",
  Shared: "共用",
  "Detached House": "独立屋", Condo: "公寓", Townhouse: "联排屋", Duplex: "双拼屋",
  "Manufactured Home": "活动房屋", Acreage: "大面积土地住宅", Other: "其他",
  "Entire Detached House": "整栋独立屋", "Main / Upper Unit": "主层 / 楼上单元",
  "Basement / Secondary Suite": "地下套间 / 第二套房", "Entire Condo": "整套公寓",
  "Entire Townhouse": "整套联排屋", "Whole House with Main + Suite": "楼上加楼下整体出租",
  "One Duplex Unit": "双拼屋其中一个单元", "Room Rental": "单个房间出租",
  "Fully Private": "完全独享", "No Outdoor Space": "无户外空间", Partial: "部分独享",
  "Fully Fenced": "完全有围栏", "Partially Fenced": "部分有围栏", "Not Fenced": "没有围栏",
  "Not Applicable": "不适用", "Private In-unit": "套内独立洗衣", "No Laundry": "无洗衣设施",
  "Separate Meter": "独立电表", "Included in Rent": "包含在租金内",
  "Shared by Percentage": "按比例分摊", "Shared by Fixed Amount": "按固定金额分摊",
  "Tenant Pays Own Account": "租客自行开户缴费",
  "Book a professional strategy review": "预约专业策略审核",
  "Request AI Marketing / Listing Service": "申请 AI 营销 / 房源发布服务",
  "Request Full Property Management": "申请完整物业管理服务",
  "Request full rental market assessment": "申请完整租赁市场评估",
  "Prepare listing marketing package": "准备房源营销套件",
  "Discuss property management": "咨询物业管理",
  "Not ready yet - keep my intake on file": "暂未准备好，先保留资料",
  "Professional legal/compliance review before listing": "挂牌前进行专业法规与合规审核",
  "STR feasibility review": "短租可行性审核",
  "Fast rental listing preparation": "快速准备出租挂牌",
  "Full rental strategy and marketing review": "完整出租策略与营销审核",
  "Professional strategy review": "专业策略审核",
};

const FOLLOW_UP_QUESTIONS_ZH = {
  strPrincipalResidence: "这是您的主要住所吗？",
  strLiveOnSite: "短租期间您会住在现场吗？",
  strMunicipalityDetail: "物业属于哪个城市 / 市政区域？",
  strRoomsOrWholeHome: "您计划只出租房间，还是整套出租？",
  strOperatorPlan: "您计划自己运营，还是使用第三方运营？",
  suiteSeparateEntrance: "套房是否有独立入口？",
  suiteOwnKitchen: "套房是否有自己的厨房？",
  suiteSeparateLaundry: "套房是否有独立洗衣？",
  suiteSeparateHydro: "是否有独立电表？",
  suiteUtilitiesSeparated: "水电等费用目前是分开还是共用？",
  conversionBasement: "是否有地下室或低层空间可改造？",
  conversionSeparateEntrance: "是否已有或可能增加独立入口？",
  conversionAddKitchen: "您是否考虑增加厨房？",
  conversionSplitUnits: "您是否考虑把房子分成两个出租单元？",
  backyardAddFence: "您是否考虑增加后院围栏？",
  backyardPrivateArea: "租客是否有私人户外区域？",
  backyardShared: "院子是否与另一个单元共用？",
  petYardFullyFenced: "院子是否完全有围栏？",
  petDamageConcerns: "是否担心地板或损坏问题？",
  petRestrictions: "您是否希望设置宠物限制？",
  goalWaitForTenant: "您是否愿意多等一段时间，找到更合适的租客？",
  goalMakeImprovements: "出租前您是否愿意做一些改善？",
  goalConsiderSplitRental: "如果合法且实际可行，您是否考虑分租？",
  goalBelowStretchRent: "您是否愿意把租金定得略低于最高预期，以便更快出租？",
  goalFlexiblePets: "您对宠物是否可以灵活一些？",
  goalQuickOpenHouse: "您是否愿意尽快安排开放看房？",
  viewLivingRoom: "客厅能看到海景吗？",
  viewBedroomsDeck: "卧室或露台能看到海景吗？",
  viewMainMarketing: "是否应该把海景作为主要营销亮点？",
};

function displayOption(option, lang) {
  return lang === "zh" ? (OPTION_LABELS_ZH[option] || option) : option;
}

export function displayStrategyValue(value, lang = "en") {
  return displayOption(String(value || ""), normalizeLang(lang));
}

function formatCurrency(value, lang) {
  const text = String(value || "").trim();
  if (!text) return lang === "zh" ? "待确认" : "to be confirmed";
  const numeric = Number(text.replace(/[$,\s]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) {
    return `$${Math.round(numeric).toLocaleString("en-US")}`;
  }
  return text.includes("$") ? text : `$${text}`;
}

function parseMoneyAmount(value) {
  const numeric = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function cleanSentence(text) {
  return String(text || "")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLang(value) {
  return value === "zh" ? "zh" : "en";
}

function formatAssessmentLocation(form, lang = "en") {
  const street = String(form.propertyAddress || "").trim();
  const cityProvincePostal = [form.city, form.province, form.postalCode].filter(Boolean).join(" ");
  const location = [street, cityProvincePostal].filter(Boolean).join(", ");
  return location || (lang === "zh" ? "本地市场" : "the local market");
}


function getConfidenceLabel(score, lang = "en") {
  if (score >= 88) return lang === "zh" ? "★★★★★ 高信心" : "★★★★★ High Confidence";
  if (score >= 78) return lang === "zh" ? "★★★★ 中高信心" : "★★★★ Medium-High Confidence";
  if (score >= 68) return lang === "zh" ? "★★★★ 中等信心" : "★★★★ Medium Confidence";
  return lang === "zh" ? "★★★ 初步判断" : "★★★ Preliminary";
}

export function createAssessmentId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    "PSA",
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-");
}

export function createEmptyStrategyAssessment(overrides = {}) {
  return {
    assessmentId: "",
    status: "New",
    ownerName: "",
    email: "",
    phone: "",
    preferredContact: "",
    propertyAddress: "",
    city: "Nanaimo",
    province: "BC",
    postalCode: "",
    communityId: "",
    communityName: "",
    communityArea: "",
    propertyType: "",
    propertyBuildingType: "",
    rentalUnitType: "",
    outdoorSpaceType: "",
    fenceStatus: "",
    laundryType: "",
    utilitiesArrangement: "",
    sharedAreas: "",
    bedrooms: "",
    bathrooms: "",
    garageSpaces: "",
    drivewayParking: "",
    furnished: "",
    oceanView: "",
    fencedBackyard: "",
    privateYard: "",
    petFriendly: "",
    existingSuite: "",
    separateEntrance: "",
    separateKitchen: "",
    separateLaundry: "",
    separateMeter: "",
    utilitiesShared: "",
    canAddKitchen: "",
    suiteLegalStatus: "",
    suitePermitStatus: "",
    suiteHydroMeter: "",
    suiteYardPrivacy: "",
    suiteSharedAreas: "",
    suiteRentImpactNotes: "",
    suiteBedrooms: "",
    suiteBathrooms: "",
    ownerGoal: "",
    targetRent: "",
    availableDate: "",
    nearbyCommercialCentre: "",
    locationNotes: "",
    locationRentPremium: "",
    rentAdjustmentFactors: "",
    airbnbInterest: "",
    principalResidence: "",
    ownerLivesOnSite: "",
    strMunicipality: "",
    thirdPartyOperatorInterest: "",
    knownIssues: "",
    timelineUrgency: "",
    nextStep: "",
    consentToContact: false,
    privacyConsent: false,
    photoFileNames: "",
    followUpAnswers: {},
    legalCompliance: {
      previousTenantOwnerOccupancy: "",
      occupiedAtLeast12Months: "",
    },
    preliminaryAssessment: null,
    ...overrides,
  };
}

export function hasOwnerOccupancyLegalWarning(form) {
  const legal = form.legalCompliance || {};
  return legal.previousTenantOwnerOccupancy === "Yes" &&
    ["No", "Almost / soon", "Not sure"].includes(legal.occupiedAtLeast12Months);
}

export function getLegalRiskFlag(form) {
  const legal = form.legalCompliance || {};
  if (hasOwnerOccupancyLegalWarning(form)) return "Yes";
  if (legal.previousTenantOwnerOccupancy === "Not sure" || legal.occupiedAtLeast12Months === "Not sure") return "Not sure";
  return "No";
}

export function getStrategyFollowUpQuestions(form) {
  const questions = [];
  const add = (group, id, question, type = "choice", options = ["Yes", "No", "Not sure"]) => {
    questions.push({ group, id, question, type, options });
  };

  if (form.airbnbInterest === "Yes") {
    add("Airbnb / STR", "strPrincipalResidence", "Is this your principal residence?");
    add("Airbnb / STR", "strLiveOnSite", "Will you live on site during short-term rentals?");
    add("Airbnb / STR", "strMunicipalityDetail", "Which municipality is the property in?", "text");
    add("Airbnb / STR", "strRoomsOrWholeHome", "Are you planning to rent rooms only or the whole home?", "choice", ["Rooms only", "Whole home", "Not sure"]);
    add("Airbnb / STR", "strOperatorPlan", "Are you planning to operate it yourself or use a third-party operator?", "choice", ["Operate myself", "Third-party operator", "Not sure"]);
  }

  if (!form.rentalUnitType && form.existingSuite === "Yes") {
    add("Existing Suite", "suiteSeparateEntrance", "Does the suite have a separate entrance?");
    add("Existing Suite", "suiteOwnKitchen", "Does the suite have its own kitchen?");
    add("Existing Suite", "suiteSeparateLaundry", "Does the suite have separate laundry?");
    add("Existing Suite", "suiteSeparateHydro", "Does it have a separate hydro meter?");
    add("Existing Suite", "suiteUtilitiesSeparated", "Are utilities currently separated or shared?", "choice", ["Separated", "Shared", "Not sure"]);
  }

  if (!form.rentalUnitType && form.existingSuite === "No") {
    add("Suite Conversion", "conversionBasement", "Is there a basement or lower level that could be converted?");
    add("Suite Conversion", "conversionSeparateEntrance", "Is there a separate entrance or possible separate entrance?");
    add("Suite Conversion", "conversionAddKitchen", "Would you consider adding a kitchen?");
    add("Suite Conversion", "conversionSplitUnits", "Would you consider splitting the home into two rental units?");
  }

  if (!form.fenceStatus && !form.outdoorSpaceType && form.fencedBackyard === "No") {
    add("Backyard", "backyardAddFence", "Would you consider adding a fenced backyard?");
    add("Backyard", "backyardPrivateArea", "Is there a private outdoor area for tenants?");
    add("Backyard", "backyardShared", "Is the yard shared with another unit?");
  }

  if (!form.fenceStatus && form.petFriendly === "Yes") {
    add("Pet Friendly", "petYardFullyFenced", "Is the yard fully fenced?");
    add("Pet Friendly", "petDamageConcerns", "Are there flooring or damage concerns?");
    add("Pet Friendly", "petRestrictions", "Do you want pet restrictions?");
  }

  if (form.ownerGoal === "Maximize rent" || form.ownerGoal === "Maximize monthly rent") {
    add("Owner Goal", "goalWaitForTenant", "Are you willing to wait longer for the right tenant?");
    add("Owner Goal", "goalMakeImprovements", "Are you willing to make improvements before listing?");
    add("Owner Goal", "goalConsiderSplitRental", "Would you consider split rental if legally and practically suitable?");
  }

  if (form.ownerGoal === "Rent ASAP") {
    add("Owner Goal", "goalBelowStretchRent", "Are you willing to price slightly below stretch market rent?");
    add("Owner Goal", "goalFlexiblePets", "Are you flexible on pets?");
    add("Owner Goal", "goalQuickOpenHouse", "Are you willing to hold an open house quickly?");
  }

  if (form.oceanView === "Yes") {
    add("Ocean View", "viewLivingRoom", "Is the ocean view visible from the living room?");
    add("Ocean View", "viewBedroomsDeck", "Is it visible from bedrooms or deck?");
    add("Ocean View", "viewMainMarketing", "Should ocean view be used as the main marketing feature?");
  }

  return questions;
}

export function formatStrategyFollowUpAnswers(form, lang = "en") {
  const safeLang = normalizeLang(lang);
  const answers = form.followUpAnswers || {};
  const lines = getStrategyFollowUpQuestions(form)
    .map((item) => {
      const answer = String(answers[item.id] || "").trim();
      if (!answer) return "";
      const question = safeLang === "zh" ? (FOLLOW_UP_QUESTIONS_ZH[item.id] || item.question) : item.question;
      return `- ${question} ${displayOption(answer, safeLang)}`;
    })
    .filter(Boolean);

  return lines.length ? [safeLang === "zh" ? "专业追问答案：" : "Professional Follow-up Answers:", ...lines].join("\n") : "";
}

export function formatStrategyFollowUpAnswersPlain(form, lang = "en") {
  const text = formatStrategyFollowUpAnswers(form, lang);
  return text
    .replace(/^AI Follow-up Answers:\n?/, "")
    .replace(/^Professional Follow-up Answers:\n?/, "")
    .replace(/^专业追问答案：\n?/, "");
}

export function formatLegalComplianceAnswers(form, lang = "en") {
  const safeLang = normalizeLang(lang);
  const legal = form.legalCompliance || {};
  const lines = [];
  if (legal.previousTenantOwnerOccupancy) {
    lines.push(safeLang === "zh"
      ? `- 前任租客是否因屋主/符合条件家庭成员自住而搬离：${displayOption(legal.previousTenantOwnerOccupancy, safeLang)}`
      : `- Previous tenant moved out for owner/family occupancy: ${legal.previousTenantOwnerOccupancy}`);
  }
  if (legal.previousTenantOwnerOccupancy === "Yes" && legal.occupiedAtLeast12Months) {
    lines.push(safeLang === "zh"
      ? `- 是否已实际自住满 12 个月：${displayOption(legal.occupiedAtLeast12Months, safeLang)}`
      : `- Owner/family occupied for at least 12 months: ${legal.occupiedAtLeast12Months}`);
  }
  if (hasOwnerOccupancyLegalWarning(form)) {
    lines.push(safeLang === "zh"
      ? "- 法规提醒：可能存在屋主自住相关的再出租限制，挂牌前需核查当前 BC 规则。"
      : "- Legal compliance warning: Possible owner-occupancy related re-rental restriction. Current BC rules should be verified before listing.");
  }
  return lines.length ? [safeLang === "zh" ? "法规风险检查：" : "Legal & Compliance Check:", ...lines].join("\n") : "";
}

export function buildOwnerOccupancyNotes(form, lang = "en") {
  const safeLang = normalizeLang(lang);
  const legal = form.legalCompliance || {};
  const notes = [];
  if (legal.previousTenantOwnerOccupancy) {
    notes.push(safeLang === "zh"
      ? `前任租客是否因屋主/符合条件家庭成员自住而搬离：${displayOption(legal.previousTenantOwnerOccupancy, safeLang)}`
      : `Previous tenant moved out for owner/family occupancy: ${legal.previousTenantOwnerOccupancy}`);
  }
  if (legal.previousTenantOwnerOccupancy === "Yes") {
    notes.push(safeLang === "zh"
      ? `是否已实际自住满 12 个月：${displayOption(legal.occupiedAtLeast12Months || "Not sure", safeLang)}`
      : `Occupied at least 12 months: ${legal.occupiedAtLeast12Months || "Not answered"}`);
  }
  if (hasOwnerOccupancyLegalWarning(form)) {
    notes.push(safeLang === "zh"
      ? "提醒：可能存在屋主自住相关的再出租限制，挂牌前需核查当前 BC 租赁规则。"
      : "Warning: Possible owner-occupancy related re-rental restriction. Current BC tenancy rules should be verified before listing.");
  }
  return notes.join("\n");
}

export function buildAiFlags(form) {
  const flags = [];
  if (hasOwnerOccupancyLegalWarning(form)) flags.push("LEGAL_OWNER_OCCUPANCY_RENTAL_RISK");
  if (form.suiteLegalStatus === "Unauthorized no permit") flags.push("UNAUTHORIZED_SUITE_REVIEW");
  if (form.suiteHydroMeter === "Yes") flags.push("SUITE_SEPARATE_HYDRO_METER");
  if (["Shared yard", "No yard"].includes(form.suiteYardPrivacy)) flags.push("SUITE_YARD_PRIVACY_LIMITATION");
  if (form.nearbyCommercialCentre === "Yes") flags.push("LOCATION_COMMERCIAL_CENTRE_PREMIUM");
  if (form.airbnbInterest === "Yes") flags.push("STR_RULES_VERIFY_REQUIRED");
  if (form.existingSuite === "Yes") flags.push("SUITE_SPLIT_RENTAL_REVIEW");
  if (form.existingSuite === "No" && (form.canAddKitchen === "Yes" || form.separateEntrance === "Yes")) flags.push("POSSIBLE_SUITE_CONVERSION_REVIEW");
  if (form.utilitiesShared === "Yes") flags.push("SHARED_UTILITIES_DISCLOSURE");
  if (form.petFriendly === "Yes") flags.push("PET_POLICY_REVIEW");
  return flags.length ? flags.join(", ") : "NO_MAJOR_AI_FLAGS";
}

export function buildAiConfidenceAndFlags(form, lang = "en") {
  const flags = buildAiFlags(form);
  const safeLang = normalizeLang(lang);
  const confidence = calculateAssessmentConfidence(form);
  if (safeLang === "zh") {
    const flagLabels = {
      LEGAL_OWNER_OCCUPANCY_RENTAL_RISK: "业主自住再出租风险",
      UNAUTHORIZED_SUITE_REVIEW: "未授权套间需审核",
      SUITE_SEPARATE_HYDRO_METER: "套间有独立电表",
      SUITE_YARD_PRIVACY_LIMITATION: "套间庭院隐私受限",
      LOCATION_COMMERCIAL_CENTRE_PREMIUM: "邻近商业中心位置加分",
      STR_RULES_VERIFY_REQUIRED: "短租规则需核实",
      SUITE_SPLIT_RENTAL_REVIEW: "套间分租需审核",
      POSSIBLE_SUITE_CONVERSION_REVIEW: "潜在套间改造需审核",
      SHARED_UTILITIES_DISCLOSURE: "共用水电需披露",
      PET_POLICY_REVIEW: "宠物政策需审核",
      NO_MAJOR_AI_FLAGS: "未发现重大标记",
    };
    const localizedFlags = flags.split(", ").map((flag) => flagLabels[flag] || flag).join("、");
    return `AI 评估信心：${confidence.score}%\nAI 标记：${localizedFlags}`;
  }
  return `AI Assessment Confidence: ${confidence.score}%\nAI Flags: ${flags}`;
}

export function buildServicePath(form) {
  if (form.nextStep) return form.nextStep;
  if (hasOwnerOccupancyLegalWarning(form)) return "Professional legal/compliance review before listing";
  if (form.airbnbInterest === "Yes") return "STR feasibility review";
  if (form.ownerGoal === "Rent ASAP") return "Fast rental listing preparation";
  if (form.ownerGoal === "Maximize rent") return "Full rental strategy and marketing review";
  return "Professional strategy review";
}

export function buildKnownIssuesWithFollowUps(form, lang = "en") {
  const knownIssues = String(form.knownIssues || "").trim();
  const followUps = formatStrategyFollowUpAnswers(form, lang);
  const legal = formatLegalComplianceAnswers(form, lang);
  return [knownIssues, followUps, legal].filter(Boolean).join("\n\n");
}

export function generatePreliminaryStrategySummary(form, lang = "en", rentalIntelligence = null) {
  const safeLang = normalizeLang(lang);
  const followUps = form.followUpAnswers || {};
  const legalWarning = hasOwnerOccupancyLegalWarning(form);
  const confidence = calculateAssessmentConfidence(form);
  const normalizedCommunity = normalizeRentalIntelligenceKnowledge(rentalIntelligence);
  // Single source of truth for rent judgment: every rent-related section
  // below reads from this one computed object instead of re-deriving its
  // own number, so the web report, Admin, and PDF cannot disagree.
  const judgment = computeLocalRentJudgment(form, followUps);
  const community = resolveCommunityPresentation(form, normalizedCommunity, judgment);
  const reportJudgment = reportJudgmentForCommunity(judgment, community);
  const summary = {
    propertyClassification: safeLang === "zh"
      ? [`建筑类型：${displayOption(form.propertyBuildingType || form.propertyType, safeLang) || "待确认"}`, `出租单元类型：${displayOption(form.rentalUnitType || form.propertyType, safeLang) || "待确认"}`]
      : [`Building Type: ${form.propertyBuildingType || form.propertyType || "To be confirmed"}`, `Rental Unit Type: ${form.rentalUnitType || form.propertyType || "To be confirmed"}`],
    executiveSummary: buildExecutiveSummary(form, reportJudgment, safeLang),
    propertyPositioning: buildPropertyPositioning(form, reportJudgment, safeLang),
    propertyStrengths: buildPropertyStrengths(form, judgment, safeLang),
    rentalChallenges: buildRentalChallenges(form, judgment, legalWarning, safeLang),
    suggestedRentalStrategy: buildSuggestedStrategy(form, reportJudgment, followUps, safeLang),
    estimatedRentRange: buildRentPositioning(form, reportJudgment, safeLang),
    marketRisks: buildMarketRisks(form, judgment, legalWarning, followUps, safeLang),
    nextSteps: buildNextSteps(form, judgment, safeLang),
    suiteSplitRentalPotential: buildSuiteSplitPotential(form, followUps, safeLang),
    suiteQualityPrivacy: buildSuiteQualityPrivacy(form, safeLang),
    locationRentAdjustment: buildLocationRentAdjustment(form, reportJudgment, community, safeLang),
    communityLocationAnalysis: buildCommunityLocationAnalysis(form, community, reportJudgment, safeLang),
    educationResources: buildEducationResources(community, safeLang),
    medicalPharmacyResources: buildMedicalResources(community, safeLang),
    shoppingConvenience: buildShoppingConvenience(community, safeLang),
    targetTenantProfile: buildTargetTenantProfile(form, reportJudgment, safeLang),
    communityRentPositioningJudgment: buildCommunityRentPositioningJudgment(form, judgment, safeLang),
    communityMarketingAngles: buildCommunityMarketingAngles(form, judgment, community, safeLang),
    communityRisksToVerify: buildCommunityRisksToVerify(form, judgment, safeLang),
    airbnbStrRegulationCheck: buildStrReminder(form, safeLang),
    legalComplianceRisk: buildLegalComplianceRisk(form, safeLang),
    aiConfidenceFlags: buildAiConfidenceAndFlags(form, safeLang),
    aiAssessmentConfidence: buildAiAssessmentConfidence(form, confidence, safeLang),
    servicePath: displayOption(buildServicePath(form), safeLang),
    marketingSuggestions: buildMarketingSuggestions(form, followUps, safeLang),
    ownerGoalAlignment: buildProfessionalPreliminaryRecommendation(form, followUps, safeLang),
    professionalPreliminaryRecommendation: buildProfessionalPreliminaryRecommendation(form, followUps, safeLang),
    recommendedNextStep: buildServiceRecommendation(form, safeLang),
    knowledgeLinks: buildKnowledgeLinks(form, safeLang),
    disclaimer: safeLang === "zh" ? STRATEGY_ASSESSMENT_DISCLAIMER_ZH : STRATEGY_ASSESSMENT_DISCLAIMER,
  };
  const guardWarnings = validateStrategyAssessmentOutput(summary, form, safeLang);
  if (guardWarnings.length) {
    summary.outputGuardWarnings = guardWarnings;
    summary.aiConfidenceFlags = [
      ...asArray(summary.aiConfidenceFlags),
      ...(safeLang === "zh"
        ? guardWarnings.map((warning) => `输出防错提醒：${warning}`)
        : guardWarnings.map((warning) => `Output guard warning: ${warning}`)),
    ];
  }
  return summary;
}

function money(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

// 1. Professional summary (专业结论摘要): 3-5 decisive bullets, no hedging.
function buildExecutiveSummary(form, judgment, lang) {
  const [adjLo, adjHi] = judgment.adjustedRange;
  const hasTarget = judgment.targetRent !== null;
  if (lang === "zh") {
    const lines = [
      `物业类型判断：${judgment.type.zh}，位于 ${judgment.region.zh}。`,
      `本地租金判断：调整后合理区间约 ${money(adjLo)}–${money(adjHi)}/月，建议挂牌价 ${money(judgment.recommendedPrice)}/月。`,
    ];
    lines.push(hasTarget
      ? `业主目标租金 ${money(judgment.targetRent)}/月，判断为「${judgment.verdictLabel.zh}」。`
      : "业主尚未填写目标租金，以上建议价格可直接作为挂牌参考。");
    lines.push(judgment.marketAcceptance.narrowPool
      ? "该价位对应的租客群体偏窄，预计出租周期较长，需要更主动的调价机制。"
      : "该价位对应的租客群体正常，预计能在合理周期内找到合格租客。");
    if (judgment.limitingFactors.length) {
      lines.push(`最主要风险：${judgment.limitingFactors[0].zh}`);
    }
    return lines;
  }
  const lines = [
    `Property type judgment: ${judgment.type.en}, in ${judgment.region.en}.`,
    `Local rent judgment: adjusted range is about ${money(adjLo)}-${money(adjHi)}/month, recommended list price ${money(judgment.recommendedPrice)}/month.`,
  ];
  lines.push(hasTarget
    ? `Owner target rent is ${money(judgment.targetRent)}/month, judged as "${judgment.verdictLabel.en}".`
    : "No target rent was entered, so the recommended price above can be used directly as the listing reference.");
  lines.push(judgment.marketAcceptance.narrowPool
    ? "This price point reaches a narrower tenant pool and vacancy is likely to run longer, so an active price-adjustment plan is needed."
    : "This price point reaches a normal tenant pool and should attract a qualified tenant within a reasonable window.");
  if (judgment.limitingFactors.length) {
    lines.push(`Main risk: ${judgment.limitingFactors[0].en}`);
  }
  return lines;
}

// 2. Property positioning (物业定位).
function neutralTenantPositioning(form, lang) {
  const features = [];
  if (form.separateEntrance === "Yes") features.push(lang === "zh" ? "独立入口" : "a separate entrance");
  if (Number(form.garageSpaces || 0) > 0 || Number(form.drivewayParking || 0) > 0) features.push(lang === "zh" ? "停车条件" : "parking");
  if (form.outdoorSpaceType) features.push(lang === "zh" ? "户外空间安排" : "the outdoor-space arrangement");
  features.push(lang === "zh" ? "便利生活配置" : "practical day-to-day features");
  const oneBedroomSuite = form.rentalUnitType === "Basement / Secondary Suite" && Number(form.bedrooms || 0) <= 1;
  return lang === "zh"
    ? [`适合重视${features.join("、")}的${oneBedroomSuite ? "个人或两人住户" : "住户"}。`, "最终申请人应依据统一、合法的租客筛选标准评估。"]
    : [`Suitable for ${oneBedroomSuite ? "one- or two-person households" : "households"} that value ${features.join(", ")}.`, "All applicants must be assessed using consistent and lawful tenant-screening standards."];
}

function buildPropertyPositioning(form, judgment, lang) {
  if (lang === "zh") {
    return [
      `${judgment.type.zh}，${judgment.region.zh}。`,
      ...neutralTenantPositioning(form, lang),
    ];
  }
  return [
    `${judgment.type.en}, ${judgment.region.en}.`,
    ...neutralTenantPositioning(form, lang),
  ];
}

// 4. Factors supporting the price (支持价格的因素) - only genuine
// price-moving factors, sourced from the pricing engine's scoring, not a
// restatement of every form field.
function buildPropertyStrengths(form, judgment, lang) {
  const items = judgment.supportingFactors.map((f) => (lang === "zh" ? f.zh : f.en));
  if (!items.length) {
    return [lang === "zh"
      ? "根据目前资料，暂未确认明显的加分条件；以下判断以普通装修和正常维护状态为假设。"
      : "No clear price-supporting features are confirmed yet; this judgment assumes ordinary condition and maintenance until confirmed."];
  }
  return items;
}

// 5. Factors limiting the price (限制价格的因素).
function buildRentalChallenges(form, judgment, legalWarning, lang) {
  const items = judgment.limitingFactors.map((f) => (lang === "zh" ? f.zh : f.en));
  if (legalWarning) {
    items.push(lang === "zh"
      ? "已触发屋主自住相关法规风险，正式挂牌前必须先完成专业审核。"
      : "An owner-occupancy compliance risk was triggered; professional review is required before listing.");
  }
  if (form.airbnbInterest === "Yes") {
    items.push(lang === "zh"
      ? "已选择 Airbnb / 短租意向，必须先核查 BC 和所在城市当前规则、主要住所要求和运营限制。"
      : "Airbnb / STR interest is selected, so BC and city rules, principal-residence requirements, and operating limits must be checked first.");
  }
  return items.length ? items : [lang === "zh"
    ? "根据目前资料，暂未发现明显的减分条件；以下判断以普通装修和正常维护状态为假设，实际状况仍需现场确认。"
    : "No clear price-limiting features are identified yet; this judgment assumes ordinary condition and maintenance, pending an on-site confirmation."];
}

// 7. Rental strategy (出租策略): whole vs. split, test duration, when to
// adjust, whether condition improvements are worth it.
function buildSuggestedStrategy(form, judgment, followUps, lang) {
  const hasSuiteBasis = hasSplitRentalBasis(form, followUps);
  const isCombo = !!judgment.comboDetails;
  const plan = buildReportAdjustmentPlan(judgment, lang);
  const isSingleSuite = form.rentalUnitType === "Basement / Secondary Suite";

  if (lang === "zh") {
    const items = [];
    if (isCombo) {
      const combo = judgment.comboDetails;
      items.push(`该物业适合两种路径并行评估：分租（楼上约 ${money(combo.upperRange[0])}–${money(combo.upperRange[1])} + 楼下约 ${money(combo.lowerRange[0])}–${money(combo.lowerRange[1])}，理论总收入约 ${money(judgment.baseRange[0])}–${money(judgment.baseRange[1] + (combo.splitTotalRange[1] - judgment.baseRange[1]))}）或由同一住户整体承租（约 ${money(judgment.adjustedRange[0])}–${money(judgment.adjustedRange[1])}）。`);
      items.push("能够整体使用上下单元并承担总租金的申请住户数量通常较少，出租周期可能更长；分租更容易分别找到租客，但管理复杂度更高，需要提前规划费用分摊和共用区域规则。");
    } else if (form.airbnbInterest === "Yes") {
      items.push("第一策略：先按长租 / 整租路径测试市场，广告只突出已确认卖点。");
      items.push(hasSuiteBasis && !isSingleSuite
        ? "第二策略：可同步评估合法分租可能性，但须逐项确认独立入口、厨房、洗衣、水电、停车和合规。"
        : isSingleSuite
          ? "第二策略：进一步审核该地下套间是否具备独立、合法出租条件，并确认与楼上单元之间的入口、厨房、洗衣、水电、停车、隐私、共用区域及费用分配安排。"
          : "第二策略：额外出租配置目前资料不足，暂不作为营销卖点。");
      items.push("Airbnb / STR 仅作为备选方向，须先完成法规核查，不能在未确认规则前承诺短租收益。");
    } else {
      items.push(hasSuiteBasis && !isSingleSuite
        ? `建议整租为主，分租为可选方案；若整租测试价格 ${money(judgment.recommendedPrice)}/月未能在合理周期内找到租客，可评估合法分租的可行性。`
        : isSingleSuite
          ? `建议按 ${money(judgment.recommendedPrice)}/月测试市场，并进一步审核该地下套间是否具备独立、合法出租条件。`
          : `建议按 ${money(judgment.recommendedPrice)}/月挂牌测试市场反馈，广告聚焦已确认卖点。`);
    }
    items.push(...plan);
    return items;
  }

  const items = [];
  if (isCombo) {
    const combo = judgment.comboDetails;
    items.push(`This property supports two paths worth evaluating in parallel: splitting into two rentals (upper about ${money(combo.upperRange[0])}-${money(combo.upperRange[1])} + lower about ${money(combo.lowerRange[0])}-${money(combo.lowerRange[1])}) or renting the whole property to one household (about ${money(judgment.adjustedRange[0])}-${money(judgment.adjustedRange[1])}).`);
    items.push("The pool of applicants able to use both units and carry the total rent is usually smaller, so vacancy may be longer. Splitting can fill faster but adds management complexity around cost allocation and shared-area rules.");
  } else if (form.airbnbInterest === "Yes") {
    items.push("Primary strategy: test the market on a long-term / whole-home path first, using only confirmed features in the listing.");
    items.push(hasSuiteBasis && !isSingleSuite
      ? "Secondary strategy: legal split-rental feasibility can be reviewed in parallel, with entrance, kitchen, laundry, utilities, parking, and compliance confirmed one by one."
      : isSingleSuite
        ? "Secondary strategy: review whether the basement suite can operate as an independent, lawful rental, including its entrance, kitchen, laundry, utilities, parking, privacy, shared areas, and cost-allocation arrangements with the upper unit."
        : "Secondary strategy: current inputs do not yet support an additional rental configuration, so it should not be marketed.");
    items.push("Airbnb / STR remains a backup direction only, pending BC and municipal rule verification.");
  } else {
    items.push(hasSuiteBasis && !isSingleSuite
      ? `Lead with a whole-home rental at ${money(judgment.recommendedPrice)}/month; if it does not find a qualified tenant within a reasonable window, review legal split-rental feasibility as a fallback.`
      : isSingleSuite
        ? `Test the market at ${money(judgment.recommendedPrice)}/month and review whether the basement suite meets the requirements for an independent, lawful rental.`
        : `List at ${money(judgment.recommendedPrice)}/month to test market response, with the listing focused on confirmed features.`);
  }
  items.push(...plan);
  return items;
}

function buildReportAdjustmentPlan(judgment, lang) {
  const recommended = judgment.recommendedPrice;
  const firstReviewPrice = recommended - 50;
  const feedbackLow = recommended - 100;
  if (lang === "zh") {
    return [
      `先按 ${money(recommended)} 测试市场。`,
      `若 7–10 天内咨询质量不足，可调整至约 ${money(firstReviewPrice)}。`,
      "如约两周已有看房但无合格申请，应先复核照片、广告内容、物业条件和租客反馈。",
      `再根据反馈决定是否调整至约 ${money(feedbackLow)}–${money(firstReviewPrice)}，不自动采用固定降价。`,
    ];
  }
  return [
    `Start by testing the market at ${money(recommended)}.`,
    `If inquiry quality is insufficient after 7-10 days, consider adjusting to about ${money(firstReviewPrice)}.`,
    "If showings have occurred but there is no qualified application after about two weeks, first review the photos, listing content, property condition, and tenant feedback.",
    `Then use that feedback to decide whether an adjustment to about ${money(feedbackLow)}-${money(firstReviewPrice)} is appropriate; do not apply an automatic fixed reduction.`,
  ];
}

// 3. Local rent judgment (本地租金判断): base range, adjusted range,
// recommended list price, and an explicit verdict on the owner's target.
function buildRentPositioning(form, judgment, lang) {
  const [baseLo, baseHi] = judgment.baseRange;
  const [adjLo, adjHi] = judgment.adjustedRange;
  const hasTarget = judgment.targetRent !== null;

  if (lang === "zh") {
    const lines = [
      `市场基础区间（${judgment.type.zh}，${judgment.region.zh}）：约 ${money(baseLo)}–${money(baseHi)}/月。`,
      `结合物业条件调整后区间：约 ${money(adjLo)}–${money(adjHi)}/月。`,
      `建议挂牌价格：${money(judgment.recommendedPrice)}/月。`,
    ];
    lines.push(hasTarget
      ? `业主目标租金 ${money(judgment.targetRent)}/月，判断为「${judgment.verdictLabel.zh}」（与建议价相差约 ${Math.round(judgment.diffRatio * 100)}%）。`
      : "业主未填写目标租金，以上建议价格可直接作为挂牌参考。");
    if (judgment.assumptionUsed) {
      lines.push("根据目前已提供资料，以上判断以普通装修和正常维护状态为假设；确认实际装修、采光和维护状态后，价格可能上下调整。");
    }
    return lines;
  }
  const lines = [
    `Market base range (${judgment.type.en}, ${judgment.region.en}): about ${money(baseLo)}-${money(baseHi)}/month.`,
    `Range adjusted for property condition: about ${money(adjLo)}-${money(adjHi)}/month.`,
    `Recommended list price: ${money(judgment.recommendedPrice)}/month.`,
  ];
  lines.push(hasTarget
    ? `Owner target rent is ${money(judgment.targetRent)}/month, judged as "${judgment.verdictLabel.en}" (about ${Math.round(judgment.diffRatio * 100)}% from the recommended price).`
    : "No target rent was entered, so the recommended price above can be used directly as the listing reference.");
  if (judgment.assumptionUsed) {
    lines.push("Based on current inputs, this judgment assumes ordinary condition and maintenance; the price may move up or down once actual finishes, light, and maintenance are confirmed.");
  }
  return lines;
}

// 8. Market risks (市场风险).
function buildMarketRisks(form, judgment, legalWarning, followUps, lang) {
  const items = [];
  if (judgment.marketAcceptance.narrowPool) {
    items.push(lang === "zh"
      ? `当前建议价格接近或超过该户型的市场接受上限（约 ${money(judgment.hardCeiling)}/月），租客群体会明显收窄，预计出租周期约 ${judgment.marketAcceptance.expectedDaysRange[0]}–${judgment.marketAcceptance.expectedDaysRange[1]} 天。`
      : `The recommended price is near or above this unit type's market ceiling (about ${money(judgment.hardCeiling)}/month), which narrows the tenant pool; expected time to lease is roughly ${judgment.marketAcceptance.expectedDaysRange[0]}-${judgment.marketAcceptance.expectedDaysRange[1]} days.`);
  }
  if (judgment.comboDetails) {
    items.push(lang === "zh"
      ? "能够整体承租上下单元的合格申请住户数量较少，出租周期可能明显长于分租；分租虽更快找到租客，但楼上楼下共用区域和噪音需要清晰的租约规则。"
      : "Few qualified households can take the whole combined property, so vacancy may run longer than a split rental; splitting fills faster but shared areas and noise between upper and lower units need clear lease terms.");
  }
  if (hasSplitRentalBasis(form, followUps) && form.suiteLegalStatus !== "Legal") {
    items.push(lang === "zh"
      ? "套间合法状态未完全确认，存在合法套间相关风险；正式营销和定价前应完成专业合规审核。"
      : "Suite legal status is not fully confirmed, creating legal-suite risk; complete a professional compliance review before marketing and finalizing price.");
  }
  if (form.petFriendly === "No") {
    items.push(lang === "zh" ? "不接受宠物会缩小租客群体，可能延长出租周期。" : "Not accepting pets narrows the tenant pool and may extend time to lease.");
  }
  if (Number(form.garageSpaces || 0) === 0 && Number(form.drivewayParking || 0) === 0) {
    items.push(lang === "zh" ? "没有车库或车道停车位，在需要停车的租客群体中吸引力较弱。" : "No garage or driveway parking, which weakens appeal to tenants who need parking.");
  }
  if (hasSplitRentalBasis(form, followUps) || judgment.comboDetails) {
    items.push(lang === "zh" ? "楼上楼下共用空间和隔音可能引发租客冲突或投诉，需要在租约中明确使用规则。" : "Shared space and sound transfer between upper and lower units can lead to tenant conflict or complaints; lease terms should set clear rules.");
  }
  if (legalWarning) {
    items.push(lang === "zh" ? "屋主自住相关再出租限制存在法律风险，详见法规风险提醒章节。" : "Owner-occupancy re-rental restrictions carry legal risk; see the Legal Risk Reminder section.");
  }
  return items.length ? items : [lang === "zh" ? "根据目前资料，暂未发现突出的市场风险；仍建议在正式挂牌前复核照片、状态和合规。" : "No standout market risk is identified from current inputs; photos, condition, and compliance should still be reviewed before listing."];
}

// 9. Next steps (下一步行动): concrete, executable checklist.
function buildNextSteps(form, judgment, lang) {
  if (lang === "zh") {
    const steps = [
      `以建议挂牌价 ${money(judgment.recommendedPrice)}/月 完成房源资料和照片准备。`,
      "确认第一批照片以客厅、厨房和主要卧室为主，如有海景、车库或私人院子需一并确认后再使用。",
      "挂牌后按「出租策略」章节的调价规则跟踪咨询量和申请质量。",
    ];
    if (judgment.comboDetails) steps.push("同时评估分租与整租两条路径的实际申请情况，再决定最终出租方式。");
    return steps;
  }
  const steps = [
    `Prepare the listing and photos around the recommended price of ${money(judgment.recommendedPrice)}/month.`,
    "Confirm the first photo set covers the living room, kitchen, and main bedrooms; only use ocean view, garage, or private yard photos once confirmed.",
    "Track inquiry volume and application quality against the adjustment rules in the Rental Strategy section.",
  ];
  if (judgment.comboDetails) steps.push("Track actual applications for both the split-rental and whole-property paths before committing to a final format.");
  return steps;
}

function buildSuiteSplitPotential(form, followUps, lang = "en") {
  const hasBasis = hasSplitRentalBasis(form, followUps);
  if (form.rentalUnitType === "Basement / Secondary Suite") {
    return lang === "zh"
      ? "可进一步审核该地下套间是否具备独立、合法出租条件，并确认与楼上单元之间的入口、厨房、洗衣、水电、停车、隐私、共用区域及费用分配安排。"
      : "Further review should confirm whether this basement suite can operate as an independent, lawful rental and clarify its entrance, kitchen, laundry, utilities, parking, privacy, shared areas, and cost-allocation arrangements with the upper unit.";
  }
  if (!hasBasis) {
    return lang === "zh"
      ? "当前记录未确认套间、独立入口或独立厨房；额外出租配置需进一步确认，不能作为当前优势。"
      : "Current record does not confirm a suite, separate entrance, or separate kitchen; any additional rental configuration needs further confirmation and must not be treated as a current advantage.";
  }

  if (form.existingSuite === "Yes") {
    const suiteReadySignals = [
      followUps.suiteSeparateEntrance,
      followUps.suiteOwnKitchen,
      followUps.suiteSeparateLaundry,
      followUps.suiteSeparateHydro,
    ].filter((value) => value === "Yes").length;
    if (suiteReadySignals >= 3) {
      return lang === "zh"
        ? "当前记录确认已有套房并具备多个独立使用条件，可进入专业合规审核。正式采用前仍需确认合法性、安全、保险、停车和水电安排。"
        : "Current record confirms an existing suite with several independent-use features, so it can move into professional compliance review. Legality, safety, insurance, parking, and utilities still need confirmation.";
    }
    return lang === "zh"
      ? "当前记录确认已有套房，但独立入口、厨房、洗衣、电表或水电细节仍需专业审核。"
      : "Current record confirms an existing suite, but entrance, kitchen, laundry, meter, or utility details still need professional review.";
  }

  if (form.existingSuite === "No" && (followUps.conversionSeparateEntrance === "Yes" || followUps.conversionAddKitchen === "Yes")) {
    return lang === "zh"
      ? "当前记录没有现有套房，但追问中确认了独立入口或加厨房意向；这只能作为未来专业审核事项，不能作为当前广告卖点。"
      : "Current record has no existing suite, but follow-up answers confirm separate-entrance or kitchen interest; this is only a future professional review item, not a current marketing feature.";
  }

  if (form.separateEntrance === "Yes" || form.canAddKitchen === "Yes") {
    return lang === "zh"
      ? "当前记录确认了独立入口或加厨房条件，可进入专业审核；厨房、洗衣、水电、隐私、停车和合规仍需逐项确认。"
      : "Current record confirms a separate entrance or kitchen potential, so professional review is justified; kitchen, laundry, utilities, privacy, parking, and compliance still need confirmation.";
  }

  return lang === "zh"
    ? "额外出租配置仍需结合照片和平面布局进一步判断。"
    : "Additional rental configuration still needs photo and layout review.";
}

function buildSuiteQualityPrivacy(form, lang = "en") {
  const notes = [];
  const suiteHydroMeter = form.utilitiesArrangement === "Separate Meter" ? "Yes" : (!form.utilitiesArrangement ? form.suiteHydroMeter : "");
  const suiteYardPrivacy = form.outdoorSpaceType === "Fully Private" ? "Fully private" : form.outdoorSpaceType === "Shared" ? "Shared yard" : form.outdoorSpaceType === "No Outdoor Space" ? "No yard" : form.outdoorSpaceType === "Partial" ? "Partial" : (!form.outdoorSpaceType ? form.suiteYardPrivacy : "");
  const suiteSharedAreas = form.sharedAreas || form.suiteSharedAreas;
  if (!hasSplitRentalBasis(form, form.followUpAnswers || {}) && !form.suiteLegalStatus && !suiteYardPrivacy && !suiteSharedAreas && !form.suiteRentImpactNotes) {
    return lang === "zh"
      ? "当前记录未确认套间品质、隐私、水电或院子条件；需进一步确认。"
      : "Current record does not confirm suite quality, privacy, utilities, or yard details; further confirmation is needed.";
  }
  if (form.suiteLegalStatus === "Legal") {
    notes.push(lang === "zh" ? "已填写合法套间状态，可作为专业审核中的合规优势。" : "Legal suite status is entered and can be treated as a compliance advantage during professional review.");
  } else if (form.suiteLegalStatus === "Unauthorized no permit") {
    notes.push(lang === "zh" ? "未授权 / 无许可套间需要更谨慎，正式营销前应进行专业合规审核。" : "Unauthorized suite status requires a cautious strategy and professional compliance review before marketing.");
  } else if (form.suiteLegalStatus === "Not sure") {
    notes.push(lang === "zh" ? "套间合法状态未确认，不能作为广告卖点直接宣传。" : "Suite legal status is unclear and should not be promoted as a confirmed feature.");
  }
  if (suiteHydroMeter === "Yes") notes.push(lang === "zh" ? "已确认独立电表，可减少水电分摊争议。" : "Separate hydro meter is confirmed and can reduce utility-sharing disputes.");
  if (suiteHydroMeter === "No") notes.push(lang === "zh" ? "当前没有独立电表，相关费用说明需进一步确认。" : "There is no separate hydro meter, so utility wording needs further confirmation.");
  if (suiteYardPrivacy === "Fully private") notes.push(lang === "zh" ? "完全私密的户外空间能明显提高租金吸引力和申请质量。" : "Fully private outdoor space improves rent appeal and application quality.");
  if (suiteYardPrivacy === "Partial") notes.push(lang === "zh" ? "部分私密院子仍有价值，但广告中必须清楚说明哪些区域独享、哪些区域共用。" : "Partial yard privacy still has value, but exclusive versus shared areas must be described clearly.");
  if (suiteYardPrivacy === "Shared yard") notes.push(lang === "zh" ? "共用院子会降低重视私人户外空间的租客吸引力，必须设定清晰使用规则。" : "A shared yard is less attractive to tenants prioritizing private outdoor space unless clear rules are set.");
  if (suiteYardPrivacy === "No yard") notes.push(lang === "zh" ? "没有院子会限制重视户外空间的租客吸引力，租金定位需更保守。" : "No yard limits appeal to tenants prioritizing outdoor space and calls for more conservative positioning.");
  if (suiteSharedAreas) {
    notes.push(lang === "zh"
      ? "已记录套间共用区域信息；正式分租前需要明确哪些空间独享、哪些空间共用。"
      : `Shared areas noted: ${cleanSentence(suiteSharedAreas)}`);
  }
  if (form.suiteRentImpactNotes) {
    notes.push(lang === "zh"
      ? `套间租金影响备注：${cleanSentence(form.suiteRentImpactNotes)}`
      : `Rent impact notes: ${cleanSentence(form.suiteRentImpactNotes)}`);
  }
  if (form.existingSuite === "Yes" || form.suiteLegalStatus) {
    notes.push(lang === "zh"
      ? "请查看房东知识中心第二套房 / 合法套间指南，并经专业审核后再作最终决定。"
      : "Please review the Secondary Suite / Legal Suite guide in the Landlord Knowledge Center and confirm through professional review before making a final decision.");
  }
  return notes.length ? notes : (lang === "zh" ? "相关品质、隐私、水电和院子条件需要结合平面布局与照片确认。" : "Quality, privacy, utilities, and yard conditions need layout and photo review.");
}

function communityTagPhrase(tag, lang) {
  const key = String(tag || "").trim().toLowerCase();
  const phrases = {
    "nature-oriented": ["自然环境导向", "nature-oriented setting"],
    "lakefront lifestyle": ["湖区生活方式", "lake-area lifestyle"],
    "viu proximity": ["临近 VIU 的区位潜力", "potential appeal from proximity to VIU"],
    quiet: ["安静的居住环境", "quiet residential setting"],
    "pet-friendly": ["对重视宠物政策的住户具有潜在吸引力", "potential appeal to households that value pet-friendly policies"],
    "active tenants": ["重视户外活动的租住需求", "demand from households that value outdoor activity"],
    "trail access": ["步道和休闲生活方式", "trail and recreation lifestyle"],
  };
  return phrases[key]?.[lang === "zh" ? 0 : 1] || "";
}

function propertyFitField(form) {
  const type = form.rentalUnitType || form.propertyBuildingType || form.propertyType;
  const fields = {
    "Basement / Secondary Suite": "Basement Suite Fit",
    "Entire Detached House": "Detached House Fit",
    "Detached House": "Detached House Fit",
    "Entire Condo": "Condo Fit",
    Condo: "Condo Fit",
    "Entire Townhouse": "Townhouse Fit",
    Townhouse: "Townhouse Fit",
    "Room Rental": "Room Rental Fit",
  };
  return fields[type] || "";
}

function decisionHintField(form) {
  const type = form.rentalUnitType || form.propertyBuildingType || form.propertyType;
  const fields = {
    "Basement / Secondary Suite": "If Basement Suite",
    "Entire Detached House": "If Detached House",
    "Detached House": "If Detached House",
    "Entire Condo": "If Condo",
    Condo: "If Condo",
  };
  return fields[type] || "";
}

function buildCommunityKnowledgeNarrative(form, community, lang = "en") {
  if (community.status !== "confirmed" || !community.communityId) {
    return [lang === "zh"
      ? "具体社区尚未确认，本报告暂以 Nanaimo 整体市场基准评估。"
      : "The specific community is not confirmed; this report currently uses the overall Nanaimo market baseline."];
  }
  const facts = community.facts || {};
  const notes = [];
  for (const value of [facts.areaProfile, facts.parksTrailsLakes, facts.transitAccess]) {
    const localized = localizeKnowledgeText(value, lang);
    if (localized && !notes.includes(localized)) notes.push(localized);
  }
  const demand = localizeKnowledgeText(facts.rentalDemand, lang);
  if (demand) notes.push(lang === "zh" ? `当地出租需求方面：${demand}` : `Local rental demand: ${demand}`);
  const rent = localizeKnowledgeText(facts.rentPositioning, lang);
  if (rent) notes.push(lang === "zh" ? `当地租金定位参考：${rent}` : `Local rent-positioning context: ${rent}`);
  const pricing = localizeKnowledgeText(facts.pricingSensitivity, lang);
  if (pricing) notes.push(lang === "zh" ? `价格敏感度方面：${pricing}` : `Pricing sensitivity: ${pricing}`);
  const seasonal = localizeKnowledgeText(facts.seasonalPattern, lang);
  if (seasonal) notes.push(lang === "zh" ? `季节性需求方面：${seasonal}` : `Seasonal demand pattern: ${seasonal}`);
  if (/^high$/i.test(String(facts.matchConfidence || "").trim())) notes.push(lang === "zh"
    ? "现有社区资料与所选社区的匹配度较高。"
    : "The available local information is a strong match for the selected community.");
  const fit = localizeKnowledgeText(facts.propertyTypeNotes, lang);
  if (fit) notes.push(lang === "zh" ? `物业适配方面：${fit}` : `Property fit: ${fit}`);
  const marketing = localizeKnowledgeText(facts.marketingAngles, lang);
  if (marketing) notes.push(lang === "zh" ? `适合自然表达的营销重点包括：${marketing}` : `Natural marketing emphasis includes: ${marketing}`);
  const risks = localizeKnowledgeText(facts.risksCautions, lang);
  if (risks) notes.push(lang === "zh" ? `需要如实说明的实际限制：${risks}` : `Practical limitations to disclose: ${risks}`);
  const development = localizeKnowledgeText(facts.futureDevelopment, lang);
  if (development) notes.push(lang === "zh" ? `社区发展趋势：${development}` : `Community development outlook: ${development}`);
  const professional = localizeKnowledgeText(facts.professionalNotes, lang);
  if (professional) notes.push(lang === "zh" ? `专业复核提示：${professional}` : `Professional review note: ${professional}`);
  return notes;
}

function buildLocationRentAdjustment(form, judgment, community, lang = "en") {
  const notes = [];
  notes.push(...buildCommunityKnowledgeNarrative(form, community, lang));
  if (form.nearbyCommercialCentre === "Yes") {
    notes.push(lang === "zh" ? "靠近商业中心能支持一定租金溢价，尤其适合重视便利性的租客。" : "Commercial-centre access supports a modest rent premium for tenants prioritizing convenience.");
  }
  if (form.locationRentPremium) {
    notes.push(lang === "zh"
      ? `位置溢价备注：${cleanSentence(form.locationRentPremium)}`
      : `Location premium note: ${cleanSentence(form.locationRentPremium)}`);
  }
  if (form.rentAdjustmentFactors) {
    notes.push(lang === "zh"
      ? `租金调整因素：${cleanSentence(form.rentAdjustmentFactors)}`
      : `Rent adjustment factors: ${cleanSentence(form.rentAdjustmentFactors)}`);
  }
  return notes;
}

// Internal-only Knowledge Base columns that must never reach a client-facing
// report. firstKnowledgeValue/joinKnowledgeRows only ever return values from
// an explicit allowlist (the preferredFields the caller asks for) - they no
// longer fall back to dumping every column on a row, which previously leaked
// columns like "Community ID", "Ready for System Use", "AI Decision Hints",
// and "Property Fit Matrix" straight into owner-facing reports.
const INTERNAL_KB_FIELD_BLOCKLIST = [
  "community id", "id", "row id", "record id", "ready for system use",
  "ai decision hint", "ai decision hints", "ai flag", "ai flags",
  "property fit matrix", "internal notes", "internal note", "system prompt",
  "matrix notes", "status", "last modified", "last modified by", "owner",
  "created by", "updated by",
];

function isInternalKbField(name) {
  return INTERNAL_KB_FIELD_BLOCKLIST.includes(String(name || "").trim().toLowerCase());
}

function firstKnowledgeValue(record, names) {
  record = record || {};
  for (const name of names) {
    if (isInternalKbField(name)) continue;
    if (record[name]) return String(record[name]).trim();
  }
  const lowerMap = Object.fromEntries(Object.entries(record).map(([key, value]) => [String(key).toLowerCase(), value]));
  for (const name of names) {
    if (isInternalKbField(name)) continue;
    const value = lowerMap[String(name).toLowerCase()];
    if (value) return String(value).trim();
  }
  return "";
}

// Only ever surfaces values from the allowlisted preferredFields. If a row
// has none of those fields populated, it is skipped rather than dumping the
// row's raw key:value pairs (that dump was the source of internal-field
// leaks into client reports).
function joinKnowledgeRows(rows, preferredFields) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => firstKnowledgeValue(row, preferredFields))
    .filter(Boolean)
    .slice(0, 4);
}

// NOTE on Knowledge Base language handling:
// The Community_Knowledge_Base Google Sheet is maintained in English prose.
// This system has no live translation model available, so word-by-word
// substitution was previously used to "translate" it for zh reports - that
// produced broken Chinglish (e.g. "购物 and 服务 should be 已核实"). Rather
// than ship broken translations, community/lifestyle commentary is authored
// natively in both languages via getRegionNarrative() (nanaimoRentalPricing.js)
// and used for BOTH languages. The live sheet is only consulted for the
// community name and short allowlisted tags (never full sentences), and only
// surfaced in English reports where no translation problem exists.
function normalizeRentalIntelligenceKnowledge(data) {
  const base = data?.communityKnowledgeBase || {};
  const infrastructure = data?.infrastructure || {};
  const communityName = data?.communityName ||
    firstKnowledgeValue(base, ["Community", "Community Name", "Community_Name", "Neighbourhood", "Neighborhood", "Area"]) ||
    "";
  return {
    communityId: data?.communityId || firstKnowledgeValue(base, ["Community ID", "Community_ID"]) || "",
    communityName,
    city: data?.city || firstKnowledgeValue(base, ["City"]) || "",
    matchType: data?.matchType || "fallback",
    matchedKeyword: data?.matchedKeyword || "",
    facts: {
      keywords: firstKnowledgeValue(base, ["Keywords / Area Names"]),
      areaProfile: firstKnowledgeValue(base, ["Area Profile"]),
      nearbySchools: firstKnowledgeValue(base, ["Nearby Schools"]),
      shoppingServices: firstKnowledgeValue(base, ["Shopping / Services"]),
      parksTrailsLakes: firstKnowledgeValue(base, ["Parks / Trails / Lakes"]),
      transitAccess: firstKnowledgeValue(base, ["Transit / Access"]),
      rentalDemand: firstKnowledgeValue(base, ["Rental Demand"]),
      rentPositioning: firstKnowledgeValue(base, ["Rent Positioning Notes"]),
      marketingAngles: firstKnowledgeValue(base, ["Marketing Angles"]),
      risksCautions: firstKnowledgeValue(base, ["Risks / Cautions"]),
      futureDevelopment: firstKnowledgeValue(base, ["Future Development / City Plan Notes"]),
      professionalNotes: firstKnowledgeValue(base, ["Mabel Professional Notes"]),
      medicalServices: firstKnowledgeValue(base, ["Medical / Pharmacy / Services"]),
      propertyTypeNotes: firstKnowledgeValue(base, ["Property Type Notes"]),
      pricingSensitivity: firstKnowledgeValue(base, ["Pricing Sensitivity"]),
      seasonalPattern: firstKnowledgeValue(base, ["Seasonal Rental Pattern"]),
      matchConfidence: firstKnowledgeValue(base, ["Community Match Confidence"]),
    },
    infrastructure: {
      schoolDistrict: infrastructure.schoolDistrict || firstKnowledgeValue(base, ["School District"]),
      schoolDistrictNumber: infrastructure.schoolDistrictNumber || firstKnowledgeValue(base, ["School District Number"]),
      nearbyElementarySchools: infrastructure.nearbyElementarySchools || firstKnowledgeValue(base, ["Nearby Elementary Schools"]),
      nearbySecondarySchools: infrastructure.nearbySecondarySchools || firstKnowledgeValue(base, ["Nearby Secondary Schools"]),
      specialEducationOptions: infrastructure.specialEducationOptions || firstKnowledgeValue(base, ["Special Education Options"]),
      healthAuthority: infrastructure.healthAuthority || firstKnowledgeValue(base, ["Health Authority"]),
      nearestHospital: infrastructure.nearestHospital || firstKnowledgeValue(base, ["Nearest Hospital"]),
      nearbyMedicalClinics: infrastructure.nearbyMedicalClinics || firstKnowledgeValue(base, ["Nearby Medical Clinics"]),
      nearbyPharmacies: infrastructure.nearbyPharmacies || firstKnowledgeValue(base, ["Nearby Pharmacies"]),
    },
  };
}

const SCHOOL_DISCLAIMER_ZH = "附近学校及教育资源仅供社区生活参考，具体入学安排请向相关教育局确认。";
const SCHOOL_DISCLAIMER_EN = "Nearby schools and education resources are provided for community-living reference only. Please confirm enrolment arrangements with the applicable school district.";
const MEDICAL_DISCLAIMER_ZH = "诊所服务和接诊安排可能变化，请以相关医疗机构当前信息为准。";
const MEDICAL_DISCLAIMER_EN = "Clinic services and patient-intake arrangements may change. Please confirm current information with the relevant medical provider.";

function localizeKnowledgeText(value, lang = "en") {
  const text = infrastructureValue(value);
  if (!text) return "";
  const parts = text.split(/\s+\/\s+/).map((item) => item.trim()).filter(Boolean);
  if (parts.length < 2) return text;
  const chinese = parts.find((item) => /[\u3400-\u9fff]/.test(item));
  const english = parts.find((item) => !/[\u3400-\u9fff]/.test(item));
  return lang === "zh" ? (chinese || english || text) : (english || chinese || text);
}

function appendUniqueKnowledge(items, value, lang, prefixZh, prefixEn) {
  const text = localizeKnowledgeText(value, lang);
  if (!text) return;
  const normalized = text.toLowerCase();
  if (items.some((item) => item.toLowerCase().includes(normalized) || normalized.includes(item.toLowerCase().replace(/^.*?：|^.*?:\s*/, "")))) return;
  items.push(lang === "zh" ? `${prefixZh}${text}` : `${prefixEn}${text}`);
}

function infrastructureValue(value) {
  const text = String(value || "").trim();
  return /^(n\/a|none|not available|unknown|需按具体地址确认)$/i.test(text) ? "" : text;
}

function localizeAccessNote(value, lang) {
  const text = infrastructureValue(value);
  if (!text || lang !== "zh") return text;
  const exact = {
    "Car dependent / Transit available": "日常出行较依赖驾车，同时有公共交通可用。",
    "Transit accessible.": "可使用公共交通。",
    "Car-dependent.": "日常出行较依赖驾车。",
    "Highly car-dependent.": "日常出行高度依赖驾车。",
    "Good access to daily essentials.": "日常采购和基础服务相对便利。",
    "Good access to essentials.": "日常采购和基础服务相对便利。",
    "Limited local essentials.": "社区内日常采购选择有限，可能需要前往邻近商业区。",
    "Suburban access": "郊区出行条件，日常通常以驾车为主。",
    "Car dependent": "日常出行较依赖驾车。",
    "Semi-rural, car dependent": "半乡村环境，日常出行较依赖驾车。",
    "Rural, car dependent": "乡村环境，日常出行较依赖驾车。",
    "Suburban, car dependent": "郊区环境，日常出行较依赖驾车。",
    "Walkable core, transit available": "核心区域具备一定步行条件，并有公共交通可用。",
    "Walkable village, car dependent for regional": "村镇中心具备一定步行条件，跨区域出行仍较依赖驾车。",
    "Central convenience": "中心区域生活便利。",
    "Suburban growth": "郊区发展区域，出行条件应结合具体地址确认。",
    "Seaside village, car dependent for high school": "海滨村镇环境，中学通学较依赖驾车。",
    "Ferry-dependent for high school": "中学通学需要依赖渡轮。",
    "Evolving market, car dependent": "发展中的市场，日常出行较依赖驾车。",
    "Excellent access to shopping and groceries.": "购物和日常食品采购选择丰富。",
    "Excellent access to shopping.": "购物条件便利。",
    "Excellent access to daily essentials.": "日常采购和基础服务便利。",
    "Excellent access to all essentials.": "日常采购及基础服务较为集中。",
    "Basic essentials available locally.": "社区内可满足部分基本日常需求。",
    "Basic essentials available.": "可满足部分基本日常需求。",
    "Basic essentials available, ferry required for major shopping.": "社区内可满足基本日常需求，大型采购需要乘渡轮前往。",
    "Good access to essentials nearby.": "邻近区域可满足日常采购和基础服务需求。",
    "Good access to shopping.": "购物条件相对便利。",
    "Somewhat walkable, transit available.": "具备一定步行条件，并有公共交通可用。",
    "Walkable town centre.": "镇中心具备一定步行便利性，具体距离须结合物业地址确认。",
    "Mostly car-dependent.": "日常出行主要依赖驾车。",
    "Car-dependent but transit available.": "日常出行较依赖驾车，同时有公共交通可用。",
    "Car-dependent, ferry access required.": "日常出行较依赖驾车，离岛交通需要使用渡轮。",
  };
  return exact[text] || text;
}

function buildEducationResources(community, lang = "en") {
  if (community.status !== "confirmed") return [];
  const data = community.infrastructure || {};
  const items = [];
  const district = infrastructureValue(data.schoolDistrict);
  const number = infrastructureValue(data.schoolDistrictNumber);
  const elementary = infrastructureValue(data.nearbyElementarySchools);
  const secondary = infrastructureValue(data.nearbySecondarySchools);
  const special = infrastructureValue(data.specialEducationOptions);
  appendUniqueKnowledge(items, community.facts?.nearbySchools, lang, "附近学校及教育资源：", "Nearby schools and education resources: ");
  if (district || number) items.push(lang === "zh" ? `所属教育局：${district || "待确认"}${number ? `（SD${number}）` : ""}` : `School district: ${district || "To be confirmed"}${number ? ` (SD${number})` : ""}`);
  if (elementary) items.push(lang === "zh" ? `附近主要小学：${elementary}` : `Nearby elementary schools: ${elementary}`);
  if (secondary) items.push(lang === "zh" ? `附近主要中学：${secondary}` : `Nearby secondary schools: ${secondary}`);
  if (special) items.push(lang === "zh" ? `特色或语言教育选项：${special}` : `Special or language-program options: ${special}`);
  if (items.length) items.push(lang === "zh" ? SCHOOL_DISCLAIMER_ZH : SCHOOL_DISCLAIMER_EN);
  return items;
}

function buildMedicalResources(community, lang = "en") {
  if (community.status !== "confirmed") return [];
  const data = community.infrastructure || {};
  const items = [];
  const authority = infrastructureValue(data.healthAuthority);
  const hospital = infrastructureValue(data.nearestHospital);
  const clinics = infrastructureValue(data.nearbyMedicalClinics);
  const pharmacies = infrastructureValue(data.nearbyPharmacies);
  appendUniqueKnowledge(items, community.facts?.medicalServices, lang, "社区医疗与药房服务：", "Community medical and pharmacy services: ");
  if (authority) items.push(lang === "zh" ? `卫生管理机构：${authority}` : `Health authority: ${authority}`);
  if (hospital) items.push(lang === "zh" ? `最近主要医院：${hospital}` : `Nearest major hospital: ${hospital}`);
  if (clinics) items.push(lang === "zh" ? `附近诊所：${clinics}` : `Nearby medical clinics: ${clinics}`);
  if (pharmacies) items.push(lang === "zh" ? `附近药房：${pharmacies}` : `Nearby pharmacies: ${pharmacies}`);
  if (items.length) items.push(lang === "zh" ? MEDICAL_DISCLAIMER_ZH : MEDICAL_DISCLAIMER_EN);
  return items;
}

function buildShoppingConvenience(community, lang = "en") {
  if (community.status !== "confirmed") return [];
  const items = [];
  appendUniqueKnowledge(items, community.facts?.shoppingServices, lang, "购物与生活服务：", "Shopping and daily services: ");
  return items;
}

function splitKnowledgeTags(value) {
  return String(value || "").split(/[;|\n]+/).map((item) => item.trim()).filter(Boolean);
}

function resolveCommunityPresentation(form, community, judgment) {
  if (form.communityId && community.communityId === form.communityId && community.matchType === "community_id") {
    return { ...community, displayName: community.communityName, status: "confirmed" };
  }
  if (!form.communityId && form.communityName && community.communityName === form.communityName && community.matchType === "community_name") {
    return { ...community, displayName: community.communityName, status: "confirmed" };
  }
  const rawName = String(community.communityName || "").trim();
  const displayName = !rawName || /generic|general nanaimo/i.test(rawName) ? "" : rawName;
  const normalizedName = displayName.toLowerCase();
  const confirmedText = [form.communityArea, form.propertyAddress].filter(Boolean).join(" ").toLowerCase();
  const notesText = String(form.locationNotes || "").toLowerCase();
  const explicitRegion = !["nanaimo-general", "unknown"].includes(judgment.region.code);
  const confirmedFromField = !!displayName && confirmedText.includes(normalizedName);
  const tentative = !!displayName && !confirmedFromField && notesText.includes(normalizedName);
  const confirmed = confirmedFromField || (!!displayName && explicitRegion && !tentative && judgment.region.en.toLowerCase().includes(normalizedName));
  return {
    ...community,
    displayName,
    status: confirmed ? "confirmed" : tentative ? "tentative" : "unconfirmed",
  };
}

function reportJudgmentForCommunity(judgment, community) {
  if (community.status === "tentative") {
    return {
      ...judgment,
      region: { ...judgment.region, en: "Nanaimo overall market baseline", zh: "Nanaimo 整体市场基准", code: "nanaimo-general" },
    };
  }
  if (community.status !== "confirmed" || !community.displayName) return judgment;
  return {
    ...judgment,
    region: {
      ...judgment.region,
      en: community.displayName,
      zh: community.displayName,
      code: /westwood lake/i.test(community.displayName) ? "westwood-lake" : judgment.region.code,
    },
  };
}

function communityReferencePrefix(community, region, lang = "en") {
  const name = community.displayName || community.communityName || region.zh;
  const nameEn = community.displayName || community.communityName || region.en;
  if (community.status === "confirmed") {
    return lang === "zh"
      ? `已确认社区：${name}。本节使用 ${name} 社区知识，并结合 Nanaimo 整体市场基准及物业自身条件。`
      : `Confirmed community: ${nameEn}. This section uses ${nameEn} community knowledge together with the overall Nanaimo market baseline and the property's own features.`;
  }
  if (community.status === "tentative") {
    return lang === "zh"
      ? `可能接近 ${name}，具体社区归属仍需根据完整地址确认；租金判断仍以 Nanaimo 整体市场基准和物业自身条件为主。`
      : `The property may be near ${nameEn}, but the exact community still requires confirmation from the complete address; rent positioning continues to rely primarily on the overall Nanaimo baseline and the property's own features.`;
  }
  if (lang === "zh") {
    return "社区尚未确认；租金和社区判断以 Nanaimo 整体市场基准及物业自身条件为主。";
  }
  return "The community is not yet confirmed; rent and location judgment rely on the overall Nanaimo market baseline and the property's own features.";
}

function buildCommunityLocationAnalysis(form, community, judgment, lang = "en") {
  const notes = [communityReferencePrefix(community, judgment.region, lang)];
  notes.push(...buildCommunityKnowledgeNarrative(form, community, lang));
  if (lang === "zh") {
    if (form.locationNotes) notes.push(`业主位置备注：${cleanSentence(form.locationNotes)}`);
    return notes;
  }
  if (form.locationNotes) notes.push(`Owner location notes: ${cleanSentence(form.locationNotes)}`);
  return notes;
}

function buildTargetTenantProfile(form, judgment, lang = "en") {
  if (lang === "zh") {
    const notes = [
      ...neutralTenantPositioning(form, lang),
      "位置吸引力只应通过已确认的交通、生活配套、步行条件和户外资源描述。",
    ];
    if (judgment.marketAcceptance.narrowPool) {
      notes.push("当前价位对应的租客群体偏窄，看房和申请质量需要更密切跟进。");
    }
    return notes;
  }
  const notes = [
    ...neutralTenantPositioning(form, lang),
    "Location appeal should be described only through verified access, amenities, walkability, and outdoor resources.",
  ];
  if (judgment.marketAcceptance.narrowPool) {
    notes.push("This price point reaches a narrower tenant pool, so showings and application quality need closer follow-up.");
  }
  return notes;
}

function buildCommunityRentPositioningJudgment(form, judgment, lang = "en") {
  const [lo, hi] = judgment.adjustedRange;
  if (lang === "zh") {
    return [
      `租金判断以本地租金判断章节的结论为准：调整后区间约 $${lo.toLocaleString("en-US")}–$${hi.toLocaleString("en-US")}，建议挂牌价 $${judgment.recommendedPrice.toLocaleString("en-US")}。`,
      "该判断优先使用当前记录的户型、区域、车库、院子、宠物政策和装修状态字段；未确认的社区卖点不用于抬高租金。",
    ];
  }
  return [
    `This follows the Local Rent Positioning section: adjusted range about $${lo.toLocaleString("en-US")}-$${hi.toLocaleString("en-US")}, recommended list price $${judgment.recommendedPrice.toLocaleString("en-US")}.`,
    "This judgment prioritizes the current record's unit type, region, garage, yard, pet policy, and condition fields; unconfirmed community advantages are not used to inflate rent.",
  ];
}

function buildCommunityMarketingAngles(form, judgment, community, lang = "en") {
  const baseAngles = lang === "zh"
    ? ["客厅", "厨房", "卧室", "外观", "停车", "清洁状态"]
    : ["living room", "kitchen", "bedrooms", "exterior", "parking", "clean condition"];
  const conditionalAngles = [];
  if (form.oceanView === "Yes") conditionalAngles.push(lang === "zh" ? "已确认海景照片" : "confirmed ocean-view photos");
  if (form.furnished === "Yes") conditionalAngles.push(lang === "zh" ? "已确认家具配置" : "confirmed furnished setup");
  if (Number(form.garageSpaces || 0) > 0) conditionalAngles.push(lang === "zh" ? "已确认车库" : "confirmed garage");
  if (form.privateYard === "Yes" || form.fencedBackyard === "Yes") conditionalAngles.push(lang === "zh" ? "已确认户外空间" : "confirmed outdoor space");
  const communityAngles = buildCommunityKnowledgeNarrative(form, community, lang);

  if (lang === "zh") {
    return [
      `基础照片 / 文案角度：${baseAngles.join("、")}。`,
      communityAngles[0],
      community.facts?.risksCautions ? "社区卖点应同时如实说明已记录的生活便利与实际限制，不作无法核实的保证。" : "社区卖点只使用已确认的本地资料。",
      conditionalAngles.length ? `当前字段支持的额外角度：${conditionalAngles.join("、")}。` : "当前没有额外特殊卖点字段支持，营销应保持基础、准确。",
    ];
  }
  return [
    `Base photo / copy angles: ${baseAngles.join(", ")}.`,
    communityAngles[0],
    community.facts?.risksCautions ? "Community marketing should present the recorded advantages and practical limitations together, without unverified guarantees." : "Use only community claims supported by confirmed local information.",
    conditionalAngles.length ? `Additional angles supported by current fields: ${conditionalAngles.join(", ")}.` : "No additional special-feature fields are confirmed, so marketing should stay basic and accurate.",
  ];
}

function buildCommunityRisksToVerify(form, judgment, lang = "en") {
  const missing = [];
  if (!form.communityArea) missing.push(lang === "zh" ? "具体社区" : "specific community");
  if (!form.fencedBackyard) missing.push(lang === "zh" ? "后院围栏" : "fenced backyard");
  if (!form.petFriendly) missing.push(lang === "zh" ? "宠物政策" : "pet policy");
  if (!form.availableDate) missing.push(lang === "zh" ? "可出租日期" : "available date");

  if (lang === "zh") {
    const notes = ["详细市场风险见「市场风险」章节。"];
    if (missing.length) notes.push(`当前记录缺失：${missing.join("、")}，报告只能以普通装修和正常维护状态假设判断，确认后可能上下调整。`);
    return notes;
  }
  const notes = ["See the Market Risks section for the full risk list."];
  if (missing.length) notes.push(`Missing current-record details: ${missing.join(", ")}; this report assumes ordinary condition and maintenance until confirmed, and the range may move up or down once confirmed.`);
  return notes;
}

function buildMarketingSuggestions(form, followUps, lang = "en") {
  const items = [];
  if (lang === "zh") {
    items.push("★★★★★ 必须：第一张照片使用最能代表当前真实物业状态的画面，不能使用未确认卖点。");
    items.push("★★★★ 推荐：展示客厅、厨房和主要卧室，帮助租客判断日常居住品质。");
    if (form.oceanView === "Yes") items.push("★★★★★ 必须：如照片能确认海景，可把海景作为标题、封面和第一组照片重点。");
    if (form.furnished === "Yes") items.push("★★★★ 推荐：如家具配置已确认，可将带家具作为主要卖点之一。");
    if (Number(form.garageSpaces || 0) > 0 || Number(form.drivewayParking || 0) > 0) items.push("★★★★ 推荐：停车条件已填写，应在广告前半部分明确写出。");
    if (form.privateYard === "Yes" || form.fencedBackyard === "Yes") items.push("★★★★ 推荐：户外空间已填写，应准确展示院子、隐私和围栏状态。");
    if (form.fencedBackyard !== "Yes") items.push("如后院围栏未确认，不得写“完整围栏后院”，只能写需进一步确认。");
    if (form.airbnbInterest === "Yes") items.push("不要在公开广告中暗示短租收益，短租方向需先完成法规核查。");
    if (items.length < 3) items.push("缺失信息只能写需进一步确认，不要套用示例房源卖点。");
    return items;
  }

  items.push("★★★★★ Must: use the strongest image that reflects the current property truth, not an unconfirmed feature.");
  items.push("★★★★ Recommended: show living room, kitchen, and main bedrooms so tenants can judge daily living quality.");
  if (form.oceanView === "Yes") items.push("★★★★★ Must: if photos confirm the view, use the ocean view in the headline, cover photo, and first photo sequence.");
  if (form.furnished === "Yes") items.push("★★★★ Recommended: if furniture is confirmed, position the furnished setup as one of the listing value points.");
  if (Number(form.garageSpaces || 0) > 0 || Number(form.drivewayParking || 0) > 0) items.push("★★★★ Recommended: parking was provided and should be stated early in the listing.");
  if (form.privateYard === "Yes" || form.fencedBackyard === "Yes") items.push("★★★★ Recommended: show outdoor space accurately, including privacy and fencing status.");
  if (form.fencedBackyard !== "Yes") items.push("Do not claim a fully fenced yard unless confirmed; mark it as needing confirmation.");
  if (form.airbnbInterest === "Yes") items.push("Do not advertise STR income before rule verification is complete.");
  if (items.length < 3) items.push("Missing information should be marked as needing confirmation; do not reuse sample listing features.");
  return items;
}

function buildProfessionalPreliminaryRecommendation(form, followUps, lang = "en") {
  const hasSuiteBasis = hasSplitRentalBasis(form, followUps);
  const isSingleSuite = form.rentalUnitType === "Basement / Secondary Suite";
  if (lang === "zh") {
    const items = [
      "专业初步建议：先按当前真实填写资料测试市场，不应依赖未确认卖点或测试案例内容。",
      "如 30 天内合格租客反馈不足，建议重新评估目标租金、照片质量和广告表达。",
  ];
  items.push(hasSuiteBasis && !isSingleSuite
    ? "因当前资料存在套房或独立使用条件，可同步复核合法分租或两个出租单元的可行性。"
    : isSingleSuite
      ? "可进一步审核该地下套间是否具备独立、合法出租条件，并确认与楼上单元之间的入口、厨房、洗衣、水电、停车、隐私、共用区域及费用分配安排。"
      : "当前资料不足以判断额外出租配置；需进一步确认套房、独立入口、独立厨房和平面布局。");
    items.push("Airbnb / STR 暂时只作为备选方案，法规未核查前不建议作为主要出租策略。");
    return items;
  }
  const items = [
    "Professional preliminary recommendation: test the market using the current submitted facts only, without relying on unconfirmed features or sample-case content.",
    "If qualified demand is weak after 30 days, reassess target rent, photo quality, and listing presentation.",
  ];
  items.push(hasSuiteBasis && !isSingleSuite
    ? "Because the current inputs include suite or independent-use signals, legal split-rental or two-unit feasibility can be reviewed."
    : isSingleSuite
      ? "Further review should confirm whether this basement suite can operate as an independent, lawful rental and clarify its entrance, kitchen, laundry, utilities, parking, privacy, shared areas, and cost-allocation arrangements with the upper unit."
      : "Current inputs are not enough to assess an additional rental configuration; suite status, separate entrance, separate kitchen, and layout need further confirmation.");
  items.push("Airbnb / STR should remain a backup strategy until current rules are verified.");
  return items;
}

function buildStrReminder(form, lang) {
  if (form.airbnbInterest !== "Yes") {
    return lang === "zh"
      ? "目前未以短租作为主要方向。如后续考虑 Airbnb / STR，请查看房东知识中心最新短租政策，并经专业审核后再作最终决定。"
      : "STR is not the main direction from the current answers. If Airbnb / STR is considered later, please review the latest guide in the Landlord Knowledge Center and confirm through professional review before making a final decision.";
  }
  return lang === "zh"
    ? ["已选择 Airbnb / STR 意向。请查看房东知识中心最新短租政策。", "短租策略需经专业审核后再作最终决定。"]
    : ["Airbnb / STR interest was selected. Please review the latest STR guide in the Landlord Knowledge Center.", "Professional review should confirm the STR strategy before a final decision is made."];
}

function buildLegalComplianceRisk(form, lang) {
  const legalWarning = hasOwnerOccupancyLegalWarning(form);
  if (legalWarning) {
    return lang === "zh"
      ? ["该物业可能存在与屋主自住相关的再出租限制。", "请查看房东知识中心相关指南，并经专业审核后再确认最终出租策略。"]
      : ["This property may have owner-occupancy related re-rental restrictions.", "Please review the related Landlord Knowledge Center guide and confirm the final rental strategy through professional review."];
  }
  const risk = getLegalRiskFlag(form);
  if (risk === "Not sure") {
    return lang === "zh"
      ? ["未触发明确的屋主自住 12 个月风险提醒，但业主选择了不确定。", "请查看房东知识中心相关指南，并经专业审核后再确认。"]
      : ["No clear owner-occupancy 12-month warning was triggered, but the owner selected Not sure.", "Please review the related Landlord Knowledge Center guide and confirm through professional review before listing."];
  }
  if (form.airbnbInterest === "Yes") {
    return lang === "zh"
      ? ["本次答案未触发屋主自住相关再出租警示。", "已选择 Airbnb / 短租意向，仍须核查当前 BC 省及所在市政的短租规则、主要住所要求和运营限制；在核查完成前不得视为已合规。"]
      : ["No owner-occupancy re-rental warning was triggered by the submitted answers.", "Airbnb / STR interest was selected, so current BC and municipal rules, principal-residence requirements, and operating restrictions must still be verified; compliance must not be assumed before that review is complete."];
  }
  return lang === "zh"
    ? "本次答案未触发屋主自住相关再出租警示。正式挂牌前仍建议由专业团队做最终复核。"
    : "No owner-occupancy re-rental warning was triggered from the submitted answers. Professional review should still be completed before listing.";
}

function calculateAssessmentConfidence(form) {
  let score = 72;
  const reasons = [];
  const cautions = [];
  const propertyType = form.rentalUnitType || form.propertyBuildingType || form.propertyType;
  if (form.propertyAddress && form.city) { score += 5; reasons.push("address"); }
  if (propertyType && form.bedrooms && form.bathrooms) { score += 5; reasons.push("property"); }
  if (form.targetRent) { score += 4; reasons.push("rent"); }
  if (Object.values(form.followUpAnswers || {}).filter(Boolean).length >= 5) { score += 6; reasons.push("followUps"); }
  if (form.knownIssues) { score += 3; reasons.push("knownIssues"); }
  if (form.airbnbInterest === "Yes") cautions.push("STR");
  if (!form.photoFileNames) cautions.push("photos");
  if (!form.availableDate) cautions.push("market");
  return { score: Math.min(score, 96), reasons, cautions };
}

function buildAiAssessmentConfidence(form, confidence, lang) {
  const reasons = [];
  const propertyType = form.rentalUnitType || form.propertyBuildingType || form.propertyType;
  if (form.propertyAddress && form.city) reasons.push(lang === "zh" ? "✓ 地址和城市信息完整" : "✓ Address and city are complete");
  if (propertyType && form.bedrooms && form.bathrooms) reasons.push(lang === "zh" ? "✓ 房屋类型、卧室和卫生间信息完整" : "✓ Property type, bedrooms, and bathrooms are complete");
  if (Object.values(form.followUpAnswers || {}).filter(Boolean).length >= 5) reasons.push(lang === "zh" ? "✓ 专业追问已填写" : "✓ Professional follow-up answers were completed");
  if (form.knownIssues) reasons.push(lang === "zh" ? "✓ 已提供业主关注点和已知问题" : "✓ Owner concerns and known issues were provided");
  if (form.airbnbInterest === "Yes") reasons.push(lang === "zh" ? "⚠ STR 法规需实时确认" : "⚠ STR rules need current verification");
  reasons.push(lang === "zh" ? "⚠ 最终租金仍需结合当前市场和照片状态确认" : "⚠ Final rent still needs current market and photo/condition review");
  return [lang === "zh" ? "评估信心：★★★★☆ 较高信心" : "Assessment Confidence: ★★★★☆ Higher Confidence", ...reasons];
}

function buildServiceRecommendation(form, lang) {
  const confirmed = buildSupportedFeaturePhrases(form, lang);
  const confirmedText = confirmed.length ? confirmed.join(lang === "zh" ? "、" : ", ") : (lang === "zh" ? "当前已填写资料" : "the submitted property details");
  if (lang === "zh") {
    const items = [
      `★★★★★ AI 营销方案：适合把${confirmedText}整理成准确广告和照片顺序。`,
      "★★★★☆ 专业出租挂牌服务：适合需要正式挂牌、市场反馈测试、租金定位和租客筛选的业主。",
      hasSplitRentalBasis(form, form.followUpAnswers || {}) || form.airbnbInterest === "Yes"
        ? "★★★★★ 物业管理服务：适合法规、分租或长期管理需要专业把关的物业。"
        : "★★★★☆ 物业管理服务：适合希望减少日常沟通、筛选和租后管理工作的业主。",
    ];
    if (form.airbnbInterest === "Yes" || hasSplitRentalBasis(form, form.followUpAnswers || {}) || hasOwnerOccupancyLegalWarning(form)) {
      items.push("建议预约专业咨询，先确认法规、租金定位和整租 / 分租路径。");
    }
    return items;
  }
  const items = [
    `★★★★★ AI Marketing Package: Best for turning ${confirmedText} into accurate ad copy and photo order.`,
    "★★★★☆ Professional Rental Listing: Suitable for owners who need a formal listing launch, market-response testing, rent positioning, and tenant screening.",
    hasSplitRentalBasis(form, form.followUpAnswers || {}) || form.airbnbInterest === "Yes"
      ? "★★★★★ Property Management: Best when regulation, split-rental review, or long-term oversight needs professional control."
      : "★★★★☆ Property Management: Best when the owner wants help with communication, screening, and ongoing rental management.",
  ];
  if (form.airbnbInterest === "Yes" || hasSplitRentalBasis(form, form.followUpAnswers || {}) || hasOwnerOccupancyLegalWarning(form)) {
    items.push("Book a professional consultation before confirming the final path.");
  }
  return items;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizeCellTextForUi(value) {
  return String(value || "").trim();
}

function hasSplitRentalBasis(form, followUps = {}) {
  return ["Main / Upper Unit", "Basement / Secondary Suite", "Whole House with Main + Suite"].includes(form.rentalUnitType) ||
    form.existingSuite === "Yes" ||
    form.separateEntrance === "Yes" ||
    form.separateKitchen === "Yes" ||
    form.canAddKitchen === "Yes" ||
    form.suiteLegalStatus === "Legal" ||
    followUps.suiteSeparateEntrance === "Yes" ||
    followUps.suiteOwnKitchen === "Yes" ||
    followUps.conversionSeparateEntrance === "Yes" ||
    followUps.conversionAddKitchen === "Yes";
}

function buildSupportedFeaturePhrases(form, lang = "en") {
  const items = [];
  const bed = normalizeCellTextForUi(form.bedrooms);
  const bath = normalizeCellTextForUi(form.bathrooms);
  const type = normalizeCellTextForUi(displayOption(form.rentalUnitType || form.propertyBuildingType || form.propertyType, lang));
  if (bed || bath || type) {
    items.push(lang === "zh"
      ? `${bed || "需确认"}房${bath || "需确认"}卫${type ? ` ${type}` : ""}`
      : `${bed || "unconfirmed"} bedroom(s), ${bath || "unconfirmed"} bathroom(s)${type ? ` ${type}` : ""}`);
  }
  if (form.oceanView === "Yes") items.push(lang === "zh" ? "海景" : "ocean view");
  if (form.furnished === "Yes") items.push(lang === "zh" ? "带家具" : "furnished");
  if (Number(form.garageSpaces || 0) > 0) items.push(lang === "zh" ? `${form.garageSpaces} 个车库车位` : `${form.garageSpaces} garage space(s)`);
  if (Number(form.drivewayParking || 0) > 0) items.push(lang === "zh" ? `${form.drivewayParking} 个车道车位` : `${form.drivewayParking} driveway parking space(s)`);
  if (form.privateYard === "Yes") items.push(lang === "zh" ? "私人院子" : "private yard");
  if (form.fencedBackyard === "Yes") items.push(lang === "zh" ? "围栏后院" : "fenced backyard");
  if (form.petFriendly === "Yes") items.push(lang === "zh" ? "接受宠物" : "pet friendly");
  if (form.nearbyCommercialCentre === "Yes") items.push(lang === "zh" ? "靠近商业中心" : "near commercial centre");
  return items;
}

function flattenAssessmentText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenAssessmentText).join("\n");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => key !== "outputGuardWarnings")
      .map(([, item]) => flattenAssessmentText(item))
      .join("\n");
  }
  return "";
}

function validateStrategyAssessmentOutput(summary, form, lang = "en") {
  const text = flattenAssessmentText(summary);
  const lower = text.toLowerCase();
  const warnings = [];
  const add = (message) => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  if (form.oceanView !== "Yes" && /(oceanfront|ocean view|beach access|海景|海边|临海)/i.test(text)) {
    add(lang === "zh" ? "报告出现海景或海边相关词，但当前表单未确认海景。" : "Report mentions ocean view/beach terms, but ocean view is not confirmed in the current form.");
  }
  if (form.furnished !== "Yes" && /(fully furnished|furnished setup|furnished presentation|家具齐全|带家具作为主要卖点)/i.test(text)) {
    add(lang === "zh" ? "报告出现家具卖点，但当前表单未确认 furnished。" : "Report mentions furnished positioning, but furnished is not confirmed in the current form.");
  }
  if (String(form.bedrooms || "").trim() !== "5" && /(5 bedrooms|5-bedroom|5 卧|5房)/i.test(text)) {
    add(lang === "zh" ? "报告出现 5 房描述，但当前表单不是 5 房。" : "Report mentions 5 bedrooms, but the current form is not 5 bedrooms.");
  }
  if (String(form.bathrooms || "").trim() !== "3" && /(3 bathrooms|3-bath|3 卫|3卫)/i.test(text)) {
    add(lang === "zh" ? "报告出现 3 卫描述，但当前表单不是 3 卫。" : "Report mentions 3 bathrooms, but the current form is not 3 bathrooms.");
  }
  if (lower.includes("$4,600") || lower.includes("$4,688") || lower.includes("4688") || lower.includes("4600")) {
    const targetDigits = String(form.targetRent || "").replace(/\D/g, "");
    if (targetDigits !== "4600" && targetDigits !== "4688") {
      add(lang === "zh" ? "报告出现测试租金，但当前 Target Rent 不支持。" : "Report mentions a test rent that is not supported by the current Target Rent.");
    }
  }
  if (!hasSplitRentalBasis(form, form.followUpAnswers || {}) && /(split-rental feasibility is stronger|legal split-rental feasibility|合法分租可能性较强|改成两个单元的潜力)/i.test(text)) {
    add(lang === "zh" ? "报告推断分租可行性，但当前 suite/独立入口/独立厨房资料不足。" : "Report infers split-rental feasibility, but suite/separate entrance/separate kitchen details are insufficient.");
  }
  return warnings;
}

function buildKnowledgeLinks(form, lang) {
  const safeLang = lang === "zh" ? "zh" : "en";
  const groups = [
    {
      title: safeLang === "zh" ? "政府法规链接" : "Government Rules links",
      links: [],
    },
    {
      title: safeLang === "zh" ? "本地市场观察链接" : "Market Insight links",
      links: [],
    },
    {
      title: safeLang === "zh" ? "专业指南链接" : "Professional Guide links",
      links: [],
    },
  ];
  const [government, market, guide] = groups;

  if (hasOwnerOccupancyLegalWarning(form) || getLegalRiskFlag(form) === "Not sure") {
    government.links.push({ href: "/resources#owner-occupancy-card", label: safeLang === "zh" ? "屋主自住规则" : "Owner Occupancy" });
  }
  if (form.airbnbInterest === "Yes") {
    government.links.push({ href: "/resources#str", label: safeLang === "zh" ? "短租政策" : "Airbnb / STR" });
  }
  if (hasSplitRentalBasis(form, form.followUpAnswers || {}) || form.suiteLegalStatus === "Not sure" || form.suiteLegalStatus === "Unauthorized no permit") {
    government.links.push({ href: "/resources#secondary-suite", label: safeLang === "zh" ? "第二套房与合法套间" : "Secondary Suite / Legal Suite" });
    guide.links.push({ href: "/resources#whole-house-vs-split-rental-card", label: safeLang === "zh" ? "整租 vs 分租" : "Whole House vs Split Rental" });
    guide.links.push({ href: "/resources#suite-privacy-hydro-meter-card", label: safeLang === "zh" ? "套间隐私和独立电表" : "Suite Privacy and Separate Hydro Meter" });
  }
  if (form.ownerGoal === "Maximize rent" || form.ownerGoal === "Maximize Rent" || parseMoneyAmount(form.targetRent) >= 3500) {
    market.links.push({ href: "/resources#high-rent-whole-house-risks-card", label: safeLang === "zh" ? "高租金整租风险" : "High-Rent Whole House Rental Risks" });
  }
  if (String(form.city || "").toLowerCase().includes("nanaimo") || String(form.communityArea || "").toLowerCase().includes("nanaimo")) {
    market.links.push({ href: "/resources#nanaimo-market-notes-card", label: safeLang === "zh" ? "Nanaimo 出租市场观察" : "Nanaimo Rental Market Notes" });
  }
  if (form.fencedBackyard === "No" || form.privateYard || form.petFriendly === "Yes") {
    guide.links.push({ href: "/resources#fenced-backyard-matters-card", label: safeLang === "zh" ? "为什么围栏后院重要" : "Why Fenced Backyard Matters" });
  }
  if (form.oceanView === "Yes") {
    guide.links.push({ href: "/resources#ocean-view-rentals-card", label: safeLang === "zh" ? "海景房源如何定位" : "How to Position Ocean View Rentals" });
  }

  return groups.filter((group) => group.links.length > 0);
}

function displayOwnerGoal(goal, lang) {
  if (lang !== "zh") return goal || "the owner's rental goal";
  const map = {
    "Rent ASAP": "尽快出租",
    "Maximize rent": "尽量提高租金",
    "Long-term Stable Tenant": "稳定长期租客",
    "Try Airbnb": "尝试 Airbnb",
    "Prepare for Sale Later": "之后准备出售",
    "Not Sure": "还不确定",
  };
  return map[goal] || "业主出租目标";
}

export async function submitStrategyAssessment(form, lang = "en") {
  const safeLang = normalizeLang(lang);
  const assessmentId = form.assessmentId || createAssessmentId();
  const preliminaryAssessment = form.preliminaryAssessment || generatePreliminaryStrategySummary(form, safeLang);
  const reportZh = form.reportZh || generatePreliminaryStrategySummary(form, "zh");
  const reportEn = form.reportEn || generatePreliminaryStrategySummary(form, "en");
  const legal = form.legalCompliance || {};
  const legalRiskFlag = getLegalRiskFlag(form);
  const ownerOccupancyRelated = legal.previousTenantOwnerOccupancy || "";
  const occupied12Months = legal.previousTenantOwnerOccupancy === "Yes" ? (legal.occupiedAtLeast12Months || "") : "";
  const ownerOccupancyNotes = buildOwnerOccupancyNotes(form, safeLang);
  const followUpAnswersText = formatStrategyFollowUpAnswersPlain(form, safeLang);
  const aiFlags = buildAiFlags(form);
  const aiConfidenceFlags = buildAiConfidenceAndFlags(form, safeLang);
  const servicePath = buildServicePath({ ...form, nextStep: form.nextStep });
  const payload = {
    ...form,
    assessmentId,
    status: "New",
    knownIssues: buildKnownIssuesWithFollowUps(form, safeLang),
    legalRiskFlag,
    ownerOccupancyRelated,
    occupied12Months,
    ownerOccupancyNotes,
    followUpAnswersText,
    aiFlags,
    aiConfidenceFlags,
    servicePath,
    "Legal Risk Flag": legalRiskFlag,
    "Owner Occupancy Related": ownerOccupancyRelated,
    "Occupied 12 Months": occupied12Months,
    "Owner Occupancy Notes": ownerOccupancyNotes,
    "Follow-up Answers": followUpAnswersText,
    "AI Flags": aiFlags,
    "AI Confidence & Flags": aiConfidenceFlags,
    "Service Path": servicePath,
    "Province": form.province || "",
    "Postal Code": form.postalCode || "",
    "Property Building Type": form.propertyBuildingType || "",
    "Rental Unit Type": form.rentalUnitType || "",
    "Outdoor Space Type": form.outdoorSpaceType || "",
    "Fence Status": form.fenceStatus || "",
    "Laundry Type": form.laundryType || "",
    "Utilities Arrangement": form.utilitiesArrangement || "",
    "Shared Areas": form.sharedAreas || "",
    "Suite Legal Status": form.suiteLegalStatus || "",
    "Suite Permit Status": form.suitePermitStatus || "",
    "Suite Hydro Meter": form.suiteHydroMeter || "",
    "Suite Yard Privacy": form.suiteYardPrivacy || "",
    "Suite Shared Areas": form.suiteSharedAreas || "",
    "Suite Rent Impact Notes": form.suiteRentImpactNotes || "",
    "Nearby Commercial Centre": form.nearbyCommercialCentre || "",
    "Location Notes": form.locationNotes || "",
    "Location Rent Premium": form.locationRentPremium || "",
    "Rent Adjustment Factors": form.rentAdjustmentFactors || "",
    preliminaryAssessment,
    reportZh,
    reportEn,
    submittedAt: new Date().toISOString(),
  };

  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }

  const result = await apiPost({
    action: "savePropertyStrategyAssessment",
    data: payload,
  });

  return {
    assessmentId,
    preliminaryAssessment,
    reportZh,
    reportEn,
    ...(result || {}),
  };
}

export async function getRentalIntelligenceKnowledge(form) {
  if (!isApiConnected()) return null;
  try {
    return await apiPost({
      action: "getRentalIntelligenceKnowledge",
      data: {
        communityId: form.communityId || "",
        communityName: form.communityName || form.communityArea || "",
        propertyAddress: form.propertyAddress || "",
        city: form.city || "",
        communityArea: form.communityArea || "",
        locationNotes: form.locationNotes || "",
        propertyType: form.propertyBuildingType || form.propertyType || "",
        propertyBuildingType: form.propertyBuildingType || "",
        rentalUnitType: form.rentalUnitType || "",
        bedrooms: form.bedrooms || "",
        bathrooms: form.bathrooms || "",
        targetRent: form.targetRent || "",
      },
    });
  } catch (error) {
    console.warn("[strategyAssessment] Rental Intelligence Knowledge Base unavailable:", error);
    return null;
  }
}

export async function getRentalIntelligenceCommunities(city = "") {
  if (!isApiConnected()) return [];
  return apiPost({
    action: "getRentalIntelligenceCommunities",
    data: { city: city || "" },
  });
}
