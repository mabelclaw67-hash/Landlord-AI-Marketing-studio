import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicListings } from "../utils/storage";
import { COMPANY_FOOTER } from "../components/Footer";
import { getListingStatusMeta, isRentalListingAcceptingApplications } from "../utils/listingPublicMeta";
import { sortRentalListings } from "../utils/listingSort";
import RentalApplicationNotice from "../components/RentalApplicationNotice";

function formatDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  return text;
}

export default function RentalApplicationLanding() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getPublicListings()
      .then((rows) => {
        if (cancelled) return;
        const availableListings = (rows || [])
          .filter(isRentalListingAcceptingApplications);
        setListings(sortRentalListings(availableListings));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load rental listings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-wrapper tenant-page">
      <section className="tenant-hero">
        <h1 className="tenant-hero__title">Rental Application</h1>
        <p className="tenant-hero__sub">Choose an available rental before applying</p>
        <p className="tenant-hero__desc">
          Please select one currently available listing. The application stays inside our website flow.
        </p>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <RentalApplicationNotice style={{ marginBottom: 20 }} />
          {loading && (
            <p className="tenant-loading">Loading available rental listings...</p>
          )}

          {!loading && error && (
            <div className="notice notice--error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="tenant-empty">
              <p style={{ fontWeight: 700, marginBottom: 8 }}>
                There are currently no available rental listings.
              </p>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.7 }}>
                Please check back later or contact{" "}
                <a href={`mailto:${COMPANY_FOOTER.email}`}>{COMPANY_FOOTER.email}</a>.
              </p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="rental-application-list">
              {listings.map((listing) => {
                const statusMeta = getListingStatusMeta(listing);
                const availableDate = formatDate(listing.available || listing.availableDate);

                return (
                  <article key={listing.id} className="rental-application-option">
                    <div>
                      <h2>{listing.address || "Available Rental"}</h2>
                      <p>
                        {[listing.city && `${listing.city}, BC`, listing.bedrooms && `${listing.bedrooms} bed`, listing.bathrooms && `${listing.bathrooms} bath`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="rental-application-option__meta">
                        {listing.rent && <span>${Number(listing.rent).toLocaleString()}/mo</span>}
                        {availableDate && <span>Available {availableDate}</span>}
                        <span
                          style={{
                            background: statusMeta.background,
                            color: statusMeta.color,
                            border: `1px solid ${statusMeta.border}`,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>
                    <Link to={`/apply/${listing.id}`} className="btn btn--primary">
                      Apply for this rental
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
