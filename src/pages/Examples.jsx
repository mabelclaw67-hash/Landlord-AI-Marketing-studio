import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getListingFolderFiles, getListingSubfolderFiles, getPublicListings } from "../utils/storage";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";
import ShareKit from "../components/ShareKit";
import {
  extractDriveFolderId,
  getListingStatusMeta,
  resolveRentalListingCover,
  resolveRentalListingImageSrc,
} from "../utils/listingPublicMeta";

const TENANT_SHARE_MESSAGES = [
  {
    id: "general-rental-sharing",
    label: "General Rental Sharing",
    rows: 5,
    text:
      "Here is the current rental listings page. You can browse available homes, view details, and apply online if a listing is a good fit.",
  },
  {
    id: "wechat-tenant-sharing",
    label: "WeChat Sharing",
    rows: 5,
    text:
      "Here is the current rental listings page for available homes. You can open each listing to see details, photos, and the application link. If you are interested, please apply online here.",
  },
  {
    id: "facebook-rental-group",
    label: "Facebook Rental Group",
    rows: 5,
    text:
      "Current rental listings are available at the link below. Prospective tenants can review property details and apply online directly from each listing page.",
  },
  {
    id: "direct-message-tenant",
    label: "Direct Message to Prospective Tenant",
    rows: 5,
    text:
      "Here is the rental listings page with current available homes. Please review the listing details carefully and submit the online application if you would like to be considered.",
  },
];

// Show the cover image for a rental listing card.
// Always renders the photo area — shows a placeholder when no URL or image fails to load.
function ListingCardCover({ coverPhoto }) {
  const src = resolveRentalListingImageSrc(coverPhoto);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", background: "#eef2f0", aspectRatio: "16/10" }}>
      {src && !failed ? (
        <img
          src={src}
          alt="Listing cover"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", minHeight: 140,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: "2.5rem", opacity: 0.45 }}>🏠</span>
          <span style={{ fontSize: "0.78rem", color: "#8a9e90", fontWeight: 500 }}>
            Photo unavailable
          </span>
        </div>
      )}
    </div>
  );
}

function formatDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s;
}

export default function Examples() {
  const [listings, setListings] = useState([]);
  const [coverPhotos, setCoverPhotos] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const all = await getPublicListings();
        const active = (all || []).filter((listing) =>
          (listing.status || "").trim().toLowerCase() === "published"
        );
        if (cancelled) return;
        setListings(active);
        setCoverPhotos(Object.fromEntries(
          active.map((listing) => [
            listing.id,
            resolveRentalListingCover([], [], listing.coverImageFileId),
          ])
        ));
        setLoading(false);

        Promise.all(
          active.map(async (listing) => {
            try {
              const folderId = extractDriveFolderId(listing.driveFolderLink);
              const [rootFiles, subfolder] = await Promise.all([
                getListingFolderFiles(folderId || "", listing.id).catch(() => []),
                getListingSubfolderFiles(folderId || "", "03_Cover_Images", listing.id).catch(() => ({ files: [] })),
              ]);
              const coverPhoto = resolveRentalListingCover(
                rootFiles || [],
                subfolder?.files || [],
                listing.coverImageFileId
              );
              return [listing.id, coverPhoto];
            } catch {
              return [listing.id, resolveRentalListingCover([], [], listing.coverImageFileId)];
            }
          })
        ).then((coverEntries) => {
          if (cancelled) return;
          setCoverPhotos(Object.fromEntries(coverEntries));
        });
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-wrapper tenant-page">

      {/* Hero */}
      <section className="tenant-hero">
        <h1 className="tenant-hero__title">Public Rental Listings</h1>
        <p className="tenant-hero__sub">Rental Studio</p>
        <p className="tenant-hero__desc">
          Browse current rentals and apply online.
        </p>
        <div className="tenant-share-kit-wrap">
          <ShareKit
            buttonLabel="Share Kit"
            title="Tenant Rental Listings Share Kit"
            subtitle="For tenants, applicants, and public rental listing sharing only."
            messages={TENANT_SHARE_MESSAGES}
            linkLabel="Copy Current Page Link"
          />
        </div>
      </section>

      <div className="tenant-listings-body">

        {loading && (
          <p className="tenant-loading">Loading listings…</p>
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
              Please check back later.
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
              const statusMeta = getListingStatusMeta(listing);
              const coverPhoto = coverPhotos[listing.id] || null;

              return (
                <div key={listing.id} className="rental-card">
                  {/* Cover photo — resolved with the same cover-selection logic as the detail page */}
                  <ListingCardCover coverPhoto={coverPhoto} />
                  {/* Card header */}
                  <div className="rental-card__header">
                    <div>
                      <h2 className="rental-card__address">{listing.address}</h2>
                      <p className="rental-card__city">📍 {listing.city}, BC</p>
                    </div>
                    <span
                      className="rental-card__badge"
                      style={{
                        background: statusMeta.background,
                        color: statusMeta.color,
                        border: `1px solid ${statusMeta.border}`,
                      }}
                    >
                      {statusMeta.label}
                    </span>
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

                  {statusMeta.applicationsClosed && (
                    <p style={{ fontSize: "0.82rem", color: statusMeta.color, fontWeight: 700, marginBottom: 10 }}>
                      Applications closed
                    </p>
                  )}

                  {/* CTA */}
                  <Link
                    to={`/listings/${listing.id}`}
                    className="rental-card__cta"
                  >
                    {statusMeta.applicationsClosed
                      ? "View Details / Status →"
                      : "View Details / Apply →"}
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
