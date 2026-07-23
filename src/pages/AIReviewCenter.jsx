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
      title: "房产出租策略AI初评",
      desc: "评估整租、分租、租金定位、Airbnb / 短租风险及出租策略。",
    },
  },
  {
    key: "dispute",
    to: "/landlord-ai/dispute-review",
    icon: "⚖️",
    en: {
      title: "AI Dispute Review",
      desc: "For Residential Tenancy Branch matters, CRT, Strata disputes, Small Claims, and Supreme Court of British Columbia civil litigation. AI organizes the facts, timeline, party allegations, and evidence, identifies missing materials and procedural risks, and prepares the matter for professional review.",
      badges: ["Residential Tenancy", "CRT", "Strata", "Small Claims", "BC Supreme Court"],
    },
    zh: {
      title: "法律争议AI初评",
      desc: "适用于住宅租赁RTB、CRT、Strata、Small Claims及BC省最高法院民事诉讼。AI整理事实、时间线、当事人主张和证据，识别缺失材料、程序风险及需要进一步核实的问题，再交由专业人员审核。",
      badges: ["RTB住宅租赁", "CRT", "Strata", "Small Claims", "BC省最高法院"],
    },
  },
];

const COPY = {
  en: {
    title: "AI Review Center",
    sub: "Organize the facts and evidence before assessing the risk.",
    desc: "AI reviews the information and documents provided, organizes the timeline, identifies evidence gaps and procedural risks, and prepares a preliminary assessment report for professional review.",
    available: "Available now",
    start: "Start",
    notice:
      "Every AI preliminary review is a draft for professional review. It is not legal advice and does not guarantee any outcome.",
  },
  zh: {
    title: "AI初评中心",
    sub: "先整理事实和证据，再判断案件风险。",
    desc: "AI根据您提交的信息和材料，梳理时间线、识别证据缺口、提示程序风险，并生成供专业审核使用的初步评估报告。",
    available: "现已开放",
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
                  {text.badges && (
                    <ul className="review-center__badges">
                      {text.badges.map((badge) => (
                        <li key={badge} className="review-center__badge">{badge}</li>
                      ))}
                    </ul>
                  )}
                  <span className="review-center__cta">{copy.start} →</span>
                </Link>
              );
            })}
          </div>

          <div className="notice notice--info strategy-inline-notice">
            <p>{copy.notice}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
