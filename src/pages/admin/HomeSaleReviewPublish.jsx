import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import {
  HOME_SALE_STATUS_OPTIONS,
  formatSalePrice,
  getHomeSaleListing,
  getMarketingCopyByListingId,
  getSaleMediaByListingId,
  getVideoScriptsByListingId,
  updateSaleListing,
} from "../../utils/homeSaleSheet";

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

export default function HomeSaleReviewPublish() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [mediaRows, setMediaRows] = useState([]);
  const [marketingRows, setMarketingRows] = useState([]);
  const [videoRows, setVideoRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [row, media, marketing, video] = await Promise.all([
        getHomeSaleListing(listingId),
        getSaleMediaByListingId(listingId).catch(() => []),
        getMarketingCopyByListingId(listingId).catch(() => []),
        getVideoScriptsByListingId(listingId).catch(() => []),
      ]);
      setListing(row);
      setMediaRows(media);
      setMarketingRows(marketing);
      setVideoRows(video);
    }
    load()
      .catch((err) => setError(err.message || "Failed to load listing."))
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

  const checks = listing
    ? [
        { label: "Listing Info", ok: !!(listing.address && listing.askingPrice), detail: listing.address || "—" },
        { label: "Original Photos", ok: mediaRows.some((m) => m.assetType === "Photo"), detail: `${mediaRows.filter((m) => m.assetType === "Photo").length} photo(s)` },
        { label: "Cover Image", ok: mediaRows.some((m) => m.assetRole === "Cover"), detail: mediaRows.some((m) => m.assetRole === "Cover") ? "✅ Set" : "⏳ Not set" },
        { label: "Marketing Copy", ok: marketingRows.length > 0, detail: `${marketingRows.length} row(s)` },
        { label: "Video / Script", ok: videoRows.length > 0, detail: `${videoRows.length} script(s)` },
        { label: "Share Kit", ok: true, detail: "QR code auto-generated" },
      ]
    : [];

  const allGreen = checks.every((c) => c.ok);
  const publicUrl = listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Review & Publish / 审核与发布</h1>
          <p className="text-muted text-sm">{listingId}</p>
        </div>
        <div className="flex gap-8">
          <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost">Edit Listing</Link>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">Public Page</a>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {error && (
        <div className="notice notice--error">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Status control */}
      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
              📋 发布状态 / Publish Status
            </h3>
            <span className={`badge ${STATUS_BADGE[listing?.status] || "badge--draft"}`}>
              {listing?.status || "Draft"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {saving && <span className="text-muted text-sm">Saving…</span>}
            <select
              className="select-control"
              value={listing?.status || "Draft"}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={saving}
            >
              {HOME_SALE_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Pre-publish checklist */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
          ✅ 发布前检查 / Pre-Publish Checklist
        </h3>
        <div style={{ display: "grid", gap: 10 }}>
          {checks.map(({ label, ok, detail }) => (
            <div
              key={label}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px",
                background: ok ? "#f2fbf4" : "#fff8f3",
                border: `1px solid ${ok ? "#b8e4c4" : "#f0cfa0"}`,
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{ok ? "✅" : "⏳"}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>{label}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{detail}</p>
              </div>
            </div>
          ))}
        </div>

        {allGreen ? (
          <div className="notice notice--sage" style={{ marginTop: 16 }}>
            <p>
              ✅ 所有步骤已完成，可以发布！请在上方将状态更改为 <strong>Published</strong> 或 <strong>Active</strong>。
            </p>
            <p style={{ opacity: 0.86 }}>All steps complete — ready to publish. Change the status above to Published or Active.</p>
          </div>
        ) : (
          <div className="notice notice--warm" style={{ marginTop: 16 }}>
            <p>
              部分步骤尚未完成。建议在发布前补全所有内容以确保最佳展示效果。
            </p>
            <p style={{ opacity: 0.86 }}>Some steps are incomplete. Complete them before publishing for the best result.</p>
          </div>
        )}
      </div>

      {/* Property summary */}
      {listing && (
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
            🏡 房源摘要 / Listing Summary
          </h3>
          <div className="info-grid">
            {[
              ["Address", listing.address],
              ["City / Province", [listing.city, listing.province].filter(Boolean).join(", ")],
              ["Asking Price", formatSalePrice(listing.askingPrice)],
              ["Property Type", listing.propertyType],
              ["Beds / Baths", `${listing.bedrooms || "—"} / ${listing.bathrooms || "—"}`],
              ["MLS Number", listing.mlsNumber],
              ["Status", listing.status],
            ].map(([label, val]) => (
              <div key={label} className="info-item">
                <label>{label}</label>
                <p>{val || "—"}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              🔗 Open Public Sale Listing
            </a>
            <Link to={`/admin/home-sale/listings/${listingId}`} className="btn btn--ghost btn--sm">
              Back to Listing Detail
            </Link>
          </div>
        </div>
      )}

      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 12 }}>
          📋 工作流导航 / Workflow Navigation
        </h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/admin/home-sale/buyer-inquiry/${listingId}`} className="btn btn--ghost btn--sm">
            ← Buyer Inquiry
          </Link>
          <Link to={`/admin/home-sale/listings/${listingId}`} className="btn btn--ghost btn--sm">
            Back to Listing Overview →
          </Link>
        </div>
      </div>
    </div>
  );
}
