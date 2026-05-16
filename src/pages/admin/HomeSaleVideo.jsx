import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { apiPost, isApiConnected } from "../../utils/api";
import { getStudioRequestAuth, isAdminSessionActive } from "../../utils/trialAccess";
import { getListingSubfolderFiles } from "../../utils/storage";
import { saveVideoBlob, loadVideoBlob } from "../../utils/videoCache";
import {
  HOME_SALE_LANGUAGES,
  HOME_SALE_VIDEO_STATUS_OPTIONS,
  HOME_SALE_VIDEO_TYPES,
  createOrUpdateVideoScript,
  extractHomeSaleDriveFileId,
  getHomeSaleListing,
  getSaleMediaByListingId,
  getSalePhotoData,
  getSaleSubfolderFiles,
  getVideoScriptsByListingId,
  updateSaleListing,
} from "../../utils/homeSaleSheet";

const MUSIC_NO_MUSIC = { label: "No music / 不加音乐", file: "none" };

function extractFolderId(link) {
  if (!link) return null;
  const m = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function extractDriveFileId(url) {
  const text = String(url || "");
  const fileMatch = text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return "";
}

function buildDriveVideoPreviewUrl(file) {
  const fileId = String(file?.fileId || "").trim() || extractDriveFileId(file?.url || "");
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : "";
}

function buildDriveVideoStreamUrl(file) {
  const fileId = String(file?.fileId || "").trim() || extractDriveFileId(file?.url || "");
  return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : "";
}

function buildDriveVideoDownloadUrl(file) {
  const fileId = String(file?.fileId || "").trim() || extractDriveFileId(file?.url || "");
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : (file?.url || "");
}

function sortByFilenameNumber(files) {
  return [...files].sort((a, b) => {
    const n = s => { const m = s.match(/^(\d+)/); return m ? Number(m[1]) : Infinity; };
    return n(a.name) - n(b.name);
  });
}

function formatPrice(value) {
  const digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return "";
  const amount = Number(digits);
  if (Number.isNaN(amount)) return String(value || "");
  return `$${amount.toLocaleString()}`;
}

function emptyVideoForm(listingId) {
  return {
    scriptId: "", listingId,
    videoType: "Listing Video", language: "Chinese",
    voiceoverScript: "", subtitleText: "", musicStyle: "",
    videoLength: "", status: "Draft", outputMp4Url: "", notes: "",
  };
}

export default function HomeSaleVideo() {
  const { listingId } = useParams();
  const listingRef = useRef(null);

  // Listing + script sheet rows
  const [listing, setListing] = useState(null);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState(emptyVideoForm(listingId));
  const [submitting, setSubmitting] = useState(false);

  // Photo state
  const [folderFiles,    setFolderFiles]    = useState([]);
  const [enhancedPhotos, setEnhancedPhotos] = useState([]);
  const [photoSourceType, setPhotoSourceType] = useState("original"); // "original" | "enhanced"
  const [videoOutputFiles, setVideoOutputFiles] = useState([]);

  // Video generator state
  const [videoFormat,    setVideoFormat]    = useState("landscape");
  const [musicTrack,     setMusicTrack]     = useState("none");
  const [loadedMusicOptions, setLoadedMusicOptions] = useState([MUSIC_NO_MUSIC]);
  const [videoStatus,    setVideoStatus]    = useState("idle");
  const [videoMsg,       setVideoMsg]       = useState(null);
  const [videoProgress,  setVideoProgress]  = useState({ slide: 0, total: 0 });
  const [videoBlob,      setVideoBlob]      = useState(null);
  const [videoBlobUrl,   setVideoBlobUrl]   = useState(null);
  const [driveVideoBlobUrl, setDriveVideoBlobUrl] = useState(null);
  const [videoFolderUrl, setVideoFolderUrl] = useState(null);
  const [videoFileUrl,   setVideoFileUrl]   = useState(null);
  const [videoFileMeta,  setVideoFileMeta]  = useState(null);
  const [videoSourceType,setVideoSourceType]= useState(null);
  const [videoMusicStatus, setVideoMusicStatus] = useState(null);
  const [publishingVideo, setPublishingVideo] = useState(false);
  const [publishVideoMsg, setPublishVideoMsg] = useState("");

  async function refresh() {
    const [listingRow, videoRows] = await Promise.all([
      getHomeSaleListing(listingId),
      getVideoScriptsByListingId(listingId),
    ]);
    setListing(listingRow);
    listingRef.current = listingRow;
    setRows(videoRows);
    return listingRow;
  }

  useEffect(() => {
    refresh()
      .then((listingRow) => {
        loadFolderFiles();
        loadEnhancedPhotos();
        const fid = extractFolderId(listingRow?.googleDriveFolderUrl);
        if (fid) loadVideoOutputs(fid, listingRow?.videoUrl || "");
      })
      .catch((err) => setError(err.message || "Failed to load video workflow."))
      .finally(() => setLoading(false));
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load cached video blob for this format
  useEffect(() => {
    loadVideoBlob(listingId, videoFormat)
      .then((blob) => {
        if (blob) {
          setVideoBlob(blob);
          setVideoBlobUrl(URL.createObjectURL(blob));
          setVideoStatus("done");
          setVideoMsg("Loaded from local cache.");
        }
      })
      .catch(() => {});
  }, [listingId, videoFormat]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    async function loadDriveVideoBlob() {
      if (!videoFileMeta?.fileId && !videoFileMeta?.url) {
        setDriveVideoBlobUrl(null);
        return;
      }

      const fileId = String(videoFileMeta?.fileId || "").trim() || extractDriveFileId(videoFileMeta?.url || "");
      if (!fileId) {
        setDriveVideoBlobUrl(null);
        return;
      }

      const candidates = [
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${fileId}`,
        `https://drive.google.com/uc?export=view&id=${fileId}`,
      ];

      for (const url of candidates) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const blob = await resp.blob();
          if (!blob || blob.size === 0) continue;
          if (blob.type && blob.type.includes("html")) continue;
          objectUrl = URL.createObjectURL(new Blob([blob], { type: blob.type || "video/mp4" }));
          if (!cancelled) setDriveVideoBlobUrl(objectUrl);
          return;
        } catch {
          // try next URL
        }
      }

      if (!cancelled) setDriveVideoBlobUrl(null);
    }

    loadDriveVideoBlob();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoFileMeta]);

  // Load music manifest
  useEffect(() => {
    fetch("/music/music-manifest.json")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLoadedMusicOptions([MUSIC_NO_MUSIC, ...data]);
        }
      })
      .catch(() => {});
  }, []);

  async function loadFolderFiles() {
    try {
      const rows = await getSaleMediaByListingId(listingId);
      const photos = rows
        .filter((item) => !item.assetType || item.assetType === "Photo")
        .map((item) => {
          const fileId = extractHomeSaleDriveFileId(item.driveUrl || "");
          return {
            fileId,
            name: item.fileName || item.assetId || "photo",
            thumbUrl: fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : (item.publicUrl || ""),
          };
        })
        .filter((f) => f.fileId || f.thumbUrl);
      setFolderFiles(sortByFilenameNumber(photos));
    } catch { setFolderFiles([]); }
  }

  async function loadEnhancedPhotos() {
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
    } catch { setEnhancedPhotos([]); }
  }

  async function loadVideoOutputs(folderId, fallbackVideoUrl = "") {
    if (!folderId) return;
    try {
      const result = await getListingSubfolderFiles(folderId, "04_Video_Output", listingId);
      const files = result?.files || [];
      setVideoOutputFiles(files);
      setVideoFolderUrl(result?.subfolderUrl || null);
      const preferredFile = files.find((f) => f.name === `video__${listingId}__${videoFormat}.mp4`) || files[0] || null;
      setVideoFileMeta(preferredFile);
      setVideoFileUrl(preferredFile?.url || fallbackVideoUrl || null);
    } catch {
      setVideoOutputFiles([]);
      setVideoFolderUrl(null);
      setVideoFileMeta(null);
      setVideoFileUrl(fallbackVideoUrl || null);
    }
  }

  // ── Short Video Generator ──────────────────────────────────────────────────
  async function generateShortVideo() {
    const folderId = extractFolderId(listing?.googleDriveFolderUrl);
    if (!folderId || activePhotos.length === 0) return;

    setVideoStatus("preparing");
    setVideoMsg(null);
    setVideoProgress({ slide: 0, total: 0 });
    setVideoFolderUrl(null);
    setVideoFileUrl(null);
    setVideoFileMeta(null);
    setVideoBlob(null);
    setVideoBlobUrl(null);
    setDriveVideoBlobUrl(null);
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

    // Use user-selected photo source (original or enhanced).
    const MAX_PHOTOS = 20;
    const useEnhanced = photoSourceType === "enhanced" && enhancedPhotos.length > 0;
    const sourcePool = useEnhanced ? enhancedPhotos : folderFiles;
    setVideoSourceType(useEnhanced ? "enhanced" : "original");

    // Pre-fetch data URLs via backend — WebCodecs VideoFrame requires a non-tainted canvas.
    setVideoMsg("Loading photos from Drive…");
    const photoSource = await Promise.all(
      sortByFilenameNumber(sourcePool).slice(0, MAX_PHOTOS).map(async (photo) => {
        if (photo.dataUrl) return photo;
        if (!photo.fileId) return photo;
        try {
          const result = await getSalePhotoData({
            listingId,
            fileId: photo.fileId,
            ...getStudioRequestAuth("sale"),
          });
          return { ...photo, dataUrl: `data:${result.mimeType};base64,${result.data}` };
        } catch { return photo; }
      })
    );

    const loadedImages = await Promise.all(
      photoSource.map((photo) => new Promise((resolve) => {
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
      setVideoMsg("No photos could be loaded. Run Photo Enhancement first or check Drive folder.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // ── Music ──
    let audioSource = null, audioCtx = null, audioAdded = false, decodedAudioBuf = null;
    if (musicTrack !== "none") {
      try {
        const resp = await fetch(musicTrack);
        if (!resp.ok) throw new Error(`${musicTrack} not found (HTTP ${resp.status})`);
        const ab = await resp.arrayBuffer();
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        decodedAudioBuf = await audioCtx.decodeAudioData(ab);
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = decodedAudioBuf;
        audioSource.loop = true;
        audioSource.connect(audioCtx.destination);
        audioAdded = true;
      } catch (err) {
        setVideoMsg(`⚠️ Music failed (${err.message}) — generating silent video.`);
        if (audioCtx) { try { audioCtx.close(); } catch {} audioCtx = null; }
        audioSource = null; decodedAudioBuf = null;
      }
    }

    // ── MP4 muxer ──
    const mp4Target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target: mp4Target,
      video: { codec: "avc", width: W, height: H },
      ...(audioAdded && decodedAudioBuf ? {
        audio: { codec: "aac", sampleRate: decodedAudioBuf.sampleRate, numberOfChannels: decodedAudioBuf.numberOfChannels },
      } : {}),
      fastStart: "in-memory",
    });

    const videoCodec = "avc1.42001f";
    const vcSupport = await VideoEncoder.isConfigSupported({ codec: videoCodec, width: W, height: H, bitrate: 2_500_000, framerate: 24 });
    if (!vcSupport.supported) {
      setVideoStatus("error");
      setVideoMsg("H.264 encoding is not supported on this device. Use Chrome 94+ or Edge 94+.");
      return;
    }

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => { setVideoStatus("error"); setVideoMsg(`Video encoder error: ${e.message}`); },
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
          error: (e) => console.error("Audio encoder:", e),
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

    // ── Slide data (HomeSale) ──
    const FF  = "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    const cur = listingRef.current;
    const price     = formatPrice(cur?.askingPrice);
    const beds      = `${cur?.bedrooms || "?"} Bed / ${cur?.bathrooms || "?"} Bath`;
    const addr      = cur?.address || "";
    const propType  = cur?.propertyType || "";
    const contactName = cur?.contactName || cur?.ownerName || "";
    const publicUrl = cur?.publicListingUrl || `${window.location.origin}/home-sale-studio/listings/${listingId}`;
    const mlsNum    = cur?.mlsNumber ? `MLS® ${cur.mlsNumber}` : "";

    // ── Drawing helpers ──
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

    function drawPhoto(img, progress, idx) {
      const scale = 1 + progress * 0.07;
      const ia = img.naturalWidth / img.naturalHeight, ca = W / H;
      const bw = ia > ca ? H * ia : W, bh = ia > ca ? H : W / ia;
      const sw = bw * scale, sh = bh * scale;
      const panDir = idx % 2 === 0 ? 1 : -1;
      const panAmt = sw * 0.03 * (progress - 0.5) * panDir;
      ctx.drawImage(img, (W - sw) / 2 + panAmt, (H - sh) / 2, sw, sh);
    }

    function drawPhotoIntroOverlay() {
      const gradH = H * 0.45;
      const g = ctx.createLinearGradient(0, H - gradH, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.70)");
      ctx.fillStyle = g; ctx.fillRect(0, H - gradH, W, gradH);

      ctx.textBaseline = "bottom";
      const maxW = W - (isLandscape ? 120 : 80);
      const pad  = isLandscape ? 60 : 40;

      // Price — amber
      if (price) {
        const fs = isLandscape ? 54 : 48;
        const font = `700 ${fs}px ${FF}`;
        ctx.font = font; ctx.fillStyle = "#F59E0B";
        ctx.textAlign = isLandscape ? "left" : "center";
        ctx.fillText(fitText(price, maxW, font), isLandscape ? pad : W / 2, H - (isLandscape ? 110 : 130));
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
      // "For Sale" badge
      const badgeText = propType ? `For Sale · ${propType}` : "For Sale";
      const bfs = isLandscape ? 20 : 18;
      const bfont = `600 ${bfs}px ${FF}`;
      ctx.save(); ctx.font = bfont;
      const bw2 = ctx.measureText(badgeText).width + 28;
      ctx.restore();
      const bh2 = bfs + 16, br2 = bh2 / 2;
      const bx = isLandscape ? pad : (W - bw2) / 2;
      const by = isLandscape ? 36 : 46;
      roundRect(bx, by, bw2, bh2, br2, "rgba(47,67,56,0.90)");
      ctx.font = bfont; ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = isLandscape ? "left" : "center";
      ctx.textBaseline = "top";
      ctx.fillText(badgeText, isLandscape ? bx + 14 : W / 2, by + 8);
    }

    function drawCaption(text) {
      if (!text) return;
      const fs = isLandscape ? 26 : 28, padX = 22, padY = 11;
      const font = `600 ${fs}px ${FF}`;
      ctx.save(); ctx.font = font;
      const tw = ctx.measureText(String(text)).width;
      ctx.restore();
      const bw2 = Math.min(tw + padX * 2, W - 80);
      const bh2 = fs + padY * 2;
      const bx = (W - bw2) / 2, by = H - bh2 - (isLandscape ? 46 : 62);
      roundRect(bx, by, bw2, bh2, bh2 / 2, "rgba(0,0,0,0.52)");
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.font = font; ctx.fillStyle = "#FFFFFF";
      ctx.fillText(fitText(String(text), bw2 - padX * 2, font), W / 2, by + padY);
    }

    function drawPhotoOutro(bgImg) {
      drawPhoto(bgImg, 0.5, 0);
      ctx.save(); ctx.globalAlpha = 0.58; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();

      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      const cy = H / 2;

      if (isLandscape) {
        ctx.font = `700 50px ${FF}`; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("View Sale Listing", W / 2, cy - 60);
        ctx.font = `700 50px ${FF}`; ctx.fillStyle = "#F59E0B";
        ctx.fillText(price || "For Sale", W / 2, cy + 10);
        if (contactName) {
          ctx.font = `500 26px ${FF}`; ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(`Contact: ${contactName}`, W / 2, cy + 76);
        }
        if (mlsNum) {
          ctx.font = `400 20px ${FF}`; ctx.fillStyle = "rgba(255,255,255,0.65)";
          ctx.fillText(mlsNum, W / 2, cy + 116);
        }
        const uf = `400 18px monospace`;
        ctx.font = uf; ctx.fillStyle = "rgba(147,197,253,0.90)";
        ctx.fillText(fitText(publicUrl, W - 140, uf), W / 2, cy + 150);
      } else {
        ctx.font = `700 42px ${FF}`; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("View Sale Listing", W / 2, cy - 80);
        ctx.font = `700 42px ${FF}`; ctx.fillStyle = "#F59E0B";
        ctx.fillText(price || "For Sale", W / 2, cy - 14);
        if (contactName) {
          ctx.font = `500 24px ${FF}`; ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(`Contact: ${contactName}`, W / 2, cy + 60);
        }
        const uf = `400 16px monospace`;
        ctx.font = uf; ctx.fillStyle = "rgba(147,197,253,0.90)";
        ctx.fillText(fitText(publicUrl, W - 80, uf), W / 2, cy + 118);
      }
    }

    function fadeBlack(drawBase, alpha) {
      drawBase();
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    function sceneCaption(idx) {
      if (idx === 0) return null;
      if (idx === 1) return beds;
      if (idx === 2) return propType || null;
      return null;
    }

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
        await new Promise((r) => setTimeout(r, videoEncoder.encodeQueueSize > 8 ? 80 : FRAME_MS));
      }
    }

    const OUTRO_TOTAL_SECS = 3.8;
    const PHOTO_FADE_SECS  = 0.35;
    const MAX_VIDEO_SECS   = 57.5;
    const availForPhotos   = MAX_VIDEO_SECS - OUTRO_TOTAL_SECS;
    const perPhotoTotal    = availForPhotos / validImages.length;
    const photoHoldSecs    = Math.max(2.0, Math.min(3.0, perPhotoTotal - PHOTO_FADE_SECS));

    const outroImg    = validImages[validImages.length - 1];
    const totalScenes = 1 + validImages.length;
    let curScene = 0;

    if (audioSource) audioSource.start();
    setVideoStatus("rendering");

    for (let i = 0; i < validImages.length; i++) {
      const img = validImages[i];
      const cap = sceneCaption(i);
      setVideoProgress({ slide: ++curScene, total: totalScenes });
      if (i === 0) {
        await renderFor((p) => { drawPhoto(img, p, i); drawPhotoIntroOverlay(); }, photoHoldSecs);
        await renderFor((p) => fadeBlack(() => { drawPhoto(img, 1, i); drawPhotoIntroOverlay(); }, p), PHOTO_FADE_SECS);
      } else {
        await renderFor((p) => { drawPhoto(img, p, i); drawCaption(cap); }, photoHoldSecs);
        await renderFor((p) => fadeBlack(() => { drawPhoto(img, 1, i); drawCaption(cap); }, p), PHOTO_FADE_SECS);
      }
    }

    setVideoProgress({ slide: ++curScene, total: totalScenes });
    await renderFor((p) => { drawPhotoOutro(outroImg); ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore(); }, 0.4);
    await renderFor(() => drawPhotoOutro(outroImg), 3.0);
    await renderFor((p) => fadeBlack(() => drawPhotoOutro(outroImg), p), 0.4);

    if (audioSource) { try { audioSource.stop(); } catch {} }
    if (audioCtx)    { try { audioCtx.close();   } catch {} }

    // Encode audio
    if (audioEncoder && decodedAudioBuf) {
      const totalDurationSecs  = videoTimestampUs / 1_000_000;
      const { sampleRate, numberOfChannels } = decodedAudioBuf;
      const totalSamples = Math.ceil(totalDurationSecs * sampleRate);
      const CHUNK_FRAMES = 1024;
      for (let offset = 0; offset < totalSamples; offset += CHUNK_FRAMES) {
        const frames = Math.min(CHUNK_FRAMES, totalSamples - offset);
        const buf = new ArrayBuffer(frames * numberOfChannels * 4);
        for (let c = 0; c < numberOfChannels; c++) {
          const srcCh = decodedAudioBuf.getChannelData(c);
          const dest  = new Float32Array(buf, c * frames * 4, frames);
          for (let s = 0; s < frames; s++) dest[s] = srcCh[(offset + s) % srcCh.length];
        }
        const audioData = new AudioData({
          format: "f32-planar", sampleRate, numberOfFrames: frames, numberOfChannels,
          timestamp: Math.round((offset / sampleRate) * 1_000_000), data: buf,
        });
        audioEncoder.encode(audioData);
        audioData.close();
      }
      await audioEncoder.flush();
    }

    await videoEncoder.flush();
    muxer.finalize();

    const blob = new Blob([mp4Target.buffer], { type: "video/mp4" });
    setVideoBlob(blob);
    setVideoBlobUrl(URL.createObjectURL(blob));
    saveVideoBlob(listingId, videoFormat, blob).catch(() => {});

    const selectedLabel = loadedMusicOptions.find((o) => o.file === musicTrack)?.label || musicTrack;
    const musicStatus = musicTrack === "none" ? null
      : audioAdded ? `Music included: ${selectedLabel} ✅`
      : `Music file failed to load: ${musicTrack}`;

    // Upload to Drive
    setVideoStatus("uploading");
    try {
      const fid = extractFolderId(listing?.googleDriveFolderUrl);
      const base64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload  = () => res(fr.result.split(",")[1]);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
      const fileName = `video__${listingId}__${videoFormat}.mp4`;
      const result = await apiPost({
        action: "uploadToSubfolder", folderId: fid,
        subfolderName: "04_Video_Output", fileName, mimeType: "video/mp4", data: base64,
        ...getStudioRequestAuth("sale"),
      });
      if (result?.subfolderUrl) setVideoFolderUrl(result.subfolderUrl);
      if (result?.url)          setVideoFileUrl(result.url);
      await loadVideoOutputs(fid, result?.url || "");
      setVideoStatus("done");
      setVideoMsg(`${fileName} saved to 04_Video_Output/`);
      setVideoMusicStatus(musicStatus);
    } catch (err) {
      setVideoStatus("done");
      setVideoMsg(`Video rendered but Drive upload failed: ${err.message}. Use the download button below.`);
      setVideoMusicStatus(musicStatus);
    }
  }

  // ── Script form helpers ────────────────────────────────────────────────────
  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setError("");
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createOrUpdateVideoScript(form);
      setForm(emptyVideoForm(listingId));
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to save video workflow row.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublishVideoUrl() {
    const previewUrl = buildDriveVideoPreviewUrl(videoFileMeta);
    if (!previewUrl) return;
    setPublishingVideo(true);
    setPublishVideoMsg("");
    try {
      await updateSaleListing({ ...listing, videoUrl: previewUrl });
      setPublishVideoMsg("已发布 / Published — public page will now show Watch Video button.");
    } catch (err) {
      setPublishVideoMsg("Error: " + (err.message || "Failed to save video URL."));
    } finally {
      setPublishingVideo(false);
    }
  }

  const apiReady    = isApiConnected();
  const isAdmin     = isAdminSessionActive();
  const folderId    = extractFolderId(listing?.googleDriveFolderUrl);
  const activePhotos = photoSourceType === "enhanced" && enhancedPhotos.length > 0
    ? enhancedPhotos : folderFiles;
  const canGenerate = folderId && activePhotos.length > 0
    && videoStatus !== "rendering" && videoStatus !== "uploading" && videoStatus !== "preparing";
  const driveStreamUrl = buildDriveVideoStreamUrl(videoFileMeta);
  const drivePreviewUrl = buildDriveVideoPreviewUrl(videoFileMeta);
  const driveDownloadUrl = buildDriveVideoDownloadUrl(videoFileMeta);
  const playableVideoUrl = videoBlobUrl || driveVideoBlobUrl || driveStreamUrl || videoFileUrl || "";

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Video Script · Music · Voiceover · AI Video</h1>
          <p className="text-muted text-sm">{listingId}</p>
        </div>
        <div className="flex gap-8">
          <a
            href={listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`}
            target="_blank" rel="noreferrer" className="btn btn--ghost"
          >
            Public Page
          </a>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {error && <div className="notice notice--error"><h4>Error</h4><p>{error}</p></div>}

      {/* ── Polished Short Video Generator ───────────────────────────────── */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
          🎬 Short Video Generator / 短视频生成
        </h3>
        <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Polished 25–35 sec listing video. Ken Burns zoom · fade transitions · text overlays.<br />
          精美房源幻灯片视频，输出至 <code>04_Video_Output/</code>。
        </p>

        {!folderId && (
          <div className="notice notice--warm" style={{ marginBottom: 12 }}>
            <p>Set a Google Drive Folder URL in Edit Listing to enable video generation.</p>
          </div>
        )}
        {folderId && folderFiles.length === 0 && (
          <div className="notice notice--warn" style={{ marginBottom: 12 }}>
            <p>No photos loaded from Drive. Go to Original Photos to sync, or check the folder URL.</p>
          </div>
        )}

        {/* Photo Source selector */}
        <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--color-bg-subtle)", borderRadius: 8 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 8 }}>
            Photo Source / 照片来源
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 10 }}>
            Choose which photo set will be used to generate the short video. / 请选择用于生成短视频的照片组。
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { value: "original", label: "Original Photos / 原始照片", count: folderFiles.length },
              { value: "enhanced", label: "Enhanced Photos / 美化照片", count: enhancedPhotos.length },
            ].map(({ value, label, count }) => {
              const disabled = count === 0;
              return (
                <label key={value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
                  <input
                    type="radio"
                    name="photoSource"
                    value={value}
                    checked={photoSourceType === value}
                    disabled={disabled}
                    onChange={() => setPhotoSourceType(value)}
                  />
                  <span style={{ fontSize: "0.83rem" }}>
                    {label}
                    {count > 0
                      ? <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--color-text-muted)" }}>({Math.min(count, 20)} photos)</span>
                      : <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "#b45309" }}>— No enhanced photos found yet</span>
                    }
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Video format */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Video Format / 视频格式</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[["landscape", "📺 Landscape 1280×720 (YouTube / WeChat)"], ["vertical", "📱 Vertical 720×1280 (Xiaohongshu / Reels)"]].map(([val, label]) => (
              <button
                key={val}
                className={`btn btn--sm ${videoFormat === val ? "btn--primary" : "btn--ghost"}`}
                onClick={() => {
                  setVideoFormat(val);
                  setVideoStatus("idle");
                  setVideoMsg(null);
                  setVideoBlobUrl(null);
                  setVideoBlob(null);
                  setDriveVideoBlobUrl(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Background music */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Background Music / 背景音乐
          </label>
          <select
            className="select-control"
            value={musicTrack}
            onChange={(e) => setMusicTrack(e.target.value)}
            style={{ maxWidth: 400 }}
          >
            {loadedMusicOptions.map((o) => (
              <option key={o.file} value={o.file}>{o.label}</option>
            ))}
          </select>
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            {loadedMusicOptions.length > 1
              ? `${loadedMusicOptions.length - 1} royalty-free track${loadedMusicOptions.length > 2 ? "s" : ""} loaded from public/music/`
              : "No music tracks found in public/music/"}
          </p>
        </div>

        {/* Generate button */}
        <div style={{ marginBottom: 16 }}>
          {(videoStatus === "idle" || videoStatus === "done" || videoStatus === "error") && (
            <button
              className="btn btn--primary"
              disabled={!canGenerate}
              onClick={generateShortVideo}
            >
              ✨ Generate Polished Short Video
            </button>
          )}
          {videoStatus === "preparing" && (
            <div style={{ fontSize: "0.85rem", color: "var(--color-primary)" }}>⏳ Preparing photos…</div>
          )}
          {videoStatus === "rendering" && (
            <div style={{ fontSize: "0.85rem", color: "var(--color-primary)" }}>
              🎬 Rendering slide {videoProgress.slide} of {videoProgress.total}…
            </div>
          )}
          {videoStatus === "uploading" && (
            <div style={{ fontSize: "0.85rem", color: "var(--color-primary)" }}>⬆️ Uploading to Drive…</div>
          )}
          {!apiReady && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
              Requires API connection (VITE_STUDIO_EXEC_URL).
            </p>
          )}
        </div>

        {/* Result */}
        {(videoStatus === "done" || videoStatus === "error") && videoMsg && (
          <div className={`notice ${videoStatus === "error" ? "notice--warning" : "notice--success"}`} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: "0.82rem" }}>{videoStatus === "done" ? "✅" : "⚠️"} {videoMsg}</p>
            {videoMusicStatus && <p style={{ fontSize: "0.78rem", marginTop: 4 }}>{videoMusicStatus}</p>}
          </div>
        )}

        <div style={{ marginBottom: 12, padding: "12px 14px", border: "1px solid var(--color-border)", borderRadius: 10, background: "var(--color-bg-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <strong style={{ fontSize: "0.9rem" }}>Drive Video Output / 视频输出预览</strong>
            {folderId && (
              <button className="btn btn--ghost btn--sm" onClick={() => loadVideoOutputs(folderId, listing?.videoUrl || "")}>
                ↺ Refresh Video Output
              </button>
            )}
          </div>
          {videoOutputFiles.length > 0 && (
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 10 }}>
              {videoOutputFiles.length} video file{videoOutputFiles.length !== 1 ? "s" : ""} found in <code>04_Video_Output/</code>.
            </p>
          )}
          {videoFileUrl ? (
            <>
              {/* Use local blob when available; otherwise embed the Drive /preview iframe */}
              {(videoBlobUrl || driveVideoBlobUrl) ? (
                <video
                  controls
                  preload="metadata"
                  playsInline
                  style={{ width: "100%", maxWidth: 560, borderRadius: 8, background: "#000", marginBottom: 10 }}
                >
                  <source src={videoBlobUrl || driveVideoBlobUrl} type="video/mp4" />
                </video>
              ) : drivePreviewUrl ? (
                <iframe
                  src={drivePreviewUrl}
                  allow="autoplay"
                  style={{ width: "100%", maxWidth: 560, height: 320, borderRadius: 8, border: "none", marginBottom: 10, background: "#000" }}
                  title="Drive Video Preview"
                />
              ) : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href={driveDownloadUrl}
                  download={videoFileMeta?.name || `video__${listingId}__${videoFormat}.mp4`}
                  className="btn btn--ghost btn--sm"
                >
                  ⬇️ Download Video
                </a>
                {isAdmin && drivePreviewUrl && (
                  <a href={drivePreviewUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                    ▶ Open Drive Preview
                  </a>
                )}
                {isAdmin && videoFolderUrl && (
                  <a href={videoFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                    📂 Open 04_Video_Output
                  </a>
                )}
                {drivePreviewUrl && (
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={publishingVideo}
                    onClick={handlePublishVideoUrl}
                  >
                    {publishingVideo ? "Saving…" : "🌐 Publish to Public Page / 发布到公开页"}
                  </button>
                )}
              </div>
              {publishVideoMsg && (
                <p style={{ marginTop: 8, fontSize: "0.82rem", color: publishVideoMsg.startsWith("Error") ? "#b42b2b" : "#276745" }}>
                  {publishVideoMsg}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", margin: 0 }}>
              No video output found yet.
              <br /><span style={{ fontSize: "0.78rem" }}>暂未找到视频输出。</span>
            </p>
          )}
        </div>

        {videoBlobUrl && (
          <div style={{ marginBottom: 12 }}>
            <video src={videoBlobUrl} controls style={{ width: "100%", maxWidth: 560, borderRadius: 8, background: "#000" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <a
                href={videoBlobUrl}
                download={`sale-video__${listingId}__${videoFormat}.mp4`}
                className="btn btn--ghost btn--sm"
              >
                ⬇️ Download MP4
              </a>
              {isAdmin && videoFolderUrl && (
                <a href={videoFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                  📂 Open Drive Output Folder
                </a>
              )}
              <button className="btn btn--ghost btn--sm" onClick={() => { setVideoStatus("idle"); setVideoMsg(null); setVideoBlobUrl(null); setVideoBlob(null); setDriveVideoBlobUrl(null); setVideoMusicStatus(null); }}>
                Generate Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Video Script / Sheet form ─────────────────────────────────────── */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Loading video workflow…</div>
      ) : (
        <>
          <form className="card mb-24" onSubmit={handleSubmit}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 16 }}>
              Video Script / Voiceover / 视频脚本与配音
            </h2>
            <div className="form-row">
              <div className="form-group">
                <label>Video Type <span className="ch-hint">视频类型</span></label>
                <select className="form-control" value={form.videoType} onChange={updateField("videoType")}>
                  {HOME_SALE_VIDEO_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Language <span className="ch-hint">语言</span></label>
                <select className="form-control" value={form.language} onChange={updateField("language")}>
                  {HOME_SALE_LANGUAGES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Voiceover Script <span className="ch-hint">配音文本</span></label>
              <textarea className="form-control" value={form.voiceoverScript} onChange={updateField("voiceoverScript")} rows={5} />
            </div>
            <div className="form-group">
              <label>Subtitle Text <span className="ch-hint">字幕</span></label>
              <textarea className="form-control" value={form.subtitleText} onChange={updateField("subtitleText")} rows={4} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Music Style <span className="ch-hint">音乐风格</span></label>
                <input className="form-control" value={form.musicStyle} onChange={updateField("musicStyle")} />
              </div>
              <div className="form-group">
                <label>Video Length <span className="ch-hint">视频长度</span></label>
                <input className="form-control" value={form.videoLength} onChange={updateField("videoLength")} placeholder="30s / 45s / 60s" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status <span className="ch-hint">状态</span></label>
                <select className="form-control" value={form.status} onChange={updateField("status")}>
                  {HOME_SALE_VIDEO_STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Output MP4 URL <span className="ch-hint">输出链接</span></label>
                <input className="form-control" value={form.outputMp4Url} onChange={updateField("outputMp4Url")} />
              </div>
            </div>
            <div className="form-group">
              <label>Notes <span className="ch-hint">备注</span></label>
              <textarea className="form-control" value={form.notes} onChange={updateField("notes")} rows={3} />
            </div>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save Video Script / 保存视频脚本"}
            </button>
          </form>

          {rows.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div className="flex-between" style={{ padding: "20px 20px 12px" }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800 }}>Saved Video Rows / 已保存视频行</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Script ID</th><th>Video Type</th><th>Language</th><th>Status</th><th>Output</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.scriptId || `${item.videoType}-${item.language}`}>
                        <td><code>{item.scriptId || "Pending"}</code></td>
                        <td>{item.videoType}</td>
                        <td>{item.language}</td>
                        <td>{item.status || "Draft"}</td>
                        <td>{item.outputMp4Url ? <a href={item.outputMp4Url} target="_blank" rel="noreferrer">Open</a> : "—"}</td>
                        <td>
                          <button type="button" className="btn btn--ghost btn--sm"
                            onClick={() => setForm({
                              scriptId: item.scriptId || "", listingId,
                              videoType: item.videoType || "Listing Video",
                              language: item.language || "Chinese",
                              voiceoverScript: item.voiceoverScript || "",
                              subtitleText: item.subtitleText || "",
                              musicStyle: item.musicStyle || "",
                              videoLength: item.videoLength || "",
                              status: item.status || "Draft",
                              outputMp4Url: item.outputMp4Url || "",
                              notes: item.notes || "",
                            })}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
