import { apiPost, isApiConnected } from "./api";

export const STRATEGY_ASSESSMENT_SPREADSHEET_ID = "1F3rPmEMsOoTFWYo3CPD76BS4RuRbSPTCB47g5YTHopE";

export const STRATEGY_ASSESSMENT_DISCLAIMER =
  "This is an AI preliminary assessment based on Mabel Chen's rental management framework. Final recommendation requires Mabel's professional review.";

export const STRATEGY_ASSESSMENT_DISCLAIMER_ZH =
  "本报告为基于 Mabel Chen 出租管理经验框架生成的 AI 初步评估，最终建议需由 Mabel 专业审核确认。";

const KNOWLEDGE_CENTER_GUIDE = {
  en: "Please review the latest guide in the Landlord Knowledge Center and confirm with Mabel before making a final decision.",
  zh: "请查看房东知识中心最新指南，并由 Mabel 核查后再作最终决定。",
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

  return lines.length ? [safeLang === "zh" ? "Mabel 风格追问答案：" : "Mabel-style Follow-up Answers:", ...lines].join("\n") : "";
}

export function formatStrategyFollowUpAnswersPlain(form, lang = "en") {
  const text = formatStrategyFollowUpAnswers(form, lang);
  return text
    .replace(/^AI Follow-up Answers:\n?/, "")
    .replace(/^Mabel-style Follow-up Answers:\n?/, "")
    .replace(/^Mabel 风格追问答案：\n?/, "");
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
  if (hasOwnerOccupancyLegalWarning(form)) return "Mabel legal/compliance review before listing";
  if (form.airbnbInterest === "Yes") return "STR feasibility review";
  if (form.ownerGoal === "Rent ASAP") return "Fast rental listing preparation";
  if (form.ownerGoal === "Maximize rent") return "Full rental strategy and marketing review";
  return "Mabel strategy review";
}

export function buildKnownIssuesWithFollowUps(form, lang = "en") {
  const knownIssues = String(form.knownIssues || "").trim();
  const followUps = formatStrategyFollowUpAnswers(form, lang);
  const legal = formatLegalComplianceAnswers(form, lang);
  return [knownIssues, followUps, legal].filter(Boolean).join("\n\n");
}

export function generatePreliminaryStrategySummary(form, lang = "en") {
  const safeLang = normalizeLang(lang);
  const followUps = form.followUpAnswers || {};
  const legalWarning = hasOwnerOccupancyLegalWarning(form);
  const confidence = calculateAssessmentConfidence(form);

  return {
    executiveSummary: buildExecutiveSummary(form, safeLang),
    propertyStrengths: buildPropertyStrengths(form, followUps, safeLang),
    rentalChallenges: buildRentalChallenges(form, followUps, legalWarning, safeLang),
    suggestedRentalStrategy: buildSuggestedStrategy(form, followUps, safeLang),
    estimatedRentRange: buildRentPositioning(form, safeLang),
    suiteSplitRentalPotential: buildSuiteSplitPotential(form, followUps, safeLang),
    suiteQualityPrivacy: buildSuiteQualityPrivacy(form, safeLang),
    locationRentAdjustment: buildLocationRentAdjustment(form, safeLang),
    airbnbStrRegulationCheck: buildStrReminder(form, safeLang),
    legalComplianceRisk: buildLegalComplianceRisk(form, safeLang),
    aiConfidenceFlags: buildAiConfidenceAndFlags(form, safeLang),
    aiAssessmentConfidence: buildAiAssessmentConfidence(form, confidence, safeLang),
    servicePath: buildServicePath(form),
    marketingSuggestions: buildMarketingSuggestions(form, followUps, safeLang),
    ownerGoalAlignment: buildMabelProfessionalOpinion(form, followUps, safeLang),
    mabelProfessionalOpinion: buildMabelProfessionalOpinion(form, followUps, safeLang),
    recommendedNextStep: buildServiceRecommendation(form, safeLang),
    knowledgeLinks: buildKnowledgeLinks(form, safeLang),
    disclaimer: safeLang === "zh" ? STRATEGY_ASSESSMENT_DISCLAIMER_ZH : STRATEGY_ASSESSMENT_DISCLAIMER,
  };
}

