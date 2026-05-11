// Template-based content generator (v0.1 — no AI API)
// In v0.3 this function will call the Claude API instead.

// ── Protected-term filter ────────────────────────────────────────────────────
// BC Human Rights Code prohibits tenant preference based on these characteristics.
const PROTECTED_TERMS = [
  "professional", "professionals",
  "family", "families",
  "student", "students",
  "senior", "seniors",
  "couple", "couples",
  "single", "singles",
  "young", "adult", "adults",
  "mature", "retiree", "retirees",
  "worker", "workers",
  "newcomer", "newcomers",
  "immigrant", "immigrants",
];

function safeTenantLine(raw) {
  if (!raw || !raw.trim()) return "Suitable for responsible long-term tenants.";
  const lower = raw.toLowerCase();
  if (PROTECTED_TERMS.some((t) => lower.includes(t))) return "Suitable for responsible long-term tenants.";
  return `Suitable for: ${raw.trim()}`;
}

function safeTenantLineCh(raw) {
  if (!raw || !raw.trim()) return "欢迎负责任的长期租客。";
  const lower = raw.toLowerCase();
  if (PROTECTED_TERMS.some((t) => lower.includes(t))) return "欢迎负责任的长期租客。";
  return `租客要求：${raw.trim()}`;
}

// ── Field-value → Chinese translations ──────────────────────────────────────
// Exact matches first; prefix/substring matches as fallback.
const FIELD_ZH_MAP = [
  // Utilities
  [/^none included$/i,                          "不包含水电"],
  [/^not included$/i,                           "不包含"],
  [/^all included$/i,                           "全部包含"],
  [/^all utilities included$/i,                 "全部水电已包含"],
  [/^partial$/i,                                "部分包含"],
  [/^electricity$/i,                            "包含电费"],
  [/^water$/i,                                  "包含水费"],
  [/^gas$/i,                                    "包含天然气"],
  [/^internet$/i,                               "包含网络"],
  [/^electricity.*water/i,                      "包含电费和水费"],
  // Pets
  [/^no pets$/i,                                "不允许宠物"],
  [/^cats allowed$/i,                           "允许养猫"],
  [/^small dogs allowed$/i,                     "允许小型犬"],
  [/^pets negotiable$/i,                        "宠物政策可协商"],
  [/^pets considered$/i,                        "可考虑合适宠物"],
  [/one small.*trained.*pet/i,                  "可考虑一只训练良好的小型宠物"],
  // Parking
  [/^no parking$/i,                             "无停车位"],
  [/^1 stall included$/i,                       "包含一个停车位"],
  [/^2 stalls included$/i,                      "包含两个停车位"],
  [/^street parking$/i,                         "路边停车"],
  // Laundry
  [/^in-suite$/i,                               "室内独立洗衣机"],
  [/^shared laundry$/i,                         "共用洗衣房"],
  [/^laundry hookups$/i,                        "预留洗衣机接口"],
  [/^no laundry$/i,                             "无洗衣设施"],
  // Smoking
  [/^no smoking anywhere$/i,                    "全屋禁止吸烟和电子烟"],
  [/^no smoking or vaping$/i,                   "禁止吸烟和电子烟"],
  [/^outside only$/i,                           "仅限室外吸烟"],
  [/^not specified$/i,                          "未特别说明"],
  // Lease
  [/^12 months$/i,                              "一年租期"],
  [/^one year preferred$/i,                     "一年租期优先"],
  [/^month-to-month$/i,                         "月租（按月续租）"],
  [/^6 months$/i,                               "六个月租期"],
];

function translateFieldZh(val) {
  if (!val) return val;
  for (const [pattern, zh] of FIELD_ZH_MAP) {
    if (pattern.test(val.trim())) return zh;
  }
  return val; // unrecognised — keep original
}

