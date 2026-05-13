import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { t } from "../../translations";
import { getListing, saveListing, updateVideoUrl, getListingFolderFiles, uploadToSubfolder } from "../../utils/storage";
import { generateOutputs } from "../../utils/generateContent";
import { isApiConnected, apiPost } from "../../utils/api";
import { saveVideoBlob, loadVideoBlob } from "../../utils/videoCache";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
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

// Fallback when manifest hasn't loaded yet
const MUSIC_NO_MUSIC = { label: "No music / 不加音乐", file: "none" };

// ── Pure helpers (outside component — stable identity, no remount risk) ───────

function extractFolderId(link) {
  if (!link) return null;
  const m = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Cover = first file (numeric alpha order) whose name starts with "1".
// Falls back to first file if none match.
function sortByFilenameNumber(photos) {
  return [...photos].sort((a, b) => {
    const numA = parseInt((a.name.match(/\d+/) || ['0'])[0], 10);
    const numB = parseInt((b.name.match(/\d+/) || ['0'])[0], 10);
    return numA !== numB ? numA - numB : a.name.localeCompare(b.name);
  });
}

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
  const fileInputRef  = useRef(null);
  const listingRef    = useRef(null); // always tracks the latest listing state

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

  // Short Video state
  const [videoStatus,    setVideoStatus]    = useState("idle"); // idle|preparing|rendering|uploading|done|error
  const [videoProgress,  setVideoProgress]  = useState({ slide: 0, total: 0 });
  const [videoMsg,       setVideoMsg]       = useState(null);
  const [videoFolderUrl, setVideoFolderUrl] = useState(null);
  const [videoFileUrl,   setVideoFileUrl]   = useState(null);
  const [videoFormat,    setVideoFormat]    = useState("landscape"); // "landscape" | "vertical"
  const [videoBlob,      setVideoBlob]      = useState(null);        // raw Blob for download
  const [videoBlobUrl,   setVideoBlobUrl]   = useState(null);        // URL.createObjectURL for in-page preview
  const [videoSourceType,setVideoSourceType]= useState(null);        // "enhanced" | "original"
  const [musicTrack,     setMusicTrack]     = useState("none");      // "none" or full path like /music/xxx.mp3
  const [videoMusicStatus,setVideoMusicStatus]= useState(null);      // music result message after generation
  const [loadedMusicOptions, setLoadedMusicOptions] = useState([MUSIC_NO_MUSIC]); // populated from manifest
  const [videoPhotoIds,  setVideoPhotoIds]  = useState(null);        // null = auto-sort; string[] = manual selection in order
  const [showVideoPicker,setShowVideoPicker]= useState(false);       // expand/collapse photo picker

  // Light Enhancement Batch state
  const [enhanceStatus,      setEnhanceStatus]      = useState("idle"); // idle|running|done|error
  const [enhanceProgress,    setEnhanceProgress]    = useState({ done: 0, total: 0 });
  const [enhanceMsg,         setEnhanceMsg]         = useState(null);
  const [enhancedFolderUrl,  setEnhancedFolderUrl]  = useState(null);
  const [enhancedFolderId,   setEnhancedFolderId]   = useState(null);
  const [enhancedPhotos,     setEnhancedPhotos]     = useState([]);
  const [enhancedLoading,    setEnhancedLoading]    = useState(false);

  // ── Load listing ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getListing(id)
      .then((l) => {
        setListing(l);
        if (!l) { setError("Listing not found."); return; }
        const fid = extractFolderId(l.driveFolderLink);
        if (fid) loadFolderFiles(fid);
        // Auto-load enhanced photos if subfolder ID was saved from a previous batch run
        if (l.enhancedFolderId) {
          setEnhancedFolderId(l.enhancedFolderId);
          loadEnhancedPhotos(l.enhancedFolderId);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Keep listingRef in sync so async functions always see the latest listing state
  useEffect(() => { listingRef.current = listing; }, [listing]);

  // Restore cached video for this listing + format on mount or format change
  useEffect(() => {
    if (!id || videoStatus !== "idle") return;
    loadVideoBlob(id, videoFormat)
      .then(blob => {
        if (!blob) return;
        if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
        setVideoBlob(blob);
        setVideoBlobUrl(URL.createObjectURL(blob));
        setVideoStatus("done");
        setVideoMsg("Video loaded from cache. / 已从缓存加载视频。");
        setVideoMusicStatus(null);
        setVideoSourceType(null);
      })
      .catch(() => {});
  }, [id, videoFormat]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load music manifest once on mount
  useEffect(() => {
    fetch("/music/music-manifest.json")
      .then(r => r.ok ? r.json() : Promise.reject(new Error("manifest not found")))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setLoadedMusicOptions([MUSIC_NO_MUSIC, ...data]);
        }
      })
      .catch(() => { /* fallback: keep No music only — do not throw */ });
  }, []);

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

  const updateOverallStatus = async (val) => {
    const base = window.location.origin;
    const update = {
      ...listing,
      status: val,
      // When publishing, stamp the public URL and admin package URL into the sheet
      publishedLink:    val === "Published" ? (listing.publishedLink    || `${base}/listings/${listing.id}`)      : listing.publishedLink,
      finalPackageLink: val === "Published" ? (listing.finalPackageLink || `${base}/admin/listing/${listing.id}`) : listing.finalPackageLink,
    };
    await persist(update);
    // Re-read from Google Sheet to confirm the write landed in column V
    try {
      const fresh = await getListing(id);
      if (fresh) setListing(fresh);
    } catch (_) {}
  };

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

  // ── Enhanced Photos Preview ──────────────────────────────────────────────────
  async function loadEnhancedPhotos(subfolderId) {
    if (!subfolderId) return;
    setEnhancedLoading(true);
    try {
      const files = await getListingFolderFiles(subfolderId);
      const seen = new Map();
      for (const f of (files || [])) seen.set(f.name, f);
      setEnhancedPhotos(Array.from(seen.values()));
    } catch {
      setEnhancedPhotos([]);
    } finally {
      setEnhancedLoading(false);
    }
  }

  // ── Light Enhancement Batch ───────────────────────────────────────────────────
  async function runLightEnhancementBatch() {
    const folderId = extractFolderId(listing?.driveFolderLink);
    if (!folderId || activePhotos.length === 0) return;
    setEnhanceStatus("running");
    setEnhanceMsg(null);
    setEnhanceProgress({ done: 0, total: activePhotos.length });

    let done = 0;
    const errors = [];
    let capturedFolderUrl = null;
    let capturedFolderId  = null;

    for (const photo of activePhotos) {
      const src = photo.dataUrl || photo.thumbUrlLg || photo.thumbUrl;
      if (!src) { errors.push(`${photo.name}: no image data`); done++; setEnhanceProgress({ done, total: activePhotos.length }); continue; }

      try {
        // Draw onto Canvas with light enhancement filter
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
          img.crossOrigin = "anonymous";
          img.src = src;
        });

        const base64 = dataUrl.split(",")[1];
        const baseName = photo.name.replace(/\.[^.]+$/, "");
        const fileName = `enhanced__${baseName}.jpg`;

        const res = await apiPost({
          action:        "uploadToSubfolder",
          folderId,
          subfolderName: "02_AI_Enhanced_Photos",
          fileName,
          mimeType:      "image/jpeg",
          data:          base64,
        });
        if (res?.subfolderUrl  && !capturedFolderUrl)  capturedFolderUrl = res.subfolderUrl;
        if (res?.subfolderFolderId && !capturedFolderId) capturedFolderId = res.subfolderFolderId;
      } catch (err) {
        errors.push(`${photo.name}: ${err.message}`);
      }

      done++;
      setEnhanceProgress({ done, total: activePhotos.length });
    }

    if (capturedFolderUrl)  setEnhancedFolderUrl(capturedFolderUrl);
    if (capturedFolderId) {
      setEnhancedFolderId(capturedFolderId);
      loadEnhancedPhotos(capturedFolderId);
      // Persist subfolder ID so enhanced photos auto-load on page refresh.
      // Use listingRef.current (not the closure's listing) so we don't overwrite
      // any status/field changes the user made while the batch was running.
      const currentListing = listingRef.current;
      if (currentListing && !currentListing.enhancedFolderId) {
        persist({ ...currentListing, enhancedFolderId: capturedFolderId });
      }
    }

    if (errors.length === 0) {
      setEnhanceStatus("done");
      setEnhanceMsg(`${done} enhanced copies saved to 02_AI_Enhanced_Photos/.`);
    } else {
      setEnhanceStatus(done === errors.length ? "error" : "done");
      setEnhanceMsg(`${done - errors.length} succeeded. Errors: ${errors.join("; ")}`);
    }
  }

  // ── Short Video Generator ─────────────────────────────────────────────────────
  function fmtDate(val) {
    if (!val) return "";
    const s = String(val).trim();
    return /^\d{4}-\d{2}-\d{2}T/.test(s) ? s.slice(0, 10) : s;
  }

  async function generateShortVideo() {
    const folderId = extractFolderId(listing?.driveFolderLink);
    if (!folderId || activePhotos.length === 0) return;

    setVideoStatus("preparing");
    setVideoMsg(null);
    setVideoProgress({ slide: 0, total: 0 });
    setVideoFolderUrl(null);
    setVideoFileUrl(null);
    setVideoBlob(null);
    setVideoBlobUrl(null);
    setVideoSourceType(null);
    setVideoMusicStatus(null);

    if (!window.VideoEncoder || !window.VideoFrame || !window.AudioEncoder) {
      setVideoStatus("error");
      setVideoMsg("MP4 export requires WebCodecs (Chrome 94+ or Edge 94+). Please use a supported browser.");
      return;
    }

    const isLandscape = videoFormat === "landscape";
    const W = isLandscape ? 1280 : 720;
    const H = isLandscape ? 720  : 1280;

    // Photo source: manual selection OR auto-sort by filename number, then enhanced > original
    const MAX_PHOTOS = 20;
    let basePhotos;
    if (videoPhotoIds && videoPhotoIds.length > 0) {
      basePhotos = videoPhotoIds
        .map(fid => activePhotos.find(p => p.fileId === fid))
        .filter(Boolean)
        .slice(0, MAX_PHOTOS);
    } else {
      basePhotos = sortByFilenameNumber(activePhotos).slice(0, MAX_PHOTOS);
    }
    let usedEnhanced = 0;
    const photoSource = basePhotos.map(orig => {
      if (enhancedPhotos.length === 0) return orig;
      const base = orig.name.replace(/\.[^.]+$/, "");
      const ep = enhancedPhotos.find(e => e.name === `enhanced__${base}.jpg`);
      if (ep) { usedEnhanced++; return ep; }
      return orig;
    });
    setVideoSourceType(usedEnhanced > 0 ? "enhanced" : "original");

    const loadedImages = await Promise.all(
      photoSource.map(photo => new Promise(resolve => {
        const src = photo.dataUrl || photo.thumbUrlLg || photo.thumbUrl;
        if (!src) { resolve(null); return; }
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }))
    );
    const validImages = loadedImages.filter(Boolean);
    if (validImages.length === 0) {
      setVideoStatus("error");
      setVideoMsg("No photos could be loaded. Try running the enhancement batch first.");
      return;
    }

    // Canvas
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // ── Web Audio API — decode music for preview playback + post-render AAC encoding ──
    let audioSource = null, audioCtx = null, audioAdded = false, decodedAudioBuf = null;
    if (musicTrack !== "none") {
      try {
        const resp = await fetch(musicTrack);
        if (!resp.ok) throw new Error(`${musicTrack} not found (HTTP ${resp.status})`);
        const ab = await resp.arrayBuffer();
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        decodedAudioBuf = await audioCtx.decodeAudioData(ab);
        // Play through speakers during rendering so admin can hear the music
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = decodedAudioBuf;
        audioSource.loop = true;
        audioSource.connect(audioCtx.destination);
        audioAdded = true;
      } catch (err) {
        setVideoMsg(`⚠️ Music failed (${err.message}) — generating silent video.`);
        if (audioCtx) { try { audioCtx.close(); } catch {} audioCtx = null; }
        audioSource = null;
        decodedAudioBuf = null;
      }
    }

    // ── MP4 encoder (WebCodecs + mp4-muxer → H.264 video + AAC audio) ──────
    const mp4Target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target: mp4Target,
      video: { codec: "avc", width: W, height: H },
      ...(audioAdded && decodedAudioBuf ? {
        audio: {
          codec: "aac",
          sampleRate: decodedAudioBuf.sampleRate,
          numberOfChannels: decodedAudioBuf.numberOfChannels,
        },
      } : {}),
      fastStart: "in-memory",
    });

    // Check H.264 support before configuring
    const videoCodec = "avc1.42001f"; // H.264 Baseline Profile 3.1 — broadest compatibility
    const vcSupport = await VideoEncoder.isConfigSupported({ codec: videoCodec, width: W, height: H, bitrate: 2_500_000, framerate: 24 });
    if (!vcSupport.supported) {
      setVideoStatus("error");
      setVideoMsg("H.264 encoding is not supported on this device. Use Chrome 94+ or Edge 94+.");
      return;
    }

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: e => { setVideoStatus("error"); setVideoMsg(`Video encoder error: ${e.message}`); },
    });
    videoEncoder.configure({ codec: videoCodec, width: W, height: H, bitrate: 2_500_000, framerate: 24 });

    let audioEncoder = null;
    if (audioAdded && decodedAudioBuf) {
      const acSupport = await AudioEncoder.isConfigSupported({
        codec: "mp4a.40.2", sampleRate: decodedAudioBuf.sampleRate,
        numberOfChannels: decodedAudioBuf.numberOfChannels, bitrate: 128_000,
      });
      if (acSupport.supported) {
        audioEncoder = new AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: e => console.error("Audio encoder:", e),
        });
        audioEncoder.configure({
          codec: "mp4a.40.2", sampleRate: decodedAudioBuf.sampleRate,
          numberOfChannels: decodedAudioBuf.numberOfChannels, bitrate: 128_000,
        });
      } else {
        setVideoMsg("⚠️ AAC audio not supported on this device — generating silent MP4.");
        audioAdded = false;
      }
    }

    let videoTimestampUs = 0;
    const FRAME_DURATION_US = Math.round(1_000_000 / 24);
    let totalFrameCount = 0;

    if (audioSource) audioSource.start(); // play through speakers during render
    setVideoStatus("rendering");

    // ── Slide data ───────────────────────────────────────────────────────────
    const beds   = `${listing.bedrooms || "?"} Bed / ${listing.bathrooms || "?"} Bath`;
    const rent   = listing.rent ? `$${Number(listing.rent).toLocaleString()}/month` : "";
    const avail  = fmtDate(listing.available);
    const addr   = listing.address || "";
    const pubUrl = `landlord-ai-marketing-studio.netlify.app/listings/${listing.id}`;
    const feats  = listing.features
      ? listing.features.split(/[,\n·•]+/).map(s => s.trim()).filter(Boolean)
      : [];

    // ── Drawing helpers ──────────────────────────────────────────────────────
    const FF = "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

    function roundRect(x, y, w, h, r, fill, alpha) {
      ctx.save();
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      ctx.restore();
    }

    function fitText(text, maxW, font) {
      ctx.save(); ctx.font = font;
      let t = String(text);
      while (t.length > 2 && ctx.measureText(t).width > maxW) t = t.slice(0, -1);
      ctx.restore();
      return t.length < String(text).length ? t + "…" : t;
    }

    function drawPhotoIntroOverlay() {
      // Soft gradient at bottom for text legibility
      const gradH = H * 0.45;
      const g = ctx.createLinearGradient(0, H - gradH, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.70)");
      ctx.fillStyle = g; ctx.fillRect(0, H - gradH, W, gradH);

      ctx.textBaseline = "bottom";
      const maxW = W - (isLandscape ? 120 : 80);
      const pad = isLandscape ? 60 : 40;

      // Rent — largest, amber
      if (rent) {
        const fs = isLandscape ? 54 : 48;
        const font = `700 ${fs}px ${FF}`;
        ctx.font = font; ctx.fillStyle = "#F59E0B";
        ctx.textAlign = isLandscape ? "left" : "center";
        ctx.fillText(fitText(rent, maxW, font), isLandscape ? pad : W / 2, H - (isLandscape ? 110 : 130));
      }
      // Beds / baths
      const bedsFont = `600 ${isLandscape ? 30 : 27}px ${FF}`;
      ctx.font = bedsFont; ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = isLandscape ? "left" : "center";
      ctx.fillText(fitText(beds, maxW, bedsFont), isLandscape ? pad : W / 2, H - (isLandscape ? 64 : 80));
      // Address
      if (addr) {
        const addrFont = `400 ${isLandscape ? 22 : 20}px ${FF}`;
        ctx.font = addrFont; ctx.fillStyle = "rgba(255,255,255,0.80)";
        ctx.fillText(fitText(addr, maxW, addrFont), isLandscape ? pad : W / 2, H - (isLandscape ? 30 : 42));
      }

      // "Available" pill badge — top-left / top-center
      if (avail) {
        const badgeText = `Available ${avail}`;
        const bfs = isLandscape ? 20 : 18;
        const bfont = `600 ${bfs}px ${FF}`;
        ctx.save(); ctx.font = bfont;
        const bw = ctx.measureText(badgeText).width + 28;
        ctx.restore();
        const bh = bfs + 16, br = bh / 2;
        const bx = isLandscape ? pad : (W - bw) / 2;
        const by = isLandscape ? 36 : 46;
        roundRect(bx, by, bw, bh, br, "rgba(245,158,11,0.92)");
        ctx.font = bfont; ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = isLandscape ? "left" : "center";
        ctx.textBaseline = "top";
        ctx.fillText(badgeText, isLandscape ? bx + 14 : W / 2, by + 8);
      }
    }

    function drawPhoto(img, progress, idx) {
      // Cover-fit then zoom + alternate pan direction per slide
      const scale = 1 + progress * 0.07;
      const ia = img.naturalWidth / img.naturalHeight, ca = W / H;
      const bw = ia > ca ? H * ia : W, bh = ia > ca ? H : W / ia;
      const sw = bw * scale, sh = bh * scale;
      const panDir = idx % 2 === 0 ? 1 : -1;
      const panAmt = sw * 0.03 * (progress - 0.5) * panDir;
      ctx.drawImage(img, (W - sw) / 2 + panAmt, (H - sh) / 2, sw, sh);
    }

    function drawCaption(text) {
      if (!text) return;
      const fs = isLandscape ? 26 : 28, padX = 22, padY = 11;
      const font = `600 ${fs}px ${FF}`;
      ctx.save(); ctx.font = font;
      const tw = ctx.measureText(String(text)).width;
      ctx.restore();
      const bw = Math.min(tw + padX * 2, W - 80);
      const bh = fs + padY * 2;
      const bx = (W - bw) / 2, by = H - bh - (isLandscape ? 46 : 62);
      roundRect(bx, by, bw, bh, bh / 2, "rgba(0,0,0,0.52)");
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.font = font; ctx.fillStyle = "#FFFFFF";
      ctx.fillText(fitText(String(text), bw - padX * 2, font), W / 2, by + padY);
    }

    function drawPhotoOutro(bgImg) {
      // Use last photo as background
      drawPhoto(bgImg, 0.5, 0);
      // Dark vignette overlay for readability
      ctx.save(); ctx.globalAlpha = 0.58; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();

      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      const cy = H / 2;

      if (isLandscape) {
        ctx.font = `700 50px ${FF}`; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("View Full Listing", W / 2, cy - 60);
        ctx.font = `700 50px ${FF}`; ctx.fillStyle = "#F59E0B";
        ctx.fillText("Apply Online", W / 2, cy + 10);
        ctx.font = `500 26px ${FF}`; ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText("Contact Mabel", W / 2, cy + 76);
        const uf = `400 18px monospace`;
        ctx.font = uf; ctx.fillStyle = "rgba(147,197,253,0.90)";
        ctx.fillText(fitText(pubUrl, W - 140, uf), W / 2, cy + 130);
      } else {
        ctx.font = `700 42px ${FF}`; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("View Full Listing", W / 2, cy - 80);
        ctx.font = `700 42px ${FF}`; ctx.fillStyle = "#F59E0B";
        ctx.fillText("Apply Online", W / 2, cy - 14);
        ctx.font = `500 24px ${FF}`; ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText("Contact Mabel", W / 2, cy + 60);
        const uf = `400 16px monospace`;
        ctx.font = uf; ctx.fillStyle = "rgba(147,197,253,0.90)";
        ctx.fillText(fitText(pubUrl, W - 80, uf), W / 2, cy + 118);
      }
    }

    function fadeBlack(drawBase, alpha) {
      drawBase();
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    function sceneCaption(idx, total) {
      // idx 0 = cover (overlay text handles that slide)
      if (idx === 0) return null;
      if (idx === 1 && beds) return beds;
      if (idx === 2 && feats[0]) return feats[0];
      if (idx === 3 && feats[1]) return feats[1];
      if (idx === 4 && feats[2]) return feats[2];
      if (idx === 5 && feats[3]) return feats[3];
      return null;
    }

    // ── Frame loop (frame-based for deterministic MP4 timestamps) ────────────
    const FRAME_MS = Math.round(1000 / 24);
    async function renderFor(drawFn, secs) {
      const totalFrames = Math.max(1, Math.round(secs * 24));
      for (let f = 0; f < totalFrames; f++) {
        const p = totalFrames <= 1 ? 1 : f / (totalFrames - 1);
        drawFn(p);
        const frame = new VideoFrame(canvas, { timestamp: videoTimestampUs, duration: FRAME_DURATION_US });
        videoEncoder.encode(frame, { keyFrame: totalFrameCount % 48 === 0 });
        frame.close();
        videoTimestampUs += FRAME_DURATION_US;
        totalFrameCount++;
        // Yield to browser; slow down if encoder queue is backing up
        await new Promise(r => setTimeout(r, videoEncoder.encodeQueueSize > 8 ? 80 : FRAME_MS));
      }
    }

    // ── Render sequence ──────────────────────────────────────────────────────
    // Dynamic per-photo duration: target under 58s total.
    // Outro: 0.4s fade-in + 3.0s hold + 0.4s fade-out = 3.8s
    const OUTRO_TOTAL_SECS = 3.8;
    const PHOTO_FADE_SECS  = 0.35;
    const MAX_VIDEO_SECS   = 57.5; // slight buffer under 58s
    const availForPhotos   = MAX_VIDEO_SECS - OUTRO_TOTAL_SECS;
    const perPhotoTotal    = availForPhotos / validImages.length;
    // Clamp hold between 2.0s (20 photos) and 3.0s (few photos)
    const photoHoldSecs    = Math.max(2.0, Math.min(3.0, perPhotoTotal - PHOTO_FADE_SECS));

    const outroImg    = validImages[validImages.length - 1];
    const totalScenes = 1 + validImages.length; // photos + outro
    let cur = 0;

    // Photo slides — first photo gets intro overlay text instead of dark title card
    for (let i = 0; i < validImages.length; i++) {
      const img = validImages[i];
      const cap = sceneCaption(i, validImages.length);
      setVideoProgress({ slide: ++cur, total: totalScenes });
      // First slide: cover photo + property info overlay
      if (i === 0) {
        await renderFor(p => { drawPhoto(img, p, i); drawPhotoIntroOverlay(); }, photoHoldSecs);
        await renderFor(p => fadeBlack(() => { drawPhoto(img, 1, i); drawPhotoIntroOverlay(); }, p), PHOTO_FADE_SECS);
      } else {
        await renderFor(p => { drawPhoto(img, p, i); drawCaption(cap); }, photoHoldSecs);
        await renderFor(p => fadeBlack(() => { drawPhoto(img, 1, i); drawCaption(cap); }, p), PHOTO_FADE_SECS);
      }
    }

    // CTA outro: photo background + fade in + hold + fade out
    setVideoProgress({ slide: ++cur, total: totalScenes });
    await renderFor(p => {
      drawPhotoOutro(outroImg);
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
    }, 0.4);
    await renderFor(() => drawPhotoOutro(outroImg), 3.0);
    await renderFor(p => fadeBlack(() => drawPhotoOutro(outroImg), p), 0.4);

    // Stop preview audio
    if (audioSource) { try { audioSource.stop(); } catch {} }
    if (audioCtx)    { try { audioCtx.close();   } catch {} }

    // Encode audio from the decoded buffer, looping to fill the full video duration
    if (audioEncoder && decodedAudioBuf) {
      const totalDurationSecs = videoTimestampUs / 1_000_000;
      const { sampleRate, numberOfChannels } = decodedAudioBuf;
      const totalSamples = Math.ceil(totalDurationSecs * sampleRate);
      const CHUNK_FRAMES = 1024;
      for (let offset = 0; offset < totalSamples; offset += CHUNK_FRAMES) {
        const frames = Math.min(CHUNK_FRAMES, totalSamples - offset);
        // f32-planar layout: all of channel 0, then all of channel 1
        const buf = new ArrayBuffer(frames * numberOfChannels * 4);
        for (let c = 0; c < numberOfChannels; c++) {
          const src = decodedAudioBuf.getChannelData(c);
          const dest = new Float32Array(buf, c * frames * 4, frames);
          for (let s = 0; s < frames; s++) dest[s] = src[(offset + s) % src.length];
        }
        const audioData = new AudioData({
          format: "f32-planar",
          sampleRate,
          numberOfFrames: frames,
          numberOfChannels,
          timestamp: Math.round((offset / sampleRate) * 1_000_000),
          data: buf,
        });
        audioEncoder.encode(audioData);
        audioData.close();
      }
      await audioEncoder.flush();
    }

    // Flush video encoder and finalize MP4 container
    await videoEncoder.flush();
    muxer.finalize();

    const blob = new Blob([mp4Target.buffer], { type: "video/mp4" });
    setVideoBlob(blob);
    setVideoBlobUrl(URL.createObjectURL(blob));
    // Persist to IndexedDB so video survives page refresh
    saveVideoBlob(listing.id, videoFormat, blob).catch(() => {});

    // Resolve music status message
    const selectedLabel = loadedMusicOptions.find(o => o.file === musicTrack)?.label || musicTrack;
    const musicStatus = musicTrack === "none" ? null
      : audioAdded  ? `Music included: ${selectedLabel} ✅`
      : `Music file failed to load: ${musicTrack}`;

    // Upload to 04_Video_Output — Drive is storage only, not the viewing interface
    setVideoStatus("uploading");
    try {
      const base64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload  = () => res(fr.result.split(",")[1]);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
      const fileName = `video__${listing.id}__${videoFormat}.mp4`;
      const result = await apiPost({
        action:        "uploadToSubfolder",
        folderId,
        subfolderName: "04_Video_Output",
        fileName,
        mimeType:      "video/mp4",
        data:          base64,
      });
      if (result?.subfolderUrl) setVideoFolderUrl(result.subfolderUrl);
      if (result?.url)          setVideoFileUrl(result.url);
      setVideoStatus("done");
      setVideoMsg(`${fileName} saved to 04_Video_Output/`);
      setVideoMusicStatus(musicStatus);

      // ── videoUrl write-back ────────────────────────────────────────────────
      const listingId   = listingRef.current.id;
      const driveFileId = result?.fileId;
      const driveUrl    = result?.url;

      console.log("[videoUrl write-back] listingId :", listingId);
      console.log("[videoUrl write-back] Drive fileId:", driveFileId);
      console.log("[videoUrl write-back] Drive URL  :", driveUrl);

      if (driveUrl) {
        const updatedListing = { ...listingRef.current, videoUrl: driveUrl };
        setListing(updatedListing);
        listingRef.current = updatedListing;

        // Primary: targeted single-cell write (creates column header if missing)
        let writeOk = false;
        try {
          const wr = await updateVideoUrl(listingId, driveUrl);
          console.log("[videoUrl write-back] updateVideoUrl SUCCESS →", wr);
          writeOk = true;
        } catch (writeErr) {
          console.error("[videoUrl write-back] updateVideoUrl FAILED:", writeErr.message);
        }

        // Fallback: full saveListing (works even if updateVideoUrl action is unavailable)
        if (!writeOk) {
          console.log("[videoUrl write-back] Trying saveListing fallback...");
          try {
            await saveListing(updatedListing);
            console.log("[videoUrl write-back] saveListing fallback SUCCESS");
            writeOk = true;
          } catch (saveErr) {
            console.error("[videoUrl write-back] saveListing fallback FAILED:", saveErr.message);
          }
        }

        if (writeOk) {
          setVideoMsg(prev => (prev || "") + " ✅ videoUrl saved to sheet.");
        } else {
          setVideoMsg(prev => (prev || "") + " ⚠️ videoUrl write-back failed — check console.");
        }
      }
    } catch (err) {
      setVideoStatus("done"); // still show preview even if Drive upload fails
      setVideoMsg(`Video ready. Drive upload failed: ${err.message}`);
      setVideoMusicStatus(musicStatus);
    }
  }

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
          <Link to="/admin" className="btn btn--ghost btn--sm"
            style={saving ? { pointerEvents: "none", opacity: 0.5 } : {}}>
            ← Dashboard
          </Link>
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
                <div className="notice notice--info" style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: "0.8rem", lineHeight: 1.8 }}>
                    <strong>Allowed adjustments only:</strong> brightness · contrast · color balance · clarity<br />
                    Must <strong>not</strong> alter layout, furniture, fixtures, view, condition, or any factual property feature.<br />
                    <span style={{ opacity: 0.85 }}>仅限亮度、对比度、色彩平衡、清晰度。不得修改布局、家具、固定设施、景观、状况或任何真实房源特征。</span>
                  </p>
                </div>

                {/* Status display */}
                {enhanceStatus === "idle" && (
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={!isApiConnected()}
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => { setEnhanceStatus("idle"); setEnhanceMsg(null); }}>
                        Run Again
                      </button>
                      {enhancedFolderUrl && (
                        <a href={enhancedFolderUrl} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => { setEnhanceStatus("idle"); setEnhanceMsg(null); }}>
                        Try Again
                      </button>
                      {enhancedFolderUrl && (
                        <a href={enhancedFolderUrl} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
                          📂 Open Enhanced Photos Folder
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {!isApiConnected() && (
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 6 }}>
                    Requires API connection (VITE_STUDIO_EXEC_URL).
                  </p>
                )}
              </div>
            )}

            {/* ── Enhanced Photos Preview ───────────────────────────────── */}
            {!folderLoading && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>🖼️ Enhanced Photos Preview / 美化照片预览</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {enhancedFolderUrl && (
                      <a href={enhancedFolderUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                        📂 Open Folder
                      </a>
                    )}
                    {enhancedFolderId && (
                      <button className="btn btn--ghost btn--sm" disabled={enhancedLoading}
                        onClick={() => loadEnhancedPhotos(enhancedFolderId)}>
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
                    No enhanced photos yet. Run Light Enhancement Batch first.
                    <br /><span style={{ fontSize: "0.78rem" }}>暂无美化照片，请先运行轻度美化批次。</span>
                  </p>
                )}
                {!enhancedLoading && enhancedPhotos.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {enhancedPhotos.map((f) => (
                      <div key={f.fileId} style={{ width: 150, border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                        {f.dataUrl || f.thumbUrl ? (
                          <img
                            src={f.dataUrl || f.thumbUrl}
                            alt={f.name}
                            style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: 100, background: "#EFF3F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "1.5rem" }}>🖼️</span>
                          </div>
                        )}
                        <div style={{ padding: "5px 7px" }}>
                          <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
                            {f.name}
                          </div>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--color-primary)", fontWeight: 600 }}>
                            Open in Drive ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Short Video Generator ─────────────────────────────────── */}
            {!folderLoading && activePhotos.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }}>🎬 Short Video Generator / 短视频生成</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 10, lineHeight: 1.7 }}>
                  Polished ~25–35 sec listing video. Ken Burns zoom · fade transitions · text overlays.
                  <br /><span style={{ fontSize: "0.78rem" }}>精美房源幻灯片视频，输出至 <code>04_Video_Output/</code>。</span>
                </p>

                {/* Photo source indicator */}
                <div style={{ marginBottom: 12, padding: "7px 12px", borderRadius: 7, background: enhancedPhotos.length > 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${enhancedPhotos.length > 0 ? "#86efac" : "#fde68a"}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem" }}>
                    <strong>Video source / 视频素材：</strong>{" "}
                    {enhancedPhotos.length > 0 ? (
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>✅ Enhanced Photos ({enhancedPhotos.length} photos) / 美化照片</span>
                    ) : (
                      <span style={{ color: "#d97706", fontWeight: 600 }}>⚠️ Original Photos / 原始照片</span>
                    )}
                  </span>
                  {enhancedPhotos.length === 0 && enhancedFolderId && (
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ fontSize: "0.74rem", padding: "2px 10px" }}
                      disabled={enhancedLoading || videoStatus !== "idle"}
                      onClick={() => loadEnhancedPhotos(enhancedFolderId)}
                    >
                      {enhancedLoading ? "Loading…" : "↺ Load Enhanced Photos"}
                    </button>
                  )}
                  {enhancedPhotos.length === 0 && !enhancedFolderId && (
                    <span style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                      Run Light Enhancement Batch above to use enhanced photos.
                    </span>
                  )}
                </div>

                {/* ── Video Photo Picker ──────────────────────────────────── */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>📷 Video Photos / 视频照片</span>
                    {videoPhotoIds
                      ? <span style={{ fontSize: "0.74rem", background: "#EFF3F8", color: "var(--color-primary)", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
                          Manual: {videoPhotoIds.length} selected / 已手动选择 {videoPhotoIds.length} 张
                        </span>
                      : <span style={{ fontSize: "0.74rem", background: "#f0fdf4", color: "#16a34a", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
                          Auto (by filename order) / 自动按文件名数字排序
                        </span>
                    }
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ fontSize: "0.74rem", padding: "2px 10px" }}
                      disabled={videoStatus !== "idle"}
                      onClick={() => setShowVideoPicker(p => !p)}
                    >
                      {showVideoPicker ? "Hide ▲" : "Choose Photos ▼"}
                    </button>
                    {videoPhotoIds && (
                      <button
                        className="btn btn--ghost btn--sm"
                        style={{ fontSize: "0.74rem", padding: "2px 10px", color: "#d97706", borderColor: "#fde68a" }}
                        disabled={videoStatus !== "idle"}
                        onClick={() => setVideoPhotoIds(null)}
                      >
                        Reset to auto / 重置自动
                      </button>
                    )}
                  </div>

                  {showVideoPicker && videoStatus === "idle" && (() => {
                    const sorted = sortByFilenameNumber(activePhotos);
                    const MAX_SEL = 8;
                    const togglePhoto = (fid) => {
                      setVideoPhotoIds(prev => {
                        const cur = prev || [];
                        if (cur.includes(fid)) return cur.length === 1 ? null : cur.filter(id => id !== fid);
                        if (cur.length >= MAX_SEL) return cur;
                        return [...cur, fid];
                      });
                    };
                    const movePhoto = (idx, dir) => {
                      setVideoPhotoIds(prev => {
                        if (!prev) return prev;
                        const arr = [...prev];
                        const to = idx + dir;
                        if (to < 0 || to >= arr.length) return arr;
                        [arr[idx], arr[to]] = [arr[to], arr[idx]];
                        return arr;
                      });
                    };
                    const selectedIds = videoPhotoIds || [];
                    return (
                      <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12, background: "#fafafa" }}>
                        <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
                          Click to select up to {MAX_SEL} photos. Numbers show video order. If nothing selected, first {MAX_SEL} by filename number are used.
                          <br />点击选择最多 {MAX_SEL} 张。数字为视频顺序。不选则自动按文件名数字取前 {MAX_SEL} 张。
                        </p>

                        {/* Thumbnail grid */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: selectedIds.length > 0 ? 12 : 0 }}>
                          {sorted.map(photo => {
                            const selIdx = selectedIds.indexOf(photo.fileId);
                            const isSelected = selIdx !== -1;
                            const src = photo.thumbUrl || photo.thumbUrlLg || (photo.fileId ? `https://drive.google.com/thumbnail?id=${photo.fileId}&sz=w200` : null);
                            return (
                              <div
                                key={photo.fileId}
                                onClick={() => togglePhoto(photo.fileId)}
                                title={photo.name}
                                style={{
                                  position: "relative", width: 72, height: 52, borderRadius: 5, overflow: "hidden", cursor: "pointer",
                                  border: `2.5px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                                  opacity: !isSelected && selectedIds.length >= MAX_SEL ? 0.4 : 1,
                                  flexShrink: 0,
                                }}
                              >
                                {src
                                  ? <img src={src} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                  : <div style={{ width: "100%", height: "100%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#9ca3af" }}>no img</div>
                                }
                                {isSelected && (
                                  <div style={{
                                    position: "absolute", top: 2, left: 2,
                                    background: "var(--color-primary)", color: "#fff",
                                    borderRadius: 4, fontSize: "0.68rem", fontWeight: 800,
                                    padding: "0 5px", lineHeight: "18px", minWidth: 18, textAlign: "center",
                                  }}>
                                    {selIdx + 1}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Reorder strip for selected photos */}
                        {selectedIds.length > 0 && (
                          <div>
                            <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 6 }}>
                              Reorder / 调整顺序：
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {selectedIds.map((fid, idx) => {
                                const photo = activePhotos.find(p => p.fileId === fid);
                                const src = photo?.thumbUrl || photo?.thumbUrlLg || (photo?.fileId ? `https://drive.google.com/thumbnail?id=${photo.fileId}&sz=w200` : null);
                                return (
                                  <div key={fid} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                    <div style={{ position: "relative", width: 56, height: 40, borderRadius: 4, overflow: "hidden", border: "2px solid var(--color-primary)" }}>
                                      {src
                                        ? <img src={src} alt={photo?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        : <div style={{ width: "100%", height: "100%", background: "#e5e7eb" }} />
                                      }
                                      <div style={{ position: "absolute", top: 1, left: 2, background: "var(--color-primary)", color: "#fff", borderRadius: 3, fontSize: "0.62rem", fontWeight: 800, padding: "0 4px", lineHeight: "16px" }}>
                                        {idx + 1}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 2 }}>
                                      <button onClick={() => movePhoto(idx, -1)} disabled={idx === 0}
                                        style={{ fontSize: "0.62rem", padding: "1px 5px", border: "1px solid var(--color-border)", borderRadius: 3, background: "#fff", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}>◀</button>
                                      <button onClick={() => movePhoto(idx, 1)} disabled={idx === selectedIds.length - 1}
                                        style={{ fontSize: "0.62rem", padding: "1px 5px", border: "1px solid var(--color-border)", borderRadius: 3, background: "#fff", cursor: idx === selectedIds.length - 1 ? "default" : "pointer", opacity: idx === selectedIds.length - 1 ? 0.3 : 1 }}>▶</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Background Music selector */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    🎵 Background Music / 背景音乐
                  </label>
                  <select
                    value={musicTrack}
                    onChange={e => setMusicTrack(e.target.value)}
                    disabled={videoStatus !== "idle"}
                    style={{
                      padding: "6px 10px", border: "1.5px solid var(--color-border)", borderRadius: 6,
                      fontSize: "0.84rem", fontFamily: "inherit", background: "#fff",
                      color: "var(--color-text)", minWidth: 260,
                      cursor: videoStatus !== "idle" ? "default" : "pointer",
                      opacity: videoStatus !== "idle" ? 0.6 : 1,
                    }}
                  >
                    {loadedMusicOptions.map(o => (
                      <option key={o.file} value={o.file}>{o.label}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 3 }}>
                    {loadedMusicOptions.length > 1
                      ? `${loadedMusicOptions.length - 1} royalty-free track${loadedMusicOptions.length > 2 ? "s" : ""} loaded from public/music/`
                      : "Place MP3 files in public/music/ and add them to music-manifest.json"
                    }
                  </p>
                  <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 5, lineHeight: 1.6 }}>
                    Use royalty-free music only. Music can also be added later in Facebook, CapCut, or Canva.
                    <br />仅使用免版权音乐。也可以稍后在 Facebook、剪映/CapCut 或 Canva 中添加音乐。
                  </p>
                </div>

                {/* Format selector — disabled while rendering */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Format / 格式:</span>
                  {[
                    { value: "landscape", label: "Landscape 16:9", sub: "Facebook · YouTube" },
                    { value: "vertical",  label: "Vertical 9:16",  sub: "Reels · TikTok · WeChat" },
                  ].map(opt => (
                    <label key={opt.value} style={{
                      display: "flex", alignItems: "center", gap: 7, cursor: videoStatus !== "idle" ? "default" : "pointer",
                      border: `1.5px solid ${videoFormat === opt.value ? "var(--color-primary)" : "var(--color-border)"}`,
                      borderRadius: 7, padding: "6px 14px", userSelect: "none",
                      background: videoFormat === opt.value ? "#EFF3F8" : "#fff",
                      opacity: videoStatus !== "idle" ? 0.55 : 1,
                    }}>
                      <input
                        type="radio" name="videoFormat" value={opt.value}
                        checked={videoFormat === opt.value}
                        onChange={() => setVideoFormat(opt.value)}
                        disabled={videoStatus !== "idle"}
                        style={{ accentColor: "var(--color-primary)", margin: 0, cursor: "inherit" }}
                      />
                      <span>
                        <span style={{ fontSize: "0.84rem", fontWeight: videoFormat === opt.value ? 700 : 400, color: videoFormat === opt.value ? "var(--color-primary)" : "var(--color-text)" }}>
                          {opt.label}
                        </span>
                        <span style={{ display: "block", fontSize: "0.7rem", color: "var(--color-text-muted)", lineHeight: 1.3 }}>{opt.sub}</span>
                      </span>
                    </label>
                  ))}
                </div>

                {/* Generate button */}
                {videoStatus === "idle" && (
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={!isApiConnected()}
                    onClick={generateShortVideo}
                  >
                    🎬 Generate Polished Short Video
                  </button>
                )}

                {/* Progress */}
                {(videoStatus === "preparing" || videoStatus === "rendering") && (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-primary)", lineHeight: 1.8 }}>
                    <div>
                      {videoStatus === "preparing" && "Preparing photos… / 准备照片中…"}
                      {videoStatus === "rendering" && (
                        <>
                          Rendering scene {videoProgress.slide} of {videoProgress.total}…
                          <span style={{ marginLeft: 8, opacity: 0.65 }}>
                            ({Math.round((videoProgress.slide / Math.max(videoProgress.total, 1)) * 100)}%)
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                      Rendering runs in real time (~25–35 sec). Keep this tab open. / 实时渲染中，请保持当前页面。
                    </div>
                  </div>
                )}

                {videoStatus === "uploading" && (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-primary)" }}>
                    Saving video to Drive storage… / 正在保存至 Drive…
                  </div>
                )}

                {/* ── Completion: embedded preview + download ── */}
                {videoStatus === "done" && (
                  <div>
                    {/* Inline video player — no Drive required */}
                    {videoBlobUrl && (
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 8, color: "var(--color-primary)" }}>
                          Video Preview / 视频预览
                        </p>
                        <video
                          key={videoBlobUrl}
                          controls
                          src={videoBlobUrl}
                          style={{
                            display: "block",
                            width: "100%",
                            maxWidth: videoFormat === "landscape" ? 640 : 300,
                            borderRadius: 8,
                            background: "#000",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
                          }}
                        />
                        {videoSourceType && (
                          <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 5 }}>
                            Source used: <strong>{videoSourceType === "enhanced" ? "Enhanced Photos ✅" : "Original Photos"}</strong>
                            {" · "}{videoFormat === "landscape" ? "Landscape 16:9" : "Vertical 9:16"}
                          </p>
                        )}
                        {videoMusicStatus && (
                          <p style={{
                            fontSize: "0.74rem", marginTop: 4, fontWeight: 600,
                            color: videoMusicStatus.includes("✅") ? "#16a34a" : "#d97706",
                          }}>
                            🎵 {videoMusicStatus}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                      {/* Download — primary action */}
                      {videoBlobUrl && (
                        <a
                          href={videoBlobUrl}
                          download={`video__${listing.id}__${videoFormat}.mp4`}
                          className="btn btn--primary btn--sm"
                        >
                          ⬇ Download Video
                        </a>
                      )}
                      {/* Generate again */}
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
                          setVideoStatus("idle");
                          setVideoMsg(null);
                          setVideoBlob(null);
                          setVideoBlobUrl(null);
                          setVideoSourceType(null);
                          setVideoMusicStatus(null);
                        }}
                      >
                        Generate Again
                      </button>
                    </div>

                    {/* Success note */}
                    <div className="notice notice--success" style={{ marginBottom: 6 }}>
                      <p style={{ fontSize: "0.82rem" }}>✅ {videoMsg}</p>
                    </div>

                    {/* Drive storage link — admin reference only, not primary workflow */}
                    {videoFolderUrl && (
                      <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 4 }}>
                        Drive storage (admin only):{" "}
                        <a href={videoFolderUrl} target="_blank" rel="noopener noreferrer"
                          style={{ color: "var(--color-text-muted)", textDecoration: "underline" }}>
                          📂 04_Video_Output ↗
                        </a>
                      </p>
                    )}

                    <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 8, lineHeight: 1.7 }}>
                      No background music included. Add in Facebook / CapCut / Canva.
                      <br />视频不含背景音乐，可在 Facebook / CapCut / Canva 中自行添加。
                    </p>
                  </div>
                )}

                {videoStatus === "error" && (
                  <div>
                    <div className="notice notice--warning" style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: "0.82rem" }}>⚠️ {videoMsg}</p>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => { setVideoStatus("idle"); setVideoMsg(null); }}>
                      Try Again
                    </button>
                  </div>
                )}

                {!isApiConnected() && videoStatus === "idle" && (
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 6 }}>
                    Requires API connection (VITE_STUDIO_EXEC_URL).
                  </p>
                )}
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