function buildExecutiveSummary(form, lang) {
  const type = lang === "zh" ? (form.propertyType === "House" ? "独立屋" : form.propertyType || "该物业") : (form.propertyType || "This property");
  const city = form.city || (lang === "zh" ? "本地市场" : "the local market");
  const target = formatCurrency(form.targetRent, lang);
  if (lang === "zh") {
    return [
      `${type}位于 ${city}，目前业主目标以${displayOwnerGoal(form.ownerGoal, lang)}为主，目标租金为 ${target}/月。`,
      "从已提供信息看，本物业适合先按高品质整租方向评估，同时保留合法分租和 Airbnb / 短租可行性复核。",
      "最终租金、出租周期和合规结论，需要结合最新市场、照片、房屋状态和 Mabel 专业审核后确认。",
    ];
  }
  return [
    `${type} in ${city} is being assessed for ${displayOwnerGoal(form.ownerGoal, lang)}, with an owner target rent of ${target}/month.`,
    "Based on the submitted details, the first strategy to test is a premium whole-home rental, while keeping legal split-rental and STR feasibility under review.",
    "Final rent, timeline, and compliance position require current market review, photos, condition, and Mabel's professional confirmation.",
  ];
}

function buildPropertyStrengths(form, followUps, lang) {
  const items = [];
  if (form.oceanView === "Yes") {
    items.push(lang === "zh"
      ? "海景是本物业最强的营销优势，建议作为广告标题、封面照片和第一组照片的核心卖点。"
      : "The ocean view is the strongest marketing advantage and should lead the headline, cover photo, and first photo sequence.");
  }
  if (form.furnished === "Yes") {
    items.push(lang === "zh"
      ? "家具家电齐全可以吸引搬迁家庭、临时过渡住客和希望减少搬家成本的高预算租客。"
      : "The furnished setup supports relocation tenants, transition households, and higher-budget renters who want a move-in-ready home.");
  }
  if (Number(form.bedrooms) >= 4) {
    items.push(lang === "zh"
      ? `${form.bedrooms} 卧 ${form.bathrooms || ""} 卫适合家庭型租客，但租金越高，目标客群越需要精准筛选。`
      : `${form.bedrooms} bedrooms and ${form.bathrooms || ""} bathrooms fit family tenants, but higher rent requires more precise tenant targeting.`);
  }
  if (form.garageSpaces || form.drivewayParking) {
    items.push(lang === "zh"
      ? "车库和户外停车位是高端整租的重要加分项，尤其适合家庭和长期租客。"
      : "Garage and driveway parking are meaningful advantages for premium whole-home rental, especially for families and long-term tenants.");
  }
  if (form.privateYard === "Yes") {
    items.push(lang === "zh"
      ? "私人户外空间能提升家庭租客和宠物租客的兴趣，但围栏和隐私程度需要在广告中准确说明。"
      : "Private outdoor space strengthens family and pet-tenant appeal, but fencing and privacy need to be described accurately.");
  }
  if (form.separateEntrance === "Yes" || followUps.conversionSeparateEntrance === "Yes") {
    items.push(lang === "zh"
      ? "已有或可实现独立入口，为未来合法分租或楼下独立单元评估提供了基础条件。"
      : "The existing or possible separate entrance creates a practical starting point for future legal split-rental review.");
  }
  return items.length ? items : [lang === "zh" ? "需要结合照片、平面布局和房屋状态进一步确认物业优势。" : "Property strengths need photo, layout, and condition review."];
}

