import { useState } from "react";
import { t } from "../translations";
import { sampleListings } from "../data/sampleListings";
import Footer from "../components/Footer";

export default function Examples({ lang }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="page-wrapper">
      <section className="hero" style={{ padding: "80px 20px 60px" }}>
        <h1 className="hero__title">{t(lang, "examples.title")}</h1>
        <p className="hero__subtitle">{t(lang, "examples.chTitle")}</p>
        <p className="hero__sub2">{t(lang, "examples.subtitle")}</p>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-3">
            {sampleListings.map((listing) => (
              <div key={listing.id} className="card card--hover example-card">
                <div className="example-card__header">
                  <div>
                    <h3>
                      {lang === "zh" ? listing.titleCh : listing.titleEn}
                    </h3>
                    <div className="ch-label">
                      {lang === "zh" ? listing.titleEn : listing.titleCh}
                    </div>
                  </div>
                  <span className="badge badge--sample">{t(lang, "examples.sample")}</span>
                </div>

                <div className="example-card__meta">
                  <span>🛏 {listing.bedrooms} bed</span>
                  <span>🛁 {listing.bathrooms} bath</span>
                  <span>💰 ${listing.rent.toLocaleString()}/mo</span>
                  <span>📍 {listing.city}</span>
                </div>

                <div style={{ marginTop: 10, marginBottom: 10 }}>
                  {(lang === "zh" ? listing.featuresCh : listing.features).map((f) => (
                    <span
                      key={f}
                      style={{
                        display: "inline-block", background: "#EFF3F8",
                        borderRadius: 5, padding: "2px 8px", fontSize: "0.78rem",
                        marginRight: 4, marginBottom: 4, color: "var(--color-primary)"
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <button
                  className="btn btn--ghost btn--sm btn--full"
                  style={{ marginTop: 4 }}
                  onClick={() => toggle(listing.id)}
                >
                  {expanded[listing.id]
                    ? (lang === "zh" ? "收起预览 ▲" : "Hide Preview ▲")
                    : (lang === "zh" ? "查看广告预览 ▼" : "View Ad Preview ▼")}
                </button>

                {expanded[listing.id] && (
                  <div className="example-card__preview">
                    {lang === "zh" ? listing.adPreviewCh : listing.adPreview}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="notice notice--warning" style={{ marginTop: 40, maxWidth: 680, marginLeft: "auto", marginRight: "auto" }}>
            <h4>⚠️ Sample Content Notice</h4>
            <p>These are sample outputs for demonstration only. All AI-generated content must be reviewed for accuracy, compliance, and fair housing requirements before publishing.</p>
            <p style={{ marginTop: 4, opacity: 0.85 }}>以上为示例内容，仅供展示。所有 AI 生成内容发布前必须经过人工审核，确保准确性和合规性。</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
