import { apiPost, isApiConnected } from "./api";

export const STRATEGY_ASSESSMENT_SPREADSHEET_ID = "1F3rPmEMsOoTFWYo3CPD76BS4RuRbSPTCB47g5YTHopE";

export const STRATEGY_ASSESSMENT_DISCLAIMER =
  "This is an AI preliminary assessment based on Vanisland Property Management's property management framework. Final recommendation requires professional review.";

export const STRATEGY_ASSESSMENT_DISCLAIMER_ZH =
  "本报告为基于 Vanisland Property Management 物业管理经验框架生成的 AI 初步评估，最终建议需由专业审核确认。";

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

function getLocationProfile(form) {
  const text = [form.city, form.communityArea, form.locationNotes].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("lantzville")) return "lantzville";
  if (text.includes("north nanaimo")) return "north-nanaimo";
  if (text.includes("central nanaimo")) return "central-nanaimo";
  if (text.includes("south nanaimo")) return "south-nanaimo";
  if (text.includes("nanaimo")) return "nanaimo";
  return "general";
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
    communityArea: "",
    propertyType: "",
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

  if (form.existingSuite === "Yes") {
    add("Existing Suite", "suiteSeparateEntrance", "Does the suite have a separate entrance?");
    add("Existing Suite", "suiteOwnKitchen", "Does the suite have its own kitchen?");
    add("Existing Suite", "suiteSeparateLaundry", "Does the suite have separate laundry?");
    add("Existing Suite", "suiteSeparateHydro", "Does it have a separate hydro meter?");
    add("Existing Suite", "suiteUtilitiesSeparated", "Are utilities currently separated or shared?", "choice", ["Separated", "Shared", "Not sure"]);
  }

  if (form.existingSuite === "No") {
    add("Suite Conversion", "conversionBasement", "Is there a basement or lower level that could be converted?");
    add("Suite Conversion", "conversionSeparateEntrance", "Is there a separate entrance or possible separate entrance?");
    add("Suite Conversion", "conversionAddKitchen", "Would you consider adding a kitchen?");
    add("Suite Conversion", "conversionSplitUnits", "Would you consider splitting the home into two rental units?");
  }

  if (form.fencedBackyard === "No") {
    add("Backyard", "backyardAddFence", "Would you consider adding a fenced backyard?");
    add("Backyard", "backyardPrivateArea", "Is there a private outdoor area for tenants?");
    add("Backyard", "backyardShared", "Is the yard shared with another unit?");
  }

  if (form.petFriendly === "Yes") {
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
  if (safeLang === "zh") return `AI 评估信心：${confidence.score}%\nAI 标记：${flags}`;
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
  const community = normalizeRentalIntelligenceKnowledge(rentalIntelligence);
  const summary = {
    executiveSummary: buildExecutiveSummary(form, safeLang),
    propertyStrengths: buildPropertyStrengths(form, followUps, safeLang),
    rentalChallenges: buildRentalChallenges(form, followUps, legalWarning, safeLang),
    suggestedRentalStrategy: buildSuggestedStrategy(form, followUps, safeLang),
    estimatedRentRange: buildRentPositioning(form, safeLang),
    suiteSplitRentalPotential: buildSuiteSplitPotential(form, followUps, safeLang),
    suiteQualityPrivacy: buildSuiteQualityPrivacy(form, safeLang),
    locationRentAdjustment: buildLocationRentAdjustment(form, safeLang),
    communityLocationAnalysis: buildCommunityLocationAnalysis(form, community, safeLang),
    targetTenantProfile: buildTargetTenantProfile(form, community, safeLang),
    communityRentPositioningJudgment: buildCommunityRentPositioningJudgment(form, community, safeLang),
    communityMarketingAngles: buildCommunityMarketingAngles(form, community, safeLang),
    communityRisksToVerify: buildCommunityRisksToVerify(form, community, safeLang),
    airbnbStrRegulationCheck: buildStrReminder(form, safeLang),
    legalComplianceRisk: buildLegalComplianceRisk(form, safeLang),
    aiConfidenceFlags: buildAiConfidenceAndFlags(form, safeLang),
    aiAssessmentConfidence: buildAiAssessmentConfidence(form, confidence, safeLang),
    servicePath: buildServicePath(form),
    marketingSuggestions: buildMarketingSuggestions(form, followUps, safeLang),
    ownerGoalAlignment: buildProfessionalPreliminaryRecommendation(form, followUps, safeLang),
    professionalPreliminaryRecommendation: buildProfessionalPreliminaryRecommendation(form, followUps, safeLang),
    recommendedNextStep: buildServiceRecommendation(form, safeLang, community),
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

function buildExecutiveSummary(form, lang) {
  const type = lang === "zh" ? (form.propertyType === "House" ? "独立屋" : form.propertyType || "该物业") : (form.propertyType || "This property");
  const location = formatAssessmentLocation(form, lang);
  const target = formatCurrency(form.targetRent, lang);
  const profile = getLocationProfile(form);
  const propertyDesc = formatPropertyDescription(form, lang);
  const locationNoteZh = {
    lantzville: "Lantzville 的安静居住属性有价值；具体位置卖点需以业主填写和照片确认。",
    "north-nanaimo": "North Nanaimo 通常更容易支撑便利性和家庭型租客需求，但仍需结合房屋状态、停车和同类竞品判断。",
    "central-nanaimo": "Central Nanaimo 的优势通常在通勤和生活便利性，租金策略应强调实际便利，而不是只强调面积。",
    "south-nanaimo": "South Nanaimo 的租金定位通常需要更重视价格竞争力和租客便利性，避免过高定价拉长空置期。",
    nanaimo: "Nanaimo 市场需要结合具体社区、通勤便利、停车和房屋状态判断，不能只按卧室数量定价。",
    general: "地段价值需要结合具体社区、通勤便利、停车和房屋状态判断。",
  }[profile];
  const locationNoteEn = {
    lantzville: "Lantzville's quiet residential positioning has value; specific location advantages must be confirmed from the owner's answers and photos.",
    "north-nanaimo": "North Nanaimo can support stronger family and convenience-driven demand, subject to condition, parking, and comparable listings.",
    "central-nanaimo": "Central Nanaimo value is usually tied to convenience and access, so the rent strategy should emphasize practical location benefits rather than size alone.",
    "south-nanaimo": "South Nanaimo positioning usually calls for stronger price discipline and convenience messaging to avoid extended vacancy.",
    nanaimo: "Nanaimo pricing should be based on the exact neighbourhood, convenience, parking, and property condition rather than bedroom count alone.",
    general: "Location value should be confirmed against the exact neighbourhood, access, parking, and property condition.",
  }[profile];
  if (lang === "zh") {
    return [
      `${type}位于 ${location}，当前填写为${propertyDesc}。本次目标以${displayOwnerGoal(form.ownerGoal, lang)}为主，目标租金为 ${target}/月。${locationNoteZh}`,
      buildStrategyScopeSentence(form, lang),
    ];
  }
  return [
    `${type} at ${location} is being assessed for ${displayOwnerGoal(form.ownerGoal, lang)}, with current inputs showing ${propertyDesc}. Owner target rent is ${target}/month. ${locationNoteEn}`,
    buildStrategyScopeSentence(form, lang),
  ];
}

function buildPropertyStrengths(form, followUps, lang) {
  const items = [];
  const bed = Number(form.bedrooms || 0);
  const bath = normalizeCellTextForUi(form.bathrooms);
  const garage = Number(form.garageSpaces || 0);
  const driveway = Number(form.drivewayParking || 0);
  if (form.oceanView === "Yes") {
    items.push(lang === "zh"
      ? "已确认有海景，可作为广告标题、封面照片和第一组照片的卖点。"
      : "Ocean view is confirmed and can be used in the headline, cover photo, and first photo sequence.");
  }
  if (form.furnished === "Yes") {
    items.push(lang === "zh"
      ? "已确认带家具，可作为减少搬家准备的便利卖点。"
      : "Furnished status is confirmed and can be positioned as a move-in convenience.");
  }
  if (bed > 0 || bath) {
    items.push(lang === "zh"
      ? `当前记录为 ${form.bedrooms || "需确认"} 房 ${bath || "需确认"} 卫，应按这个实际户型定位租客。`
      : `Current record shows ${form.bedrooms || "unconfirmed"} bedroom(s) and ${bath || "unconfirmed"} bathroom(s), so tenant positioning should use this layout only.`);
  }
  if (garage > 0) {
    items.push(lang === "zh"
      ? `已填写 ${garage} 个车库车位，可作为停车便利卖点。`
      : `${garage} garage space(s) are confirmed and can be used as a parking convenience point.`);
  }
  if (driveway > 0) {
    items.push(lang === "zh"
      ? `已填写 ${driveway} 个车道车位，可在广告中准确说明。`
      : `${driveway} driveway parking space(s) are confirmed and should be stated accurately.`);
  }
  if (form.privateYard === "Yes") {
    items.push(lang === "zh"
      ? "已确认有私人户外空间，可作为真实卖点；围栏和隐私程度仍需准确说明。"
      : "Private outdoor space is confirmed and can be used as a real value point; fencing and privacy should still be described accurately.");
  }
  if (form.separateEntrance === "Yes") {
    items.push(lang === "zh"
      ? "已确认有独立入口，可进入后续合规审核；不得在未审核前直接宣传为合法套间。"
      : "Separate entrance is confirmed and can move into compliance review; it should not be advertised as a legal suite before review.");
  }
  return items.length ? items : [lang === "zh" ? "需要结合照片、平面布局和房屋状态进一步确认物业优势。" : "Property strengths need photo, layout, and condition review."];
}

function buildRentalChallenges(form, followUps, legalWarning, lang) {
  const items = [];
  if (form.targetRent) {
    items.push(lang === "zh"
      ? `目标租金已填写为 ${formatCurrency(form.targetRent, lang)}/月，需要用当前真实户型、状态和位置验证市场接受度。`
      : `Target rent is ${formatCurrency(form.targetRent, lang)}/month and should be validated against the current layout, condition, and location.`);
  }
  if (hasSplitRentalBasis(form, followUps) && form.utilitiesShared === "Yes") {
    items.push(lang === "zh"
      ? "已填写水电共用；如后续审核额外出租配置，需要提前设计费用分摊和租约说明。"
      : "Shared utilities are noted; if an additional rental configuration is reviewed later, cost allocation and lease wording need care.");
  }
  if (form.airbnbInterest === "Yes") {
    items.push(lang === "zh"
      ? "已选择 Airbnb / 短租意向，必须先核查 BC 和所在城市当前规则、主要住所要求和运营限制。"
      : "Airbnb / STR interest is selected, so BC and city rules, principal-residence requirements, and operating limits must be checked first.");
  }
  if (form.fencedBackyard === "No" || form.fencedBackyard === "Unsure" || !form.fencedBackyard) {
    items.push(lang === "zh"
      ? "围栏后院未确认，不能把完整围栏作为卖点；需进一步确认。"
      : "Fenced backyard is not confirmed, so a fully fenced yard cannot be used as a value point; it needs confirmation.");
  }
  if (legalWarning) {
    items.push(lang === "zh"
      ? "已触发屋主自住相关法规风险，正式挂牌前必须先进行专业审核并核查当前规则。"
      : "An owner-occupancy compliance risk was triggered; professional review should verify current rules before listing.");
  }
  return items.length ? items : [lang === "zh" ? "目前没有明显高风险项，但正式挂牌前仍需审核照片、状态、合规和市场价格。" : "No major high-risk issue was flagged, but photos, condition, compliance, and market rent still need review."];
}

function buildSuggestedStrategy(form, followUps, lang) {
  const strengths = buildSupportedFeaturePhrases(form, lang);
  const featureText = strengths.length
    ? strengths.join(lang === "zh" ? "、" : ", ")
    : (lang === "zh" ? "当前已填写的物业条件" : "the currently submitted property details");
  const hasSuiteBasis = hasSplitRentalBasis(form, followUps);
  if (lang === "zh") {
    if (form.airbnbInterest === "Yes") {
      const items = [
        `第一策略：先按当前资料评估长租或整租路径，广告只突出已确认卖点：${featureText}。`,
      ];
      items.push(hasSuiteBasis
        ? "第二策略：可同步评估合法分租可能性，但必须逐项确认独立入口、厨房、洗衣、水电、停车和合规。"
        : "第二策略：额外出租配置目前资料不足，只能标记为需进一步确认。");
      items.push("第三策略：Airbnb / STR 只作为备选方向，必须先完成法规核查，不能在未确认规则前承诺短租收益。");
      return items;
    }
    if (form.ownerGoal === "Rent ASAP") {
      return [
        "优先采用务实定价和快速展示策略，减少空置时间。",
        `广告需清楚说明当前已确认内容：${featureText}，并对未填写信息标注需进一步确认，避免无效咨询。`,
      ];
    }
    return [
      `建议先基于当前已填写条件进入市场测试租客反馈：${featureText}。`,
      hasSuiteBasis
        ? "如果 30 天内没有足够合格申请，可复核租金定位，并评估合法分租方案。"
        : "如果 30 天内没有足够合格申请，应先复核租金定位、照片和广告表达；额外出租配置需进一步确认。",
    ];
  }

  if (form.airbnbInterest === "Yes") {
    const items = [
      `Primary strategy: assess a long-term or whole-home rental path using only confirmed inputs: ${featureText}.`,
    ];
    items.push(hasSuiteBasis
      ? "Secondary strategy: review legal split-rental feasibility, with entrance, kitchen, laundry, utilities, parking, and compliance confirmed one by one."
      : "Secondary strategy: additional rental configuration is not supported by current inputs and should be marked as needing confirmation.");
    items.push("STR strategy: keep Airbnb as an option only after BC and municipal rules are confirmed.");
    return items;
  }
  if (form.ownerGoal === "Rent ASAP") {
    return [
      "Use practical pricing and quick showing availability to reduce vacancy.",
      `The listing should state confirmed details only: ${featureText}. Missing items should be marked as needing confirmation.`,
    ];
  }
  return [
    `Start with a rental launch based on the submitted property details: ${featureText}.`,
    hasSuiteBasis
      ? "If strong applications do not appear within 30 days, revisit rent positioning or legal split-rental feasibility."
      : "If strong applications do not appear within 30 days, revisit rent positioning, photos, and listing presentation first; additional rental configuration needs further confirmation.",
  ];
}

function buildRentPositioning(form, lang) {
  const target = formatCurrency(form.targetRent, lang);
  const propertyDesc = formatPropertyDescription(form, lang);
  if (lang === "zh") {
    if (!form.targetRent) {
      return [
        `目前未填写目标租金。当前物业资料为${propertyDesc}，租金需进一步确认。`,
        "不要套用测试案例或按单一卖点定价，必须结合当前房屋状态、照片、位置和目标租客数量。",
      ];
    }
    return [
      `业主当前填写的目标租金为 ${target}/月。`,
      `该租金建议必须围绕本次填写资料判断：${propertyDesc}。未填写或未确认的卖点不得用于提高租金定位。`,
      "建议先用当前真实条件测试市场反馈；如果咨询量或申请质量不足，应及时复核目标租金和展示方式。",
    ];
  }
  if (!form.targetRent) {
    return [
      `No target rent was entered. Current property inputs are ${propertyDesc}; rent needs further confirmation.`,
      "Do not reuse any test-case rent or unconfirmed feature. Pricing must reflect current condition, photos, location, and tenant depth.",
    ];
  }
  return [
    `Owner target rent is ${target}/month.`,
    `This rent position must be judged from the current submission: ${propertyDesc}. Unconfirmed features must not be used to justify rent.`,
    "Launch with accurate photos and confirmed value points first; if inquiry quality is weak, revisit the target rent and presentation.",
  ];
}

function buildSuiteSplitPotential(form, followUps, lang = "en") {
  const hasBasis = hasSplitRentalBasis(form, followUps);
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
  if (!hasSplitRentalBasis(form, form.followUpAnswers || {}) && !form.suiteLegalStatus && !form.suiteYardPrivacy && !form.suiteSharedAreas && !form.suiteRentImpactNotes) {
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
  if (form.suiteHydroMeter === "Yes") notes.push(lang === "zh" ? "已确认独立电表，可减少水电分摊争议。" : "Separate hydro meter is confirmed and can reduce utility-sharing disputes.");
  if (form.suiteHydroMeter === "No") notes.push(lang === "zh" ? "当前没有独立电表，相关费用说明需进一步确认。" : "There is no separate hydro meter, so utility wording needs further confirmation.");
  if (form.suiteYardPrivacy === "Fully private") notes.push(lang === "zh" ? "完全私密的户外空间能明显提高租金吸引力和申请质量。" : "Fully private outdoor space improves rent appeal and application quality.");
  if (form.suiteYardPrivacy === "Partial") notes.push(lang === "zh" ? "部分私密院子仍有价值，但广告中必须清楚说明哪些区域独享、哪些区域共用。" : "Partial yard privacy still has value, but exclusive versus shared areas must be described clearly.");
  if (form.suiteYardPrivacy === "Shared yard") notes.push(lang === "zh" ? "共用院子会降低宠物和家庭租客吸引力，必须设定清晰使用规则。" : "Shared yard use reduces pet and family tenant appeal unless clear rules are set.");
  if (form.suiteYardPrivacy === "No yard") notes.push(lang === "zh" ? "没有院子会限制宠物和家庭租客吸引力，租金定位需更保守。" : "No yard limits pet and family appeal and calls for more conservative positioning.");
  if (form.suiteSharedAreas) {
    notes.push(lang === "zh"
      ? "已记录套间共用区域信息；正式分租前需要明确哪些空间独享、哪些空间共用。"
      : `Shared areas noted: ${cleanSentence(form.suiteSharedAreas)}`);
  }
  if (form.suiteRentImpactNotes) {
    notes.push(lang === "zh"
      ? `套间租金影响备注：${cleanSentence(form.suiteRentImpactNotes)}`
      : `Rent impact notes: ${cleanSentence(form.suiteRentImpactNotes)}`);
  }
  if (form.existingSuite === "Yes" || form.suiteLegalStatus) {
    notes.push(lang === "zh"
      ? "请查看房东知识中心第二套房 / legal suite 指南，并经专业审核后再作最终决定。"
      : "Please review the Secondary Suite / Legal Suite guide in the Landlord Knowledge Center and confirm through professional review before making a final decision.");
  }
  return notes.length ? notes : (lang === "zh" ? "相关品质、隐私、水电和院子条件需要结合平面布局与照片确认。" : "Quality, privacy, utilities, and yard conditions need layout and photo review.");
}

function buildLocationRentAdjustment(form, lang = "en") {
  const notes = [];
  const profile = getLocationProfile(form);
  if (form.nearbyCommercialCentre === "Yes") {
    notes.push(lang === "zh" ? "靠近商业中心能支持一定租金溢价，尤其适合重视便利性的租客。" : "Commercial-centre access supports a modest rent premium for tenants prioritizing convenience.");
  }
  const locationNotes = {
    lantzville: lang === "zh"
      ? "Lantzville 的安静居住属性有价值；具体位置卖点需以业主填写和照片确认，不能默认写入报告。"
      : "Lantzville's quiet residential appeal has value; specific location advantages need confirmation from owner inputs and photos.",
    "north-nanaimo": lang === "zh"
      ? "North Nanaimo 通常更容易吸引家庭型和重视便利性的租客，租金可更积极，但仍需看竞品、状态和停车。"
      : "North Nanaimo typically supports stronger family and convenience-driven demand, allowing more confident pricing when condition, parking, and comparables support it.",
    "central-nanaimo": lang === "zh"
      ? "Central Nanaimo 更适合强调通勤、生活便利和实际可达性，租金定位应避免只靠房屋面积支撑。"
      : "Central Nanaimo should emphasize commute, convenience, and access; rent positioning should not rely on property size alone.",
    "south-nanaimo": lang === "zh"
      ? "South Nanaimo 通常需要更保守的租金定位和更清晰的价值说明，以减少空置风险。"
      : "South Nanaimo usually calls for more conservative rent positioning and clearer value messaging to reduce vacancy risk.",
    nanaimo: lang === "zh"
      ? "Nanaimo 内不同社区差异明显，租金判断需要结合具体位置、交通、停车、房屋状态和同类竞品。"
      : "Nanaimo neighbourhoods vary meaningfully; pricing should reflect exact location, access, parking, condition, and comparable listings.",
    general: lang === "zh"
      ? "地段价值需要结合城市、社区、通勤便利、停车和附近同类出租房源进一步确认。"
      : "Location value should be confirmed against city, community, access, parking, and nearby comparable rentals.",
  };
  notes.push(locationNotes[profile]);
  if (profile !== "lantzville" && form.oceanView === "Yes") {
    notes.push(lang === "zh" ? "海景会提升广告吸引力，但仍需结合实际可见角度、照片质量和目标租客深度判断。" : "Ocean view can improve listing appeal, but actual visibility, photo quality, and tenant depth still matter.");
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
  if (form.locationNotes) {
    notes.push(lang === "zh"
      ? `位置备注：${cleanSentence(form.locationNotes)}`
      : `Location notes: ${cleanSentence(form.locationNotes)}`);
  }
  return notes.length ? notes : (lang === "zh" ? "地段价值需要结合附近可比出租房源和租客便利性进一步确认。" : "Location value should be confirmed against nearby comparable rentals and tenant convenience.");
}

function firstKnowledgeValue(record, names) {
  record = record || {};
  for (const name of names) {
    if (record[name]) return String(record[name]).trim();
  }
  const lowerMap = Object.fromEntries(Object.entries(record).map(([key, value]) => [String(key).toLowerCase(), value]));
  for (const name of names) {
    const value = lowerMap[String(name).toLowerCase()];
    if (value) return String(value).trim();
  }
  return "";
}

function joinKnowledgeRows(rows, preferredFields) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => firstKnowledgeValue(row, preferredFields) || Object.entries(row || {})
      .filter(([, value]) => String(value || "").trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join("; "))
    .filter(Boolean)
    .slice(0, 4);
}

function translateKnowledgeReference(text, lang) {
  const clean = cleanSentence(text);
  if (!clean) return lang === "zh" ? "需进一步确认" : "Needs further confirmation";
  if (lang !== "zh") return clean;
  const replacements = [
    [/\bnot automatic premium rent\b/gi, "不能自动作为高租金依据"],
    [/\bmust be verified\b/gi, "必须核实"],
    [/\breference only\b/gi, "仅供参考"],
    [/\bexact address\b/gi, "具体地址"],
    [/\bcurrent comparable listings\b/gi, "当前可比房源"],
    [/\bautomatic premium rent\b/gi, "自动高租金"],
    [/\brental-market\b/gi, "出租市场"],
    [/\brental market\b/gi, "出租市场"],
    [/\brent positioning\b/gi, "租金定位"],
    [/\btenant appeal\b/gi, "租客吸引力"],
    [/\bdevelopment trend\b/gi, "发展趋势"],
    [/\blegal suite\b/gi, "合法 suite"],
    [/\bsmall households\b/gi, "小家庭"],
    [/\bresidential\b/gi, "住宅型"],
    [/\bcommunity\b/gi, "社区"],
    [/\brenters\b/gi, "租客"],
    [/\btenant\b/gi, "租客"],
    [/\bstudents\b/gi, "学生"],
    [/\bprofessionals\b/gi, "专业人士"],
    [/\bfamilies\b/gi, "家庭"],
    [/\bquiet\b/gi, "安静"],
    [/\blifestyle\b/gi, "生活方式"],
    [/\btrails\b/gi, "步道"],
    [/\btrail\b/gi, "步道"],
    [/\blake\b/gi, "湖"],
    [/\bparks\b/gi, "公园"],
    [/\bpark\b/gi, "公园"],
    [/\bschools\b/gi, "学校"],
    [/\bschool\b/gi, "学校"],
    [/\bshopping\b/gi, "购物"],
    [/\bservices\b/gi, "服务"],
    [/\btransit\b/gi, "公交"],
    [/\baccess\b/gi, "通达性"],
    [/\bparking\b/gi, "停车"],
    [/\blaundry\b/gi, "洗衣"],
    [/\bverified\b/gi, "已核实"],
    [/\bverify\b/gi, "核实"],
  ];
  return replacements.reduce((result, [pattern, to]) => result.replace(pattern, to), clean);
}

function normalizeRentalIntelligenceKnowledge(data) {
  const base = data?.communityKnowledgeBase || {};
  const communityName = data?.communityName ||
    firstKnowledgeValue(base, ["Community", "Community Name", "Community_Name", "Neighbourhood", "Neighborhood", "Area"]) ||
    "Generic Nanaimo";
  const tags = joinKnowledgeRows(data?.communityTags, ["Tag", "Tags", "Community Tag", "Description", "Notes"]);
  const scoring = joinKnowledgeRows(data?.communityScoring, ["Score", "Scoring Notes", "Rent Score", "Demand Score", "Notes"]);
  const fit = joinKnowledgeRows(data?.propertyFitMatrix, ["Fit Notes", "Property Fit", "Best Fit", "Notes", "Matrix Notes"]);
  const hints = joinKnowledgeRows(data?.aiDecisionHints, ["Hint", "Decision Hint", "AI Hint", "Recommendation", "Notes"]);

  return {
    communityName,
    matchType: data?.matchType || "fallback",
    matchedKeyword: data?.matchedKeyword || "",
    matchScore: data?.matchScore || 0,
    profile: firstKnowledgeValue(base, ["Profile", "Community Profile", "profile", "Overview", "Description"]) || "General Nanaimo rental-market reference.",
    residentProfile: firstKnowledgeValue(base, ["Resident Profile", "residentProfile", "Resident_Profile", "Residents", "Demographics"]) || tags.join("; ") || "Tenant profile needs further confirmation by exact address.",
    nearbySchools: firstKnowledgeValue(base, ["Nearby Schools", "nearbySchools", "Schools", "School Notes"]) || "School catchment must be verified by exact address.",
    shoppingAndServices: firstKnowledgeValue(base, ["Shopping And Services", "Shopping & Services", "shoppingAndServices", "Services", "Shopping"]) || "Shopping and services should be verified by exact address.",
    parksTrailsLifestyle: firstKnowledgeValue(base, ["Parks Trails Lifestyle", "Parks / Trails / Lifestyle", "parksTrailsLifestyle", "Parks", "Lifestyle"]) || "Parks, trails, and lifestyle access should be verified by exact address.",
    transitAndAccess: firstKnowledgeValue(base, ["Transit And Access", "Transit & Access", "transitAndAccess", "Transit", "Access"]) || "Transit and access should be verified by exact address.",
    developmentTrend: firstKnowledgeValue(base, ["Development Trend", "developmentTrend", "Trend", "Future Trend"]) || scoring.join("; ") || "Development trend is a reference judgment only.",
    tenantAppeal: firstKnowledgeValue(base, ["Tenant Appeal", "tenantAppeal", "Tenant Demand", "Demand"]) || fit.join("; ") || "Tenant appeal should be confirmed from property facts and market feedback.",
    rentPositioningNotes: firstKnowledgeValue(base, ["Rent Positioning Notes", "rentPositioningNotes", "Rent Positioning", "Rent Notes"]) || scoring.join("; ") || "Use target rent and current comparable listings as the starting point.",
    risksAndCautions: firstKnowledgeValue(base, ["Risks And Cautions", "Risks / Cautions", "risksAndCautions", "Risks", "Cautions"]) || "Do not overstate school, rent, suite, or tenant-quality claims.",
    marketingAngles: firstKnowledgeValue(base, ["Marketing Angles", "marketingAngles", "Marketing", "Positioning"]) || tags.join("; ") || "Use accurate photos and verified nearby conveniences.",
    mabelProfessionalNotes: firstKnowledgeValue(base, ["Mabel Professional Notes", "mabelProfessionalNotes", "Professional Notes", "Mabel Notes"]) || hints.join("; ") || "Property facts remain first priority.",
    lastReviewed: firstKnowledgeValue(base, ["Last Reviewed", "lastReviewed", "Reviewed", "Updated At"]) || data?.lastLoadedAt || "",
    tags,
    scoring,
    fit,
    hints,
  };
}

function communityReferencePrefix(community, lang = "en") {
  const matched = community.matchType === "keyword"
    ? (community.matchedKeyword
      ? (lang === "zh" ? `匹配关键词：${community.matchedKeyword}` : `matched keyword: ${community.matchedKeyword}`)
      : (lang === "zh" ? "已通过 Knowledge Base 关键词匹配" : "matched by Knowledge Base keywords"))
    : (lang === "zh" ? "未匹配到具体社区，使用 Nanaimo 通用参考" : "no specific community matched; using general Nanaimo reference");
  return lang === "zh"
    ? `社区参考：${community.communityName}（${matched}）。以下为参考判断，需以具体地址、照片和业主填写资料确认。`
    : `Community reference: ${community.communityName} (${matched}). This is reference guidance only and must be confirmed against the exact address, photos, and owner inputs.`;
}

function buildCommunityLocationAnalysis(form, community, lang = "en") {
  const notes = [communityReferencePrefix(community, lang)];
  if (lang === "zh") {
    notes.push(`社区画像：${translateKnowledgeReference(community.profile, lang)}`);
    notes.push(`学校参考：${translateKnowledgeReference(community.nearbySchools, lang)}`);
    notes.push(`购物与服务：${translateKnowledgeReference(community.shoppingAndServices, lang)}`);
    notes.push(`公园 / Trail / Lifestyle：${translateKnowledgeReference(community.parksTrailsLifestyle, lang)}`);
    notes.push(`交通与通达：${translateKnowledgeReference(community.transitAndAccess, lang)}`);
    notes.push(`未来趋势参考：${translateKnowledgeReference(community.developmentTrend, lang)}`);
    if (community.tags?.length) notes.push(`社区标签参考：${community.tags.map((item) => translateKnowledgeReference(item, lang)).join("；")}`);
    if (form.locationNotes) notes.push(`业主位置备注优先：${cleanSentence(form.locationNotes)}`);
    return notes;
  }
  notes.push(`Profile: ${community.profile}`);
  notes.push(`Schools reference: ${community.nearbySchools}`);
  notes.push(`Shopping and services: ${community.shoppingAndServices}`);
  notes.push(`Parks / trails / lifestyle: ${community.parksTrailsLifestyle}`);
  notes.push(`Transit and access: ${community.transitAndAccess}`);
  notes.push(`Development trend reference: ${community.developmentTrend}`);
  if (community.tags?.length) notes.push(`Community tags reference: ${community.tags.join("; ")}`);
  if (form.locationNotes) notes.push(`Owner location notes take priority: ${cleanSentence(form.locationNotes)}`);
  return notes;
}

function buildTargetTenantProfile(form, community, lang = "en") {
  const propertyFacts = buildSupportedFeaturePhrases(form, lang);
  if (lang === "zh") {
    const notes = [
      `居民类型参考：${translateKnowledgeReference(community.residentProfile, lang)}`,
      `租客吸引力参考：${translateKnowledgeReference(community.tenantAppeal, lang)}`,
    ];
    if (community.fit?.length) notes.push(`Property Fit Matrix 参考：${community.fit.map((item) => translateKnowledgeReference(item, lang)).join("；")}`);
    if (propertyFacts.length) notes.push(`当前房源事实优先：${propertyFacts.join("、")}。`);
    notes.push("最终目标租客需结合租金、房屋状态、宠物政策、停车和看房反馈确认。");
    return notes;
  }
  const notes = [
    `Resident profile reference: ${community.residentProfile}`,
    `Tenant appeal reference: ${community.tenantAppeal}`,
  ];
  if (community.fit?.length) notes.push(`Property Fit Matrix reference: ${community.fit.join("; ")}`);
  if (propertyFacts.length) notes.push(`Current property facts take priority: ${propertyFacts.join(", ")}.`);
  notes.push("Final target tenant profile should be confirmed with rent, condition, pet policy, parking, and showing feedback.");
  return notes;
}

function buildCommunityRentPositioningJudgment(form, community, lang = "en") {
  const target = formatCurrency(form.targetRent, lang);
  if (lang === "zh") {
    return [
      `当前 Target Rent：${target}/月。`,
      `社区租金定位参考：${translateKnowledgeReference(community.rentPositioningNotes, lang)}`,
      ...(community.scoring?.length ? [`Community Scoring 参考：${community.scoring.map((item) => translateKnowledgeReference(item, lang)).join("；")}`] : []),
      "租金判断必须优先使用当前记录的 bedrooms、bathrooms、property type、parking、yard、pet policy、furnished 和景观字段。",
      "缺失或未确认的社区卖点只能写需进一步确认，不能用于抬高租金。",
    ];
  }
  return [
    `Current Target Rent: ${target}/month.`,
    `Community rent-positioning reference: ${community.rentPositioningNotes}`,
    ...(community.scoring?.length ? [`Community Scoring reference: ${community.scoring.join("; ")}`] : []),
    "Rent judgment must prioritize the current record's bedrooms, bathrooms, property type, parking, yard, pet policy, furnished status, and view field.",
    "Missing or unconfirmed community advantages should be marked as needing confirmation and must not be used to lift rent positioning.",
  ];
}

function buildCommunityMarketingAngles(form, community, lang = "en") {
  const baseAngles = lang === "zh"
    ? ["客厅", "厨房", "卧室", "外观", "停车", "清洁状态"]
    : ["living room", "kitchen", "bedrooms", "exterior", "parking", "clean condition"];
  const conditionalAngles = [];
  if (form.oceanView === "Yes") conditionalAngles.push(lang === "zh" ? "已确认海景照片" : "confirmed ocean-view photos");
  if (form.furnished === "Yes") conditionalAngles.push(lang === "zh" ? "已确认家具配置" : "confirmed furnished setup");
  if (Number(form.garageSpaces || 0) > 0) conditionalAngles.push(lang === "zh" ? "已确认车库" : "confirmed garage");
  if (form.privateYard === "Yes" || form.fencedBackyard === "Yes") conditionalAngles.push(lang === "zh" ? "已确认户外空间" : "confirmed outdoor space");

  if (lang === "zh") {
    return [
      `基础照片 / 文案角度：${baseAngles.join("、")}。`,
      `社区营销角度参考：${translateKnowledgeReference(community.marketingAngles, lang)}`,
      conditionalAngles.length ? `当前字段支持的额外角度：${conditionalAngles.join("、")}。` : "当前没有额外特殊卖点字段支持，营销应保持基础、准确。",
      ...(community.hints?.length ? [`AI Decision Hints 参考：${community.hints.map((item) => translateKnowledgeReference(item, lang)).join("；")}`] : []),
      `Mabel 专业备注：${translateKnowledgeReference(community.mabelProfessionalNotes, lang)}`,
    ];
  }
  return [
    `Base photo / copy angles: ${baseAngles.join(", ")}.`,
    `Community marketing angle reference: ${community.marketingAngles}`,
    conditionalAngles.length ? `Additional angles supported by current fields: ${conditionalAngles.join(", ")}.` : "No additional special-feature fields are confirmed, so marketing should stay basic and accurate.",
    ...(community.hints?.length ? [`AI Decision Hints reference: ${community.hints.join("; ")}`] : []),
    `Mabel professional notes: ${community.mabelProfessionalNotes}`,
  ];
}

function buildCommunityRisksToVerify(form, community, lang = "en") {
  const missing = [];
  if (!form.communityArea) missing.push(lang === "zh" ? "具体社区" : "specific community");
  if (!form.locationNotes) missing.push(lang === "zh" ? "位置备注" : "location notes");
  if (!form.fencedBackyard) missing.push(lang === "zh" ? "后院围栏" : "fenced backyard");
  if (!form.petFriendly) missing.push(lang === "zh" ? "宠物政策" : "pet policy");
  if (!form.availableDate) missing.push(lang === "zh" ? "可出租日期" : "available date");

  if (lang === "zh") {
    const notes = [`社区风险 / 待核实：${translateKnowledgeReference(community.risksAndCautions, lang)}`];
    if (missing.length) notes.push(`当前记录缺失：${missing.join("、")}，报告只能写需进一步确认。`);
    notes.push(`资料更新时间：${community.lastReviewed}`);
    return notes;
  }
  const notes = [`Community risks / items to verify: ${community.risksAndCautions}`];
  if (missing.length) notes.push(`Missing current-record details: ${missing.join(", ")}; the report should mark these as needing confirmation.`);
  notes.push(`Knowledge last reviewed: ${community.lastReviewed}`);
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
  if (lang === "zh") {
    const items = [
      "专业初步建议：先按当前真实填写资料测试市场，不应依赖未确认卖点或测试案例内容。",
      "如 30 天内合格租客反馈不足，建议重新评估目标租金、照片质量和广告表达。",
  ];
  items.push(hasSuiteBasis
    ? "因当前资料存在套房或独立使用条件，可同步复核合法分租或两个出租单元的可行性。"
    : "当前资料不足以判断额外出租配置；需进一步确认套房、独立入口、独立厨房和平面布局。");
    items.push("Airbnb / STR 暂时只作为备选方案，法规未核查前不建议作为主要出租策略。");
    return items;
  }
  const items = [
    "Professional preliminary recommendation: test the market using the current submitted facts only, without relying on unconfirmed features or sample-case content.",
    "If qualified demand is weak after 30 days, reassess target rent, photo quality, and listing presentation.",
  ];
  items.push(hasSuiteBasis
    ? "Because the current inputs include suite or independent-use signals, legal split-rental or two-unit feasibility can be reviewed."
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
  return lang === "zh"
    ? "本次答案未触发屋主自住相关再出租 warning。正式挂牌前仍建议由专业团队做最终复核。"
    : "No owner-occupancy re-rental warning was triggered from the submitted answers. Professional review should still be completed before listing.";
}

function calculateAssessmentConfidence(form) {
  let score = 72;
  const reasons = [];
  const cautions = [];
  if (form.propertyAddress && form.city) { score += 5; reasons.push("address"); }
  if (form.propertyType && form.bedrooms && form.bathrooms) { score += 5; reasons.push("property"); }
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
  if (form.propertyAddress && form.city) reasons.push(lang === "zh" ? "✓ 地址和城市信息完整" : "✓ Address and city are complete");
  if (form.propertyType && form.bedrooms && form.bathrooms) reasons.push(lang === "zh" ? "✓ 房屋类型、卧室和卫生间信息完整" : "✓ Property type, bedrooms, and bathrooms are complete");
  if (Object.values(form.followUpAnswers || {}).filter(Boolean).length >= 5) reasons.push(lang === "zh" ? "✓ 专业追问已填写" : "✓ Professional follow-up answers were completed");
  if (form.knownIssues) reasons.push(lang === "zh" ? "✓ 已提供业主关注点和已知问题" : "✓ Owner concerns and known issues were provided");
  if (form.airbnbInterest === "Yes") reasons.push(lang === "zh" ? "⚠ STR 法规需实时确认" : "⚠ STR rules need current verification");
  reasons.push(lang === "zh" ? "⚠ 最终租金仍需结合当前市场和照片状态确认" : "⚠ Final rent still needs current market and photo/condition review");
  return [lang === "zh" ? `Assessment Confidence：${getConfidenceLabel(confidence.score, lang)}` : `Assessment Confidence: ${getConfidenceLabel(confidence.score, lang)}`, ...reasons];
}

function buildServiceRecommendation(form, lang, community = null) {
  const confirmed = buildSupportedFeaturePhrases(form, lang);
  const confirmedText = confirmed.length ? confirmed.join(lang === "zh" ? "、" : ", ") : (lang === "zh" ? "当前已填写资料" : "the submitted property details");
  const hints = community?.hints || [];
  if (lang === "zh") {
    const items = [
      `★★★★★ AI Marketing Package：适合把${confirmedText}整理成准确广告和照片顺序。`,
      `★★★★☆ Professional Rental Listing：适合需要正式挂牌、筛选租客和测试 ${formatCurrency(form.targetRent, lang)}/月整租定位的业主。`,
      hasSplitRentalBasis(form, form.followUpAnswers || {}) || form.airbnbInterest === "Yes"
        ? "★★★★★ Property Management：适合法规、分租或长期管理需要专业把关的物业。"
        : "★★★★☆ Property Management：适合希望减少日常沟通、筛选和租后管理工作的业主。",
    ];
    if (form.airbnbInterest === "Yes" || hasSplitRentalBasis(form, form.followUpAnswers || {}) || hasOwnerOccupancyLegalWarning(form)) {
      items.push("建议预约专业咨询，先确认法规、租金定位和整租 / 分租路径。");
    }
    if (hints.length) items.push(`Knowledge Base 下一步参考：${hints.map((item) => translateKnowledgeReference(item, lang)).join("；")}`);
    return items;
  }
  const items = [
    `★★★★★ AI Marketing Package: Best for turning ${confirmedText} into accurate ad copy and photo order.`,
    "★★★★☆ Professional Rental Listing: Best for launching the listing, screening tenants, and testing the owner's rent position.",
    hasSplitRentalBasis(form, form.followUpAnswers || {}) || form.airbnbInterest === "Yes"
      ? "★★★★★ Property Management: Best when regulation, split-rental review, or long-term oversight needs professional control."
      : "★★★★☆ Property Management: Best when the owner wants help with communication, screening, and ongoing rental management.",
  ];
  if (form.airbnbInterest === "Yes" || hasSplitRentalBasis(form, form.followUpAnswers || {}) || hasOwnerOccupancyLegalWarning(form)) {
    items.push("Book a professional consultation before confirming the final path.");
  }
  if (hints.length) items.push(`Knowledge Base next-step reference: ${hints.join("; ")}`);
  return items;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function formatPropertyDescription(form, lang = "en") {
  const unknown = lang === "zh" ? "需进一步确认" : "needs confirmation";
  const bed = normalizeCellTextForUi(form.bedrooms) || unknown;
  const bath = normalizeCellTextForUi(form.bathrooms) || unknown;
  const type = normalizeCellTextForUi(form.propertyType) || unknown;
  const city = normalizeCellTextForUi(form.city) || unknown;
  const community = normalizeCellTextForUi(form.communityArea);
  const parkingParts = [];
  if (normalizeCellTextForUi(form.garageSpaces)) parkingParts.push(lang === "zh" ? `${form.garageSpaces} 个车库车位` : `${form.garageSpaces} garage space(s)`);
  if (normalizeCellTextForUi(form.drivewayParking)) parkingParts.push(lang === "zh" ? `${form.drivewayParking} 个车道车位` : `${form.drivewayParking} driveway parking space(s)`);
  const parking = parkingParts.length ? parkingParts.join(lang === "zh" ? "、" : ", ") : unknown;
  const yard = form.privateYard === "Yes"
    ? (lang === "zh" ? "有私人院子" : "private yard")
    : form.fencedBackyard === "Yes"
      ? (lang === "zh" ? "有围栏后院" : "fenced backyard")
      : unknown;
  const pet = form.petFriendly === "Yes"
    ? (lang === "zh" ? "接受宠物" : "pet friendly")
    : form.petFriendly === "No"
      ? (lang === "zh" ? "不接受宠物" : "not pet friendly")
      : unknown;
  const furnished = form.furnished === "Yes"
    ? (lang === "zh" ? "带家具" : "furnished")
    : form.furnished === "No"
      ? (lang === "zh" ? "不带家具" : "unfurnished")
      : unknown;
  const view = form.oceanView === "Yes"
    ? (lang === "zh" ? "有海景" : "ocean view")
    : form.oceanView === "No"
      ? (lang === "zh" ? "未确认景观卖点" : "no confirmed view feature")
      : unknown;

  if (lang === "zh") {
    return `${bed}房${bath}卫，${type}，城市 ${city}${community ? `，社区 ${community}` : ""}，停车：${parking}，院子：${yard}，宠物政策：${pet}，家具：${furnished}，景观：${view}`;
  }
  return `${bed} bedroom(s), ${bath} bathroom(s), ${type}, city ${city}${community ? `, community ${community}` : ""}, parking: ${parking}, yard: ${yard}, pet policy: ${pet}, furniture: ${furnished}, view: ${view}`;
}

function normalizeCellTextForUi(value) {
  return String(value || "").trim();
}

function buildStrategyScopeSentence(form, lang = "en") {
  const hasSuiteBasis = hasSplitRentalBasis(form, form.followUpAnswers || {});
  if (lang === "zh") {
    const parts = ["根据目前资料，报告只能使用业主本次填写的信息生成。"];
    parts.push(hasSuiteBasis
      ? "分租方向可作为待审核选项，但仍需合规、平面布局和独立使用条件确认。"
      : "未填写或未确认套间、独立入口、独立厨房时，额外出租配置只能标记为需进一步确认。");
    parts.push("最终策略需结合照片、房屋状态、当前市场反馈和专业审核确认。");
    return parts.join("");
  }
  const parts = ["Based on the current information, this report can only use the owner's current submitted inputs. "];
  parts.push(hasSuiteBasis
    ? "Split rental can be reviewed as a pending option, but compliance, layout, and independent-use details still need confirmation. "
    : "Additional rental configuration can only be marked as needing confirmation unless suite, separate entrance, and separate kitchen details are confirmed. ");
  parts.push("Final strategy requires photos, property condition, current market feedback, and professional confirmation.");
  return parts.join("");
}

function hasSplitRentalBasis(form, followUps = {}) {
  return form.existingSuite === "Yes" ||
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
  const type = normalizeCellTextForUi(form.propertyType);
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
    add(lang === "zh" ? "报告出现海景/海边相关词，但当前表单未确认 ocean view。" : "Report mentions ocean view/beach terms, but ocean view is not confirmed in the current form.");
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
    ...(result || {}),
  };
}

export async function getRentalIntelligenceKnowledge(form) {
  if (!isApiConnected()) return null;
  try {
    return await apiPost({
      action: "getRentalIntelligenceKnowledge",
      data: {
        propertyAddress: form.propertyAddress || "",
        city: form.city || "",
        communityArea: form.communityArea || "",
        locationNotes: form.locationNotes || "",
        propertyType: form.propertyType || "",
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