// ── Feature phrase → Chinese translations ───────────────────────────────────
const FEATURE_ZH_MAP = [
  [/facing the beach area/i,                          "面向海滩区域"],
  [/short walk to waterfront/i,                       "步行即可到达海边"],
  [/walk.*waterfront/i,                               "步行可达海边"],
  [/private entrance/i,                               "独立入口"],
  [/lower level.*single.?family home/i,               "位于维护良好的独立屋下层"],
  [/lower level/i,                                    "位于楼下层"],
  [/comfortable living space/i,                       "居住空间舒适"],
  [/kitchen area/i,                                   "配有厨房区域"],
  [/\b1 bathroom\b/i,                                 "一个卫生间"],
  [/excellent indoor storage/i,                       "室内储物空间充足"],
  [/bright two.?bedroom suite/i,                      "明亮的两房套间"],
  [/in-suite laundry/i,                               "套内独立洗衣"],
  [/covered parking/i,                                "遮盖停车位"],
  [/pet.?friendly/i,                                  "允许宠物"],
  [/hardwood floors?/i,                               "实木地板"],
  [/updated kitchen/i,                                "翻新厨房"],
  [/mountain views?/i,                                "山景视野"],
  [/ocean views?/i,                                   "海景视野"],
  [/quiet street/i,                                   "安静街道"],
  [/fenced backyard/i,                                "围栏后院"],
  [/double garage/i,                                  "双车库"],
  [/new appliances/i,                                 "全新电器"],
  [/top school catchment/i,                           "优质学区"],
  [/large deck/i,                                     "宽敞露台"],
];

function translateFeatureZh(feat) {
  for (const [pattern, zh] of FEATURE_ZH_MAP) {
    if (pattern.test(feat)) return zh;
  }
  return feat; // unrecognised — keep as-is
}

// ── Defensive features cleanup ───────────────────────────────────────────────
// Strips any segments that look like labeled form fields (e.g. "Owner Name: …")
// in case corrupted data reached the features string from a previous session.
const FORM_LABEL_PATTERNS = [
  /^owner\s*name\s*:/i,
  /^owner\s*email\s*:/i,
  /^property\s*address\s*:/i,
  /^address\s*:/i,
  /^city\s*:/i,
  /^bedrooms?\s*:/i,
  /^bathrooms?\s*:/i,
  /^rent\s*:/i,
  /^available(\s*date)?\s*:/i,
  /^lease\s*term\s*:/i,
  /^utilities\s*:/i,
  /^pets?\s*(policy)?\s*:/i,
  /^parking\s*:/i,
  /^laundry\s*:/i,
  /^smoking\s*(policy)?\s*:/i,
  /^default\s*language\s*:/i,
  /^target\s*audience\s*:/i,
  /^target\s*platforms?\s*:/i,
  /^platforms?\s*:/i,
  /^language\s*:/i,
];

function cleanFeaturesList(raw) {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[,\n]/)
    .map((f) => f.trim())
    .filter((f) => f && !FORM_LABEL_PATTERNS.some((p) => p.test(f)));
}

// ── Application Requirements (mandatory on all public ad copy) ───────────────
// Appended to Facebook, Craigslist, and WeChat. Editable in Review stage.
// Safe to regenerate: existing block is replaced, never duplicated.

const DEFAULT_APPLICATION_REQUIREMENTS_EN =
`\n\n---\n\nApplication Requirements\n\nQualified applicants must provide the following:\n\n- A completed rental application for each adult occupant\n- Proof of income and/or employment\n- Credit score report, or written consent for the landlord/property manager to obtain a credit report\n- References\n- Tenant insurance with a minimum of $1 million third-party liability coverage\n\nContact Information\n\nIf interested, please contact Mabel with a brief introduction about yourself.`;

const DEFAULT_APPLICATION_REQUIREMENTS_ZH =
`\n\n---\n\n【申请要求】\n\n符合条件的申请人须提供以下材料：\n\n- 每位成年居住者填写完整的租赁申请表\n- 收入及/或就业证明\n- 信用评分报告，或书面授权房东/物业经理获取信用报告\n- 推荐人信息\n- 至少 100 万加元第三方责任险的租客保险证明\n\n【联系方式】\n\n如有意向，请私信 Mabel 并简单介绍一下您自己。`;

const COMPLIANCE_MARKER = "\n\n---\n⚠️";

// Inserts the requirements block before the compliance footer.
// If a requirements block already exists it is replaced, not duplicated.
function appendAppRequirements(text, reqBlock) {
  const idx  = text.lastIndexOf(COMPLIANCE_MARKER);
  let main   = idx >= 0 ? text.slice(0, idx) : text;
  const foot = idx >= 0 ? text.slice(idx)    : "";
  // Remove any existing requirements block so regeneration is idempotent.
  main = main.replace(/\n+[-—]{3}\n+(?:Application Requirements|【申请要求】)[\s\S]*$/, "");
  return main + reqBlock + foot;
}

