import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import ShareKit from "../components/ShareKit";
import ContentAccordion from "../components/ContentAccordion";
import { PUBLIC_SITE_BASE_URL } from "../utils/publicUrls";
import { getDailyMarketBrief, parseDailyMarketBrief } from "../utils/dailyMarketBrief";
import { getRetirementBrief, field as rlField, roomType as rlRoomType, strategyScore as rlStrategyScore, bestPick as rlBestPick } from "../utils/retirementBrief";

// ─── Translation dictionary ────────────────────────────────────────────────
const T = {
  en: {
    // topbar
    langLabel: "🌐 EN",

    // hero
    eyebrow: "PROFESSIONAL SUPPORT FOR INDEPENDENT LANDLORDS",
    heroTitleLine1: "Manage your own property\u00A0—",
    heroTitleLine2: "without managing every challenge alone.",
    heroBrandLine1: "Stay independent.",
    heroBrandLine2: "Get professional support.",
    heroDesc:
      "VanIsland provides practical, professional support for independent landlords — from rental marketing and applicant screening to documentation, rental administration and difficult rental situations.",
    requestAccess: "Get Landlord Support",
    exploreServices: "Explore Our Services",

    // brand principles
    principles: [
      ["You manage your property.", "We help you manage the challenges."],
      ["Get help where you need it.", "Stay in control where you don't."],
      ["We don't replace the landlord.", "We support the landlord."],
    ],

    // why card
    whyTitle: "Why Independent Landlords Choose VanIsland",
    reasons: [
      { icon: "🎯", title: "You Stay in Control",   desc: "You remain the landlord and decision-maker on your own property." },
      { icon: "🧾", title: "Documentation & Records",desc: "Applications, tenancy paperwork, and records kept organized and retrievable." },
      { icon: "🔍", title: "Tenant Screening",       desc: "Structured screening and applicant review prepared for your final decision." },
      { icon: "🌐", title: "Bilingual Support",      desc: "Landlord and tenant communication handled in Chinese and English." },
    ],

    // how it works — division of responsibility
    modelKicker: "HOW IT WORKS",
    modelTitle: "You stay in control. VanIsland supports the process.",
    roleYouTitle: "You — the landlord",
    roleYou: [
      "Own and control the property",
      "Set the rental strategy and terms",
      "Make the final tenant-selection decision",
      "Approve the tenancy",
      "Receive rent directly where applicable",
      "Stay in control of the landlord–tenant relationship",
    ],
    roleUsTitle: "VanIsland — your support team",
    roleUs: [
      "Rental marketing and listing preparation",
      "Inquiry handling and showing support",
      "Applicant intake and tenant screening",
      "Supporting-document collection",
      "Rental documentation and administration",
      "Record keeping and dispute preparation",
    ],

    // renting your property
    rentKicker: "RENTING YOUR PROPERTY",
    rentPullLine1: "You own it. You manage it.",
    rentPullLine2: "We help you rent it well.",
    rentSteps: [
      { icon: "📣", title: "Marketing",             desc: "Listing preparation, bilingual ads, and inquiry handling." },
      { icon: "🔍", title: "Screening",             desc: "Applicant intake, document collection, and organized review." },
      { icon: "🧾", title: "Documentation",         desc: "Rental paperwork prepared and kept in order." },
      { icon: "📂", title: "Rental administration", desc: "Day-to-day rental process and record keeping." },
    ],
    rentNote:
      "You engage VanIsland to assist with marketing, applicant screening and rental administration. We organize and execute the rental process — you stay involved and make the final decision on the tenancy.",

    // when renting gets complicated
    hardKicker: "WHEN RENTING GETS COMPLICATED",
    hardTitle: "Professional support for the difficult parts",
    hardItems: [
      "Records", "Communications", "Tenancy administration", "Documentation",
      "Difficult situations", "Issue management", "Dispute preparation",
    ],

    // why vanisland
    whyKicker: "WHY VANISLAND",
    whyHeading: "Professional support without giving up control",
    whyBody:
      "Independent landlords shouldn't have to choose between doing absolutely everything alone and handing complete management of their property to a traditional property management company. VanIsland is the professional support layer between those two — use us for the parts where professional support adds value, and keep handling the parts you prefer to manage yourself.",

    // our story preview
    storyKicker: "BUILT FROM REAL LANDLORD EXPERIENCE",
    storyTitle: "18 Years of Firsthand Experience as an Independent Landlord",
    storyBody:
      "VanIsland grew from real-world rental experience — beginning with managing our own rental properties in Calgary and later supporting independent landlords across British Columbia.",
    storyLine: "We understand the challenges because we have lived them ourselves.",
    storyCta: "Our Story",

    // mission
    missionKicker: "OUR MISSION",
    missionStatement:
      "Helping independent landlords handle the real-world challenges of renting — professionally, confidently, and in control.",

    // daily brief
    briefEyebrow: "DAILY MARKET BRIEF",
    briefTitle: "Daily BC Rent & Sale Market Brief",
    briefDateLabel: "Date",
    briefLoading: "Loading latest published brief...",
    viewFullReport: "View Full Daily Report →",
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
    rentalEyebrow: "For independent landlords and property owners",
    rentalCardTitle: "Rental Studio",
    rentalCardDesc:
      "Create bilingual rental ads, listing pages, QR codes, online rental application links, and social sharing packages.",
    strategyEyebrow: "For landlords, tenants, and dispute parties",
    strategyCardTitle: "AI Review Center",
    strategyCardDesc:
      "AI organizes the information and prepares a preliminary review, followed by professional review. Current services include Property Assessment and Dispute Review.",
    strategyCardCta: "Open AI Review Center",
    saleEyebrow: "For home sellers, FSBO owners, and realtors",
    saleCardTitle: "Home Sale Studio",
    saleCardDesc:
      "Create home sale listing pages, bilingual marketing copy, photo/video promotion materials, QR codes, and buyer inquiry links.",
    saleCardCta: "Open Home Sale Studio",
    knowledgeEyebrow: "For landlord reference and policy review",
    knowledgeCardTitle: "Landlord Knowledge Center",
    knowledgeCardDesc:
      "Practical rental rules, local policy guides, STR reminders, suite notes, and VanIsland's landlord knowledge base.",
    policyAlertEyebrow: "LATEST BC POLICY UPDATE",
    policyAlertTitle: "2027 annual rent increase limit: 2.2%",
    policyAlertDesc:
      "The B.C. Government announced the maximum allowable annual increase for covered residential tenancies on August 27, 2026. It takes effect January 1, 2027.",
    policyAlertLink: "Read the official details →",

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
    rentalOutputsDesc: "Marketing materials for independent landlords and property owners.",
    saleOutputsTitle: "Home Sale Outputs",
    saleOutputsDesc: "Sale marketing materials for home sellers, FSBO owners, and realtors.",
    secondaryLabel: "Secondary outputs",
    rentalOutputs: [
      { icon: "📝", title: "Rental Ad Package",         desc: "Bilingual rental copy prepared for direct posting and review." },
      { icon: "🖼️", title: "Photo Listing Page",        desc: "A shareable rental photo page with listing details." },
      { icon: "📋", title: "Online Rental Application", desc: "Tenants submit applications via a dedicated link — no printing or email back-and-forth." },
      { icon: "📄", title: "Application PDF Archive",   desc: "Each application auto-generates a PDF saved to the listing's Drive folder for clean record-keeping." },
      { icon: "🔍", title: "AI Application Screening",  desc: "Summarizes and organizes application data, flags missing fields. No auto-approval or auto-rejection — final review is always manual." },
      { icon: "📊", title: "AI Tenant Screening Report Demo", desc: "See how AI creates owner-ready initial screening and complete applicant audit reports.", href: "/demo/ai-screening" },
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
      "Built for Vancouver Island landlords, home sellers, FSBO owners, and realtors. Scan the QR code to open our website on any device — easy to share with clients and partners.",
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
    ctaTitle: "Renting out a property and want professional support behind you?",
    ctaDesc: "Tell us what you are dealing with. You stay in control of your property and your decisions.",
    ctaBtn: "Talk to Us",
  },

  zh: {
    // topbar
    langLabel: "🌐 中文",

    // hero
    eyebrow: "为独立房东提供的专业支持",
    heroTitleLine1: "自己管理物业——",
    heroTitleLine2: "但不必独自应对每一个难题。",
    heroBrandLine1: "保持独立。",
    heroBrandLine2: "获得专业支持。",
    heroDesc:
      "VanIsland 为独立房东提供务实、专业的支持——从出租营销、申请人筛选，到文件资料、租务日常事务和棘手的出租情况。",
    requestAccess: "获取房东支持",
    exploreServices: "了解我们的服务",

    // brand principles
    principles: [
      ["物业由您管理。", "难题由我们协助处理。"],
      ["需要时，我们来帮忙。", "不需要时，一切由您做主。"],
      ["我们不取代房东。", "我们支持房东。"],
    ],

    // why card
    whyTitle: "独立房东为什么选择 VanIsland",
    reasons: [
      { icon: "🎯", title: "决定权在您",   desc: "您始终是房东，也是自己物业的决策人。" },
      { icon: "🧾", title: "文件与记录",   desc: "申请材料、租务文件和记录条理清晰、随时可查。" },
      { icon: "🔍", title: "租客筛选",     desc: "结构化筛选与申请人梳理，供您做最终判断。" },
      { icon: "🌐", title: "中英双语支持", desc: "房东与租客沟通均可中英双语处理。" },
    ],

    // how it works — division of responsibility
    modelKicker: "运作方式",
    modelTitle: "决定权在您，流程由我们支持。",
    roleYouTitle: "您 —— 房东",
    roleYou: [
      "拥有并掌控物业",
      "决定出租策略和条款",
      "对租客人选作出最终决定",
      "确认并批准租约",
      "在适用情况下直接收取租金",
      "始终掌握房东与租客的关系",
    ],
    roleUsTitle: "VanIsland —— 您的支持团队",
    roleUs: [
      "出租营销与房源资料准备",
      "咨询接待与看房支持",
      "申请接收与租客筛选",
      "证明材料收集",
      "租赁文件与日常事务",
      "记录保存与争议材料准备",
    ],

    // renting your property
    rentKicker: "出租您的物业",
    rentPullLine1: "物业是您的，管理也是您的。",
    rentPullLine2: "我们帮您把它租好。",
    rentSteps: [
      { icon: "📣", title: "营销推广",   desc: "房源资料准备、中英文广告与咨询接待。" },
      { icon: "🔍", title: "租客筛选",   desc: "申请接收、材料收集与条理化梳理。" },
      { icon: "🧾", title: "文件准备",   desc: "租赁文件准备妥当、条理清晰。" },
      { icon: "📂", title: "租务日常",   desc: "出租流程的日常事务与记录保存。" },
    ],
    rentNote:
      "您委托 VanIsland 协助出租营销、租客筛选和租务日常事务。我们负责组织和执行出租流程——您全程参与，并对租约作出最终决定。",

    // when renting gets complicated
    hardKicker: "当出租变复杂时",
    hardTitle: "困难环节的专业支持",
    hardItems: [
      "记录保存", "沟通协调", "租务日常事务", "文件资料",
      "棘手情况", "问题处理", "争议材料准备",
    ],

    // why vanisland
    whyKicker: "为什么选择 VANISLAND",
    whyHeading: "获得专业支持，同时不放弃掌控",
    whyBody:
      "独立房东不应该只能二选一：要么全部自己扛，要么把物业管理权完全交给传统物业管理公司。VanIsland 正是这两者之间的专业支持层——需要专业支持的部分交给我们，您愿意自己处理的部分依然由您掌握。",

    // our story preview
    storyKicker: "源于真实的房东经历",
    storyTitle: "18 年独立房东的亲身经历",
    storyBody:
      "VanIsland 源于真实的出租经历——从在卡尔加里打理自己的出租物业开始，到后来为卑诗省各地的独立房东提供支持。",
    storyLine: "我们懂这些难处，因为我们自己也一路走过。",
    storyCta: "我们的故事",

    // mission
    missionKicker: "我们的使命",
    missionStatement:
      "帮助独立房东应对出租过程中的现实难题——专业、从容，并始终由自己做主。",

    // daily brief
    briefEyebrow: "每日市场简报",
    briefTitle: "每日BC租赁与房屋买卖市场晨报",
    briefDateLabel: "日期",
    briefLoading: "正在加载最新简报…",
    viewFullReport: "查看完整日报 →",
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
    rentalEyebrow: "适用于独立房东和物业业主",
    rentalCardTitle: "出租房源工作台",
    rentalCardDesc:
      "创建双语出租广告、房源页面、二维码、在线租客申请链接和社交分享套件。",
    strategyEyebrow: "适用于房东、租客及争议当事人",
    strategyCardTitle: "AI 初评中心",
    strategyCardDesc:
      "先由 AI 收集和整理资料，生成初步评估，再由专业经验复核。目前包括房产出租策略AI初评和法律争议AI初评。",
    strategyCardCta: "进入 AI 初评中心",
    saleEyebrow: "适用于卖家、自售业主和房产经纪人",
    saleCardTitle: "出售房源工作台",
    saleCardDesc:
      "创建出售房源页面、双语营销文案、照片/视频推广素材、二维码和买家咨询链接。",
    saleCardCta: "进入出售房源工作台",
    knowledgeEyebrow: "适用于房东参考和政策核查",
    knowledgeCardTitle: "房东知识中心",
    knowledgeCardDesc:
      "实用出租法规、本地政策指南、短租提醒、套房说明，以及 VanIsland 的房东知识库。",
    policyAlertEyebrow: "BC 最新政策更新",
    policyAlertTitle: "2027 年度租金上涨上限：2.2%",
    policyAlertDesc:
      "BC 政府于 2026 年 8 月 27 日公布受法规覆盖住宅租赁的最高年度上涨幅度，2027 年 1 月 1 日起生效。",
    policyAlertLink: "查看官方具体规定 →",

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
    rentalOutputsDesc: "适用于独立房东和物业业主的营销素材。",
    saleOutputsTitle: "出售房源产出",
    saleOutputsDesc: "适用于卖家、自售业主和房产经纪人的营销素材。",
    secondaryLabel: "辅助产出",
    rentalOutputs: [
      { icon: "📝", title: "出租广告套件",     desc: "双语出租文案，直接用于发布和审核。" },
      { icon: "🖼️", title: "照片房源页",       desc: "含房源详情的可分享照片页面。" },
      { icon: "📋", title: "在线租客申请",     desc: "租客通过专属链接提交申请，无需打印或来回发送邮件。" },
      { icon: "📄", title: "申请 PDF 存档",    desc: "每份申请自动生成 PDF，保存至该房源的云端文件夹，记录清晰。" },
      { icon: "🔍", title: "AI 申请初筛",      desc: "汇总整理申请信息，标记缺失字段。不自动批准或拒绝，最终审核由房东手动完成。" },
      { icon: "📊", title: "AI 租客筛选报告 Demo", desc: "展示 AI 如何生成房东可读的租客初筛与完整审核报告。", href: "/demo/ai-screening" },
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
      "专为温哥华岛房东、卖家、自售业主和房产经纪人打造。扫描二维码在任何设备上访问我们的网站，方便分享给客户和合作伙伴。",
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
    ctaTitle: "正在出租物业，希望背后有专业支持？",
    ctaDesc: "告诉我们您当前遇到的情况。物业和决定权始终由您掌握。",
    ctaBtn: "联系我们",
  },
};

const LANDLORD_SHARE_MESSAGES = [
  {
    id: "wechat-landlord",
    label: "WeChat Landlord Promotion",
    rows: 8,
    text:
      "Hello landlords and property owners,\n\nVanisland AI Rental Listing Marketing Studio helps prepare bilingual rental ads, photo listing pages, online application links, QR-code application access, media display, and organized application materials.\n\nIdeal for busy Vancouver Island independent landlords and property owners. Tenants can view listings and apply online from any device — no printing or emailing documents back and forth.",
  },
  {
    id: "facebook-landlord",
    label: "Facebook / Community Promotion",
    rows: 6,
    text:
      "A practical rental marketing tool for Vancouver Island independent landlords and property owners. It helps package bilingual listing copy, a shareable photo page, QR-code access, and online applications in one lightweight workflow.",
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

function hasDailyBriefCardContent(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && !/^[\s—]+$/.test(text);
}

function ReportLines({ lines, className = "" }) {
  if (!Array.isArray(lines) || lines.length === 0) return null;
  return (
    <ul className={`lh-daily-brief__summary-list ${className}`.trim()}>
      {lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
    </ul>
  );
}

export default function Home({ lang }) {
  const safeLang = lang === "zh" ? "zh" : "en";
  const s = T[safeLang];

  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [briefError, setBriefError] = useState("");
  const [retireBrief, setRetireBrief] = useState(null);
  const homepageBriefDate = brief?.date || "—";
  const parsedBrief = brief ? parseDailyMarketBrief(brief) : null;
  const overviewSection = parsedBrief?.sections.find((section) => section.id === "overview");

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

  useEffect(() => {
    let active = true;
    async function loadRetire() {
      try {
        const data = await getRetirementBrief();
        if (active) setRetireBrief(data || null);
      } catch {
        if (active) setRetireBrief(null); // fail quietly; card just won't render
      }
    }
    loadRetire();
    return () => { active = false; };
  }, []);

  const rlBest = retireBrief ? rlBestPick(retireBrief) : null;

  const rentalPrimary   = s.rentalOutputs.slice(0, 6);
  const rentalSecondary = s.rentalOutputs.slice(6);
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
            <h1 className="lh-hero__title">
              <span>{s.heroTitleLine1}</span>
              <span>{s.heroTitleLine2}</span>
            </h1>
            <p className="lh-hero__brandline">
              <span>{s.heroBrandLine1}</span> <span>{s.heroBrandLine2}</span>
            </p>
            <p className="lh-hero__desc">{s.heroDesc}</p>
            <div className="lh-hero__actions">
              <Link to="/contact" className="lh-btn lh-btn--sand">{s.requestAccess}</Link>
              <Link to="/services" className="lh-btn lh-btn--white">{s.exploreServices}</Link>
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

      {/* Latest policy update */}
      <section className="lh-policy-alert" aria-labelledby="latest-policy-alert-title">
        <div className="lh-policy-alert__inner">
          <div>
            <div className="lh-section-kicker">{s.policyAlertEyebrow}</div>
            <h2 id="latest-policy-alert-title">{s.policyAlertTitle}</h2>
            <p>{s.policyAlertDesc}</p>
          </div>
          <Link to="/resources#rent-increases" className="lh-policy-alert__link">
            {s.policyAlertLink}
          </Link>
        </div>
      </section>

      {/* Brand principles — permanent VanIsland statements, subordinate to the hero */}
      <section className="lh-principles" aria-label="VanIsland brand principles">
        <div className="lh-principles__inner">
          {s.principles.map(([a, b]) => (
            <p key={a} className="lh-principle">
              <span>{a}</span>
              <span>{b}</span>
            </p>
          ))}
        </div>
      </section>

      {/* How it works — division of responsibility */}
      <section className="lh-section lh-model" id="landlord-support">
        <div className="lh-section-title">
          <div className="lh-section-kicker">{s.modelKicker}</div>
          <h2>{s.modelTitle}</h2>
        </div>
        <div className="lh-roles">
          <article className="lh-role-card lh-role-card--you">
            <h3>{s.roleYouTitle}</h3>
            <ul>{s.roleYou.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="lh-role-card">
            <h3>{s.roleUsTitle}</h3>
            <ul>{s.roleUs.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      {/* Renting your property */}
      <section className="lh-section lh-renting">
        <div className="lh-section-title">
          <div className="lh-section-kicker">{s.rentKicker}</div>
          <h2 className="lh-lede">
            <span>{s.rentPullLine1}</span> <span>{s.rentPullLine2}</span>
          </h2>
        </div>
        <div className="lh-values__grid lh-values__grid--four">
          {s.rentSteps.map((item) => (
            <article key={item.title} className="lh-value-card">
              <div className="lh-value-card__icon" aria-hidden="true">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
        <p className="lh-note">{s.rentNote}</p>
      </section>

      {/* Compact trio — "when renting gets complicated" / "why VanIsland" / "our story",
          combined into one scannable card row instead of three stacked sections. */}
      <section className="lh-section lh-trio-section">
        <div className="lh-trio-grid">
          <article className="lh-trio-card">
            <div className="lh-section-kicker">{s.hardKicker}</div>
            <h3>{s.hardTitle}</h3>
            <ul className="lh-chips lh-chips--compact">
              {s.hardItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="lh-trio-card">
            <div className="lh-section-kicker">{s.whyKicker}</div>
            <h3>{s.whyHeading}</h3>
            <p>{s.whyBody}</p>
            <p className="lh-trio-card__closing">{s.heroBrandLine1} {s.heroBrandLine2}</p>
          </article>

          {/* Our Story preview — understated on purpose: the 18 years of
              firsthand landlord experience is the claim, not marketing language. */}
          <article className="lh-trio-card">
            <div className="lh-section-kicker">{s.storyKicker}</div>
            <h3>{s.storyTitle}</h3>
            <p>{s.storyBody}</p>
            <p className="lh-trio-card__closing">{s.storyLine}</p>
            <Link to="/our-story" className="lh-story__cta">{s.storyCta} →</Link>
          </article>
        </div>
      </section>

      {/* Mission — compact full-width band, not a large standalone section */}
      <section className="lh-mission-band" aria-labelledby="vanisland-mission-title">
        <div className="lh-mission-band__inner">
          <span className="lh-mission-band__kicker">{s.missionKicker}</span>
          <p id="vanisland-mission-title">{s.missionStatement}</p>
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
            <ContentAccordion
              title={safeLang === "zh" ? "展开今日简报" : "View Today's Brief"}
              summary={brief.title}
              defaultOpen={false}
              className="lh-daily-brief__accordion"
            >
              <div className="lh-daily-brief__title-card">
                <div className="lh-daily-brief__label">{safeLang === "zh" ? "标题" : "Title"}</div>
                <h3>{brief.title || "Untitled Brief"}</h3>
              </div>

              <div className="lh-daily-brief__section-head">
                <span className="lh-daily-brief__section-tag lh-daily-brief__section-tag--flash">
                  {safeLang === "zh" ? "今日市场速览" : "Today's Market Overview"}
                </span>
                <span className="lh-daily-brief__section-meta">{brief.date}</span>
              </div>
              {overviewSection ? <ReportLines lines={overviewSection.lines} /> : null}

              {hasDailyBriefCardContent(brief.nanaimoRentalSummary) ? (
                <article className="lh-daily-brief__card lh-daily-brief__card--wide lh-daily-brief__card--muted">
                  <div className="lh-daily-brief__card-head">
                    <div className="lh-daily-brief__card-icon" aria-hidden="true">📍</div>
                    <div className="lh-daily-brief__label">
                      {safeLang === "zh" ? "Greater Nanaimo Rental Market" : "Greater Nanaimo Rental Market"}
                    </div>
                  </div>
                  <p>{brief.nanaimoRentalSummary}</p>
                </article>
              ) : null}

              <div className="lh-daily-brief__actions">
                <Link to="/reports/daily-market-brief" className="lh-btn lh-btn--sand">
                  {s.viewFullReport}
                </Link>
              </div>
            </ContentAccordion>
          ) : null}

          {/* ── 退休生活房源简报 — independent data source; separate accordion ── */}
          {retireBrief ? (
            <ContentAccordion
              title="退休生活房源简报"
              summary={rlField(retireBrief.dailySummary, "")}
              defaultOpen={false}
              className="lh-daily-brief__accordion"
            >
              <div className="lh-daily-brief__section-head">
                <span className="lh-daily-brief__section-tag lh-daily-brief__section-tag--flash">
                  退休生活房源简报
                </span>
                <span className="lh-daily-brief__section-meta">{rlField(retireBrief.date, "待确认")}</span>
              </div>
              <div className="lh-daily-brief__grid">
                <Link
                  to="/reports/retirement-living-brief"
                  className="lh-daily-brief__card lh-daily-brief__card--retire"
                >
                  <div className="lh-daily-brief__card-head">
                    <div className="lh-daily-brief__card-icon" aria-hidden="true">🏡</div>
                    <div className="lh-daily-brief__label">退休生活房源简报</div>
                  </div>

                  <div className="lh-daily-brief__label" style={{ marginBottom: 8 }}>
                    今日最佳退休生活推荐
                  </div>
                  <dl className="rl-card__stats">
                    {[
                      ["地址", rlField(rlBest?.address, "待确认")],
                      ["区域", rlField(rlBest?.region, (String(rlBest?.address || "").match(/[（(]([^）)]+)[）)]/)?.[1]?.trim() || "待确认"))],
                      ["价格", rlField(rlBest?.price, "待确认")],
                      ["年份", rlField(rlBest?.yearBuilt, "待确认")],
                      ["房型", rlRoomType(rlBest, "待确认")],
                      ["退休策略评分", rlStrategyScore(rlBest, retireBrief)],
                      ["AI 推荐等级", rlField(rlBest?.aiRating, "待确认")],
                      ["下一步建议", rlField(rlBest?.action, "待确认")],
                    ].map(([label, value]) => (
                      <div key={label} className="rl-card__stat">
                        <dt>{label}</dt>
                        <dd className={value === "待确认" || value === "评分待生成" ? "rl-todo" : ""}>{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="lh-daily-brief__label" style={{ marginBottom: 4 }}>一句话中文总结</div>
                  <p className="rl-card__summary">{rlField(retireBrief.dailySummary, "待确认")}</p>

                  <span className="lh-daily-brief__detail-link">查看详情 →</span>
                </Link>
              </div>
            </ContentAccordion>
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
              <Link to="/rentals" className="lh-btn lh-btn--sand">{s.rentalCardTitle}</Link>
            </article>

            <article className="lh-platform-card">
              <div className="lh-platform-card__icon">🧭</div>
              <div className="lh-platform-card__eyebrow">{s.strategyEyebrow}</div>
              <h3>{s.strategyCardTitle}</h3>
              <p>{s.strategyCardDesc}</p>
              <Link to="/landlord-ai/review-center" className="lh-btn lh-btn--sand">{s.strategyCardCta}</Link>
            </article>

            <article className="lh-platform-card lh-platform-card--soft">
              <div className="lh-platform-card__icon lh-platform-card__icon--sale">🏠</div>
              <div className="lh-platform-card__eyebrow">{s.saleEyebrow}</div>
              <h3>{s.saleCardTitle}</h3>
              <p>{s.saleCardDesc}</p>
              <Link to="/home-sale-studio" className="lh-btn lh-btn--sand">{s.saleCardCta}</Link>
            </article>

            <article className="lh-platform-card">
              <div className="lh-platform-card__icon">📚</div>
              <div className="lh-platform-card__eyebrow">{s.knowledgeEyebrow}</div>
              <h3>{s.knowledgeCardTitle}</h3>
              <p>{s.knowledgeCardDesc}</p>
              <Link to="/resources" className="lh-btn lh-btn--sand">{s.knowledgeCardTitle}</Link>
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

        <ContentAccordion
          title={s.rentalOutputsTitle}
          summary={s.rentalOutputsDesc}
          defaultOpen={false}
          className="lh-output-accordion"
        >
          <div className="lh-feature-grid lh-feature-grid--primary">
            {rentalPrimary.map(({ icon, title, desc, href }) => (
              <article key={title} className="lh-feature-card">
                <div className="lh-feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
                {href && <Link className="lh-feature-card__link" to={href}>{s.openBtn}</Link>}
              </article>
            ))}
          </div>
          {rentalSecondary.length > 0 && (
            <div className="lh-output-group__secondary">
              <div className="lh-output-group__secondary-label">{s.secondaryLabel}</div>
              <div className="lh-feature-grid lh-feature-grid--secondary">
                {rentalSecondary.map(({ icon, title, desc, href }) => (
                  <article key={title} className="lh-feature-card lh-feature-card--secondary">
                    <div className="lh-feature-icon">{icon}</div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                    {href && <Link className="lh-feature-card__link" to={href}>{s.openBtn}</Link>}
                  </article>
                ))}
              </div>
            </div>
          )}
        </ContentAccordion>

        <ContentAccordion
          title={s.saleOutputsTitle}
          summary={s.saleOutputsDesc}
          defaultOpen={false}
          className="lh-output-accordion"
        >
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
        </ContentAccordion>
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
