import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";
import { buildQrCodeSvg } from "../utils/qrCodeSvg";
import {
  buildHomeSalePublicUrl,
  getHomeSaleListing,
  getHomeSaleSetupMessage,
  getSaleMediaByListingId,
  homeSaleSheetConfig,
} from "../utils/homeSaleSheet";

function extractDriveFileId(url) {
  const text = String(url || "");
  const fileMatch = text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return "";
}

function buildDriveThumbnailUrl(item) {
  // Use lh3 CDN directly — avoids SameSite cookie auth redirect on drive.google.com/thumbnail
  const fileId = extractDriveFileId(item?.driveUrl || "");
  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}=w1200`;
  if (item?.publicUrl) return item.publicUrl;
  return "";
}

function formatPrice(value) {
  const digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return "待填写 / To be added";
  const amount = Number(digits);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toLocaleString()}`;
}

// v2 — cover photo fallback from media sheet
export default function HomeSaleListingDetail() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [row, media] = await Promise.all([
        getHomeSaleListing(listingId),
        getSaleMediaByListingId(listingId).catch(() => []),
      ]);
      if (!row) throw new Error("Sale listing not found in 01 Sale Listings.");
      setListing(row);

      // Resolve cover photo: primaryPhotoUrl first, else Cover asset from media sheet
      // Always convert to lh3 CDN URL — uc?export=view fails as img src without auth
      if (row.primaryPhotoUrl) {
        const fileId = extractDriveFileId(row.primaryPhotoUrl);
        setCoverPhotoUrl(fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w1200` : row.primaryPhotoUrl);
      } else {
        const cover = media.find((m) => m.assetRole === "Cover");
        if (cover) setCoverPhotoUrl(buildDriveThumbnailUrl(cover));
      }
    }
    load()
      .catch((err) => setError(err.message || getHomeSaleSetupMessage()))
      .finally(() => setLoading(false));
  }, [listingId]);

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
      <h1>扫码查看出售房源</h1>
      <p class="meta">Scan to view the sale listing / 扫码查看出售房源</p>
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
        <h1 className="pub-hero__title">出售房源详情</h1>
        <p className="pub-hero__sub">Home Sale Listing Detail</p>
      </section>

      <section className="section">
        <div className="container">
          {loading && (
            <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              正在读取出售房源详情… / Loading sale listing detail…
            </div>
          )}

          {!loading && error && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>本地连接提示 / Local Setup Message</h4>
              <p>{error}</p>
              <p style={{ marginTop: 6, opacity: 0.86 }}>
                Local test only. Current source tab: <strong>{homeSaleSheetConfig.tabs.listings}</strong>.
              </p>
            </div>
          )}

          {!loading && listing && (
            <>
              <div className="card" style={{ marginBottom: 20, borderColor: "#e5dfd6" }}>
                {coverPhotoUrl ? (
                  <div style={{ marginBottom: 18, borderRadius: 14, overflow: "hidden", background: "#eef2f0" }}>
                    <img
                      src={coverPhotoUrl}
                      alt={listing.address || "Sale listing"}
                      style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }}
                    />
                  </div>
                ) : null}

                <h2 style={{ fontSize: "1.55rem", color: "#213128", marginBottom: 8 }}>
                  {listing.address || "待补房产地址 / Property address pending"}
                </h2>
                <p style={{ color: "var(--color-text-muted)", marginBottom: 14 }}>
                  {listing.city || "城市待填写"}{listing.province ? `, ${listing.province}` : ""}
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
                    <span className="rental-card__fact-value">{listing.propertyType || "待填写 / Pending"}</span>
                  </div>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Status</span>
                    <span className="rental-card__fact-value">{listing.status || "Draft"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 6 }}>
                      中文简介 / Description CN
                    </div>
                    <p style={{ lineHeight: 1.8 }}>
                      {listing.descriptionCn || "请在 Google Sheet 填写 Description CN。"}
                    </p>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 6 }}>
                      English Description / Description EN
                    </div>
                    <p style={{ lineHeight: 1.8, color: "var(--color-text-muted)" }}>
                      {listing.descriptionEn || "Please add Description EN in the Google Sheet."}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <ShareButton
                    title={listing.address || "Home Sale Listing"}
                    text={`出售房源分享：${listing.address || listing.id} / Home sale listing`}
                    url={listing.publicListingUrl || buildHomeSalePublicUrl(listing.id)}
                    className="share-btn--detail"
                  />
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20, borderColor: "#d8e4db", background: "#f7fbf8" }}>
                <h3 style={{ color: "#2f4338", marginBottom: 10, fontSize: "1rem", fontWeight: 800, textAlign: "center" }}>
                  Sale QR Code / 出售房源二维码
                </h3>
                <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <div style={{ width: 180 }} dangerouslySetInnerHTML={{ __html: buildQrCodeSvg(listing.publicListingUrl || buildHomeSalePublicUrl(listing.id), {
                    cellSize: 5,
                    quietZone: 4,
                    foreground: "#2f4338",
                    background: "#ffffff",
                  }) }} />
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6, marginBottom: 12 }}>
                  扫码查看出售房源与买家咨询入口 / Scan to view the sale listing and buyer inquiry page
                </p>
                <div className="flex" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn--ghost" onClick={handlePrintQrCode}>Print QR Code / 打印二维码</button>
                  <a href={listing.publicListingUrl || buildHomeSalePublicUrl(listing.id)} target="_blank" rel="noreferrer" className="btn btn--ghost">
                    Open Public Page
                  </a>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20, borderColor: "#e5dfd6" }}>
                <h3 style={{ color: "#3e5b4b", marginBottom: 10 }}>买家咨询 / Buyer Inquiry</h3>
                <p style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", marginBottom: 16 }}>
                  本区域目前仅供本地测试，不会提交到 Google Sheet。
                  <br />Local test only. This form does not submit to the sheet yet.
                </p>

                <div style={{ display: "grid", gap: 14 }}>
                  <input className="form-control" placeholder="姓名 / Name" />
                  <input className="form-control" placeholder="电话 / Phone" />
                  <input className="form-control" placeholder="邮箱 / Email" />
                  <input className="form-control" placeholder="希望看房时间 / Preferred showing time" />
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="留言 / Message"
                  />
                  <button type="button" className="btn btn--ghost" disabled>
                    local test only
                  </button>
                </div>
              </div>
            </>
          )}

          <Link to="/home-sale-studio" className="btn btn--ghost">
            返回出售工作台 / Back to Home Sale Studio
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
