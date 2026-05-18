import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPublicListings } from "../utils/storage";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";
import ShareKit from "../components/ShareKit";
import { getListingStatusMeta } from "../utils/listingPublicMeta";

const TENANT_SHARE_MESSAGES = [
  {
    id: "general-rental-sharing",
    label: "房源分享文案 / General Rental Sharing",
    rows: 7,
    text:
      "这里是当前可租房源页面，您可以查看可租房、浏览详情，并在合适时直接在线申请。\n\n如需转发给家人朋友或潜在租客，可直接发送这个房源页面。\n\nEnglish:\nHere is the current rental listings page. You can browse available homes, view details, and apply online if a listing is a good fit.",
  },
  {
    id: "wechat-tenant-sharing",
    label: "微信租客分享 / WeChat Tenant Sharing",
    rows: 8,
    text:
      "你好，这里是当前可租房源页面。每个房源都可以打开查看详情、照片和在线申请链接，如果有兴趣可以直接手机在线申请。\n\n适合微信转发给正在找房的朋友或家人。\n\nEnglish:\nHere is the current rental listings page for available homes. You can open each listing to see details, photos, and the application link. If you are interested, please apply online here.",
  },
  {
    id: "facebook-rental-group",
    label: "Facebook 租房群分享 / Facebook Rental Group Sharing",
    rows: 7,
    text:
      "当前可租房源都在这个页面里，潜在租客可以直接查看房屋资料、照片和在线申请入口。\n\n适合分享到 Facebook 租房群、社区群或本地租房讨论区。\n\nEnglish:\nCurrent rental listings are available at the link below. Prospective tenants can review property details and apply online directly from each listing page.",
  },
  {
    id: "direct-message-tenant",
    label: "私信租客文案 / Direct Message to Prospective Tenant",
    rows: 7,
    text:
      "您好，这里是当前可租房源页面。请先查看房源详情、照片和申请要求，如果您有兴趣，可以直接在线提交申请。\n\nEnglish:\nHere is the rental listings page with current available homes. Please review the listing details carefully and submit the online application if you would like to be considered.",
  },
];

// Resolve the best available cover thumbnail URL for a listing.
// Priority: coverImageFileId (admin-selected) → first driveFiles entry → null.
// Always uses drive.google.com/thumbnail which works for publicly-shared files
// without requiring the viewer to be signed into Google.
function resolveCoverThumbUrl(listing) {
  if (listing.coverImageFileId) {
    return `https://drive.google.com/thumbnail?id=${listing.coverImageFileId}&sz=w640-h480`;
  }
  const files = Array.isArray(listing.driveFiles) ? listing.driveFiles : [];
  const first = files.find((f) => f.thumbUrl || f.fileId);
  if (first) {
    return first.thumbUrl || `https://drive.google.com/thumbnail?id=${first.fileId}&sz=w640-h480`;
  }
  return null;
}

// Show the cover image for a rental listing card.
// Always renders the photo area — shows a placeholder when no URL or image fails to load.
function ListingCardCover({ thumbUrl }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", background: "#eef2f0", aspectRatio: "16/10" }}>
      {thumbUrl && !failed ? (
        <img
          src={thumbUrl}
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
            {thumbUrl ? "Photo unavailable / 照片暂不可用" : "No photo / 暂无照片"}
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
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getPublicListings()
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
        <h1 className="tenant-hero__title">Public Rental Listings / 公开出租房源</h1>
        <p className="tenant-hero__sub">Rental Studio / 租赁工作台</p>
        <p className="tenant-hero__desc">
          Browse current rentals and apply online.
          <br />查看当前可租房源，并在线提交申请。
        </p>
        <div className="tenant-share-kit-wrap">
          <ShareKit
            buttonLabel="房源分享素材 / Share Kit"
            title="房源分享素材 / Tenant Rental Listings Share Kit"
            subtitle="供租客、申请人和公开房源转发使用。 / For tenants, applicants, and public rental listing sharing only."
            messages={TENANT_SHARE_MESSAGES}
            linkLabel="复制当前页面链接 / Copy Current Page Link"
          />
        </div>
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
              const statusMeta = getListingStatusMeta(listing);

              return (
                <div key={listing.id} className="rental-card">
                  {/* Cover photo — resolved from coverImageFileId or first driveFiles entry */}
                  <ListingCardCover thumbUrl={resolveCoverThumbUrl(listing)} />
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
                        <span className="rental-card__fact-label">Rent / 租金</span>
                        <span className="rental-card__fact-value">${Number(listing.rent).toLocaleString()}<small>/mo</small></span>
                      </div>
                    )}
                    {listing.bedrooms && (
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Beds / 卧室</span>
                        <span className="rental-card__fact-value">{listing.bedrooms}</span>
                      </div>
                    )}
                    {listing.bathrooms && (
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Baths / 卫浴</span>
                        <span className="rental-card__fact-value">{listing.bathrooms}</span>
                      </div>
                    )}
                    {avail && (
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">Available / 可入住</span>
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
                      Applications closed / 暂停申请
                    </p>
                  )}

                  {/* CTA */}
                  <Link
                    to={`/listings/${listing.id}`}
                    className="rental-card__cta"
                  >
                    {statusMeta.applicationsClosed
                      ? "View Details / Status / 查看详情 / 状态 →"
                      : "View Details / Apply / 查看详情 / 申请 →"}
                  </Link>
                  <ShareButton
                    title={listing.address}
                    text={`查看这个出租房源：${listing.address}, ${listing.city}, BC / Check out this rental listing: ${listing.address}, ${listing.city}, BC`}
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
