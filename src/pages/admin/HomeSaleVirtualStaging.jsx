import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import {
  createSaleMediaAsset,
  extractHomeSaleDriveFileId,
  getHomeSaleListing,
  getSaleMediaByListingId,
  getSalePhotoData,
  getSaleSubfolderFiles,
  isHomeSaleApiConnected,
  uploadSaleToSubfolder,
} from "../../utils/homeSaleSheet";
import { VIRTUAL_STAGING_PRESETS, generateTrialStagedPhotoDataUrl } from "../../utils/virtualStagingTrial";
import { getStudioRequestAuth, isAdminSessionActive } from "../../utils/trialAccess";

function getAssetKey(asset) {
  return asset.assetId || extractHomeSaleDriveFileId(asset.driveUrl || asset.publicUrl || "") || asset.fileName || "";
}

function buildDriveFileUrl(fileId, fallback = "") {
  if (!fileId) return fallback;
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

function parseVirtualStagingMeta(notes = "") {
  const text = String(notes || "");
  return {
    sourceAssetId: (text.match(/sourceAssetId=([^|]+)/) || [])[1] || "",
    sourceReviewAssetId: (text.match(/sourceReviewAssetId=([^|]+)/) || [])[1] || "",
    preset: (text.match(/preset=([^|]+)/) || [])[1] || "",
  };
}

function buildReviewNotes({ sourceAssetId, preset }) {
  return `trial_virtual_staging_review|sourceAssetId=${sourceAssetId}|preset=${preset}`;
}

function buildPublicNotes({ sourceReviewAssetId, preset }) {
  return `trial_virtual_staging_public|sourceReviewAssetId=${sourceReviewAssetId}|preset=${preset}`;
}

function StagingPreviewCard({ asset, selected, onToggle, dataUrl, actionSlot, showCheckbox = false }) {
  const src = dataUrl || asset.publicUrl || asset.driveUrl || "";
  return (
    <div
      style={{
        width: 180,
        border: selected ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff",
        position: "relative",
      }}
    >
      {showCheckbox && (
        <label
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
            background: "rgba(255,255,255,0.96)",
            borderRadius: 999,
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.72rem",
            fontWeight: 700,
          }}
        >
          <input type="checkbox" checked={selected} onChange={() => onToggle(asset)} />
          Select
        </label>
      )}
      <div style={{ background: "#eff3f8", height: 116 }}>
        {src ? (
          <img
            src={src}
            alt={asset.fileName || "Virtual staging preview"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>🖼️</div>
        )}
      </div>
      <div style={{ padding: "10px 10px 12px" }}>
        <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#213128", marginBottom: 4, lineHeight: 1.4 }}>
          {asset.fileName || "Staged image"}
        </div>
        {asset.assetType && (
          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: 6 }}>
            {asset.assetType}
          </div>
        )}
        {actionSlot}
      </div>
    </div>
  );
}

