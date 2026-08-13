import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { t } from "../../translations";
import { useLang } from "../../contexts/LangContext";
import { AL, getStatusLabel } from "../../utils/adminLabels";
import { formatListingDate, formatMonthlyRent, splitFeatureList } from "../../utils/listingFormat";
import { getListing, saveListing, syncVideoUrl, updateVideoUrl, getListingFolderFiles, getCollagePhotoData, getListingSubfolderFiles, uploadToSubfolder, uploadBase64ToSubfolder, getApplicationsByListing } from "../../utils/storage";
import { downloadApplicantInitialScreeningSummary, openApplicantReportWindow } from "../../utils/applicantScreeningReports";
import { generateOutputs } from "../../utils/generateContent";
import { addRentalApplicationProcessNoticeToOutput } from "../../utils/rentalApplicationNotice";
import { isApiConnected, apiPost } from "../../utils/api";
import { getStudioRequestAuth, isAdminSessionActive } from "../../utils/trialAccess";
import { saveVideoBlob, loadVideoBlob } from "../../utils/videoCache";
import { getListingDisplayStatus, PUBLIC_LISTING_STATUS_OPTIONS, resolveRentalListingCover } from "../../utils/listingPublicMeta";
import { resolveDriveVideoEmbedUrl } from "../../utils/videoUrls";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import PrototypeBanner from "../../components/PrototypeBanner";
import { generateCollageDataUrl, resolveCollagePhotos } from "../../utils/generateCollage";
import { buildRentalListingPublicUrl } from "../../utils/publicUrls";
import RentalWorkflowNav from "../../components/RentalWorkflowNav";
import ListingStatusBanner from "../../components/ListingStatusBanner";
import CollapsibleCard from "../../components/CollapsibleCard";

function getTabLabels(lang) {
  const zh = lang === "zh";
  return {
    "Facebook Post":        "📘 Facebook",
    "Craigslist Ad":        "📋 Craigslist",
    "WeChat Post":          zh ? "💬 微信" : "💬 WeChat",
    "Short Video Script":   zh ? "🎬 视频脚本" : "🎬 Video Script",
    "Owner Summary":        zh ? "📄 房东摘要" : "📄 Owner Summary",
    "English Rental Ad":    zh ? "🇬🇧 英文广告" : "🇬🇧 English Ad",
    "Chinese Owner Summary":zh ? "🇨🇳 中文版" : "🇨🇳 Chinese",
  };
}

const MAX_FILE_MB = 8;

// Fallback when manifest hasn't loaded yet
const MUSIC_NO_MUSIC_EN = { label: "No music", file: "none" };
const MUSIC_NO_MUSIC_ZH = { label: "不加音乐", file: "none" };

// ── Pure helpers (outside component — stable identity, no remount risk) ───────

