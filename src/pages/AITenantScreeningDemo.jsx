import { Link, useParams } from "react-router-dom";

const DEMO_COPY = {
  en: {
    eyebrow: "AI SCREENING DEMO",
    title: "AI Tenant Screening Report Demo",
    desc: "See how VanIsland Property uses AI to turn rental applications, support documents, and manual verification steps into clear, professional owner-ready screening reports.",
    button: "View Demo PDF",
    cards: [
      {
        id: "executive",
        title: "AI Screening Executive Demo",
        desc: "A quick overview of the AI screening workflow and key findings.",
        href: "/demo/ai-screening/en/VIPM_AI_Tenant_Screening_Executive_Demo.pdf",
      },
      {
        id: "initial",
        title: "Initial Applicant Screening Demo",
        desc: "Shows applicant ranking, income ratios, risk notes, and recommended next steps.",
        href: "/demo/ai-screening/en/VIPM_Initial_Applicant_Screening_Report_Demo.pdf",
      },
      {
        id: "audit",
        title: "Complete Applicant Audit Demo",
        desc: "Shows the full audit workflow for support documents, income, identity, references, and missing items.",
        href: "/demo/ai-screening/en/VIPM_Complete_Applicant_Audit_Report_Demo.pdf",
      },
    ],
  },
  zh: {
    eyebrow: "AI 筛选 Demo",
    title: "AI 租客筛选报告 Demo",
    desc: "展示 VanIsland Property 如何使用 AI 将租客申请、支持文件和人工审核流程整理成清晰、专业、可供房东查看的筛选报告。",
    button: "查看 Demo PDF",
    cards: [
      {
        id: "executive",
        title: "AI 筛选总览 Demo",
        desc: "适合快速展示 AI 筛选流程和核心结论。",
        href: "/demo/ai-screening/zh/VIPM_AI_Tenant_Screening_Executive_Demo_ZH.pdf",
      },
      {
        id: "initial",
        title: "初步租客筛选报告 Demo",
        desc: "展示多个申请人的排序、收入比例、风险提示和建议下一步。",
        href: "/demo/ai-screening/zh/VIPM_Initial_Applicant_Screening_Report_Demo_ZH.pdf",
      },
      {
        id: "audit",
        title: "完整申请人审核报告 Demo",
        desc: "展示支持文件、收入、身份、推荐人和缺失项目的完整审核流程。",
        href: "/demo/ai-screening/zh/VIPM_Complete_Applicant_Audit_Report_Demo_ZH.pdf",
      },
    ],
  },
};

export default function AITenantScreeningDemo({ lang }) {
  const safeLang = lang === "zh" ? "zh" : "en";
  const copy = DEMO_COPY[safeLang];

  return (
    <main className="ai-screening-demo">
      <section className="ai-screening-demo__hero">
        <div className="lh-section-kicker">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p>{copy.desc}</p>
        <Link className="ai-screening-demo__home" to="/">
          {safeLang === "zh" ? "← 返回首页" : "← Back to Home"}
        </Link>
      </section>

      <section className="ai-screening-demo__grid" aria-label={copy.title}>
        {copy.cards.map((card, index) => (
          <article className="ai-screening-demo__card" key={card.title}>
            <div className="ai-screening-demo__number">{String(index + 1).padStart(2, "0")}</div>
            <h2>{card.title}</h2>
            <p>{card.desc}</p>
            {card.href ? (
              <Link className="ai-screening-demo__button" to={`/demo/ai-screening/${safeLang}/${card.id}`}>
                {copy.button}
              </Link>
            ) : (
              <span className="ai-screening-demo__button ai-screening-demo__button--disabled">
                {copy.button}
              </span>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

export function AITenantScreeningDemoViewer({ lang }) {
  const { demoLang, demoId } = useParams();
  const safeLang = demoLang === "zh" || demoLang === "en" ? demoLang : (lang === "zh" ? "zh" : "en");
  const copy = DEMO_COPY[safeLang] || DEMO_COPY.en;
  const card = copy.cards.find((item) => item.id === demoId) || copy.cards[0];

  return (
    <main className="ai-screening-demo ai-screening-demo--viewer">
      <section className="ai-screening-demo__viewer-head">
        <div>
          <div className="lh-section-kicker">{copy.eyebrow}</div>
          <h1>{card.title}</h1>
          <p>{card.desc}</p>
        </div>
        <div className="ai-screening-demo__viewer-actions">
          <Link className="ai-screening-demo__button ai-screening-demo__button--light" to="/demo/ai-screening">
            {safeLang === "zh" ? "← 返回 Demo" : "← Back to Demo"}
          </Link>
          <Link className="ai-screening-demo__button ai-screening-demo__button--light" to="/">
            {safeLang === "zh" ? "首页" : "Home"}
          </Link>
          <a className="ai-screening-demo__button" href={card.href} download>
            {safeLang === "zh" ? "下载 PDF" : "Download PDF"}
          </a>
        </div>
      </section>

      <section className="ai-screening-demo__pdf-shell">
        <iframe
          title={card.title}
          className="ai-screening-demo__pdf-frame"
          src={`${card.href}#toolbar=1&navpanes=0`}
        />
      </section>
    </main>
  );
}