export default function HomeSaleVirtualStaging() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [mediaRows, setMediaRows] = useState([]);
  const [photoDataUrls, setPhotoDataUrls] = useState({});
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [preset, setPreset] = useState("living-room");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stagingFolderUrl, setStagingFolderUrl] = useState("");

  const originalPhotoAssets = useMemo(
    () => mediaRows.filter((item) => item.assetType === "Photo" && item.assetRole !== "Virtual Staging"),
    [mediaRows]
  );

  const reviewStagedAssets = useMemo(
    () => mediaRows.filter((item) => item.assetType === "Virtual Staging"),
    [mediaRows]
  );

  const publicStagedAssets = useMemo(
    () => mediaRows.filter((item) => item.assetType === "Virtual Staging Public"),
    [mediaRows]
  );

  const publicReviewAssetIds = useMemo(
    () => new Set(publicStagedAssets.map((item) => parseVirtualStagingMeta(item.notes).sourceReviewAssetId).filter(Boolean)),
    [publicStagedAssets]
  );

  async function refresh() {
    const [listingRow, media] = await Promise.all([
      getHomeSaleListing(listingId),
      getSaleMediaByListingId(listingId),
    ]);
    setListing(listingRow);
    setMediaRows(media);
    try {
      const subfolder = await getSaleSubfolderFiles({
        listingId,
        subfolderName: "03_Virtual_Staging",
        ...getStudioRequestAuth("sale"),
      });
      setStagingFolderUrl(subfolder?.subfolderUrl || "");
    } catch {
      setStagingFolderUrl("");
    }
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message || "Failed to load virtual staging workflow."))
      .finally(() => setLoading(false));
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const targets = originalPhotoAssets.concat(reviewStagedAssets);
    if (!targets.length || !isHomeSaleApiConnected()) return;

    let active = true;
    (async () => {
      for (const asset of targets) {
        if (!active) break;
        const fileId = extractHomeSaleDriveFileId(asset.driveUrl || asset.publicUrl || "");
        const key = getAssetKey(asset);
        if (!fileId || !key || photoDataUrls[key]) continue;
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
        } catch {
          // leave thumbnail/public URL fallback
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId, originalPhotoAssets, reviewStagedAssets, photoDataUrls]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelected(asset) {
    const key = getAssetKey(asset);
    if (!key) return;
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
    setMessage("");
    setError("");
  }

  async function handleGenerate() {
    const selectedAssets = originalPhotoAssets.filter((asset) => selectedKeys.includes(getAssetKey(asset)));
    if (!selectedAssets.length) {
      setError("Please select at least one empty-room photo first.");
      return;
    }

    setRunning(true);
    setError("");
    setMessage("");

    const auth = getStudioRequestAuth("sale");
    let created = 0;
    const errors = [];

    for (const asset of selectedAssets) {
      try {
        const key = getAssetKey(asset);
        let sourceDataUrl = photoDataUrls[key] || asset.publicUrl || asset.driveUrl || "";
        const fileId = extractHomeSaleDriveFileId(asset.driveUrl || asset.publicUrl || "");

        if (!sourceDataUrl && fileId) {
          const result = await getSalePhotoData({ listingId, fileId, ...auth });
          sourceDataUrl = `data:${result.mimeType || "image/jpeg"};base64,${result.data}`;
        }
        if (!sourceDataUrl) throw new Error("No source image data available.");

        const stagedDataUrl = await generateTrialStagedPhotoDataUrl(sourceDataUrl, preset);
        const base64 = stagedDataUrl.split(",")[1];
        const sourceName = (asset.fileName || `photo-${created + 1}`).replace(/\.[^.]+$/, "");
        const fileName = `virtual_staging__${sourceName}__${preset}__${Date.now()}.jpg`;

        const upload = await uploadSaleToSubfolder({
          listingId,
          subfolderName: "03_Virtual_Staging",
          fileName,
          mimeType: "image/jpeg",
          data: base64,
          ...auth,
        });

        const driveUrl = buildDriveFileUrl(upload?.fileId, upload?.url || "");
        await createSaleMediaAsset({
          listingId,
          assetType: "Virtual Staging",
          assetRole: "Virtual Staging",
          fileName,
          driveUrl,
          publicUrl: driveUrl,
          sortOrder: asset.sortOrder || "",
          captionEn: `Trial virtual staging (${preset})`,
          altText: `Trial virtual staging for ${listing?.address || listingId}`,
          notes: buildReviewNotes({ sourceAssetId: asset.assetId || key, preset }),
        });

        created += 1;
      } catch (err) {
        errors.push(`${asset.fileName || asset.assetId || "photo"}: ${err.message}`);
      }
    }

    await refresh();
    setRunning(false);

    if (errors.length) {
      setError(errors.join(" | "));
    }
    if (created > 0) {
      setMessage(`${created} staged image(s) saved to 03_Virtual_Staging/. Originals unchanged.`);
      setSelectedKeys([]);
    }
  }

  async function handleUseInPublicListing(asset) {
    const reviewAssetId = asset.assetId || "";
    if (!reviewAssetId || publicReviewAssetIds.has(reviewAssetId)) return;

    const maxSort = mediaRows.reduce((max, item) => {
      if (item.assetType !== "Photo" && item.assetType !== "Virtual Staging Public") return max;
      const next = Number(item.sortOrder || 0);
      return Number.isFinite(next) ? Math.max(max, next) : max;
    }, 0);

    setError("");
    setMessage("");
    try {
      await createSaleMediaAsset({
        listingId,
        assetType: "Virtual Staging Public",
        assetRole: "Virtual Staging",
        fileName: asset.fileName,
        driveUrl: asset.driveUrl,
        publicUrl: asset.publicUrl,
        sortOrder: String(maxSort + 1),
        captionEn: asset.captionEn || "Virtual staging trial image",
        captionCn: asset.captionCn || "",
        altText: asset.altText || `Virtual staging for ${listing?.address || listingId}`,
        notes: buildPublicNotes({ sourceReviewAssetId: reviewAssetId, preset: parseVirtualStagingMeta(asset.notes).preset || preset }),
      });
      await refresh();
      setMessage("Selected staged image added to the public sale gallery. Original photos remain unchanged.");
    } catch (err) {
      setError(err.message || "Failed to add staged image to the public listing.");
    }
  }

  const isAdmin = isAdminSessionActive();

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading virtual staging…</div>;
  }

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.45rem" }}>Virtual Staging / 试用虚拟布置</h1>
          <p className="text-muted text-sm">{listingId}{listing?.address ? ` — ${listing.address}` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href={listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn--ghost btn--sm"
          >
            Open Public Preview
          </a>
          <Link to={`/admin/home-sale/media/${listingId}`} className="btn btn--ghost btn--sm">
            ← Back to Photo Assets
          </Link>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      <div className="notice notice--info" style={{ marginBottom: 20 }}>
        <h4>Internal Trial Only</h4>
        <p>This workflow creates separate staged concept images for review. Originals are never overwritten. Nothing is added to the public listing unless you click <strong>Use in Public Listing</strong>.</p>
      </div>

      {message && (
        <div className="notice notice--success">
          <p>{message}</p>
        </div>
      )}

      {error && (
        <div className="notice notice--error">
          <p>{error}</p>
        </div>
      )}

      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
              🛋 Select Empty-Room Photos
            </h3>
            <p className="text-muted text-sm">Choose one or more sale photos to create separate staged review versions.</p>
          </div>
          <div style={{ minWidth: 220 }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: 6 }}>
              Trial staging preset
            </label>
            <select className="form-control" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {VIRTUAL_STAGING_PRESETS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {originalPhotoAssets.length === 0 ? (
          <p className="text-muted text-sm">No original sale photos available yet.</p>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {originalPhotoAssets.map((asset) => {
                const key = getAssetKey(asset);
                return (
                  <StagingPreviewCard
                    key={key}
                    asset={asset}
                    selected={selectedKeys.includes(key)}
                    onToggle={toggleSelected}
                    dataUrl={photoDataUrls[key] || ""}
                    showCheckbox
                  />
                );
              })}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn btn--primary" disabled={running || selectedKeys.length === 0} onClick={handleGenerate}>
                {running ? "Generating staged previews…" : "Virtual Staging"}
              </button>
              <span className="text-muted text-sm">
                {selectedKeys.length} selected · output folder: <code>03_Virtual_Staging/</code>
              </span>
            </div>
          </>
        )}
      </div>

      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
              🧪 Staged Review Images
            </h3>
            <p className="text-muted text-sm">Saved to Drive and written back to listing assets as review-only staged rows.</p>
          </div>
          {isAdmin && stagingFolderUrl && (
            <a href={stagingFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              Open 03_Virtual_Staging ↗
            </a>
          )}
        </div>

        {reviewStagedAssets.length === 0 ? (
          <p className="text-muted text-sm">No staged review images yet.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {reviewStagedAssets.map((asset) => {
              const key = getAssetKey(asset);
              const alreadyPublic = publicReviewAssetIds.has(asset.assetId || "");
              const meta = parseVirtualStagingMeta(asset.notes);
              return (
                <StagingPreviewCard
                  key={key}
                  asset={asset}
                  selected={false}
                  dataUrl={photoDataUrls[key] || ""}
                  actionSlot={(
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        Preset: {meta.preset || "trial"}
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={alreadyPublic}
                        onClick={() => handleUseInPublicListing(asset)}
                      >
                        {alreadyPublic ? "Already in Public Listing" : "Use in Public Listing"}
                      </button>
                    </div>
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 12 }}>
          🌐 Public Listing Staged Images
        </h3>
        <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
          These staged images were explicitly approved for the public sale gallery. Original photos stay in place.
        </p>
        {publicStagedAssets.length === 0 ? (
          <p className="text-muted text-sm">No staged images are currently enabled for public listing.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {publicStagedAssets.map((asset) => (
              <StagingPreviewCard
                key={getAssetKey(asset)}
                asset={asset}
                selected={false}
                dataUrl=""
                actionSlot={<span style={{ fontSize: "0.72rem", color: "#3e5b4b", fontWeight: 700 }}>Public Gallery Enabled</span>}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
