// One place for every public page's browser title and search description
// (English / 中文, following the language switch). Listing pages set their own
// title from the listing itself, so they are not listed here.

const BRAND = "VanIsland Property";

const PAGES = {
  "/": {
    en: ["VanIsland Property | Professional Landlord Support on Vancouver Island", "Professional landlord support for independent rental property owners on Vancouver Island: tenant screening, documentation, rental administration, record keeping and dispute preparation, while landlords remain in control."],
    zh: ["VanIsland Property | 温哥华岛专业房东支持", "为温哥华岛的独立房东提供专业支持：租客筛选、文件准备、租务日常、记录整理与争议准备，决定权始终在房东手中。"],
  },
  "/services": {
    en: ["Services", "Landlord support services: rental marketing, tenant applications and preliminary screening, tenancy administration, home sale marketing and AI reviews."],
    zh: ["服务项目", "房东支持服务：出租营销、租客申请与初步筛选、租务日常、出售房源营销和 AI 初评。"],
  },
  "/rentals": {
    en: ["Rental Listings", "Homes for rent on Vancouver Island. View photos and details, and apply online."],
    zh: ["出租房源", "温哥华岛出租房源：查看照片与详情，并在线申请。"],
  },
  "/our-story": {
    en: ["Our Story", "VanIsland Property grew from 18 years of real-world experience as an independent landlord."],
    zh: ["我们的故事", "VanIsland Property 源于 18 年独立房东的亲身经历。"],
  },
  "/resources": {
    en: ["Landlord Knowledge Center", "Plain-language guides for BC landlords: rental rules, local policies, short-term rentals, secondary suites and practical rental questions."],
    zh: ["房东知识中心", "为 BC 省房东准备的实用指南：出租法规、本地政策、短租规则、套房说明和出租实务问题。"],
  },
  "/contact": {
    en: ["Contact Us", "Contact VanIsland Property about landlord support, rental listings or home sale marketing."],
    zh: ["联系我们", "就房东支持、出租房源或出售房源营销联系 VanIsland Property。"],
  },
  "/home-sale-studio": {
    en: ["Home Sale Studio", "Bilingual home-sale pages with photos, video and marketing content for sellers on Vancouver Island."],
    zh: ["售房工作台", "为温哥华岛卖家准备的中英文出售房源页面，含照片、视频和营销内容。"],
  },
  "/landlord-ai/review-center": {
    en: ["AI Review Center", "Start an AI Property Strategy Assessment or an AI Dispute Review. Each preliminary review is prepared for professional review."],
    zh: ["AI初评中心", "开始房产出租策略AI初评或法律争议AI初评；每份初评都会交由专业人员审核。"],
  },
  "/landlord-ai/strategy-assessment": {
    en: ["AI Property Strategy Assessment", "A preliminary assessment of rental options and rent positioning for your property."],
    zh: ["房产出租策略AI初评", "对您物业的出租方式与租金定位进行初步评估。"],
  },
  "/landlord-ai/dispute-review": {
    en: ["AI Dispute Review", "A structured preliminary review of your dispute, prepared for professional review."],
    zh: ["法律争议AI初评", "对您的争议进行结构化初步审阅，供专业审核使用。"],
  },
  "/demo/ai-screening": {
    en: ["AI Tenant Screening Report Demo", "Sample tenant screening reports prepared with demonstration data only."],
    zh: ["AI 租客筛选报告演示", "仅使用演示数据制作的租客筛选报告样本。"],
  },
  "/apply": {
    en: ["Rental Application", "Apply online for a VanIsland Property rental listing."],
    zh: ["租房申请", "在线申请 VanIsland Property 的出租房源。"],
  },
  "/tenant-contact": {
    en: ["Tenant Contact", "Contact VanIsland Property about a rental listing or your application."],
    zh: ["租客联系", "就出租房源或您的申请联系 VanIsland Property。"],
  },
  "/tenant-service-request": {
    en: ["Tenant Service Request", "Tenants can report a maintenance issue or request service online."],
    zh: ["租客报修与服务申请", "租客可在线提交维修问题或服务申请。"],
  },
  "/reports/daily-market-brief": {
    en: ["BC Rental & Sale Market Brief", "A market brief for BC and Nanaimo landlords and property owners."],
    zh: ["BC 租售市场简报", "面向 BC 省及纳奈莫房东与业主的市场简报。"],
  },
  "/reports/retirement-living-brief": {
    en: ["Retirement Living Brief", "A brief on retirement-friendly homes on Vancouver Island."],
    zh: ["退休生活房源简报", "温哥华岛适合退休生活的房源简报。"],
  },
};

const NOT_FOUND = {
  en: ["Page Not Found", "This page does not exist."],
  zh: ["页面不存在", "您访问的页面不存在。"],
};
const PRIVATE = {
  en: [BRAND, "VanIsland Property — Professional Landlord Support."],
  zh: [BRAND, "VanIsland Property — 专业房东支持。"],
};

// Routes that are real pages but have no entry above.
const SELF_TITLED = [/^\/listings\/[^/]+$/];
const PRIVATE_ROUTES = [
  /^\/admin(\/|$)/, /^\/apply\/[^/]+$/, /^\/supporting-documents$/, /^\/support-documents\//,
  /^\/strategy-assessment\/report\//, /^\/dispute-review\/report\//, /^\/demo\/ai-screening\/[^/]+\/[^/]+$/,
  /^\/listings\/[^/]+\/video$/, /^\/home-sale-studio\/listings\//, /^\/reports\/[^/]+$/, /^\/photo-tips$/, /^\/faq$/,
];
const NOINDEX = [
  /^\/admin(\/|$)/, /^\/apply\/[^/]+$/, /^\/supporting-documents$/, /^\/support-documents\//,
  /^\/strategy-assessment\/report\//, /^\/dispute-review\/report\//, /^\/photo-tips$/, /^\/faq$/,
];

function setMeta(selector, content) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute("content", content);
}

// kind: "page" (listed above), "self" (page sets its own title), "private", or "notFound".
export function resolvePageMeta(pathname, lang) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const safeLang = lang === "zh" ? "zh" : "en";
  if (PAGES[path]) return { kind: "page", meta: PAGES[path][safeLang], home: path === "/" };
  if (SELF_TITLED.some((re) => re.test(path))) return { kind: "self" };
  if (PRIVATE_ROUTES.some((re) => re.test(path))) return { kind: "private", meta: PRIVATE[safeLang], noindex: NOINDEX.some((re) => re.test(path)) };
  return { kind: "notFound", meta: NOT_FOUND[safeLang], noindex: true };
}

export function applyPageMeta(pathname, lang) {
  if (typeof document === "undefined") return;
  const resolved = resolvePageMeta(pathname, lang);

  let robots = document.querySelector('meta[name="robots"]');
  if (resolved.noindex) {
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex");
  } else if (robots) {
    robots.remove();
  }

  if (resolved.kind === "self") return;
  const [name, description] = resolved.meta;
  const title = resolved.home || name === BRAND ? name : `${name} | ${BRAND}`;
  document.title = title;
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', `https://www.vanislandproperty.ca${pathname}`);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
}
