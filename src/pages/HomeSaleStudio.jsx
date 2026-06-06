import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import ShareButton from "../components/ShareButton";
import { readTrialAccess } from "../utils/trialAccess";
import { buildHomeSalePublicUrl } from "../utils/publicUrls";
import {
  extractHomeSaleDriveFileId,
  getPublicSaleListings,
  getPublicSaleMediaByListingId,
  getSalePhotoData,
  resolveHomeSaleImageUrl,
} from "../utils/homeSaleSheet";
import { sortSaleListings } from "../utils/listingSort";
import { normalizeLang } from "../utils/lang";

const LABELS = {
  en: {
    pricePending: "To be added",
    loadError: "Unable to load sale listings right now.",
    heroTitle: "Home Sale Studio",
    heroSub: "Public Sale Listings",
    heroDesc: "Bilingual home sale marketing tools for sellers, FSBO owners, and realtors.",
    adminEyebrow: "Home Sale Admin Studio",
    adminTitle: "Manage the Home Sale Studio",
    adminDesc: "Access Home Sale Admin to manage the sale listings database, public listing pages, and listing details.",
    adminBtn: "Home Sale Admin",
    loading: "Loading sale listings...",
    unableTitle: "Unable to Load Listings",
    emptyTitle: "No Sale Listings Yet",
    emptyDesc: "The sheet is connected, but there are no sale listings to display yet.",
    noPhoto: "No photo available",
    imageAlt: "Sale listing",
    addressPending: "Property address pending",
    draft: "Draft",
    askingPrice: "Asking Price",
    bedsBaths: "Beds / Baths",
    propertyType: "Property Type",
    pending: "Pending",
    descCn: "Description CN",
    descEn: "Description EN",
    descCnMissing: "Please add Description CN in the sheet.",
    descEnMissing: "Please add Description EN in the sheet.",
    viewListing: "View Listing ->",
    shareTitle: "Home Sale Listing",
    shareText: "Home sale listing",
    backHome: "Back to Homepage",
  },
  zh: {
    pricePending: "待补充",
    loadError: "暂时无法加载出售房源。",
    heroTitle: "出售房源工作台",
    heroSub: "公开出售房源",
    heroDesc: "为卖家、自售业主和地产经纪准备的中英文出售房源营销工具。",
    adminEyebrow: "出售房源管理",
    adminTitle: "管理出售房源工作台",
    adminDesc: "进入出售房源后台，管理出售房源数据库、公开房源页面和房源详情。",
    adminBtn: "进入出售后台",
    loading: "正在加载出售房源...",
    unableTitle: "无法加载房源",
    emptyTitle: "还没有出售房源",
    emptyDesc: "表格已经连接，但目前没有可显示的出售房源。",
    noPhoto: "暂无照片",
    imageAlt: "出售房源",
    addressPending: "房源地址待补充",
    draft: "草稿",
    askingPrice: "挂牌价",
    bedsBaths: "卧室 / 卫浴",
    propertyType: "物业类型",
    pending: "待补充",
    descCn: "中文描述",
    descEn: "英文描述",
    descCnMissing: "请在表格中补充中文描述。",
    descEnMissing: "请在表格中补充英文描述。",
    viewListing: "查看房源 ->",
    shareTitle: "出售房源",
    shareText: "出售房源",
    backHome: "返回首页",
  },
};

