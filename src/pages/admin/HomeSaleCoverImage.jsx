import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { getHomeSaleListing, getSaleMediaByListingId } from "../../utils/homeSaleSheet";

function extractDriveFileId(url) {
  const text = String(url || "");
  const fileMatch = text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return "";
}

function toImgSrc(url) {
  const fileId = extractDriveFileId(url);
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w800` : url;
}

export default function HomeSaleCoverImage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [mediaRows, setMediaRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getHomeSaleListing(listingId),
      getSaleMediaByListingId(listingId).catch(() => []),
    ])
      .then(([row, media]) => {
        setListing(row);
        setMediaRows(media);
      })
      .catch((err) => setError(err.message || "Failed to load listing."));
  }, [listingId]);

  const coverAsset = mediaRows.find((m) => m.assetRole === "Cover");
  const photoAssets = mediaRows.filter((m) => m.assetType === "Photo");

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Cover Image / 封面图</h1>
          <p className="text-muted text-sm">{listingId}</p>
        </div>
        <div className="flex gap-8">
          <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost">Edit Listing</Link>
          <a
            href={listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn--ghost"
          >
            Public Page
          </a>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {error && (
        <div className="notice notice--error">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      )}

      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
          🖼️ 当前封面图 / Current Cover Image
        </h3>

        {coverAsset ? (
          <div>
            <div style={{ borderRadius: 12, overflow: "hidden", background: "#eef2f0", marginBottom: 12, maxWidth: 480 }}>
              <img
                src={toImgSrc(coverAsset.driveUrl || coverAsset.publicUrl)}
                alt="Cover"
                style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", display: "block" }}
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              File: {coverAsset.fileName || "—"} &nbsp;·&nbsp; Role: {coverAsset.assetRole}
            </p>
          </div>
        ) : (
          <div className="notice notice--warm">
            <p>
              封面图尚未设定。请先在「原始照片」页面将一张照片的 Asset Role 设为 <strong>Cover</strong>，
              然后返回此页面确认。
            </p>
            <p style={{ marginTop: 6, opacity: 0.86 }}>
              No cover image set yet. Go to Original Photos and set one asset's role to <strong>Cover</strong>,
              then return here to confirm.
            </p>
            <Link to={`/admin/home-sale/media/${listingId}`} className="btn btn--ghost btn--sm" style={{ marginTop: 10 }}>
              ← Go to Original Photos
            </Link>
          </div>
        )}
      </div>

      {photoAssets.length > 0 && (
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
            📸 全部照片 / All Photo Assets ({photoAssets.length})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {photoAssets.map((asset) => (
              <div
                key={asset.assetId}
                style={{
                  border: asset.assetRole === "Cover"
                    ? "2px solid var(--color-primary)"
                    : "1.5px solid var(--color-border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                  background: "#eef2f0",
                }}
              >
                {(asset.driveUrl || asset.publicUrl) ? (
                  <img
                    src={toImgSrc(asset.driveUrl || asset.publicUrl)}
                    alt={asset.fileName || "Photo"}
                    style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                    No preview
                  </div>
                )}
                {asset.assetRole === "Cover" && (
                  <div style={{
                    position: "absolute", top: 6, left: 6,
                    background: "var(--color-primary)", color: "#fff",
                    fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                  }}>
                    COVER
                  </div>
                )}
                <div style={{ padding: "6px 8px", fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                  {asset.fileName || asset.assetId}
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            要更改封面图，请前往「原始照片」页面修改 Asset Role。
            To change the cover, update the Asset Role in Original Photos.
          </p>
        </div>
      )}

      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 12 }}>
          📋 工作流导航 / Workflow Navigation
        </h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/admin/home-sale/enhance/${listingId}`} className="btn btn--ghost btn--sm">
            ← Photo Enhancement
          </Link>
          <Link to={`/admin/home-sale/marketing/${listingId}`} className="btn btn--ghost btn--sm">
            Marketing Copy →
          </Link>
        </div>
      </div>
    </div>
  );
}
