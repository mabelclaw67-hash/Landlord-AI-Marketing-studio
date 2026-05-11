import { Link } from "react-router-dom";
import { t } from "../translations";
import Footer from "../components/Footer";

const SERVICES = [
  { icon: "📝", key: "s1" },
  { icon: "🖼️", key: "s2" },
  { icon: "🎬", key: "s3" },
];

export default function Home({ lang }) {
  return (
    <div className="page-wrapper">
      {/* Hero */}
      <section className="hero">
        <div className="hero__badge">🇨🇦 BC Private Beta · 内部测试版</div>
        <h1 className="hero__title">{t(lang, "home.heroTitle")}</h1>
        <p className="hero__subtitle">{t(lang, "home.heroSubtitle")}</p>
        <p className="hero__sub2">{t(lang, "home.heroChTitle")} — {t(lang, "home.heroChSubtitle")}</p>
        <div className="hero__actions">
          <Link to="/contact" className="btn btn--accent">{t(lang, "home.ctaStart")}</Link>
          <Link to="/services" className="btn btn--outline">{t(lang, "home.ctaLearn")}</Link>
        </div>
        <div style={{ marginTop: 20 }}>
          <Link to="/listings/LST-2026-002" className="btn btn--primary">
            View Current Rental Listing
          </Link>
          <div style={{ marginTop: 6, fontSize: "0.8rem", opacity: 0.7 }}>查看当前招租房源</div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>{t(lang, "home.servicesTitle")}</h2>
            <p className="ch">{t(lang, "home.servicesCh")}</p>
          </div>
          <div className="grid-3">
            {SERVICES.map(({ icon, key }) => (
              <div key={key} className="card card--hover service-card">
                <div className="service-card__icon">{icon}</div>
                <h3>{t(lang, `home.${key}Title`)}</h3>
                <div className="ch-label">{t(lang, `home.${key}Ch`)}</div>
                <p>{t(lang, `home.${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Private Beta Notice */}
      <section className="section section--alt">
        <div className="container">
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div className="notice notice--info">
              <h4>🔒 {t(lang, "home.betaTitle")}</h4>
              <p>{t(lang, "home.betaNotice")}</p>
              <p style={{ marginTop: 4, opacity: 0.8 }}>{t(lang, "home.betaCh")}</p>
            </div>

            <div className="notice notice--warning" style={{ marginTop: 16 }}>
              <h4>📋 {t(lang, "home.complianceTitle")}</h4>
              <p>{t(lang, "home.complianceEn")}</p>
              <p style={{ marginTop: 4, opacity: 0.85 }}>{t(lang, "home.complianceCh")}</p>
            </div>

            <div className="text-center mt-24">
              <Link to="/contact" className="btn btn--primary">{t(lang, "home.ctaStart")}</Link>
              &nbsp;&nbsp;
              <Link to="/examples" className="btn btn--ghost">{t(lang, "examples.title")}</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