function buildRentalChallenges(form, followUps, legalWarning, lang) {
  const items = [];
  if (form.targetRent) {
    items.push(lang === "zh"
      ? `业主目标租金 ${formatCurrency(form.targetRent, lang)}/月属于较高租金区间，目标租客数量相对有限，预计出租周期可能长于普通家庭住宅。`
      : `The owner target rent of ${formatCurrency(form.targetRent, lang)}/month is a higher-rent position, so the tenant pool is narrower and leasing may take longer than a standard family home.`);
  }
  if (form.utilitiesShared === "Yes") {
    items.push(lang === "zh"
      ? "水电或电表共用会影响分租清晰度，后续若做两个单元，需要提前设计费用分摊和租约说明。"
      : "Shared utilities reduce split-rental clarity; any two-unit strategy needs clear cost allocation and lease wording.");
  }
  if (form.airbnbInterest === "Yes") {
    items.push(lang === "zh"
      ? "Airbnb / 短租不能只按收益判断，必须先核查 BC 和 Lantzville 当前规则、主要住所要求和运营限制。"
      : "Airbnb / STR cannot be assessed by revenue only; BC and municipal rules, principal-residence requirements, and operating limits must be checked first.");
  }
  if (form.fencedBackyard !== "Yes") {
    items.push(lang === "zh"
      ? "后院是否有围栏目前不明确，这会影响宠物租客、带小孩家庭和户外空间卖点。"
      : "Fenced-yard status is not confirmed, which affects pet tenants, families with children, and outdoor-space positioning.");
  }
  if (legalWarning) {
    items.push(lang === "zh"
      ? "已触发屋主自住相关法规风险，正式挂牌前必须先由 Mabel 核查当前规则。"
      : "An owner-occupancy compliance risk was triggered; Mabel should verify current rules before listing.");
  }
  return items.length ? items : [lang === "zh" ? "目前没有明显高风险项，但正式挂牌前仍需审核照片、状态、合规和市场价格。" : "No major high-risk issue was flagged, but photos, condition, compliance, and market rent still need review."];
}

function buildSuggestedStrategy(form, followUps, lang) {
  if (lang === "zh") {
    if (form.airbnbInterest === "Yes") {
      return [
        "第一策略：先按高品质整租评估，突出海景、家具齐全、车库、停车和海边位置。",
        "第二策略：同步评估合法分租可能性，尤其是楼下是否能合法增加厨房、独立使用空间和清晰水电安排。",
        "第三策略：Airbnb / STR 只作为备选方向，必须先完成法规核查，不能在未确认规则前承诺短租收益。",
      ];
    }
    if (form.ownerGoal === "Rent ASAP") {
      return [
        "优先采用务实定价和快速展示策略，减少空置时间。",
        "广告需清楚说明家具、停车、院子、水电和宠物政策，避免无效咨询。",
      ];
    }
    return [
      "建议先以整租方式进入市场，测试高质量租客反馈。",
      "如果 30 天内没有足够合格申请，再调整租金或重新评估合法分租方案。",
    ];
  }

  if (form.airbnbInterest === "Yes") {
    return [
      "Primary strategy: test a premium whole-home rental with ocean view, furnished setup, garage, parking, and beach access as the lead value.",
      "Secondary strategy: review legal split-rental feasibility, especially kitchen potential, independent use, and utility clarity.",
      "STR strategy: keep Airbnb as an option only after BC and municipal rules are confirmed.",
    ];
  }
  if (form.ownerGoal === "Rent ASAP") {
    return [
      "Use practical pricing and quick showing availability to reduce vacancy.",
      "The listing should clearly state furniture, parking, yard, utilities, and pet terms to reduce unqualified inquiries.",
    ];
  }
  return [
    "Start with a whole-home rental launch and test qualified tenant response.",
    "If strong applications do not appear within 30 days, revisit rent positioning or legal split-rental feasibility.",
  ];
}

