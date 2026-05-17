import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { isAdminSessionActive, getStudioRequestAuth } from "../../utils/trialAccess";
import {
  HOME_SALE_MEDIA_ROLE_OPTIONS,
  HOME_SALE_MEDIA_TYPE_OPTIONS,
  createSaleMediaAsset,
  extractHomeSaleDriveFileId,
  getHomeSaleListing,
  getSaleMediaByListingId,
  getSalePhotoData,
  isHomeSaleApiConnected,
  syncSaleMediaFromDriveFolder,
  uploadSaleMediaFile,
} from "../../utils/homeSaleSheet";

function emptyMediaForm(listingId) {
  return {
    assetId: "",
    listingId,
    assetType: "Photo",
    assetRole: "Cover",
    fileName: "",
    driveUrl: "",
    publicUrl: "",
    sortOrder: "",
    captionCn: "",
    captionEn: "",
    altText: "",
    notes: "",
  };
}

// Use canonical extractor from homeSaleSheet — handles /file/d/ID, /d/ID, and ?id=ID formats
function buildPreviewSrc(item) {
  const fileId = extractHomeSaleDriveFileId(item.driveUrl || "");
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  const pubFileId = extractHomeSaleDriveFileId(item.publicUrl || "");
  if (pubFileId) return `https://drive.google.com/thumbnail?id=${pubFileId}&sz=w400`;
  return "";
}

function normalizeAssetRef(url) {
  const fileId = extractHomeSaleDriveFileId(String(url || ""));
  if (fileId) return fileId;
  return String(url || "").trim();
}

function assetMatchesPrimaryPhoto(item, primaryPhotoUrl) {
  const target = normalizeAssetRef(primaryPhotoUrl);
  if (!target) return false;
  return target === normalizeAssetRef(item?.driveUrl) || target === normalizeAssetRef(item?.publicUrl);
}

