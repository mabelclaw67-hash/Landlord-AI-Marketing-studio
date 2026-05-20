import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getListing, getListingFolderFiles, getListingSubfolderFiles } from "../utils/storage";
import ShareButton from "../components/ShareButton";
import { DesktopApplicationProcessSidebar, MobileApplicationProcessCard } from "../components/RentalApplicationProcessPanel";
import { downloadRentalApplicationPdf } from "../utils/rentalApplicationPdf";
import { buildQrCodeSvg } from "../utils/qrCodeSvg";
import { buildRentalListingPublicUrl } from "../utils/publicUrls";
import {
  extractDriveFolderId,
  getListingStatusMeta,
  getOpenHouseInfo,
  resolveRentalListingCover,
  resolveRentalListingImageSrc,
} from "../utils/listingPublicMeta";

const RENTAL_FORM_URL = import.meta.env.VITE_RENTAL_FORM_URL || "";
const FORM_URL_READY  = RENTAL_FORM_URL &&
  !RENTAL_FORM_URL.startsWith("PASTE_MY");

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Build a prefilled Google Form URL for the given listing.
// Entry 1083146033 = "Property Applied For / Listing ID"
const PREFILL_ENTRY = "entry.1083146033";
function buildPrefilledApplicationUrl(listing) {
  if (!FORM_URL_READY) return RENTAL_FORM_URL;
  try {
    const base  = RENTAL_FORM_URL.split("?")[0];
    const label = listing.id && listing.address
      ? `${listing.id} — ${listing.address}`
      : listing.id || "";
    return `${base}?${PREFILL_ENTRY}=${encodeURIComponent(label)}&usp=pp_url`;
  } catch {
    return RENTAL_FORM_URL;
  }
}

// Normalise ISO timestamps and Excel serial dates to YYYY-MM-DD for display.
function formatDate(val) {
  if (!val) return "—";
  const s = String(val).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO with time component — take date part only
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s;
}

function escapePrintHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Image sub-components ──────────────────────────────────────────────────────

function CoverPhoto({ file }) {
  const src = resolveRentalListingImageSrc(file);
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div style={{ width: "100%", height: 280, background: "#edf3ee", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: "2.5rem" }}>🏠</span>
        <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: 4 }}>{file.name}</p>
        <a href={file.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: "0.82rem", color: "#3e5b4b", fontWeight: 600 }}>
          Open photo in Drive ↗
        </a>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Property cover"
      onError={() => setFailed(true)}
      style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }}
    />
  );
}