function formatPrice(value, labels) {
  const digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return labels.pricePending;
  const amount = Number(digits);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toLocaleString()}`;
}

export default function HomeSaleStudio({ lang }) {
  const labels = LABELS[normalizeLang(lang)] || LABELS.en;
  const trialSession = readTrialAccess();
  const [listings, setListings] = useState([]);
  const [listingImages, setListingImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    let cancelled = false;

    getPublicSaleListings()
      .then((rows) => {
        if (cancelled) return;
        setListings(sortSaleListings(rows));
        setLoading(false);

        Promise.all(
          rows.map(async (listing) => {
            const listingId = listing.id || listing.listingId || "";
            if (!listingId) return [listingId, ""];

            const mediaRows = await getPublicSaleMediaByListingId(listingId).catch(() => []);
            const fallbackUrl = resolveHomeSaleImageUrl(listing, mediaRows);
            const fileId = extractHomeSaleDriveFileId(fallbackUrl);

            if (!fileId) return [listingId, fallbackUrl];

            try {
              const result = await getSalePhotoData({ listingId, fileId });
              if (result?.data) {
                return [listingId, `data:${result.mimeType || "image/jpeg"};base64,${result.data}`];
              }
            } catch {
              // Fall back to the Drive thumbnail URL below.
            }

            return [listingId, fallbackUrl];
          })
        ).then((entries) => {
          if (cancelled) return;
          const nextImages = Object.fromEntries(entries.filter(([id]) => id));
          setListingImages(nextImages);
          setBrokenImages((prev) => {
            const next = { ...prev };
            Object.keys(nextImages).forEach((id) => {
              if (nextImages[id]) delete next[id];
            });
            return next;
          });
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || labels.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [labels.loadError]);

  return (
    <div className="pub-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{labels.heroTitle}</h1>
        <p className="pub-hero__sub">{labels.heroSub}</p>
        <p className="pub-hero__desc">
          {labels.heroDesc}
        </p>
      </section>

      <section className="section">
        <div className="container">
          {!trialSession && (
            <div className="card home-sale-admin-entry" style={{ marginBottom: 24 }}>
              <div>
                <div className="home-sale-admin-entry__eyebrow">{labels.adminEyebrow}</div>
                <h2>{labels.adminTitle}</h2>
                <p>
                  {labels.adminDesc}
                </p>
              </div>
              <Link to="/admin/home-sale" className="btn btn--sage">
                {labels.adminBtn}
              </Link>
            </div>
          )}


          {loading && (
            <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              {labels.loading}
            </div>
          )}

          {!loading && error && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>{labels.unableTitle}</h4>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="notice notice--warm" style={{ marginBottom: 24 }}>
              <h4>{labels.emptyTitle}</h4>
              <p>{labels.emptyDesc}</p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="rental-card-list">
              {listings.map((listing) => {
                const imageKey = listing.id || listing.address;
                const imageSrc = listingImages[listing.id] || resolveHomeSaleImageUrl(listing);
                const isDataImage = String(imageSrc || "").startsWith("data:");

                return (
                  <article key={imageKey} className="rental-card">
                    {imageSrc && (isDataImage || !brokenImages[imageKey]) ? (
                    <div style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden", background: "#eef2f0" }}>
                      <img
                        src={imageSrc}
                        alt={listing.address || labels.imageAlt}
                        onError={() =>
                          setBrokenImages((prev) => ({
                            ...prev,
                            [imageKey]: true,
                          }))
                        }
                        style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }}
                      />
                    </div>
                    ) : (
                      <div
                        style={{
                          marginBottom: 16,
                          borderRadius: 12,
                          background: "#eef2f0",
                          aspectRatio: "16 / 10",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-text-muted)",
                          fontSize: "0.88rem",
                          textAlign: "center",
                          padding: 16,
                        }}
                      >
                        {labels.noPhoto}
                      </div>
                    )}

                    <div className="rental-card__header">
                      <div>
                        <h2 className="rental-card__address">
                          {listing.address || labels.addressPending}
                        </h2>
                        <p className="rental-card__city">
                          📍 {listing.city || ""}{listing.province ? `, ${listing.province}` : ""}
                        </p>
                      </div>
                      <span className="rental-card__badge" style={{ background: "#f7efe4", color: "#8a5a22", border: "1px solid #e7cda7" }}>
                        {listing.status || labels.draft}
                      </span>
                    </div>

                    <div className="rental-card__facts">
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">{labels.askingPrice}</span>
                        <span className="rental-card__fact-value">{formatPrice(listing.askingPrice, labels)}</span>
                      </div>
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">{labels.bedsBaths}</span>
                        <span className="rental-card__fact-value">
                          {listing.bedrooms || "—"} / {listing.bathrooms || "—"}
                        </span>
                      </div>
                      <div className="rental-card__fact">
                        <span className="rental-card__fact-label">{labels.propertyType}</span>
                        <span className="rental-card__fact-value">{listing.propertyType || labels.pending}</span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                          {labels.descCn}
                        </div>
                        <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--color-text)" }}>
                          {listing.descriptionCn || labels.descCnMissing}
                        </p>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                          {labels.descEn}
                        </div>
                        <p style={{ fontSize: "0.88rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
                          {listing.descriptionEn || labels.descEnMissing}
                        </p>
                      </div>
                    </div>

                    <Link to={`/home-sale-studio/listings/${listing.id || ""}`} className="rental-card__cta">
                      {labels.viewListing}
                    </Link>
                    <ShareButton
                      title={listing.address || labels.shareTitle}
                      text={`${labels.shareText}: ${listing.address || listing.id}`}
                      url={listing.publicListingUrl || buildHomeSalePublicUrl(listing.id)}
                    />
                  </article>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <Link to="/" className="btn btn--ghost">
              {labels.backHome}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
