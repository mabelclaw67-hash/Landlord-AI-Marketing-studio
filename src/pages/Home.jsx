import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { t } from "../translations";
import ShareKit from "../components/ShareKit";
import { PUBLIC_SITE_BASE_URL } from "../utils/publicUrls";
import { getDailyMarketBrief } from "../utils/dailyMarketBrief";

const RENTAL_OUTPUTS = [
  {
    icon: "📝",
    title: "Rental Ad Package",
    desc: "Bilingual rental copy prepared for direct posting and review.",
  },
  {
    icon: "🖼️",
    title: "Photo Listing Page",
    desc: "A shareable rental photo page with listing details.",
  },
  {
    icon: "📋",
    title: "Online Rental Application",
    desc: "Tenants submit applications via a dedicated link — no printing or email back-and-forth.",
  },
  {
    icon: "📄",
    title: "Application PDF Archive",
    desc: "Each application auto-generates a PDF saved to the listing's Drive folder for clean record-keeping.",
  },
  {
    icon: "🔍",
    title: "AI Application Screening",
    desc: "Summarizes and organizes application data, flags missing fields. No auto-approval or auto-rejection — final review is always manual.",
  },
  {
    icon: "✅",
    title: "Human Review Workflow",
    desc: "All applications are reviewed manually by the landlord in the admin dashboard — full control stays with the owner.",
  },
  {
    icon: "📱",
    title: "Rental Share Kit & QR Code",
    desc: "Package rental sharing text, links, and QR access.",
  },
  {
    icon: "🎬",
    title: "Rental Short Video",
    desc: "Prepare short-form rental video materials and scripts.",
  },
];

const HOME_SALE_OUTPUTS = [
  {
    icon: "🏡",
    title: "Sale Listing Page",
    desc: "A public home sale page for listing details and media.",
  },
  {
    icon: "✍️",
    title: "Bilingual Sale Marketing Copy",
    desc: "Bilingual sale marketing copy for major sharing channels.",
  },
  {
    icon: "🖼️",
    title: "Photo Gallery & Cover Image",
    desc: "Organize gallery assets and choose a sale cover image.",
  },
  {
    icon: "📱",
    title: "Sale Share Kit & QR Code",
    desc: "Share-ready sale copy blocks, QR code, and public links.",
  },
  {
    icon: "💬",
    title: "Buyer Inquiry Link",
    desc: "A buyer inquiry path connected from the public sale page.",
  },
  {
    icon: "🏷️",
    title: "Open House Support",
    desc: "Support open house details and related share materials.",
  },
  {
    icon: "🎥",
    title: "Sale Short Video",
    desc: "Prepare short home sale videos and related media assets.",
  },
];

const RENTAL_PRIMARY_OUTPUTS = RENTAL_OUTPUTS.slice(0, 4);
const RENTAL_SECONDARY_OUTPUTS = RENTAL_OUTPUTS.slice(4);   // AI Screening, Human Review, Share Kit, Short Video
const HOME_SALE_PRIMARY_OUTPUTS = HOME_SALE_OUTPUTS.slice(0, 4);
const HOME_SALE_SECONDARY_OUTPUTS = HOME_SALE_OUTPUTS.slice(4);

const PLATFORM_REASONS = [
  {
    icon: "✨",
    title: "AI-Powered Marketing",
    desc: "Generate high-quality copy, pages, and materials in minutes.",
  },
  {
    icon: "🌐",
    title: "Bilingual Ready",
    desc: "All content and pages are ready for Chinese and English.",
  },
  {
    icon: "🔗",
    title: "Share Anywhere",
    desc: "QR codes, share links, and mobile-friendly pages.",
  },
  {
    icon: "👥",
    title: "Built for Real Estate",
    desc: "Designed for landlords, sellers, FSBO owners, and realtors.",
  },
];

const PLATFORM_TRUST_POINTS = [
  {
    icon: "🛡️",
    title: "Secure & Private",
    desc: "Your data is encrypted and protected.",
  },
  {
    icon: "☁️",
    title: "Cloud-Based",
    desc: "Access anywhere, anytime.",
  },
  {
    icon: "⏱️",
    title: "Save Time",
    desc: "Automate repetitive marketing tasks.",
  },
  {
    icon: "🎧",
    title: "Support",
    desc: "We're here to help you succeed.",
  },
];