function ThumbPhoto({ file }) {
  const src = file.dataUrl || file.thumbUrl || file.thumbUrlLg || file.url;
  const [failed, setFailed] = useState(false);

  return (
    <div style={{ flexShrink: 0, width: 180, borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)" }}>
      {!failed && src ? (
        <img
          src={src}
          alt={file.name}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{ width: "100%", height: 120, background: "#edf3ee", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8, gap: 4 }}>
          <span style={{ fontSize: "1.3rem" }}>🖼️</span>
          <span style={{ fontSize: "0.62rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.3, wordBreak: "break-all" }}>{file.name}</span>
          <a href={file.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.65rem", color: "#3e5b4b", fontWeight: 600 }}>
            Open ↗
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicListing() {
  const { id } = useParams();
  const [listing,      setListing]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [photos,        setPhotos]        = useState([]);
  const [coverFiles,    setCoverFiles]    = useState([]); // files from 03_Cover_Images/ subfolder
  const [photosLoading, setPhotosLoading] = useState(false);
  const [pdfBusy,       setPdfBusy]       = useState(false);

  useEffect(() => {
    getListing(id)
      .then((l) => {
        if (!l) { setError("Listing not found."); return; }
        setListing(l);
        setPhotosLoading(true);
        const folderId = extractDriveFolderId(l.driveFolderLink);
        Promise.all([
          getListingFolderFiles("", id).catch(() => []),
          folderId
            ? getListingSubfolderFiles(folderId, "03_Cover_Images", id)
                .then((res) => res?.files || [])
                .catch(() => [])
            : Promise.resolve([]),
        ])
          .then(([rootFiles, subFiles]) => {
            setPhotos(rootFiles || []);
            setCoverFiles(subFiles || []);
          })
          .finally(() => setPhotosLoading(false));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading / error guards ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--color-text-muted)" }}>Loading listing…</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="page-wrapper" style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 16 }}>{error || "Listing not found."}</p>
        <Link to="/" className="btn btn--ghost btn--sm">← Back to Home</Link>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const title = [listing.bedrooms, "Bed /", listing.bathrooms, "Bath —", listing.address]
    .filter(Boolean).join(" ");

  const cover = resolveRentalListingCover(photos, coverFiles, listing.coverImageFileId);
  const orderedPhotos = cover
    ? [cover, ...photos.filter((p) => p.fileId !== cover.fileId)]
    : photos;

  const detailRows = [
    ["Monthly Rent",   listing.rent ? `$${Number(listing.rent).toLocaleString()} / month` : null],
    ["Available",      formatDate(listing.available)],
    ["Lease Term",     listing.leaseTerm],
    ["Utilities",      listing.utilities],
    ["Pets",           listing.pets],
    ["Parking",        listing.parking],
    ["Laundry",        listing.laundry],
    ["Smoking Policy", listing.smoking],
  ].filter(([, v]) => v);

  const featureList = (listing.features || "")
    .split(/[,\n]/).map((f) => f.trim()).filter(Boolean);
  const statusMeta = getListingStatusMeta(listing);
  const openHouseInfo = getOpenHouseInfo(listing);

  // ── Shared styles ──────────────────────────────────────────────────────────

  const sectionCard = {
    background: "#fff", borderRadius: 10,
    border: "1px solid var(--color-border)", padding: "24px 20px",
  };

  const labelStyle = {
    fontSize: "0.72rem", color: "var(--color-text-muted)",
    fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 3,
  };
  const listingUrl = buildRentalListingPublicUrl(id);
  const qrSvg = buildQrCodeSvg(listingUrl, {
    cellSize: 5,
    quietZone: 4,
    foreground: "#2f4338",
    background: "#ffffff",
  });

  function handlePdfDownload() {
    if (!listing || pdfBusy) return;
    setPdfBusy(true);
    try {
      downloadRentalApplicationPdf(listing, window.location.href);
    } finally {
      window.setTimeout(() => setPdfBusy(false), 800);
    }
  }

  function handlePrintQrCode() {
    const printWindow = window.open("", "_blank", "width=540,height=720");
    if (!printWindow) return;
    const safeTitle = escapePrintHtml(title);
    const safeListingUrl = escapePrintHtml(listingUrl);

    printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Listing QR Code</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: Arial, sans-serif;
        color: #213128;
        text-align: center;
      }
      .wrap {
        max-width: 420px;
        margin: 0 auto;
      }
      .code {
        margin: 16px auto;
        width: 240px;
      }
      .code svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .meta {
        font-size: 14px;
        line-height: 1.6;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1 style="font-size: 22px; margin-bottom: 8px;">QR Code</h1>
      <p class="meta" style="margin-bottom: 8px;">${safeTitle}</p>
      <p class="meta" style="margin-bottom: 10px;">Scan to view listing and apply online</p>
      <div class="code">${qrSvg}</div>
      <p class="meta">${safeListingUrl}</p>
    </div>
    <script>
      window.onload = function () {
        window.print();
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  }

  function handlePrintOpenHouseCard() {
    const printWindow = window.open("", "_blank", "width=760,height=960");
    if (!printWindow) return;

    const safeAddress = escapePrintHtml(listing.address || "Listing address");
    const safeRent = escapePrintHtml(
      listing.rent ? `$${Number(listing.rent).toLocaleString()} / month` : "Contact for rent"
    );
    const safeBedsBaths = escapePrintHtml(
      `${listing.bedrooms || "—"} Bed / ${listing.bathrooms || "—"} Bath`
    );
    const safeAvailable = escapePrintHtml(formatDate(listing.available));
    const safeListingUrl = escapePrintHtml(listingUrl);
    const safeContactPhone = escapePrintHtml(listing.contactPhone || "");
    const safeContactEmail = escapePrintHtml(listing.contactEmail || listing.ownerEmail || "");

    printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Open House Print Card</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page {
        size: auto;
        margin: 12mm;
      }
      body {
        margin: 0;
        background: #f3f5f1;
        font-family: Arial, sans-serif;
        color: #213128;
      }
      .sheet {
        max-width: 720px;
        margin: 0 auto;
        padding: 18px;
      }
      .card {
        background: #ffffff;
        border: 2px solid #d9e5dc;
        border-radius: 18px;
        padding: 24px;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #5f7467;
        margin-bottom: 10px;
        font-weight: 700;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.2;
      }
      .facts {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 18px 0 22px;
      }
      .fact {
        border: 1px solid #dce7df;
        border-radius: 12px;
        padding: 12px 14px;
        background: #f8fbf9;
      }
      .fact-label {
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6e7d73;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .fact-value {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.35;
      }
      .qr-wrap {
        margin: 8px auto 16px;
        width: 220px;
      }
      .qr-wrap svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .cta {
        text-align: center;
        font-size: 15px;
        line-height: 1.6;
        color: #43584c;
        margin-bottom: 18px;
      }
      .contact {
        border-top: 1px solid #dce7df;
        padding-top: 16px;
        display: grid;
        gap: 8px;
      }
      .contact-row {
        font-size: 16px;
        line-height: 1.5;
      }
      .url {
        margin-top: 14px;
        font-size: 12px;
        line-height: 1.5;
        color: #6b7280;
        word-break: break-word;
      }
      @media print {
        body {
          background: #fff;
        }
        .sheet {
          max-width: none;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="card">
        <div class="eyebrow">Open House Print Card</div>
        <h1>${safeAddress}</h1>
        <div class="facts">
          <div class="fact">
            <div class="fact-label">Rent</div>
            <div class="fact-value">${safeRent}</div>
          </div>
          <div class="fact">
            <div class="fact-label">Beds / Baths</div>
            <div class="fact-value">${safeBedsBaths}</div>
          </div>
          <div class="fact">
            <div class="fact-label">Available</div>
            <div class="fact-value">${safeAvailable}</div>
          </div>
          <div class="fact">
            <div class="fact-label">Apply</div>
            <div class="fact-value">Scan QR Code</div>
          </div>
        </div>
        ${openHouseInfo ? `
        <div style="margin: 0 0 20px; border: 1px solid #dce7df; border-radius: 12px; padding: 14px 16px; background: #f8fbf9;">
          <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #5f7467; margin-bottom: 10px; font-weight: 700;">Open House</div>
          ${openHouseInfo.dateTime ? `<div style="font-size: 15px; line-height: 1.6; margin-bottom: 6px;"><strong>Date / Time:</strong> ${escapePrintHtml(openHouseInfo.dateTime)}</div>` : ""}
          ${openHouseInfo.viewingInstructions ? `<div style="font-size: 15px; line-height: 1.6; margin-bottom: 6px;"><strong>Viewing:</strong> ${escapePrintHtml(openHouseInfo.viewingInstructions)}</div>` : ""}
          ${openHouseInfo.parkingAccessNotes ? `<div style="font-size: 15px; line-height: 1.6;"><strong>Parking / Access:</strong> ${escapePrintHtml(openHouseInfo.parkingAccessNotes)}</div>` : ""}
        </div>` : ""}
        <div class="qr-wrap">${qrSvg}</div>
        <div class="cta">Scan to view listing and apply online</div>
        <div class="contact">
          ${safeContactPhone || safeContactEmail ? `
          ${safeContactPhone ? `<div class="contact-row">Phone: ${safeContactPhone}</div>` : ""}
          ${safeContactEmail ? `<div class="contact-row">Email: ${safeContactEmail}</div>` : ""}
          ` : `<div class="contact-row">Contact information not provided</div>`}
        </div>
        <div class="url">${safeListingUrl}</div>
      </div>
    </div>
    <script>
      window.onload = function () {
        window.print();
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-wrapper tenant-page" style={{ paddingBottom: 64 }}>

      {/* ── Hero bar ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #eef4ef 0%, #f6f3ee 60%, #f4f0e8 100%)",
        borderBottom: "1px solid #e5dfd6",
        padding: "36px 20px 28px",
      }}>
        <div className="public-listing-shell">
          <p style={{ fontSize: "0.75rem", color: "#62796b", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
            Vanisland Residential · Public Rental Listing
          </p>
          <div style={{ marginBottom: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 32,
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${statusMeta.border}`,
                background: statusMeta.background,
                color: statusMeta.color,
                fontSize: "0.82rem",
                fontWeight: 800,
              }}
            >
              {statusMeta.label}
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.85rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: 8, color: "#213128" }}>
            {title}
          </h1>
          {listing.city && (
            <p style={{ fontSize: "0.95rem", color: "#6b7280" }}>{listing.city}, BC</p>
          )}
        </div>
      </div>

      {/* ── Key facts strip ─────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5dfd6" }}>
        <div className="listing-facts-strip public-listing-shell" style={{ display: "flex", flexWrap: "wrap" }}>
          {[
            ["Rent",      listing.rent ? `$${Number(listing.rent).toLocaleString()}/mo` : "—"],
            ["Available", formatDate(listing.available)],
            ["Bedrooms",  String(listing.bedrooms || "—")],
            ["Bathrooms", String(listing.bathrooms || "—")],
          ].map(([label, val], i, arr) => (
            <div key={label} style={{
              flex: "1 1 120px", padding: "16px 16px 14px",
              borderRight: i < arr.length - 1 ? "1px solid #e5dfd6" : "none",
            }}>
              <div style={labelStyle}>{label}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#3e5b4b" }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Page body ───────────────────────────────────────────────────────── */}
      <div className="public-listing-shell public-listing-body">
        <div className="tenant-listings-layout">
          <div className="tenant-listings-main">
            <div className="application-process-mobile-wrap" style={{ marginTop: 24 }}>
              <MobileApplicationProcessCard />
            </div>

            {/* ── Photos ──────────────────────────────────────────────────────── */}
            {photosLoading && (
              <p style={{ marginTop: 24, color: "var(--color-text-muted)", fontSize: "0.88rem" }}>Loading photos…</p>
            )}
            {!photosLoading && orderedPhotos.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                  <CoverPhoto file={orderedPhotos[0]} />
                </div>
                {orderedPhotos.length > 1 && (
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
                    {orderedPhotos.slice(1).map((f) => <ThumbPhoto key={f.fileId} file={f} />)}
                  </div>
                )}
              </div>
            )}

            {/* ── Property details ────────────────────────────────────────────── */}
            <div style={{ ...sectionCard, marginTop: 24 }}>
              <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16, color: "#3e5b4b" }}>
                Property Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px 24px" }}>
                {detailRows.map(([label, val]) => (
                  <div key={label}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: "0.9rem", color: "var(--color-text)", fontWeight: 500, lineHeight: 1.5 }}>{val}</div>
                  </div>
                ))}
              </div>

              {featureList.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--color-border)" }}>
                  <div style={{ ...labelStyle, marginBottom: 10 }}>Key Features</div>
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {featureList.map((f, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.9rem", lineHeight: 1.55 }}>
                        <span style={{ color: "#3e5b4b", fontWeight: 700, flexShrink: 0 }}>•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Apply for This Rental ────────────────────────────────────────── */}
            <div style={{
              ...sectionCard, marginTop: 20,
              border: "2px solid #3e5b4b", padding: "28px 20px",
            }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.15rem", marginBottom: 10, color: "#3e5b4b" }}>
            Apply for This Rental
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", lineHeight: 1.75, marginBottom: 20 }}>
            Interested applicants may apply online using the rental application form.
            Please have proof of income, credit information, references, and tenant insurance details ready.
          </p>

          {/* Listing context */}
          <div style={{ background: "#edf3ee", borderRadius: 8, padding: "12px 16px", marginBottom: 22, fontSize: "0.88rem", lineHeight: 1.9 }}>
            <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Applying for: </span><strong>{title}</strong></div>
            <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Listing ID: </span><code style={{ fontSize: "0.84rem" }}>{listing.id}</code></div>
            <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Status: </span><strong>{statusMeta.label}</strong></div>
          </div>

          {/* Primary CTA */}
          {statusMeta.applicationsClosed ? (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                disabled
                className="listing-apply-btn"
                style={{
                  display: "block", width: "100%", textAlign: "center",
                  background: "#d7dce1", color: "#5f6b76",
                  padding: "20px 24px", borderRadius: 9, fontWeight: 800,
                  fontSize: "1.05rem", letterSpacing: "0.01em",
                  border: "none", cursor: "not-allowed",
                }}
              >
                Applications Closed
              </button>
              <p style={{ fontSize: "0.82rem", color: statusMeta.color, textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
                This listing remains visible, but it is not currently accepting new applications.
              </p>
            </div>
          ) : (
            <Link
              to={`/apply/${listing.id}`}
              className="listing-apply-btn"
              style={{
                display: "block", width: "100%", textAlign: "center",
                background: "#3e5b4b", color: "#fff",
                padding: "20px 24px", borderRadius: 9, fontWeight: 800,
                fontSize: "1.15rem", letterSpacing: "0.01em",
                textDecoration: "none", marginBottom: 12,
                boxShadow: "0 3px 10px rgba(62,91,75,0.3)",
              }}
            >
              Apply Now →
            </Link>
          )}

          {openHouseInfo && (
            <div style={{
              marginTop: 14,
              marginBottom: 14,
              border: "1px solid #eadfc8",
              borderRadius: 12,
              background: "#fff9ef",
              padding: "16px 14px",
            }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#8a4b16", marginBottom: 10 }}>
                Open House
              </h3>
              <div style={{ display: "grid", gap: 10 }}>
                {openHouseInfo.dateTime && (
                  <div>
                    <div style={labelStyle}>Open House Date / Time</div>
                    <div style={{ fontSize: "0.92rem", lineHeight: 1.55 }}>{openHouseInfo.dateTime}</div>
                  </div>
                )}
                {openHouseInfo.viewingInstructions && (
                  <div>
                    <div style={labelStyle}>Viewing Instructions</div>
                    <div style={{ fontSize: "0.92rem", lineHeight: 1.6 }}>{openHouseInfo.viewingInstructions}</div>
                  </div>
                )}
                {openHouseInfo.parkingAccessNotes && (
                  <div>
                    <div style={labelStyle}>Parking / Access Notes</div>
                    <div style={{ fontSize: "0.92rem", lineHeight: 1.6 }}>{openHouseInfo.parkingAccessNotes}</div>
                  </div>
                )}
              </div>
              <p style={{ fontSize: "0.84rem", color: "#7a5a2f", lineHeight: 1.65, marginTop: 12 }}>
                Open House visitors can scan the QR code to view the listing and apply online.
              </p>
            </div>
          )}

          <div style={{
            marginTop: 14,
            marginBottom: 14,
            border: "1px solid #d8e4db",
            borderRadius: 12,
            background: "#f7fbf8",
            padding: "16px 14px",
          }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#2f4338", marginBottom: 10, textAlign: "center" }}>
              QR Code
            </h3>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{ width: 180, maxWidth: "100%" }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6, marginBottom: 12 }}>
              Scan to view listing and apply online
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={handlePrintQrCode}
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: 44,
                  border: "1.5px solid #3e5b4b",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#3e5b4b",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                }}
              >
                Print QR Code
              </button>
              <button
                type="button"
                onClick={handlePrintOpenHouseCard}
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: 44,
                  border: "1.5px solid #d8d0c2",
                  borderRadius: 8,
                  background: "#f7f0e4",
                  color: "#3e5b4b",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                }}
              >
                Open House Print Card
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePdfDownload}
            disabled={pdfBusy}
            style={{
              display: "block", width: "100%", textAlign: "center",
              border: "1.5px solid var(--color-border)", color: "var(--color-text-muted)",
              padding: "13px 24px", borderRadius: 8, fontWeight: 600,
              fontSize: "0.88rem", textDecoration: "none",
              background: "#fff", cursor: pdfBusy ? "wait" : "pointer",
              fontFamily: "var(--font)",
            }}
          >
            {pdfBusy ? "Generating Rental Application PDF..." : "📄 Download Rental Application Form (PDF)"}
          </button>
          <p style={{ fontSize: "0.73rem", color: "var(--color-text-muted)", marginTop: 8, textAlign: "center", lineHeight: 1.6 }}>
            Generates a printable PDF with this listing information. Online form is still preferred.
          </p>
          {/* Watch Video — only shown when videoUrl exists in listing data */}
          {listing.videoUrl && (
            <a
              href={listing.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, marginTop: 10, width: "100%", textAlign: "center",
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
            className="share-btn--detail"
            title={title}
            text={`Check out this rental listing: ${title}`}
            url={window.location.href}
          />
            </div>

            {/* ── Application Requirements ─────────────────────────────────────── */}
            <div style={{ ...sectionCard, marginTop: 16, background: "#f8fafc" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 14, color: "var(--color-text)" }}>
                Application Requirements
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                Qualified applicants must provide the following:
              </p>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "A completed rental application for each adult occupant",
                  "Proof of income and/or employment",
                  "Credit score report, or written consent for the landlord/property manager to obtain a credit report",
                  "References",
                  "Tenant insurance with a minimum of $1 million third-party liability coverage",
                ].map((req, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.875rem", lineHeight: 1.6 }}>
                    <span style={{ color: "#3e5b4b", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Contact Information ──────────────────────────────────────────── */}
            <div style={{ ...sectionCard, marginTop: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 10, color: "var(--color-text)" }}>
                Contact Information
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", lineHeight: 1.75 }}>
                If interested, please contact <strong>Mabel</strong> with a brief introduction about yourself.
              </p>
              {!statusMeta.applicationsClosed && (
                <Link
                  to={`/apply/${listing.id}`}
                  className="listing-apply-btn"
                  style={{
                    display: "block", marginTop: 14,
                    background: "#3e5b4b", color: "#fff",
                    padding: "14px 28px", borderRadius: 8, fontWeight: 700,
                    fontSize: "1rem", textDecoration: "none", textAlign: "center",
                  }}
                >
                  Apply Now →
                </Link>
              )}
            </div>

            {/* ── Page footer ─────────────────────────────────────────────────── */}
            <p style={{ marginTop: 32, fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.8 }}>
              Vanisland Residential Property Management · {listing.city}, BC
              <br />Listing ID: {listing.id}
            </p>
          </div>

          <DesktopApplicationProcessSidebar />
        </div>
      </div>
    </div>
  );
}
