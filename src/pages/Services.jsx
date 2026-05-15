import { t } from "../translations";
import Footer from "../components/Footer";

const SERVICES = [
  { icon: "📝", key: "s1" },
  { icon: "💬", key: "s2" },
  { icon: "🖼️", key: "s3" },
  { icon: "🎬", key: "s4" },
];

export default function Services({ lang }) {
  return (
    <div className="pub-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{t(lang, "services.title")}</h1>
        <p className="pub-hero__sub">{t(lang, "services.chTitle")}</p>
        <p className="pub-hero__desc">{t(lang, "services.subtitle")}</p>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-2">
            {SERVICES.map(({ icon, key }) => (
              <div key={key} className="card card--hover">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, flexShrink: 0,
                    background: "#edf3ee", borderRadius: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.4rem",
                  }}>
                    {icon}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, color: "#3e5b4b", marginBottom: 2 }}>
                      {t(lang, `services.${key}`)}
                    </h3>
                    <div className="ch-label" style={{ fontSize: "0.82rem", color: "#62796b", marginBottom: 8 }}>
                      {t(lang, `services.${key}Ch`)}
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", lineHeight: 1.65 }}>
                      {t(lang, `services.${key}Desc`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="notice notice--sage" style={{ marginTop: 40, maxWidth: 680, marginLeft: "auto", marginRight: "auto" }}>
            <h4>More Features / 更多功能</h4>
            <p>{t(lang, "services.futureNote")}</p>
            <p style={{ marginTop: 4, opacity: 0.85 }}>{t(lang, "services.futureNoteCh")}</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