const LANDLORD_SHARE_MESSAGES = [
  {
    id: "wechat-landlord",
    label: "WeChat Landlord Promotion",
    rows: 8,
    text:
      "Hello landlords and property owners,\n\nVanisland AI Rental Listing Marketing Studio helps prepare bilingual rental ads, photo listing pages, online application links, QR-code application access, media display, and organized application materials.\n\nIdeal for busy Vancouver Island landlords, property owners, and property managers. Tenants can view listings and apply online from any device — no printing or emailing documents back and forth.",
  },
  {
    id: "facebook-landlord",
    label: "Facebook / Community Promotion",
    rows: 6,
    text:
      "A practical rental marketing tool for Vancouver Island landlords, property owners, and property managers. It helps package bilingual listing copy, a shareable photo page, QR-code access, and online applications in one lightweight workflow.",
  },
  {
    id: "owner-invite",
    label: "Owner Invitation",
    rows: 6,
    text:
      "Hello, I wanted to share a rental marketing service that can help you prepare a cleaner and faster listing package, including bilingual ad copy, a public photo listing page, and an online application path.\n\nIf you have a rental listing coming up, it is worth checking out.",
  },
  {
    id: "general-website",
    label: "Website Share Message",
    rows: 5,
    text:
      "This website helps landlords and property owners prepare rental listing promotion materials, public photo pages, and tenant application links in a simple, mobile-friendly format.",
  },
];

const DAILY_BRIEF_FIELDS = [
  { key: "policySummary", label: "Policy Summary" },
  { key: "bcRentalSummary", label: "BC Rental Summary" },
  { key: "bcSaleSummary", label: "BC Sale Summary" },
  { key: "nanaimoRentalSummary", label: "Nanaimo Rental Summary" },
  { key: "nanaimoSaleSummary", label: "Nanaimo Sale Summary" },
  { key: "landlordActionNotes", label: "Landlord Action Notes" },
  { key: "websiteSummary", label: "Website Summary" },
];

const DAILY_BRIEF_CARD_META = {
  policySummary: { icon: "📄", className: "" },
  bcRentalSummary: { icon: "🏢", className: "" },
  bcSaleSummary: { icon: "🏠", className: "" },
  nanaimoRentalSummary: { icon: "📍", className: "" },
  nanaimoSaleSummary: { icon: "🏡", className: "" },
  landlordActionNotes: { icon: "💡", className: "lh-daily-brief__card--wide" },
  websiteSummary: { icon: "🧭", className: "lh-daily-brief__card--wide lh-daily-brief__card--muted" },
};

function getVancouverTodayText() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

