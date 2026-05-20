import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { t } from "../translations";
import ShareKit from "../components/ShareKit";

const PRODUCTION_URL = "https://vanislandproperty.ca/";

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
    icon: "🛡️",
    title: "Why Vanisland AI Studio?",
    desc: "Built for rental listing marketing and home sale marketing in one platform.",
  },
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

export default function Home({ lang }) {
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
            <h1 className="lh-hero__title">Vanisland AI Marketing Studio</h1>
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
              Vanisland AI Marketing Studio
            </h2>
            <p style={{ lineHeight: 1.8, color: "var(--color-text)", marginBottom: 20 }}>
              Built for Vancouver Island landlords, home sellers, FSBO owners, property managers, and realtors.
              Scan the QR code to open the platform on any device — easy to share with clients and partners.
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
                  value={PRODUCTION_URL}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1a3a2e"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="lh-qr-url">Vanisland AI Marketing Studio</p>
              <p className="lh-qr-caption">
                Scan to open the platform
              </p>
              <a
                href={PRODUCTION_URL}
                target="_blank"
                rel="noreferrer"
                className="lh-btn lh-btn--sand"
                style={{ marginTop: 14, display: "block", textAlign: "center", fontSize: "0.85rem" }}
              >
                Open Platform →
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
