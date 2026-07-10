import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createEmptyStrategyAssessment,
  generatePreliminaryStrategySummary,
  getRentalIntelligenceKnowledge,
  getLegalRiskFlag,
  getStrategyFollowUpQuestions,
  hasOwnerOccupancyLegalWarning,
  submitStrategyAssessment,
} from "../utils/strategyAssessment";
import { normalizeLang } from "../utils/lang";
import { renderStructuredProfessionalReportHtml } from "../components/reports/professionalReportHtml";

const YES_NO = ["Yes", "No", "Unsure"];
const FOLLOW_UP_YES_NO = ["Yes", "No", "Not sure"];
const CONTACT_OPTIONS = ["Email", "Phone", "Text message", "WeChat"];
const STRATEGY_REPORT_SESSION_KEY = "vipm_strategy_assessment_report_v1";

function saveStrategyReportSession(payload) {
  try {
    sessionStorage.setItem(STRATEGY_REPORT_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Session storage is a convenience for the public result route only.
  }
}

function readStrategyReportSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STRATEGY_REPORT_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

const FIELD_LABELS = {
  en: {
    ownerName: "Owner Name",
    email: "Email",
    phone: "Phone",
    preferredContact: "Preferred Contact",
    propertyAddress: "Property Address",
    city: "City",
    province: "Province",
    postalCode: "Postal Code",
    communityArea: "Community / Area",
    propertyType: "Property Type",
    propertyBuildingType: "Property Building Type",
    rentalUnitType: "Rental Unit Type Being Assessed",
    outdoorSpaceType: "Outdoor Space",
    fenceStatus: "Fence Status",
    laundryType: "Laundry",
    utilitiesArrangement: "Utilities Arrangement",
    sharedAreas: "Shared Areas",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    garageSpaces: "Garage Spaces",
    drivewayParking: "Driveway Parking",
    furnished: "Furnished",
    oceanView: "Ocean View",
    fencedBackyard: "Fenced Backyard",
    privateYard: "Private Yard",
    petFriendly: "Pet Friendly",
    existingSuite: "Existing Suite",
    separateEntrance: "Separate Entrance",
    separateKitchen: "Separate Kitchen",
    separateLaundry: "Separate Laundry",
    separateMeter: "Separate Meter",
    utilitiesShared: "Utilities Shared",
    canAddKitchen: "Can Add Kitchen",
    suiteLegalStatus: "Suite Legal Status",
    suitePermitStatus: "Suite Permit Status",
    suiteHydroMeter: "Suite Hydro Meter",
    suiteYardPrivacy: "Suite Yard Privacy",
    suiteBedrooms: "Suite Bedrooms",
    suiteBathrooms: "Suite Bathrooms",
    suiteSharedAreas: "Suite Shared Areas",
    suiteRentImpactNotes: "Suite Rent Impact Notes",
    ownerGoal: "Owner Goal",
    targetRent: "Target Rent",
    availableDate: "Available Date",
    nearbyCommercialCentre: "Nearby Commercial Centre",
    locationNotes: "Location Notes",
    locationRentPremium: "Location Rent Premium",
    rentAdjustmentFactors: "Rent Adjustment Factors",
    airbnbInterest: "Airbnb Interest",
    principalResidence: "Principal Residence",
    ownerLivesOnSite: "Owner Lives On Site",
    strMunicipality: "STR Municipality",
    thirdPartyOperatorInterest: "Third-party Operator Interest",
    knownIssues: "Known Issues",
    timelineUrgency: "Timeline Urgency",
    nextStep: "Next Step",
    consentToContact: "Consent to Contact",
    privacyConsent: "Privacy Consent",
  },
  zh: {
    ownerName: "业主姓名",
    email: "邮箱",
    phone: "电话",
    preferredContact: "偏好联系方式",
    propertyAddress: "物业地址",
    city: "城市",
    province: "省份",
    postalCode: "邮政编码",
    communityArea: "社区 / 区域",
    propertyType: "物业类型",
    propertyBuildingType: "物业建筑类型",
    rentalUnitType: "本次评估的出租单元类型",
    outdoorSpaceType: "户外空间",
    fenceStatus: "围栏状态",
    laundryType: "洗衣安排",
    utilitiesArrangement: "水电安排",
    sharedAreas: "共用区域",
    bedrooms: "卧室数",
    bathrooms: "卫生间数",
    garageSpaces: "车库车位",
    drivewayParking: "车道停车位",
    furnished: "是否带家具",
    oceanView: "是否有海景",
    fencedBackyard: "后院是否有围栏",
    privateYard: "是否有私人院子",
    petFriendly: "是否接受宠物",
    existingSuite: "是否已有套房",
    separateEntrance: "是否独立入口",
    separateKitchen: "是否独立厨房",
    separateLaundry: "是否独立洗衣",
    separateMeter: "是否独立电表",
    utilitiesShared: "水电等是否共用",
    canAddKitchen: "是否可加厨房",
    suiteLegalStatus: "套房合法状态",
    suitePermitStatus: "套房许可状态",
    suiteHydroMeter: "套房独立电表",
    suiteYardPrivacy: "套房院子隐私",
    suiteBedrooms: "套房卧室数",
    suiteBathrooms: "套房卫生间数",
    suiteSharedAreas: "套房共用区域",
    suiteRentImpactNotes: "套房租金影响备注",
    ownerGoal: "业主目标",
    targetRent: "目标租金",
    availableDate: "可出租日期",
    nearbyCommercialCentre: "附近商业中心",
    locationNotes: "位置备注",
    locationRentPremium: "位置租金溢价",
    rentAdjustmentFactors: "租金调整因素",
    airbnbInterest: "是否考虑 Airbnb / 短租",
    principalResidence: "是否主要住所",
    ownerLivesOnSite: "业主是否住在现场",
    strMunicipality: "短租所在城市",
    thirdPartyOperatorInterest: "是否考虑第三方运营",
    knownIssues: "已知问题",
    timelineUrgency: "时间紧急程度",
    nextStep: "下一步",
    consentToContact: "同意联系",
    privacyConsent: "隐私同意",
  },
};

const COPY = {
  en: {
    title: "AI Property Strategy Assessment",
    subtitle: "Get a preliminary rental strategy assessment in 3-5 minutes, based on Vanisland Property Management's property management framework.",
    desc: "Answer a few focused questions, then review the AI preliminary assessment before submitting it for professional review.",
    bullets: [
      "Recommended rental strategy",
      "Preliminary rent range",
      "Whole-home / split-rental potential",
      "Airbnb / STR risk reminder",
      "Suggestions to improve rental success",
    ],
    successTitle: "Assessment submitted successfully",
    successDesc: "Vanisland will review your intake before making a final recommendation.",
    successThanks: "Thank you. Your property strategy intake has been submitted successfully.",
    resultTitle: "Property Strategy Assessment Result",
    reportGenerated: "Your assessment report has been generated. You can view the professional report or print/save it as a PDF.",
    viewProfessionalReport: "View Professional Report",
    printSavePdf: "Print / Save PDF",
    startOver: "Start Over",
    publicReportMissing: "No local report result was found for this assessment. Please complete the assessment again on this device.",
    estimatedRent: "Estimated Rent / Rent Range",
    strategyConfidence: "Strategy Confidence",
    keyRiskNotes: "Key Risk Notes",
    ownerNextSteps: "Owner Next Steps",
    assessmentId: "Assessment ID",
    nextStepSelected: "Next step selected by owner:",
    notSelected: "Not selected",
    reviewNote: "Vanisland will review your assessment before providing a final recommendation.",
    nextStepContact: "Vanisland may contact you for the next step.",
    progress: "Step {current} of {total}",
    back: "Back",
    next: "Next",
    generate: "Generate My AI Assessment",
    downloadPdf: "Download PDF",
    pdfHelp: "Opens a printable report. Use Save as PDF with the suggested file name.",
    reviewTitle: "Review & Generate",
    reviewDesc: "Check the summary before generating your AI preliminary assessment.",
    legalTitle: "Legal & Compliance Check",
    legalDesc: "A quick BC tenancy risk screen before confirming the rental strategy.",
    legalQ1: "Did the previous tenant move out because you or an eligible family member intended to occupy the property?",
    legalQ2: "Have you personally occupied the property for at least 12 months?",
    legalRisk: "Legal risk",
    legalWarningTitle: "Warning:",
    legalWarning:
      "If a previous tenant moved out because of owner occupancy, BC tenancy rules may require the owner or eligible family member to occupy the property for the required period, commonly 12 months, before renting it again. Renting earlier may create legal risk. Please verify the current rules before listing the property.",
    sections: {
      ownerInfo: "Owner Info",
      propertyInfo: "Property Info",
      rentalStructure: "Rental Structure",
      suiteDetails: "Suite Details",
      keyFactors: "Key Rental Factors",
      locationFactors: "Location Rent Factors",
      airbnb: "Airbnb / STR Interest",
      ownerGoal: "Owner Goal",
      photoUpload: "Photo Upload",
      aiAssessment: "AI Preliminary Assessment",
      nextStep: "Next Step",
    },
    strNotice: "Current BC and municipal STR rules must be verified before making a final decision.",
    photoLabel: "Property Photos",
    photoHelp: "V1 saves the selected photo file names with the assessment. Drive upload can be connected after the backend folder pattern is confirmed.",
    submit: "Submit Assessment",
    submitting: "Submitting...",
    select: "Select",
    shortAnswer: "Short answer",
    followTitle: "Professional follow-up questions",
    followDesc: "These questions help the AI apply a more professional property-management review before generating the assessment.",
    followEmpty: "Follow-up questions will appear after rental goal, suite, yard, pet, ocean view, or Airbnb / STR details are selected.",
    questionSingular: "question",
    questionPlural: "questions",
    consentText: "I agree that Vanisland may contact me about this assessment.",
    privacyText: "I consent to submitting this property information for review.",
    report: {
      propertyClassification: "Building and Rental Unit Type",
      executiveSummary: "Professional Summary",
      propertyPositioning: "Property Positioning",
      estimatedRentRange: "Local Rent Positioning",
      propertyStrengths: "Factors Supporting the Price",
      rentalChallenges: "Factors Limiting the Price",
      targetTenantProfile: "Target Tenant Profile",
      suggestedRentalStrategy: "Rental Strategy",
      marketRisks: "Market Risks",
      nextSteps: "Next Steps",
      suiteSplitRentalPotential: "Suite Potential Analysis",
      suiteQualityPrivacy: "Suite Quality & Privacy Analysis",
      locationRentAdjustment: "Location Value Analysis",
      communityLocationAnalysis: "Community & Location Analysis",
      airbnbStrRegulationCheck: "Airbnb / STR Reminder",
      legalComplianceRisk: "Legal Risk Reminder",
      aiAssessmentConfidence: "AI Assessment Confidence",
      knowledgeCenter: "Landlord Knowledge Center",
      marketingSuggestions: "Marketing Suggestions",
      ownerGoalAlignment: "Professional Preliminary Recommendation",
      recommendedNextStep: "Recommended Service Path",
      disclaimer: "Disclaimer",
    },
  },
  zh: {
    title: "AI 房产出租策略评估",
    subtitle: "3-5 分钟获得一份基于 Vanisland Property Management 物业管理经验的 AI 初步出租建议。",
    desc: "按步骤填写关键信息，提交前可先查看 AI 初步评估摘要。",
    bullets: [
      "推荐出租方式",
      "初步租金范围",
      "整租 / 分租潜力",
      "Airbnb / 短租风险提醒",
      "提高出租成功率建议",
    ],
    successTitle: "初评已成功提交",
    successDesc: "Vanisland 会先审核您提交的信息，再给出最终建议。",
    successThanks: "谢谢，您的房产出租策略初评表已成功提交。",
    resultTitle: "物业出租策略评估结果",
    reportGenerated: "评估报告已生成。您可以查看专业报告，或打印 / 保存为 PDF。",
    viewProfessionalReport: "查看专业报告",
    printSavePdf: "打印 / 保存 PDF",
    startOver: "重新填写",
    publicReportMissing: "未在本机找到该评估报告结果。请在当前设备重新完成评估。",
    estimatedRent: "预估租金 / 租金区间",
    strategyConfidence: "策略信心",
    keyRiskNotes: "主要风险提示",
    ownerNextSteps: "业主下一步",
    assessmentId: "初评编号",
    nextStepSelected: "业主选择的下一步：",
    notSelected: "未选择",
    reviewNote: "Vanisland 会先审核您的评估，再提供最终建议。",
    nextStepContact: "Vanisland 可能会就下一步服务联系您。",
    progress: "第 {current} 步，共 {total} 步",
    back: "上一步",
    next: "下一步",
    generate: "生成我的 AI 初评",
    downloadPdf: "下载 PDF",
    pdfHelp: "打开可打印报告页面，请选择保存为 PDF，文件名使用页面提示。",
    reviewTitle: "确认并生成",
    reviewDesc: "请先确认摘要，再生成并提交 AI 初步评估。",
    legalTitle: "法规风险检查",
    legalDesc: "在确认出租策略前，先快速检查 BC 租赁法规风险。",
    legalQ1: "前任租客是否因为您或符合条件的家庭成员要自住而搬离？",
    legalQ2: "您是否已经实际连续自住满 12 个月？",
    legalRisk: "法规风险",
    legalWarningTitle: "提醒：",
    legalWarning:
      "如果前任租客是因为屋主或符合条件的家庭成员自住而搬离，BC 住宅租赁规则可能要求屋主或相关家庭成员实际占用该房屋达到规定期限，通常为 12 个月。未满足要求前重新出租，可能产生法律风险。请在挂牌出租前核查最新规定。",
    sections: {
      ownerInfo: "业主信息",
      propertyInfo: "物业信息",
      rentalStructure: "出租结构",
      suiteDetails: "套房细节",
      keyFactors: "关键出租因素",
      locationFactors: "位置租金因素",
      airbnb: "Airbnb / 短租意向",
      ownerGoal: "业主目标",
      photoUpload: "照片上传",
      aiAssessment: "AI 初步评估",
      nextStep: "下一步",
    },
    strNotice: "当前 BC 省及市政短租规则必须在做最终决定前再次核实。",
    photoLabel: "物业照片",
    photoHelp: "V1 先保存所选照片文件名。确认后端 Drive 文件夹规则后，可再接入真实上传。",
    submit: "提交初评",
    submitting: "正在提交...",
    select: "请选择",
    shortAnswer: "简短回答",
    followTitle: "专业追问",
    followDesc: "这些问题帮助 AI 更接近专业出租管理判断方式。",
    followEmpty: "选择出租目标、套房、院子、宠物、海景或 Airbnb / 短租信息后，这里会自动显示追问。",
    questionSingular: "个问题",
    questionPlural: "个问题",
    consentText: "我同意 Vanisland 就本次初评联系我。",
    privacyText: "我同意提交这些物业信息供审核使用。",
    report: {
      propertyClassification: "建筑与出租单元类型",
      executiveSummary: "专业结论摘要",
      propertyPositioning: "物业定位",
      estimatedRentRange: "本地租金判断",
      propertyStrengths: "支持价格的因素",
      rentalChallenges: "限制价格的因素",
      targetTenantProfile: "目标租客画像",
      suggestedRentalStrategy: "出租策略",
      marketRisks: "市场风险",
      nextSteps: "下一步行动",
      suiteSplitRentalPotential: "套房 / 分租潜力分析",
      suiteQualityPrivacy: "套房品质与隐私分析",
      locationRentAdjustment: "地段价值分析",
      communityLocationAnalysis: "社区与位置分析",
      airbnbStrRegulationCheck: "Airbnb / STR 提醒",
      legalComplianceRisk: "法规风险提醒",
      aiAssessmentConfidence: "AI 评估信心",
      knowledgeCenter: "房东知识中心",
      marketingSuggestions: "营销建议",
      ownerGoalAlignment: "专业初步建议",
      recommendedNextStep: "推荐服务方案",
      disclaimer: "免责声明",
    },
  },
};

const PROPERTY_BUILDING_TYPES = ["Detached House", "Condo", "Townhouse", "Duplex", "Manufactured Home", "Acreage", "Other"];
const RENTAL_UNIT_TYPES = ["Entire Detached House", "Main / Upper Unit", "Basement / Secondary Suite", "Entire Condo", "Entire Townhouse", "Whole House with Main + Suite", "One Duplex Unit", "Room Rental", "Other"];
const OUTDOOR_SPACE_TYPES = ["Fully Private", "Shared", "No Outdoor Space", "Partial", "Not Sure"];
const FENCE_STATUS_OPTIONS = ["Fully Fenced", "Partially Fenced", "Not Fenced", "Not Applicable", "Not Sure"];
const LAUNDRY_TYPES = ["Private In-unit", "Shared", "No Laundry", "Not Sure", "Not Applicable"];
const UTILITIES_ARRANGEMENTS = ["Separate Meter", "Included in Rent", "Shared by Percentage", "Shared by Fixed Amount", "Tenant Pays Own Account", "Not Sure", "Not Applicable"];
const SUITE_LEGAL_STATUS_OPTIONS = ["Legal", "Unauthorized no permit", "Not sure", "N/A"];
const OWNER_GOALS = [
  {
    value: "Rent ASAP",
    enTitle: "Rent ASAP",
    enDesc: "Prioritize speed, simple preparation, and practical pricing.",
    zhTitle: "尽快出租",
    zhDesc: "优先考虑速度、简单准备和务实定价。",
  },
  {
    value: "Maximize rent",
    enTitle: "Maximize Rent",
    enDesc: "Aim for stronger rent with better positioning and patience.",
    zhTitle: "尽量提高租金",
    zhDesc: "通过定位、展示和等待合适租客争取更高租金。",
  },
  {
    value: "Long-term Stable Tenant",
    enTitle: "Long-term Stable Tenant",
    enDesc: "Focus on reliability, fit, and lower turnover risk.",
    zhTitle: "稳定长期租客",
    zhDesc: "更看重租客稳定性、匹配度和低换租风险。",
  },
  {
    value: "Try Airbnb",
    enTitle: "Try Airbnb",
    enDesc: "Explore STR potential with rule and risk reminders.",
    zhTitle: "尝试 Airbnb",
    zhDesc: "探索短租可能性，同时提醒法规和运营风险。",
  },
  {
    value: "Prepare for Sale Later",
    enTitle: "Prepare for Sale Later",
    enDesc: "Rent now while protecting future sale presentation.",
    zhTitle: "之后准备出售",
    zhDesc: "先出租，同时保护未来出售展示和房屋状态。",
  },
  {
    value: "Not Sure",
    enTitle: "Not Sure",
    enDesc: "Use Vanisland property management framework to compare the options first.",
    zhTitle: "还不确定",
    zhDesc: "先用专业判断框架比较不同出租方案。",
  },
];
const NEXT_STEPS = [
  "Book a professional strategy review",
  "Request AI Marketing / Listing Service",
  "Request Full Property Management",
  "Request full rental market assessment",
  "Prepare listing marketing package",
  "Discuss property management",
  "Not ready yet - keep my intake on file",
];

const OPTION_LABELS_ZH = {
  Yes: "是",
  No: "否",
  Unsure: "不确定",
  "Not sure": "不确定",
  Email: "邮箱",
  Phone: "电话",
  "Text message": "短信",
  WeChat: "微信",
  House: "独立屋",
  Townhouse: "联排",
  Condo: "公寓",
  Duplex: "双拼",
  Suite: "套房",
  Acreage: "大地物业",
  Other: "其他",
  "Detached House": "独立屋",
  "Manufactured Home": "活动房屋",
  "Entire Detached House": "整栋独立屋",
  "Main / Upper Unit": "主层 / 楼上单元",
  "Basement / Secondary Suite": "地下套间 / 第二套房",
  "Entire Condo": "整套公寓",
  "Entire Townhouse": "整套联排屋",
  "Whole House with Main + Suite": "楼上加楼下整体出租",
  "One Duplex Unit": "双拼屋其中一个单元",
  "Room Rental": "单个房间出租",
  "Fully Private": "完全独享",
  "No Outdoor Space": "无户外空间",
  "Fully Fenced": "完全有围栏",
  "Partially Fenced": "部分有围栏",
  "Not Fenced": "没有围栏",
  "Not Applicable": "不适用",
  "Private In-unit": "套内独立洗衣",
  "No Laundry": "无洗衣设施",
  "Separate Meter": "独立电表",
  "Included in Rent": "包含在租金内",
  "Shared by Percentage": "按比例分摊",
  "Shared by Fixed Amount": "按固定金额分摊",
  "Tenant Pays Own Account": "租客自行开户缴费",
  "Maximize rent": "尽量提高租金",
  "Rent ASAP": "尽快出租",
  "Long-term Stable Tenant": "稳定长期租客",
  "Try Airbnb": "尝试 Airbnb",
  "Prepare for Sale Later": "之后准备出售",
  "Not Sure": "还不确定",
  Legal: "合法",
  "Unauthorized no permit": "未授权 / 无许可",
  "N/A": "不适用",
  "Fully private": "完全私密",
  "Shared yard": "共用院子",
  "No yard": "没有院子",
  Partial: "部分私密",
  "Find stable long-term tenant": "寻找稳定长期租客",
  "Compare long-term vs short-term rental": "比较长租和短租",
  "Rent part of the property": "出租部分物业",
  "Prepare property before listing": "出租前先整理物业",
  "Unsure - need professional advice": "不确定，需要专业建议",
  "Book a professional strategy review": "预约专业策略审核",
  "Request AI Marketing / Listing Service": "申请 AI 营销 / 房源发布服务",
  "Request Full Property Management": "申请完整物业管理服务",
  "Request full rental market assessment": "申请完整租赁市场评估",
  "Prepare listing marketing package": "准备房源营销套件",
  "Discuss property management": "咨询物业管理",
  "Not ready yet - keep my intake on file": "暂未准备好，先保留资料",
  "Rooms only": "只出租房间",
  "Whole home": "整套出租",
  "Operate myself": "自己运营",
  "Third-party operator": "第三方运营",
  Separated: "已分开",
  Shared: "共用",
  "Almost / soon": "快满 / 即将满",
};

const FOLLOW_UP_LABELS_ZH = {
  "Airbnb / STR": "Airbnb / 短租",
  "Existing Suite": "现有套房",
  "Suite Conversion": "套房改造",
  Backyard: "后院",
  "Pet Friendly": "宠物友好",
  "Owner Goal": "业主目标",
  "Ocean View": "海景",
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

export default function StrategyAssessment({ lang }) {
  const safeLang = normalizeLang(lang);
  const { assessmentId: reportRouteAssessmentId } = useParams();
  const copy = COPY[safeLang] || COPY.en;
  const labels = FIELD_LABELS[safeLang] || FIELD_LABELS.en;
  const formRef = useRef(null);
  const [form, setForm] = useState(() => createEmptyStrategyAssessment());
  const [photoNames, setPhotoNames] = useState([]);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const preliminary = useMemo(() => generatePreliminaryStrategySummary(form, safeLang), [form, safeLang]);
  const followUpQuestions = useMemo(() => getStrategyFollowUpQuestions(form), [form]);
  const steps = useMemo(() => [
    copy.sections.ownerInfo,
    copy.sections.propertyInfo,
    copy.sections.rentalStructure,
    copy.sections.keyFactors,
    `${copy.sections.ownerGoal} + ${copy.followTitle}`,
    copy.reviewTitle,
  ], [copy]);
  const isLastStep = step === steps.length - 1;
  const nextStepNeedsContact = submitted && [
    "Request AI Marketing / Listing Service",
    "Request Full Property Management",
  ].includes(submitted.nextStep);
  const sessionReport = reportRouteAssessmentId ? readStrategyReportSession() : null;
  const publicReport = sessionReport?.assessmentId === reportRouteAssessmentId ? sessionReport : null;

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => {
      if (field !== "rentalUnitType") return { ...current, [field]: value };
      return {
        ...current,
        rentalUnitType: value,
        existingSuite: "",
        separateEntrance: "",
        separateKitchen: "",
        laundryType: "",
        utilitiesArrangement: "",
        sharedAreas: "",
        suiteLegalStatus: "",
        suitePermitStatus: "",
        suiteBedrooms: "",
        suiteBathrooms: "",
        suiteRentImpactNotes: "",
        followUpAnswers: {},
      };
    });
  };

  const updateOwnerGoal = (value) => {
    setForm((current) => ({
      ...current,
      ownerGoal: value,
      airbnbInterest: value === "Try Airbnb" && !current.airbnbInterest ? "Yes" : current.airbnbInterest,
    }));
  };

  const updateFollowUp = (questionId) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      followUpAnswers: {
        ...(current.followUpAnswers || {}),
        [questionId]: value,
      },
    }));
  };

  const updateLegalCompliance = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      legalCompliance: {
        ...(current.legalCompliance || {}),
        [field]: value,
      },
    }));
  };

  const handlePhotoChange = (event) => {
    const names = Array.from(event.target.files || []).map((file) => file.name);
    setPhotoNames(names);
    setForm((current) => ({ ...current, photoFileNames: names.join(", ") }));
  };

  const goNext = () => {
    if (!formRef.current?.reportValidity()) return;
    if (step === 4 && !form.ownerGoal) {
      setError(safeLang === "zh" ? "请选择一个业主目标。" : "Please select an owner goal.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const rentalIntelligence = await getRentalIntelligenceKnowledge(form);
      const finalPreliminary = generatePreliminaryStrategySummary(form, safeLang, rentalIntelligence);
      const result = await submitStrategyAssessment({
        ...form,
        photoFileNames: photoNames.join(", "),
        preliminaryAssessment: finalPreliminary,
      }, safeLang);
      setSubmitted({
        assessmentId: result.assessmentId,
        nextStep: form.nextStep,
        assessment: finalPreliminary,
      });
      saveStrategyReportSession({
        assessmentId: result.assessmentId,
        nextStep: form.nextStep,
        assessment: finalPreliminary,
        savedAt: new Date().toISOString(),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setSubmitted(null);
    setForm(createEmptyStrategyAssessment());
    setPhotoNames([]);
    setStep(0);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderStep = () => {
    const unitType = form.rentalUnitType;
    const isSuiteUnit = unitType === "Basement / Secondary Suite";
    const isUpperUnit = unitType === "Main / Upper Unit";
    const isCombinedHouse = unitType === "Whole House with Main + Suite";
    const needsUnitSeparation = isSuiteUnit || isUpperUnit || isCombinedHouse;
    const showsSuiteDetails = isSuiteUnit || isCombinedHouse || form.existingSuite === "Yes";
    const showsOutdoor = !["Entire Condo", "Room Rental"].includes(unitType);
    if (step === 0) {
      return (
        <AssessmentSection title={copy.sections.ownerInfo}>
          <div className="form-row">
            <TextInput field="ownerName" form={form} update={update} labels={labels} required />
            <TextInput field="email" form={form} update={update} labels={labels} required type="email" />
          </div>
          <div className="form-row">
            <TextInput field="phone" form={form} update={update} labels={labels} required />
            <SelectInput field="preferredContact" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={CONTACT_OPTIONS} required />
          </div>
        </AssessmentSection>
      );
    }

    if (step === 1) {
      return (
        <AssessmentSection title={copy.sections.propertyInfo}>
          <TextInput field="propertyAddress" form={form} update={update} labels={labels} required />
          <div className="form-row">
            <TextInput field="city" form={form} update={update} labels={labels} required />
            <TextInput field="province" form={form} update={update} labels={labels} required />
          </div>
          <div className="form-row">
            <TextInput field="postalCode" form={form} update={update} labels={labels} />
            <TextInput field="communityArea" form={form} update={update} labels={labels} />
          </div>
          <div className="form-row">
            <SelectInput field="propertyBuildingType" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={PROPERTY_BUILDING_TYPES} required />
            <SelectInput field="rentalUnitType" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={RENTAL_UNIT_TYPES} required />
            <TextInput field="availableDate" form={form} update={update} labels={labels} type="date" />
          </div>
          <div className="form-row strategy-row-4">
            <TextInput field="bedrooms" form={form} update={update} labels={labels} type="number" min="0" />
            <TextInput field="bathrooms" form={form} update={update} labels={labels} type="number" min="0" step="0.5" />
            <TextInput field="garageSpaces" form={form} update={update} labels={labels} type="number" min="0" />
            <TextInput field="drivewayParking" form={form} update={update} labels={labels} type="number" min="0" />
          </div>
        </AssessmentSection>
      );
    }

    if (step === 2) {
      return (
        <>
          <AssessmentSection title={copy.sections.rentalStructure}>
            <div className="strategy-toggle-grid">
              <SelectInput field="furnished" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />
              {(unitType === "Entire Detached House" || unitType === "Entire Townhouse") && <SelectInput field="existingSuite" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />}
              {isUpperUnit && <SelectInput field="existingSuite" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />}
              {needsUnitSeparation && <SelectInput field="separateEntrance" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />}
              {(isSuiteUnit || isCombinedHouse) && <SelectInput field="separateKitchen" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />}
              {needsUnitSeparation && <SelectInput field="laundryType" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={LAUNDRY_TYPES} />}
              {needsUnitSeparation && <SelectInput field="utilitiesArrangement" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={UTILITIES_ARRANGEMENTS} />}
            </div>
            {needsUnitSeparation && <TextInput field="sharedAreas" form={form} update={update} labels={labels} placeholder={safeLang === "zh" ? "例如：车道、院子、楼梯间；没有则填写无" : "e.g. driveway, yard, stairwell; enter None if applicable"} />}
          </AssessmentSection>

          {showsSuiteDetails && <AssessmentSection title={copy.sections.suiteDetails}>
            <div className="strategy-toggle-grid">
              <SelectInput field="suiteLegalStatus" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={SUITE_LEGAL_STATUS_OPTIONS} />
              <TextInput field="suitePermitStatus" form={form} update={update} labels={labels} placeholder={safeLang === "zh" ? "例如：有许可 / 无许可 / 未核实" : "e.g. permitted / no permit / unverified"} />
              <TextInput field="suiteBedrooms" form={form} update={update} labels={labels} type="number" min="0" placeholder={safeLang === "zh" ? "套间卧室数（如已知）" : "Suite bedrooms (if known)"} />
              <TextInput field="suiteBathrooms" form={form} update={update} labels={labels} type="number" min="0" placeholder={safeLang === "zh" ? "套间卫生间数（如已知）" : "Suite bathrooms (if known)"} />
            </div>
            <div className="form-row">
              <TextInput field="suiteRentImpactNotes" form={form} update={update} labels={labels} placeholder={safeLang === "zh" ? "例如：独立院子可提高吸引力" : "e.g. private yard may improve appeal"} />
            </div>
          </AssessmentSection>}
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <AssessmentSection title={copy.sections.keyFactors}>
            <div className="strategy-toggle-grid">
              <SelectInput field="oceanView" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />
              {showsOutdoor && <SelectInput field="outdoorSpaceType" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={OUTDOOR_SPACE_TYPES} />}
              {showsOutdoor && <SelectInput field="fenceStatus" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={FENCE_STATUS_OPTIONS} />}
              <SelectInput field="petFriendly" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />
            </div>
            <TextArea field="knownIssues" form={form} update={update} labels={labels} rows={3} />
          </AssessmentSection>

          <AssessmentSection title={copy.sections.locationFactors}>
            <div className="strategy-toggle-grid">
              <SelectInput field="nearbyCommercialCentre" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />
              <TextInput field="locationRentPremium" form={form} update={update} labels={labels} placeholder={safeLang === "zh" ? "例如：轻微溢价 / 无明显溢价" : "e.g. modest premium / no clear premium"} />
            </div>
            <div className="form-row">
              <TextInput field="locationNotes" form={form} update={update} labels={labels} placeholder={safeLang === "zh" ? "例如：North Nanaimo，近商业中心" : "e.g. North Nanaimo, close to shops"} />
              <TextInput field="rentAdjustmentFactors" form={form} update={update} labels={labels} placeholder={safeLang === "zh" ? "例如：位置、交通、停车、院子" : "e.g. location, transit, parking, yard"} />
            </div>
          </AssessmentSection>

          <AssessmentSection title={copy.sections.airbnb}>
            <div className="notice notice--warm strategy-inline-notice">
              <p>{copy.strNotice}</p>
            </div>
            <div className="strategy-toggle-grid">
              {["airbnbInterest", "principalResidence", "ownerLivesOnSite", "thirdPartyOperatorInterest"].map((field) => (
                <SelectInput key={field} field={field} form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={YES_NO} />
              ))}
            </div>
            <TextInput field="strMunicipality" form={form} update={update} labels={labels} placeholder="e.g. Nanaimo, Victoria, Vancouver" />
          </AssessmentSection>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <AssessmentSection title={copy.sections.ownerGoal}>
            <GoalCards value={form.ownerGoal} onChange={updateOwnerGoal} lang={safeLang} />
            <div className="form-row strategy-goal-details">
              <TextInput field="targetRent" form={form} update={update} labels={labels} placeholder="e.g. $2,600/month" />
              <TextInput field="timelineUrgency" form={form} update={update} labels={labels} placeholder="e.g. ASAP, 30 days, after renovation" />
            </div>
          </AssessmentSection>

          <FollowUpQuestions
            questions={followUpQuestions}
            answers={form.followUpAnswers || {}}
            update={updateFollowUp}
            copy={copy}
            lang={safeLang}
          />
          <LegalComplianceCheck
            form={form}
            update={updateLegalCompliance}
            copy={copy}
            lang={safeLang}
          />
        </>
      );
    }

    return (
      <>
        <AssessmentSection title={copy.reviewTitle}>
          <p className="strategy-review-desc">{copy.reviewDesc}</p>
          <ReviewSummary form={form} preliminary={preliminary} questions={followUpQuestions} labels={labels} copy={copy} lang={safeLang} />
          <div className="strategy-review-next">
            <SelectInput field="nextStep" form={form} update={update} labels={labels} copy={copy} lang={safeLang} options={NEXT_STEPS} required />
            <div className="form-group">
              <label>{copy.photoLabel}</label>
              <input className="form-control" type="file" accept="image/*" multiple onChange={handlePhotoChange} />
              <p className="strategy-help">{copy.photoHelp}</p>
            </div>
            {photoNames.length > 0 && (
              <ul className="strategy-file-list">
                {photoNames.map((name) => <li key={name}>{name}</li>)}
              </ul>
            )}
            <label className="strategy-check">
              <input type="checkbox" checked={form.consentToContact} onChange={update("consentToContact")} required />
              <span>{labels.consentToContact}: {copy.consentText}</span>
            </label>
            <label className="strategy-check">
              <input type="checkbox" checked={form.privacyConsent} onChange={update("privacyConsent")} required />
              <span>{labels.privacyConsent}: {copy.privacyText}</span>
            </label>
          </div>
          <div className="notice notice--info strategy-inline-notice">
            <p>{safeLang === "zh"
              ? preliminary.disclaimer
              : preliminary.disclaimer}</p>
          </div>
        </AssessmentSection>

        <AssessmentSection title={copy.sections.aiAssessment}>
          <AssessmentPreview assessment={preliminary} copy={copy} />
          <div className="strategy-pdf-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => openStrategyAssessmentPdf(preliminary, copy, form.assessmentId || "DRAFT", safeLang)}
            >
              {copy.downloadPdf}
            </button>
            <p>{copy.pdfHelp}</p>
          </div>
        </AssessmentSection>
      </>
    );
  };

  if (reportRouteAssessmentId) {
    return (
      <div className="pub-page strategy-page">
        <section className="pub-hero">
          <h1 className="pub-hero__title">{copy.resultTitle}</h1>
          <p className="pub-hero__sub">{copy.title}</p>
          <p className="pub-hero__desc">{publicReport ? copy.reportGenerated : copy.publicReportMissing}</p>
        </section>

        <section className="section">
          <div className="container strategy-container">
            {publicReport ? (
              <StrategyReportResult
                assessment={publicReport.assessment}
                assessmentId={publicReport.assessmentId}
                nextStep={publicReport.nextStep}
                copy={copy}
                lang={safeLang}
                publicView
              />
            ) : (
              <div className="card strategy-success">
                <p>{copy.publicReportMissing}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="pub-page strategy-page">
        <section className="pub-hero">
          <h1 className="pub-hero__title">{copy.resultTitle}</h1>
          <p className="pub-hero__sub">{copy.title}</p>
          <p className="pub-hero__desc">{copy.reportGenerated}</p>
        </section>

        <section className="section">
          <div className="container strategy-container">
            <StrategyReportResult
              assessment={submitted.assessment}
              assessmentId={submitted.assessmentId}
              nextStep={submitted.nextStep}
              copy={copy}
              lang={safeLang}
              onStartOver={startOver}
            />
            {nextStepNeedsContact && (
              <div className="notice notice--success strategy-next-step-notice">
                <p>{copy.nextStepContact}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pub-page strategy-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{copy.title}</h1>
        <p className="pub-hero__sub">{copy.subtitle}</p>
        <p className="pub-hero__desc">{copy.desc}</p>
        <ul className="strategy-hero-bullets">
          {copy.bullets.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="section">
        <div className="container strategy-container">
          {error && (
            <div className="notice notice--error">
              <p>{error}</p>
            </div>
          )}

          <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="strategy-form">
            <WizardProgress step={step} steps={steps} copy={copy} />
            {renderStep()}

            <div className="strategy-wizard-actions">
              <button type="button" className="btn btn--ghost" onClick={goBack} disabled={step === 0 || submitting}>
                {copy.back}
              </button>
              {isLastStep ? (
                <button type="button" className="btn btn--sage" onClick={() => {
                  if (formRef.current?.reportValidity()) handleSubmit();
                }} disabled={submitting}>
                  {submitting ? copy.submitting : copy.generate}
                </button>
              ) : (
                <button type="button" className="btn btn--sage" onClick={goNext}>
                  {copy.next}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function AssessmentSection({ title, children }) {
  return (
    <section className="card strategy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function StrategyReportResult({ assessment, assessmentId, nextStep, copy, lang, onStartOver, publicView = false }) {
  const rows = buildStrategyResultRows(assessment, copy);

  return (
    <div className="card strategy-success strategy-result-card">
      <div className="strategy-result-card__top">
        <div>
          <p className="strategy-success__label">{copy.assessmentId}</p>
          <h2>{assessmentId}</h2>
          <p>{copy.reportGenerated}</p>
          <p><strong>{copy.nextStepSelected}</strong> {nextStep || copy.notSelected}</p>
        </div>
        <div className="strategy-result-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openStrategyAssessmentPdf(assessment, copy, assessmentId, lang)}
          >
            {copy.viewProfessionalReport}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => openStrategyAssessmentPdf(assessment, copy, assessmentId, lang, true)}
          >
            {copy.printSavePdf}
          </button>
          {!publicView && (
            <button type="button" className="btn btn--ghost" onClick={onStartOver}>
              {copy.startOver}
            </button>
          )}
        </div>
      </div>

      <div className="strategy-result-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="strategy-result-item">
            <span>{label}</span>
            {Array.isArray(value) ? (
              <ul>{value.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : (
              <strong>{value}</strong>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WizardProgress({ step, steps, copy }) {
  const percent = ((step + 1) / steps.length) * 100;
  return (
    <div className="strategy-progress">
      <div className="strategy-progress__top">
        <span>{copy.progress.replace("{current}", String(step + 1)).replace("{total}", String(steps.length))}</span>
        <strong>{steps[step]}</strong>
      </div>
      <div className="strategy-progress__bar" aria-hidden="true">
        <div style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function GoalCards({ value, onChange, lang }) {
  return (
    <div className="strategy-goal-grid">
      {OWNER_GOALS.map((goal) => {
        const selected = value === goal.value;
        return (
          <label
            key={goal.value}
            className={`strategy-goal-card${selected ? " strategy-goal-card--active" : ""}`}
            onClick={() => onChange(goal.value)}
          >
            <input
              type="radio"
              name="ownerGoal"
              value={goal.value}
              checked={selected}
              onChange={() => onChange(goal.value)}
            />
            <strong>{lang === "zh" ? goal.zhTitle : goal.enTitle}</strong>
            <span>{lang === "zh" ? goal.zhDesc : goal.enDesc}</span>
          </label>
        );
      })}
    </div>
  );
}

function ReviewSummary({ form, preliminary, questions, labels, copy, lang }) {
  const answers = form.followUpAnswers || {};
  const legalRisk = getLegalRiskFlag(form);
  const answeredFollowUps = questions
    .map((item) => {
      const answer = String(answers[item.id] || "").trim();
      if (!answer) return null;
      return {
        question: lang === "zh" ? (FOLLOW_UP_QUESTIONS_ZH[item.id] || item.question) : item.question,
        answer: displayOption(answer, lang),
      };
    })
    .filter(Boolean);

  const summaryRows = [
    [copy.assessmentId.replace("Assessment ID", "Owner").replace("初评编号", "业主"), form.ownerName || "-"],
    [labels.propertyAddress, formatDisplayAddress(form) || "-"],
    [labels.ownerGoal, displayOption(form.ownerGoal, lang) || "-"],
    [copy.legalRisk, displayOption(legalRisk, lang)],
  ];
  const strengths = Array.isArray(preliminary.propertyStrengths) ? preliminary.propertyStrengths.slice(0, 3) : [];
  const risks = Array.isArray(preliminary.rentalChallenges) ? preliminary.rentalChallenges.slice(0, 3) : [];

  return (
    <div className="strategy-review">
      <div className="strategy-review__grid">
        {summaryRows.map(([label, value]) => (
          <div key={label} className="strategy-review__item">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="strategy-review__columns">
        <ReviewList title={lang === "zh" ? "关键优势" : "Key strengths"} items={strengths} />
        <ReviewList title={lang === "zh" ? "关键风险" : "Key risks"} items={risks} />
      </div>

      <div className="strategy-review__followups">
        <h3>{lang === "zh" ? "追问答案" : "Follow-up answers"}</h3>
        {answeredFollowUps.length ? (
          <ul>
            {answeredFollowUps.map((item) => (
              <li key={`${item.question}-${item.answer}`}>
                <span>{item.question}</span>
                <strong>{item.answer}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>{lang === "zh" ? "暂未填写追问答案。" : "No follow-up answers yet."}</p>
        )}
      </div>
    </div>
  );
}

function ReviewList({ title, items }) {
  return (
    <div className="strategy-review__list">
      <h3>{title}</h3>
      {items.length ? (
        <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <p>-</p>
      )}
    </div>
  );
}

function displayOption(option, lang) {
  return lang === "zh" ? (OPTION_LABELS_ZH[option] || option) : option;
}

function formatDisplayAddress(form) {
  const cityProvincePostal = [form.city, form.province, form.postalCode].filter(Boolean).join(" ");
  return [form.propertyAddress, cityProvincePostal].filter(Boolean).join(", ");
}

function FollowUpQuestions({ questions, answers, update, copy, lang }) {
  if (!questions.length) {
    return (
      <section className="card strategy-section strategy-follow-up">
        <h2>{copy.followTitle}</h2>
        <p className="strategy-help">{copy.followEmpty}</p>
      </section>
    );
  }

  const groups = questions.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <details className="card strategy-section strategy-follow-up" open>
      <summary>
        <span>{copy.followTitle}</span>
        <small>{questions.length} {questions.length === 1 ? copy.questionSingular : copy.questionPlural}</small>
      </summary>
      <div className="strategy-follow-up__body">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="strategy-follow-up__group">
            <h3>{lang === "zh" ? (FOLLOW_UP_LABELS_ZH[group] || group) : group}</h3>
            <div className="strategy-follow-up__grid">
              {items.map((item) => (
                <FollowUpField key={item.id} item={item} value={answers[item.id] || ""} update={update(item.id)} copy={copy} lang={lang} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function FollowUpField({ item, value, update, copy, lang }) {
  const question = lang === "zh" ? (FOLLOW_UP_QUESTIONS_ZH[item.id] || item.question) : item.question;
  return (
    <div className="form-group strategy-follow-up__field">
      <label>{question}</label>
      {item.type === "text" ? (
        <input className="form-control" value={value} onChange={update} placeholder={copy.shortAnswer} />
      ) : (
        <select className="form-control" value={value} onChange={update}>
          <option value="">{copy.select}</option>
          {(item.options || FOLLOW_UP_YES_NO).map((option) => (
            <option key={option} value={option}>{displayOption(option, lang)}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function LegalComplianceCheck({ form, update, copy, lang }) {
  const legal = form.legalCompliance || {};
  const warning = hasOwnerOccupancyLegalWarning(form);
  const options1 = ["No", "Yes", "Not sure"];
  const options2 = ["Yes", "No", "Almost / soon", "Not sure"];

  return (
    <section className="card strategy-section strategy-legal-check">
      <h2>{copy.legalTitle}</h2>
      <p className="strategy-help">{copy.legalDesc}</p>
      <div className="strategy-legal-grid">
        <div className="form-group">
          <label>{copy.legalQ1}</label>
          <select
            className="form-control"
            value={legal.previousTenantOwnerOccupancy || ""}
            onChange={update("previousTenantOwnerOccupancy")}
          >
            <option value="">{copy.select}</option>
            {options1.map((option) => <option key={option} value={option}>{displayOption(option, lang)}</option>)}
          </select>
        </div>

        {legal.previousTenantOwnerOccupancy === "Yes" && (
          <div className="form-group">
            <label>{copy.legalQ2}</label>
            <select
              className="form-control"
              value={legal.occupiedAtLeast12Months || ""}
              onChange={update("occupiedAtLeast12Months")}
            >
              <option value="">{copy.select}</option>
              {options2.map((option) => <option key={option} value={option}>{displayOption(option, lang)}</option>)}
            </select>
          </div>
        )}
      </div>

      {warning && (
        <div className="notice notice--warning strategy-legal-warning">
          <h4>{copy.legalWarningTitle}</h4>
          <p>{copy.legalWarning}</p>
        </div>
      )}
    </section>
  );
}

function TextInput({ field, form, update, labels, type = "text", required = false, ...rest }) {
  return (
    <div className="form-group">
      <label>{labels[field]}{required ? " *" : ""}</label>
      <input className="form-control" type={type} value={form[field]} onChange={update(field)} required={required} {...rest} />
    </div>
  );
}

function SelectInput({ field, form, update, labels, copy, lang = "en", options, required = false }) {
  return (
    <div className="form-group">
      <label>{labels[field]}{required ? " *" : ""}</label>
      <select className="form-control" value={form[field]} onChange={update(field)} required={required}>
        <option value="">{copy.select}</option>
        {options.map((option) => <option key={option} value={option}>{displayOption(option, lang)}</option>)}
      </select>
    </div>
  );
}

function TextArea({ field, form, update, labels, rows = 4 }) {
  return (
    <div className="form-group">
      <label>{labels[field]}</label>
      <textarea className="form-control" rows={rows} value={form[field]} onChange={update(field)} />
    </div>
  );
}

// Section order follows the 9-part professional report structure:
// summary -> positioning -> local rent judgment -> supporting/limiting
// factors -> target tenant -> strategy -> market risks -> next steps,
// followed by supplementary detail sections. communityRentPositioningJudgment
// / communityMarketingAngles / communityRisksToVerify / aiConfidenceFlags are
// intentionally left out here (raw AI flags and duplicate rent commentary
// stay out of the client-facing report) even though they still exist in the
// saved JSON for admin traceability.
function buildAssessmentReportRows(assessment, copy) {
  return [
    [copy.report.propertyClassification, assessment.propertyClassification],
    [copy.report.executiveSummary, assessment.executiveSummary],
    [copy.report.propertyPositioning, assessment.propertyPositioning],
    [copy.report.estimatedRentRange, assessment.estimatedRentRange],
    [copy.report.propertyStrengths, assessment.propertyStrengths],
    [copy.report.rentalChallenges, assessment.rentalChallenges],
    [copy.report.targetTenantProfile, assessment.targetTenantProfile],
    [copy.report.suggestedRentalStrategy, assessment.suggestedRentalStrategy],
    [copy.report.marketRisks, assessment.marketRisks],
    [copy.report.nextSteps, assessment.nextSteps],
    [copy.report.suiteSplitRentalPotential, assessment.suiteSplitRentalPotential],
    [copy.report.suiteQualityPrivacy, assessment.suiteQualityPrivacy],
    [copy.report.locationRentAdjustment, assessment.locationRentAdjustment],
    [copy.report.communityLocationAnalysis, assessment.communityLocationAnalysis],
    [copy.report.airbnbStrRegulationCheck, assessment.airbnbStrRegulationCheck],
    [copy.report.legalComplianceRisk, assessment.legalComplianceRisk],
    [copy.report.aiAssessmentConfidence, assessment.aiAssessmentConfidence],
    [copy.report.marketingSuggestions, assessment.marketingSuggestions],
    [copy.report.ownerGoalAlignment, assessment.professionalPreliminaryRecommendation || assessment.ownerGoalAlignment],
    [copy.report.recommendedNextStep, assessment.recommendedNextStep],
    [copy.report.knowledgeCenter, assessment.knowledgeLinks],
    [copy.report.disclaimer, assessment.disclaimer],
  ].filter(([, value]) => !(Array.isArray(value) && value.length === 0));
}

function buildStrategyResultRows(assessment, copy) {
  return [
    [copy.report.executiveSummary, firstText(assessment.executiveSummary)],
    [copy.report.suggestedRentalStrategy, firstText(assessment.suggestedRentalStrategy)],
    [copy.estimatedRent, firstText(assessment.estimatedRentRange)],
    [copy.strategyConfidence, getPdfConfidenceLabel(assessment.aiAssessmentConfidence)],
    [copy.keyRiskNotes, summarizeList(assessment.legalComplianceRisk || assessment.rentalChallenges)],
    [copy.ownerNextSteps, firstText(assessment.recommendedNextStep)],
  ];
}

function AssessmentPreview({ assessment, copy }) {
  const rows = buildAssessmentReportRows(assessment, copy);

  return (
    <div className="strategy-assessment-preview">
      {rows.map(([title, value]) => (
        <div key={title} className="strategy-report-block">
          <h3>{title}</h3>
          {Array.isArray(value) && value.length > 0 && value[0]?.links ? (
            <div className="strategy-report-link-groups">
              {value.map((group) => (
                <div key={group.title} className="strategy-report-link-group">
                  <h4>{group.title}</h4>
                  <ul className="strategy-report-links">
                    {group.links.map((item) => (
                      <li key={item.href}>
                        <a href={item.href}>{langAwareLinkLabel(item.label, copy)}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : Array.isArray(value) && value.length > 0 && typeof value[0] === "object" ? (
            <ul className="strategy-report-links">
              {value.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          ) : Array.isArray(value) ? (
            <ul>{value.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : (
            <p>{value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function openStrategyAssessmentPdf(assessment, copy, assessmentId, lang, autoPrint = false) {
  if (!assessment) return;
  const safeId = String(assessmentId || "DRAFT").replace(/[\\/:*?"<>|]/g, "-");
  const fileName = `Property-Strategy-Assessment-${safeId}.pdf`;
  const title = lang === "zh" ? "物业出租策略评估报告" : "Property Strategy Assessment Report";
  const generatedDate = new Date().toLocaleDateString(lang === "zh" ? "zh-CN" : "en-CA", { year: "numeric", month: "long", day: "numeric" });
  const rows = buildAssessmentReportRows(assessment, copy);
  const printWindow = window.open("", "_blank", "width=860,height=1100");
  if (!printWindow) return;
  const html = renderStructuredProfessionalReportHtml({
    reportType: "Property Strategy Assessment",
    language: lang,
    title,
    subtitle: lang === "zh" ? "基于现有物业资料生成的出租策略初步评估。" : "Preliminary rental strategy assessment based on current property information.",
    fileName,
    copy: {
      preparedBy: lang === "zh" ? "出具方" : "Prepared by",
      overview: lang === "zh" ? "总览" : "Overview",
      executiveSummary: lang === "zh" ? "执行摘要" : "Executive Summary",
      aiRecommendation: lang === "zh" ? "AI 建议" : "AI Recommendation",
      footerNotice: lang === "zh" ? "AI 初步评估，最终策略需专业审核。" : "AI preliminary assessment. Final strategy requires professional review.",
    },
    meta: [
      { label: lang === "zh" ? "评估编号" : "Assessment ID", value: safeId },
      { label: lang === "zh" ? "生成日期" : "Generated Date", value: generatedDate },
      { label: lang === "zh" ? "语言" : "Language", value: lang === "zh" ? "中文" : "English" },
    ],
    executiveSummary: [
      { label: lang === "zh" ? "物业位置" : "Property Location", value: firstText(assessment.executiveSummary) },
      { label: lang === "zh" ? "预估租金" : "Estimated Rent", value: firstText(assessment.estimatedRentRange) },
      { label: lang === "zh" ? "策略信心" : "Strategy Confidence", value: getPdfConfidenceLabel(assessment.aiAssessmentConfidence) },
      { label: lang === "zh" ? "建议出租策略" : "Recommended Rental Strategy", value: firstText(assessment.suggestedRentalStrategy) },
      { label: lang === "zh" ? "主要风险等级" : "Key Risk Level", value: firstText(assessment.legalComplianceRisk) },
    ],
    aiRecommendation: firstText(assessment.recommendedNextStep),
    recommendationTone: "warning",
    notice: assessment.disclaimer,
    sections: rows.map(([title, value]) => ({ title, items: strategyPdfItems(value, copy) })),
  });
  printWindow.document.write(html);
  printWindow.document.close();
  if (autoPrint) {
    printWindow.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 350);
  }
}

function firstText(value) {
  if (Array.isArray(value)) return String(value[0] || "-");
  return String(value || "-");
}

function strategyPdfItems(value, copy) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item?.links) return [`${item.title}: ${item.links.map((link) => langAwareLinkLabel(link.label, copy)).join(", ")}`];
      return [String(item || "")];
    }).filter(Boolean);
  }
  return [String(value || "-")];
}

function summarizeList(value) {
  if (Array.isArray(value)) {
    const filtered = value.map((item) => String(item || "").trim()).filter(Boolean);
    return filtered.length ? filtered.slice(0, 3) : "-";
  }
  return firstText(value);
}

function langAwareLinkLabel(label, copy) {
  const prefix = copy.report?.knowledgeCenter === "房东知识中心" ? "查看：✓ " : "Review: ✓ ";
  return `${prefix}${label}`;
}

function getPdfConfidenceLabel(value) {
  const lines = Array.isArray(value) ? value : [value];
  const first = String(lines[0] || "");
  return first.replace(/^AI 评估信心：/, "").replace(/^AI Assessment Confidence: /, "").replace(/^Assessment Confidence：/, "").replace(/^Assessment Confidence: /, "") || "Preliminary";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