export default function Home({ lang }) {
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [briefError, setBriefError] = useState("");
  const [wechatCopied, setWechatCopied] = useState(false);
  const homepageBriefDate = getVancouverTodayText();

  useEffect(() => {
    let active = true;

    async function loadBrief() {
      setBriefLoading(true);
      setBriefError("");
      try {
        const data = await getDailyMarketBrief();
        if (!active) return;
        setBrief(data || null);
      } catch (err) {
        if (!active) return;
        setBrief(null);
        setBriefError(err?.message || "Failed to load daily market brief.");
      } finally {
        if (active) setBriefLoading(false);
      }
    }

    loadBrief();
    return () => {
      active = false;
    };
  }, []);

  async function handleCopyWechat() {
    if (!brief?.wechatShareText) return;
    try {
      await navigator.clipboard.writeText(brief.wechatShareText);
      setWechatCopied(true);
      window.setTimeout(() => setWechatCopied(false), 1800);
    } catch {
      setWechatCopied(false);
    }
  }

  return (
    <>
      <section className="lh-home-topbar">
        <div className="lh-home-topbar__inner">
          <div className="lh-home-topbar__spacer" />
          <div className="lh-home-topbar__lang">🌐 EN</div>
        </div>
      </section>

      {/* Hero */}
      <section className="lh-hero">
        <div className="lh-hero__inner">
          <div className="lh-hero__content">
            <div className="lh-eyebrow">📚 PLATFORM</div>
            <h1 className="lh-hero__title">Vanisland Property</h1>
            <p className="lh-hero__desc">Create marketing packages for rental and home sale listings.</p>
            <p className="lh-hero__desc-ch">
              One platform for rental and home sale marketing across public pages, applications, and sharing.
            </p>
            <div className="lh-hero__actions">
              <Link to="/contact" className="lh-btn lh-btn--sand">
                Request Access
              </Link>
              <Link to="/trial-access" className="lh-btn lh-btn--white">
                Trial Access
              </Link>
              <a href="#studio-modules" className="lh-btn lh-btn--white">Learn More</a>
            </div>
          </div>

          <div className="lh-hero__showcase">
            <div className="lh-hero__card lh-hero__card--reasons">
              <div className="lh-rtb-card">
                <div className="lh-rtb-card__header">
                  <h3>Why Vanisland AI Studio?</h3>
                </div>

                <div className="lh-benefit-list">
                  {PLATFORM_REASONS.map((item) => (
                    <div key={item.title} className="lh-benefit-item">
                      <div className="lh-benefit-item__icon">{item.icon}</div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lh-hero-visual" aria-hidden="true">
              <div className="lh-hero-visual__glow" />
              <div className="lh-hero-visual__house" />
            </div>
          </div>
        </div>
      </section>

      <section className="lh-daily-brief-section" aria-labelledby="daily-market-brief-title">
        <div className="lh-daily-brief">
          <div className="lh-daily-brief__top">
            <div>
              <div className="lh-daily-brief__eyebrow">DAILY MARKET BRIEF</div>
              <h2 id="daily-market-brief-title">Daily BC Rent &amp; Sale Market Brief / 每日BC租赁与房屋买卖市场晨报</h2>
            </div>
            <div className="lh-daily-brief__date">
              <span>Date</span>
              <strong>{homepageBriefDate}</strong>
            </div>
          </div>

          {briefLoading ? (
            <div className="lh-daily-brief__status">Loading latest published brief...</div>
          ) : briefError ? (
            <div className="lh-daily-brief__status lh-daily-brief__status--error">{briefError}</div>
          ) : brief ? (
            <>
              <div className="lh-daily-brief__title-card">
                <div className="lh-daily-brief__label">Title</div>
                <h3>{brief.title || "Untitled Brief"}</h3>
              </div>

              <div className="lh-daily-brief__grid">
                {DAILY_BRIEF_FIELDS.map((field) => {
                  const meta = DAILY_BRIEF_CARD_META[field.key] || { icon: "•", className: "" };
                  return (
                  <article key={field.key} className={`lh-daily-brief__card ${meta.className}`.trim()}>
                    <div className="lh-daily-brief__card-head">
                      <div className="lh-daily-brief__card-icon" aria-hidden="true">{meta.icon}</div>
                      <div className="lh-daily-brief__label">{field.label}</div>
                    </div>
                    <p>{brief[field.key] || "—"}</p>
                    {field.key !== "landlordActionNotes" && field.key !== "websiteSummary" ? (
                      <div className="lh-daily-brief__detail-link">View details →</div>
                    ) : null}
                  </article>
                  );
                })}
              </div>

              <div className="lh-daily-brief__actions">
                {brief.fullReportUrl ? (
                  <a
                    href={brief.fullReportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="lh-btn lh-btn--sand"
                  >
                    View Full Report
                  </a>
                ) : (
                  <button type="button" className="lh-btn lh-btn--sand lh-btn--disabled" disabled>
                    View Full Report
                  </button>
                )}

                <button type="button" className="lh-btn lh-btn--white" onClick={handleCopyWechat}>
                  {wechatCopied ? "Copied WeChat Version" : "Copy WeChat Version"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="lh-platform-hub" id="studio-modules">
        <div className="lh-platform-hub__inner">
          <div className="lh-section-title">
            <div className="lh-section-kicker">SECTION 2</div>
            <h2>Choose Your Studio</h2>
            <p>Select the studio that fits your needs. You can switch anytime.</p>
          </div>

          <div className="lh-platform-grid">
            <article className="lh-platform-card">
              <div className="lh-platform-card__icon">🏢</div>
              <div className="lh-platform-card__eyebrow">For landlords and property managers</div>
              <h3>Rental Studio</h3>
              <p>
                Create bilingual rental ads, listing pages, QR codes, online rental application links,
                and social sharing packages.
              </p>
              <Link to="/examples" className="lh-btn lh-btn--sand">
                Rental Studio
              </Link>
            </article>

            <article className="lh-platform-card lh-platform-card--soft">
              <div className="lh-platform-card__icon lh-platform-card__icon--sale">🏠</div>
              <div className="lh-platform-card__eyebrow">For home sellers, FSBO owners, and realtors</div>
              <h3>Home Sale Studio</h3>
              <p>
                Create home sale listing pages, bilingual marketing copy, photo/video promotion materials,
                QR codes, and buyer inquiry links.
              </p>
              <Link to="/home-sale-studio" className="lh-btn lh-btn--white">
                Home Sale Studio
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="lh-platform-strip">
        <div className="lh-platform-strip__inner">
          {PLATFORM_TRUST_POINTS.map((item) => (
            <article key={item.title} className="lh-platform-strip__item">
              <div className="lh-platform-strip__icon">{item.icon}</div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lh-section lh-section--tight">
        <div className="lh-share-kit-wrap">
          <ShareKit
            buttonLabel="Admin Share Kit"
            title="Landlord Promotion Share Kit"
            subtitle="For landlords, property owners, and client referrals only."
            messages={LANDLORD_SHARE_MESSAGES}
            linkLabel="Copy Website Link"
          />
        </div>
      </section>

      {/* What We Generate */}
      <section className="lh-section">
        <div className="lh-section-title">
          <h2>What We Generate</h2>
          <p>One workflow for rental and home sale marketing materials</p>
        </div>

        <div className="lh-output-group">
          <div className="lh-output-group__head">
            <h3>Rental Listing Outputs</h3>
            <p>Marketing materials for landlords, property owners, and property managers.</p>
          </div>
          <div className="lh-feature-grid lh-feature-grid--primary">
            {RENTAL_PRIMARY_OUTPUTS.map(({ icon, title, desc }) => (
              <article key={title} className="lh-feature-card">
                <div className="lh-feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
          {RENTAL_SECONDARY_OUTPUTS.length > 0 && (
            <div className="lh-output-group__secondary">
              <div className="lh-output-group__secondary-label">Secondary outputs</div>
              <div className="lh-feature-grid lh-feature-grid--secondary">
                {RENTAL_SECONDARY_OUTPUTS.map(({ icon, title, desc }) => (
                  <article key={title} className="lh-feature-card lh-feature-card--secondary">
                    <div className="lh-feature-icon">{icon}</div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lh-output-group">
          <div className="lh-output-group__head">
            <h3>Home Sale Outputs</h3>
            <p>Sale marketing materials for home sellers, FSBO owners, and realtors.</p>
          </div>
          <div className="lh-feature-grid lh-feature-grid--primary">
            {HOME_SALE_PRIMARY_OUTPUTS.map(({ icon, title, desc }) => (
              <article key={title} className="lh-feature-card">
                <div className="lh-feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
          {HOME_SALE_SECONDARY_OUTPUTS.length > 0 && (
            <div className="lh-output-group__secondary">
              <div className="lh-output-group__secondary-label">Secondary outputs</div>
              <div className="lh-feature-grid lh-feature-grid--secondary">
                {HOME_SALE_SECONDARY_OUTPUTS.map(({ icon, title, desc }) => (
                  <article key={title} className="lh-feature-card lh-feature-card--secondary">
                    <div className="lh-feature-icon">{icon}</div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Platform QR Promotion */}
      <section className="lh-section lh-qr-section" id="qr-access">
        <div className="lh-qr-inner">
          <div className="lh-qr-text">
            <div className="lh-eyebrow" style={{ marginBottom: 10 }}>
              Scan to Access the Platform
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, lineHeight: 1.3, marginBottom: 10 }}>
              Vanisland Property
            </h2>
            <p style={{ lineHeight: 1.8, color: "var(--color-text)", marginBottom: 20 }}>
              Built for Vancouver Island landlords, home sellers, FSBO owners, property managers, and realtors.
              Scan the QR code to open our website on any device — easy to share with clients and partners.
            </p>
            <ul className="lh-qr-features">
              <li>📋 Rental Studio — bilingual ads, listing pages, photo management</li>
              <li>🔍 Online rental application intake + AI initial screening</li>
              <li>📄 Auto PDF archive — every application saved to Drive</li>
              <li>🏡 Home Sale Studio — sale pages, marketing copy, cover images</li>
              <li>🎬 Short video generator — auto-create MP4 with music and smooth photo motion</li>
              <li>📱 QR share kits — one-click copy for WeChat, Facebook, and social posts</li>
              <li>🌐 Bilingual (English + Chinese) across all outputs</li>
            </ul>
          </div>

          <div className="lh-qr-code-wrap">
            <div className="lh-qr-card">
              <div className="lh-qr-badge">Scan to Try</div>
              <div className="lh-qr-code-box">
                <QRCodeSVG
                  value={PUBLIC_SITE_BASE_URL}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1a3a2e"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="lh-qr-url">Vanisland Property</p>
              <p className="lh-qr-caption">
                Scan to open our website
              </p>
              <a
                href={PUBLIC_SITE_BASE_URL}
                target="_blank"
                rel="noreferrer"
                className="lh-btn lh-btn--sand"
                style={{ marginTop: 14, display: "block", textAlign: "center", fontSize: "0.85rem" }}
              >
                Open Website →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="lh-cta-band">
        <div className="lh-cta-inner">
          <div>
            <h2>Ready to market your rental or sale listing?</h2>
            <p>
              Request access for Rental Studio, Home Sale Studio, or both modules.
            </p>
          </div>
          <Link to="/contact" className="lh-btn lh-btn--sand">
            Request Access
          </Link>
        </div>
      </section>
    </>
  );
}
