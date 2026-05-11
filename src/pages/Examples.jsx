import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { t } from "../translations";
import { getListings } from "../utils/storage";
import Footer from "../components/Footer";

export default function Examples({ lang }) {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getListings()
      .then(all => {
        const active = (all || []).filter(l => l.status === "Published");
        setListings(active);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrapper">
      <section className="hero" style={{ padding: "80px 20px 60px" }}>
        <h1 className="hero__title">Active Rental Listings</h1>
        <p className="hero__subtitle">当前可租房源</p>
        <p className="hero__sub2">
          Listings created in Admin Studio will appear here when active.
          <br />在 Admin Studio 创建并启用的房源会显示在这里。
        </p>
      </section>

      <section className="section">
        <div className="container">

          {loading && (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "40px 0" }}>
              Loading listings… / 正在加载房源…
            </p>
          )}

          {error && (
            <div className="notice notice--error" style={{ maxWidth: 600, margin: "0 auto" }}>
              <p>Failed to load listings: {error}</p>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-muted)" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: 8 }}>No active rental listings available right now.</p>
              <p style={{ fontSize: "0.95rem" }}>目前暂无可租房源。</p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="grid-3">
              {listings.map((listing) => {
                const featureList = listing.features
                  ? listing.features.split(/[,\n·•]+/).map(s => s.trim()).filter(Boolean)
                  : [];

                return (
                  <div key={listing.id} className="card card--hover example-card">
                    <div className="example-card__header">
                      <div>
                        <h3>{listing.address || listing.id}</h3>
                        <div className="ch-label">{listing.city}</div>
                      </div>
                      <span className="badge badge--published">Active</span>
                    </div>

                    <div className="example-card__meta">
                      {listing.bedrooms  && <span>🛏 {listing.bedrooms} bed</span>}
                      {listing.bathrooms && <span>🛁 {listing.bathrooms} bath</span>}
                      {listing.rent      && <span>💰 ${Number(listing.rent).toLocaleString()}/mo</span>}
                      {listing.city      && <span>📍 {listing.city}</span>}
                    </div>

                    {listing.available && (
                      <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", margin: "6px 0 4px" }}>
                        Available: {listing.available}
                      </p>
                    )}

                    {featureList.length > 0 && (
                      <div style={{ marginTop: 8, marginBottom: 10 }}>
                        {featureList.slice(0, 5).map((f) => (
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
                    )}

                    <Link
                      to={`/listings/${listing.id}`}
                      className="btn btn--ghost btn--sm btn--full"
                      style={{ marginTop: 4 }}
                    >
                      {lang === "zh" ? "查看房源详情 →" : "View Listing →"}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
}
