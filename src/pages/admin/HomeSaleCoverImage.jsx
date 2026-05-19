import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import {
  extractHomeSaleDriveFileId,
  getHomeSaleListing,
  getSaleMediaByListingId,
  getSalePhotoData,
  getSaleSubfolderFiles,
  isHomeSaleApiConnected,
  setSaleListingCoverPhoto,
  uploadSaleToSubfolder,
} from "../../utils/homeSaleSheet";
import { getStudioRequestAuth } from "../../utils/trialAccess";
import { generateCollageDataUrl, resolveCollagePhotos } from "../../utils/generateCollage";

// Use canonical extractor imported from homeSaleSheet — handles /file/d/ID, /d/ID, and ?id=ID formats
function toImgSrc(url) {
  const fileId = extractHomeSaleDriveFileId(String(url || ""));
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : String(url || "");
}

function normalizeAssetRef(url) {
  const fileId = extractHomeSaleDriveFileId(String(url || ""));
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
  const [coverFiles, setCoverFiles] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingAssetId, setSavingAssetId] = useState("");

  // Collage state
  const [collageStatus,    setCollageStatus]    = useState("idle"); // idle | loading | ready | saving | saved | error
  const [collageDataUrl,   setCollageDataUrl]   = useState(null);
  const [collageMsg,       setCollageMsg]       = useState("");
  const [collageFolderUrl, setCollageFolderUrl] = useState(null);
  const [collageSelection, setCollageSelection] = useState(new Set()); // Set<assetId>

  // Photo data URLs — keyed by assetId (or fileId fallback).
  // Loaded progressively via backend so private Drive files display correctly.
  // Same pattern as For Rent: "dataUrl (base64) always works regardless of Drive sharing."
  const [photoDataUrls, setPhotoDataUrls] = useState({});

  useEffect(() => {
    Promise.all([
      getHomeSaleListing(listingId),
      getSaleMediaByListingId(listingId).catch(() => []),
      getSaleSubfolderFiles({
        listingId,
        subfolderName: "03_Cover_Images",
        ...getStudioRequestAuth("sale"),
      }).catch(() => ({ files: [], subfolderUrl: "" })),
    ])
      .then(([row, media, coverResult]) => {
        setListing(row);
        setMediaRows(media);
        setCoverFiles(
          (coverResult?.files || []).map((file) => {
            const driveUrl = file?.url || (file?.fileId ? `https://drive.google.com/file/d/${file.fileId}/view?usp=sharing` : "");
            return {
              ...file,
              assetId: file?.assetId || file?.fileId || "",
              fileName: file?.fileName || file?.name || "",
              driveUrl,
              publicUrl: driveUrl,
              thumbUrl: file?.thumbUrl || (file?.fileId ? `https://drive.google.com/thumbnail?id=${file.fileId}&sz=w400` : ""),
              thumbUrlLg: file?.thumbUrlLg || (file?.fileId ? `https://drive.google.com/thumbnail?id=${file.fileId}&sz=w1600` : ""),
            };
          })
        );
        if (coverResult?.subfolderUrl) setCollageFolderUrl(coverResult.subfolderUrl);
      })
      .catch((err) => setError(err.message || "Failed to load listing."));
  }, [listingId]);

  // Background-load base64 data URLs for every photo asset via the Apps Script backend.
  // This mirrors the For Rent pipeline where getListingFolderFiles() returns dataUrl per file.
  useEffect(() => {
    const photos = mediaRows.filter((a) => a.assetType === "Photo");
    const primaryFileId = extractHomeSaleDriveFileId(listing?.primaryPhotoUrl || "");
    if ((!photos.length && !primaryFileId) || !isHomeSaleApiConnected()) return;

    let active = true;
    (async () => {
      const seenFileIds = new Set();
      for (const asset of photos) {
        if (!active) break;
        const fileId = extractHomeSaleDriveFileId(asset.driveUrl || "");
        if (!fileId || seenFileIds.has(fileId)) continue;
        seenFileIds.add(fileId);
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
        } catch { /* skip failed photos — fallback URL still shown */ }
      }

      if (!active || !primaryFileId || seenFileIds.has(primaryFileId)) return;
      try {
        const result = await getSalePhotoData({
          listingId,
          fileId: primaryFileId,
          ...getStudioRequestAuth("sale"),
        });
        if (active && result?.data) {
          setPhotoDataUrls((prev) => ({
            ...prev,
            [primaryFileId]: `data:${result.mimeType || "image/jpeg"};base64,${result.data}`,
          }));
        }
      } catch { /* current cover can still fall back to thumbnail URL */ }
    })();
    return () => { active = false; };
  }, [listingId, listing?.primaryPhotoUrl, mediaRows]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Returns base64 dataUrl if loaded, falls back to Drive thumbnail URL. */
  function getPhotoSrc(asset) {
    const fileId = asset?.fileId || extractHomeSaleDriveFileId(asset?.driveUrl || asset?.publicUrl || asset?.url || "");
    const key = asset?.assetId || fileId;
    return photoDataUrls[key] || (fileId ? photoDataUrls[fileId] : "") || asset?.dataUrl || asset?.thumbUrlLg || asset?.thumbUrl || toImgSrc(asset?.driveUrl || asset?.publicUrl || asset?.url || "");
  }

  const fallbackCoverAsset = mediaRows.find((item) => item.assetRole === "Cover");
  const photoAssets = mediaRows.filter((item) => item.assetType === "Photo");

  const currentCoverAsset = useMemo(() => {
    const targetCoverUrl = listing?.primaryPhotoUrl || listing?.coverImageUrl || "";
    if (targetCoverUrl) {
      const selected = [...coverFiles, ...mediaRows].find((item) => assetMatchesCoverUrl(item, targetCoverUrl));
      if (selected) return selected;
    }
    return fallbackCoverAsset || null;
  }, [coverFiles, fallbackCoverAsset, listing?.coverImageUrl, listing?.primaryPhotoUrl, mediaRows]);

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
      await setSaleListingCoverPhoto(listing.listingId || listing.id, selectedUrl);
      setListing((current) => ({ ...current, primaryPhotoUrl: selectedUrl }));
      setMessage(`Cover image updated: ${asset.fileName || asset.assetId || "selected photo"}`);
    } catch (err) {
      setError(err.message || "Failed to update cover image.");
    } finally {
      setSavingAssetId("");
    }
  }

  // ── Collage selection ─────────────────────────────────────────────────────────

  function toggleCollagePhoto(assetId) {
    if (!assetId) return;
    setCollageSelection((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else if (next.size < 4) {
        next.add(assetId);
      }
      return next;
    });
  }

  // ── Collage generator ─────────────────────────────────────────────────────────

  function buildSaleOverlay(l) {
    if (!l) return null;
    const hasBeds = l.bedrooms || l.bathrooms;
    const title   = hasBeds
      ? `${l.bedrooms || "?"} Bed / ${l.bathrooms || "?"} Bath`
      : null;
    const loc = [l.city, l.province || "BC"].filter(Boolean).join(", ") || null;
    let price = null;
    if (l.askingPrice) {
      const n = Number(String(l.askingPrice).replace(/[^0-9.]/g, ""));
      if (!isNaN(n) && n > 0) price = `$${n.toLocaleString()}`;
    }
    return {
      badge:      "FOR SALE",
      title,
      location:   loc,
      address:    l.address   || null,
      priceLabel: price,
      dateLabel:  null,
    };
  }

  async function handleGenerateCollage() {
    const available = photoAssets.filter((a) => a.driveUrl || a.publicUrl);
    const sources   = resolveCollagePhotos(
      available,
      collageSelection,
      (a) => a.assetId,
      currentCoverAsset?.assetId,
    );
    if (sources.length < 2) {
      setCollageStatus("error");
      setCollageMsg("At least 2 photos are needed. Sync photos from Drive first. / 需要至少 2 张照片，请先从 Drive 同步。");
      return;
    }
    setCollageStatus("loading");
    setCollageMsg("");
    setCollageDataUrl(null);
    try {
      const apiOk = isHomeSaleApiConnected();
      const imageSrcs = [];
      for (const asset of sources) {
        const fileId = extractHomeSaleDriveFileId(asset.driveUrl || "");
        if (fileId && apiOk) {
          try {
            const result = await getSalePhotoData({
              listingId,
              fileId,
              ...getStudioRequestAuth("sale"),
            });
            imageSrcs.push(`data:${result.mimeType};base64,${result.data}`);
            continue;
          } catch { /* fall through to thumbnail */ }
        }
        // Fallback: thumbnail URL (uses crossOrigin="anonymous" in canvas)
        imageSrcs.push(toImgSrc(asset.driveUrl || asset.publicUrl));
      }
      const dataUrl = await generateCollageDataUrl(imageSrcs, {
        overlayData: buildSaleOverlay(listing),
      });
      setCollageDataUrl(dataUrl);
      setCollageStatus("ready");
    } catch (err) {
      setCollageStatus("error");
      setCollageMsg(err.message || "Collage generation failed. / 拼图生成失败。");
    }
  }

  async function handleSaveCollage() {
    if (!collageDataUrl || !listing) return;
    setCollageStatus("saving");
    setCollageMsg("");
    try {
      const base64 = collageDataUrl.split(",")[1];
      const ts = Date.now();
      const fileName = `collage_cover__${ts}.jpg`;
      const res = await uploadSaleToSubfolder({
        listingId,
        subfolderName: "03_Cover_Images",
        fileName,
        mimeType: "image/jpeg",
        data: base64,
        ...getStudioRequestAuth("sale"),
      });
      if (res?.subfolderUrl) setCollageFolderUrl(res.subfolderUrl);
      const fileId = res?.fileId;
      if (!fileId) throw new Error("Upload succeeded but no fileId was returned.");
      const driveUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      const syntheticCover = {
        assetId: fileId,
        fileId,
        fileName,
        name: fileName,
        driveUrl,
        publicUrl: driveUrl,
        url: driveUrl,
        dataUrl: collageDataUrl,
        thumbUrl: collageDataUrl,
        thumbUrlLg: collageDataUrl,
      };
      setCoverFiles((prev) => {
        const next = prev.filter((file) => file.fileId !== fileId);
        return [syntheticCover, ...next];
      });
      await setSaleListingCoverPhoto(listing.listingId || listing.id, driveUrl);
      setListing((prev) => ({ ...prev, primaryPhotoUrl: driveUrl }));
      setCollageStatus("saved");
      setCollageMsg("Collage saved to 03_Cover_Images/ and set as cover. / 拼图封面已保存并设为主图。");
    } catch (err) {
      setCollageStatus("error");
      setCollageMsg(err.message || "Failed to save collage. / 保存失败。");
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
                src={getPhotoSrc(currentCoverAsset)}
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

      {/* ── Collage Cover Generator ─────────────────────────────────────────── */}
      {photoAssets.length >= 2 && (
        <div className="card mb-24">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
              🖼️ Generate Collage Cover / 生成拼图封面
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={collageStatus === "loading" || collageStatus === "saving"}
                onClick={handleGenerateCollage}
              >
                {collageStatus === "loading"
                  ? "Generating… / 生成中…"
                  : collageStatus === "ready" || collageStatus === "saved"
                  ? "Regenerate / 重新生成"
                  : "Generate Collage Cover / 生成拼图封面"}
              </button>
              {collageStatus === "ready" && (
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={handleSaveCollage}
                >
                  Save as Cover / 保存为封面
                </button>
              )}
            </div>
          </div>

          {/* Selection status row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
              {collageSelection.size === 0
                ? "No photos selected — auto-using first 4. / 未选择照片，自动使用前 4 张。"
                : `Selected for Collage: ${collageSelection.size} / 4 / 已选 ${collageSelection.size} / 4 张`}
              {collageSelection.size >= 4 && (
                <span style={{ marginLeft: 6, color: "#d97706", fontWeight: 600 }}>
                  Max 4 reached / 已达上限
                </span>
              )}
            </span>
            {collageSelection.size > 0 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                onClick={() => setCollageSelection(new Set())}
              >
                Clear Selection / 清空拼图选择
              </button>
            )}
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 10 }}>
            选择下方最多 4 张照片加入拼图，或留空自动使用前 4 张。上传至 03_Cover_Images/，不修改原始文件。
            <br />
            Select up to 4 photos below (or leave empty for auto-first-4). Saved to 03_Cover_Images/. Original files are never modified.
          </p>

          {(collageStatus === "error") && collageMsg && (
            <div className="notice notice--error" style={{ marginBottom: 10 }}>
              <p>{collageMsg}</p>
            </div>
          )}
          {(collageStatus === "saved") && collageMsg && (
            <div className="notice notice--sage" style={{ marginBottom: 10 }}>
              <p>{collageMsg}</p>
              {collageFolderUrl && (
                <a href={collageFolderUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.82rem" }}>
                  Open 03_Cover_Images/ folder ↗
                </a>
              )}
            </div>
          )}

          {collageDataUrl && (
            <div style={{ marginTop: 10 }}>
              <div style={{ borderRadius: 10, overflow: "hidden", maxWidth: 520, background: "#eef2f0", marginBottom: 8 }}>
                <img
                  src={collageDataUrl}
                  alt="Collage preview"
                  style={{ width: "100%", display: "block" }}
                />
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                {collageStatus === "saved"
                  ? "✅ Saved and set as cover / 已保存并设为封面"
                  : "Preview — click \"Save as Cover\" to upload. / 预览图 — 点击\"保存为封面\"上传。"}
              </p>
            </div>
          )}
        </div>
      )}

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
                      src={getPhotoSrc(asset)}
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
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 6 }}>
                      {asset.fileName || asset.assetId}
                    </div>
                    {/* Collage selection toggle */}
                    {(() => {
                      const aid = asset.assetId;
                      const inCollage  = collageSelection.has(aid);
                      const atMax      = collageSelection.size >= 4;
                      return (
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{
                            width: "100%",
                            marginBottom: 5,
                            fontSize: "0.68rem",
                            background: inCollage ? "var(--color-primary)" : "transparent",
                            color:      inCollage ? "#fff"                 : "var(--color-primary)",
                            border:     `1px solid var(--color-primary)`,
                            opacity:    (!inCollage && atMax) ? 0.45 : 1,
                          }}
                          disabled={!inCollage && atMax}
                          onClick={() => toggleCollagePhoto(aid)}
                        >
                          {inCollage ? "✓ In Collage / 已选" : "+ Use in Collage / 加入拼图"}
                        </button>
                      );
                    })()}
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