// ── Main generator ───────────────────────────────────────────────────────────
export function generateOutputs(form) {
  const {
    ownerName, address, city, bedrooms, bathrooms, rent,
    available, leaseTerm, utilities, pets, parking, laundry,
    smoking, features, targetAudience, platforms,
  } = form;

  const featList = cleanFeaturesList(features);
  const featBullets    = featList.map((f) => `• ${f}`).join("\n");
  const featChBullets  = featList.map((f) => `• ${translateFeatureZh(f)}`).join("\n");

  const tenantLine   = safeTenantLine(targetAudience);
  const tenantLineCh = safeTenantLineCh(targetAudience);

  // Chinese field values
  const utilitiesZh = translateFieldZh(utilities);
  const petsZh      = translateFieldZh(pets);
  const parkingZh   = translateFieldZh(parking);
  const laundryZh   = translateFieldZh(laundry);
  const smokingZh   = translateFieldZh(smoking);
  const leaseZh     = translateFieldZh(leaseTerm);

  // Natural Chinese property description sentence
  const bedroomsCh = bedrooms === "Studio" ? "开放式单间" : `${bedrooms} 间卧室`;
  const bathroomsCh = `${bathrooms} 间卫生间`;
  const introZh = `本房源位于不列颠哥伦比亚省 ${city}，共有${bedroomsCh}、${bathroomsCh}，` +
    `月租金为 ${rent} 加元，${leaseZh}，` +
    (available ? `预计 ${available} 起可入住。` : "入住日期请联系确认。");

  const compliance =
    "\n\n---\n⚠️ AI-generated draft. Review before publishing. If images are AI-enhanced, disclosure is required.\nAI 生成草稿，发布前请人工审核。如使用 AI 美化图片，必须明确标注。";

  const outputs = {};

  // ── Facebook ──────────────────────────────────────────────────────────────
  if (platforms.includes("Facebook")) {
    const featSection = featList.length ? `\nHighlights:\n${featBullets}\n` : "";
    outputs["Facebook Post"] = appendAppRequirements(
      `🏠 For Rent: ${bedrooms} Bed / ${bathrooms} Bath — ${city}

📍 ${address}
💰 $${rent}/month | Available ${available}
📋 ${leaseTerm} lease${featSection}
🔑 Utilities: ${utilities}
🚗 Parking: ${parking} | 🧺 Laundry: ${laundry}
🐾 Pets: ${pets} | 🚭 Smoking: ${smoking}

${tenantLine}

To schedule a viewing, please send us a message.${compliance}`,
      DEFAULT_APPLICATION_REQUIREMENTS_EN
    );
  }

  // ── Craigslist ────────────────────────────────────────────────────────────
  if (platforms.includes("Craigslist")) {
    const featSection = featList.length ? `HIGHLIGHTS:\n${featBullets}\n\n` : "";
    outputs["Craigslist Ad"] = appendAppRequirements(
      `${bedrooms} BED / ${bathrooms} BATH — ${city}, BC
Rent: $${rent}/month

Available: ${available}
Lease Term: ${leaseTerm}

PROPERTY SUMMARY:
This ${bedrooms}-bedroom, ${bathrooms}-bathroom rental is located in ${city}, BC.${featList.length ? ` The property features ${featList.slice(0, 2).join(" and ")}.` : ""}

${featSection}RENTAL DETAILS:
- Utilities: ${utilities}
- Pets: ${pets}
- Parking: ${parking}
- Laundry: ${laundry}
- Smoking: ${smoking}

${tenantLine}

To arrange a viewing, please reply with your name, contact number, and preferred move-in date.${compliance}`,
      DEFAULT_APPLICATION_REQUIREMENTS_EN
    );
  }

  // ── WeChat ────────────────────────────────────────────────────────────────
  if (platforms.includes("WeChat")) {
    outputs["WeChat Post"] = appendAppRequirements(
      `📢【招租】${city} ${bedroomsCh}${bathroomsCh}

📍 地址：${address}，${city}，BC 省
💵 月租：$${rent} 加元
📅 可入住：${available}
📋 租期：${leaseZh}

${introZh}
${featList.length ? `\n✨ 房源亮点：\n${featChBullets}\n` : ""}
【租赁条件】
• 水电：${utilitiesZh}
• 宠物：${petsZh}
• 停车：${parkingZh}
• 洗衣：${laundryZh}
• 吸烟：${smokingZh}

${tenantLineCh}

欢迎有意向的租客私信联系预约看房。📩${compliance}`,
      DEFAULT_APPLICATION_REQUIREMENTS_ZH
    );
  }

  // ── Short Video Script ────────────────────────────────────────────────────
  if (platforms.includes("Short Video")) {
    const f0zh = featList[0] ? translateFeatureZh(featList[0]) : "舒适的居住空间";
    const f1zh = featList[1] ? translateFeatureZh(featList[1]) : "品质装修";
    outputs["Short Video Script"] = `[SCENE 1 — Opening shot: exterior of property]
Narration: "Welcome to this ${bedrooms}-bedroom rental in ${city}, BC."
中文旁白：「欢迎来到位于 BC 省 ${city} 的这套${bedroomsCh}出租房源。」

[SCENE 2 — Living area / kitchen]
Narration: "The property features ${featList[0] || "comfortable living spaces"} and ${featList[1] || "quality finishes"}."
中文旁白：「房源配备${f0zh}以及${f1zh}。」

[SCENE 3 — Bedroom / bathroom]
Narration: "With ${bedrooms} bedrooms and ${bathrooms} bathrooms, this home offers a comfortable layout."
中文旁白：「共有${bedroomsCh}和${bathroomsCh}，空间布局合理舒适。」

[SCENE 4 — Call to action]
Narration: "Available ${available} at $${rent}/month. Contact us to book a viewing."
中文旁白：「${available} 起入住，月租 $${rent} 加元。欢迎联系预约看房。」${compliance}`;
  }

  // ── Owner Summary (bilingual reference) ──────────────────────────────────
  if (platforms.includes("Owner Summary")) {
    outputs["Owner Summary"] = `PROPERTY SUMMARY / 房源摘要
房东 / Owner: ${ownerName}
地址 / Address: ${address}, ${city}
卧室 / Bedrooms: ${bedrooms} | 卫生间 / Bathrooms: ${bathrooms}
月租 / Rent: $${rent} CAD
入住日期 / Available: ${available}
租约 / Lease: ${leaseTerm}
水电 / Utilities: ${utilities}
宠物 / Pets: ${pets}
停车 / Parking: ${parking}
洗衣 / Laundry: ${laundry}
吸烟 / Smoking: ${smoking}
${featList.length ? `\n主要特色 / Key Features:\n${featBullets}\n` : ""}
---
This summary is for landlord reference only.
此摘要仅供房东内部参考。${compliance}`;
  }

  // ── English Rental Ad (always generated) ─────────────────────────────────
  outputs["English Rental Ad"] = `FOR RENT — ${bedrooms} Bed / ${bathrooms} Bath in ${city}, BC
Address: ${address}
Rent: $${rent}/month | Available: ${available}
Lease Term: ${leaseTerm}

Property Details:
• Utilities: ${utilities}
• Pets: ${pets}
• Parking: ${parking}
• Laundry: ${laundry}
• Smoking Policy: ${smoking}
${featList.length ? `\nHighlights:\n${featBullets}\n` : ""}
${tenantLine}

Contact us to arrange a viewing.${compliance}`;

  // ── Chinese Rental Ad (always generated) ─────────────────────────────────
  outputs["Chinese Owner Summary"] = `【出租信息】
地址：${address}，${city}，BC 省
租金：每月 $${rent} 加元
可入住日期：${available}
租期：${leaseZh}

【房源简介】
${introZh}

【房源亮点】
${featList.length ? featChBullets : "• 请在填写表单时补充主要特色。"}

【租赁条件】
• 水电费：${utilitiesZh}
• 宠物政策：${petsZh}
• 停车：${parkingZh}
• 洗衣设施：${laundryZh}
• 吸烟规定：${smokingZh}

【看房说明】
欢迎有意向的租客联系预约看房。所有申请人需按要求提供收入证明、信用报告和推荐人信息。

${tenantLineCh}${compliance}`;

  return outputs;
}
