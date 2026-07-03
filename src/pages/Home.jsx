import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import ShareKit from "../components/ShareKit";
import { PUBLIC_SITE_BASE_URL } from "../utils/publicUrls";
import { getDailyMarketBrief } from "../utils/dailyMarketBrief";

// ─── Translation dictionary ────────────────────────────────────────────────
const T = {
  en: {
    // topbar
    langLabel: "🌐 EN",

    // hero
    eyebrow: "📚 PLATFORM",
    heroTitle: "Vanisland Property",
    heroDesc: "Create marketing packages for rental and home sale listings.",
    heroSubDesc:
      "One platform for rental and home sale marketing across public pages, applications, and sharing.",
    requestAccess: "Request Access",
    trialAccess: "Trial Access",
    learnMore: "Learn More",

    // why card
    whyTitle: "Why Vanisland AI Studio?",
    reasons: [
      { icon: "✨", title: "AI-Powered Marketing", desc: "Generate high-quality copy, pages, and materials in minutes." },
      { icon: "🌐", title: "Bilingual Ready",      desc: "All content and pages are ready for Chinese and English." },
      { icon: "🔗", title: "Share Anywhere",       desc: "QR codes, share links, and mobile-friendly pages." },
      { icon: "👥", title: "Built for Real Estate",desc: "Designed for landlords, sellers, FSBO owners, and realtors." },
    ],

    // daily brief
    briefEyebrow: "DAILY MARKET BRIEF",
    briefTitle: "Daily BC Rent & Sale Market Brief",
    briefDateLabel: "Date",
    briefLoading: "Loading latest published brief...",
    viewFullReport: "View Full Report",
    copyWechat: "Copy WeChat Version",
    copiedWechat: "Copied WeChat Version",
    briefFields: [
      { key: "policySummary",      label: "Policy Summary" },
      { key: "bcRentalSummary",    label: "BC Rental Summary" },
      { key: "bcSaleSummary",      label: "BC Sale Summary" },
      { key: "nanaimoRentalSummary", label: "Nanaimo Rental Summary" },
      { key: "nanaimoSaleSummary", label: "Nanaimo Sale Summary" },
      { key: "landlordActionNotes",label: "Landlord Action Notes" },
      { key: "websiteSummary",     label: "Website Summary" },
    ],

    // choose studio
    sectionKicker: "SECTION 2",
    chooseTitle: "Choose Your Studio",
    chooseDesc: "Select the studio that fits your needs. You can switch anytime.",
    rentalEyebrow: "For landlords and property managers",
    rentalCardTitle: "Rental Studio",
    rentalCardDesc:
      "Create bilingual rental ads, listing pages, QR codes, online rental application links, and social sharing packages.",
    strategyEyebrow: "For owners comparing rental options",
    strategyCardTitle: "AI Property Strategy Assessment",
    strategyCardDesc:
      "Complete a landlord intake form for property details, suite potential, Airbnb / STR interest, and Mabel-style follow-up questions.",
    saleEyebrow: "For home sellers, FSBO owners, and realtors",
    saleCardTitle: "Home Sale Studio",
    saleCardDesc:
      "Create home sale listing pages, bilingual marketing copy, photo/video promotion materials, QR codes, and buyer inquiry links.",

    // free resources
    freeKicker: "FREE RESOURCES",
    freeTitle: "Available Now",
    freeDesc: "Free tools accessible to everyone — no account required.",
    photoTipsEyebrow: "For landlords and sellers",
    photoTipsTitle: "Smart Photo Tips",
    photoTipsDesc: "Photography checklist to take listing photos that attract more inquiries.",
    faqEyebrow: "Platform help",
    faqTitle: "FAQ",
    faqDesc: "Answers to common questions about listings, photos, and platform features.",
    openBtn: "Open",

    // trust strip
    trust: [
      { icon: "🛡️", title: "Secure & Private",  desc: "Your data is encrypted and protected." },
      { icon: "☁️", title: "Cloud-Based",        desc: "Access anywhere, anytime." },
      { icon: "⏱️", title: "Save Time",           desc: "Automate repetitive marketing tasks." },
      { icon: "🎧", title: "Support",             desc: "We're here to help you succeed." },
    ],

    // share kit
    shareKitBtn: "Admin Share Kit",
    shareKitTitle: "Landlord Promotion Share Kit",
    shareKitSub: "For landlords, property owners, and client referrals only.",

    // what we generate
    generateTitle: "What We Generate",
    generateDesc: "One workflow for rental and home sale marketing materials",
    rentalOutputsTitle: "Rental Listing Outputs",
    rentalOutputsDesc: "Marketing materials for landlords, property owners, and property managers.",
    saleOutputsTitle: "Home Sale Outputs",
    saleOutputsDesc: "Sale marketing materials for home sellers, FSBO owners, and realtors.",
    secondaryLabel: "Secondary outputs",
    rentalOutputs: [
      { icon: "📝", title: "Rental Ad Package",         desc: "Bilingual rental copy prepared for direct posting and review." },
      { icon: "🖼️", title: "Photo Listing Page",        desc: "A shareable rental photo page with listing details." },
      { icon: "📋", title: "Online Rental Application", desc: "Tenants submit applications via a dedicated link — no printing or email back-and-forth." },
      { icon: "📄", title: "Application PDF Archive",   desc: "Each application auto-generates a PDF saved to the listing's Drive folder for clean record-keeping." },
      { icon: "🔍", title: "AI Application Screening",  desc: "Summarizes and organizes application data, flags missing fields. No auto-approval or auto-rejection — final review is always manual." },
      { icon: "✅", title: "Human Review Workflow",     desc: "All applications are reviewed manually by the landlord in the admin dashboard — full control stays with the owner." },
      { icon: "📱", title: "Rental Share Kit & QR Code",desc: "Package rental sharing text, links, and QR access." },
      { icon: "🎬", title: "Rental Short Video",        desc: "Prepare short-form rental video materials and scripts." },
    ],
    saleOutputs: [
      { icon: "🏡", title: "Sale Listing Page",              desc: "A public home sale page for listing details and media." },
      { icon: "✍️", title: "Bilingual Sale Marketing Copy",  desc: "Bilingual sale marketing copy for major sharing channels." },
      { icon: "🖼️", title: "Photo Gallery & Cover Image",    desc: "Organize gallery assets and choose a sale cover image." },
      { icon: "📱", title: "Sale Share Kit & QR Code",       desc: "Share-ready sale copy blocks, QR code, and public links." },
      { icon: "💬", title: "Buyer Inquiry Link",             desc: "A buyer inquiry path connected from the public sale page." },
      { icon: "🏷️", title: "Open House Support",             desc: "Support open house details and related share materials." },
      { icon: "🎥", title: "Sale Short Video",               desc: "Prepare short home sale videos and related media assets." },
    ],

    // QR section
    qrEyebrow: "Scan to Access the Platform",
    qrTitle: "Vanisland Property",
    qrBody:
      "Built for Vancouver Island landlords, home sellers, FSBO owners, property managers, and realtors. Scan the QR code to open our website on any device — easy to share with clients and partners.",
    qrFeatures: [
      "📋 Rental Studio — bilingual ads, listing pages, photo management",
      "🔍 Online rental application intake + AI initial screening",
      "📄 Auto PDF archive — every application saved to Drive",
      "🏡 Home Sale Studio — sale pages, marketing copy, cover images",
      "🎬 Short video generator — auto-create MP4 with music and smooth photo motion",
      "📱 QR share kits — one-click copy for WeChat, Facebook, and social posts",
      "🌐 Bilingual (English + Chinese) across all outputs",
    ],
    qrBadge: "Scan to Try",
    qrUrlLabel: "Vanisland Property",
    qrCaption: "Scan to open our website",
    qrOpenBtn: "Open Website →",

    // CTA band
    ctaTitle: "Ready to market your rental or sale listing?",
    ctaDesc: "Request access for Rental Studio, Home Sale Studio, or both modules.",
    ctaBtn: "Request Access",
  },

  zh: {
    // topbar
    langLabel: "🌐 中文",

    // hero
    eyebrow: "📚 平台介绍",
    heroTitle: "Vanisland Property",
    heroDesc: "为出租和出售房源创建专业营销套件。",
    heroSubDesc:
      "一站式平台，覆盖出租与出售房源的公开页面、租客申请和社交分享。",
    requestAccess: "申请访问",
    trialAccess: "免费试用",
    learnMore: "了解详情",

    // why card
    whyTitle: "为什么选择 Vanisland AI Studio？",
    reasons: [
      { icon: "✨", title: "AI 驱动营销",   desc: "数分钟内生成高质量文案、页面和营销素材。" },
      { icon: "🌐", title: "中英双语",       desc: "所有内容和页面均支持中英双语输出。" },
      { icon: "🔗", title: "随处分享",       desc: "二维码、分享链接和移动端适配页面。" },
      { icon: "👥", title: "专为房地产打造", desc: "专为房东、卖家、自售业主和房产经纪人设计。" },
    ],

    // daily brief
    briefEyebrow: "每日市场简报",
    briefTitle: "每日BC租赁与房屋买卖市场晨报",
    briefDateLabel: "日期",
    briefLoading: "正在加载最新简报…",
    viewFullReport: "查看完整报告",
    copyWechat: "复制微信版本",
    copiedWechat: "已复制",
    briefFields: [
      { key: "policySummary",        label: "政策摘要" },
      { key: "bcRentalSummary",      label: "BC 租赁市场" },
      { key: "bcSaleSummary",        label: "BC 销售市场" },
      { key: "nanaimoRentalSummary", label: "楠奈莫租赁市场" },
      { key: "nanaimoSaleSummary",   label: "楠奈莫销售市场" },
      { key: "landlordActionNotes",  label: "房东操作建议" },
      { key: "websiteSummary",       label: "平台动态" },
    ],

    // choose studio
    sectionKicker: "第二部分",
    chooseTitle: "选择您的工作台",
    chooseDesc: "选择适合您需求的工作台，随时可以切换。",
    rentalEyebrow: "适用于房东和物业管理人",
    rentalCardTitle: "出租房源工作台",
    rentalCardDesc:
      "创建双语出租广告、房源页面、二维码、在线租客申请链接和社交分享套件。",
    strategyEyebrow: "适用于正在比较出租方案的业主",
    strategyCardTitle: "AI 房产出租策略初评",
    strategyCardDesc:
      "填写房东信息、物业条件、套房潜力、Airbnb / 短租意向，以及 Mabel 风格的动态追问。",
    saleEyebrow: "适用于卖家、自售业主和房产经纪人",
    saleCardTitle: "出售房源工作台",
    saleCardDesc:
      "创建出售房源页面、双语营销文案、照片/视频推广素材、二维码和买家咨询链接。",

    // free resources
    freeKicker: "免费资源",
    freeTitle: "现已开放",
    freeDesc: "所有用户均可免费访问，无需注册。",
    photoTipsEyebrow: "适用于房东和卖家",
    photoTipsTitle: "智能拍照建议",
    photoTipsDesc: "拍摄清单，帮助您拍出吸引更多咨询的房源照片。",
    faqEyebrow: "平台帮助",
    faqTitle: "常见问题",
    faqDesc: "关于房源、照片和平台功能的常见问题解答。",
    openBtn: "打开",

    // trust strip
    trust: [
      { icon: "🛡️", title: "安全私密",   desc: "您的数据经过加密保护。" },
      { icon: "☁️", title: "云端存储",   desc: "随时随地访问。" },
      { icon: "⏱️", title: "节省时间",   desc: "自动化重复的营销工作。" },
      { icon: "🎧", title: "客户支持",   desc: "我们全程支持您成功。" },
    ],

    // share kit
    shareKitBtn: "分享套件",
    shareKitTitle: "房东推广分享套件",
    shareKitSub: "仅供房东、业主及客户转介使用。",

    // what we generate
    generateTitle: "我们生成什么",
    generateDesc: "出租与出售房源营销素材一站式工作流",
    rentalOutputsTitle: "出租房源产出",
    rentalOutputsDesc: "适用于房东、业主和物业管理人的营销素材。",
    saleOutputsTitle: "出售房源产出",
    saleOutputsDesc: "适用于卖家、自售业主和房产经纪人的营销素材。",
    secondaryLabel: "辅助产出",
    rentalOutputs: [
      { icon: "📝", title: "出租广告套件",     desc: "双语出租文案，直接用于发布和审核。" },
      { icon: "🖼️", title: "照片房源页",       desc: "含房源详情的可分享照片页面。" },
      { icon: "📋", title: "在线租客申请",     desc: "租客通过专属链接提交申请，无需打印或来回发送邮件。" },
      { icon: "📄", title: "申请 PDF 存档",    desc: "每份申请自动生成 PDF，保存至该房源的云端文件夹，记录清晰。" },
      { icon: "🔍", title: "AI 申请初筛",      desc: "汇总整理申请信息，标记缺失字段。不自动批准或拒绝，最终审核由房东手动完成。" },
      { icon: "✅", title: "人工审核流程",     desc: "所有申请均由房东在管理后台手动审核，完全掌控在业主手中。" },
      { icon: "📱", title: "出租分享套件与二维码", desc: "打包出租分享文字、链接和二维码访问。" },
      { icon: "🎬", title: "出租短视频",       desc: "准备短视频素材和脚本。" },
    ],
    saleOutputs: [
      { icon: "🏡", title: "出售房源页",           desc: "含房源详情和媒体的公开出售页面。" },
      { icon: "✍️", title: "双语出售营销文案",     desc: "面向主要分享渠道的双语出售文案。" },
      { icon: "🖼️", title: "照片相册与封面图",     desc: "整理相册资产并选择出售封面图。" },
      { icon: "📱", title: "出售分享套件与二维码", desc: "即用型出售文案块、二维码和公开链接。" },
      { icon: "💬", title: "买家咨询链接",         desc: "连接自公开出售页的买家咨询路径。" },
      { icon: "🏷️", title: "开放日支持",           desc: "支持开放日详情及相关分享素材。" },
      { icon: "🎥", title: "出售短视频",           desc: "准备出售房源短视频和相关媒体资产。" },
    ],

    // QR section
    qrEyebrow: "扫码访问平台",
    qrTitle: "Vanisland Property",
    qrBody:
      "专为温哥华岛房东、卖家、自售业主、物业管理人和房产经纪人打造。扫描二维码在任何设备上访问我们的网站，方便分享给客户和合作伙伴。",
    qrFeatures: [
      "📋 出租工作台 — 双语广告、房源页面、照片管理",
      "🔍 在线租客申请接收 + AI 初步筛选",
      "📄 自动 PDF 存档 — 每份申请保存至云端",
      "🏡 出售工作台 — 出售页面、营销文案、封面图",
      "🎬 短视频生成器 — 自动生成带音乐和平滑照片动效的 MP4",
      "📱 二维码分享套件 — 一键复制微信、Facebook 等社交发帖",
      "🌐 全部产出支持中英双语",
    ],
    qrBadge: "扫码试用",
    qrUrlLabel: "Vanisland Property",
    qrCaption: "扫码访问我们的网站",
    qrOpenBtn: "打开网站 →",

    // CTA band
    ctaTitle: "准备好推广您的出租或出售房源了吗？",
    ctaDesc: "申请出租房源工作台、出售房源工作台或两者的访问权限。",
    ctaBtn: "申请访问",
  },
};