function buildRentPositioning(form, lang) {
  const target = formatCurrency(form.targetRent, lang);
  if (lang === "zh") {
    if (!form.targetRent) {
      return [
        "目前未填写目标租金。建议先由 Mabel 对比当前 Lantzville / Nanaimo 同类房源、房屋状态、家具配置和照片质量后再定价。",
        "不要只按房屋面积或业主期望定价，必须结合目标租客数量和出租周期。",
      ];
    }
    return [
      `业主目标租金为 ${target}/月。`,
      "以 5 卧、海景、家具齐全、车库和海边位置来看，该物业具备高租金包装条件。",
      "但这个价位属于较高租金区间，目标租客数量相对有限。建议先以专业照片和强卖点测试市场，如果咨询量不足，应及时复核价格或改为合法分租策略。",
    ];
  }
  if (!form.targetRent) {
    return [
      "No target rent was entered. Mabel should compare current Lantzville / Nanaimo rentals, condition, furnishings, and photo quality before pricing.",
      "Pricing should be based on tenant depth and leasing timeline, not only property size or owner preference.",
    ];
  }
  return [
    `Owner target rent is ${target}/month.`,
    "The 5-bedroom layout, ocean view, furnished setup, garage, and beach access support a premium presentation.",
    "This is still a higher-rent position with a narrower tenant pool. Launch with strong photos and clear value first; if inquiry quality is weak, revisit pricing or legal split-rental strategy.",
  ];
}

function buildSuiteSplitPotential(form, followUps, lang = "en") {
  if (form.existingSuite === "Yes") {
    const suiteReadySignals = [
      followUps.suiteSeparateEntrance,
      followUps.suiteOwnKitchen,
      followUps.suiteSeparateLaundry,
      followUps.suiteSeparateHydro,
    ].filter((value) => value === "Yes").length;
    if (suiteReadySignals >= 3) {
      return lang === "zh"
        ? "现有套房已具备多个独立使用条件，分租可行性较强。但正式采用前仍需审核合法性、安全、保险、停车和水电安排。"
        : "The existing suite has several independent-use features, so split-rental feasibility is stronger. Legality, safety, insurance, parking, and utilities still need review.";
    }
    return lang === "zh"
      ? "现有套房具备分租可能，但独立入口、厨房、洗衣、电表或水电细节仍需 Mabel 审核。"
      : "The existing suite can support a split-rental review, but entrance, kitchen, laundry, meter, or utility details need Mabel's review.";
  }

  if (form.existingSuite === "No") {
    if (followUps.conversionBasement === "Yes" || followUps.conversionSeparateEntrance === "Yes" || followUps.conversionAddKitchen === "Yes") {
      return lang === "zh"
        ? "目前没有独立套间，但楼下空间、独立入口和加厨房意向显示出未来改成两个单元的潜力。如果能合法完成，整体出租弹性和目标租客范围会明显提高。关键审核点是城市要求、施工成本、安全、停车、水电和院子隐私。"
        : "There is no existing suite, but lower-level space, separate entrance potential, and kitchen willingness create a future two-unit opportunity. If completed legally, rental flexibility and tenant reach improve. Key review points are municipal requirements, cost, safety, parking, utilities, and yard privacy.";
    }
    return lang === "zh"
      ? "目前分租可行性有限，除非业主愿意投入合法套房改造并解决独立使用条件。"
      : "Split-rental feasibility is limited unless the owner is willing to create a compliant secondary-suite setup.";
  }

  if (form.separateEntrance === "Yes" || form.canAddKitchen === "Yes") {
    return lang === "zh"
      ? "具备分租评估基础，但厨房、洗衣、水电、隐私、停车和合规需要逐项确认。"
      : "Split-rental review is justified, but kitchen, laundry, utilities, privacy, parking, and compliance need confirmation.";
  }

  return lang === "zh"
    ? "目前套房 / 分租潜力仍不清晰，需要结合照片和平面布局进一步判断。"
    : "Suite / split-rental potential remains unclear and needs photo and layout review.";
}

