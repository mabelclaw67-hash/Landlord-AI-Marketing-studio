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
  resolveHomeSaleImageUrl,
  submitHomeSaleBuyerInquiry,
} from "../utils/homeSaleSheet";

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
  if (!digits) return "待填写 / To be added";
  const amount = Number(digits);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toLocaleString()}`;
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
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [marketing, setMarketing] = useState({ en: "", zh: "" });
  const [videoWatchUrl, setVideoWatchUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

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
      setImageFailed(false);
      setCoverPhotoUrl(resolveHomeSaleImageUrl(row, media));
    }
    load()
      .catch((err) => setError(err.message || "Unable to load sale listing right now."))
      .finally(() => setLoading(false));
  }, [listingId]);

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
      setInquirySuccess(`Thank you! Your showing request has been received. We will be in touch to confirm. / 感谢您的看房申请，我们将联系您确认时间。 (${result.inquiryId})`);
      setInquiry(EMPTY_INQUIRY);
    } catch (err) {
      setInquiryError(err.message || "Submission failed. Please try again. / 提交失败，请稍后重试。");
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
        <h1 className="pub-hero__title">Home Sale Listing / 出售房源详情</h1>
        <p className="pub-hero__sub">Public Sale Listing Detail / 公开出售页</p>
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
              <h4>无法读取出售房源 / Unable to Load Listing</h4>
              <p>{error}</p>
            </div>
          )}

          {!loading && listing && (
            <>
              <div className="card" style={{ marginBottom: 20, borderColor: "#e5dfd6" }}>
                {coverPhotoUrl && !imageFailed ? (
                  <div style={{ marginBottom: 18, borderRadius: 14, overflow: "hidden", background: "#eef2f0" }}>
                    <img
                      src={coverPhotoUrl}
                      alt={listing.address || "Sale listing"}
                      onError={() => {
                        const fallbackFromMedia = resolveHomeSaleImageUrl(listing, mediaRows.filter((item) => item.driveUrl !== coverPhotoUrl && item.publicUrl !== coverPhotoUrl));
                        if (fallbackFromMedia && fallbackFromMedia !== coverPhotoUrl) {
                          setCoverPhotoUrl(fallbackFromMedia);
                          return;
                        }
                        setImageFailed(true);
                      }}
                      style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }}
                    />
                  </div>
                ) : (
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
                    No photo available / 暂无房源图片
                  </div>
                )}

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
                    <span className="rental-card__fact-label">Asking Price / 售价</span>
                    <span className="rental-card__fact-value">{formatPrice(listing.askingPrice)}</span>
                  </div>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Beds / Baths / 卧室 / 卫浴</span>
                    <span className="rental-card__fact-value">
                      {listing.bedrooms || "—"} / {listing.bathrooms || "—"}
                    </span>
                  </div>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Property Type / 房源类型</span>
                    <span className="rental-card__fact-value">{listing.propertyType || "待填写 / Pending"}</span>
                  </div>
                  <div className="rental-card__fact">
                    <span className="rental-card__fact-label">Status / 状态</span>
                    <span className="rental-card__fact-value">{listing.status || "Draft"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 20 }}>
                  {(marketing.zh || marketing.headlineZh) && (
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 6 }}>
                        中文简介
                      </div>
                      {marketing.headlineZh && (
                        <p style={{ fontWeight: 700, color: "#213128", marginBottom: 6, lineHeight: 1.6 }}>
                          {marketing.headlineZh}
                        </p>
                      )}
                      <p style={{ lineHeight: 1.9, whiteSpace: "pre-line" }}>
                        {marketing.zh}
                      </p>
                    </div>
                  )}

                  {(marketing.en || marketing.headlineEn) && (
                    <div style={{ borderTop: marketing.zh ? "1px solid #f0ede8" : "none", paddingTop: marketing.zh ? 16 : 0 }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 6 }}>
                        English Description
                      </div>
                      {marketing.headlineEn && (
                        <p style={{ fontWeight: 700, color: "#213128", marginBottom: 6, lineHeight: 1.6 }}>
                          {marketing.headlineEn}
                        </p>
                      )}
                      <p style={{ lineHeight: 1.9, color: "var(--color-text-muted)", whiteSpace: "pre-line" }}>
                        {marketing.en}
                      </p>
                    </div>
                  )}

                  {!marketing.zh && !marketing.en && (
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
                      房源简介将由卖家提供。/ Property description will be provided by the seller.
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
                      ▶ Watch Video / 查看视频
                    </a>
                  )}
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
                    Open Public Page / 打开公开页
                  </a>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20, borderColor: "#e5dfd6" }}>
                <h3 style={{ color: "#3e5b4b", marginBottom: 6 }}>预约看房 / Request a Showing</h3>

                {/* Showing availability */}
                <div style={{ marginBottom: 14 }}>
                  {listing.showingAvailability ? (
                    <div style={{ background: "#edf7f0", border: "1px solid #b6dfc7", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#276745", marginBottom: 4 }}>
                        🗓 Available Showing Times / 可看房时间
                      </div>
                      <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "0.88rem", color: "#213128", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                        {listing.showingAvailability}
                      </pre>
                    </div>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fdf3e7", color: "#8a5a22", border: "1px solid #e7cda7", borderRadius: 20, padding: "4px 12px", fontSize: "0.82rem", fontWeight: 700 }}>
                      Showing times: contact us to arrange / 看房时间：请联系安排
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 6 }}>
                  对这套房源感兴趣？提交看房申请，我们会联系您确认时间。
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 16 }}>
                  Interested in this property? Submit a showing request and we will contact you to confirm.
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 16, fontStyle: "italic" }}>
                  看房时间需经卖家确认。/ Showing requests are subject to seller approval.
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
                          placeholder="名字 / First Name *"
                          value={inquiry.buyerFirstName}
                          onChange={(e) => setInquiry((p) => ({ ...p, buyerFirstName: e.target.value }))}
                          required
                          disabled={inquirySubmitting}
                        />
                        <input
                          className="form-control"
                          placeholder="姓氏 / Last Name *"
                          value={inquiry.buyerLastName}
                          onChange={(e) => setInquiry((p) => ({ ...p, buyerLastName: e.target.value }))}
                          required
                          disabled={inquirySubmitting}
                        />
                      </div>
                      <input
                        className="form-control"
                        type="email"
                        placeholder="邮箱 / Email *"
                        value={inquiry.email}
                        onChange={(e) => setInquiry((p) => ({ ...p, email: e.target.value }))}
                        required
                        disabled={inquirySubmitting}
                      />
                      <input
                        className="form-control"
                        placeholder="电话 / Phone"
                        value={inquiry.phone}
                        onChange={(e) => setInquiry((p) => ({ ...p, phone: e.target.value }))}
                        disabled={inquirySubmitting}
                      />
                      <div>
                        <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                          希望看房日期 / Preferred Showing Date
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
                          希望看房时段 / Preferred Time Window
                        </label>
                        <select
                          className="form-control"
                          value={inquiry.preferredTimeWindow}
                          onChange={(e) => setInquiry((p) => ({ ...p, preferredTimeWindow: e.target.value }))}
                          disabled={inquirySubmitting}
                        >
                          <option value="">-- 请选择时段 / Select a time window --</option>
                          <option value="9:00 AM - 11:00 AM">9:00 AM – 11:00 AM</option>
                          <option value="10:00 AM - 12:00 PM">10:00 AM – 12:00 PM</option>
                          <option value="11:00 AM - 1:00 PM">11:00 AM – 1:00 PM</option>
                          <option value="12:00 PM - 2:00 PM">12:00 PM – 2:00 PM</option>
                          <option value="1:00 PM - 3:00 PM">1:00 PM – 3:00 PM</option>
                          <option value="2:00 PM - 4:00 PM">2:00 PM – 4:00 PM</option>
                          <option value="3:00 PM - 5:00 PM">3:00 PM – 5:00 PM</option>
                          <option value="Flexible / 时间灵活">Flexible / 时间灵活</option>
                        </select>
                      </div>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="留言或其他要求 / Message or additional requests"
                        value={inquiry.message}
                        onChange={(e) => setInquiry((p) => ({ ...p, message: e.target.value }))}
                        disabled={inquirySubmitting}
                      />
                      <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={inquirySubmitting}
                      >
                        {inquirySubmitting ? "提交中… / Submitting…" : "Submit Buyer Inquiry / 提交买家咨询"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          <Link to="/home-sale-studio" className="btn btn--ghost">
            Back to Home Sale Studio / 返回售房工作台
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
