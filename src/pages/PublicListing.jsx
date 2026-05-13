import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getListing, getListingFolderFiles } from "../utils/storage";
import ShareButton from "../components/ShareButton";
import { downloadRentalApplicationPdf } from "../utils/rentalApplicationPdf";

const RENTAL_FORM_URL = import.meta.env.VITE_RENTAL_FORM_URL || "";
const FORM_URL_READY  = RENTAL_FORM_URL &&
  !RENTAL_FORM_URL.startsWith("PASTE_MY");

// ── Pure helpers ──────────────────────────────────────────────────────────────

function extractFolderId(link) {
  if (!link) return null;
  const m = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

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

// Cover = first file whose name starts with "1" (numeric sort), fallback first.
function detectCover(files) {
  if (!files || files.length === 0) return null;
  const sorted = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
  return sorted.find((f) => /^1/i.test(f.name)) || sorted[0];
}

// ── Image sub-components ──────────────────────────────────────────────────────

function CoverPhoto({ file }) {
  const src = file.dataUrl || file.thumbUrlLg || file.thumbUrl || file.url;
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
  const [photosLoading, setPhotosLoading] = useState(false);
  const [pdfBusy,       setPdfBusy]       = useState(false);

  useEffect(() => {
    getListing(id)
      .then((l) => {
        if (!l) { setError("Listing not found."); return; }
        setListing(l);
        const folderId = extractFolderId(l.driveFolderLink);
        if (folderId) {
          setPhotosLoading(true);
          getListingFolderFiles(folderId)
            .then((files) => setPhotos(files || []))
            .catch(() => {})
            .finally(() => setPhotosLoading(false));
        }
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

  const cover = detectCover(photos);
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

  function handlePdfDownload() {
    if (!listing || pdfBusy) return;
    setPdfBusy(true);
    try {
      downloadRentalApplicationPdf(listing, window.location.href);
    } finally {
      window.setTimeout(() => setPdfBusy(false), 800);
    }
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
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ fontSize: "0.75rem", color: "#62796b", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
            Vanisland Residential · Rental Listing
          </p>
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
        <div className="listing-facts-strip" style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexWrap: "wrap" }}>
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
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>

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
            Please prepare income/employment proof, credit information, references, and tenant insurance information.
          </p>

          {/* Listing context */}
          <div style={{ background: "#edf3ee", borderRadius: 8, padding: "12px 16px", marginBottom: 22, fontSize: "0.88rem", lineHeight: 1.9 }}>
            <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Applying for: </span><strong>{title}</strong></div>
            <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Listing ID: </span><code style={{ fontSize: "0.84rem" }}>{listing.id}</code></div>
          </div>

          {/* Primary CTA */}
          {FORM_URL_READY ? (
            <a
              href={buildPrefilledApplicationUrl(listing)}
              target="_blank"
              rel="noopener noreferrer"
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
            </a>
          ) : (
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
              <p style={{ fontSize: "0.85rem", color: "#92400e", fontWeight: 600 }}>
                Application form URL not yet configured. Set <code>VITE_RENTAL_FORM_URL</code> in <code>.env.local</code>.
              </p>
            </div>
          )}

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
              ▶ Watch Video / 查看视频
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
          {FORM_URL_READY && (
            <a
              href={buildPrefilledApplicationUrl(listing)}
              target="_blank"
              rel="noopener noreferrer"
              className="listing-apply-btn"
              style={{
                display: "block", marginTop: 14,
                background: "#3e5b4b", color: "#fff",
                padding: "14px 28px", borderRadius: 8, fontWeight: 700,
                fontSize: "1rem", textDecoration: "none", textAlign: "center",
              }}
            >
              Apply Now →
            </a>
          )}
        </div>

        {/* ── Page footer ─────────────────────────────────────────────────── */}
        <p style={{ marginTop: 32, fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.8 }}>
          Vanisland Residential Property Management · {listing.city}, BC
          <br />Listing ID: {listing.id}
        </p>

      </div>
    </div>
  );
}
