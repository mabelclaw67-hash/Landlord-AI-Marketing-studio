import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getListings } from "../utils/storage";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";

function formatDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s;
}

export default function Examples({ lang }) {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getListings()
      .then(all => {
        const active = (all || []).filter(l =>
          (l.status || "").trim().toLowerCase() === "published"
        );
        setListings(active);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrapper tenant-page">

      {/* Hero */}
      <section className="tenant-hero">
        <h1 className="tenant-hero__title">Rental Listings</h1>
        <p className="tenant-hero__sub">当前可租房源</p>
        <p className="tenant-hero__desc">
          Browse current rentals and apply online.
          <br />查看可租房源，在线提交申请。
        </p>
      </section>

      <div className="tenant-listings-body">

        {loading && (
          <p className="tenant-loading">Loading listings… / 正在加载房源…</p>
        )}

        {error && (
          <div className="notice notice--error" style={{ margin: "16px 0" }}>
            <p>Failed to load listings: {error}</p>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="tenant-empty">
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏘</div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>No listings available right now.</p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              目前暂无可租房源，请稍后再查看。
            </p>
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          <div className="rental-card-list">
            {listings.map((listing) => {
              const firstFeature = listing.features
                ? listing.features.split(/[,\n·•]+/).map(s => s.trim()).filter(Boolean)[0]
                : null;
              const avail = formatDate(listing.available);

              return (
                <div key={listing.id} className="rental-card">
                  {/* Card header */}
                  <div className="rental-card__header">
                    <div>
                      <h2 className="rental-card__address">{listing.address}</h2>
                      <p className="rental-card__city">📍 {listing.city}, BC</p>
                    </div>
                    <span className="rental-card__badge">Available</span>
                  </div>

                  {/* Key facts row */}
                  <div className="rental-card__facts">
                    {listing.rent && (
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Rent</span>
                        <span className="rental-card__fact-value">${Number(listing.rent).toLocaleString()}<small>/mo</small></span>
                      </div>
                    )}
                    {listing.bedrooms && (
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Beds</span>
                        <span className="rental-card__fact-value">{listing.bedrooms}</span>
                      </div>
                    )}
                    {listing.bathrooms && (
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Baths</span>
                        <span className="rental-card__fact-value">{listing.bathrooms}</span>
                      </div>
                    )}
                    {avail && (
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Available</span>
                        <span className="rental-card__fact-value rental-card__fact-value--date">{avail}</span>
                      </div>
                    )}
                  </div>

                  {/* Short feature highlight */}
                  {firstFeature && (
                    <p className="rental-card__feature">✓ {firstFeature}</p>
                  )}

                  {/* CTA */}
                  <Link
                    to={`/listings/${listing.id}`}
                    className="rental-card__cta"
                  >
                    {lang === "zh" ? "查看详情 / 申请 →" : "View Details / Apply →"}
                  </Link>
                  <ShareButton
                    title={listing.address}
                    text={`Check out this rental listing: ${listing.address}, ${listing.city}, BC`}
                    url={`${window.location.origin}/listings/${listing.id}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer tenant />
    </div>
  );
}
