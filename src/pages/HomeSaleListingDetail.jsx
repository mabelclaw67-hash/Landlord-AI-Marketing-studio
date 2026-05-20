import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";
import { buildQrCodeSvg } from "../utils/qrCodeSvg";
import {
  buildHomeSalePublicUrl,
  getHomeSaleListing,
  getSaleMediaByListingId,
  getPublicSaleMarketingCopy,
  getPublicSaleVideoScripts,
  toHomeSaleImageSrc,
  submitHomeSaleBuyerInquiry,
  getSalePhotoData,
  extractHomeSaleDriveFileId,
} from "../utils/homeSaleSheet";
import { getStudioRequestAuth } from "../utils/trialAccess";
import { normalizePublicFacingUrl } from "../utils/publicUrls";

function extractDriveFileId(url) {
  if (!url) return "";
  const m = url.match(/\/file\/d\/([^/?#]+)/) || url.match(/[?&]id=([^&]+)/);
  return m ? m[1] : "";
}

function buildSaleVideoWatchUrl(videoUrl) {
  if (!videoUrl) return "";
  const fileId = extractDriveFileId(videoUrl);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return videoUrl;
}

function formatPrice(value) {
  const digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return "To be added";
  const amount = Number(digits);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toLocaleString()}`;
}

function normalizeExternalUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return "";
}

function isInternalHomeSalePublicUrl(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /\/home-sale-studio\/listings\/[^/]+$/i.test(text);
}

function stripGeneratedMissingInfoNote(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .replace(/\n*\s*Note:\s*Some listing details are not yet filled in:[^\n]*/gi, "")
    .replace(/\n*\s*说明：以下部分房源信息暂未填写：[^\n]*/g, "")
    .trim();
}

function normalizeSaleAssetRef(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return extractHomeSaleDriveFileId(text) || text;
}

function assetMatchesPrimaryPhoto(asset, primaryPhotoUrl) {
  const target = normalizeSaleAssetRef(primaryPhotoUrl);
  if (!target) return false;
  return target === normalizeSaleAssetRef(asset?.driveUrl) || target === normalizeSaleAssetRef(asset?.publicUrl);
}

function compareSalePhotoAssets(a, b, primaryPhotoUrl) {
  const aIsCurrentCover = assetMatchesPrimaryPhoto(a, primaryPhotoUrl);
  const bIsCurrentCover = assetMatchesPrimaryPhoto(b, primaryPhotoUrl);
  if (aIsCurrentCover && !bIsCurrentCover) return -1;
  if (!aIsCurrentCover && bIsCurrentCover) return 1;
  if (a.assetRole === "Cover" && b.assetRole !== "Cover") return -1;
  if (a.assetRole !== "Cover" && b.assetRole === "Cover") return 1;
  const sortA = Number(a.sortOrder || 9999);
  const sortB = Number(b.sortOrder || 9999);
  if (sortA !== sortB) return sortA - sortB;
  return String(a.fileName || "").localeCompare(String(b.fileName || ""));
}

function resolveSalePhotoSrc(file) {
  if (!file) return "";
  return file.dataUrl || file.thumbUrlLg || file.thumbUrl || file.url || "";
}

function buildStandalonePrimaryPhoto(listing, photoDataUrls = {}) {
  const primaryUrl = String(
    listing?.primaryPhotoUrl
    || listing?.coverImageUrl
    || listing?.photoUrl
    || listing?.imageUrl
    || listing?.thumbnailUrl
    || ""
  ).trim();
  if (!primaryUrl) return null;

  const fileId = extractHomeSaleDriveFileId(primaryUrl);
  return {
    key: fileId || primaryUrl,
    fileId,
    name: listing?.address || "Sale cover",
    dataUrl: fileId ? (photoDataUrls[fileId] || "") : "",
    thumbUrl: toHomeSaleImageSrc(primaryUrl, 800),
    thumbUrlLg: toHomeSaleImageSrc(primaryUrl, 1600),
    url: primaryUrl,
  };
}

function buildOrderedSalePhotos(listing, mediaRows, photoDataUrls = {}) {
  const photoAssets = (Array.isArray(mediaRows) ? mediaRows : [])
    .filter((item) =>
      item?.assetType === "Photo"
      || item?.assetType === "Virtual Staging Public"
      || (!item?.assetType && (item?.driveUrl || item?.publicUrl))
    )
    .sort((a, b) => compareSalePhotoAssets(a, b, listing?.primaryPhotoUrl));

  const ordered = [];
  const seen = new Set();

  for (const asset of photoAssets) {
    const rawUrl = asset?.driveUrl || asset?.publicUrl || "";
    const fileId = extractHomeSaleDriveFileId(rawUrl);
    const key = asset?.assetId || fileId || rawUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push({
      key,
      fileId,
      name: asset?.fileName || asset?.assetRole || "Sale photo",
      dataUrl: photoDataUrls[key] || (fileId ? photoDataUrls[fileId] || "" : ""),
      thumbUrl: toHomeSaleImageSrc(rawUrl, 800),
      thumbUrlLg: toHomeSaleImageSrc(rawUrl, 1600),
      url: asset?.driveUrl || asset?.publicUrl || "",
    });
  }

  const standalonePrimary = buildStandalonePrimaryPhoto(listing, photoDataUrls);
  if (standalonePrimary && !ordered.some((item) =>
    (standalonePrimary.fileId && item.fileId === standalonePrimary.fileId)
    || item.url === standalonePrimary.url
  )) {
    ordered.unshift(standalonePrimary);
  }

  return ordered;
}

function CoverPhoto({ file, alt }) {
  const src = resolveSalePhotoSrc(file);
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div style={{ width: "100%", height: 280, background: "#edf3ee", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: "2.5rem" }}>🏠</span>
        <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 4 }}>{file?.name || "Sale photo"}</p>
        {file?.url ? (
          <a href={file.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.82rem", color: "#3e5b4b", fontWeight: 600 }}>
            Open photo ↗
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }}
    />
  );
}

function ThumbPhoto({ file, alt }) {
  const src = file?.dataUrl || file?.thumbUrl || file?.thumbUrlLg || file?.url || "";
  const [failed, setFailed] = useState(false);

  return (
    <div style={{ flexShrink: 0, width: 180, borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)" }}>
      {!failed && src ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{ width: "100%", height: 120, background: "#edf3ee", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8, gap: 4 }}>
          <span style={{ fontSize: "1.3rem" }}>🖼️</span>
          <span style={{ fontSize: "0.62rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.3, wordBreak: "break-all" }}>
            {file?.name || "Sale photo"}
          </span>
          {file?.url ? (
            <a href={file.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.65rem", color: "#3e5b4b", fontWeight: 600 }}>
              Open ↗
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

const EMPTY_INQUIRY = {
  buyerFirstName: "",
  buyerLastName: "",
  phone: "",
  email: "",
  preferredShowingDate: "",
  preferredTimeWindow: "",
  message: "",
};

// v2 — cover photo fallback from media sheet
export default function HomeSaleListingDetail() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [mediaRows, setMediaRows] = useState([]);
  const [photoDataUrls, setPhotoDataUrls] = useState({});
  const [marketing, setMarketing] = useState({ en: "", zh: "" });
  const [videoWatchUrl, setVideoWatchUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photosLoading, setPhotosLoading] = useState(false);

  const [inquiry, setInquiry] = useState(EMPTY_INQUIRY);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState("");
  const [inquiryError, setInquiryError] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    async function load() {
      const [row, media, copy, videoScripts] = await Promise.all([
        getHomeSaleListing(listingId),
        getSaleMediaByListingId(listingId).catch(() => []),
        getPublicSaleMarketingCopy(listingId),
        getPublicSaleVideoScripts(listingId).catch(() => []),
      ]);
      if (!row) throw new Error("Sale listing not found in 01 Sale Listings.");
      setListing(row);
      setMediaRows(media);

      // Resolve best public video URL: listing field first, then first outputMp4Url from video scripts
      const rawVideoUrl = row.videoUrl ||
        (Array.isArray(videoScripts) && videoScripts.find(s => s.outputMp4Url)?.outputMp4Url) || "";
      setVideoWatchUrl(buildSaleVideoWatchUrl(rawVideoUrl));

      // Extract Website channel body copy for public display
      const websiteEn = copy.find(c => c.channel === "Website" && c.language === "English");
      const websiteZh = copy.find(c => c.channel === "Website" && c.language === "Chinese");
      setMarketing({
        en: websiteEn?.bodyCopy || row.descriptionEn || "",
        zh: websiteZh?.bodyCopy || row.descriptionCn || "",
        headlineEn: websiteEn?.headline || "",
        headlineZh: websiteZh?.headline || "",
      });
    }
    load()
      .catch((err) => setError(err.message || "Unable to load sale listing right now."))
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    setPhotoDataUrls({});
  }, [listingId]);

  useEffect(() => {
    const photoAssets = (Array.isArray(mediaRows) ? mediaRows : [])
      .filter((item) => item?.assetType === "Photo" && (item?.driveUrl || item?.publicUrl));
    const primaryFileId = extractHomeSaleDriveFileId(listing?.primaryPhotoUrl || "");

    if (!photoAssets.length && !primaryFileId) {
      setPhotosLoading(false);
      return;
    }

    let active = true;
    setPhotosLoading(true);

    (async () => {
      const seenFileIds = new Set();

      for (const asset of photoAssets) {
        if (!active) break;
        const fileId = extractHomeSaleDriveFileId(asset.driveUrl || asset.publicUrl || "");
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
              [fileId]: `data:${result.mimeType || "image/jpeg"};base64,${result.data}`,
            }));
          }
        } catch { /* fall back to public URL / thumbnail */ }
      }

      if (active && primaryFileId && !seenFileIds.has(primaryFileId)) {
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
        } catch { /* fall back to public URL / thumbnail */ }
      }
    })().finally(() => {
      if (active) setPhotosLoading(false);
    });

    return () => {
      active = false;
    };
  }, [listingId, listing?.primaryPhotoUrl, mediaRows]);

  const orderedPhotos = buildOrderedSalePhotos(listing, mediaRows, photoDataUrls);
  const rawPublicListingUrl = normalizeExternalUrl(listing?.publicListingUrl);
  const safeMlsUrl = normalizeExternalUrl(listing?.mlsUrl)
    || (!isInternalHomeSalePublicUrl(rawPublicListingUrl) ? rawPublicListingUrl : "");
  const hasMlsInfo = !!(listing?.mlsNumber || safeMlsUrl);
  const marketingZh = stripGeneratedMissingInfoNote(marketing.zh);
  const marketingEn = stripGeneratedMissingInfoNote(marketing.en);
  const contactPhoneHref = listing?.contactPhone ? `tel:${String(listing.contactPhone).replace(/[^\d+]/g, "")}` : "";
  const contactEmailHref = listing?.contactEmail ? `mailto:${String(listing.contactEmail).trim()}` : "";

  function handleScrollToInquiry() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleInquirySubmit(e) {
    e.preventDefault();
    setInquiryError("");
    setInquirySuccess("");
    setInquirySubmitting(true);
    try {
      const result = await submitHomeSaleBuyerInquiry({
        listingId,
        listingTitle: listing?.address || listingId,
        buyerFirstName: inquiry.buyerFirstName,
        buyerLastName: inquiry.buyerLastName,
        phone: inquiry.phone,
        email: inquiry.email,
        preferredShowingDate: inquiry.preferredShowingDate,
        preferredTimeWindow: inquiry.preferredTimeWindow,
        message: inquiry.message,
      });
      setInquirySuccess(`Thank you! Your showing request has been received. We will be in touch to confirm. (${result.inquiryId})`);
      setInquiry(EMPTY_INQUIRY);
    } catch (err) {
      setInquiryError(err.message || "Submission failed. Please try again.");
    } finally {
      setInquirySubmitting(false);
    }
  }

  function handlePrintQrCode() {
    const listingUrl = buildHomeSalePublicUrl(listingId);
    const svg = buildQrCodeSvg(listingUrl, {
      cellSize: 5,
      quietZone: 4,
      foreground: "#2f4338",
      background: "#ffffff",
    });
    const win = window.open("", "_blank", "width=560,height=760");
    if (!win) return;
    win.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Home Sale QR Code</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #213128; text-align: center; }
      .wrap { max-width: 420px; margin: 0 auto; }
      .code { margin: 16px auto; width: 240px; }
      .code svg { width: 100%; height: auto; display: block; }
      .meta { font-size: 14px; line-height: 1.6; color: #4b5563; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Home Sale QR Code</h1>
      <p class="meta">Scan to view the sale listing</p>
      <div class="code">${svg}</div>
      <p class="meta">${listing?.address || listingId}</p>
      <p class="meta">${listingUrl}</p>
    </div>
    <script>window.onload = function(){ window.print(); };</script>
  </body>
</html>`);
    win.document.close();
  }

  return (
    <div className="pub-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">Home Sale Listing</h1>
        <p className="pub-hero__sub">Public Sale Listing Detail</p>
      </section>

      <section className="section">
        <div className="container">
          {loading && (
            <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              Loading sale listing detail…
            </div>
          )}

          {!loading && error && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>Unable to Load Listing</h4>
              <p>{error}</p>
            </div>
          )}

          {!loading && listing && (
            <>
              <div className="card" style={{ marginBottom: 20, borderColor: "#e5dfd6" }}>
                {photosLoading && orderedPhotos.length === 0 && (
                  <p style={{ marginBottom: 18, color: "var(--color-text-muted)", fontSize: "0.88rem" }}>Loading photos…</p>
                )}
                {orderedPhotos.length > 0 ? (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ borderRadius: 14, overflow: "hidden", background: "#eef2f0" }}>
                      <CoverPhoto file={orderedPhotos[0]} alt={listing.address || "Sale listing"} />
                    </div>
                    {orderedPhotos.length > 1 && (
                      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingTop: 12 }}>
                        {orderedPhotos.slice(1).map((file) => (
                          <ThumbPhoto key={file.key || file.fileId || file.url} file={file} alt={listing.address || "Sale listing"} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : !photosLoading ? (
                  <div
                    style={{
                      marginBottom: 18,
                      borderRadius: 14,
                      background: "#eef2f0",
                      aspectRatio: "16 / 10",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-text-muted)",
                      fontSize: "0.92rem",
                      textAlign: "center",
                      padding: 18,
                    }}
                  >
                    No photo available
                  </div>
                ) : null}

                <h2 style={{ fontSize: "1.55rem", color: "#213128", marginBottom: 8 }}>
                  {listing.address || "Property address pending"}
                </h2>
                <p style={{ color: "var(--color-text-muted)", marginBottom: 14 }}>
                  {listing.city || ""}{listing.province ? `, ${listing.province}` : ""}
                </p>
                <div style={{ marginBottom: 14 }}>
                  <span className="rental-card__badge" style={{ background: "#f7efe4", color: "#8a5a22", border: "1px solid #e7cda7" }}>
                    {listing.status || "Draft"}
                  </span>
                </div>

                <div className="rental-card__facts" style={{ marginBottom: 18 }}>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Asking Price</span>
                    <span className="rental-card__fact-value">{formatPrice(listing.askingPrice)}</span>
                  </div>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Beds / Baths</span>
                    <span className="rental-card__fact-value">
                      {listing.bedrooms || "—"} / {listing.bathrooms || "—"}
                    </span>
                  </div>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Property Type</span>
                    <span className="rental-card__fact-value">{listing.propertyType || "Pending"}</span>
                  </div>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Status</span>
                    <span className="rental-card__fact-value">{listing.status || "Draft"}</span>
                  </div>
                </div>

                {hasMlsInfo && (
                  <div
                    style={{
                      marginBottom: 18,
                      border: "1px solid #d8e4db",
                      borderRadius: 12,
                      background: "#f7fbf8",
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                          MLS Listing
                        </div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#213128", lineHeight: 1.5 }}>
                          {listing.mlsNumber ? `MLS® ${listing.mlsNumber}` : "Listed on MLS"}
                        </div>
                        <p style={{ marginTop: 4, fontSize: "0.82rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                          This property is also listed on MLS for added listing verification.
                        </p>
                      </div>
                      {safeMlsUrl && (
                        <a
                          href={safeMlsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--ghost"
                        >
                          View MLS Listing
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginBottom: 18,
                    border: "1px solid #e5dfd6",
                    borderRadius: 12,
                    background: "#fffaf2",
                    padding: "16px 16px",
                  }}
                >
                  <div style={{ fontSize: "0.78rem", color: "#8a5a22", fontWeight: 700, marginBottom: 6 }}>
                    Local Promotion Ready
                  </div>
                  <h3 style={{ fontSize: "1rem", color: "#213128", marginBottom: 6 }}>
                    Interested in this property?
                  </h3>
                  <p style={{ fontSize: "0.86rem", color: "var(--color-text-muted)", lineHeight: 1.65, marginBottom: 12 }}>
                    Request a showing, contact the listing representative, or verify the MLS listing before making your next move.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleScrollToInquiry}
                      className="btn btn--primary"
                    >
                      Request a Showing
                    </button>
                    {contactPhoneHref && (
                      <a href={contactPhoneHref} className="btn btn--ghost">
                        Call Listing Contact
                      </a>
                    )}
                    {contactEmailHref && (
                      <a href={contactEmailHref} className="btn btn--ghost">
                        Email Listing Contact
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 20 }}>
                  {(marketingZh || marketing.headlineZh) && (
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 6 }}>
                        Chinese Description
                      </div>
                      {marketing.headlineZh && (
                        <p style={{ fontWeight: 700, color: "#213128", marginBottom: 6, lineHeight: 1.6 }}>
                          {marketing.headlineZh}
                        </p>
                      )}
                      <p style={{ lineHeight: 1.9, whiteSpace: "pre-line" }}>
                        {marketingZh}
                      </p>
                    </div>
                  )}

                  {(marketingEn || marketing.headlineEn) && (
                    <div style={{ borderTop: marketingZh ? "1px solid #f0ede8" : "none", paddingTop: marketingZh ? 16 : 0 }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 6 }}>
                        English Description
                      </div>
                      {marketing.headlineEn && (
                        <p style={{ fontWeight: 700, color: "#213128", marginBottom: 6, lineHeight: 1.6 }}>
                          {marketing.headlineEn}
                        </p>
                      )}
                      <p style={{ lineHeight: 1.9, color: "var(--color-text-muted)", whiteSpace: "pre-line" }}>
                        {marketingEn}
                      </p>
                    </div>
                  )}

                  {!marketingZh && !marketingEn && (
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
                      Property description will be provided by the seller.
                    </p>
                  )}
                </div>

                <div style={{ marginTop: 18 }}>
                  {videoWatchUrl && (
                    <a
                      href={videoWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 8, marginBottom: 10, width: "100%", textAlign: "center",
                        border: "1.5px solid #3e5b4b", color: "#3e5b4b",
                        padding: "13px 24px", borderRadius: 8, fontWeight: 700,
                        fontSize: "0.95rem", textDecoration: "none",
                        background: "#f0f7f2",
                      }}
                    >
                      ▶ Watch Video
                    </a>
                  )}
                  <ShareButton
                    title={listing.address || "Home Sale Listing"}
                    text={`Home sale listing: ${listing.address || listing.id}`}
                    url={normalizePublicFacingUrl(listing.publicListingUrl || buildHomeSalePublicUrl(listing.id))}
                    className="share-btn--detail"
                  />
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20, borderColor: "#d8e4db", background: "#f7fbf8" }}>
                <h3 style={{ color: "#2f4338", marginBottom: 10, fontSize: "1rem", fontWeight: 800, textAlign: "center" }}>
                  Sale QR Code
                </h3>
                <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <div style={{ width: 180 }} dangerouslySetInnerHTML={{ __html: buildQrCodeSvg(normalizePublicFacingUrl(listing.publicListingUrl || buildHomeSalePublicUrl(listing.id)), {
                    cellSize: 5,
                    quietZone: 4,
                    foreground: "#2f4338",
                    background: "#ffffff",
                  }) }} />
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6, marginBottom: 12 }}>
                  Scan to view the sale listing and buyer inquiry page
                </p>
                <div className="flex" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn--ghost" onClick={handlePrintQrCode}>Print QR Code</button>
                  <a href={normalizePublicFacingUrl(listing.publicListingUrl || buildHomeSalePublicUrl(listing.id))} target="_blank" rel="noreferrer" className="btn btn--ghost">
                    Open Public Page
                  </a>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20, borderColor: "#e5dfd6" }}>
                <h3 style={{ color: "#3e5b4b", marginBottom: 6 }}>Request a Showing</h3>

                {/* Showing availability */}
                <div style={{ marginBottom: 14 }}>
                  {listing.showingAvailability ? (
                    <div style={{ background: "#edf7f0", border: "1px solid #b6dfc7", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#276745", marginBottom: 4 }}>
                        🗓 Available Showing Times
                      </div>
                      <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "0.88rem", color: "#213128", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                        {listing.showingAvailability}
                      </pre>
                    </div>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fdf3e7", color: "#8a5a22", border: "1px solid #e7cda7", borderRadius: 20, padding: "4px 12px", fontSize: "0.82rem", fontWeight: 700 }}>
                      Showing times: contact us to arrange
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 16 }}>
                  Interested in this property? Submit a showing request and we will contact you to confirm.
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 16, fontStyle: "italic" }}>
                  Showing requests are subject to seller approval.
                </p>

                {inquirySuccess && (
                  <div className="notice notice--success" style={{ marginBottom: 16 }}>
                    {inquirySuccess}
                  </div>
                )}
                {inquiryError && (
                  <div className="notice notice--warm" style={{ marginBottom: 16 }}>
                    {inquiryError}
                  </div>
                )}

                {!inquirySuccess && (
                  <form ref={formRef} onSubmit={handleInquirySubmit}>
                    <div style={{ display: "grid", gap: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <input
                          className="form-control"
                          placeholder="First Name *"
                          value={inquiry.buyerFirstName}
                          onChange={(e) => setInquiry((p) => ({ ...p, buyerFirstName: e.target.value }))}
                          required
                          disabled={inquirySubmitting}
                        />
                        <input
                          className="form-control"
                          placeholder="Last Name *"
                          value={inquiry.buyerLastName}
                          onChange={(e) => setInquiry((p) => ({ ...p, buyerLastName: e.target.value }))}
                          required
                          disabled={inquirySubmitting}
                        />
                      </div>
                      <input
                        className="form-control"
                        type="email"
                        placeholder="Email *"
                        value={inquiry.email}
                        onChange={(e) => setInquiry((p) => ({ ...p, email: e.target.value }))}
                        required
                        disabled={inquirySubmitting}
                      />
                      <input
                        className="form-control"
                        placeholder="Phone"
                        value={inquiry.phone}
                        onChange={(e) => setInquiry((p) => ({ ...p, phone: e.target.value }))}
                        disabled={inquirySubmitting}
                      />
                      <div>
                        <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                          Preferred Showing Date
                        </label>
                        <input
                          className="form-control"
                          type="date"
                          value={inquiry.preferredShowingDate}
                          onChange={(e) => setInquiry((p) => ({ ...p, preferredShowingDate: e.target.value }))}
                          disabled={inquirySubmitting}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                          Preferred Time Window
                        </label>
                        <select
                          className="form-control"
                          value={inquiry.preferredTimeWindow}
                          onChange={(e) => setInquiry((p) => ({ ...p, preferredTimeWindow: e.target.value }))}
                          disabled={inquirySubmitting}
                        >
                          <option value="">-- Select a time window --</option>
                          <option value="9:00 AM - 11:00 AM">9:00 AM – 11:00 AM</option>
                          <option value="10:00 AM - 12:00 PM">10:00 AM – 12:00 PM</option>
                          <option value="11:00 AM - 1:00 PM">11:00 AM – 1:00 PM</option>
                          <option value="12:00 PM - 2:00 PM">12:00 PM – 2:00 PM</option>
                          <option value="1:00 PM - 3:00 PM">1:00 PM – 3:00 PM</option>
                          <option value="2:00 PM - 4:00 PM">2:00 PM – 4:00 PM</option>
                          <option value="3:00 PM - 5:00 PM">3:00 PM – 5:00 PM</option>
                          <option value="Flexible">Flexible</option>
                        </select>
                      </div>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Message or additional requests"
                        value={inquiry.message}
                        onChange={(e) => setInquiry((p) => ({ ...p, message: e.target.value }))}
                        disabled={inquirySubmitting}
                      />
                      <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={inquirySubmitting}
                      >
                        {inquirySubmitting ? "Submitting…" : "Submit Buyer Inquiry"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          <Link to="/home-sale-studio" className="btn btn--ghost">
            Back to Home Sale Studio
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