const LANDLORD_SHARE_MESSAGES = [
  {
    id: "wechat-landlord",
    label: "WeChat Landlord Promotion",
    rows: 8,
    text:
      "Hello landlords and property owners,\n\nVanisland AI Rental Listing Marketing Studio helps prepare bilingual rental ads, photo listing pages, online application links, QR-code application access, media display, and organized application materials.\n\nIdeal for busy Vancouver Island landlords, property owners, and property managers. Tenants can view listings and apply online from any device — no printing or emailing documents back and forth.",
  },
  {
    id: "facebook-landlord",
    label: "Facebook / Community Promotion",
    rows: 6,
    text:
      "A practical rental marketing tool for Vancouver Island landlords, property owners, and property managers. It helps package bilingual listing copy, a shareable photo page, QR-code access, and online applications in one lightweight workflow.",
  },
  {
    id: "owner-invite",
    label: "Owner Invitation",
    rows: 6,
    text:
      "Hello, I wanted to share a rental marketing service that can help you prepare a cleaner and faster listing package, including bilingual ad copy, a public photo listing page, and an online application path.\n\nIf you have a rental listing coming up, it is worth checking out.",
  },
  {
    id: "general-website",
    label: "Website Share Message",
    rows: 5,
    text:
      "This website helps landlords and property owners prepare rental listing promotion materials, public photo pages, and tenant application links in a simple, mobile-friendly format.",
  },
];

