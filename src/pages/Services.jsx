import { Link } from "react-router-dom";
import { normalizeLang } from "../utils/lang";

const COPY = {
  en: {
    title: "Professional Landlord Support",
    subtitle: "Powered by experience, systems and smart technology. Support for independent landlords across rental marketing, tenant screening, documentation, rental administration, record keeping, and dispute preparation — you stay in control of your property and your decisions.",
    sections: [
      {
        key: "professional",
        title: "Landlord Support Services",
        description: "Practical support for rental marketing, applications, tenancy administration, and home sales — provided under the landlord's direction.",
        cards: [
          { icon: "🏠", title: "Rental Listing & Marketing", description: "Professional bilingual rental listings, property pages, photo presentation, QR codes, social-media sharing content, platform-ready posts, cover headlines, and short-video scripts.", button: "Open Rental Studio", to: "/rentals" },
          { icon: "📋", title: "Tenant Application & Preliminary Screening", description: "Tenants submit applications online while the system organizes applicant information and requested verification for consistent review. The landlord reviews the relevant information and retains the final rental decision, subject to applicable law.", button: "Apply Online", to: "/apply" },
          { icon: "🔑", title: "Tenancy Support & Rental Administration", description: "Tenant communication, rent and payment tracking, maintenance coordination, record keeping, owner reporting, and ongoing tenancy support. The landlord remains the decision-maker throughout.", button: "Talk to Us", to: "/contact" },
          { icon: "🏡", title: "Home Sale Marketing", description: "Bilingual home-sale pages, photo and video marketing content, platform-ready copy, cover headlines, short-video scripts, QR codes, and buyer inquiry links for sellers, private-sale owners, and real-estate professionals.", button: "Open Home Sale Studio", to: "/home-sale-studio" },
        ],
      },
      {
        key: "review",
        title: "AI Review Center",
        description: "AI organizes the information and prepares a preliminary review, followed by professional review.",
        mainButton: "Open AI Review Center",
        mainTo: "/landlord-ai/review-center",
        cards: [
          { icon: "🧭", title: "AI Property Strategy Assessment", description: "Assess whole-house or split-rental options, rent positioning, Airbnb / short-term rental risks, and rental strategy.", button: "Start Assessment", to: "/landlord-ai/strategy-assessment" },
          { icon: "⚖️", title: "AI Dispute Review", description: "For RTB, CRT, Strata, and Small Claims matters. Organize facts, timelines, evidence, and missing materials before professional review.", button: "Start Review", to: "/landlord-ai/dispute-review" },
        ],
      },
      {
        key: "online",
        title: "Online Tenant & Landlord Services",
        description: "Direct access to the online tools tenants and landlords use most often.",
        cards: [
          { icon: "🛠️", title: "Online Maintenance Request", description: "Tenants can report maintenance issues online, upload photos and details, and help our team track each request in one place.", button: "Submit Maintenance Request", to: "/tenant-service-request" },
          { icon: "📚", title: "Landlord Knowledge Center", description: "Rental regulations, local policy guidance, short-term rental rules, suite information, and practical rental-support resources.", button: "Open Knowledge Center", to: "/resources" },
          { icon: "🏘️", title: "Tenant Portal", description: "A central place for rental listings, online applications, maintenance requests, contact options, and frequently asked questions.", button: "Open Tenant Portal", to: "/rentals" },
        ],
      },
    ],
  },
  zh: {
    title: "专业房东支持服务",
    subtitle: "以实务经验、系统与智能技术为支撑，为独立房东提供出租营销、租客筛选、文件准备、租务日常事务、记录保存和争议材料准备等支持——物业和决定权始终由您掌握。",
    sections: [
      {
        key: "professional",
        title: "房东支持服务",
        description: "覆盖出租营销、租客申请、租务日常事务和房屋出售推广的实用支持，均在房东的指示下进行。",
        cards: [
          { icon: "🏠", title: "出租房源营销", description: "创建专业的中英文出租广告、房源页面、照片展示、二维码、社交平台分享内容、平台发帖文案、封面标题及短视频脚本。", button: "进入出租房源工作台", to: "/rentals" },
          { icon: "📋", title: "租客申请与初步筛选", description: "租客可在线提交申请资料，系统集中整理申请信息及所需核验资料，协助进行一致、规范的审核。房东查看相关信息，并在适用法律范围内保留最终租赁决定权。", button: "在线申请", to: "/apply" },
          { icon: "🔑", title: "租务支持与日常事务", description: "提供租客沟通、租金与付款跟踪、维修协调、记录保存、业主报告及日常租务支持。整个过程中，决策权始终在房东。", button: "联系我们", to: "/contact" },
          { icon: "🏡", title: "出售房源营销", description: "为卖家、自售业主和房产经纪人创建中英文出售房源页面、照片和视频推广内容、平台发帖文案、封面标题、短视频脚本、二维码及买家咨询入口。", button: "进入出售房源工作台", to: "/home-sale-studio" },
        ],
      },
      {
        key: "review",
        title: "AI初评中心",
        description: "AI先收集和整理资料、生成初步评估，再由专业经验进行复核。",
        mainButton: "进入AI初评中心",
        mainTo: "/landlord-ai/review-center",
        cards: [
          { icon: "🧭", title: "房产出租策略AI初评", description: "评估整租、分租、租金定位、Airbnb/短租风险及出租策略。", button: "开始策略初评", to: "/landlord-ai/strategy-assessment" },
          { icon: "⚖️", title: "法律争议AI初评", description: "适用于RTB、CRT、Strata和Small Claims，整理事实、时间线、证据及缺失材料，再进入专业复核。", button: "开始争议初评", to: "/landlord-ai/dispute-review" },
        ],
      },
      {
        key: "online",
        title: "在线租客与房东服务",
        description: "集中连接租客和房东最常使用的在线服务。",
        cards: [
          { icon: "🛠️", title: "租客在线维修申报", description: "租客可在线提交维修问题、上传照片和相关说明，方便我们团队集中记录、跟踪和处理。", button: "提交维修申报", to: "/tenant-service-request" },
          { icon: "📚", title: "房东知识中心", description: "提供出租法规、本地政策、短租规则、套房说明和出租实务指南。", button: "进入房东知识中心", to: "/resources" },
          { icon: "🏘️", title: "租客门户", description: "集中提供房源浏览、在线申请、维修申报、联系方式和常见问题入口。", button: "进入租客门户", to: "/rentals" },
        ],
      },
    ],
  },
};

export default function Services({ lang }) {
  const copy = COPY[normalizeLang(lang)] || COPY.en;

  return (
    <div className="pub-page services-page">
      <section className="pub-hero services-hero">
        <h1 className="pub-hero__title">{copy.title}</h1>
        <p className="pub-hero__desc">{copy.subtitle}</p>
      </section>

      {copy.sections.map((section, index) => (
        <section key={section.key} className={`services-section${index % 2 ? " services-section--tint" : ""}`}>
          <div className="container services-container">
            <div className="services-section__header">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              {section.mainButton && <Link className="btn btn--sage services-section__main-cta" to={section.mainTo}>{section.mainButton}</Link>}
            </div>

            <div className={`services-grid services-grid--${section.cards.length}`}>
              {section.cards.map((card) => (
                <article key={card.title} className="card services-card">
                  <span className="services-card__icon" aria-hidden="true">{card.icon}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <Link className="btn btn--sage services-card__cta" to={card.to}>{card.button}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
