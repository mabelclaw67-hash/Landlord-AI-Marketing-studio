import { t } from "../translations";
import Footer from "../components/Footer";

const RESOURCES = ["r1", "r2", "r3", "r4"];
const ICONS = ["⚖️", "💰", "📸", "✅"];

export default function Resources({ lang }) {
  return (
    <div className="page-wrapper">
      <section className="hero" style={{ padding: "80px 20px 60px" }}>
        <h1 className="hero__title">{t(lang, "resources.title")}</h1>
        <p className="hero__subtitle">{t(lang, "resources.chTitle")}</p>
        <p className="hero__sub2">{t(lang, "resources.subtitle")}</p>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-2">
            {RESOURCES.map((key, i) => (
              <div key={key} className="card resource-card">
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 44, height: 44, flexShrink: 0,
                      background: "#EFF3F8", borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.3rem"
                    }}
                  >
                    {ICONS[i]}
                  </div>
                  <div>
                    <h3>{t(lang, `resources.${key}Title`)}</h3>
                    <div className="ch-label">{t(lang, `resources.${key}Ch`)}</div>
                    <p>{t(lang, `resources.${key}Body`)}</p>
                    <p>{t(lang, `resources.${key}BodyCh`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="notice notice--info" style={{ marginTop: 40, maxWidth: 680, marginLeft: "auto", marginRight: "auto" }}>
            <h4>📌 Disclaimer / 免责声明</h4>
            <p>
              This information is for general reference only and does not constitute legal advice. Always consult the
              BC Residential Tenancy Branch or a qualified professional for specific guidance.
            </p>
            <p style={{ marginTop: 4, opacity: 0.85 }}>
              以上内容仅供一般参考，不构成法律建议。如有具体问题，请咨询 BC 省住宅租赁局或专业律师。
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
