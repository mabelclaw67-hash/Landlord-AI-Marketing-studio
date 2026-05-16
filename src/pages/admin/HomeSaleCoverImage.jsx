import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { getHomeSaleListing, getSaleMediaByListingId, updateSaleListing } from "../../utils/homeSaleSheet";

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
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : url;
}

function normalizeAssetRef(url) {
  const fileId = extractDriveFileId(url);
  if (fileId) return fileId;
  return String(url || "").trim();
}

function assetMatchesCoverUrl(asset, coverUrl) {
  const target = normalizeAssetRef(coverUrl);
  if (!target) return false;
  return target === normalizeAssetRef(asset?.driveUrl) || target === normalizeAssetRef(asset?.publicUrl);
}

export default function HomeSaleCoverImage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [mediaRows, setMediaRows] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingAssetId, setSavingAssetId] = useState("");

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

  const fallbackCoverAsset = mediaRows.find((item) => item.assetRole === "Cover");
  const photoAssets = mediaRows.filter((item) => item.assetType === "Photo");

  const currentCoverAsset = useMemo(() => {
    if (listing?.primaryPhotoUrl) {
      const selected = mediaRows.find((item) => assetMatchesCoverUrl(item, listing.primaryPhotoUrl));
      if (selected) return selected;
    }
    return fallbackCoverAsset || null;
  }, [fallbackCoverAsset, listing?.primaryPhotoUrl, mediaRows]);

  async function handleSetCover(asset) {
    if (!listing) return;

    const selectedUrl = asset.driveUrl || asset.publicUrl || "";
    if (!selectedUrl) {
      setError("Selected asset does not have a usable image URL.");
      return;
    }

    const savingKey = asset.assetId || asset.fileName || "saving";
    setSavingAssetId(savingKey);
    setError("");
    setMessage("");

    try {
      await updateSaleListing({
        ...listing,
        primaryPhotoUrl: selectedUrl,
      });
      setListing((current) => ({ ...current, primaryPhotoUrl: selectedUrl }));
      setMessage(`Cover image updated: ${asset.fileName || asset.assetId || "selected photo"}`);
    } catch (err) {
      setError(err.message || "Failed to update cover image.");
    } finally {
      setSavingAssetId("");
    }
  }

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

      {message && (
        <div className="notice notice--sage">
          <h4>Saved</h4>
          <p>{message}</p>
        </div>
      )}

      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
          🖼️ 当前封面图 / Current Cover Image
        </h3>

        {currentCoverAsset ? (
          <div>
            <div style={{ borderRadius: 12, overflow: "hidden", background: "#eef2f0", marginBottom: 12, maxWidth: 480 }}>
              <img
                src={toImgSrc(currentCoverAsset.driveUrl || currentCoverAsset.publicUrl)}
                alt="Cover"
                style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", display: "block" }}
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              File: {currentCoverAsset.fileName || "—"} &nbsp;·&nbsp; Source: Primary Photo URL
            </p>
            <p style={{ marginTop: 6, fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
              可以直接从下方任意一张照片切换，不再固定写死。
            </p>
          </div>
        ) : (
          <div className="notice notice--warm">
            <p>
              封面图尚未设定。请先从下方任意一张照片点击 <strong>Set as Cover</strong>。
            </p>
            <p style={{ marginTop: 6, opacity: 0.86 }}>
              No cover image set yet. Choose any photo below and click <strong>Set as Cover</strong>.
            </p>
          </div>
        )}
      </div>

      {photoAssets.length > 0 && (
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
            📸 全部照片 / All Photo Assets ({photoAssets.length})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {photoAssets.map((asset, index) => {
              const isCurrentCover = currentCoverAsset
                ? assetMatchesCoverUrl(asset, currentCoverAsset.driveUrl || currentCoverAsset.publicUrl)
                : false;
              const savingKey = asset.assetId || asset.fileName || "";
              const isSaving = savingAssetId === savingKey;

              return (
                <div
                  key={asset.assetId || asset.driveUrl || asset.publicUrl || asset.fileName || String(index)}
                  style={{
                    border: isCurrentCover
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
                  {isCurrentCover && (
                    <div style={{
                      position: "absolute", top: 6, left: 6,
                      background: "var(--color-primary)", color: "#fff",
                      fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                    }}>
                      CURRENT COVER
                    </div>
                  )}
                  <div style={{ padding: "6px 8px" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
                      {asset.fileName || asset.assetId}
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ width: "100%" }}
                      disabled={isCurrentCover || isSaving}
                      onClick={() => handleSetCover(asset)}
                    >
                      {isCurrentCover ? "Current Cover" : isSaving ? "Saving..." : "Set as Cover"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            现在可以在此页直接手动切换封面图。公开页会优先使用当前保存的 Primary Photo URL。
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
