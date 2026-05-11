import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { t } from "../../translations";
import { getListing, saveListing, getListingFolderFiles, uploadToSubfolder } from "../../utils/storage";
import { generateOutputs } from "../../utils/generateContent";
import { isApiConnected } from "../../utils/api";
import PrototypeBanner from "../../components/PrototypeBanner";

const TAB_LABELS = {
  "Facebook Post":        "📘 Facebook",
  "Craigslist Ad":        "📋 Craigslist",
  "WeChat Post":          "💬 WeChat / 微信",
  "Short Video Script":   "🎬 Video Script / 视频脚本",
  "Owner Summary":        "📄 Owner Summary / 房东摘要",
  "English Rental Ad":    "🇬🇧 English Ad",
  "Chinese Owner Summary":"🇨🇳 Chinese / 中文",
};

const MAX_FILE_MB = 8;

// ── Pure helpers (outside component — stable identity, no remount risk) ───────

function extractFolderId(link) {
  if (!link) return null;
  const m = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Cover = first file (numeric alpha order) whose name starts with "1".
// Falls back to first file if none match.
function detectCoverPhoto(files) {
  if (!files || files.length === 0) return { coverFile: null, isFallback: false };
  const candidates = files
    .filter((f) => /^1/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (candidates.length > 0) return { coverFile: candidates[0], isFallback: false };
  return { coverFile: files[0], isFallback: true };
}

// Simple thumbnail + "Open in Drive" card — read-only display.
function DrivePhoto({ file }) {
  const [failed, setFailed] = useState(false);
  // Prefer thumbUrlLg (w1600) for the large cover display, fall back to thumbUrl, then build from fileId.
  const src = file.thumbUrlLg
    || file.thumbUrl
    || `https://drive.google.com/thumbnail?id=${file.fileId}&sz=w1600`;
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 7, overflow: "hidden", width: 130, flexShrink: 0 }}>
      {!failed ? (
        <img src={src} alt={file.name} onError={() => setFailed(true)}
          style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: 90, background: "#EFF3F8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 6px" }}>
          <span style={{ fontSize: "1.4rem", marginBottom: 2 }}>🖼️</span>
          <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.3 }}>{file.name}</span>
        </div>
      )}
      <div style={{ padding: "5px 7px", borderTop: "1px solid var(--color-border)" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>
          {file.name}
        </div>
        <a href={file.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: "0.68rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
          Open in Drive ↗
        </a>
      </div>
    </div>
  );
}

// Marketplace photo card with order, exclude, and cover-select controls.
function PackagePhoto({ file, isFirst, isLast, isExcluded, isCover, coverIsManual,
  onMoveUp, onMoveDown, onExclude, onSetCover }) {
  const [failed, setFailed] = useState(false);
  // Prefer thumbUrl (w800) for grid cards; fall back to building from fileId.
  const src = file.thumbUrl
    || `https://drive.google.com/thumbnail?id=${file.fileId}&sz=w800`;
  const btnStyle = {
    fontSize: "0.62rem", padding: "2px 6px",
    border: "1px solid var(--color-border)", borderRadius: 3,
    background: "none", cursor: "pointer", lineHeight: 1.4,
  };
  return (
    <div style={{
      border: `1.5px solid ${isCover ? (coverIsManual ? "#f59e0b" : "var(--color-primary)") : isExcluded ? "#fca5a5" : "var(--color-border)"}`,
      borderRadius: 7, overflow: "hidden", width: 140, flexShrink: 0,
      opacity: isExcluded ? 0.45 : 1, position: "relative",
    }}>
      {/* Badges */}
      {isCover && (
        <div style={{
          position: "absolute", top: 4, left: 4, zIndex: 1,
          background: coverIsManual ? "#f59e0b" : "var(--color-primary)",
          color: "#fff", fontSize: "0.58rem", padding: "1px 5px",
          borderRadius: 3, fontWeight: 700, lineHeight: 1.6,
        }}>
          {coverIsManual ? "MANUAL COVER" : "AUTO COVER"}
        </div>
      )}
      {isExcluded && (
        <div style={{
          position: "absolute", top: 4, right: 4, zIndex: 1,
          background: "#ef4444", color: "#fff", fontSize: "0.58rem",
          padding: "1px 5px", borderRadius: 3, fontWeight: 700, lineHeight: 1.6,
        }}>
          EXCLUDED
        </div>
      )}
      {/* Thumbnail */}
      {!failed ? (
        <img src={src} alt={file.name} onError={() => setFailed(true)}
          style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: 90, background: "#EFF3F8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 6px" }}>
          <span style={{ fontSize: "1.4rem", marginBottom: 2 }}>🖼️</span>
          <span style={{ fontSize: "0.58rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.3, wordBreak: "break-all" }}>{file.name}</span>
        </div>
      )}
      {/* Filename + link */}
      <div style={{ padding: "4px 6px", borderTop: "1px solid var(--color-border)" }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
          {file.name}
        </div>
        <a href={file.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: "0.65rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
          Open ↗
        </a>
      </div>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: "5px 6px", borderTop: "1px solid var(--color-border)", background: "#fafbfc" }}>
        <button style={btnStyle} onClick={onMoveUp}  disabled={isFirst  || isExcluded} title="Move up">↑</button>
        <button style={btnStyle} onClick={onMoveDown} disabled={isLast   || isExcluded} title="Move down">↓</button>
        <button
          style={{ ...btnStyle, background: isCover && coverIsManual ? "#fef9c3" : "none", color: isCover && coverIsManual ? "#92400e" : "inherit" }}
          onClick={onSetCover}
          disabled={isCover && coverIsManual}
          title="Set as cover photo"
        >
          {isCover && coverIsManual ? "Cover ✓" : "Set Cover"}
        </button>
        <button
          style={{ ...btnStyle, color: isExcluded ? "#dc2626" : "inherit", background: isExcluded ? "#fef2f2" : "none" }}
          onClick={onExclude}
          title={isExcluded ? "Restore to package" : "Exclude from package"}
        >
          {isExcluded ? "Restore" : "Exclude"}
        </button>
      </div>
    </div>
  );
}

function CopyButton({ text, lang }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handle} className="btn btn--ghost btn--sm">
      {copied ? t(lang, "detail.copied") : t(lang, "detail.copyBtn")}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ListingDetail({ lang }) {
  const { id } = useParams();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [listing,       setListing]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [activeTab,     setActiveTab]     = useState(null);
  const [saving,        setSaving]        = useState(false);

  // Upload state
  const [uploading,      setUploading]      = useState(false);
  const [uploadMsg,      setUploadMsg]      = useState(null);
  const [previews,       setPreviews]       = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Photo state
  const [folderFiles,   setFolderFiles]   = useState([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [photoOrder,    setPhotoOrder]    = useState([]);   // fileId[]
  const [excluded,      setExcluded]      = useState(new Set()); // Set<fileId>
  const [manualCover,   setManualCover]   = useState(null); // fileId | null

  // Copy edit state (local only — no "03 Generated Copy" write path exists yet)
  const [editedCopy,   setEditedCopy]   = useState({});   // {key: savedDraftText}
  const [copyEditMode, setCopyEditMode] = useState(null);  // key being edited, or null
  const [editingText,  setEditingText]  = useState("");    // live textarea value

  // Listing info edit state
  const [infoEditMode, setInfoEditMode] = useState(false);
  const [infoSaving,   setInfoSaving]   = useState(false);
  const [infoEdited,   setInfoEdited]   = useState(false); // true after any save this session
  const [infoDraft,    setInfoDraft]    = useState({});    // live field values while editing

  // Copy regeneration state
  const [regenerating, setRegenerating] = useState(false);

  // ── Load listing ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getListing(id)
      .then((l) => {
        setListing(l);
        if (!l) { setError("Listing not found."); return; }
        const fid = extractFolderId(l.driveFolderLink);
        if (fid) loadFolderFiles(fid);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const loadFolderFiles = async (folderId) => {
    setFolderLoading(true);
    try {
      const files = await getListingFolderFiles(folderId);
      const resolved = files || [];
      setFolderFiles(resolved);
      setPhotoOrder(resolved.map((f) => f.fileId));
    } catch {
      setFolderFiles([]);
      setPhotoOrder([]);
    } finally {
      setFolderLoading(false);
    }
  };

  // ── Sheet persist helpers ────────────────────────────────────────────────────
  const persist = async (updated) => {
    setSaving(true);
    try {
      await saveListing(updated);
      setListing(updated);
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateReviewStatus  = (key, val) => persist({ ...listing, reviewStatus:   { ...listing.reviewStatus,   [key]: val } });
  const updateComplianceFlag = (key, val) => persist({ ...listing, complianceFlag: { ...listing.complianceFlag, [key]: val } });
  const updateOverallStatus  = (val)      => persist({ ...listing, status: val });

  const toggleMediaCheck = (i) => {
    const mc = [...(listing.mediaChecklist || [false, false, false, false])];
    mc[i] = !mc[i];
    persist({ ...listing, mediaChecklist: mc });
  };

  // ── Photo review helpers ─────────────────────────────────────────────────────
  const movePhoto = (fileId, dir) => {
    setPhotoOrder((prev) => {
      const idx = prev.indexOf(fileId);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const toggleExclude = (fileId) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  // ── Copy edit helpers ────────────────────────────────────────────────────────
  const startEditCopy = (key) => {
    setCopyEditMode(key);
    setEditingText(editedCopy[key] ?? listing.outputs?.[key] ?? "");
  };

  const saveDraftCopy = () => {
    setEditedCopy((prev) => ({ ...prev, [copyEditMode]: editingText }));
    setCopyEditMode(null);
  };

  const cancelEditCopy = () => {
    setCopyEditMode(null);
    setEditingText("");
  };

  const resetCopy = (key) => {
    setEditedCopy((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  // ── Listing info edit helpers ────────────────────────────────────────────────
  const startEditInfo = () => {
    setInfoDraft({
      available: listing.available  || "",
      rent:      String(listing.rent      || ""),
      bedrooms:  String(listing.bedrooms  || ""),
      bathrooms: String(listing.bathrooms || ""),
      utilities: listing.utilities || "",
      pets:      listing.pets      || "",
      parking:   listing.parking   || "",
      features:  listing.features  || "",
    });
    setInfoEditMode(true);
  };

  const cancelEditInfo = () => { setInfoEditMode(false); setInfoDraft({}); };

  const saveInfoToSheet = async () => {
    setInfoSaving(true);
    try {
      const updated = { ...listing, ...infoDraft };
      await saveListing(updated);
      setListing(updated);
      setInfoEdited(true);
      setInfoEditMode(false);
      setInfoDraft({});
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setInfoSaving(false);
    }
  };

  const resetInfoToSheet = async () => {
    cancelEditInfo();
    try {
      const fresh = await getListing(id);
      if (fresh) { setListing(fresh); setInfoEdited(false); }
    } catch (e) {
      alert("Reload failed: " + e.message);
    }
  };

  // ── Regenerate copy ──────────────────────────────────────────────────────────
  const regenerateCopy = async () => {
    setRegenerating(true);
    try {
      const newOutputs = generateOutputs(listing);
      const updated = { ...listing, outputs: newOutputs };
      await saveListing(updated);
      setListing(updated);
      setEditedCopy({}); // clear local copy drafts — fresh copy now in listing state
      setInfoEdited(false);
    } catch (e) {
      alert("Regenerate failed: " + e.message);
    } finally {
      setRegenerating(false);
    }
  };

  // ── Upload helpers ───────────────────────────────────────────────────────────
  const MAX_BATCH = 10;

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const batch = selected.slice(0, MAX_BATCH);
    const oversized = batch.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversized) {
      setUploadMsg({ type: "error", text: `"${oversized.name}" exceeds the ${MAX_FILE_MB} MB limit.` });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const urls = batch.map((f) => URL.createObjectURL(f));
    setPreviews(urls.map((url, i) => ({ url, name: batch[i].name })));
    setUploadMsg(null);
    uploadBatch(batch, urls);
  };

  const uploadBatch = async (files, objectUrls) => {
    const folderId = extractFolderId(listing.driveFolderLink);
    if (!folderId) return;
    setUploading(true);
    setUploadProgress(null);
    const errors = [];
    let succeeded = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${files.length}…`);
      try {
        await uploadToSubfolder(folderId, "", files[i]);
        succeeded++;
      } catch (err) {
        errors.push(`${files[i].name}: ${err.message}`);
      }
    }
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
    setUploadProgress(null);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (errors.length > 0 && succeeded === 0) {
      setUploadMsg({ type: "error", text: `Upload failed. ${errors[0]}` });
    } else if (errors.length > 0) {
      setUploadMsg({ type: "success", text: `Uploaded ${succeeded}. ${errors.length} failed: ${errors[0]}` });
    } else {
      setUploadMsg({ type: "success", text: `Uploaded ${succeeded} file(s) successfully.` });
    }
    if (succeeded > 0) await loadFolderFiles(folderId);
  };

  // ── Render guards ────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading listing…</div>;
  }
  if (error || !listing) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>{error || "Listing not found."}</p>
        <Link to="/admin" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>← Dashboard</Link>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const outputKeys = Object.keys(listing.outputs || {});
  const currentTab = activeTab || outputKeys[0];

  // Build ordered + filtered photo arrays for all package sections
  const orderedPhotos = photoOrder.map((fid) => folderFiles.find((f) => f.fileId === fid)).filter(Boolean);
  const activePhotos  = orderedPhotos.filter((f) => !excluded.has(f.fileId));

  // Effective cover: manual selection takes priority over auto-detect
  let effectiveCover, coverIsManual, coverIsFallback;
  if (manualCover) {
    effectiveCover  = folderFiles.find((f) => f.fileId === manualCover) || null;
    coverIsManual   = true;
    coverIsFallback = false;
  } else {
    const ci = detectCoverPhoto(activePhotos);
    effectiveCover  = ci.coverFile;
    coverIsManual   = false;
    coverIsFallback = ci.isFallback;
  }

  const statusBadgeClass = {
    Draft: "badge--draft", "In Review": "badge--review",
    "Ready to Publish": "badge--ready", Published: "badge--published",
  };

  const mediaItems = [t(lang, "detail.m1"), t(lang, "detail.m2"), t(lang, "detail.m3"), t(lang, "detail.m4")];

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PrototypeBanner lang={lang} />

      {/* Header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.4rem" }}>{t(lang, "detail.title")}</h1>
          <p className="text-muted text-sm">{listing.id} — {listing.address}, {listing.city}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {saving && <span className="text-muted text-sm">Saving…</span>}
          <span className={`badge ${statusBadgeClass[listing.status] || "badge--draft"}`}>{listing.status}</span>
          <select className="select-control" value={listing.status}
            onChange={(e) => updateOverallStatus(e.target.value)} disabled={saving}>
            {["Draft", "In Review", "Ready to Publish", "Published"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <a href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer"
            className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}>
            🔗 Open Public Listing Preview
          </a>
          <Link to="/admin" className="btn btn--ghost btn--sm">← Dashboard</Link>
        </div>
      </div>

      {/* Property Info */}
      <div className="card mb-24">
        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            🏠 {t(lang, "detail.propertyInfo")}
          </h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {infoEdited && !infoEditMode && (
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#16a34a", border: "1px solid #86efac", borderRadius: 4, padding: "1px 7px" }}>
                ✅ Saved to Sheet
              </span>
            )}
            {!infoEditMode && (
              <button className="btn btn--ghost btn--sm" onClick={startEditInfo}>
                ✏️ Edit Listing Info
              </button>
            )}
          </div>
        </div>

        {infoEditMode ? (
          /* ── Edit mode ──────────────────────────────────────────────────── */
          <>
            <div className="notice notice--info" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: "0.8rem" }}>
                Editing will update the Google Sheet row for {listing.id}. No new columns or rows will be created.
              </p>
            </div>
            <div className="info-grid">
              {/* Editable fields */}
              {[
                ["Available Date", "available", "text"],
                ["Rent ($/mo)", "rent", "number"],
                ["Bedrooms", "bedrooms", "number"],
                ["Bathrooms", "bathrooms", "number"],
                ["Utilities", "utilities", "text"],
                ["Pet Policy", "pets", "text"],
                ["Parking", "parking", "text"],
              ].map(([label, field, type]) => (
                <div key={field} className="info-item">
                  <label>{label}</label>
                  <input
                    type={type}
                    value={infoDraft[field] || ""}
                    onChange={(e) => setInfoDraft((p) => ({ ...p, [field]: e.target.value }))}
                    style={{
                      width: "100%", padding: "5px 8px", border: "1.5px solid var(--color-primary)",
                      borderRadius: 5, fontSize: "0.88rem", fontFamily: "inherit",
                      background: "#fff", color: "var(--color-text)", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              {/* Read-only fields */}
              {[
                ["Owner Name", listing.ownerName], ["Property Address", listing.address],
                ["City", listing.city], ["Lease Term", listing.leaseTerm],
                ["Laundry", listing.laundry], ["Smoking Policy", listing.smoking],
                ["Default Language", listing.language], ["Target Audience", listing.targetAudience],
              ].map(([label, val]) => (
                <div key={label} className="info-item"><label>{label}</label><p style={{ color: "var(--color-text-muted)" }}>{val || "—"}</p></div>
              ))}
            </div>
            {/* Key Features / Headline — full-width textarea */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                Key Features / Headline
              </label>
              <textarea
                value={infoDraft.features || ""}
                onChange={(e) => setInfoDraft((p) => ({ ...p, features: e.target.value }))}
                rows={3}
                style={{
                  width: "100%", padding: "7px 10px", border: "1.5px solid var(--color-primary)",
                  borderRadius: 5, fontSize: "0.88rem", fontFamily: "inherit",
                  background: "#fff", color: "var(--color-text)", boxSizing: "border-box", resize: "vertical",
                }}
              />
            </div>
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn--primary btn--sm" onClick={saveInfoToSheet} disabled={infoSaving}>
                {infoSaving ? "Saving…" : "💾 Save to Sheet"}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={cancelEditInfo} disabled={infoSaving}>
                Cancel
              </button>
              <button className="btn btn--ghost btn--sm" onClick={resetInfoToSheet} disabled={infoSaving}
                style={{ color: "#dc2626" }}>
                ↩ Reset to Sheet Data
              </button>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                Writes directly to Google Sheet — no separate sync needed.
              </span>
            </div>
          </>
        ) : (
          /* ── View mode ──────────────────────────────────────────────────── */
          <>
            <div className="info-grid">
              {[
                ["Owner Name", listing.ownerName], ["Property Address", listing.address],
                ["City", listing.city], ["Bedrooms", listing.bedrooms], ["Bathrooms", listing.bathrooms],
                ["Rent", listing.rent ? `$${Number(listing.rent).toLocaleString()}/mo` : "—"],
                ["Available Date", listing.available], ["Lease Term", listing.leaseTerm],
                ["Utilities", listing.utilities], ["Pet Policy", listing.pets],
                ["Parking", listing.parking], ["Laundry", listing.laundry],
                ["Smoking Policy", listing.smoking], ["Default Language", listing.language],
                ["Target Audience", listing.targetAudience],
              ].map(([label, val]) => (
                <div key={label} className="info-item"><label>{label}</label><p>{val || "—"}</p></div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Target Platforms
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Array.isArray(listing.platforms) && listing.platforms.length > 0
                  ? listing.platforms.map((p) => (
                      <span key={p} style={{ background: "#EFF3F8", borderRadius: 5, padding: "2px 10px", fontSize: "0.82rem", color: "var(--color-primary)" }}>{p}</span>
                    ))
                  : <span className="text-muted text-sm">—</span>}
              </div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Key Features
              </label>
              {listing.features?.trim()
                ? <p style={{ fontSize: "0.9rem" }}>{listing.features}</p>
                : <span className="text-muted text-sm">—</span>}
            </div>
          </>
        )}
      </div>

      {/* Platform Outputs — with copy edit layer */}
      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: infoEdited ? 8 : 16, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            📤 {t(lang, "detail.outputs")}
          </h3>
          <button
            className="btn btn--ghost btn--sm"
            onClick={regenerateCopy}
            disabled={regenerating || saving}
            title="Regenerate copy from current listing info. Application Requirements section is always included."
          >
            {regenerating ? "Regenerating…" : "↺ Regenerate Copy from Current Listing Info"}
          </button>
        </div>
        {infoEdited && (
          <div className="notice notice--info" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: "0.8rem", lineHeight: 1.7 }}>
              <strong>⚠️ Listing fields were edited after copy was generated.</strong>{" "}
              Review the copy carefully — it may still reference old values (e.g. old Available Date).
              Use the ✏️ Edit button on each tab to update the copy text if needed.
            </p>
          </div>
        )}

        <div className="tabs">
          {outputKeys.map((key) => (
            <button key={key} className={`tab-btn${currentTab === key ? " active" : ""}`}
              onClick={() => { setActiveTab(key); if (copyEditMode && copyEditMode !== key) setCopyEditMode(null); }}>
              {TAB_LABELS[key] || key}
              {editedCopy[key] !== undefined && <span style={{ marginLeft: 4, fontSize: "0.65rem", color: "#f59e0b" }}>●</span>}
            </button>
          ))}
        </div>

        {currentTab && listing.outputs?.[currentTab] && (() => {
          const displayText = editedCopy[currentTab] ?? listing.outputs[currentTab];
          const isEditing   = copyEditMode === currentTab;
          const hasDraft    = editedCopy[currentTab] !== undefined;
          const copyStatus  = hasDraft ? "Edited Draft (local, unsaved)" : "Generated";
          return (
            <div className="output-card">
              <div className="output-card__header">
                <span className="output-card__platform">{TAB_LABELS[currentTab] || currentTab}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.7rem", color: hasDraft ? "#f59e0b" : "var(--color-text-muted)", fontWeight: 600, border: `1px solid ${hasDraft ? "#fde68a" : "var(--color-border)"}`, borderRadius: 4, padding: "1px 6px" }}>
                    {copyStatus}
                  </span>
                  {!isEditing && <CopyButton text={displayText} lang={lang} />}
                  {!isEditing && (
                    <button className="btn btn--ghost btn--sm" onClick={() => startEditCopy(currentTab)}>
                      ✏️ Edit
                    </button>
                  )}
                  {!isEditing && hasDraft && (
                    <button className="btn btn--ghost btn--sm" style={{ color: "#dc2626" }}
                      onClick={() => resetCopy(currentTab)}>
                      Reset to Generated
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    style={{
                      width: "100%", minHeight: 200, padding: "10px 12px",
                      fontFamily: "inherit", fontSize: "0.875rem", lineHeight: 1.7,
                      border: "1px solid var(--color-primary)", borderRadius: 6,
                      resize: "vertical", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn btn--primary btn--sm" onClick={saveDraftCopy}>
                      💾 Save Draft
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={cancelEditCopy}>
                      Cancel
                    </button>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", alignSelf: "center" }}>
                      ⚠️ Unsaved local draft — not written to sheet until a save path is added.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="output-card__body">{displayText}</div>
              )}

              <div className="output-card__controls">
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, marginRight: 6 }}>{t(lang, "detail.reviewStatus")}:</label>
                  <select className="select-control" value={listing.reviewStatus?.[currentTab] || "Draft"}
                    onChange={(e) => updateReviewStatus(currentTab, e.target.value)} disabled={saving}>
                    {["Draft", "Reviewed", "Ready to Publish"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, marginRight: 6 }}>{t(lang, "detail.complianceFlag")}:</label>
                  <select className="select-control" value={listing.complianceFlag?.[currentTab] || "Review Needed"}
                    onChange={(e) => updateComplianceFlag(currentTab, e.target.value)} disabled={saving}>
                    {["Clear", "Review Needed"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="output-card__compliance">
                ⚠️ {t(lang, "detail.complianceNote")}<br />{t(lang, "detail.complianceNoteCh")}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Media Checklist */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem", color: "var(--color-primary)" }}>
          🖼️ {t(lang, "detail.mediaChecklist")}
        </h3>
        <ul className="media-checklist">
          {mediaItems.map((item, i) => (
            <li key={i}>
              <input type="checkbox" checked={!!(listing.mediaChecklist?.[i])} onChange={() => toggleMediaCheck(i)} disabled={saving} />
              <span style={{ textDecoration: listing.mediaChecklist?.[i] ? "line-through" : "none", color: listing.mediaChecklist?.[i] ? "var(--color-text-muted)" : "var(--color-text)" }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Review Status Summary ──────────────────────────────────────────────── */}
      {folderFiles.length > 0 && (
        <div className="card mb-24" style={{ background: "#f8fafc" }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            📋 Review Status / 审核状态
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Cover Photo</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                {coverIsManual ? "🟡 Manual Selected" : coverIsFallback ? "⚠️ Fallback" : "✅ Auto Detected"}
              </p>
              {effectiveCover && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 2 }}><code>{effectiveCover.name}</code></p>}
              {coverIsManual && (
                <button style={{ fontSize: "0.68rem", marginTop: 6, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => setManualCover(null)}>
                  ↩ Revert to auto-detect
                </button>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Active Ad Photos</p>
              <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-primary)" }}>{activePhotos.length}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>of {folderFiles.length} total</p>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Excluded Photos</p>
              <p style={{ fontSize: "1.4rem", fontWeight: 800, color: excluded.size > 0 ? "#dc2626" : "var(--color-text-muted)" }}>{excluded.size}</p>
              {excluded.size > 0 && (
                <button style={{ fontSize: "0.68rem", marginTop: 4, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => setExcluded(new Set())}>
                  Restore all
                </button>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Listing Info</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: infoEdited ? "#16a34a" : "var(--color-text)" }}>
                {infoEdited ? "✅ Saved to Sheet" : "Sheet Data"}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                Available: <strong>{listing.available || "—"}</strong>
              </p>
              {infoEdited && (
                <p style={{ fontSize: "0.72rem", color: "#d97706", marginTop: 2 }}>
                  Review generated copy for old dates.
                </p>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Copy Status</p>
              {outputKeys.length === 0
                ? <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No generated copy</p>
                : outputKeys.map((key) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: 2 }}>
                      <span style={{ color: "var(--color-text-muted)" }}>{TAB_LABELS[key] || key}</span>
                      <span style={{ fontWeight: 600, color: editedCopy[key] !== undefined ? "#f59e0b" : "#16a34a" }}>
                        {editedCopy[key] !== undefined ? "Edited Draft" : "Generated"}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Property Photos */}
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: "0.95rem", color: "var(--color-primary)" }}>
          📁 Property Photos / 房源照片
        </h3>

        {!isApiConnected() ? (
          <div className="notice notice--info" style={{ marginTop: 8 }}>
            <p>Photo management requires Google Drive integration. Set <code>VITE_STUDIO_EXEC_URL</code> in <code>.env.local</code> and restart.</p>
          </div>
        ) : !listing.driveFolderLink ? (
          <div className="notice notice--info" style={{ marginTop: 8 }}>
            <p>Please add the listing Drive folder link in column W ("Drive Folder Link") of the Google Sheet before managing photos.</p>
            <p style={{ marginTop: 4, opacity: 0.85 }}>请在 Google 表格 W 列（Drive Folder Link）填写房源 Drive 文件夹链接。</p>
          </div>
        ) : (
          <>
            {/* Drive folder toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <p className="text-muted text-sm" style={{ margin: 0, flex: 1 }}>
                Reading from Drive. Original files are not modified. / 读取 Drive 文件夹，原始文件不变。
              </p>
              <button className="btn btn--ghost btn--sm" disabled={folderLoading}
                onClick={() => { setManualCover(null); setExcluded(new Set()); loadFolderFiles(extractFolderId(listing.driveFolderLink)); }}
                style={{ whiteSpace: "nowrap" }}>
                {folderLoading ? "Loading…" : "↻ Refresh"}
              </button>
              <a href={listing.driveFolderLink} target="_blank" rel="noopener noreferrer"
                className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}>
                Open Folder ↗
              </a>
            </div>
            {folderLoading && <p className="text-muted text-sm" style={{ marginBottom: 14 }}>Loading photos…</p>}
            {!folderLoading && folderFiles.length === 0 && (
              <p className="text-muted text-sm" style={{ marginBottom: 14 }}>No JPG/PNG files found in this folder.</p>
            )}

            {/* ── Detected Cover Photo ─────────────────────────────────── */}
            {!folderLoading && folderFiles.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 10 }}>🖼️ Detected Cover Photo / 自动识别主图</p>
                {coverIsFallback && (
                  <div className="notice notice--info" style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: "0.82rem" }}>
                      No filename starting with "1" was found. Using the first image as cover fallback.
                      To set a different cover, use "Set Cover" in the photo package below.
                      <br />未找到以"1"开头的文件名，已使用第一张图片作为主图替代。如需更换，请在下方照片包中使用"Set Cover"。
                    </p>
                  </div>
                )}
                {effectiveCover && (
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <DrivePhoto file={effectiveCover} />
                    <div style={{ fontSize: "0.83rem", lineHeight: 2, color: "var(--color-text-muted)" }}>
                      {coverIsManual
                        ? <><strong style={{ color: "#f59e0b" }}>🟡 Manual Cover Selected</strong><br />File: <code>{effectiveCover.name}</code></>
                        : coverIsFallback
                          ? <><strong style={{ color: "#d97706" }}>⚠️ Fallback cover in use</strong><br />File: <code>{effectiveCover.name}</code></>
                          : <><strong style={{ color: "var(--color-text)" }}>✅ Cover auto-detected</strong><br />Filename starts with "1": <code>{effectiveCover.name}</code></>
                      }
                      <br />This photo will be used as the listing cover image. / 此图将作为房源主图使用。<br />
                      <span style={{ fontSize: "0.78rem" }}>Processed cover → <code>03_Cover_Images/</code></span>
                      {coverIsManual && (
                        <><br />
                          <button style={{ fontSize: "0.75rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}
                            onClick={() => setManualCover(null)}>
                            ↩ Revert to auto-detect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Marketplace Photo Package ─────────────────────────────── */}
            {!folderLoading && folderFiles.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>🏠 Marketplace Photo Package / Marketplace 全部照片</p>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                  <strong>{activePhotos.length}</strong> active photo{activePhotos.length !== 1 ? "s" : ""} ({excluded.size} excluded).
                  Use ↑↓ to reorder · <strong>Set Cover</strong> to override cover detection · <strong>Exclude</strong> to remove from package.
                  Original Drive files are never modified.
                  <br />
                  <span style={{ fontSize: "0.75rem" }}>使用↑↓调整顺序 · Set Cover 手动指定主图 · Exclude 从广告包中排除。原始文件不受影响。</span>
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {orderedPhotos.map((f, idx) => (
                    <PackagePhoto
                      key={f.fileId}
                      file={f}
                      isFirst={idx === 0}
                      isLast={idx === orderedPhotos.length - 1}
                      isExcluded={excluded.has(f.fileId)}
                      isCover={effectiveCover?.fileId === f.fileId}
                      coverIsManual={coverIsManual}
                      onMoveUp={() => movePhoto(f.fileId, "up")}
                      onMoveDown={() => movePhoto(f.fileId, "down")}
                      onExclude={() => toggleExclude(f.fileId)}
                      onSetCover={() => setManualCover(f.fileId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Light Enhancement Batch ───────────────────────────────── */}
            {!folderLoading && activePhotos.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>✨ Light Enhancement Batch / 轻度美化批次</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 8, lineHeight: 1.7 }}>
                  <strong>{activePhotos.length}</strong> active photo{activePhotos.length !== 1 ? "s" : ""} will be processed.
                  Enhanced copies → <code>02_AI_Enhanced_Photos/</code> — originals unchanged.
                  <br />
                  <span style={{ fontSize: "0.78rem" }}>全部 {activePhotos.length} 张已激活照片将进行轻度美化，副本保存至 <code>02_AI_Enhanced_Photos/</code>，原始文件不变。</span>
                </p>
                <div className="notice notice--info">
                  <p style={{ fontSize: "0.8rem", lineHeight: 1.8 }}>
                    <strong>Allowed adjustments only:</strong> brightness · contrast · color balance · clarity<br />
                    Must <strong>not</strong> alter layout, furniture, fixtures, view, condition, or any factual property feature.<br />
                    <span style={{ opacity: 0.85 }}>仅限亮度、对比度、色彩平衡、清晰度。不得修改布局、家具、固定设施、景观、状况或任何真实房源特征。</span>
                  </p>
                </div>
              </div>
            )}

            {/* ── Short Video Source ────────────────────────────────────── */}
            {!folderLoading && activePhotos.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>🎬 Short Video Source / 短视频素材</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                  All <strong>{activePhotos.length}</strong> active photo{activePhotos.length !== 1 ? "s" : ""} will be used as source material for the short video slideshow, in the order shown above.
                  Video outputs → <code>04_Video_Output/</code>
                  <br />
                  <span style={{ fontSize: "0.78rem" }}>全部 {activePhotos.length} 张已激活照片按上方顺序用于短视频，输出至 <code>04_Video_Output/</code>。</span>
                </p>
              </div>
            )}

            {/* ── Output subfolders reference ───────────────────────────── */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14, marginBottom: 16 }}>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", lineHeight: 1.9 }}>
                <strong>Output subfolders (created automatically when each step runs):</strong><br />
                📂 <code>02_AI_Enhanced_Photos/</code> — light-enhanced copies<br />
                📂 <code>03_Cover_Images/</code> — processed cover image<br />
                📂 <code>04_Video_Output/</code> — short video exports
              </p>
            </div>

            {/* ── Add More Photos ────────────────────────────────────────── */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>Add More Photos / 补充上传照片</p>
              <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
                Uploads go to your listing folder root. Max {MAX_FILE_MB} MB per file, up to {MAX_BATCH} at once.
                <br />上传至房源文件夹根目录，每次最多 {MAX_BATCH} 张，每张最大 {MAX_FILE_MB} MB。
              </p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple
                style={{ display: "none" }} onChange={handleFileChange} />
              <button className="btn btn--ghost btn--sm" disabled={uploading}
                onClick={() => fileInputRef.current?.click()}>
                {uploading ? (uploadProgress || "Uploading…") : "📤 Upload Photos"}
              </button>
              {previews.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p className="text-sm text-muted" style={{ marginBottom: 6 }}>
                    {uploadProgress || `Preparing ${previews.length} file(s)…`}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {previews.map((p, i) => (
                      <div key={i} style={{ width: 130, opacity: 0.65, border: "1px solid var(--color-border)", borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
                        <img src={p.url} alt={p.name} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                        <div style={{ padding: "4px 7px", fontSize: "0.7rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {uploadMsg && (
                <div className={`notice notice--${uploadMsg.type === "error" ? "error" : "success"}`} style={{ marginTop: 12 }}>
                  <p>{uploadMsg.text}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
