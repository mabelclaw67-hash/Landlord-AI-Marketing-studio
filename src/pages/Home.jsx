import { Link } from "react-router-dom";
import { t } from "../translations";

const FEATURES = [
  {
    icon: "📝",
    title: "Rental Ad Package",
    ch: "中英文广告文案包",
    desc: "Bilingual Facebook, Craigslist and WeChat copy — ready to review and post.",
  },
  {
    icon: "🖼️",
    title: "Photo Listing Page",
    ch: "在线图片房源页面",
    desc: "A shareable listing page with photos, property details and application link.",
  },
  {
    icon: "📋",
    title: "Online Application",
    ch: "在线申请表链接",
    desc: "Connect tenants to the existing rental application form without entering Admin Studio.",
  },
];

export default function Home({ lang }) {
  return (
    <>
      {/* Hero */}
      <section className="lh-hero">
        <div className="lh-hero__inner">
          <div>
            <div className="lh-eyebrow">🇨🇦 Vancouver Island · BC Landlords</div>
            <h1 className="lh-hero__title">{t(lang, "home.heroTitle")}</h1>
            <p className="lh-hero__desc">{t(lang, "home.heroSubtitle")}</p>
            <p className="lh-hero__desc-ch">{t(lang, "home.heroChSubtitle")}</p>
            <div className="lh-hero__actions">
              <Link to="/contact" className="lh-btn lh-btn--sand">
                {t(lang, "home.ctaStart")}
              </Link>
              <Link to="/examples" className="lh-btn lh-btn--white">
                View Current Listing
              </Link>
            </div>
          </div>

          {/* BC Rental Update card */}
          <div className="lh-hero__card">
            <div className="lh-rtb-card">
              <div className="lh-rtb-card__header">
                <div className="lh-rtb-card__badge">⚖️ BC RTB</div>
                <h3>BC Rental Update</h3>
                <p>BC租赁法规提醒</p>
              </div>

              <ul className="lh-rtb-card__list">
                <li>Rent increase and RTB rule changes should be verified before publishing notices.</li>
                <li>Review notice periods, pet policy wording, and tenant screening requirements before listing.</li>
                <li>Always confirm the latest official RTB guidance before sending legal notices.</li>
              </ul>

              <ul className="lh-rtb-card__list lh-rtb-card__list--ch">
                <li>发布出租广告或通知前，请先核对最新租金涨幅和 RTB 规则。</li>
                <li>上市前请检查通知期限、宠物政策和租客筛选要求。</li>
                <li>发送法律通知前，应以 BC 官方 RTB 信息为准。</li>
              </ul>

              <a
                href="https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies"
                target="_blank"
                rel="noopener noreferrer"
                className="lh-rtb-card__btn"
              >
                View RTB Resources →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What We Generate */}
      <section className="lh-section">
        <div className="lh-section-title">
          <h2>What We Generate</h2>
          <p>我们能生成什么</p>
        </div>
        <div className="lh-feature-grid">
          {FEATURES.map(({ icon, title, ch, desc }) => (
            <article key={title} className="lh-feature-card">
              <div className="lh-feature-icon">{icon}</div>
              <h3>{title}</h3>
              <small>{ch}</small>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <section className="lh-cta-band">
        <div className="lh-cta-inner">
          <div>
            <h2>Ready to list your rental?</h2>
            <p>
              Contact Mabel to get your bilingual rental package ready.{" "}
              联系 Mabel，快速准备您的中英文房源广告包。
            </p>
          </div>
          <Link to="/contact" className="lh-btn lh-btn--sand">
            {t(lang, "home.ctaStart")}
          </Link>
        </div>
      </section>
    </>
  );
}