function buildSuiteQualityPrivacy(form, lang = "en") {
  const notes = [];
  if (form.suiteLegalStatus === "Legal") {
    notes.push(lang === "zh" ? "合法套间比未授权套间更容易稳定营销，合规风险较低。" : "Legal suite status supports steadier marketing and lower compliance risk than an unauthorized suite.");
  } else if (form.suiteLegalStatus === "Unauthorized no permit") {
    notes.push(lang === "zh" ? "未授权 / 无许可套间需要更谨慎，正式营销前应由 Mabel 做合规审核。" : "Unauthorized suite status requires a cautious strategy and Mabel's compliance review before marketing.");
  } else if (form.suiteLegalStatus === "Not sure") {
    notes.push(lang === "zh" ? "套间合法状态未确认，不能作为广告卖点直接宣传。" : "Suite legal status is unclear and should not be promoted as a confirmed feature.");
  }
  if (form.suiteHydroMeter === "Yes") notes.push(lang === "zh" ? "独立电表会提高套间吸引力，也减少水电分摊争议。" : "A separate hydro meter increases suite appeal and reduces utility-sharing disputes.");
  if (form.suiteHydroMeter === "No") notes.push(lang === "zh" ? "当前没有独立电表，若未来分租，需要提前设计水电费用说明。" : "There is no separate hydro meter, so any future split rental needs clear utility wording.");
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
      ? "业主已提供套间对租金影响的备注；核心判断是合法改造成两个单元后，整体出租弹性会高于单一高租金整租。"
      : `Rent impact notes: ${cleanSentence(form.suiteRentImpactNotes)}`);
  }
  if (form.existingSuite === "Yes" || form.existingSuite === "No" || form.suiteLegalStatus) {
    notes.push(lang === "zh"
      ? "请查看房东知识中心第二套房 / legal suite 指南，并由 Mabel 核查后再作最终决定。"
      : "Please review the Secondary Suite / Legal Suite guide in the Landlord Knowledge Center and confirm with Mabel before making a final decision.");
  }
  return notes.length ? notes : (lang === "zh" ? "suite 品质、隐私、水电和院子条件需要结合平面布局与照片确认。" : "Suite quality, privacy, utilities, and yard conditions need layout and photo review.");
}

function buildLocationRentAdjustment(form, lang = "en") {
  const notes = [];
  const area = String([form.communityArea, form.locationNotes].filter(Boolean).join(" ")).toLowerCase();
  if (form.nearbyCommercialCentre === "Yes") {
    notes.push(lang === "zh" ? "靠近商业中心能支持一定租金溢价，尤其适合重视便利性的租客。" : "Commercial-centre access supports a modest rent premium for tenants prioritizing convenience.");
  }
  if (area.includes("north nanaimo")) {
    notes.push(lang === "zh" ? "North Nanaimo 定位通常更容易支撑较强租金，但仍需看房屋状态、停车和竞品。" : "North Nanaimo positioning usually supports stronger rent, subject to condition, parking, and comparable listings.");
  }
  if (area.includes("lantzville")) {
    notes.push(lang === "zh"
      ? "Lantzville 的海景和安静居住环境有价值，但高租金整租目标客群较小，出租周期需要预留更长时间。"
      : "Lantzville ocean-view positioning has value, but a high-rent whole-home strategy serves a smaller tenant pool and needs a longer leasing runway.");
  }
  if (area.includes("south") || area.includes("less convenient")) {
    notes.push(lang === "zh" ? "如果位置便利性较弱，租金定位应更保守，避免拉长空置期。" : "A less convenient location calls for more conservative rent positioning to avoid extended vacancy.");
  }
  if (form.locationRentPremium) {
    notes.push(lang === "zh"
      ? "位置本身具备溢价基础，尤其是海景和靠近海边；但高租金整租仍需要更精准的目标租客。"
      : `Location premium note: ${cleanSentence(form.locationRentPremium)}`);
  }
  if (form.rentAdjustmentFactors) {
    notes.push(lang === "zh"
      ? "租金调整应重点考虑海景、海边通达性、卧室数量、家具、车库、停车、花园和整体出租周期。"
      : `Rent adjustment factors: ${cleanSentence(form.rentAdjustmentFactors)}`);
  }
  if (form.locationNotes) {
    notes.push(lang === "zh"
      ? "位置备注显示该物业主打安静海边生活方式，广告应强调居住体验，而不是只强调面积和卧室数量。"
      : `Location notes: ${cleanSentence(form.locationNotes)}`);
  }
  return notes.length ? notes : (lang === "zh" ? "地段价值需要结合附近可比出租房源和租客便利性进一步确认。" : "Location value should be confirmed against nearby comparable rentals and tenant convenience.");
}

