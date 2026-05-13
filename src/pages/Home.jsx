import { Link } from "react-router-dom";
import { t } from "../translations";
import ShareKit from "../components/ShareKit";

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

const LANDLORD_SHARE_MESSAGES = [
  {
    id: "wechat-landlord",
    label: "WeChat landlord/client promotion",
    rows: 5,
    text:
      "Hi, if you need help marketing a rental property, this AI Rental Listing Marketing Studio can prepare a bilingual rental ad package, a photo listing page, and an online application link. It is designed for busy landlords and property owners on Vancouver Island. You can take a look here:",
  },
  {
    id: "facebook-landlord",
    label: "Facebook landlord group promotion",
    rows: 5,
    text:
      "For landlords and property owners who want faster rental marketing support: this AI Rental Listing Marketing Studio helps create bilingual listing copy, a shareable photo page, and an online application path in one simple workflow. Good fit for Vancouver Island rentals:",
  },
  {
    id: "owner-invite",
    label: "Owner invitation message",
    rows: 5,
    text:
      "Hello, I wanted to share a rental marketing service that can help you prepare a cleaner and faster listing package for your property. It includes bilingual ad copy, a public photo listing page, and an application link for prospective tenants. You can review the service here:",
  },
  {
    id: "general-website",
    label: "General website sharing message",
    rows: 4,
    text:
      "This website helps landlords and property owners prepare rental listing promotion materials, public photo pages, and tenant application links in a simple, mobile-friendly format:",
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
            <div className="lh-share-kit-wrap">
              <ShareKit
                buttonLabel="Admin Share Kit / 推广素材"
                title="Landlord Promotion Share Kit"
                subtitle="For landlords, property owners, and client referrals only."
                messages={LANDLORD_SHARE_MESSAGES}
                linkLabel="Copy Website Link"
              />
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