// Keys that are written fresh each day (policy, actions, summary)
const DAILY_FLASH_TOP_KEYS = new Set(["policySummary", "landlordActionNotes"]);
// Keys backed by monthly/quarterly data sources (CMHC, REBGV, Zumper)
const WEEKLY_DATA_KEYS = new Set(["bcRentalSummary", "bcSaleSummary", "nanaimoRentalSummary", "nanaimoSaleSummary"]);

const DAILY_BRIEF_CARD_META = {
  policySummary:        { icon: "📄", className: "" },
  bcRentalSummary:      { icon: "🏢", className: "" },
  bcSaleSummary:        { icon: "🏠", className: "" },
  nanaimoRentalSummary: { icon: "📍", className: "" },
  nanaimoSaleSummary:   { icon: "🏡", className: "" },
  landlordActionNotes:  { icon: "💡", className: "" },
  websiteSummary:       { icon: "🧭", className: "lh-daily-brief__card--wide lh-daily-brief__card--muted" },
};

function getVancouverTodayText() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const year  = parts.find((p) => p.type === "year")?.value  || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day   = parts.find((p) => p.type === "day")?.value   || "";
  return `${year}-${month}-${day}`;
}

export default function Home({ lang }) {
  const safeLang = lang === "zh" ? "zh" : "en";
  const s = T[safeLang];

  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [briefError, setBriefError] = useState("");
  const [wechatCopied, setWechatCopied] = useState(false);
  const websiteReports = Array.isArray(brief?.websiteReports) ? brief.websiteReports : [];
  const homepageBriefDate = getVancouverTodayText();

  useEffect(() => {
    let active = true;
    async function loadBrief() {
      setBriefLoading(true);
      setBriefError("");
      try {
        const data = await getDailyMarketBrief();
        if (!active) return;
        setBrief(data || null);
      } catch (err) {
        if (!active) return;
        setBrief(null);
        setBriefError(err?.message || "Failed to load daily market brief.");
      } finally {
        if (active) setBriefLoading(false);
      }
    }
    loadBrief();
    return () => { active = false; };
  }, []);

  async function handleCopyWechat() {
    if (!brief?.wechatShareText) return;
    try {
      await navigator.clipboard.writeText(brief.wechatShareText);
      setWechatCopied(true);
      window.setTimeout(() => setWechatCopied(false), 1800);
    } catch {
      setWechatCopied(false);
    }
  }

  const rentalPrimary   = s.rentalOutputs.slice(0, 4);
  const rentalSecondary = s.rentalOutputs.slice(4);
  const salePrimary     = s.saleOutputs.slice(0, 4);
  const saleSecondary   = s.saleOutputs.slice(4);

  return (
    <>
      <section className="lh-home-topbar">
        <div className="lh-home-topbar__inner">
          <div className="lh-home-topbar__spacer" />
          <div className="lh-home-topbar__lang">{s.langLabel}</div>
        </div>
      </section>

      {/* Hero */}
      <section className="lh-hero">
        <div className="lh-hero__inner">
          <div className="lh-hero__content">
            <div className="lh-eyebrow">{s.eyebrow}</div>
            <h1 className="lh-hero__title">{s.heroTitle}</h1>
            <p className="lh-hero__desc">{s.heroDesc}</p>
            <p className="lh-hero__desc-ch">{s.heroSubDesc}</p>
            <div className="lh-hero__actions">
              <Link to="/contact" className="lh-btn lh-btn--sand">{s.requestAccess}</Link>
              <Link to="/trial-access" className="lh-btn lh-btn--white">{s.trialAccess}</Link>
              <a href="#studio-modules" className="lh-btn lh-btn--white">{s.learnMore}</a>
            </div>
          </div>

          <div className="lh-hero__showcase">
            <div className="lh-hero__card lh-hero__card--reasons">
              <div className="lh-rtb-card">
                <div className="lh-rtb-card__header">
                  <h3>{s.whyTitle}</h3>
                </div>
                <div className="lh-benefit-list">
                  {s.reasons.map((item) => (
                    <div key={item.title} className="lh-benefit-item">
                      <div className="lh-benefit-item__icon">{item.icon}</div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lh-hero-visual" aria-hidden="true">
              <div className="lh-hero-visual__glow" />
              <div className="lh-hero-visual__house" />
            </div>
          </div>
        </div>
      </section>

      {/* Daily Brief */}
      <section className="lh-daily-brief-section" aria-labelledby="daily-market-brief-title">
        <div className="lh-daily-brief">
          <div className="lh-daily-brief__top">
            <div>
              <div className="lh-daily-brief__eyebrow">{s.briefEyebrow}</div>
              <h2 id="daily-market-brief-title">{s.briefTitle}</h2>
            </div>
            <div className="lh-daily-brief__date">
              <span>{s.briefDateLabel}</span>
              <strong>{homepageBriefDate}</strong>
            </div>
          </div>

          {briefLoading ? (
            <div className="lh-daily-brief__status">{s.briefLoading}</div>
          ) : briefError ? (
            <div className="lh-daily-brief__status lh-daily-brief__status--error">{briefError}</div>
          ) : brief ? (
            <>
              <div className="lh-daily-brief__title-card">
                <div className="lh-daily-brief__label">{safeLang === "zh" ? "标题" : "Title"}</div>
                <h3>{brief.title || "Untitled Brief"}</h3>
              </div>

              {/* ── Today's Update (policy, actions, summary — written fresh daily) ── */}
              <div className="lh-daily-brief__section-head">
                <span className="lh-daily-brief__section-tag lh-daily-brief__section-tag--flash">
                  {safeLang === "zh" ? "今日更新" : "Today's Update"}
                </span>
                <span className="lh-daily-brief__section-meta">{brief.date}</span>
              </div>
              <div className="lh-daily-brief__flash-grid">
                {s.briefFields.filter(f => DAILY_FLASH_TOP_KEYS.has(f.key)).map((field) => {
                  const meta = DAILY_BRIEF_CARD_META[field.key] || { icon: "•", className: "" };
                  return (
                    <article key={field.key} className={`lh-daily-brief__card ${meta.className}`.trim()}>
                      <div className="lh-daily-brief__card-head">
                        <div className="lh-daily-brief__card-icon" aria-hidden="true">{meta.icon}</div>
                        <div className="lh-daily-brief__label">{field.label}</div>
                      </div>
                      <p>{brief[field.key] || "—"}</p>
                    </article>
                  );
                })}
              </div>
              <div className="lh-daily-brief__grid lh-daily-brief__grid--summary">
                {s.briefFields.filter(f => f.key === "websiteSummary").map((field) => {
                  const meta = DAILY_BRIEF_CARD_META[field.key] || { icon: "•", className: "" };
                  return (
                    <article key={field.key} className={`lh-daily-brief__card ${meta.className}`.trim()}>
                      <div className="lh-daily-brief__card-head">
                        <div className="lh-daily-brief__card-icon" aria-hidden="true">{meta.icon}</div>
                        <div className="lh-daily-brief__label">{field.label}</div>
                      </div>
                      <p>{brief[field.key] || "—"}</p>
                    </article>
                  );
                })}
              </div>

              {/* ── Market Data (CMHC / REBGV / Zumper — updated monthly) ── */}
              <div className="lh-daily-brief__section-head" style={{ marginTop: 28 }}>
                <span className="lh-daily-brief__section-tag lh-daily-brief__section-tag--data">
                  {safeLang === "zh" ? "市场数据" : "Market Data"}
                </span>
                <span className="lh-daily-brief__section-meta">
                  {safeLang === "zh" ? "每月更新" : "Updated monthly"}
                </span>
              </div>
              <div className="lh-daily-brief__grid">
                {s.briefFields.filter(f => WEEKLY_DATA_KEYS.has(f.key)).map((field) => {
                  const meta = DAILY_BRIEF_CARD_META[field.key] || { icon: "•", className: "" };
                  return (
                    <article key={field.key} className={`lh-daily-brief__card ${meta.className}`.trim()}>
                      <div className="lh-daily-brief__card-head">
                        <div className="lh-daily-brief__card-icon" aria-hidden="true">{meta.icon}</div>
                        <div className="lh-daily-brief__label">{field.label}</div>
                      </div>
                      <p>{brief[field.key] || "—"}</p>
                      <Link
                        to={`/reports/daily-market-brief#${field.key}`}
                        className="lh-daily-brief__detail-link"
                      >
                        {safeLang === "zh" ? "查看详情 →" : "View details →"}
                      </Link>
                    </article>
                  );
                })}
                {websiteReports.map((report) => {
                  const title = safeLang === "zh" ? report.titleCn : report.titleEn;
                  const desc = safeLang === "zh" ? report.descriptionCn : report.descriptionEn;
                  return (
                    <article key={report.reportId || report.reportPath} className="lh-daily-brief__card">
                      <div className="lh-daily-brief__card-head">
                        <div className="lh-daily-brief__card-icon" aria-hidden="true">📘</div>
                        <div className="lh-daily-brief__label">{title}</div>
                      </div>
                      <p>{desc}</p>
                      <Link
                        to={report.reportPath || `/reports/${report.reportId}`}
                        className="lh-daily-brief__detail-link"
                      >
                        {safeLang === "zh" ? "查看报告 →" : "View Report →"}
                      </Link>
                    </article>
                  );
                })}
              </div>

              <div className="lh-daily-brief__actions">
                <Link to="/reports/daily-market-brief" className="lh-btn lh-btn--sand">
                  {s.viewFullReport}
                </Link>
                <button type="button" className="lh-btn lh-btn--white" onClick={handleCopyWechat}>
                  {wechatCopied ? s.copiedWechat : s.copyWechat}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* Choose Your Studio */}
      <section className="lh-platform-hub" id="studio-modules">
        <div className="lh-platform-hub__inner">
          <div className="lh-section-title">
            <div className="lh-section-kicker">{s.sectionKicker}</div>
            <h2>{s.chooseTitle}</h2>
            <p>{s.chooseDesc}</p>
          </div>

          <div className="lh-platform-grid">
            <article className="lh-platform-card">
              <div className="lh-platform-card__icon">🏢</div>
              <div className="lh-platform-card__eyebrow">{s.rentalEyebrow}</div>
              <h3>{s.rentalCardTitle}</h3>
              <p>{s.rentalCardDesc}</p>
              <Link to="/examples" className="lh-btn lh-btn--sand">{s.rentalCardTitle}</Link>
            </article>

            <article className="lh-platform-card">
              <div className="lh-platform-card__icon">🧭</div>
              <div className="lh-platform-card__eyebrow">{s.strategyEyebrow}</div>
              <h3>{s.strategyCardTitle}</h3>
              <p>{s.strategyCardDesc}</p>
              <Link to="/landlord-ai/strategy-assessment" className="lh-btn lh-btn--sand">{s.strategyCardTitle}</Link>
            </article>

            <article className="lh-platform-card lh-platform-card--soft">
              <div className="lh-platform-card__icon lh-platform-card__icon--sale">🏠</div>
              <div className="lh-platform-card__eyebrow">{s.saleEyebrow}</div>
              <h3>{s.saleCardTitle}</h3>
              <p>{s.saleCardDesc}</p>
              <Link to="/home-sale-studio" className="lh-btn lh-btn--white">{s.saleCardTitle}</Link>
            </article>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="lh-platform-strip">
        <div className="lh-platform-strip__inner">
          {s.trust.map((item) => (
            <article key={item.title} className="lh-platform-strip__item">
              <div className="lh-platform-strip__icon">{item.icon}</div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Share Kit */}
      <section className="lh-section lh-section--tight">
        <div className="lh-share-kit-wrap">
          <ShareKit
            buttonLabel={s.shareKitBtn}
            title={s.shareKitTitle}
            subtitle={s.shareKitSub}
            messages={LANDLORD_SHARE_MESSAGES}
            linkLabel={safeLang === "zh" ? "复制网站链接" : "Copy Website Link"}
          />
        </div>
      </section>

      {/* What We Generate */}
      <section className="lh-section">
        <div className="lh-section-title">
          <h2>{s.generateTitle}</h2>
          <p>{s.generateDesc}</p>
        </div>

        <div className="lh-output-group">
          <div className="lh-output-group__head">
            <h3>{s.rentalOutputsTitle}</h3>
            <p>{s.rentalOutputsDesc}</p>
          </div>
          <div className="lh-feature-grid lh-feature-grid--primary">
            {rentalPrimary.map(({ icon, title, desc }) => (
              <article key={title} className="lh-feature-card">
                <div className="lh-feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
          {rentalSecondary.length > 0 && (
            <div className="lh-output-group__secondary">
              <div className="lh-output-group__secondary-label">{s.secondaryLabel}</div>
              <div className="lh-feature-grid lh-feature-grid--secondary">
                {rentalSecondary.map(({ icon, title, desc }) => (
                  <article key={title} className="lh-feature-card lh-feature-card--secondary">
                    <div className="lh-feature-icon">{icon}</div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lh-output-group">
          <div className="lh-output-group__head">
            <h3>{s.saleOutputsTitle}</h3>
            <p>{s.saleOutputsDesc}</p>
          </div>
          <div className="lh-feature-grid lh-feature-grid--primary">
            {salePrimary.map(({ icon, title, desc }) => (
              <article key={title} className="lh-feature-card">
                <div className="lh-feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
          {saleSecondary.length > 0 && (
            <div className="lh-output-group__secondary">
              <div className="lh-output-group__secondary-label">{s.secondaryLabel}</div>
              <div className="lh-feature-grid lh-feature-grid--secondary">
                {saleSecondary.map(({ icon, title, desc }) => (
                  <article key={title} className="lh-feature-card lh-feature-card--secondary">
                    <div className="lh-feature-icon">{icon}</div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Platform QR Promotion */}
      <section className="lh-section lh-qr-section" id="qr-access">
        <div className="lh-qr-inner">
          <div className="lh-qr-text">
            <div className="lh-eyebrow" style={{ marginBottom: 10 }}>{s.qrEyebrow}</div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, lineHeight: 1.3, marginBottom: 10 }}>
              {s.qrTitle}
            </h2>
            <p style={{ lineHeight: 1.8, color: "var(--color-text)", marginBottom: 20 }}>
              {s.qrBody}
            </p>
            <ul className="lh-qr-features">
              {s.qrFeatures.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="lh-qr-code-wrap">
            <div className="lh-qr-card">
              <div className="lh-qr-badge">{s.qrBadge}</div>
              <div className="lh-qr-code-box">
                <QRCodeSVG
                  value={PUBLIC_SITE_BASE_URL}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1a3a2e"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="lh-qr-url">{s.qrUrlLabel}</p>
              <p className="lh-qr-caption">{s.qrCaption}</p>
              <a
                href={PUBLIC_SITE_BASE_URL}
                target="_blank"
                rel="noreferrer"
                className="lh-btn lh-btn--sand"
                style={{ marginTop: 14, display: "block", textAlign: "center", fontSize: "0.85rem" }}
              >
                {s.qrOpenBtn}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="lh-cta-band">
        <div className="lh-cta-inner">
          <div>
            <h2>{s.ctaTitle}</h2>
            <p>{s.ctaDesc}</p>
          </div>
          <Link to="/contact" className="lh-btn lh-btn--sand">{s.ctaBtn}</Link>
        </div>
      </section>
    </>
  );
}
