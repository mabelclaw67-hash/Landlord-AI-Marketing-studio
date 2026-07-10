// ============================================================================
// Nanaimo Local Rent Pricing Framework
// ----------------------------------------------------------------------------
// This module encodes Mabel Chen / Vanisland Property Management's actual
// local leasing experience in Nanaimo into a deterministic, traceable pricing
// engine. It is the "local rental judgment rules" layer of the Rental
// Intelligence Knowledge Base referenced by strategyAssessment.js.
//
// It intentionally does NOT duplicate the Community_Knowledge_Base Google
// Sheet (which supplies lifestyle/community context such as schools,
// shopping, transit). This file supplies the pricing logic only, so the
// system keeps a single source of truth per property type / region and does
// not create a second, competing price database.
//
// Every number below comes from Mabel's stated Nanaimo rental experience
// (see project brief, section IV). Bands are deliberately conservative and
// documented so the report can explain *why* a price was recommended.
// ============================================================================

function toNumber(value) {
  const n = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function round10(value) {
  return Math.round(value / 10) * 10;
}

function round25(value) {
  return Math.round(value / 25) * 25;
}

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

// ---------------------------------------------------------------------------
// 1. Region classification
// ---------------------------------------------------------------------------
// tier: "north" = full band, no discount; "other" = typically ~$100 below
// North Nanaimo for comparable unit types (per Mabel's section VII notes).
const REGION_DEFS = [
  {
    code: "dover-bay-mcgirr",
    tier: "north",
    match: ["dover bay", "mcgirr", "dover-bay"],
    en: "Dover Bay / McGirr school catchment",
    zh: "Dover Bay / McGirr 学区",
  },
  {
    code: "north-nanaimo",
    tier: "north",
    match: ["north nanaimo", "north-nanaimo", "北区", "北奈"],
    en: "North Nanaimo",
    zh: "North Nanaimo（北区）",
  },
  {
    code: "departure-bay",
    tier: "other",
    match: ["departure bay", "departure-bay"],
    en: "Departure Bay",
    zh: "Departure Bay",
  },
  {
    code: "downtown",
    tier: "other",
    match: ["downtown", "old city", "市中心"],
    en: "Downtown Nanaimo",
    zh: "Downtown Nanaimo（市中心）",
  },
  {
    code: "viu",
    tier: "other",
    match: ["viu", "university district", "vancouver island university"],
    en: "VIU / University District",
    zh: "VIU / University District 大学周边",
  },
  {
    code: "south-nanaimo",
    tier: "other",
    match: ["south nanaimo", "south-nanaimo", "南区"],
    en: "South Nanaimo",
    zh: "South Nanaimo（南区）",
  },
  {
    code: "westwood-lake",
    tier: "other",
    match: ["westwood lake", "westwood-lake"],
    en: "Westwood Lake",
    zh: "Westwood Lake",
  },
  {
    code: "central-nanaimo",
    tier: "other",
    match: ["central nanaimo", "central-nanaimo"],
    en: "Central Nanaimo",
    zh: "Central Nanaimo（中区）",
  },
  {
    code: "lantzville",
    tier: "other",
    match: ["lantzville"],
    en: "Lantzville",
    zh: "Lantzville",
  },
];

export function getNanaimoRegion(form) {
  const text = [form.communityArea, form.city, form.locationNotes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const region of REGION_DEFS) {
    if (region.match.some((keyword) => text.includes(keyword))) return region;
  }
  if (text.includes("nanaimo")) {
    return { code: "nanaimo-general", tier: "other", en: "Nanaimo (unspecified community)", zh: "Nanaimo（社区未指定）" };
  }
  return { code: "unknown", tier: "other", en: "Unspecified location", zh: "位置未指定" };
}

// ---------------------------------------------------------------------------
// 2. Rental type classification
// ---------------------------------------------------------------------------
// The intake form captures the unit actually being marketed: bedrooms /
// bathrooms describe that unit, propertyType says House / Condo / Suite /
// etc., and existingSuite = "Yes" means there is a separately tenanted
// (or tenantable) suite elsewhere in the property (almost always the
// basement, occupied by someone other than the tenant of the unit being
// priced here).
export const RENTAL_TYPE = {
  ONE_BED_SUITE: "one_bed_suite",
  TWO_BED_SUITE: "two_bed_suite",
  CONDO: "condo",
  UPPER_3BED2BATH: "upper_3bed2bath",
  UPPER_4BED3BATH_GARAGE: "upper_4bed3bath_garage",
  UPPER_4BED3BATH_NO_GARAGE: "upper_4bed3bath_no_garage",
  WHOLE_HOUSE_4BED3BATH: "whole_house_4bed3bath",
  WHOLE_HOUSE_GENERAL: "whole_house_general",
  COMBO_UPPER_LOWER: "combo_upper_lower",
  OTHER: "other",
};

const TYPE_LABELS = {
  [RENTAL_TYPE.ONE_BED_SUITE]: { en: "One-bedroom basement / secondary suite", zh: "一房一卫地下套间" },
  [RENTAL_TYPE.TWO_BED_SUITE]: { en: "Two-bedroom basement / secondary suite", zh: "两房一卫地下套间" },
  [RENTAL_TYPE.CONDO]: { en: "Condo apartment", zh: "公寓（Condo）" },
  [RENTAL_TYPE.UPPER_3BED2BATH]: { en: "3-bed / 2-bath upper unit (suite occupied separately downstairs)", zh: "三房两卫楼上独立单元（楼下另有租客）" },
  [RENTAL_TYPE.UPPER_4BED3BATH_GARAGE]: { en: "4-bed / 3-bath upper unit with garage (suite occupied separately downstairs)", zh: "四房三卫楼上独立单元，有车库（楼下另有套间）" },
  [RENTAL_TYPE.UPPER_4BED3BATH_NO_GARAGE]: { en: "4-bed / 3-bath upper unit, no garage (suite occupied separately downstairs)", zh: "四房三卫楼上独立单元，无车库（楼下另有套间）" },
  [RENTAL_TYPE.WHOLE_HOUSE_4BED3BATH]: { en: "4-bed / 3-bath whole house (no separate downstairs tenant)", zh: "四房三卫整栋独立屋（无楼下其他租客）" },
  [RENTAL_TYPE.WHOLE_HOUSE_GENERAL]: { en: "Whole house rental", zh: "整栋独立屋出租" },
  [RENTAL_TYPE.COMBO_UPPER_LOWER]: { en: "Upper + lower combined property", zh: "楼上加楼下组合物业" },
  [RENTAL_TYPE.OTHER]: { en: "Property type needs manual review", zh: "物业类型需人工判断" },
};

export function classifyNanaimoRentalType(form) {
  const propertyType = String(form.propertyType || "").toLowerCase();
  const rentalUnitType = String(form.rentalUnitType || "");
  const bed = toNumber(form.bedrooms);
  const bath = toNumber(form.bathrooms);
  const hasLowerSuite = form.existingSuite === "Yes";
  const garage = toNumber(form.garageSpaces);
  const suiteBed = toNumber(form.suiteBedrooms);

  let code;

  if (rentalUnitType === "Basement / Secondary Suite") {
    code = bed <= 1 ? RENTAL_TYPE.ONE_BED_SUITE : RENTAL_TYPE.TWO_BED_SUITE;
  } else if (rentalUnitType === "Entire Condo") {
    code = RENTAL_TYPE.CONDO;
  } else if (rentalUnitType === "Whole House with Main + Suite") {
    code = RENTAL_TYPE.COMBO_UPPER_LOWER;
  } else if (rentalUnitType === "Main / Upper Unit" && bed === 3 && bath >= 2) {
    code = RENTAL_TYPE.UPPER_3BED2BATH;
  } else if (rentalUnitType === "Main / Upper Unit" && bed >= 4 && bath >= 3) {
    code = garage > 0 ? RENTAL_TYPE.UPPER_4BED3BATH_GARAGE : RENTAL_TYPE.UPPER_4BED3BATH_NO_GARAGE;
  } else if (["Entire Detached House", "Entire Townhouse", "One Duplex Unit"].includes(rentalUnitType)) {
    code = bed >= 4 && bath >= 3 ? RENTAL_TYPE.WHOLE_HOUSE_4BED3BATH : RENTAL_TYPE.WHOLE_HOUSE_GENERAL;
  } else if (propertyType === "suite") {
    code = bed <= 1 ? RENTAL_TYPE.ONE_BED_SUITE : RENTAL_TYPE.TWO_BED_SUITE;
  } else if (propertyType === "condo") {
    code = RENTAL_TYPE.CONDO;
  } else if (hasLowerSuite && bed >= 5 && suiteBed > 0) {
    // Owner explicitly supplied a lower-suite bedroom count alongside a
    // large total -> genuine upper+lower combo property.
    code = RENTAL_TYPE.COMBO_UPPER_LOWER;
  } else if (hasLowerSuite && bed === 3 && bath >= 2) {
    code = RENTAL_TYPE.UPPER_3BED2BATH;
  } else if (hasLowerSuite && bed >= 4 && bath >= 3) {
    code = garage > 0 ? RENTAL_TYPE.UPPER_4BED3BATH_GARAGE : RENTAL_TYPE.UPPER_4BED3BATH_NO_GARAGE;
  } else if (!hasLowerSuite && bed >= 4 && bath >= 3) {
    code = RENTAL_TYPE.WHOLE_HOUSE_4BED3BATH;
  } else if (!hasLowerSuite && (propertyType === "house" || propertyType === "townhouse" || propertyType === "duplex" || propertyType === "acreage")) {
    code = RENTAL_TYPE.WHOLE_HOUSE_GENERAL;
  } else if (!propertyType && !bed) {
    code = RENTAL_TYPE.OTHER;
  } else {
    code = RENTAL_TYPE.OTHER;
  }

  return { code, ...TYPE_LABELS[code] };
}

// ---------------------------------------------------------------------------
// 3. Base bands by type (Mabel's stated Nanaimo experience ranges)
// ---------------------------------------------------------------------------
// Each band: base [lo, hi], strongCeiling (very good condition), hardCeiling
// (price above which tenant acceptance drops sharply), regionShift$ applied
// when region.tier === "other" (skipped for types with their own explicit
// region bands, e.g. whole house).
// regionShift is only applied to types where Mabel's framework explicitly
// states a regional difference (3-bed and 4-bed upper units). One-bed/two-bed
// suites, condos, and general whole-house figures are stated as flat Nanaimo
// baselines in her notes, so no automatic numeric shift is applied there -
// region still shows up as commentary and through the general factor score.
const TYPE_BANDS = {
  [RENTAL_TYPE.ONE_BED_SUITE]: { base: [1400, 1500], strongCeiling: 1600, hardCeiling: 1750, regionShift: 0 },
  [RENTAL_TYPE.TWO_BED_SUITE]: { base: [1700, 1900], strongCeiling: 2000, hardCeiling: 2000, regionShift: 0 },
  [RENTAL_TYPE.CONDO]: { base: [2200, 2300], strongCeiling: 2400, hardCeiling: 2450, regionShift: 0 },
  [RENTAL_TYPE.UPPER_3BED2BATH]: { base: [2400, 2700], strongCeiling: 2800, hardCeiling: 2800, regionShift: 100 },
  [RENTAL_TYPE.UPPER_4BED3BATH_GARAGE]: { base: [2800, 3200], strongCeiling: 3300, hardCeiling: 3300, regionShift: 100 },
  [RENTAL_TYPE.UPPER_4BED3BATH_NO_GARAGE]: { base: [2800, 3000], strongCeiling: 3000, hardCeiling: 3100, regionShift: 100, softFloor: [2700, 2900] },
  // Whole house 4bed3bath has explicit region-specific bands, handled separately below.
  [RENTAL_TYPE.WHOLE_HOUSE_GENERAL]: { base: [3300, 3500], strongCeiling: 3700, hardCeiling: 3700, regionShift: 100 },
  [RENTAL_TYPE.OTHER]: { base: [1800, 2400], strongCeiling: 2600, hardCeiling: 2800, regionShift: 0 },
};

function getWholeHouseBand(region) {
  if (region.tier === "north") return { base: [3500, 3700], strongCeiling: 3800, hardCeiling: 3700, softFloor: [3500, 3700] };
  return { base: [3300, 3500], strongCeiling: 3600, hardCeiling: 3600, softFloor: [3200, 3300] };
}

// ---------------------------------------------------------------------------
// 4. Condition / feature scoring (supporting vs limiting factors)
// ---------------------------------------------------------------------------
const POSITIVE_TEXT_KEYWORDS = [
  { re: /(newer|renovated|updated|new roof|new kitchen|新装修|翻新|重新装修|较新|全新|装修较好|装修不错|品质较好|状态很好|状况良好|状态良好)/i, weight: 2, en: "Owner notes indicate a newer or recently renovated home", zh: "业主备注显示房屋较新或近期有翻新" },
  { re: /(bright|good light|lots of light|采光好|采光佳|明亮|阳光充足)/i, weight: 1, en: "Good natural light was noted", zh: "已记录良好采光条件" },
  { re: /(spacious|large living room|open concept|宽敞|空间大|客厅大)/i, weight: 1, en: "Above-average room/living space was noted", zh: "记录显示客厅或房间面积较大" },
  { re: /(quiet street|quiet neighbourhood|安静|僻静)/i, weight: 0.5, en: "Quiet street/neighbourhood noted", zh: "备注显示街区安静" },
];

const NEGATIVE_TEXT_KEYWORDS = [
  { re: /(older home|outdated|needs repair|needs work|deferred maintenance|较旧|老旧|维修较多|需要维修|状况较差|破损)/i, weight: 2, en: "Owner notes indicate an older home or deferred maintenance", zh: "业主备注显示房屋较旧或维修较多" },
  { re: /(dark|low light|faces north|采光差|光线不足|朝北|较暗)/i, weight: 1, en: "Limited natural light was noted", zh: "记录显示采光较差" },
  { re: /(small|tight space|cramped|空间较小|偏小)/i, weight: 1, en: "Below-average room/living space was noted", zh: "记录显示空间偏小" },
  { re: /(basement feel|low ceiling|地下室压抑|层高低|压抑)/i, weight: 1, en: "A basement / low-ceiling feel was noted", zh: "记录显示地下室压抑感明显" },
];

function scanTextFactors(form, list) {
  const text = [form.knownIssues, form.rentAdjustmentFactors, form.locationRentPremium, form.suiteRentImpactNotes, form.locationNotes, form.suiteSharedAreas]
    .filter(Boolean)
    .join(" \n ");
  if (!text) return [];
  return list.filter((entry) => entry.re.test(text));
}

export function scorePropertyFactors(form, followUps = {}) {
  const supporting = [];
  const limiting = [];
  let score = 0;

  if (form.oceanView === "Yes") {
    score += 2;
    supporting.push({ en: "Confirmed ocean view", zh: "已确认海景" });
  }
  const garage = toNumber(form.garageSpaces);
  const driveway = toNumber(form.drivewayParking);
  if (garage > 0) {
    score += 1.5;
    supporting.push({ en: `${garage} garage space(s) confirmed`, zh: `已确认 ${garage} 个车库车位` });
  } else if (driveway > 0) {
    score += 0.5;
    supporting.push({ en: `${driveway} driveway parking space(s) confirmed`, zh: `已确认 ${driveway} 个车道停车位` });
  } else {
    score -= 1;
    limiting.push({ en: "No garage or driveway parking confirmed", zh: "未确认车库或车道停车位" });
  }
  const outdoorSpaceType = form.outdoorSpaceType || (form.privateYard === "Yes" || form.suiteYardPrivacy === "Fully private" ? "Fully Private" : "");
  if (outdoorSpaceType === "Fully Private") {
    score += 1.5;
    supporting.push({ en: "Private outdoor space confirmed", zh: "已确认独立私人户外空间" });
  } else if (["Shared", "No Outdoor Space"].includes(outdoorSpaceType) || (!form.outdoorSpaceType && (form.suiteYardPrivacy === "Shared yard" || form.suiteYardPrivacy === "No yard" || (form.fencedBackyard !== "Yes" && form.privateYard !== "Yes")))) {
    score -= 1;
    limiting.push({ en: "Shared or no private outdoor space", zh: "户外空间为共用或无独立户外空间" });
  }
  if (form.separateEntrance === "Yes" || followUps.suiteSeparateEntrance === "Yes") {
    score += 1;
    supporting.push({ en: "Separate entrance confirmed", zh: "已确认独立入口" });
  }
  if (form.utilitiesArrangement === "Separate Meter" || (!form.utilitiesArrangement && (form.suiteHydroMeter === "Yes" || form.separateMeter === "Yes"))) {
    score += 0.5;
    supporting.push({ en: "Separate hydro meter confirmed", zh: "已确认独立水电表" });
  } else if (["Shared by Percentage", "Shared by Fixed Amount"].includes(form.utilitiesArrangement) || (!form.utilitiesArrangement && form.utilitiesShared === "Yes")) {
    score -= 1;
    limiting.push({ en: "Utilities are shared with another unit", zh: "水电与其他单元共用" });
  }
  if (form.laundryType === "Shared" || form.laundryType === "No Laundry" || (!form.laundryType && (followUps.suiteSeparateLaundry === "No" || form.separateLaundry === "No"))) {
    score -= 1;
    limiting.push({ en: "Shared laundry (no independent laundry)", zh: "洗衣为共用，无独立洗衣" });
  } else if (form.laundryType === "Private In-unit" || (!form.laundryType && (form.separateLaundry === "Yes" || followUps.suiteSeparateLaundry === "Yes"))) {
    score += 0.5;
    supporting.push({ en: "Independent laundry confirmed", zh: "已确认独立洗衣" });
  }
  if (form.nearbyCommercialCentre === "Yes") {
    score += 0.5;
    supporting.push({ en: "Close to a commercial / convenience centre", zh: "靠近商业中心，通勤和生活便利" });
  }
  if (form.furnished === "Yes") {
    score += 0.5;
    supporting.push({ en: "Furnished, reducing move-in friction", zh: "已确认带家具，可减少租客搬家准备工作" });
  }
  if (form.petFriendly === "No") {
    score -= 0.5;
    limiting.push({ en: "Pets not accepted, which narrows the tenant pool", zh: "不接受宠物，会缩小可申请租客群体" });
  }
  if (form.suiteLegalStatus === "Unauthorized no permit") {
    score -= 0.5;
    limiting.push({ en: "Suite has no permit / unauthorized status, which limits confident marketing", zh: "套间为未授权 / 无许可状态，会限制正式营销和定价信心" });
  }

  scanTextFactors(form, POSITIVE_TEXT_KEYWORDS).forEach((entry) => {
    score += entry.weight;
    supporting.push({ en: entry.en, zh: entry.zh });
  });
  scanTextFactors(form, NEGATIVE_TEXT_KEYWORDS).forEach((entry) => {
    score -= entry.weight;
    limiting.push({ en: entry.en, zh: entry.zh });
  });

  const usedAssumption = !supporting.length && !limiting.length;

  return { score, supporting, limiting, usedAssumption };
}

// ---------------------------------------------------------------------------
// 5. Main entry point: compute the full local rent judgment
// ---------------------------------------------------------------------------
function applyBand(band, score) {
  const [lo, hi] = band.base;
  const width = hi - lo;
  // Condition score generally ranges roughly -4..+6 given the factor weights
  // above. -3 or worse pins to the bottom of the band; +3 or better pins to
  // the top; a genuinely exceptional score (>=5) can push past the top of
  // the base band toward the type's strongCeiling.
  let position;
  if (score <= -3) position = 0;
  else if (score >= 3) position = 1;
  else position = 0.5 + score / 6;
  let point = lo + position * width;
  if (score >= 5 && band.strongCeiling) {
    const extra = clamp((score - 5) / 3, 0, 1);
    point = hi + (band.strongCeiling - hi) * extra;
  }
  if (score <= -4 && band.softFloor) point = Math.min(point, band.softFloor[1]);
  const ceiling = band.strongCeiling ? band.strongCeiling * 1.03 : hi * 1.08;
  point = clamp(point, lo * 0.92, ceiling);
  return round25(point);
}

function verdictFromDiff(diffRatio) {
  if (diffRatio >= 0.15) return "much_high";
  if (diffRatio >= 0.06) return "high";
  if (diffRatio <= -0.15) return "much_low";
  if (diffRatio <= -0.06) return "low";
  return "fair";
}

const VERDICT_LABELS = {
  much_high: { en: "Significantly above market", zh: "明显偏高" },
  high: { en: "Slightly above market", zh: "略高" },
  fair: { en: "In line with market", zh: "合理" },
  low: { en: "Slightly below market", zh: "略低" },
  much_low: { en: "Significantly below market", zh: "明显偏低" },
  no_target: { en: "No target rent provided", zh: "未提供目标租金" },
};

function personasFor(typeCode, region) {
  const base = {
    [RENTAL_TYPE.ONE_BED_SUITE]: [
      { en: "Single working professional", zh: "单身专业人士" },
      { en: "Young couple without children", zh: "年轻情侣（无子女）" },
    ],
    [RENTAL_TYPE.TWO_BED_SUITE]: [
      { en: "Young couple or small family", zh: "年轻情侣或小家庭" },
      { en: "Roommate pair sharing costs", zh: "合租的两位室友" },
    ],
    [RENTAL_TYPE.CONDO]: [
      { en: "Working professional couple", zh: "双职工年轻夫妇" },
      { en: "Downsizing retiree or empty-nester", zh: "缩小居住空间的退休人士" },
    ],
    [RENTAL_TYPE.UPPER_3BED2BATH]: [
      { en: "Family with one or two children", zh: "有一到两个孩子的家庭" },
      { en: "Two working professionals sharing", zh: "两位合租的在职专业人士" },
    ],
    [RENTAL_TYPE.UPPER_4BED3BATH_GARAGE]: [
      { en: "Family with children needing extra bedrooms", zh: "需要更多房间的家庭" },
      { en: "Relocating professional family", zh: "搬迁至 Nanaimo 的专业人士家庭" },
    ],
    [RENTAL_TYPE.UPPER_4BED3BATH_NO_GARAGE]: [
      { en: "Family with children, budget-conscious", zh: "预算较敏感的家庭租客" },
      { en: "Multi-adult household sharing rent", zh: "多名成年人合租分摊租金" },
    ],
    [RENTAL_TYPE.WHOLE_HOUSE_4BED3BATH]: [
      { en: "Established family relocating for work or school catchment", zh: "因工作或学区搬迁的成熟家庭" },
      { en: "Healthcare or other professional household", zh: "医疗或其他专业人士家庭" },
    ],
    [RENTAL_TYPE.WHOLE_HOUSE_GENERAL]: [
      { en: "Family household", zh: "家庭型租客" },
    ],
    [RENTAL_TYPE.COMBO_UPPER_LOWER]: [
      { en: "Multi-generational family", zh: "多代同堂家庭" },
      { en: "High-income relocating professional household (e.g. medical family)", zh: "高收入搬迁专业人士家庭（例如医疗专业人士家庭）" },
    ],
    [RENTAL_TYPE.OTHER]: [
      { en: "Tenant profile needs confirmation once property type is clarified", zh: "需先确认物业类型才能判断目标租客" },
    ],
  }[typeCode] || [];

  if (region.code === "viu") {
    return [{ en: "VIU student household or faculty/staff", zh: "VIU 学生合租或教职员工" }, ...base];
  }
  return base;
}

export function computeLocalRentJudgment(form, followUps = {}) {
  const type = classifyNanaimoRentalType(form);
  const region = getNanaimoRegion(form);
  const factors = scorePropertyFactors(form, followUps);

  let band;
  let comboDetails = null;

  if (type.code === RENTAL_TYPE.WHOLE_HOUSE_4BED3BATH) {
    band = getWholeHouseBand(region);
  } else if (type.code === RENTAL_TYPE.COMBO_UPPER_LOWER) {
    // Combo (upper + lower) properties large enough to need two rental units
    // are, in Mabel's experience, typically the nicer end of their tier
    // (garage, better condition) - so the split-income reference uses the
    // top-of-band / strongCeiling window for the upper unit rather than its
    // full base range, matching her worked example (upper ~$3,200-3,300 +
    // lower ~$1,700-1,900 = ~$4,900-5,200 combined potential).
    const upperType = toNumber(form.garageSpaces) > 0 ? RENTAL_TYPE.UPPER_4BED3BATH_GARAGE : RENTAL_TYPE.UPPER_4BED3BATH_NO_GARAGE;
    const upperBand = TYPE_BANDS[upperType];
    const lowerSuiteBed = toNumber(form.suiteBedrooms) >= 2 ? RENTAL_TYPE.TWO_BED_SUITE : RENTAL_TYPE.ONE_BED_SUITE;
    const lowerBand = TYPE_BANDS[lowerSuiteBed];
    const upperRange = [upperBand.base[1], upperBand.strongCeiling || upperBand.base[1] + 100];
    const lowerRange = [lowerBand.base[0], lowerBand.base[1]];
    const splitLow = upperRange[0] + lowerRange[0];
    const splitHigh = upperRange[1] + lowerRange[1];
    const width = splitHigh - splitLow;
    const shrink = round25(width / 3);
    const combinedLow = splitLow + shrink;
    const combinedHigh = splitHigh - shrink;
    comboDetails = {
      upperRange,
      lowerRange,
      splitTotalRange: [splitLow, splitHigh],
      combinedRange: [combinedLow, combinedHigh],
      upperTypeCode: upperType,
      lowerTypeCode: lowerSuiteBed,
    };
    band = { base: [combinedLow, combinedHigh], strongCeiling: combinedHigh + 100, hardCeiling: combinedHigh + 100, regionShift: 0 };
  } else {
    band = TYPE_BANDS[type.code] || TYPE_BANDS[RENTAL_TYPE.OTHER];
  }

  // Region shift (skip for bands that already encode region, i.e. whole house 4bed3bath and combo).
  let effectiveBand = band;
  if (region.tier === "other" && band.regionShift) {
    effectiveBand = {
      ...band,
      base: [band.base[0] - band.regionShift, band.base[1] - band.regionShift],
      strongCeiling: band.strongCeiling ? band.strongCeiling - band.regionShift : undefined,
      hardCeiling: band.hardCeiling ? band.hardCeiling - band.regionShift : undefined,
      softFloor: band.softFloor ? [band.softFloor[0] - band.regionShift, band.softFloor[1] - band.regionShift] : undefined,
    };
  }

  const recommendedPrice = applyBand(effectiveBand, factors.score);
  const adjustedSpread = type.code === RENTAL_TYPE.ONE_BED_SUITE || type.code === RENTAL_TYPE.TWO_BED_SUITE ? 50 : 75;
  const adjustedRange = [round25(recommendedPrice - adjustedSpread), round25(recommendedPrice + adjustedSpread)];

  const targetRent = toNumber(form.targetRent);
  let verdict = "no_target";
  let diffRatio = 0;
  if (targetRent > 0) {
    diffRatio = (targetRent - recommendedPrice) / recommendedPrice;
    verdict = verdictFromDiff(diffRatio);
  }

  const hardCeiling = effectiveBand.hardCeiling || effectiveBand.base[1];
  const priceForPoolCheck = targetRent > 0 ? Math.max(targetRent, recommendedPrice) : recommendedPrice;
  const overCeiling = priceForPoolCheck > hardCeiling;
  const marketAcceptance = {
    narrowPool: overCeiling,
    expectedDaysRange: overCeiling ? [35, 60] : [10, 21],
  };

  const adjustmentPlan = buildAdjustmentPlan(recommendedPrice, effectiveBand, overCeiling);

  return {
    type,
    region,
    baseRange: effectiveBand.base,
    adjustedRange,
    recommendedPrice,
    hardCeiling,
    targetRent: targetRent > 0 ? targetRent : null,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    diffRatio,
    supportingFactors: factors.supporting,
    limitingFactors: factors.limiting,
    assumptionUsed: factors.usedAssumption,
    personas: personasFor(type.code, region),
    marketAcceptance,
    adjustmentPlan,
    comboDetails,
  };
}

// ---------------------------------------------------------------------------
// 6. Curated bilingual region narrative
// ---------------------------------------------------------------------------
// Community_Knowledge_Base (Google Sheet) content is often entered in
// English prose and cannot be machine-translated into natural Chinese by
// this deterministic system. To avoid producing broken word-for-word
// Chinglish in zh reports, community/lifestyle commentary is authored here
// as proper bilingual pairs and used for BOTH languages. The live Knowledge
// Base sheet is still consulted upstream (see strategyAssessment.js) for
// short, allowlisted tags only - never for full sentence dumps.
const REGION_NARRATIVE = {
  "dover-bay-mcgirr": {
    overview: { en: "Family-oriented catchment near Dover Bay Secondary and McGirr Elementary.", zh: "靠近 Dover Bay Secondary 和 McGirr Elementary 的家庭型学区。" },
    tenantAppeal: { en: "Rent tends to stay firm here because family demand for this school catchment is consistent.", zh: "该学区家庭型租客需求稳定，租金通常相对坚挺。" },
    marketingAngle: { en: "Lead with school catchment and family layout.", zh: "广告应突出学区和适合家庭的户型。" },
  },
  "north-nanaimo": {
    overview: { en: "North Nanaimo generally attracts convenience- and family-driven demand with the deepest tenant pool for larger units.", zh: "North Nanaimo 通常吸引重视便利性和家庭型的租客，大户型的租客池也最深。" },
    tenantAppeal: { en: "Supports the most confident pricing of the Nanaimo sub-markets when condition and parking are solid.", zh: "在房屋状况和停车条件良好时，是 Nanaimo 内最能支撑较高定价的区域。" },
    marketingAngle: { en: "Lead with convenience, parking, and layout; use school catchment if applicable.", zh: "广告应突出便利性、停车条件和户型，如适用可加入学区信息。" },
  },
  "departure-bay": {
    overview: { en: "Departure Bay can support North-Nanaimo-level rent when the unit has view, garage, or strong condition; otherwise price closer to other-region levels.", zh: "Departure Bay 若有海景、车库或装修状况较好，可支撑接近 North Nanaimo 的租金；否则应按其他区域水平定价。" },
    tenantAppeal: { en: "Tenant pool skews toward professionals who value the waterfront setting.", zh: "租客群体偏向重视滨海环境的专业人士。" },
    marketingAngle: { en: "Lead with view and walkability if genuinely present; do not assume it by default.", zh: "如确实具备海景和步行便利性，应作为主要卖点，但不能默认套用。" },
  },
  downtown: {
    overview: { en: "Downtown tenants prioritize walkability and access over unit size.", zh: "Downtown 租客更看重步行便利性和通达性，而非单纯面积。" },
    tenantAppeal: { en: "Best suited to single professionals, couples, or downsizers rather than larger families.", zh: "更适合单身专业人士、情侣或缩小居住空间的租客，而非大家庭。" },
    marketingAngle: { en: "Lead with walkability, transit, and nearby amenities.", zh: "广告应突出步行便利性、公交和周边生活配套。" },
  },
  viu: {
    overview: { en: "VIU / University District has steady demand but a generally lower budget ceiling than North Nanaimo family tenants.", zh: "VIU / University District 需求稳定，但预算上限通常低于 North Nanaimo 的家庭型租客。" },
    tenantAppeal: { en: "Strong fit for students, faculty, and staff; roommate share-friendly layouts perform well.", zh: "适合学生、教职员工；适合合租的户型接受度较高。" },
    marketingAngle: { en: "Lead with proximity to VIU and roommate-friendly layout.", zh: "广告应突出距离 VIU 的距离和适合合租的户型。" },
  },
  "south-nanaimo": {
    overview: { en: "South Nanaimo generally needs firmer price discipline and clear value messaging to avoid extended vacancy.", zh: "South Nanaimo 通常需要更严格的价格纪律和清晰的价值说明，以避免空置期拉长。" },
    tenantAppeal: { en: "Price-sensitive tenant pool; value and practicality outperform premium positioning.", zh: "租客对价格较敏感，务实和高性价比比高端定位更有效。" },
    marketingAngle: { en: "Lead with price competitiveness and practical convenience.", zh: "广告应突出价格竞争力和实际便利性。" },
  },
  "westwood-lake": {
    overview: { en: "Westwood Lake trades on quiet, outdoor-lifestyle appeal rather than commercial convenience.", zh: "Westwood Lake 的卖点在于安静的居住环境和户外生活方式，而非商业便利性。" },
    tenantAppeal: { en: "Appeals to tenants prioritizing quiet and trail access over walkability to shops.", zh: "更吸引重视安静环境和步道通达性、而非购物便利性的租客。" },
    marketingAngle: { en: "Lead with quiet setting and lake/trail access if confirmed.", zh: "如确认，广告应突出安静环境和湖边 / 步道通达性。" },
  },
  "central-nanaimo": {
    overview: { en: "Central Nanaimo value is usually tied to commute time and access rather than unit size alone.", zh: "Central Nanaimo 的价值通常体现在通勤时间和通达性，而非单纯面积。" },
    tenantAppeal: { en: "Broad general tenant pool across working professionals and small families.", zh: "租客群体较广泛，涵盖在职专业人士和小家庭。" },
    marketingAngle: { en: "Lead with commute time and everyday convenience.", zh: "广告应突出通勤时间和日常生活便利性。" },
  },
  lantzville: {
    overview: { en: "Lantzville's appeal is quiet, low-density residential living; there is limited comparable rental data, so pricing should lean conservative until confirmed by current listings.", zh: "Lantzville 的卖点是安静、低密度的居住环境；目前可比出租数据有限，定价应保持保守，待有当前可比房源确认后再调整。" },
    tenantAppeal: { en: "Appeals to tenants specifically seeking a quiet, small-community setting.", zh: "更吸引特意寻找安静小型社区环境的租客。" },
    marketingAngle: { en: "Lead with quiet setting and lot size/privacy if confirmed.", zh: "如确认，广告应突出安静环境和占地 / 隐私条件。" },
  },
};

const GENERIC_NARRATIVE = {
  overview: { en: "This community is not yet in the curated regional reference list; pricing and tenant-pool judgment rely on the property's own features and the general Nanaimo baseline.", zh: "该社区尚未纳入已整理的区域参考列表，租金和租客群体判断以物业自身条件和 Nanaimo 市场整体基准为依据。" },
  tenantAppeal: { en: "Tenant profile should be confirmed once the exact community is provided.", zh: "待明确具体社区后，可进一步确认目标租客画像。" },
  marketingAngle: { en: "Use accurate photos and confirmed features rather than assumed community advantages.", zh: "应使用真实照片和已确认的物业条件，不应假设未核实的社区优势。" },
};

export function getRegionNarrative(regionCode) {
  return REGION_NARRATIVE[regionCode] || GENERIC_NARRATIVE;
}

function buildAdjustmentPlan(recommendedPrice, band, overCeiling) {
  const firstCut = round25(recommendedPrice * 0.04);
  const secondCut = round25(recommendedPrice * 0.06);
  const floorPrice = round25(Math.max(band.base[0], recommendedPrice - firstCut - secondCut));
  return [
    {
      en: `List at $${recommendedPrice.toLocaleString("en-US")}${overCeiling ? " only as a short test at this level" : ""}.`,
      zh: `先以 $${recommendedPrice.toLocaleString("en-US")} 挂牌${overCeiling ? "，但这属于高位测试价格" : ""}。`,
    },
    {
      en: `If there are not enough qualified inquiries within 7-10 days, reduce by about $${firstCut} to roughly $${(recommendedPrice - firstCut).toLocaleString("en-US")}.`,
      zh: `若挂牌 7-10 天内没有足够合格咨询，应下调约 $${firstCut}，调整后约 $${(recommendedPrice - firstCut).toLocaleString("en-US")}。`,
    },
    {
      en: `If showings happen but no applications follow within about 2 weeks, reduce further to roughly $${(recommendedPrice - firstCut - secondCut).toLocaleString("en-US")} and re-check photos and listing copy.`,
      zh: `若已安排看房但约两周内没有申请，应再次下调至约 $${(recommendedPrice - firstCut - secondCut).toLocaleString("en-US")}，并复核照片与广告文案。`,
    },
    {
      en: `If multiple applicants say the price is too high, move toward $${floorPrice.toLocaleString("en-US")} (near the low end of the market band) rather than holding the price.`,
      zh: `若多名申请人反馈价格过高，应尽快调整至约 $${floorPrice.toLocaleString("en-US")}（接近区间低位），不建议继续硬撑原价。`,
    },
  ];
}
