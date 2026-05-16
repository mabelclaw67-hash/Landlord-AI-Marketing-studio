import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { isApiConnected } from "../../utils/api";
import { extractHomeSaleDriveFileId, getHomeSaleListing, getSaleMediaByListingId, getSalePhotoData, getSaleSubfolderFiles, uploadSaleEnhancedPhoto } from "../../utils/homeSaleSheet";
import { getStudioRequestAuth, isAdminSessionActive } from "../../utils/trialAccess";

function extractFolderId(link) {
  if (!link) return null;
  const m = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function sortByFilenameNumber(files) {
  return [...files].sort((a, b) => {
    const n = s => { const m = s.match(/^(\d+)/); return m ? Number(m[1]) : Infinity; };
    return n(a.name) - n(b.name);
  });
}

function PhotoThumb({ file }) {
  const [failed, setFailed] = useState(false);
  const src = file.dataUrl || file.thumbUrl || `https://drive.google.com/thumbnail?id=${file.fileId}&sz=w400`;
  return (
    <div style={{ border: "1.5px solid var(--color-border)", borderRadius: 8, overflow: "hidden", flexShrink: 0, width: 140 }}>
      {!failed ? (
        <img src={src} alt={file.name} onError={() => setFailed(true)}
          style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: 90, background: "#EFF3F8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1.3rem" }}>🖼️</span>
          <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.3, padding: "0 4px" }}>{file.name}</span>
        </div>
      )}
      <div style={{ padding: "4px 6px", borderTop: "1px solid var(--color-border)", fontSize: "0.68rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {file.name}
      </div>
    </div>
  );
}