function extractFolderId(link) {
  if (!link) return null;
  const m = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Distinguishes the listing-level Initial Screening Summary from the
// applicant-level Full Applicant Audit Report when listing saved PDFs from
// the Tenant Screening Reports folder. These are two different reports and
// must never be shown/labeled as the same thing.
function inferApplicantReportType(fileName = "") {
  const name = String(fileName || "").toLowerCase();
  if (name.includes("full_applicant_audit")) return "Full Applicant Audit Report";
  if (name.includes("applicant_initial_screening_summary")) return "Initial Screening Summary";
  return "Applicant Report";
}

// Cover = first file (numeric alpha order) whose name starts with "1".
// Falls back to first file if none match.
function sortByFilenameNumber(photos) {
  return [...photos].sort((a, b) => {
    return compareFileNames(a.name, b.name);
  });
}

function compareFileNames(a = "", b = "") {
  const left = splitFileName(a);
  const right = splitFileName(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    if (left[i] === undefined) return -1;
    if (right[i] === undefined) return 1;
    if (left[i].type === "number" && right[i].type === "number") {
      if (left[i].value !== right[i].value) return left[i].value - right[i].value;
      continue;
    }
    if (left[i].type !== right[i].type) return left[i].type === "number" ? -1 : 1;
    const textCompare = String(left[i].value).localeCompare(String(right[i].value));
    if (textCompare !== 0) return textCompare;
  }

  return String(a).localeCompare(String(b));
}

function splitFileName(name = "") {
  return (String(name).toLowerCase().match(/\d+|\D+/g) || [String(name).toLowerCase()])
    .map((part) => (/^\d+$/.test(part)
      ? { type: "number", value: Number(part) }
      : { type: "text", value: part }));
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
function DrivePhoto({ file, canOpenDrive = false }) {
  const [failed, setFailed] = useState(false);
  const src = file.thumbnailUrl
    || file.thumbUrlLg
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
        {canOpenDrive && file.url && (
          <a href={file.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.68rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
            Open in Drive ↗
          </a>
        )}
      </div>
    </div>
  );
}

// Marketplace photo card with order, exclude, and cover-select controls.
function PackagePhoto({ file, isFirst, isLast, isExcluded, isCover, coverIsManual,
  onMoveUp, onMoveDown, onExclude, onSetCover,
  inCollage, canAddToCollage, onToggleCollage }) {
  const lang = useLang();
  const [failed, setFailed] = useState(false);
  const src = file.thumbnailUrl
    || file.thumbUrl
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
      {/* Collage selection toggle */}
      {onToggleCollage && (
        <div style={{ padding: "4px 6px", borderTop: "1px solid var(--color-border)" }}>
          <button
            style={{
              width: "100%",
              fontSize: "0.62rem", padding: "3px 6px",
              border: `1px solid var(--color-primary)`,
              borderRadius: 3, cursor: (!inCollage && !canAddToCollage) ? "not-allowed" : "pointer",
              background:  inCollage  ? "var(--color-primary)" : "transparent",
              color:       inCollage  ? "#fff"                 : "var(--color-primary)",
              opacity:     (!inCollage && !canAddToCollage)    ? 0.45 : 1,
              lineHeight: 1.4,
            }}
            disabled={!inCollage && !canAddToCollage}
            onClick={onToggleCollage}
            title={inCollage ? "Remove from collage" : "Add to collage"}
          >
            {inCollage ? (lang === "zh" ? "✓ 已选" : "✓ In Collage") : (lang === "zh" ? "+ 加入拼图" : "+ Use in Collage")}
          </button>
        </div>
      )}
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

export default function ListingDetail({ lang: langProp }) {
  const langCtx = useLang();
  const lang = langCtx || langProp;
  const L = AL[lang] ?? AL.en;
  const TAB_LABELS = getTabLabels(lang);
  const MUSIC_NO_MUSIC = lang === "zh" ? MUSIC_NO_MUSIC_ZH : MUSIC_NO_MUSIC_EN;
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [listing,       setListing]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [activeTab,     setActiveTab]     = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [publishBlockedItems, setPublishBlockedItems] = useState(null);

  // Initial Screening Summary (listing-level applicant ranking report) state
  const [screeningSummaryBusy, setScreeningSummaryBusy] = useState(false);
  const [screeningReports, setScreeningReports] = useState([]);
  const [activeScreeningReport, setActiveScreeningReport] = useState(null);

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
  const [folderStatus,  setFolderStatus]  = useState("idle"); // idle|loading|loaded|empty|error
  const [folderError,   setFolderError]   = useState(null);
  const [photoOrder,    setPhotoOrder]    = useState([]);   // fileId[]
  const [excluded,      setExcluded]      = useState(new Set()); // Set<fileId>
  const [manualCover,   setManualCover]   = useState(null); // fileId | null
  const [coverFiles,    setCoverFiles]    = useState([]);   // files already in 03_Cover_Images/
  const [videoFiles,    setVideoFiles]    = useState([]);   // files already in 04_Video_Output/

  // Collage state
  const [collageStatus,    setCollageStatus]    = useState("idle"); // idle|loading|ready|saving|saved|error
  const [collageDataUrl,   setCollageDataUrl]   = useState(null);
  const [collageMsg,       setCollageMsg]       = useState("");
  const [collageFolderUrl, setCollageFolderUrl] = useState(null);
  const [collageSelection, setCollageSelection] = useState(new Set()); // Set<fileId>

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
  const [,               setVideoFileUrl]   = useState(null);
  const [videoFormat,    setVideoFormat]    = useState("landscape"); // "landscape" | "vertical"
  const [,               setVideoBlob]      = useState(null);        // raw Blob for download
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
        // "Save as Cover" persists this pointer to the sheet, and the public
        // page already reads it — the admin page only ever wrote it, which is
        // why a saved cover vanished from this screen on reload.
        if (l.coverImageFileId) setManualCover(l.coverImageFileId);
        const fid = extractFolderId(l.driveFolderLink);
        if (fid) {
          loadFolderFiles(fid);
          loadScreeningReports(fid, l.id);
          // Drive is the source of truth for generated output too. Without these
          // reads the admin page only ever saw the folder root, so a collage
          // cover or short video produced in an earlier session stayed invisible
          // here even though the file was sitting in Drive.
          loadCoverFiles(fid, l.id);
          loadVideoFiles(fid, l.id);
        }
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
        setVideoMsg(lang === "zh" ? "已从缓存加载视频。" : "Video loaded from cache.");
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
    setFolderStatus("loading");
    setFolderError(null);
    try {
      const files = await getListingFolderFiles(folderId, id);
      const resolved = sortByFilenameNumber(files || []);
      setFolderFiles(resolved);
      setPhotoOrder(resolved.map((f) => f.fileId));
      setFolderStatus(resolved.length > 0 ? "loaded" : "empty");
    } catch (err) {
      // Keep the last successful photo list visible. An API failure is not proof
      // that the Drive folder is empty.
      setFolderStatus("error");
      setFolderError(err?.message || "Unable to load photos from Drive.");
    } finally {
      setFolderLoading(false);
    }
  };

  // Rehydrate previously generated output from Drive. Both subfolders are
  // metadata-only reads (the same endpoint the public listing page uses), so
  // this adds no Base64 to the listing load path.
  const loadCoverFiles = async (folderId, listingId) => {
    try {
      const res = await getListingSubfolderFiles(folderId, "03_Cover_Images", listingId);
      setCoverFiles(res?.files || []);
      if (res?.subfolderUrl) setCollageFolderUrl(res.subfolderUrl);
    } catch {
      // A failed read is not proof the folder is empty — leave what we have.
    }
  };

  const loadVideoFiles = async (folderId, listingId) => {
    try {
      const res = await getListingSubfolderFiles(folderId, "04_Video_Output", listingId);
      setVideoFiles(res?.files || []);
      if (res?.subfolderUrl) setVideoFolderUrl(res.subfolderUrl);
    } catch {
      // Same as above — keep the existing state rather than showing "none".
    }
  };

  // ── Initial Screening Summary (listing-level applicant ranking report) ────────
  // This is a LISTING-level report covering all applicants for ranking/shortlisting.
  // It is distinct from the applicant-level Full Applicant Audit Report generated
  // on the Application Review page, and does not depend on Supporting Documents.
  const handleGenerateInitialScreeningSummary = async () => {
    if (!listing?.id) return;
    setScreeningSummaryBusy(true);
    try {
      const applications = await getApplicationsByListing(listing.id);
      const result = await downloadApplicantInitialScreeningSummary({ listing, applications, lang });
      const report = {
        id: `${result.reportType}-${Date.now()}`,
        title: result.title,
        reportType: result.reportType,
        generatedAt: result.generatedAt,
        fileName: result.saveResult?.fileName || result.fileName,
        html: result.html,
        status: result.saveResult?.url ? "saved" : "local",
        driveUrl: result.saveResult?.url || "",
      };
      setScreeningReports((prev) => {
        const reportKey = `${report.reportType}::${report.fileName}`;
        const withoutSameReport = prev.filter((item) => `${item.reportType}::${item.fileName}` !== reportKey);
        return [report, ...withoutSameReport];
      });
      setActiveScreeningReport(report);
    } catch (e) {
      alert((lang === "zh" ? "初步筛选汇总生成失败：" : "Initial screening summary failed: ") + (e.message || "unknown error"));
    } finally {
      setScreeningSummaryBusy(false);
    }
  };

  async function loadScreeningReports(folderId, listingId) {
    if (!folderId && !listingId) return;
    try {
      const result = await getListingSubfolderFiles(folderId || "", "Tenant Screening Reports", listingId || "");
      const reports = (result?.files || [])
        .filter((file) => /\.pdf$/i.test(file.name || ""))
        .map((file) => {
          const reportType = inferApplicantReportType(file.name);
          return {
            id: `drive-${file.fileId || file.name}`,
            title: reportType === "Initial Screening Summary"
              ? (lang === "zh" ? "申请人初步筛选汇总" : "Applicant Initial Screening Summary")
              : reportType === "Full Applicant Audit Report"
                ? (lang === "zh" ? "申请人完整审核报告" : "Full Applicant Audit Report")
                : (lang === "zh" ? "申请人筛选报告" : "Applicant Screening Report"),
            reportType,
            generatedAt: file.modifiedAt || new Date().toISOString(),
            fileName: file.name || "Applicant_Report.pdf",
            html: "",
            status: "saved",
            driveUrl: file.url || "",
            source: "drive",
          };
        })
        .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
      setScreeningReports((prev) => {
        const combined = [...prev, ...reports];
        const seen = new Set();
        return combined.filter((report) => {
          const key = `${report.reportType}::${report.fileName}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    } catch (e) {
      console.warn("[loadScreeningReports] failed", e);
    }
  }

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
    const update = {
      ...listing,
      status: val,
      // When publishing, stamp the public URL and admin package URL into the sheet
      publishedLink:    val === "Published" ? (listing.publishedLink    || buildRentalListingPublicUrl(listing.id)) : listing.publishedLink,
      finalPackageLink: val === "Published" ? (listing.finalPackageLink || `${window.location.origin}/admin/listing/${listing.id}`) : listing.finalPackageLink,
    };
    await persist(update);
    // Re-read from Google Sheet to confirm the write landed in column V
    try {
      const fresh = await getListing(id);
      if (fresh) setListing(fresh);
    } catch {
      /* Re-read failure should not block the saved local status update. */
    }
  };

  // Primary publish entry point — validates readiness, then reuses updateOverallStatus.
  const handlePublishListing = async () => {
    if (publishMissing.length > 0) {
      setPublishBlockedItems(publishMissing);
      return;
    }
    setPublishBlockedItems(null);
    await updateOverallStatus("Published");
  };

  const handleSaveAsDraft = async () => {
    setPublishBlockedItems(null);
    await updateOverallStatus("Draft");
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
    setEditingText(addRentalApplicationProcessNoticeToOutput(
      key,
      editedCopy[key] ?? listing.outputs?.[key] ?? ""
    ));
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
      available: listing.available || "",
      rent: String(listing.rent || ""),
      bedrooms: String(listing.bedrooms || ""),
      bathrooms: String(listing.bathrooms || ""),
      utilities: listing.utilities || "",
      pets: listing.pets || "",
      parking: listing.parking || "",
      features: listing.features || "",
      listingStatus: getListingDisplayStatus(listing),
      openHouseDateTime: listing.openHouseDateTime || "",
      openHouseViewingInstructions: listing.openHouseViewingInstructions || "",
      openHouseParkingNotes: listing.openHouseParkingNotes || "",
    });
    setInfoEditMode(true);
  };

  const cancelEditInfo = () => { setInfoEditMode(false); setInfoDraft({}); };

  const saveInfoToSheet = async () => {
    setInfoSaving(true);
    try {
      const updated = {
        ...listing,
        ...infoDraft,
        listingStatus: infoDraft.listingStatus || "Available",
      };
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
  const MAX_BATCH = 20;

  const handleFileChange = (e) => {
    const MAX_PHOTOS = 50;
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const currentCount = folderFiles.length;
    const remaining = Math.max(0, MAX_PHOTOS - currentCount);
    if (currentCount >= MAX_PHOTOS) {
      setUploadMsg({ type: "error", text: lang === "zh" ? `已达到照片上限（最多 ${MAX_PHOTOS} 张）。` : `Photo limit reached (max ${MAX_PHOTOS}).` });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const clipped = selected.slice(0, Math.min(MAX_BATCH, remaining));
    if (selected.length > remaining) {
      setUploadMsg({ type: "error", text: lang === "zh" ? `还可上传 ${remaining} 张（总上限 ${MAX_PHOTOS} 张）。` : `Only ${remaining} more photo(s) can be uploaded (max ${MAX_PHOTOS} total).` });
    } else if (selected.length > MAX_BATCH) {
      setUploadMsg({ type: "error", text: lang === "zh" ? `一次最多上传 ${MAX_BATCH} 张，已选择 ${selected.length} 张，先上传前 ${MAX_BATCH} 张。剩余照片请再次选择上传。` : `You can upload up to ${MAX_BATCH} photos at once. You selected ${selected.length} — uploading the first ${MAX_BATCH} now. Select the rest in a second batch.` });
    }
    const batch = clipped;
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
      setUploadProgress(lang === "zh" ? `正在上传第 ${i + 1} / ${files.length} 张…` : `Uploading ${i + 1} of ${files.length}…`);
      try {
        await uploadToSubfolder(folderId, "", files[i], id);
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
      setUploadMsg({ type: "error", text: (lang === "zh" ? "上传失败。" : "Upload failed. ") + errors[0] });
    } else if (errors.length > 0) {
      setUploadMsg({
        type: "success",
        text: lang === "zh"
          ? `成功上传 ${succeeded} 张，失败 ${errors.length} 张：${errors[0]}`
          : `Uploaded ${succeeded} succeeded, ${errors.length} failed: ${errors[0]}`,
      });
    } else {
      setUploadMsg({ type: "success", text: lang === "zh" ? `成功上传 ${succeeded} 张照片。` : `Uploaded ${succeeded} photo(s) successfully.` });
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
        <Link to="/admin/rental" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>← Rental Dashboard</Link>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const isAdmin    = isAdminSessionActive();
  const canGenerateApplicantReports = Boolean(isAdmin || listing);
  const initialSummaryReports = screeningReports
    .filter((r) => r.reportType === "Initial Screening Summary")
    .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
  const latestInitialSummary = initialSummaryReports[0] || null;
  const initialSummaryStatus = !latestInitialSummary
    ? (lang === "zh" ? "未生成" : "Not generated")
    : latestInitialSummary.driveUrl
      ? (lang === "zh" ? "已生成" : "Generated")
      : (lang === "zh" ? "Drive 保存失败" : "Drive save failed");
  const outputKeys = Object.keys(listing.outputs || {});
  const currentTab = activeTab || outputKeys[0];

  // Wizard step from URL (used by RentalWorkflowNav + CollapsibleCard defaults)
  const activeStep = searchParams.get("step");

  // Build ordered + filtered photo arrays for all package sections
  const orderedPhotos = photoOrder.map((fid) => folderFiles.find((f) => f.fileId === fid)).filter(Boolean);
  const activePhotos  = orderedPhotos.filter((f) => !excluded.has(f.fileId));

  // Publish readiness — reuses existing listing fields, no new schema needed.
  const publishChecklist = [
    { key: "info",   ok: !!(listing.address && listing.city), label: lang === "zh" ? "房源基本信息（地址/城市）" : "Basic listing info (address/city)" },
    { key: "avail",  ok: !!listing.available,                 label: lang === "zh" ? "可入住日期" : "Available date" },
    { key: "rent",   ok: !!listing.rent,                      label: lang === "zh" ? "租金" : "Monthly rent" },
    { key: "photos", ok: activePhotos.length > 0,             label: lang === "zh" ? "至少一张房源照片" : "At least one listing photo" },
    { key: "copy",   ok: outputKeys.length > 0,                label: lang === "zh" ? "已生成广告文案" : "Generated ad copy" },
  ];
  const publishMissing = publishChecklist.filter((c) => !c.ok).map((c) => c.label);

  // Effective cover: manual selection takes priority over auto-detect
  let effectiveCover, coverIsManual, coverIsFallback;
  if (manualCover) {
    // The saved cover normally lives in 03_Cover_Images/, not the folder root,
    // so search both. resolveRentalListingCover — the same helper the public
    // page uses — builds a thumbnail straight from the fileId if the subfolder
    // listing has not arrived yet, so the cover still renders.
    effectiveCover  = [...coverFiles, ...folderFiles].find((f) => f.fileId === manualCover)
      || resolveRentalListingCover([], [], manualCover);
    coverIsManual   = true;
    coverIsFallback = false;
  } else {
    const ci = detectCoverPhoto(activePhotos);
    effectiveCover  = ci.coverFile;
    coverIsManual   = false;
    coverIsFallback = ci.isFallback;
  }

  // Video already sitting in 04_Video_Output/, matched to the selected format.
  // Drives the reload player when no locally cached blob exists.
  const driveVideoFile = videoFiles.length === 0
    ? null
    : (videoFiles.find((f) => String(f.name || "").endsWith(`__${videoFormat}.mp4`)) || videoFiles[0]);
  const driveVideoEmbedUrl = driveVideoFile ? resolveDriveVideoEmbedUrl(driveVideoFile) : "";

  const statusBadgeClass = {
    Draft: "badge--draft", "In Review": "badge--review",
    "Ready to Publish": "badge--ready", Published: "badge--published",
  };
  const publicListingStatus = getListingDisplayStatus(listing);

  const mediaItems = [t(lang, "detail.m1"), t(lang, "detail.m2"), t(lang, "detail.m3"), t(lang, "detail.m4")];

  // ── Enhanced Photos Preview ──────────────────────────────────────────────────
  async function loadEnhancedPhotos(subfolderId) {
    if (!subfolderId) return;
    setEnhancedLoading(true);
    try {
      const files = await getListingFolderFiles(subfolderId, id);
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
          ...getStudioRequestAuth("rental"),
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
        if (audioCtx) { try { audioCtx.close(); } catch { /* ignore audio cleanup errors */ } audioCtx = null; }
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
    const pubUrl = buildRentalListingPublicUrl(listing.id);
    const feats  = splitFeatureList(listing.features);

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
        ctx.fillText("Contact Vanisland", W / 2, cy + 76);
        const uf = `400 18px monospace`;
        ctx.font = uf; ctx.fillStyle = "rgba(147,197,253,0.90)";
        ctx.fillText(fitText(pubUrl, W - 140, uf), W / 2, cy + 130);
      } else {
        ctx.font = `700 42px ${FF}`; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("View Full Listing", W / 2, cy - 80);
        ctx.font = `700 42px ${FF}`; ctx.fillStyle = "#F59E0B";
        ctx.fillText("Apply Online", W / 2, cy - 14);
        ctx.font = `500 24px ${FF}`; ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText("Contact Vanisland", W / 2, cy + 60);
        const uf = `400 16px monospace`;
        ctx.font = uf; ctx.fillStyle = "rgba(147,197,253,0.90)";
        ctx.fillText(fitText(pubUrl, W - 80, uf), W / 2, cy + 118);
      }
    }

    function fadeBlack(drawBase, alpha) {
      drawBase();
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    function sceneCaption(idx) {
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
    // Photo slides — first photo gets intro overlay text instead of dark title card
    for (let i = 0; i < validImages.length; i++) {
      const img = validImages[i];
      const cap = sceneCaption(i);
      setVideoProgress({ slide: i + 1, total: totalScenes });
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
    setVideoProgress({ slide: totalScenes, total: totalScenes });
    await renderFor(p => {
      drawPhotoOutro(outroImg);
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
    }, 0.4);
    await renderFor(() => drawPhotoOutro(outroImg), 3.0);
    await renderFor(p => fadeBlack(() => drawPhotoOutro(outroImg), p), 0.4);

    // Stop preview audio
    if (audioSource) { try { audioSource.stop(); } catch { /* ignore audio cleanup errors */ } }
    if (audioCtx)    { try { audioCtx.close();   } catch { /* ignore audio cleanup errors */ } }

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
        ...getStudioRequestAuth("rental"),
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

      let writeOk      = false;
      let confirmedUrl = driveUrl;

      // Primary: syncVideoUrl — scans Drive folder, confirms file, sets permission, writes sheet
      try {
        const sr = await syncVideoUrl(listingId);
        console.log("[videoUrl write-back] syncVideoUrl SUCCESS →", sr);
        confirmedUrl = sr?.videoUrl || driveUrl;
        writeOk = true;
      } catch (syncErr) {
        console.error("[videoUrl write-back] syncVideoUrl FAILED:", syncErr.message);
      }

      // Fallback 1: updateVideoUrl (direct cell write with URL from upload result)
      if (!writeOk && driveUrl) {
        try {
          const wr = await updateVideoUrl(listingId, driveUrl);
          console.log("[videoUrl write-back] updateVideoUrl fallback SUCCESS →", wr);
          writeOk = true;
        } catch (writeErr) {
          console.error("[videoUrl write-back] updateVideoUrl fallback FAILED:", writeErr.message);
        }
      }

      // Fallback 2: full saveListing
      if (!writeOk && driveUrl) {
        try {
          await saveListing({ ...listingRef.current, videoUrl: driveUrl });
          console.log("[videoUrl write-back] saveListing fallback SUCCESS");
          writeOk = true;
        } catch (saveErr) {
          console.error("[videoUrl write-back] saveListing fallback FAILED:", saveErr.message);
        }
      }

      // Update local state with the confirmed URL
      if (confirmedUrl) {
        const updatedListing = { ...listingRef.current, videoUrl: confirmedUrl };
        setListing(updatedListing);
        listingRef.current = updatedListing;
        setVideoFileUrl(confirmedUrl);
      }

      if (writeOk) {
        setVideoMsg(prev => (prev || "") + " ✅ videoUrl saved to sheet.");
      } else {
        setVideoMsg(prev => (prev || "") + " ⚠️ videoUrl write-back failed — check console.");
      }
    } catch (err) {
      setVideoStatus("done"); // still show preview even if Drive upload fails
      setVideoMsg(`Video ready. Drive upload failed: ${err.message}`);
      setVideoMusicStatus(musicStatus);
    }
  }

  // ── Collage cover generator ──────────────────────────────────────────────────
  function buildRentOverlay(l) {
    if (!l) return null;
    const hasBeds = l.bedrooms || l.bathrooms;
    const title   = hasBeds
      ? `${l.bedrooms || "?"} Bed / ${l.bathrooms || "?"} Bath`
      : null;
    const loc = l.city ? `${l.city}, BC` : null;
    let price = null;
    if (l.rent) {
      const n = Number(String(l.rent).replace(/[^0-9.]/g, ""));
      if (!isNaN(n) && n > 0) price = `$${n.toLocaleString()}/month`;
    }
    let date = null;
    if (l.available && String(l.available).trim()) {
      date = `Available: ${String(l.available).trim().slice(0, 10)}`;
    }
    const contactName = l.contactName || l.ownerName || "";
    const contactPhone = l.contactPhone || l.ownerPhone || l.phone || "";
    const contact = [contactName, contactPhone].filter(Boolean).join(" · ") || null;
    return {
      badge:      "FOR RENT",
      title,
      location:   loc,
      address:    l.address   || null,
      priceLabel: price,
      contactLine: contact,
      dateLabel:  date,
    };
  }

  function toggleCollagePhoto(fileId) {
    setCollageSelection((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else if (next.size < 5) {
        next.add(fileId);
      }
      return next;
    });
  }

  async function handleGenerateCollage() {
    const pool    = activePhotos.filter((f) => f.fileId);
    const sources = resolveCollagePhotos(pool, collageSelection, (f) => f.fileId, effectiveCover?.fileId);
    if (sources.length < 2) {
      setCollageStatus("error");
      setCollageMsg(lang === "zh" ? "需要至少 2 张照片，请先从 Drive 同步。" : "At least 2 photos are needed. Sync photos from Drive first.");
      return;
    }
    setCollageStatus("loading");
    setCollageMsg("");
    setCollageDataUrl(null);
    try {
      // Read only the final selected photos on demand. Do not put these data
      // URLs into folderFiles; the normal listing response stays metadata-only.
      const photoResults = await getCollagePhotoData(id, sources.map((f) => f.fileId));
      const resultById = new Map((photoResults || []).map((result) => [result.fileId, result]));
      const loadedCount = sources.filter((photo) => resultById.get(photo.fileId)?.dataUrl).length;
      const failedCount = sources.length - loadedCount;
      if (failedCount > 0) {
        throw new Error(
          lang === "zh"
            ? `拼图照片读取失败：${loadedCount} 张成功，${failedCount} 张失败。`
            : `Collage photo loading failed: ${loadedCount} succeeded, ${failedCount} failed.`
        );
      }
      const imageSrcs = sources.map((photo) => resultById.get(photo.fileId).dataUrl);
      const dataUrl = await generateCollageDataUrl(imageSrcs, {
        overlayData: buildRentOverlay(listing),
      });
      setCollageDataUrl(dataUrl);
      setCollageStatus("ready");
    } catch (err) {
      setCollageStatus("error");
      setCollageMsg(err.message || (lang === "zh" ? "拼图生成失败。" : "Collage generation failed."));
    }
  }

  async function handleSaveCollage() {
    if (!collageDataUrl || !listing) return;
    const folderId = extractFolderId(listing?.driveFolderLink);
    if (!folderId) {
      setCollageStatus("error");
      setCollageMsg(lang === "zh" ? "此房源没有关联的 Drive 文件夹。" : "No Drive folder linked to this listing.");
      return;
    }
    setCollageStatus("saving");
    setCollageMsg("");
    try {
      const base64 = collageDataUrl.split(",")[1];
      const ts = Date.now();
      const fileName = `collage_cover__${ts}.jpg`;
      const res = await uploadBase64ToSubfolder({
        folderId,
        listingId:     listing.id,
        subfolderName: "03_Cover_Images",
        fileName,
        mimeType:      "image/jpeg",
        data:          base64,
      });
      if (res?.subfolderUrl) setCollageFolderUrl(res.subfolderUrl);
      const fileId = res?.fileId;
      if (!fileId) throw new Error("Upload succeeded but no fileId was returned.");
      // Inject a synthetic folderFiles entry so the cover thumbnail renders immediately
      const syntheticFile = {
        fileId,
        name: fileName,
        dataUrl: collageDataUrl,
        thumbUrl: collageDataUrl,
        thumbUrlLg: collageDataUrl,
      };
      setFolderFiles((prev) => {
        if (prev.some((f) => f.fileId === fileId)) return prev;
        return [...prev, syntheticFile];
      });
      setPhotoOrder((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
      setManualCover(fileId);
      // Persist active cover fileId to listing sheet so public pages can find it
      const currentListing = listingRef.current;
      let coverPersisted = true;
      if (currentListing) {
        try {
          await persist({ ...currentListing, coverImageFileId: fileId });
        } catch {
          // The image is safely in Drive, but the cover assignment did not reach
          // the sheet — say so rather than reporting a save that a refresh loses.
          coverPersisted = false;
        }
      }
      setCollageStatus(coverPersisted ? "saved" : "error");
      setCollageMsg(
        coverPersisted
          ? (lang === "zh" ? "拼图封面已保存并设为主图。" : "Collage saved to 03_Cover_Images/ and set as cover.")
          : (lang === "zh"
              ? "拼图已保存到 03_Cover_Images/，但设为主图未能保存，请重新点击保存。"
              : "Collage saved to 03_Cover_Images/, but setting it as cover did not save. Please click save again.")
      );
    } catch (err) {
      setCollageStatus("error");
      setCollageMsg(err.message || (lang === "zh" ? "保存失败。" : "Failed to save collage."));
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
          {saving && <span className="text-muted text-sm">{L.saving}</span>}
          <span className={`badge ${statusBadgeClass[listing.status] || "badge--draft"}`}>{getStatusLabel(listing.status, lang)}</span>
          <select className="select-control" value={listing.status}
            onChange={(e) => updateOverallStatus(e.target.value)} disabled={saving}>
            {["Draft", "In Review", "Ready to Publish", "Published"].map((s) => <option key={s} value={s}>{getStatusLabel(s, lang)}</option>)}
          </select>
          <a href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer"
            className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}>
            🔗 {L.openPublicListingPreview}
          </a>
          <Link to="/admin/rental" className="btn btn--ghost btn--sm"
            style={saving ? { pointerEvents: "none", opacity: 0.5 } : {}}>
            ← {L.rentalDashboard}
          </Link>
        </div>
      </div>

      {/* Rental Workflow Navigator */}
      <RentalWorkflowNav listing={listing} />

      {/* Status + Next Step Banner */}
      <ListingStatusBanner listing={listing} />

      <section className="admin-workflow-entry-card" aria-label={lang === "zh" ? "申请管理" : "Application Management"}>
        <div>
          <p className="admin-workflow-entry-card__eyebrow">
            {lang === "zh" ? "申请管理" : "Application Management"}
          </p>
          <h2>{lang === "zh" ? "查看申请、初筛摘要与审核报告" : "View applications, screening summaries, and audit reports"}</h2>
          <p>
            {lang === "zh"
              ? "进入申请管理页面，查看申请人、支持文件状态、初筛摘要、审核报告与 PDF。"
              : "Open Application Management to review applicants, document status, screening summaries, audit reports, and PDFs."}
          </p>
        </div>
        <div className="admin-workflow-entry-card__actions">
          <Link to={`/admin/leads?listingId=${encodeURIComponent(listing.id)}`} className="btn btn--primary btn--sm">
            {lang === "zh" ? "查看本房源申请" : "View Applications for This Listing"}
          </Link>
          <Link to={`/apply/${listing.id}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
            {lang === "zh" ? "打开申请入口" : "Open Application Link"}
          </Link>
          {canGenerateApplicantReports && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={screeningSummaryBusy}
              onClick={handleGenerateInitialScreeningSummary}
            >
              {screeningSummaryBusy
                ? (lang === "zh" ? "生成中..." : "Generating...")
                : latestInitialSummary
                  ? (lang === "zh" ? "重新生成初筛汇总报告" : "Regenerate Initial Screening Summary")
                  : (lang === "zh" ? "生成初筛汇总报告" : "Generate Initial Screening Summary")}
            </button>
          )}
          {latestInitialSummary && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setActiveScreeningReport(latestInitialSummary)}
            >
              {lang === "zh" ? "查看初筛汇总报告" : "View Initial Screening Summary"}
            </button>
          )}
          {latestInitialSummary?.driveUrl && (
            <a href={latestInitialSummary.driveUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              {lang === "zh" ? "下载初筛报告 PDF" : "Download Initial Summary PDF"}
            </a>
          )}
        </div>
        <p className="text-muted text-sm" style={{ marginTop: 10 }}>
          {(lang === "zh" ? "初筛汇总状态：" : "Initial Summary status: ") + initialSummaryStatus}
        </p>
      </section>

      {screeningReports.length > 0 && (
        <div className="card mb-24">
          <div className="flex-between" style={{ gap: 12, alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-primary)", marginBottom: 4 }}>
                {lang === "zh" ? "申请人筛选报告" : "Applicant Screening Reports"}
              </h3>
              <p className="text-muted text-sm">
                {lang === "zh"
                  ? "此处显示已保存到 Tenant Screening Reports 的初筛汇总报告与完整审核报告（两者不会混用）。"
                  : "Shows saved Initial Screening Summary and Full Applicant Audit reports from Tenant Screening Reports (never mixed together)."}
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {screeningReports.map((report) => (
              <div key={report.id} style={{ border: "1px solid #dfe8df", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{report.title}</strong>
                  <p className="text-muted text-sm" style={{ margin: "4px 0 0" }}>
                    {(lang === "zh" ? "类型：" : "Type: ")}{report.reportType}
                    {" · "}
                    {(lang === "zh" ? "生成时间：" : "Generated: ")}
                    {new Date(report.generatedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-CA")}
                  </p>
                  <p className="text-muted text-sm" style={{ margin: "4px 0 0" }}>{report.fileName}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {report.html && (
                    <>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setActiveScreeningReport(report)}>
                        {lang === "zh" ? "查看报告" : "View Report"}
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openApplicantReportWindow(report.html)}>
                        {lang === "zh" ? "下载 PDF" : "Download PDF"}
                      </button>
                    </>
                  )}
                  {isAdmin && report.driveUrl && (
                    <a href={report.driveUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                      {report.html ? "Drive" : (lang === "zh" ? "打开归档报告" : "Open Archived Report")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeScreeningReport && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(20, 31, 27, 0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 10, width: "min(1100px, 96vw)", height: "min(860px, 92vh)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #dfe8df", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <strong>{activeScreeningReport.title}</strong>
                <p className="text-muted text-sm" style={{ margin: 0 }}>{activeScreeningReport.fileName}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {activeScreeningReport.html ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openApplicantReportWindow(activeScreeningReport.html)}>
                    {lang === "zh" ? "下载 PDF" : "Download PDF"}
                  </button>
                ) : activeScreeningReport.driveUrl ? (
                  <a href={activeScreeningReport.driveUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                    {lang === "zh" ? "打开归档报告" : "Open Archived Report"}
                  </a>
                ) : null}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setActiveScreeningReport(null)}>
                  {lang === "zh" ? "关闭" : "Close"}
                </button>
              </div>
            </div>
            {activeScreeningReport.html ? (
              <iframe
                title={activeScreeningReport.title}
                srcDoc={activeScreeningReport.html}
                style={{ border: 0, width: "100%", flex: 1, background: "#fff" }}
              />
            ) : (
              <div style={{ padding: 24 }}>
                <p className="text-muted text-sm">
                  {lang === "zh"
                    ? "此报告来自 Drive 归档，未包含可预览内容，请使用“打开归档报告”查看。"
                    : "This report was loaded from the Drive archive and has no inline preview. Use \"Open Archived Report\" to view it."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property Info */}
      <CollapsibleCard
        title={t(lang, "detail.propertyInfo")}
        icon="🏠"
        defaultOpen={!activeStep || activeStep === "details"}
        id="section-details"
      >
      <div className="card">
        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", margin: 0 }}>
            🏠 {t(lang, "detail.propertyInfo")}
          </h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#3e5b4b",
              border: "1px solid #cddbcf",
              background: "#edf3ee",
              borderRadius: 999,
              padding: "3px 10px",
            }}>
              {L.publicStatus}: {getStatusLabel(publicListingStatus, lang)}
            </span>
            {infoEdited && !infoEditMode && (
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#16a34a", border: "1px solid #86efac", borderRadius: 4, padding: "1px 7px" }}>
                ✅ {L.savedToSheet}
              </span>
            )}
            {!infoEditMode && (
              <button className="btn btn--ghost btn--sm" onClick={startEditInfo}>
                ✏️ {L.editListingInfo}
              </button>
            )}
          </div>
        </div>

        {infoEditMode ? (
          /* ── Edit mode ──────────────────────────────────────────────────── */
          <>
            <div className="notice notice--info" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: "0.8rem" }}>
                {L.editingNotice.replace("{id}", listing.id)}
              </p>
            </div>
            <div className="info-grid">
              {/* Editable fields */}
              {[
                [L.fieldAvailableDate, "available", "text"],
                [L.fieldRentMonthly, "rent", "number"],
                [L.fieldBedrooms, "bedrooms", "number"],
                [L.fieldBathrooms, "bathrooms", "number"],
                [L.fieldUtilities, "utilities", "text"],
                [L.fieldPetPolicy, "pets", "text"],
                [L.fieldParking, "parking", "text"],
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
              <div className="info-item">
                <label>{L.fieldTenantListingStatus}</label>
                <select
                  value={infoDraft.listingStatus || "Available"}
                  onChange={(e) => setInfoDraft((p) => ({ ...p, listingStatus: e.target.value }))}
                  style={{
                    width: "100%", padding: "5px 8px", border: "1.5px solid var(--color-primary)",
                    borderRadius: 5, fontSize: "0.88rem", fontFamily: "inherit",
                    background: "#fff", color: "var(--color-text)", boxSizing: "border-box",
                  }}
                >
                  {PUBLIC_LISTING_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{getStatusLabel(status, lang)}</option>)}
                </select>
              </div>
              {/* Read-only fields */}
              {[
                [L.fieldOwnerName, listing.ownerName], [L.fieldPropertyAddress, listing.address],
                [L.fieldCity, listing.city], [L.fieldLeaseTerm, listing.leaseTerm],
                [L.fieldLaundry, listing.laundry], [L.fieldSmokingPolicy, listing.smoking],
                [L.fieldDefaultLanguage, listing.language], [L.fieldTargetAudience, listing.targetAudience],
              ].map(([label, val]) => (
                <div key={label} className="info-item"><label>{label}</label><p style={{ color: "var(--color-text-muted)" }}>{val || "—"}</p></div>
              ))}
            </div>
            {/* Key Features / Headline — full-width textarea */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                {L.fieldKeyFeatures}
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
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                {L.fieldOpenHouseDateTime}
              </label>
              <input
                value={infoDraft.openHouseDateTime || ""}
                onChange={(e) => setInfoDraft((p) => ({ ...p, openHouseDateTime: e.target.value }))}
                placeholder={L.openHouseDateTimePlaceholder}
                style={{
                  width: "100%", padding: "7px 10px", border: "1.5px solid var(--color-primary)",
                  borderRadius: 5, fontSize: "0.88rem", fontFamily: "inherit",
                  background: "#fff", color: "var(--color-text)", boxSizing: "border-box",
                }}
              />
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginTop: 12, marginBottom: 4 }}>
                {L.fieldOpenHouseViewingInstructions}
              </label>
              <textarea
                value={infoDraft.openHouseViewingInstructions || ""}
                onChange={(e) => setInfoDraft((p) => ({ ...p, openHouseViewingInstructions: e.target.value }))}
                rows={3}
                placeholder={L.openHouseViewingPlaceholder}
                style={{
                  width: "100%", padding: "7px 10px", border: "1.5px solid var(--color-primary)",
                  borderRadius: 5, fontSize: "0.88rem", fontFamily: "inherit",
                  background: "#fff", color: "var(--color-text)", boxSizing: "border-box", resize: "vertical",
                }}
              />
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginTop: 12, marginBottom: 4 }}>
                {L.fieldOpenHouseParkingNotes}
              </label>
              <textarea
                value={infoDraft.openHouseParkingNotes || ""}
                onChange={(e) => setInfoDraft((p) => ({ ...p, openHouseParkingNotes: e.target.value }))}
                rows={3}
                placeholder={L.openHouseParkingPlaceholder}
                style={{
                  width: "100%", padding: "7px 10px", border: "1.5px solid var(--color-primary)",
                  borderRadius: 5, fontSize: "0.88rem", fontFamily: "inherit",
                  background: "#fff", color: "var(--color-text)", boxSizing: "border-box", resize: "vertical",
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 8, lineHeight: 1.6 }}>
                {L.openHouseHint}
              </p>
            </div>
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn--primary btn--sm" onClick={saveInfoToSheet} disabled={infoSaving}>
                {infoSaving ? L.saving : `💾 ${L.saveToSheet}`}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={cancelEditInfo} disabled={infoSaving}>
                {L.cancel}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={resetInfoToSheet} disabled={infoSaving}
                style={{ color: "#dc2626" }}>
                ↩ {L.resetToSheetData}
              </button>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                {L.writesDirectlyNotice}
              </span>
            </div>
          </>
        ) : (
          /* ── View mode ──────────────────────────────────────────────────── */
          <>
            <div className="info-grid">
              {[
                [L.fieldOwnerName, listing.ownerName], [L.fieldPropertyAddress, listing.address],
                [L.fieldCity, listing.city], [L.fieldBedrooms, listing.bedrooms], [L.fieldBathrooms, listing.bathrooms],
                [L.fieldRent, formatMonthlyRent(listing.rent, lang)],
                [L.fieldAvailableDate, formatListingDate(listing.available, lang)], [L.fieldLeaseTerm, listing.leaseTerm],
                [L.fieldUtilities, listing.utilities], [L.fieldPetPolicy, listing.pets],
                [L.fieldParking, listing.parking], [L.fieldLaundry, listing.laundry],
                [L.fieldSmokingPolicy, listing.smoking], [L.fieldDefaultLanguage, listing.language],
                [L.fieldTargetAudience, listing.targetAudience], [L.fieldTenantListingStatus, getStatusLabel(publicListingStatus, lang)],
              ].map(([label, val]) => (
                <div key={label} className="info-item"><label>{label}</label><p>{val || "—"}</p></div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                {L.fieldTargetPlatforms}
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
                {L.fieldKeyFeaturesView}
              </label>
              {listing.features?.trim()
                ? <p style={{ fontSize: "0.9rem" }}>{listing.features}</p>
                : <span className="text-muted text-sm">—</span>}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                {L.fieldOpenHouseSettings}
              </label>
              <div style={{ display: "grid", gap: 8 }}>
                <p style={{ fontSize: "0.88rem", margin: 0 }}>
                  <strong>{L.fieldOpenHouseDateTime}:</strong> {listing.openHouseDateTime || "—"}
                </p>
                <p style={{ fontSize: "0.88rem", margin: 0 }}>
                  <strong>{L.fieldOpenHouseViewingInstructions}:</strong> {listing.openHouseViewingInstructions || "—"}
                </p>
                <p style={{ fontSize: "0.88rem", margin: 0 }}>
                  <strong>{L.fieldOpenHouseParkingNotes}:</strong> {listing.openHouseParkingNotes || "—"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      </CollapsibleCard>

      {/* Property Photos */}
      <CollapsibleCard
        title={L.photoAssets}
        icon="📁"
        defaultOpen={!activeStep || ["photos","enhance","cover","video"].includes(activeStep)}
        id="section-photos"
      >
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: "0.95rem", color: "var(--color-primary)" }}>
          📁 {L.photoAssets}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <p className="text-muted text-sm" style={{ margin: 0, flex: 1 }}>
                {lang === "zh" ? "读取 Drive 文件夹，原始文件不变。" : "Reading from Drive. Original files are not modified."}
              </p>
              <button className="btn btn--ghost btn--sm" disabled={folderLoading}
                onClick={() => { setManualCover(null); setExcluded(new Set()); loadFolderFiles(extractFolderId(listing.driveFolderLink)); }}
                style={{ whiteSpace: "nowrap" }}>
                {folderLoading ? "Loading…" : "↻ Refresh"}
              </button>
              {isAdmin && (
                <a href={listing.driveFolderLink} target="_blank" rel="noopener noreferrer"
                  className="btn btn--ghost btn--sm" style={{ whiteSpace: "nowrap" }}>
                  Open Folder ↗
                </a>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple
                style={{ display: "none" }} onChange={handleFileChange} />
              <button className="btn btn--ghost btn--sm" disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                style={{ whiteSpace: "nowrap" }}>
                {uploading ? (uploadProgress || "Uploading…") : "📤 Upload Photos"}
              </button>
            </div>
            {(previews.length > 0 || uploadMsg) && (
              <div style={{ marginBottom: 14 }}>
                {previews.length > 0 && (
                  <>
                    <p className="text-sm text-muted" style={{ marginBottom: 6 }}>
                      {uploadProgress || `Preparing ${previews.length} file(s)… (max ${MAX_FILE_MB} MB each, up to ${MAX_BATCH} at once)`}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      {previews.map((p, i) => (
                        <div key={i} style={{ width: 130, opacity: 0.65, border: "1px solid var(--color-border)", borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
                          <img src={p.url} alt={p.name} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                          <div style={{ padding: "4px 7px", fontSize: "0.7rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {uploadMsg && (
                  <div className={`notice notice--${uploadMsg.type === "error" ? "error" : "success"}`}>
                    <p>{uploadMsg.text}</p>
                  </div>
                )}
              </div>
            )}
            {folderLoading && <p className="text-muted text-sm" style={{ marginBottom: 14 }}>Loading photos…</p>}
            {folderStatus === "error" && (
              <div className="notice notice--error" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: "0.85rem" }}>
                  {lang === "zh"
                    ? "照片读取失败，已保留之前显示的照片。请稍后重试。"
                    : "Photos could not be loaded. Any previously loaded photos remain visible. Please try again."}
                </p>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => loadFolderFiles(extractFolderId(listing.driveFolderLink))}
                  style={{ marginTop: 6 }}
                >
                  {lang === "zh" ? "重试" : "Retry"}
                </button>
                {folderError && <small style={{ display: "block", marginTop: 6, opacity: 0.75 }}>{folderError}</small>}
              </div>
            )}
            {folderStatus === "empty" && folderFiles.length === 0 && (
              <div className="notice notice--info" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: "0.85rem" }}>
                  {lang === "zh"
                    ? "📤 还没有照片。请先使用上方「Upload Photos」按钮上传照片，之后才能使用封面选择与 AI 照片优化。"
                    : <>📤 No photos yet. Use <strong>Upload Photos</strong> above first — cover selection and AI photo enhancement will unlock once photos are uploaded.</>}
                </p>
              </div>
            )}

            {/* ── Detected Cover Photo ─────────────────────────────────── */}
            {folderFiles.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 10 }}>🖼️ {lang === "zh" ? "自动识别主图" : "Detected Cover Photo"}</p>
                {coverIsFallback && (
                  <div className="notice notice--info" style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: "0.82rem" }}>
                      {lang === "zh"
                        ? "未找到以「1」开头的文件名，已使用第一张图片作为主图替代。如需更换，请在下方照片包中使用「Set Cover」。"
                        : <>No filename starting with "1" was found. Using the first image as cover fallback. To set a different cover, use "Set Cover" in the photo package below.</>
                      }
                    </p>
                  </div>
                )}
                {effectiveCover && (
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <DrivePhoto file={effectiveCover} canOpenDrive={isAdmin} />
                    <div style={{ fontSize: "0.83rem", lineHeight: 2, color: "var(--color-text-muted)" }}>
                      {coverIsManual
                        ? <><strong style={{ color: "#f59e0b" }}>🟡 Manual Cover Selected</strong><br />File: <code>{effectiveCover.name}</code></>
                        : coverIsFallback
                          ? <><strong style={{ color: "#d97706" }}>📷 Current Cover</strong><br />File: <code>{effectiveCover.name}</code></>
                          : <><strong style={{ color: "var(--color-text)" }}>✅ Cover auto-detected</strong><br />Filename starts with "1": <code>{effectiveCover.name}</code></>
                      }
                      <br />{lang === "zh" ? "此图将作为房源主图使用。" : "This photo will be used as the listing cover image."}<br />
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

            {/* ── Collage Cover Generator ───────────────────────────────── */}
            {activePhotos.length >= 2 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>🖼️ {lang === "zh" ? "生成拼图封面" : "Generate Collage Cover"}</p>
                    {collageSelection.size > 0 && (
                      <span style={{ fontSize: "0.78rem", color: "var(--color-primary)", marginTop: 2, display: "inline-block" }}>
                        Selected for Collage: {collageSelection.size} / 5 &nbsp;
                        <button
                          type="button"
                          style={{ fontSize: "0.72rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                          onClick={() => setCollageSelection(new Set())}
                        >
                          {lang === "zh" ? "清空拼图选择" : "Clear Selection"}
                        </button>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={collageStatus === "loading" || collageStatus === "saving"}
                      onClick={handleGenerateCollage}
                    >
                      {collageStatus === "loading"
                        ? (lang === "zh" ? "生成中…" : "Generating…")
                        : collageStatus === "ready" || collageStatus === "saved"
                        ? (lang === "zh" ? "重新生成" : "Regenerate")
                        : (lang === "zh" ? "生成拼图封面" : "Generate Collage Cover")}
                    </button>
                    {collageStatus === "ready" && (
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={handleSaveCollage}
                      >
                        {lang === "zh" ? "保存为封面" : "Save as Cover"}
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 10 }}>
                  选择最多 5 张照片（点击下方"加入拼图"），或留空自动使用前 5 张。主图（Cover）优先显示在左侧大图位置。
                  <br />
                  Select up to 5 photos using "Use in Collage" buttons below, or leave empty to auto-use the first 5. The cover photo is placed in the main left panel.
                </p>
                {collageStatus === "error" && collageMsg && (
                  <div className="notice notice--error" style={{ marginBottom: 10 }}>
                    <p>{collageMsg}</p>
                  </div>
                )}
                {collageStatus === "saved" && collageMsg && (
                  <div className="notice notice--sage" style={{ marginBottom: 10 }}>
                    <p>{collageMsg}</p>
                    {isAdmin && collageFolderUrl && (
                      <a href={collageFolderUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.82rem" }}>
                        Open 03_Cover_Images/ folder ↗
                      </a>
                    )}
                  </div>
                )}
                {collageDataUrl && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ borderRadius: 10, overflow: "hidden", maxWidth: 520, background: "#eef2f0", marginBottom: 6 }}>
                      <img src={collageDataUrl} alt="Collage preview" style={{ width: "100%", display: "block" }} />
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                      {collageStatus === "saved"
                        ? (lang === "zh" ? "✅ 已保存并设为封面" : "✅ Saved and set as cover")
                        : (lang === "zh" ? "预览图 — 点击\"保存为封面\"上传。" : "Preview — click \"Save as Cover\" to upload.")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Marketplace Photo Package ─────────────────────────────── */}
            {folderFiles.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>🏠 {lang === "zh" ? "广告照片集" : "Marketplace Photo Package"}</p>
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
                      inCollage={collageSelection.has(f.fileId)}
                      canAddToCollage={collageSelection.size < 5}
                      onToggleCollage={() => toggleCollagePhoto(f.fileId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Light Enhancement Batch ───────────────────────────────── */}
            {activePhotos.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>✨ {lang === "zh" ? "轻度美化批次" : "Light Enhancement Batch"}</p>
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
                      {isAdmin && enhancedFolderUrl && (
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
                      {isAdmin && enhancedFolderUrl && (
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
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>🖼️ {lang === "zh" ? "美化照片预览" : "Enhanced Photos Preview"}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isAdmin && enhancedFolderUrl && (
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
                          {isAdmin && (
                            <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--color-primary)", fontWeight: 600 }}>
                              Open in Drive ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Short Video Generator ─────────────────────────────────── */}
            {activePhotos.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }}>🎬 {lang === "zh" ? "短视频生成" : "Short Video Generator"}</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 10, lineHeight: 1.7 }}>
                  Polished ~25–35 sec listing video. Ken Burns zoom · fade transitions · text overlays.
                  <br /><span style={{ fontSize: "0.78rem" }}>精美房源幻灯片视频，输出至 <code>04_Video_Output/</code>。</span>
                </p>

                {/* Photo source indicator */}
                <div style={{ marginBottom: 12, padding: "7px 12px", borderRadius: 7, background: enhancedPhotos.length > 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${enhancedPhotos.length > 0 ? "#86efac" : "#fde68a"}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem" }}>
                    <strong>{lang === "zh" ? "视频素材：" : "Video source:"}</strong>{" "}
                    {enhancedPhotos.length > 0 ? (
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>✅ {lang === "zh" ? `美化照片 (${enhancedPhotos.length})` : `Enhanced Photos (${enhancedPhotos.length} photos)`}</span>
                    ) : (
                      <span style={{ color: "#d97706", fontWeight: 600 }}>⚠️ {L.originalPhotos}</span>
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
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>📷 {lang === "zh" ? "视频照片" : "Video Photos"}</span>
                    {videoPhotoIds
                      ? <span style={{ fontSize: "0.74rem", background: "#EFF3F8", color: "var(--color-primary)", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
                          {lang === "zh" ? `已手动选择 ${videoPhotoIds.length} 张` : `Manual: ${videoPhotoIds.length} selected`}
                        </span>
                      : <span style={{ fontSize: "0.74rem", background: "#f0fdf4", color: "#16a34a", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
                          {lang === "zh" ? "自动按文件名数字排序" : "Auto (by filename order)"}
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
                        {lang === "zh" ? "重置自动" : "Reset to auto"}
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
                          {lang === "zh"
                            ? <>点击选择最多 {MAX_SEL} 张。数字为视频顺序。不选则自动按文件名数字取前 {MAX_SEL} 张。</>
                            : <>Click to select up to {MAX_SEL} photos. Numbers show video order. If nothing selected, first {MAX_SEL} by filename number are used.</>
                          }
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
                              {lang === "zh" ? "调整顺序：" : "Reorder:"}
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
                    {lang === "zh" ? "🎵 背景音乐" : "🎵 Background Music"}
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
                    {lang === "zh"
                      ? "仅使用免版权音乐。也可以稍后在 Facebook、剪映/CapCut 或 Canva 中添加音乐。"
                      : "Use royalty-free music only. Music can also be added later in Facebook, CapCut, or Canva."
                    }
                  </p>
                </div>

                {/* Format selector — disabled while rendering */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)" }}>{lang === "zh" ? "格式:" : "Format:"}</span>
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

                {/* Restore the player for a video already in 04_Video_Output/.
                    The <video> above is fed by a per-browser blob cache, so an
                    export made in another session had no playable source and the
                    preview disappeared on reload. Drive refuses <video> playback
                    (Content-Disposition: attachment), so its embeddable preview
                    player is used — no re-generation, no copy, no local cache. */}
                {videoStatus === "idle" && driveVideoEmbedUrl && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 8, color: "var(--color-primary)" }}>
                      {lang === "zh" ? "视频预览（来自 Drive）" : "Video Preview (from Drive)"}
                    </p>
                    <iframe
                      key={driveVideoEmbedUrl}
                      src={driveVideoEmbedUrl}
                      title={driveVideoFile?.name || "Listing video"}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      style={{
                        display: "block",
                        width: "100%",
                        maxWidth: videoFormat === "landscape" ? 640 : 300,
                        aspectRatio: videoFormat === "landscape" ? "16 / 9" : "9 / 16",
                        border: "none",
                        borderRadius: 8,
                        background: "#000",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
                      }}
                    />
                    <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: 6 }}>
                      <code>{driveVideoFile?.name}</code>
                      {" · "}
                      <a
                        href={driveVideoFile?.url || `https://drive.google.com/file/d/${driveVideoFile?.fileId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {lang === "zh" ? "在 Drive 中打开 ↗" : "Open in Drive ↗"}
                      </a>
                      {isAdmin && videoFolderUrl && (
                        <>
                          {" · "}
                          <a href={videoFolderUrl} target="_blank" rel="noopener noreferrer"
                            style={{ color: "var(--color-text-muted)", textDecoration: "underline" }}>
                            📂 04_Video_Output ↗
                          </a>
                        </>
                      )}
                    </p>
                    {videoFiles.length > 1 && (
                      <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                        {lang === "zh"
                          ? `Drive 中共有 ${videoFiles.length} 个已生成视频，正在显示与当前格式匹配的一个。`
                          : `${videoFiles.length} videos in Drive — showing the one matching the selected format.`}
                      </p>
                    )}
                  </div>
                )}

                {/* Progress */}
                {(videoStatus === "preparing" || videoStatus === "rendering") && (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-primary)", lineHeight: 1.8 }}>
                    <div>
                      {videoStatus === "preparing" && (lang === "zh" ? "准备照片中…" : "Preparing photos…")}
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
                      {lang === "zh" ? "实时渲染中，请保持当前页面。" : "Rendering runs in real time (~25–35 sec). Keep this tab open."}
                    </div>
                  </div>
                )}

                {videoStatus === "uploading" && (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-primary)" }}>
                    {lang === "zh" ? "正在保存至 Drive…" : "Saving video to Drive storage…"}
                  </div>
                )}

                {/* ── Completion: embedded preview + download ── */}
                {videoStatus === "done" && (
                  <div>
                    {/* Inline video player — no Drive required */}
                    {videoBlobUrl && (
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 8, color: "var(--color-primary)" }}>
                          {lang === "zh" ? "视频预览" : "Video Preview"}
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
                    {isAdmin && videoFolderUrl && (
                      <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 4 }}>
                        Drive storage (admin only):{" "}
                        <a href={videoFolderUrl} target="_blank" rel="noopener noreferrer"
                          style={{ color: "var(--color-text-muted)", textDecoration: "underline" }}>
                          📂 04_Video_Output ↗
                        </a>
                      </p>
                    )}

                    <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 8, lineHeight: 1.7 }}>
                      {lang === "zh"
                        ? "视频不含背景音乐，可在 Facebook / CapCut / Canva 中自行添加。"
                        : "No background music included. Add in Facebook / CapCut / Canva."
                      }
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

          </>
        )}
      </div>
      </CollapsibleCard>

      {/* Platform Outputs — with copy edit layer */}
      <CollapsibleCard
        title={t(lang, "detail.outputs")}
        icon="📤"
        defaultOpen={!activeStep || activeStep === "copy"}
        id="section-copy"
      >
      <div className="card">
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
          const displayText = addRentalApplicationProcessNoticeToOutput(
            currentTab,
            editedCopy[currentTab] ?? listing.outputs[currentTab]
          );
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
      </CollapsibleCard>

      {/* Media Checklist */}
      <CollapsibleCard
        title={t(lang, "detail.mediaChecklist")}
        icon="🖼️"
        defaultOpen={!activeStep || activeStep === "review" || activeStep === "publish"}
        id="section-checklist"
      >
      <div className="card">
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
      </CollapsibleCard>

      {/* ── Review Status Summary ──────────────────────────────────────────────── */}
      {folderFiles.length > 0 && (
        <div className="card mb-24" style={{ background: "#f8fafc" }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            📋 {lang === "zh" ? "审核状态" : "Review Status"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 7, padding: "10px 14px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Cover Photo</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                {coverIsManual ? "🟡 Manual Selected" : coverIsFallback ? "📷 Current Cover" : "✅ Auto Detected"}
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

      {/* ── Publish Action Panel ─────────────────────────────────────────────── */}
      <div className="card mb-24" id="section-publish" style={{ border: "2px solid var(--color-primary)" }}>
        <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: "1rem", color: "var(--color-primary)" }}>
          🚀 {lang === "zh" ? "发布房源" : "Publish Listing"}
        </h3>
        <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
          {lang === "zh"
            ? "确认以下内容准备就绪后发布，租客即可在公开房源页面看到并申请。"
            : "Confirm the items below are ready, then publish — tenants will be able to see and apply for this listing on the public page."}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 6 }}>
          {publishChecklist.map((c) => (
            <li key={c.key} style={{ fontSize: "0.85rem", color: c.ok ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{c.ok ? "✅" : "❌"}</span> {c.label}
            </li>
          ))}
        </ul>

        {publishBlockedItems && (
          <div className="notice notice--error" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: "0.85rem" }}>
              <strong>{lang === "zh" ? "⚠️ 尚不能发布 — 缺少：" : "⚠️ Cannot publish yet — missing:"}</strong>
              <br />{publishBlockedItems.join(lang === "zh" ? "、" : ", ")}
            </p>
          </div>
        )}

        {listing.status === "Published" && (
          <div className="notice notice--success" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 700 }}>✅ {lang === "zh" ? "已发布" : "Published"}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={handlePublishListing}>
            {saving
              ? (lang === "zh" ? "处理中…" : "Working…")
              : listing.status === "Published"
                ? (lang === "zh" ? "🚀 重新发布" : "🚀 Re-publish")
                : (lang === "zh" ? "🚀 发布房源" : "🚀 Publish Listing")}
          </button>
          <button type="button" className="btn btn--ghost" disabled={saving || listing.status === "Draft"} onClick={handleSaveAsDraft}>
            💾 {lang === "zh" ? "保存为草稿" : "Save Draft"}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => document.getElementById("section-details")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            ← {lang === "zh" ? "返回修改" : "Back to Edit"}
          </button>
        </div>

        {listing.status === "Published" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
            <a href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              🔗 {L.openPublicListingPreview}
            </a>
            <Link to={`/admin/leads?listingId=${encodeURIComponent(listing.id)}`} className="btn btn--ghost btn--sm">
              {lang === "zh" ? "查看租客申请" : "View Tenant Applications"}
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
