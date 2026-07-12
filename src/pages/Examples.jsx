import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getListingFolderFiles, getListingSubfolderFiles, getPublicListings } from "../utils/storage";
import ShareButton from "../components/ShareButton";
import ShareKit from "../components/ShareKit";
import { RentalApplicationProcessCard } from "../components/RentalApplicationProcessPanel";
import { TenantServiceProcessCard } from "../components/TenantServiceProcessPanel";
import {
  getListingStatusMeta,
  resolveRentalListingCover,
  resolveRentalListingImageSrc,
} from "../utils/listingPublicMeta";
import { sortRentalListings } from "../utils/listingSort";

const TENANT_SHARE_MESSAGES = [
  {
    id: "general-rental-sharing",
    label: "General Rental Sharing",
    rows: 5,
    text:
      "Here is the current rental listings page. You can browse available homes, view details, and apply online if a listing is a good fit.",
  },
  {
    id: "wechat-tenant-sharing",
    label: "WeChat Sharing",
    rows: 5,
    text:
      "Here is the current rental listings page for available homes. You can open each listing to see details, photos, and the application link. If you are interested, please apply online here.",
  },
  {
    id: "facebook-rental-group",
    label: "Facebook Rental Group",
    rows: 5,
    text:
      "Current rental listings are available at the link below. Prospective tenants can review property details and apply online directly from each listing page.",
  },
  {
    id: "direct-message-tenant",
    label: "Direct Message to Prospective Tenant",
    rows: 5,
    text:
      "Here is the rental listings page with current available homes. Please review the listing details carefully and submit the online application if you would like to be considered.",
  },
];

