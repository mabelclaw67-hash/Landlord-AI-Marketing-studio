import { Link } from "react-router-dom";
import { t } from "../translations";
import Footer from "../components/Footer";

const SERVICE_CARDS = [
  {
    icon: "📝",
    title: "Rental Ad Package",
    ch: "中英文广告文案包",
    desc: "Bilingual Facebook, Craigslist & WeChat copy — ready to post.",
  },
  {
    icon: "🖼️",
    title: "Photo Listing Page",
    ch: "在线图片房源页面",
    desc: "A shareable listing page with photos and application link.",
  },
  {
    icon: "📋",
    title: "Online Application",
    ch: "在线申请表链接",
    desc: "Google Form application embedded directly in the listing page.",
  },
];

export default function Home({ lang }) {
  return (
    <div className="page-wrapper">
      {/* Hero */}
      <section className="hero">
        <div className="hero__badge">🇨🇦 Vancouver Island · BC</div>
        <h1 className="hero__title">{t(lang, "home.heroTitle")}</h1>
        <p className="hero__subtitle">{t(lang, "home.heroSubtitle")}</p>
        <p className="hero__sub2">{t(lang, "home.heroChTitle")} — {t(lang, "home.heroChSubtitle")}</p>
        <div className="hero__actions">
          <Link to="/contact" className="btn btn--accent">{t(lang, "home.ctaStart")}</Link>
          <Link to="/listings/LST-2026-002" className="btn btn--outline">View Current Listing</Link>
        </div>
      </section>

      {/* Service cards */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>{t(lang, "home.servicesTitle")}</h2>
            <p className="ch">{t(lang, "home.servicesCh")}</p>
          </div>
          <div className="grid-3">
            {SERVICE_CARDS.map(({ icon, title, ch, desc }) => (
              <div key={title} className="card card--hover service-card">
                <div className="service-card__icon">{icon}</div>
                <h3>{title}</h3>
                <div className="ch-label">{ch}</div>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--alt">
        <div className="container">
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>Ready to list your rental?</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: 4 }}>
              Contact Mabel to get your bilingual rental package ready.
            </p>
            <p className="ch" style={{ fontSize: "0.88rem", marginBottom: 28 }}>
              联系 Mabel，快速准备您的中英文房源广告包。
            </p>
            <Link to="/contact" className="btn btn--primary">{t(lang, "home.ctaStart")}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
