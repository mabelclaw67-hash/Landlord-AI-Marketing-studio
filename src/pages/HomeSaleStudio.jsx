import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";
import { readTrialAccess } from "../utils/trialAccess";
import {
  buildHomeSalePublicUrl,
  getPublicSaleListings,
  resolveHomeSaleImageUrl,
} from "../utils/homeSaleSheet";

function formatPrice(value) {
  const digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return "To be added";
  const amount = Number(digits);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toLocaleString()}`;
}

export default function HomeSaleStudio() {
  const trialSession = readTrialAccess();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    getPublicSaleListings()
      .then((rows) => setListings(rows))
      .catch((err) => setError(err.message || "Unable to load sale listings right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pub-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">Home Sale Studio</h1>
        <p className="pub-hero__sub">Public Sale Listings</p>
        <p className="pub-hero__desc">
          Bilingual home sale marketing tools for sellers, FSBO owners, and realtors.
        </p>
      </section>

      <section className="section">
        <div className="container">
          {!trialSession && (
            <div className="card home-sale-admin-entry" style={{ marginBottom: 24 }}>
              <div>
                <div className="home-sale-admin-entry__eyebrow">Home Sale Admin Studio</div>
                <h2>Manage the Home Sale Studio</h2>
                <p>
                  Access Home Sale Admin to manage the sale listings database, public listing pages, and listing details.
                </p>
              </div>
              <Link to="/admin/home-sale" className="btn btn--sage">
                Home Sale Admin
              </Link>
            </div>
          )}

          <div className="notice notice--sage" style={{ marginBottom: 24 }}>
            <h4>Home Sale Marketing Studio</h4>
            <p style={{ marginTop: 6, opacity: 0.86 }}>
              Prepare bilingual home sale marketing packages, listing pages, QR codes, buyer inquiry links, and AI video promotion materials.
            </p>
          </div>

          {loading && (
            <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              Loading sale listings…
            </div>
          )}

          {!loading && error && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>Unable to Load Listings</h4>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>No Sale Listings Yet</h4>
              <p>The sheet is connected, but there are no sale listings to display yet.</p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="rental-card-list">
              {listings.map((listing) => {
                const imageKey = listing.id || listing.address;
                const imageSrc = resolveHomeSaleImageUrl(listing);

                return (
                  <article key={imageKey} className="rental-card">
                    {imageSrc && !brokenImages[imageKey] ? (
                    <div style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden", background: "#eef2f0" }}>
                      <img
                        src={imageSrc}
                        alt={listing.address || "Sale listing"}
                        onError={() =>
                          setBrokenImages((prev) => ({
                            ...prev,
                            [imageKey]: true,
                          }))
                        }
                        style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }}
                      />
                    </div>
                    ) : (
                      <div
                        style={{
                          marginBottom: 16,
                          borderRadius: 12,
                          background: "#eef2f0",
                          aspectRatio: "16 / 10",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-text-muted)",
                          fontSize: "0.88rem",
                          textAlign: "center",
                          padding: 16,
                        }}
                      >
                        No photo available
                      </div>
                    )}

                    <div className="rental-card__header">
                      <div>
                        <h2 className="rental-card__address">
                          {listing.address || "Property address pending"}
                        </h2>
                        <p className="rental-card__city">
                          📍 {listing.city || ""}{listing.province ? `, ${listing.province}` : ""}
                        </p>
                      </div>
                      <span className="rental-card__badge" style={{ background: "#f7efe4", color: "#8a5a22", border: "1px solid #e7cda7" }}>
                        {listing.status || "Draft"}
                      </span>
                    </div>

                    <div className="rental-card__facts">
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Asking Price</span>
                        <span className="rental-card__fact-value">{formatPrice(listing.askingPrice)}</span>
                      </div>
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Beds / Baths</span>
                        <span className="rental-card__fact-value">
                          {listing.bedrooms || "—"} / {listing.bathrooms || "—"}
                        </span>
                      </div>
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Property Type</span>
                        <span className="rental-card__fact-value">{listing.propertyType || "Pending"}</span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                          Description CN
                        </div>
                        <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--color-text)" }}>
                          {listing.descriptionCn || "Please add Description CN in the sheet."}
                        </p>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                          Description EN
                        </div>
                        <p style={{ fontSize: "0.88rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
                          {listing.descriptionEn || "Please add Description EN in the sheet."}
                        </p>
                      </div>
                    </div>

                    <Link to={`/home-sale-studio/listings/${listing.id || ""}`} className="rental-card__cta">
                      View Listing →
                    </Link>
                    <ShareButton
                      title={listing.address || "Home Sale Listing"}
                      text={`Home sale listing: ${listing.address || listing.id}`}
                      url={listing.publicListingUrl || buildHomeSalePublicUrl(listing.id)}
                    />
                  </article>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <Link to="/" className="btn btn--ghost">
              Back to Homepage
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