const RENTAL_PUBLIC_TEXT = {
  en: {
    // Listing card labels (unchanged)
    loading: "Loading listings...",
    loadError: "Failed to load listings:",
    emptyTitle: "No listings available right now.",
    emptyDesc: "New homes are added regularly — please check back soon or apply to be notified.",
    photoUnavailable: "Photo unavailable",
    rent: "Rent",
    beds: "Beds",
    baths: "Baths",
    available: "Available",
    statusAvailable: "Available",
    applicationsClosed: "Applications closed",
    viewDetailsApply: "View Details / Apply →",
    viewDetailsStatus: "View Details / Status →",
    shareListing: "Share Listing",
    copied: "✓ Link copied",
    perMonth: "/mo",

    // Hero
    heroBrand: "Vanisland Rentals",
    heroSub: "Your single home for browsing rental listings, applying online, and tenant services on Vancouver Island.",
    heroBrowse: "Browse Rental Listings",
    heroApply: "Apply Now",
    heroService: "Start Service Request",
    heroContact: "Contact Us",

    // Core services
    coreTitle: "How can we help you today?",
    coreSub: "Three simple paths — find a home, apply online, or get service as a current tenant.",
    findTitle: "Find a Home",
    findDesc: [
      "Browse current available rentals",
      "View photos, rent, and full details",
      "Open each listing page directly",
    ],
    findCta: "View Listings",
    applyTitle: "Apply for a Rental",
    applyDesc: [
      "Submit your application online",
      "Complete identity and income details",
      "Move into review and lease signing",
    ],
    applyCta: "Apply Now",
    serviceTitle: "Tenant Service Request",
    serviceDesc: [
      "Current tenants submit repair & service requests",
      "Upload photos and get a Request ID",
      "Track the handling process",
    ],
    serviceCta: "Start Service Request",

    // Featured listings
    featuredTitle: "Available Rentals",
    featuredSub: "Browse current homes and apply online for any listing that fits.",
    shareKit: "Share Kit",
    shareKitTitle: "Tenant Rental Listings Share Kit",
    shareKitSub: "For tenants, applicants, and public rental listing sharing only.",
    shareLink: "Copy Current Page Link",

    // Process
    processTitle: "How Our Process Works",
    processSub: "Clear steps for both renting a home and requesting tenant service.",

    // Emergency
    emergencyTitle: "Emergency? Call 911 First",
    emergencyIntro: "For the following situations, call 911 or the appropriate emergency service immediately — do not wait for an online form to be reviewed:",
    emergencyItems: [
      "Fire",
      "Active or major flooding",
      "Gas smell",
      "Immediate electrical danger",
      "Any life-safety emergency",
    ],

    // Trust highlights
    trustTitle: "Why Rent With Us",
    trustItems: [
      ["🏢", "Professional Rental Management", "Homes managed by an experienced Vancouver Island team."],
      ["🔒", "Secure Online Applications", "Submit your application and documents safely online."],
      ["🛠️", "Maintenance Request Tracking", "Every request gets an ID and a clear handling process."],
      ["💬", "Responsive Tenant Communication", "Clear, timely updates from management throughout."],
    ],

    // Quick help
    helpTitle: "Quick Help",
    helpItems: [
      ["How do I apply?", "Open any listing and choose Apply Now, or use the Apply Now button in the top navigation. You'll complete your identity and income details online."],
      ["How do I report a maintenance issue?", "Current tenants can use Start Service Request. Verify your tenancy, describe the issue, upload photos, and you'll receive a Request ID."],
      ["What should I do in an emergency?", "For fire, major flooding, gas smell, or immediate electrical danger, call 911 or the appropriate emergency service first. Do not wait for the online form."],
      ["How will management contact me?", "Management follows up by email or phone using the contact details you provide, and keeps you updated through each step."],
    ],

    // Tenant quick links strip
    footerLinksTitle: "Tenant Quick Links",
    footerRentalListings: "Rental Listings",
    footerApply: "Apply Online",
    footerService: "Tenant Service Request",
    footerContact: "Contact",
  },
  zh: {
    // Listing card labels (unchanged)
    loading: "正在加载出租房源...",
    loadError: "出租房源加载失败：",
    emptyTitle: "目前暂无可租房源。",
    emptyDesc: "新房源会定期更新，请稍后再来查看，或先提交申请以便通知。",
    photoUnavailable: "照片暂不可用",
    rent: "租金",
    beds: "卧室",
    baths: "卫生间",
    available: "可入住日期",
    statusAvailable: "可租",
    applicationsClosed: "申请已关闭",
    viewDetailsApply: "查看详情 / 申请 →",
    viewDetailsStatus: "查看详情 / 状态 →",
    shareListing: "分享房源",
    copied: "✓ 已复制链接",
    perMonth: "每月",

    // Hero
    heroBrand: "Vanisland 出租",
    heroSub: "浏览出租房源、在线申请租房及租客服务的统一入口，服务温哥华岛地区。",
    heroBrowse: "浏览出租房源",
    heroApply: "立即申请",
    heroService: "提交服务申请",
    heroContact: "联系我们",

    // Core services
    coreTitle: "今天需要什么帮助？",
    coreSub: "三条简单路径——找房、在线申请，或作为在住租客获取服务。",
    findTitle: "寻找住房",
    findDesc: [
      "浏览当前可租房源",
      "查看照片、租金和详细信息",
      "直接进入每个房源页面",
    ],
    findCta: "查看房源",
    applyTitle: "在线申请租房",
    applyDesc: [
      "在线提交租房申请",
      "完成身份和收入资料",
      "进入审核与签约流程",
    ],
    applyCta: "立即申请",
    serviceTitle: "租客服务申请",
    serviceDesc: [
      "在住租客提交维修与服务申请",
      "上传照片并获取申请编号",
      "查看处理流程进度",
    ],
    serviceCta: "提交服务申请",

    // Featured listings
    featuredTitle: "可租房源",
    featuredSub: "浏览当前房源，并可在线申请任何合适的房源。",
    shareKit: "分享工具",
    shareKitTitle: "出租房源分享工具",
    shareKitSub: "仅供租客、申请人和公开出租房源分享使用。",
    shareLink: "复制当前页面链接",

    // Process
    processTitle: "办理流程说明",
    processSub: "租房和租客服务申请的清晰步骤说明。",

    // Emergency
    emergencyTitle: "紧急情况？请先拨打 911",
    emergencyIntro: "遇到以下情况，请立即拨打 911 或联系相应紧急服务，不要等待线上表单被审核：",
    emergencyItems: [
      "火灾",
      "正在发生或大量漏水",
      "燃气气味",
      "即时电气危险",
      "任何危及生命安全的紧急情况",
    ],

    // Trust highlights
    trustTitle: "为什么选择我们",
    trustItems: [
      ["🏢", "专业物业管理", "由经验丰富的温哥华岛团队管理房源。"],
      ["🔒", "安全在线申请", "在线安全提交申请与相关资料。"],
      ["🛠️", "维修申请可追踪", "每个申请都有编号和清晰的处理流程。"],
      ["💬", "及时租客沟通", "全程由物业管理方清晰、及时地更新进度。"],
    ],

    // Quick help
    helpTitle: "快速帮助",
    helpItems: [
      ["我要如何申请？", "打开任意房源并点击“立即申请”，或使用顶部导航的“立即申请”按钮，在线完成身份和收入资料。"],
      ["如何报修？", "在住租客可点击“提交服务申请”。验证租赁身份、描述问题、上传照片，即可获得申请编号。"],
      ["遇到紧急情况怎么办？", "如遇火灾、大量漏水、燃气气味或即时电气危险，请先拨打 911 或联系相应紧急服务，不要等待线上表单。"],
      ["物业会如何联系我？", "物业管理方会使用您提供的联系方式，通过电子邮件或电话跟进，并在每一步更新进度。"],
    ],

    // Tenant quick links strip
    footerLinksTitle: "租客快捷入口",
    footerRentalListings: "出租房源",
    footerApply: "在线申请",
    footerService: "租客服务申请",
    footerContact: "联系",
  },
};

