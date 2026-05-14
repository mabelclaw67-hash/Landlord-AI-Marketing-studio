import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import {
  formatSalePrice,
  getHomeSaleListing,
  getMarketingCopyByListingId,
  getSaleMediaByListingId,
  getVideoScriptsByListingId,
  HOME_SALE_STATUS_OPTIONS,
  updateSaleListing,
} from "../../utils/homeSaleSheet";

const CHANNEL_LABELS = {
  Website: "🌐 Website",
  WeChat: "💬 WeChat / 微信",
  Xiaohongshu: "📕 Xiaohongshu",
  Facebook: "📘 Facebook",
  "Realtor version": "🏡 Realtor.ca",
  "FSBO owner version": "📋 FSBO",
};

const STATUS_BADGE = {
  Draft: "badge--draft",
  "In Review": "badge--review",
  "Ready to Publish": "badge--ready",
  Published: "badge--published",
  "Open House": "badge--review",
  Pending: "badge--draft",
  Active: "badge--ready",
  Sold: "badge--published",
  Archived: "badge--draft",
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handle} className="btn btn--ghost btn--sm">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function HomeSaleListingDetailAdmin() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [marketingRows, setMarketingRows] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [mediaRows, setMediaRows] = useState([]);
  const [videoRows, setVideoRows] = useState([]);
  const [checklist, setChecklist] = useState([false, false, false, false, false, false]);

  useEffect(() => {
    async function load() {
      const [listingData, media, marketing, video] = await Promise.all([
        getHomeSaleListing(listingId),
        getSaleMediaByListingId(listingId),
        getMarketingCopyByListingId(listingId),
        getVideoScriptsByListingId(listingId),
      ]);
      setListing(listingData);
      setMediaRows(media);
      setMarketingRows(marketing);
      setVideoRows(video);

      const hasPhotos = media.length > 0;
      const hasCover = !!(listingData?.primaryPhotoUrl || media.some((m) => m.assetRole === "Cover"));
      const hasCopy = marketing.some((m) => m.bodyCopy || m.headline);
      const hasVideo = video.some((v) => v.voiceoverScript || v.outputMp4Url);
      const s = String(listingData?.status || "").toLowerCase();
      const published = ["published", "open house", "sold"].includes(s);
      setChecklist([
        !!listingData?.address,
        hasPhotos,
        hasCover,
        hasCopy,
        hasVideo,
        published,
      ]);
    }
    load()
      .catch((err) => setError(err.message || "Failed to load sale listing."))
      .finally(() => setLoading(false));
  }, [listingId]);

  const updateStatus = async (newStatus) => {
    if (!listing) return;
    setSaving(true);
    try {
      await updateSaleListing({ ...listing, status: newStatus });
      setListing((prev) => ({ ...prev, status: newStatus }));
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasCover = !!(listing?.primaryPhotoUrl || mediaRows.some((m) => m.assetRole === "Cover"));

  const channels = [...new Set(marketingRows.map((r) => r.channel))].filter(Boolean);
  const currentTab = activeTab || channels[0];
  const currentRows = marketingRows.filter((r) => r.channel === currentTab);

  const mediaChecklistItems = [
    "Listing info filled (address, asking price, MLS, contact)",
    "Photos synced from Google Drive / 照片已同步",
    "Cover photo set / 封面已设定",
    "Marketing copy written (at least one channel) / 文案已撰写",
    "Video script or AI video ready / 视频脚本已备好",
    "Published / Open House / Sold / 已发布或出售",
  ];

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        Loading sale listing…
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>{error || "Sale listing not found."}</p>
        <Link to="/admin/home-sale" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>
          ← Home Sale Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header — mirrors Rental ListingDetail header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.4rem" }}>
            Sale Listing Final Package / 出售房源详情
          </h1>
          <p className="text-muted text-sm">
            {listing.id} — {listing.address}{listing.city ? `, ${listing.city}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {saving && <span className="text-muted text-sm">Saving…</span>}
          <span className={`badge ${STATUS_BADGE[listing.status] || "badge--draft"}`}>
            {listing.status || "Draft"}
          </span>
          <select
            className="select-control"
            value={listing.status || "Draft"}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={saving}
          >
            {HOME_SALE_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <a
            href={listing.publicListingUrl || `/home-sale-studio/listings/${listingId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost btn--sm"
            style={{ whiteSpace: "nowrap" }}
          >
            🔗 Open Public Sale Listing Preview
          </a>
          <Link
            to="/admin/home-sale"
            className="btn btn--ghost btn--sm"
            style={saving ? { pointerEvents: "none", opacity: 0.5 } : {}}
          >
            ← Home Sale
          </Link>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {/* Property Info — mirrors Rental "Property Info" card */}
      <div className="card mb-24">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, flexWrap: "wrap", gap: 8,
        }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            🏡 Sale Property Information / 出售房源资料
          </h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, color: "#3e5b4b",
              border: "1px solid #cddbcf", background: "#edf3ee",
              borderRadius: 999, padding: "3px 10px",
            }}>
              Sale Status: {listing.status || "Draft"}
            </span>
            <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost btn--sm">
              ✏️ Edit Sale Listing Info
            </Link>
          </div>
        </div>

        <div className="info-grid">
          {[
            ["Owner Name", listing.ownerName],
            ["Property Address", listing.address],
            ["City", listing.city],
            ["Province", listing.province],
            ["Asking Price", formatSalePrice(listing.askingPrice)],
            ["Property Type", listing.propertyType],
            ["Bedrooms", listing.bedrooms],
            ["Bathrooms", listing.bathrooms],
            ["Interior SqFt", listing.interiorSqft],
            ["Lot Size", listing.lotSize],
            ["Year Built", listing.yearBuilt],
            ["MLS Number", listing.mlsNumber],
            ["Listing Source", listing.listingSource],
            ["Contact Name", listing.contactName],
            ["Contact Phone", listing.contactPhone],
            ["Contact Email", listing.contactEmail],
          ].map(([label, val]) => (
            <div key={label} className="info-item">
              <label>{label}</label>
              <p>{val || "—"}</p>
            </div>
          ))}
        </div>

        {listing.keyFeatures?.trim() && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
            <label style={{
              fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
            }}>
              Key Features
            </label>
            <p style={{ fontSize: "0.9rem" }}>{listing.keyFeatures}</p>
          </div>
        )}

        {(listing.googleDriveFolderUrl || listing.videoUrl) && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
            <label style={{
              fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
            }}>
              Media Links
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {listing.googleDriveFolderUrl && (
                <a href={listing.googleDriveFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                  📁 Drive Folder
                </a>
              )}
              {listing.videoUrl && (
                <a href={listing.videoUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                  🎬 Video
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Platform Outputs — mirrors Rental "Platform Outputs" card */}
      <div className="card mb-24">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: channels.length === 0 ? 16 : 8, flexWrap: "wrap", gap: 8,
        }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            📤 Platform Outputs / 平台文案
          </h3>
          <Link to={`/admin/home-sale/marketing/${listingId}`} className="btn btn--ghost btn--sm">
            Open Marketing Copy Editor →
          </Link>
        </div>

        {channels.length === 0 ? (
          <div className="notice notice--info">
            <p>
              No marketing copy yet.{" "}
              <Link to={`/admin/home-sale/marketing/${listingId}`}>Open Marketing Copy Editor</Link>
              {" "}to add copy for this listing.
            </p>
          </div>
        ) : (
          <>
            <div className="tabs">
              {channels.map((ch) => (
                <button
                  key={ch}
                  className={`tab-btn${currentTab === ch ? " active" : ""}`}
                  onClick={() => setActiveTab(ch)}
                >
                  {CHANNEL_LABELS[ch] || ch}
                </button>
              ))}
            </div>

            {currentRows.map((row) => {
              const fullText = [row.headline, row.bodyCopy, row.callToAction, row.hashtags]
                .filter(Boolean)
                .join("\n\n");
              return (
                <div key={row.copyId || `${row.channel}-${row.language}`} className="output-card">
                  <div className="output-card__header">
                    <span className="output-card__platform">
                      {row.channel} — {row.language}
                    </span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600,
                        border: "1px solid var(--color-border)", borderRadius: 4, padding: "1px 6px",
                      }}>
                        {row.status || "Draft"}
                      </span>
                      <CopyButton text={fullText} />
                      <Link
                        to={`/admin/home-sale/marketing/${listingId}`}
                        className="btn btn--ghost btn--sm"
                      >
                        ✏️ Edit
                      </Link>
                    </div>
                  </div>
                  <div className="output-card__body">
                    {row.headline && <p><strong>{row.headline}</strong></p>}
                    {row.bodyCopy && (
                      <p style={{ marginTop: row.headline ? 8 : 0 }}>{row.bodyCopy}</p>
                    )}
                    {row.callToAction && (
                      <p style={{ marginTop: 8, color: "var(--color-primary)" }}>{row.callToAction}</p>
                    )}
                    {row.hashtags && (
                      <p style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                        {row.hashtags}
                      </p>
                    )}
                    {!row.headline && !row.bodyCopy && !row.callToAction && (
                      <span className="text-muted text-sm">No copy content yet for this channel.</span>
                    )}
                  </div>
                  <div className="output-card__controls">
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, marginRight: 6 }}>
                        Version:
                      </label>
                      <span style={{ fontSize: "0.8rem" }}>{row.version || "—"}</span>
                    </div>
                  </div>
                  <div className="output-card__compliance">
                    ⚠️ Review all copy before publishing — verify accuracy of price, MLS, and contact info.
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Media Checklist — mirrors Rental "Media Checklist" card */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem", color: "var(--color-primary)" }}>
          🖼️ Media Checklist / 媒体制作清单
        </h3>
        <ul className="media-checklist">
          {mediaChecklistItems.map((item, i) => (
            <li key={i}>
              <input
                type="checkbox"
                checked={!!checklist[i]}
                onChange={() =>
                  setChecklist((prev) => {
                    const next = [...prev];
                    next[i] = !next[i];
                    return next;
                  })
                }
              />
              <span style={{
                textDecoration: checklist[i] ? "line-through" : "none",
                color: checklist[i] ? "var(--color-text-muted)" : "var(--color-text)",
              }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Review Status Summary — mirrors Rental "Review Status" card */}
      <div className="card mb-24" style={{ background: "#f8fafc" }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: "0.95rem", color: "var(--color-primary)" }}>
          📋 Workflow Summary / 制作状态总览
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {[
            {
              label: "Photo Assets",
              value: mediaRows.length > 0 ? `${mediaRows.length} asset(s)` : "No photos yet",
              ok: mediaRows.length > 0,
            },
            {
              label: "Cover Photo",
              value: hasCover ? "✅ Set" : "⏳ Not set",
              ok: hasCover,
            },
            {
              label: "Marketing Copy",
              value: marketingRows.length > 0 ? `${marketingRows.length} row(s)` : "No copy yet",
              ok: marketingRows.length > 0,
            },
            {
              label: "Video Scripts",
              value: videoRows.length > 0 ? `${videoRows.length} script(s)` : "No scripts yet",
              ok: videoRows.length > 0,
            },
            {
              label: "Sale Status",
              value: listing.status || "Draft",
              ok: ["Published", "Open House", "Active", "Sold"].includes(listing.status),
            },
          ].map(({ label, value, ok }) => (
            <div
              key={label}
              style={{
                background: "#fff", border: "1px solid var(--color-border)",
                borderRadius: 7, padding: "10px 14px",
              }}
            >
              <p style={{
                fontSize: "0.72rem", color: "var(--color-text-muted)",
                fontWeight: 600, textTransform: "uppercase", marginBottom: 4,
              }}>
                {label}
              </p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: ok ? "var(--color-text)" : "var(--color-text-muted)" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Section Cards — mirrors Rental section flow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          {
            icon: "📸",
            title: "Photo Assets / 房源照片",
            desc: "Sync Drive folder, set cover image, manage sort order and captions.",
            to: `/admin/home-sale/media/${listingId}`,
            label: "Open Photo Workflow",
            count: mediaRows.length > 0 ? `${mediaRows.length} asset(s)` : null,
          },
          {
            icon: "📝",
            title: "Marketing Copy / 营销文案",
            desc: "Write copy for Website, WeChat, Xiaohongshu, Facebook, Realtor, FSBO.",
            to: `/admin/home-sale/marketing/${listingId}`,
            label: "Open Copy Editor",
            count: marketingRows.length > 0 ? `${marketingRows.length} row(s)` : null,
          },
          {
            icon: "🎬",
            title: "Video Script / 视频脚本",
            desc: "Manage voiceover script, subtitles, music style, and video output.",
            to: `/admin/home-sale/video/${listingId}`,
            label: "Open Video Workflow",
            count: videoRows.length > 0 ? `${videoRows.length} script(s)` : null,
          },
          {
            icon: "📤",
            title: "Share Kit / 分享素材",
            desc: "Copy sharing messages, QR code, and public listing link.",
            to: `/admin/home-sale/share/${listingId}`,
            label: "Open Share Kit",
            count: null,
          },
          {
            icon: "🏠",
            title: "Open House / 开放日",
            desc: "Manage open house schedule and buyer inquiry details.",
            to: `/admin/home-sale/open-house/${listingId}`,
            label: "Open Open House",
            count: null,
          },
        ].map(({ icon, title, desc, to, label, count }) => (
          <div
            key={to}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>{icon} {title}</h3>
              {count && (
                <span style={{
                  fontSize: "0.7rem", fontWeight: 600, color: "var(--color-primary)",
                  background: "#EFF3F8", borderRadius: 999, padding: "2px 8px",
                }}>
                  {count}
                </span>
              )}
            </div>
            <p className="text-muted text-sm" style={{ flex: 1 }}>{desc}</p>
            <Link to={to} className="btn btn--ghost btn--sm">{label} →</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