// dataUrl: base64 loaded via backend (takes priority over Drive thumbnail URL)
function SalePhotoCard({ item, isCurrentCover, showDriveLink, dataUrl }) {
  const [failed, setFailed] = useState(false);
  // Prefer backend-fetched base64 — always works for private Drive files.
  // Fall back to thumbnail URL (works only for publicly-shared files).
  const src = dataUrl || buildPreviewSrc(item);

  return (
    <div style={{
      border: `1.5px solid ${isCurrentCover ? "var(--color-primary)" : "var(--color-border)"}`,
      borderRadius: 7, overflow: "hidden", width: 140, flexShrink: 0, position: "relative",
    }}>
      {isCurrentCover && (
        <div style={{
          position: "absolute", top: 4, left: 4, zIndex: 1,
          background: "var(--color-primary)", color: "#fff",
          fontSize: "0.58rem", padding: "1px 5px", borderRadius: 3,
          fontWeight: 700, lineHeight: 1.6,
        }}>
          COVER
        </div>
      )}
      {src && !failed ? (
        <img
          src={src}
          alt={item.altText || item.fileName || item.assetRole || "Sale photo"}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{
          width: "100%", height: 90, background: "#EFF3F8",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "4px 6px",
        }}>
          <span style={{ fontSize: "1.4rem", marginBottom: 2 }}>🖼️</span>
          <span style={{
            fontSize: "0.6rem", color: "var(--color-text-muted)",
            textAlign: "center", lineHeight: 1.3, wordBreak: "break-all",
          }}>
            {item.fileName || "No preview"}
          </span>
        </div>
      )}
      <div style={{ padding: "5px 7px", borderTop: "1px solid var(--color-border)" }}>
        <div style={{
          fontSize: "0.7rem", color: "var(--color-text-muted)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2,
        }}>
          {item.fileName || item.assetRole || "Unnamed"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontSize: "0.62rem", background: "#EFF3F8", borderRadius: 3,
            padding: "1px 5px", color: "var(--color-primary)",
          }}>
            #{item.sortOrder || "—"}
          </span>
          {showDriveLink && item.driveUrl && (
            <a
              href={item.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.62rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}
            >
              Drive ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeSaleMedia() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [mediaRows, setMediaRows] = useState([]);
  const [form, setForm] = useState(emptyMediaForm(listingId));
  const [bulkForm, setBulkForm] = useState({
    folderUrl: "",
    startingSortOrder: "1",
    defaultAssetType: "Photo",
    defaultAssetRole: "Other",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncResult, setSyncResult] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  // Photo data URLs — keyed by assetId (or fileId fallback).
  // Loaded progressively via backend so private Drive files display correctly.
  // Same pattern as For Rent: "dataUrl (base64) always works regardless of Drive sharing."
  const [photoDataUrls, setPhotoDataUrls] = useState({});

  // Background-load base64 data URLs after mediaRows loads
  useEffect(() => {
    const photos = mediaRows.filter((a) => a.assetType === "Photo");
    if (!photos.length || !isHomeSaleApiConnected()) return;

    let active = true;
    (async () => {
      for (const asset of photos) {
        if (!active) break;
        const fileId = extractHomeSaleDriveFileId(asset.driveUrl || "");
        if (!fileId) continue;
        const key = asset.assetId || fileId;
        try {
          const result = await getSalePhotoData({
            listingId,
            fileId,
            ...getStudioRequestAuth("sale"),
          });
          if (active && result?.data) {
            setPhotoDataUrls((prev) => ({
              ...prev,
              [key]: `data:${result.mimeType || "image/jpeg"};base64,${result.data}`,
            }));
          }
        } catch { /* skip failed photos */ }
      }
    })();
    return () => { active = false; };
  }, [listingId, mediaRows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedMediaRows = useMemo(() => {
    return [...mediaRows].sort((a, b) => {
      const aIsCurrentCover = assetMatchesPrimaryPhoto(a, listing?.primaryPhotoUrl);
      const bIsCurrentCover = assetMatchesPrimaryPhoto(b, listing?.primaryPhotoUrl);
      if (aIsCurrentCover && !bIsCurrentCover) return -1;
      if (!aIsCurrentCover && bIsCurrentCover) return 1;
      if (a.assetRole === "Cover" && b.assetRole !== "Cover") return -1;
      if (a.assetRole !== "Cover" && b.assetRole === "Cover") return 1;
      const sortA = Number(a.sortOrder || 9999);
      const sortB = Number(b.sortOrder || 9999);
      if (sortA !== sortB) return sortA - sortB;
      return String(a.fileName || "").localeCompare(String(b.fileName || ""));
    });
  }, [listing?.primaryPhotoUrl, mediaRows]);

  const coverPhoto = orderedMediaRows.find((item) => assetMatchesPrimaryPhoto(item, listing?.primaryPhotoUrl))
    || orderedMediaRows.find((m) => m.assetRole === "Cover");
  const activePhotos = orderedMediaRows.filter((item) => !coverPhoto || item.assetId !== coverPhoto.assetId);

  async function refresh() {
    const [listingRow, media] = await Promise.all([
      getHomeSaleListing(listingId),
      getSaleMediaByListingId(listingId),
    ]);
    setListing(listingRow);
    setMediaRows(media);
    setBulkForm((current) => ({
      ...current,
      folderUrl: current.folderUrl || listingRow?.googleDriveFolderUrl || "",
    }));
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message || "Failed to load media workflow."))
      .finally(() => setLoading(false));
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError("");
  };

  const updateBulkField = (key) => (event) => {
    setBulkForm((current) => ({ ...current, [key]: event.target.value }));
    setError("");
    setSyncResult(null);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createSaleMediaAsset(form);
      setForm(emptyMediaForm(listingId));
      setShowAddForm(false);
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to add media asset.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkSync(event) {
    event.preventDefault();
    setSyncing(true);
    setError("");
    setSyncResult(null);
    try {
      const result = await syncSaleMediaFromDriveFolder({
        listingId,
        folderUrl: bulkForm.folderUrl,
        startingSortOrder: bulkForm.startingSortOrder,
        defaultAssetType: bulkForm.defaultAssetType,
        defaultAssetRole: bulkForm.defaultAssetRole,
      });
      setSyncResult(result);
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to sync photos from Drive.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpload() {
    if (!uploadFiles.length) return;
    setUploading(true);
    setUploadError("");
    setUploadResult(null);
    const nextSort = (mediaRows.length ? Math.max(...mediaRows.map((r) => Number(r.sortOrder) || 0)) : 0) + 1;
    const results = [];
    const errors = [];
    for (let i = 0; i < uploadFiles.length; i++) {
      try {
        const res = await uploadSaleMediaFile({
          listingId,
          file: uploadFiles[i],
          sortOrder: String(nextSort + i),
          assetRole: "Other",
        });
        results.push(res);
      } catch (err) {
        errors.push(`${uploadFiles[i].name}: ${err.message}`);
      }
    }
    setUploading(false);
    if (results.length) {
      setUploadFiles([]);
      setUploadResult({ uploadedCount: results.length });
      await refresh();
    }
    if (errors.length) {
      setUploadError(errors.join(" | "));
    }
  }

  const isAdmin = isAdminSessionActive();

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        Loading photo workflow…
      </div>
    );
  }

  return (
    <div>
      {/* Header — mirrors Rental ListingDetail header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.4rem" }}>Photo Assets / 房源照片</h1>
          <p className="text-muted text-sm">
            {listingId}{listing?.address ? ` — ${listing.address}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href={listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn--ghost btn--sm"
            style={{ whiteSpace: "nowrap" }}
          >
            🔗 Open Public Preview
          </a>
          <Link to={`/admin/home-sale/listings/${listingId}`} className="btn btn--ghost btn--sm">
            ← Sale Package
          </Link>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {error && (
        <div className="notice notice--error">
          <h4>Media workflow error</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Review Status Summary — mirrors Rental photo review cards */}
      {orderedMediaRows.length > 0 && (
        <div className="card mb-24" style={{ background: "#f8fafc" }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            📋 Photo Review Status / 照片审核状态
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Cover Photo
              </p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                {coverPhoto ? "✅ Set" : "⚠️ Not set"}
              </p>
              {coverPhoto && (
                <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                  <code>{coverPhoto.fileName || "cover"}</code>
                </p>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Total Photos
              </p>
              <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-primary)" }}>
                {orderedMediaRows.length}
              </p>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Additional Assets
              </p>
              <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-text)" }}>
                {activePhotos.length}
              </p>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Drive Folder
              </p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                {isAdmin && listing?.googleDriveFolderUrl
                  ? <a href={listing.googleDriveFolderUrl} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)" }}>Open ↗</a>
                  : listing?.googleDriveFolderUrl ? "✅ Set" : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cover Photo Preview — mirrors Rental cover photo display */}
      {coverPhoto && (
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            🖼️ Cover Photo / 封面照片
          </h3>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ border: "2px solid var(--color-primary)", borderRadius: 8, overflow: "hidden", maxWidth: 320, flexShrink: 0 }}>
              {(() => {
                const coverKey = coverPhoto.assetId || extractHomeSaleDriveFileId(coverPhoto.driveUrl || "");
                const coverSrc = photoDataUrls[coverKey] || buildPreviewSrc(coverPhoto);
                return coverSrc ? (
                  <img
                    src={coverSrc}
                    alt={coverPhoto.altText || coverPhoto.fileName || "Cover photo"}
                    style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ width: 320, height: 200, background: "#EFF3F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "2rem" }}>🖼️</span>
                  </div>
                );
              })()}
            </div>
            <div>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 4 }}>{coverPhoto.fileName || "Cover"}</p>
              {coverPhoto.captionEn && <p className="text-muted text-sm">EN: {coverPhoto.captionEn}</p>}
              {coverPhoto.captionCn && <p className="text-muted text-sm">CN: {coverPhoto.captionCn}</p>}
              {coverPhoto.driveUrl && (
                <a href={coverPhoto.driveUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }}>
                  Open in Drive ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Photos grid — mirrors Rental PackagePhoto grid */}
      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            📸 Photo Package / 广告照片集
          </h3>
          <span className="text-muted text-sm">
            {orderedMediaRows.length} asset(s) · Sort order: cover first, then by sort number
          </span>
        </div>
        {orderedMediaRows.length === 0 ? (
          <p className="text-muted text-sm">No photos yet. Sync from Drive folder below.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {orderedMediaRows.map((item) => {
              const photoKey = item.assetId || extractHomeSaleDriveFileId(item.driveUrl || "");
              return (
                <SalePhotoCard
                  key={item.assetId || item.driveUrl || item.publicUrl}
                  item={item}
                  isCurrentCover={coverPhoto ? item.assetId === coverPhoto.assetId : false}
                  showDriveLink={isAdmin}
                  dataUrl={photoDataUrls[photoKey] || null}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Photos — direct file upload to listing Drive folder */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: "0.95rem", color: "var(--color-primary)" }}>
          📤 Upload Photos / 上传照片
        </h3>
        <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
          Select images from your computer to upload directly to this listing&apos;s Drive folder.
          需要先在房源信息中设置 Google Drive 文件夹链接。
        </p>
        <div className="form-group">
          <label style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
            Select Photos <span className="ch-hint">支持 JPG · PNG · WebP</span>
          </label>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="form-control"
            style={{ padding: "6px 10px" }}
            onChange={(e) => {
              setUploadFiles(Array.from(e.target.files || []));
              setUploadResult(null);
              setUploadError("");
            }}
          />
        </div>

        {uploadFiles.length > 0 && (
          <ul style={{ margin: "8px 0 12px", padding: "0 0 0 18px", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            {uploadFiles.map((f) => (
              <li key={f.name}>{f.name} <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>({(f.size / 1024).toFixed(0)} KB)</span></li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="btn btn--primary"
          disabled={uploading || !uploadFiles.length}
          onClick={handleUpload}
        >
          {uploading ? `Uploading… (${uploadFiles.length} file(s))` : "Upload Selected Photos / 上传所选照片"}
        </button>

        {uploadResult && (
          <div className="notice notice--success" style={{ marginTop: 14 }}>
            <p>✅ {uploadResult.uploadedCount} photo(s) uploaded successfully. / 上传成功。</p>
          </div>
        )}
        {uploadError && (
          <div className="notice notice--error" style={{ marginTop: 14 }}>
            <p>{uploadError}</p>
          </div>
        )}
      </div>

      {/* Drive Sync — admin only: exposes raw Drive folder URL */}
      {isAdmin && <div className="card mb-24">
        <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: "0.95rem", color: "var(--color-primary)" }}>
          📁 Sync Photos from Drive / 从 Drive 批量导入照片
        </h3>
        <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
          Upload all property photos to a Google Drive folder, paste the folder link, and sync all photos into the media sheet.
          先把本房源所有照片上传到 Google Drive 文件夹，然后粘贴文件夹链接一键导入。
        </p>
        <form onSubmit={handleBulkSync}>
          <div className="form-group">
            <label>Google Drive Folder URL <span className="ch-hint">Drive 文件夹链接</span></label>
            <input
              className="form-control"
              value={bulkForm.folderUrl}
              onChange={updateBulkField("folderUrl")}
              placeholder="https://drive.google.com/drive/folders/..."
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Starting Sort Order <span className="ch-hint">起始排序</span></label>
              <input
                className="form-control"
                value={bulkForm.startingSortOrder}
                onChange={updateBulkField("startingSortOrder")}
              />
            </div>
            <div className="form-group">
              <label>Default Asset Type <span className="ch-hint">默认资源类型</span></label>
              <select
                className="form-control"
                value={bulkForm.defaultAssetType}
                onChange={updateBulkField("defaultAssetType")}
              >
                {HOME_SALE_MEDIA_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Default Asset Role <span className="ch-hint">默认资源角色</span></label>
              <select
                className="form-control"
                value={bulkForm.defaultAssetRole}
                onChange={updateBulkField("defaultAssetRole")}
              >
                {HOME_SALE_MEDIA_ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn--primary" disabled={syncing}>
            {syncing ? "Syncing…" : "从 Drive 同步照片 / Sync Photos from Drive"}
          </button>
        </form>

        {syncResult && (
          <div className="notice notice--success" style={{ marginTop: 16 }}>
            <h4>Drive sync completed / 同步完成</h4>
            <p>
              Imported: {syncResult.importedCount || 0} photo(s). Skipped duplicates: {syncResult.skippedDuplicateCount || 0}.
            </p>
          </div>
        )}
      </div>}

      {/* Add Individual Asset — collapsible, mirrors Rental upload section style */}
      <div className="card mb-24">
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => setShowAddForm((v) => !v)}
        >
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            ➕ Add Individual Asset / 手动新增媒体资源
          </h3>
          <span className="text-muted text-sm">{showAddForm ? "▲ Collapse" : "▼ Expand"}</span>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            <div className="form-row">
              <div className="form-group">
                <label>Asset Type <span className="ch-hint">资源类型</span></label>
                <select className="form-control" value={form.assetType} onChange={updateField("assetType")}>
                  {HOME_SALE_MEDIA_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Asset Role <span className="ch-hint">资源角色</span></label>
                <select className="form-control" value={form.assetRole} onChange={updateField("assetRole")}>
                  {HOME_SALE_MEDIA_ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Sort Order <span className="ch-hint">排序</span></label>
                <input className="form-control" value={form.sortOrder} onChange={updateField("sortOrder")} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>File Name <span className="ch-hint">文件名</span></label>
                <input className="form-control" value={form.fileName} onChange={updateField("fileName")} />
              </div>
              <div className="form-group">
                <label>Drive URL <span className="ch-hint">Drive 链接</span></label>
                <input className="form-control" value={form.driveUrl} onChange={updateField("driveUrl")} />
              </div>
              <div className="form-group">
                <label>Public URL <span className="ch-hint">公开链接</span></label>
                <input className="form-control" value={form.publicUrl} onChange={updateField("publicUrl")} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Caption CN <span className="ch-hint">中文说明</span></label>
                <input className="form-control" value={form.captionCn} onChange={updateField("captionCn")} />
              </div>
              <div className="form-group">
                <label>Caption EN <span className="ch-hint">英文说明</span></label>
                <input className="form-control" value={form.captionEn} onChange={updateField("captionEn")} />
              </div>
            </div>
            <div className="form-group">
              <label>Alt Text <span className="ch-hint">替代文字</span></label>
              <input className="form-control" value={form.altText} onChange={updateField("altText")} />
            </div>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Saving…" : "Add Media Asset / 添加资源"}
            </button>
          </form>
        )}
      </div>

      {/* Media Rows Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "20px 20px 12px" }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            📋 All Media Rows / 所有媒体行
          </h3>
        </div>
        {mediaRows.length === 0 ? (
          <div style={{ padding: "24px 20px", color: "var(--color-text-muted)" }}>
            No media rows yet. Sync from Drive above to get started.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th>File Name</th>
                  <th>Sort</th>
                  <th>Drive</th>
                </tr>
              </thead>
              <tbody>
                {orderedMediaRows.map((item) => (
                  <tr key={item.assetId || item.publicUrl}>
                    <td><code style={{ fontSize: "0.75rem" }}>{item.assetId || "Pending"}</code></td>
                    <td>
                      <span style={{
                        fontSize: "0.75rem", fontWeight: 600,
                        color: assetMatchesPrimaryPhoto(item, listing?.primaryPhotoUrl) || item.assetRole === "Cover"
                          ? "var(--color-primary)"
                          : "var(--color-text)",
                      }}>
                        {assetMatchesPrimaryPhoto(item, listing?.primaryPhotoUrl) ? "⭐ Current Cover" : item.assetRole === "Cover" ? "⭐ Cover" : item.assetRole}
                      </span>
                    </td>
                    <td>{item.assetType}</td>
                    <td style={{ fontSize: "0.82rem" }}>{item.fileName || "—"}</td>
                    <td>{item.sortOrder || "—"}</td>
                    <td>
                      {isAdmin && item.driveUrl
                        ? <a href={item.driveUrl} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", fontSize: "0.82rem" }}>Drive ↗</a>
                        : isAdmin && item.publicUrl
                          ? <a href={item.publicUrl} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", fontSize: "0.82rem" }}>Public ↗</a>
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