// Show the cover image for a rental listing card.
// Always renders the photo area — shows a placeholder when no URL or image fails to load.
function ListingCardCover({ coverPhoto, label }) {
  const src = resolveRentalListingImageSrc(coverPhoto);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", background: "#eef2f0", aspectRatio: "16/10" }}>
      {src && !failed ? (
        <img
          src={src}
          alt="Listing cover"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", minHeight: 140,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: "2.5rem", opacity: 0.45 }}>🏠</span>
          <span style={{ fontSize: "0.78rem", color: "#8a9e90", fontWeight: 500 }}>
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

function formatDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s;
}

export default function Examples({ lang = "en" }) {
  const safeLang = lang === "zh" ? "zh" : "en";
  const labels = RENTAL_PUBLIC_TEXT[safeLang];
  const [listings, setListings] = useState([]);
  const [coverPhotos, setCoverPhotos] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const all = await getPublicListings();
        const active = (all || []).filter((listing) =>
          (listing.status || "").trim().toLowerCase() === "published"
        );
        if (cancelled) return;
        setListings(sortRentalListings(active));
        setCoverPhotos(Object.fromEntries(
          active.map((listing) => [
            listing.id,
            resolveRentalListingCover([], [], listing.coverImageFileId),
          ])
        ));
        setLoading(false);

        Promise.all(
          active.map(async (listing) => {
            try {
              const [rootFiles, subfolder] = await Promise.all([
                getListingFolderFiles("", listing.id).catch(() => []),
                getListingSubfolderFiles("", "03_Cover_Images", listing.id).catch(() => ({ files: [] })),
              ]);
              const coverPhoto = resolveRentalListingCover(
                rootFiles || [],
                subfolder?.files || [],
                listing.coverImageFileId
              );
              return [listing.id, coverPhoto];
            } catch {
              return [listing.id, resolveRentalListingCover([], [], listing.coverImageFileId)];
            }
          })
        ).then((coverEntries) => {
          if (cancelled) return;
          setCoverPhotos(Object.fromEntries(coverEntries));
        });
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-wrapper tenant-page rental-portal">

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="rp-hero">
        <div className="rp-hero__inner">
          <span className="rp-hero__eyebrow">🏠 Vanisland Property Management</span>
          <h1 className="rp-hero__title">{labels.heroBrand}</h1>
          <p className="rp-hero__sub">{labels.heroSub}</p>
          <div className="rp-hero__actions">
            <Link to="/examples" className="rp-btn rp-btn--primary">{labels.heroBrowse}</Link>
            <Link to="/apply" className="rp-btn rp-btn--gold">{labels.heroApply}</Link>
            <Link to="/tenant-service-request" className="rp-btn rp-btn--outline">{labels.heroService}</Link>
            <Link to="/tenant-contact" className="rp-btn rp-btn--ghost">{labels.heroContact}</Link>
          </div>
        </div>
      </section>

      <div className="rp-body">

        {/* ── Three core service entries ───────────────────── */}
        <section className="rp-section" aria-labelledby="rp-core-title">
          <div className="rp-section__head">
            <h2 id="rp-core-title" className="rp-section__title">{labels.coreTitle}</h2>
            <p className="rp-section__sub">{labels.coreSub}</p>
          </div>
          <div className="rp-core-grid">
            <div className="rp-core-card">
              <span className="rp-core-card__icon">🔍</span>
              <h3 className="rp-core-card__title">{labels.findTitle}</h3>
              <ul className="rp-core-card__list">
                {labels.findDesc.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <Link to="/examples" className="rp-core-card__cta">{labels.findCta}</Link>
            </div>
            <div className="rp-core-card">
              <span className="rp-core-card__icon">📝</span>
              <h3 className="rp-core-card__title">{labels.applyTitle}</h3>
              <ul className="rp-core-card__list">
                {labels.applyDesc.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <Link to="/apply" className="rp-core-card__cta">{labels.applyCta}</Link>
            </div>
            <div className="rp-core-card">
              <span className="rp-core-card__icon">🛠️</span>
              <h3 className="rp-core-card__title">{labels.serviceTitle}</h3>
              <ul className="rp-core-card__list">
                {labels.serviceDesc.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <Link to="/tenant-service-request" className="rp-core-card__cta">{labels.serviceCta}</Link>
            </div>
          </div>
        </section>

        {/* ── Featured / Available listings ────────────────── */}
        <section className="rp-section" aria-labelledby="rp-featured-title">
          <div className="rp-section__head rp-section__head--row">
            <div>
              <h2 id="rp-featured-title" className="rp-section__title">{labels.featuredTitle}</h2>
              <p className="rp-section__sub">{labels.featuredSub}</p>
            </div>
            <div className="rp-share-kit-wrap">
              <ShareKit
                buttonLabel={labels.shareKit}
                title={labels.shareKitTitle}
                subtitle={labels.shareKitSub}
                messages={TENANT_SHARE_MESSAGES}
                linkLabel={labels.shareLink}
              />
            </div>
          </div>

          {loading && (
            <p className="tenant-loading">{labels.loading}</p>
          )}

          {error && (
            <div className="notice notice--error" style={{ margin: "16px 0" }}>
              <p>{labels.loadError} {error}</p>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="tenant-empty">
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏘</div>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>{labels.emptyTitle}</p>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                {labels.emptyDesc}
              </p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="rp-listing-grid">
              {listings.map((listing) => {
                const firstFeature = listing.features
                  ? listing.features.split(/[,\n·•]+/).map(s => s.trim()).filter(Boolean)[0]
                  : null;
                const avail = formatDate(listing.available);
                const statusMeta = getListingStatusMeta(listing);
                const coverPhoto = coverPhotos[listing.id] || null;

                return (
                  <div key={listing.id} className="rental-card">
                    {/* Cover photo — resolved with the same cover-selection logic as the detail page */}
                    <ListingCardCover coverPhoto={coverPhoto} label={labels.photoUnavailable} />
                    {/* Card header */}
                    <div className="rental-card__header">
                      <div>
                        <h2 className="rental-card__address">{listing.address}</h2>
                        <p className="rental-card__city">📍 {listing.city}, BC</p>
                      </div>
                      <span
                        className="rental-card__badge"
                        style={{
                          background: statusMeta.background,
                          color: statusMeta.color,
                          border: `1px solid ${statusMeta.border}`,
                        }}
                      >
                        {safeLang === "zh" && statusMeta.status === "Available" ? labels.statusAvailable : statusMeta.label}
                      </span>
                    </div>

                    {/* Key facts row */}
                    <div className="rental-card__facts">
                      {listing.rent && (
                        <div className="rental-card__fact">
                          <span className="rental-card__fact-label">{labels.rent}</span>
                          <span className="rental-card__fact-value">${Number(listing.rent).toLocaleString()}<small>{labels.perMonth}</small></span>
                        </div>
                      )}
                      {listing.bedrooms && (
                        <div className="rental-card__fact">
                          <span className="rental-card__fact-label">{labels.beds}</span>
                          <span className="rental-card__fact-value">{listing.bedrooms}</span>
                        </div>
                      )}
                      {listing.bathrooms && (
                        <div className="rental-card__fact">
                          <span className="rental-card__fact-label">{labels.baths}</span>
                          <span className="rental-card__fact-value">{listing.bathrooms}</span>
                        </div>
                      )}
                      {avail && (
                        <div className="rental-card__fact">
                          <span className="rental-card__fact-label">{labels.available}</span>
                          <span className="rental-card__fact-value rental-card__fact-value--date">{avail}</span>
                        </div>
                      )}
                    </div>

                    {/* Short feature highlight */}
                    {firstFeature && (
                      <p className="rental-card__feature">✓ {firstFeature}</p>
                    )}

                    {statusMeta.applicationsClosed && (
                      <p style={{ fontSize: "0.82rem", color: statusMeta.color, fontWeight: 700, marginBottom: 10 }}>
                        {labels.applicationsClosed}
                      </p>
                    )}

                    {/* CTA */}
                    <Link
                      to={`/listings/${listing.id}`}
                      className="rental-card__cta"
                    >
                      {statusMeta.applicationsClosed
                        ? labels.viewDetailsStatus
                        : labels.viewDetailsApply}
                    </Link>
                    <ShareButton
                      listing={listing}
                      label={labels.shareListing}
                      copiedLabel={labels.copied}
                      ariaLabel={labels.shareListing}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Process modules ──────────────────────────────── */}
        <section className="rp-section" aria-labelledby="rp-process-title">
          <div className="rp-section__head">
            <h2 id="rp-process-title" className="rp-section__title">{labels.processTitle}</h2>
            <p className="rp-section__sub">{labels.processSub}</p>
          </div>
          <div className="rp-process-grid">
            <RentalApplicationProcessCard />
            <TenantServiceProcessCard />
          </div>
        </section>

        {/* ── Emergency notice ─────────────────────────────── */}
        <section className="rp-emergency" role="note" aria-labelledby="rp-emergency-title">
          <div className="rp-emergency__icon" aria-hidden="true">⚠️</div>
          <div className="rp-emergency__body">
            <h2 id="rp-emergency-title" className="rp-emergency__title">{labels.emergencyTitle}</h2>
            <p className="rp-emergency__intro">{labels.emergencyIntro}</p>
            <ul className="rp-emergency__list">
              {labels.emergencyItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        {/* ── Trust / service highlights ───────────────────── */}
        <section className="rp-section" aria-labelledby="rp-trust-title">
          <div className="rp-section__head">
            <h2 id="rp-trust-title" className="rp-section__title">{labels.trustTitle}</h2>
          </div>
          <div className="rp-trust-grid">
            {labels.trustItems.map(([icon, title, desc]) => (
              <div key={title} className="rp-trust-card">
                <span className="rp-trust-card__icon" aria-hidden="true">{icon}</span>
                <h3 className="rp-trust-card__title">{title}</h3>
                <p className="rp-trust-card__desc">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick help ───────────────────────────────────── */}
        <section className="rp-section" aria-labelledby="rp-help-title">
          <div className="rp-section__head">
            <h2 id="rp-help-title" className="rp-section__title">{labels.helpTitle}</h2>
          </div>
          <div className="rp-help-list">
            {labels.helpItems.map(([q, a]) => (
              <details key={q} className="rp-help-item">
                <summary className="rp-help-item__q">{q}</summary>
                <p className="rp-help-item__a">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Tenant quick links (light strip — global Footer holds company + copyright) ── */}
        <nav className="rp-quicklinks" aria-label={labels.footerLinksTitle}>
          <span className="rp-quicklinks__title">{labels.footerLinksTitle}</span>
          <div className="rp-quicklinks__links">
            <Link to="/examples">{labels.footerRentalListings}</Link>
            <Link to="/apply">{labels.footerApply}</Link>
            <Link to="/tenant-service-request">{labels.footerService}</Link>
            <Link to="/tenant-contact">{labels.footerContact}</Link>
          </div>
        </nav>

      </div>
    </div>
  );
}
