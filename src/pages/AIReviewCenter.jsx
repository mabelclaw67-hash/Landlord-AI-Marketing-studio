import { Link } from "react-router-dom";
import { normalizeLang } from "../utils/lang";

// One entry point, several review services. Property Assessment keeps its own
// existing route and flow untouched; this page only points at it.
const SERVICES = [
  {
    key: "property",
    to: "/landlord-ai/strategy-assessment",
    icon: "🏠",
    en: {
      title: "AI Property Strategy Assessment",
      desc: "Review whole-house rental, split-rental potential, rent positioning, Airbnb / STR risks, and rental strategy.",
    },
    zh: {
      title: "AI 房产出租策略初评",
      desc: "评估整租、分租、租金定位、Airbnb / 短租风险及出租策略。",
    },
  },
  {
    key: "dispute",
    to: "/landlord-ai/dispute-review",
    icon: "⚖️",
    en: {
      title: "AI Dispute Review",
      desc: "For RTB, CRT, Strata, and Small Claims disputes. AI organizes facts, timelines, evidence, and missing materials before professional review.",
    },
    zh: {
      title: "AI 争议初评",
      desc: "适用于 RTB、CRT、Strata 和 Small Claims。AI 整理事实、时间线、证据及缺失材料，再进入专业复核。",
    },
  },
];

const COMING_SOON = [
  { key: "tenantApplication", icon: "📄", en: "Tenant Application Review", zh: "租客申请初评" },
  { key: "lease", icon: "📝", en: "Lease Review", zh: "租约初评" },
  { key: "rent", icon: "💲", en: "Rent Review", zh: "租金初评" },
  { key: "maintenance", icon: "🔧", en: "Maintenance Review", zh: "维修初评" },
  { key: "damageDeposit", icon: "🧾", en: "Damage & Deposit Review", zh: "损坏与押金初评" },
];

const COPY = {
  en: {
    title: "AI Review Center",
    sub: "Please choose what you would like an AI preliminary review of.",
    desc: "AI organizes the facts. Professional experience reviews the risk.",
    available: "Available now",
    comingSoon: "Coming soon",
    comingSoonNote: "These services are not open yet. Nothing is collected or stored for them.",
    start: "Start",
    notice:
      "Every AI preliminary review is a draft for professional review. It is not legal advice and does not guarantee any outcome.",
  },
  zh: {
    title: "AI 初评中心",
    sub: "请选择您需要 AI 初评的内容。",
    desc: "AI 整理事实，专业经验审阅风险。",
    available: "现已开放",
    comingSoon: "即将推出",
    comingSoonNote: "这些服务尚未开放，也不会收集或保存任何资料。",
    start: "开始",
    notice: "所有 AI 初评均为供专业审核使用的草稿，不构成法律意见，也不保证任何结果。",
  },
};

export default function AIReviewCenter({ lang }) {
  const safeLang = normalizeLang(lang);
  const copy = COPY[safeLang] || COPY.en;

  return (
    <div className="pub-page strategy-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{copy.title}</h1>
        <p className="pub-hero__sub">{copy.sub}</p>
        <p className="pub-hero__desc">{copy.desc}</p>
      </section>

      <section className="section">
        <div className="container strategy-container">
          <h2 className="review-center__heading">{copy.available}</h2>
          <div className="review-center__grid">
            {SERVICES.map((service) => {
              const text = service[safeLang] || service.en;
              return (
                <Link key={service.key} to={service.to} className="card review-center__card">
                  <span className="review-center__icon" aria-hidden="true">{service.icon}</span>
                  <h3>{text.title}</h3>
                  <p className="review-center__desc">{text.desc}</p>
                  <span className="review-center__cta">{copy.start} →</span>
                </Link>
              );
            })}
          </div>

          <h2 className="review-center__heading">{copy.comingSoon}</h2>
          <p className="strategy-help">{copy.comingSoonNote}</p>
          <div className="review-center__grid review-center__grid--soon">
            {COMING_SOON.map((item) => (
              <div key={item.key} className="card review-center__card review-center__card--soon" aria-disabled="true">
                <span className="review-center__icon" aria-hidden="true">{item.icon}</span>
                <h3>{safeLang === "zh" ? item.zh : item.en}</h3>
                <span className="review-center__badge">{copy.comingSoon}</span>
              </div>
            ))}
          </div>

          <div className="notice notice--info strategy-inline-notice">
            <p>{copy.notice}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