function buildMarketingSuggestions(form, followUps, lang = "en") {
  if (lang === "zh") {
    const items = [
      "第一张照片建议使用海景或最能体现 Oceanfront 的画面。",
      "第二张展示客厅，突出空间感、采光和家具齐全。",
      "第三张展示厨房，帮助租客判断日常居住品质。",
      "第四张展示后院 / 花园 / greenhouse，说明户外空间价值。",
      "车库和户外停车位应在广告前半部分明确写出。",
      "家具家电齐全应作为主要卖点，适合搬迁租客或希望拎包入住的租客。",
      "Facebook / Marketplace 标题建议突出：Ocean View、Beach Access、Fully Furnished。",
    ];
    if (form.fencedBackyard !== "Yes") items.push("如后院围栏不明确，不建议在广告中写“完整围栏后院”，应改写为“私人户外空间”或“花园区域”。");
    if (form.airbnbInterest === "Yes") items.push("不要在公开广告中暗示短租收益，短租方向需先完成法规核查。");
    return items;
  }

  const items = [
    "Use the ocean view or strongest oceanfront image as the first photo.",
    "Use the living room as the second photo to show space, light, and furnished presentation.",
    "Use the kitchen as the third photo so tenants can judge daily living quality.",
    "Use the backyard, garden, or greenhouse as the fourth photo to show outdoor value.",
    "Mention garage and driveway parking in the first half of the ad.",
    "Position the furnished setup as a primary feature for relocation or move-in-ready tenants.",
    "Suggested Facebook / Marketplace headline themes: Ocean View, Beach Access, Fully Furnished.",
  ];
  if (form.fencedBackyard !== "Yes") items.push("Do not claim fully fenced yard unless confirmed; use private outdoor space or garden area if accurate.");
  if (form.airbnbInterest === "Yes") items.push("Do not advertise STR income before rule verification is complete.");
  return items;
}

function buildMabelProfessionalOpinion(form, followUps, lang = "en") {
  if (lang === "zh") {
    return [
      "根据目前信息，如果我是这套物业的物业经理，我会先尝试整租，但不会只依赖一个高租金价格点。",
      "如果 30 天内没有足够合格租客，我会建议重新评估租金定位，并同时查看是否能合法增加套间或分成两个出租单元。",
      "如果业主计划长期持有出租，我会优先提高物业独立性：确认围栏、院子隐私、套间隐私、水电分摊和未来是否需要独立电表。",
      "Airbnb / STR 暂时只作为备选方案，法规未核查前不建议作为主要出租策略。",
    ];
  }
  return [
    "Based on the current information, if I were managing this property, I would first test it as a whole-home rental but avoid relying on one high-rent price point only.",
    "If qualified demand is weak after 30 days, I would reassess rent positioning and review whether a legal suite or two-unit strategy is practical.",
    "For long-term rental success, I would improve rental independence first: fencing, yard privacy, suite privacy, utility allocation, and whether a separate meter is needed.",
    "Airbnb / STR should remain a backup strategy until current rules are verified.",
  ];
}

function buildStrReminder(form, lang) {
  if (form.airbnbInterest !== "Yes") {
    return lang === "zh"
      ? "目前未以短租作为主要方向。如后续考虑 Airbnb / STR，请查看房东知识中心最新短租政策，并由 Mabel 核查后再作最终决定。"
      : "STR is not the main direction from the current answers. If Airbnb / STR is considered later, please review the latest guide in the Landlord Knowledge Center and confirm with Mabel before making a final decision.";
  }
  return lang === "zh"
    ? ["已选择 Airbnb / STR 意向。请查看房东知识中心最新短租政策。", "短租策略需由 Mabel 核查后再作最终决定。"]
    : ["Airbnb / STR interest was selected. Please review the latest STR guide in the Landlord Knowledge Center.", "Mabel should confirm the STR strategy before a final decision is made."];
}