export default function HomeSalePhotoEnhance() {
  const { listingId } = useParams();
  const listingRef = useRef(null);

  const [listing, setListing]     = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [error, setError]         = useState("");

  // Enhancement state
  const [enhanceStatus,   setEnhanceStatus]   = useState("idle");
  const [enhanceProgress, setEnhanceProgress] = useState({ done: 0, total: 0 });
  const [enhanceMsg,      setEnhanceMsg]      = useState(null);
  const [enhancedFolderUrl, setEnhancedFolderUrl] = useState(null);
  const [enhancedFolderId,  setEnhancedFolderId]  = useState(null);
  const [enhancedPhotos,    setEnhancedPhotos]    = useState([]);
  const [enhancedLoading,   setEnhancedLoading]   = useState(false);

  useEffect(() => {
    getHomeSaleListing(listingId)
      .then((row) => {
        setListing(row);
        listingRef.current = row;
        loadFolderFiles();
        const fid = extractFolderId(row?.googleDriveFolderUrl);
        loadEnhancedPhotos();
      })
      .catch((err) => setError(err.message || "Failed to load listing."));
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFolderFiles() {
    setFolderLoading(true);
    try {
      const rows = await getSaleMediaByListingId(listingId);
      const photos = rows
        .filter((item) => !item.assetType || item.assetType === "Photo")
        .map((item) => {
          const fileId = extractHomeSaleDriveFileId(item.driveUrl || "");
          return {
            fileId,
            name: item.fileName || item.assetRole || item.assetId || "photo",
            // drive.google.com/thumbnail works for img tag display without CORS.
            // Enhancement fetches full data via backend (getSalePhotoData) to avoid CDN rate limits.
            thumbUrl: fileId
              ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
              : (item.publicUrl || ""),
          };
        })
        .filter((f) => f.fileId || f.thumbUrl);
      setFolderFiles(sortByFilenameNumber(photos));
    } catch {
      setFolderFiles([]);
    } finally {
      setFolderLoading(false);
    }
  }

  async function loadEnhancedPhotos() {
    setEnhancedLoading(true);
    try {
      const result = await getSaleSubfolderFiles({
        listingId,
        subfolderName: "02_AI_Enhanced_Photos",
        ...getStudioRequestAuth("sale"),
      });
      const files = (result?.files || []).map((f) => ({
        ...f,
        thumbUrl: `https://drive.google.com/thumbnail?id=${f.fileId}&sz=w400`,
      }));
      setEnhancedPhotos(files);
      setEnhancedFolderId(result?.subfolderFolderId || "");
      setEnhancedFolderUrl(result?.subfolderUrl || "");
    } catch {
      setEnhancedPhotos([]);
      setEnhancedFolderId("");
      setEnhancedFolderUrl("");
    } finally {
      setEnhancedLoading(false);
    }
  }

  async function runLightEnhancementBatch() {
    const folderId = extractFolderId(listing?.googleDriveFolderUrl);
    if (!folderId || folderFiles.length === 0) return;
    setEnhanceStatus("running");
    setEnhanceMsg(null);
    setEnhanceProgress({ done: 0, total: folderFiles.length });

    let done = 0;
    const errors = [];
    let capturedFolderUrl = null;
    let capturedFolderId  = null;
    const uploadedPhotos  = [];

    for (const photo of folderFiles) {
      const src = photo.dataUrl || photo.thumbUrlLg || photo.thumbUrl;
      if (!src) {
        errors.push(`${photo.name}: no image data`);
        done++;
        setEnhanceProgress({ done, total: folderFiles.length });
        continue;
      }

      try {
        // Fetch full image data via backend — avoids CDN rate limits and CORS issues entirely.
        let resolvedSrc = src;
        if (photo.fileId) {
          const result = await getSalePhotoData({
            listingId,
            fileId: photo.fileId,
            ...getStudioRequestAuth("sale"),
          });
          resolvedSrc = `data:${result.mimeType};base64,${result.data}`;
        } else if (!src.startsWith("data:")) {
          const resp = await fetch(src, { credentials: "omit" });
          if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
          const blob = await resp.blob();
          resolvedSrc = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });
        }

        const dataUrl = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.filter = "brightness(1.16) contrast(1.12) saturate(1.10)";
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.92));
          };
          img.onerror = () => reject(new Error("Image load failed"));
          img.src = resolvedSrc; // data URL: same-origin, no crossOrigin needed
        });

        const base64   = dataUrl.split(",")[1];
        const baseName = photo.name.replace(/\.[^.]+$/, "");
        const fileName = `enhanced__${baseName}.jpg`;

        const res = await uploadSaleEnhancedPhoto({
          listingId,
          fileName,
          mimeType: "image/jpeg",
          data:     base64,
          ...getStudioRequestAuth("sale"),
        });
        if (res?.subfolderUrl      && !capturedFolderUrl) capturedFolderUrl = res.subfolderUrl;
        if (res?.subfolderFolderId && !capturedFolderId)  capturedFolderId  = res.subfolderFolderId;
        if (res?.fileId) {
          uploadedPhotos.push({
            fileId:   res.fileId,
            name:     res.fileName || photo.name,
            // Use the canvas output we already have — Drive thumbnail takes time to generate for new files.
            dataUrl,
            thumbUrl: `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w400`,
          });
        }
      } catch (err) {
        errors.push(`${photo.name}: ${err.message}`);
      }

      done++;
      setEnhanceProgress({ done, total: folderFiles.length });
    }

    if (capturedFolderUrl) setEnhancedFolderUrl(capturedFolderUrl);
    if (capturedFolderId)  setEnhancedFolderId(capturedFolderId);
    // Show instantly from canvas output, then reload from Drive (deduped list after overwrite).
    if (uploadedPhotos.length > 0) setEnhancedPhotos(uploadedPhotos);
    loadEnhancedPhotos();

    if (errors.length === 0) {
      setEnhanceStatus("done");
      setEnhanceMsg(`${done} enhanced copies saved to 02_AI_Enhanced_Photos/.`);
    } else {
      setEnhanceStatus(done === errors.length ? "error" : "done");
      setEnhanceMsg(`${done - errors.length} succeeded. Errors: ${errors.join("; ")}`);
    }
  }

  const folderId = extractFolderId(listing?.googleDriveFolderUrl);
  const apiReady = isApiConnected();
  const isAdmin = isAdminSessionActive();

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Photo Enhancement / 照片美化</h1>
          <p className="text-muted text-sm">{listingId}</p>
        </div>
        <div className="flex gap-8">
          <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost">Edit Listing</Link>
          <a
            href={listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`}
            target="_blank" rel="noreferrer" className="btn btn--ghost"
          >
            Public Page
          </a>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {error && (
        <div className="notice notice--error"><h4>Error</h4><p>{error}</p></div>
      )}

      {!folderId && listing && (
        <div className="notice notice--warm" style={{ marginBottom: 20 }}>
          <h4>{isAdmin ? "Google Drive Folder Not Set / 未设置 Drive 文件夹" : "照片尚未上传 / Photos Not Yet Uploaded"}</h4>
          <p>
            {isAdmin
              ? "请先在 Edit Listing 页面填写 Google Drive Folder URL，才能读取照片或运行美化批次。"
              : "请先在 Original Photos 页面上传照片，上传完成后才能进行照片美化。"}
          </p>
          <p style={{ marginTop: 6, opacity: 0.86 }}>
            {isAdmin
              ? "Set the Google Drive Folder URL in Edit Listing to enable photo loading and enhancement."
              : "Upload photos on the Original Photos page first, then return here to enhance them."}
          </p>
          <Link
            to={isAdmin ? `/admin/home-sale/listings/${listingId}/edit` : `/admin/home-sale/media/${listingId}`}
            className="btn btn--ghost btn--sm"
            style={{ marginTop: 10 }}
          >
            {isAdmin ? "Edit Listing →" : "Go to Original Photos →"}
          </Link>
        </div>
      )}

      {/* Original Photos */}
      {folderId && (
        <div className="card mb-24">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
              📸 Property Photos / 房源照片
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              {isAdmin && listing?.googleDriveFolderUrl && (
                <a href={listing.googleDriveFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                  📁 Open Drive Folder
                </a>
              )}
              <button
                className="btn btn--ghost btn--sm"
                disabled={folderLoading}
                onClick={() => loadFolderFiles()}
              >
                {folderLoading ? "Loading…" : "↺ Refresh"}
              </button>
            </div>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 14 }}>
            Reading from Drive. Original files are not modified. / 读取 Drive 文件夹，原始文件不变。
          </p>

          {folderLoading && (
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>Loading photos from Drive…</p>
          )}

          {!folderLoading && folderFiles.length === 0 && (
            <div className="notice notice--warn">
              <p>No photos found in the Drive folder. Make sure the folder contains JPG/PNG files and is shared with the Apps Script service account.</p>
            </div>
          )}

          {!folderLoading && folderFiles.length > 0 && (
            <>
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 12 }}>
                {folderFiles.length} photo{folderFiles.length !== 1 ? "s" : ""} found.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {folderFiles.map((f) => <PhotoThumb key={f.fileId} file={f} />)}
              </div>
            </>
          )}

          {/* ── Light Enhancement Batch ── */}
          {!folderLoading && folderFiles.length > 0 && (
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 16 }}>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>
                ✨ Light Enhancement Batch / 轻度美化批次
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 8, lineHeight: 1.7 }}>
                <strong>{folderFiles.length}</strong> photo{folderFiles.length !== 1 ? "s" : ""} will be processed.
                Enhanced copies → <code>02_AI_Enhanced_Photos/</code> — originals unchanged.
                <br />
                <span style={{ fontSize: "0.78rem" }}>
                  全部 {folderFiles.length} 张照片将进行轻度美化，副本保存至 <code>02_AI_Enhanced_Photos/</code>，原始文件不变。
                </span>
              </p>
              <div className="notice notice--info" style={{ marginBottom: 12 }}>
                <p style={{ fontSize: "0.8rem", lineHeight: 1.8 }}>
                  <strong>Allowed adjustments only:</strong> brightness · contrast · color balance · clarity<br />
                  Must <strong>not</strong> alter layout, furniture, fixtures, view, condition, or any factual property feature.<br />
                  <span style={{ opacity: 0.85 }}>
                    仅限亮度、对比度、色彩平衡、清晰度。不得修改布局、家具、固定设施、景观、状况或任何真实房源特征。
                  </span>
                </p>
              </div>

              {enhanceStatus === "idle" && (
                <button
                  className="btn btn--primary btn--sm"
                  disabled={!apiReady}
                  onClick={runLightEnhancementBatch}
                >
                  ✨ Run Light Enhancement Batch
                </button>
              )}
              {enhanceStatus === "running" && (
                <div style={{ fontSize: "0.85rem", color: "var(--color-primary)" }}>
                  Processing photo {enhanceProgress.done + 1} of {enhanceProgress.total}…
                  <span style={{ marginLeft: 8, opacity: 0.65 }}>
                    ({Math.round((enhanceProgress.done / enhanceProgress.total) * 100)}%)
                  </span>
                </div>
              )}
              {enhanceStatus === "done" && (
                <div>
                  <div className="notice notice--success" style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: "0.82rem" }}>✅ {enhanceMsg}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => { setEnhanceStatus("idle"); setEnhanceMsg(null); }}>
                      Run Again
                    </button>
                    {isAdmin && enhancedFolderUrl && (
                      <a href={enhancedFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                        📂 Open Enhanced Photos Folder
                      </a>
                    )}
                  </div>
                </div>
              )}
              {enhanceStatus === "error" && (
                <div>
                  <div className="notice notice--warning" style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: "0.82rem" }}>⚠️ {enhanceMsg}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => { setEnhanceStatus("idle"); setEnhanceMsg(null); }}>
                      Try Again
                    </button>
                    {isAdmin && enhancedFolderUrl && (
                      <a href={enhancedFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                        📂 Open Enhanced Photos Folder
                      </a>
                    )}
                  </div>
                </div>
              )}
              {!apiReady && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 6 }}>
                  Requires API connection (VITE_STUDIO_EXEC_URL).
                </p>
              )}
            </div>
          )}

          {/* ── Enhanced Photos Preview ── */}
          {!folderLoading && (
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>🖼️ Enhanced Photos Preview / 美化照片预览</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {isAdmin && enhancedFolderUrl && (
                    <a href={enhancedFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                      📂 Open Folder
                    </a>
                  )}
                  {enhancedFolderId && (
                    <button className="btn btn--ghost btn--sm" disabled={enhancedLoading}
                      onClick={() => loadEnhancedPhotos()}>
                      {enhancedLoading ? "Loading…" : "↺ Refresh Enhanced Photos"}
                    </button>
                  )}
                </div>
              </div>
              {enhancedLoading && (
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>Loading enhanced photos…</p>
              )}
              {!enhancedLoading && enhancedPhotos.length === 0 && (
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                  No enhanced photos found yet.
                  <br /><span style={{ fontSize: "0.78rem" }}>暂未找到美化照片。</span>
                </p>
              )}
              {!enhancedLoading && enhancedPhotos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {enhancedPhotos.map((f) => (
                    <div key={f.fileId} style={{ width: 150, border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                      {(f.dataUrl || f.thumbUrl) ? (
                        <img src={f.dataUrl || f.thumbUrl} alt={f.name}
                          style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: 100, background: "#EFF3F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "1.5rem" }}>🖼️</span>
                        </div>
                      )}
                      <div style={{ padding: "4px 7px", borderTop: "1px solid var(--color-border)", fontSize: "0.68rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {f.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 12 }}>
          📋 Workflow Navigation
        </h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/admin/home-sale/media/${listingId}`} className="btn btn--ghost btn--sm">
            ← Original Photos
          </Link>
          <Link to={`/admin/home-sale/cover/${listingId}`} className="btn btn--ghost btn--sm">
            Cover Image →
          </Link>
        </div>
      </div>
    </div>
  );
}
