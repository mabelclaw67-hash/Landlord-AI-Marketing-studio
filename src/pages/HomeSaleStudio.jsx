import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";
import { readTrialAccess } from "../utils/trialAccess";
import {
  buildHomeSalePublicUrl,
  getHomeSaleListings,
} from "../utils/homeSaleSheet";

function extractDriveFileId(url) {
  const text = String(url || "");
  const fileMatch = text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return "";
}

function toImgSrc(url) {
  const fileId = extractDriveFileId(url);
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w1200` : url;
}

function formatPrice(value) {
  const digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return "待填写 / To be added";
  const amount = Number(digits);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toLocaleString()}`;
}

export default function HomeSaleStudio() {
  const trialSession = readTrialAccess();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHomeSaleListings()
      .then((rows) => setListings(rows))
      .catch((err) => setError(err.message || "Unable to load sale listings right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pub-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">Home Sale Studio / 售房工作台</h1>
        <p className="pub-hero__sub">Public Sale Listings / 公开出售房源</p>
        <p className="pub-hero__desc">
          面向屋主、FSBO 自售屋主与地产经纪的双语房屋出售营销模块。
          <br />Bilingual home sale marketing tools for sellers, FSBO owners, and realtors.
        </p>
      </section>

      <section className="section">
        <div className="container">
          {!trialSession && (
            <div className="card home-sale-admin-entry" style={{ marginBottom: 24 }}>
              <div>
                <div className="home-sale-admin-entry__eyebrow">Home Sale Admin Studio / 房屋出售后台管理</div>
                <h2>Manage the Home Sale Studio / 管理售房工作台</h2>
                <p>
                  从这里进入 Home Sale Admin，打开出售数据库、测试公开页与测试详情页。
                </p>
              </div>
              <Link to="/admin/home-sale" className="btn btn--sage">
                Home Sale Admin / 售房后台
              </Link>
            </div>
          )}

          <div className="notice notice--sage" style={{ marginBottom: 24 }}>
            <h4>Coming Soon / Beta</h4>
            <p>
              本模块将帮助屋主、FSBO 自售屋主与地产经纪整理双语卖房文案、房源展示页、二维码、买家咨询入口与 AI 视频推广素材。
            </p>
            <p style={{ marginTop: 6, opacity: 0.86 }}>
              This module will help home sellers, FSBO owners, and realtors prepare bilingual home sale marketing packages,
              listing pages, QR codes, buyer inquiry links, and AI video promotion materials.
            </p>
          </div>

          {loading && (
            <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              正在读取出售房源… / Loading sale listings…
            </div>
          )}

          {!loading && error && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>暂时无法读取房源 / Unable to Load Listings</h4>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>暂无出售房源 / No Sale Listings Yet</h4>
              <p>表格已连接，但 `01 Sale Listings` 目前没有可显示的出售房源。</p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="rental-card-list">
              {listings.map((listing) => (
                <article key={listing.id || listing.address} className="rental-card">
                  {listing.primaryPhotoUrl ? (
                    <div style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden", background: "#eef2f0" }}>
                      <img
                        src={toImgSrc(listing.primaryPhotoUrl)}
                        alt={listing.address || "Sale listing"}
                        style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }}
                      />
                    </div>
                  ) : null}

                  <div className="rental-card__header">
                    <div>
                      <h2 className="rental-card__address">
                        {listing.address || "待补房产地址 / Property address pending"}
                      </h2>
                      <p className="rental-card__city">
                        📍 {listing.city || "城市待填写"}{listing.province ? `, ${listing.province}` : ""}
                      </p>
                    </div>
                    <span className="rental-card__badge" style={{ background: "#f7efe4", color: "#8a5a22", border: "1px solid #e7cda7" }}>
                      {listing.status || "Draft"}
                    </span>
                  </div>

                  <div className="rental-card__facts">
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
                  </div>

                  <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                        中文简介 / Description CN
                      </div>
                      <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--color-text)" }}>
                        {listing.descriptionCn || "请在表格填写 Description CN。"}
                      </p>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                        English Description / Description EN
                      </div>
                      <p style={{ fontSize: "0.88rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
                        {listing.descriptionEn || "Please add Description EN in the sheet."}
                      </p>
                    </div>
                  </div>

                  <Link to={`/home-sale-studio/listings/${listing.id || ""}`} className="rental-card__cta">
                    View Listing / 查看详情 →
                  </Link>
                  <ShareButton
                    title={listing.address || "Home Sale Listing"}
                    text={`出售房源分享：${listing.address || listing.id} / Home sale listing`}
                    url={listing.publicListingUrl || buildHomeSalePublicUrl(listing.id)}
                  />
                </article>
              ))}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <Link to="/" className="btn btn--ghost">
              Back to Homepage / 返回首页
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