function buildLegalComplianceRisk(form, lang) {
  const legalWarning = hasOwnerOccupancyLegalWarning(form);
  if (legalWarning) {
    return lang === "zh"
      ? ["该物业可能存在与屋主自住相关的再出租限制。", "请查看房东知识中心相关指南，并由 Mabel 核查后再确认最终出租策略。"]
      : ["This property may have owner-occupancy related re-rental restrictions.", "Please review the related Landlord Knowledge Center guide and have Mabel confirm the final rental strategy."];
  }
  const risk = getLegalRiskFlag(form);
  if (risk === "Not sure") {
    return lang === "zh"
      ? ["未触发明确的屋主自住 12 个月风险提醒，但业主选择了不确定。", "请查看房东知识中心相关指南，并由 Mabel 核查后再确认。"]
      : ["No clear owner-occupancy 12-month warning was triggered, but the owner selected Not sure.", "Please review the related Landlord Knowledge Center guide and have Mabel confirm before listing."];
  }
  return lang === "zh"
    ? "本次答案未触发屋主自住相关再出租 warning。正式挂牌前仍建议由 Mabel 做最终复核。"
    : "No owner-occupancy re-rental warning was triggered from the submitted answers. Mabel should still complete the final review before listing.";
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
  if (Object.values(form.followUpAnswers || {}).filter(Boolean).length >= 5) reasons.push(lang === "zh" ? "✓ Mabel 风格追问已填写" : "✓ Mabel-style follow-up answers were completed");
  if (form.knownIssues) reasons.push(lang === "zh" ? "✓ 已提供业主关注点和已知问题" : "✓ Owner concerns and known issues were provided");
  if (form.airbnbInterest === "Yes") reasons.push(lang === "zh" ? "⚠ STR 法规需实时确认" : "⚠ STR rules need current verification");
  reasons.push(lang === "zh" ? "⚠ 最终租金仍需结合当前市场和照片状态确认" : "⚠ Final rent still needs current market and photo/condition review");
  return [lang === "zh" ? `AI 评估信心：${confidence.score}%` : `AI Assessment Confidence: ${confidence.score}%`, ...reasons];
}

function buildServiceRecommendation(form, lang) {
  if (lang === "zh") {
    const items = [
      "★★★★★ AI Marketing Package：适合先把海景、家具齐全、车库、海边位置整理成专业广告和照片顺序。",
      "★★★★☆ Professional Rental Listing：适合需要正式挂牌、筛选租客和测试 $4,688/月整租定位的业主。",
      "★★★★★ Property Management：适合高租金、潜在分租、STR 法规和长期管理都需要专业把关的复杂物业。",
    ];
    if (form.airbnbInterest === "Yes" || form.existingSuite === "No" || hasOwnerOccupancyLegalWarning(form)) {
      items.push("建议预约 Mabel 一对一咨询，先确认法规、租金定位和整租 / 分租路径。");
    }
    return items;
  }
  const items = [
    "★★★★★ AI Marketing Package: Best for turning ocean view, furnished setup, garage, and beach access into professional ad copy and photo order.",
    "★★★★☆ Professional Rental Listing: Best for launching the listing, screening tenants, and testing the owner's rent position.",
    "★★★★★ Property Management: Best for a complex property with high rent, split-rental review, STR questions, and long-term oversight.",
  ];
  if (form.airbnbInterest === "Yes" || form.existingSuite === "No" || hasOwnerOccupancyLegalWarning(form)) {
    items.push("A one-on-one Mabel strategy review is recommended before confirming the final path.");
  }
  return items;
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
      title: safeLang === "zh" ? "Mabel 专业指南链接" : "Mabel Guide links",
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
  if (form.existingSuite === "Yes" || form.existingSuite === "No" || form.suiteLegalStatus) {
    government.links.push({ href: "/resources#secondary-suite", label: safeLang === "zh" ? "第二套房与合法套间" : "Secondary Suite / Legal Suite" });
    guide.links.push({ href: "/resources#whole-house-vs-split-rental-card", label: safeLang === "zh" ? "整租 vs 分租" : "Whole House vs Split Rental" });
    guide.links.push({ href: "/resources#suite-privacy-hydro-meter-card", label: safeLang === "zh" ? "套间隐私和独立电表" : "Suite Privacy and Separate Hydro Meter" });
  }
  if (form.targetRent || form.ownerGoal === "Maximize rent" || form.ownerGoal === "Maximize Rent") {
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
