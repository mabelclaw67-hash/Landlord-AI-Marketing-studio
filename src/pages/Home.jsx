import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { t } from "../translations";
import ShareKit from "../components/ShareKit";

const PRODUCTION_URL = "https://landlord-ai-marketing-studio.netlify.app/";

const RENTAL_OUTPUTS = [
  {
    icon: "📝",
    title: "Rental Ad Package",
    ch: "出租广告文案包",
    desc: "中英双语出租广告文案，适合 Facebook、Craigslist、微信等渠道直接整理发布。 / Bilingual rental copy prepared for direct posting and review.",
  },
  {
    icon: "🖼️",
    title: "Photo Listing Page",
    ch: "房源照片展示页",
    desc: "可分享的出租房源照片展示页，方便租客在线查看房屋图片与房源资料。 / A shareable rental photo page with listing details.",
  },
  {
    icon: "📋",
    title: "Online Rental Application",
    ch: "在线租客申请",
    desc: "租客可通过专属链接在线提交租房申请，申请资料自动保存，无需打印或邮件往返。 / Tenants submit applications via a dedicated link — no printing or email back-and-forth.",
  },
  {
    icon: "📄",
    title: "Application PDF Archive",
    ch: "申请表 PDF 自动归档",
    desc: "每份申请自动生成 PDF 并存入对应房源的 Drive 文件夹，资料整洁有序便于回查。 / Each application auto-generates a PDF saved to the listing's Drive folder for clean record-keeping.",
  },
  {
    icon: "🔍",
    title: "AI Application Screening",
    ch: "AI 租客申请初筛",
    desc: "系统自动整理申请内容摘要、标注缺失信息，协助房东快速了解每份申请的基本情况。不自动批准或拒绝申请，最终筛选由房东人工决定。 / Summarizes and organizes application data, flags missing fields. No auto-approval or auto-rejection — final review is always manual.",
  },
  {
    icon: "✅",
    title: "Human Review Workflow",
    ch: "人工精选审核",
    desc: "所有申请经初步整理后，由房东在管理后台逐份审核，保持对租客选择的完整掌控。 / All applications are reviewed manually by the landlord in the admin dashboard — full control stays with the owner.",
  },
  {
    icon: "📱",
    title: "Rental Share Kit & QR Code",
    ch: "出租分享素材与二维码",
    desc: "整理出租分享文案、公开页链接和二维码，方便微信群、朋友圈和转介绍。 / Package rental sharing text, links, and QR access.",
  },
  {
    icon: "🎬",
    title: "Rental Short Video",
    ch: "出租短视频",
    desc: "支持出租房源短视频素材与脚本，便于社交平台快速推广。 / Prepare short-form rental video materials and scripts.",
  },
];

const HOME_SALE_OUTPUTS = [
  {
    icon: "🏡",
    title: "Sale Listing Page",
    ch: "出售房源展示页",
    desc: "公开出售房源页面，集中展示房屋资料、照片、视频与公开链接。 / A public home sale page for listing details and media.",
  },
  {
    icon: "✍️",
    title: "Bilingual Sale Marketing Copy",
    ch: "中英售房营销文案",
    desc: "自动整理 Website、微信、小红书、Facebook 等中英文售房文案。 / Bilingual sale marketing copy for major sharing channels.",
  },
  {
    icon: "🖼️",
    title: "Photo Gallery & Cover Image",
    ch: "照片图库与封面图",
    desc: "支持原始照片整理、封面图选择与公开图库展示。 / Organize gallery assets and choose a sale cover image.",
  },
  {
    icon: "📱",
    title: "Sale Share Kit & QR Code",
    ch: "售房分享素材与二维码",
    desc: "集中整理售房分享文案、二维码和公开页面链接，方便即时复制。 / Share-ready sale copy blocks, QR code, and public links.",
  },
  {
    icon: "💬",
    title: "Buyer Inquiry Link",
    ch: "买家咨询入口",
    desc: "公开页可提供买家咨询入口，方便潜在买家进一步联系。 / A buyer inquiry path connected from the public sale page.",
  },
  {
    icon: "🏷️",
    title: "Open House Support",
    ch: "开放日支持",
    desc: "可整理开放日信息与公开分享素材，辅助线下看房推广。 / Support open house details and related share materials.",
  },
  {
    icon: "🎥",
    title: "Sale Short Video",
    ch: "售房短视频",
    desc: "支持售房短视频、脚本、音乐与展示素材的一站式整理。 / Prepare short home sale videos and related media assets.",
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
    ch: "为什么选择我们？",
    desc: "Built for rental listing marketing and home sale marketing in one platform.",
  },
  {
    icon: "✨",
    title: "AI-Powered Marketing",
    ch: "AI 驱动内容生成",
    desc: "Generate high-quality copy, pages, and materials in minutes.",
  },
  {
    icon: "🌐",
    title: "Bilingual Ready",
    ch: "中英双语支持",
    desc: "All content and pages are ready for Chinese and English.",
  },
  {
    icon: "🔗",
    title: "Share Anywhere",
    ch: "一键分享",
    desc: "QR codes, share links, and mobile-friendly pages.",
  },
  {
    icon: "👥",
    title: "Built for Real Estate",
    ch: "专为房地产打造",
    desc: "Designed for landlords, sellers, FSBO owners, and realtors.",
  },
];

const PLATFORM_TRUST_POINTS = [
  {
    icon: "🛡️",
    title: "Secure & Private",
    ch: "安全私密",
    desc: "Your data is encrypted and protected.",
  },
  {
    icon: "☁️",
    title: "Cloud-Based",
    ch: "云端平台",
    desc: "Access anywhere, anytime.",
  },
  {
    icon: "⏱️",
    title: "Save Time",
    ch: "节省时间",
    desc: "Automate repetitive marketing tasks.",
  },
  {
    icon: "🎧",
    title: "Support",
    ch: "专业支持",
    desc: "We're here to help you succeed.",
  },
];

const LANDLORD_SHARE_MESSAGES = [
  {
    id: "wechat-landlord",
    label: "微信房东推广 / WeChat Landlord Promotion",
    rows: 14,
    text:
      "各位房东朋友好，\n\n如果您需要推广出租房源，我们公司现在已经推出了自己的 AI Rental Listing Marketing Studio / 房东 AI 租赁推广网。\n\n这个系统可以帮助房东自动生成：\n• 中英双语出租广告\n• 房源照片展示网页\n• 在线 Rental Application 申请链接\n• 手机扫码申请入口\n• 房源照片与视频展示\n• 自动整理申请资料\n\n特别适合温哥华岛本地忙碌的房东、业主和物业管理使用。\n\n租客可以直接用手机查看房源、扫码申请，不需要反复打印表格或邮件来回发送文件。\n\n欢迎大家体验我们的房东 AI 租赁推广网。\n\nHello landlords and property owners,\n\nAI Rental Listing Marketing Studio / 房东 AI 租赁推广网 helps prepare bilingual rental ads, photo listing pages, online application links, QR-code application access, media display, and organized application materials.",
  },
  {
    id: "facebook-landlord",
    label: "小红书 / Facebook 华人社区推广",
    rows: 10,
    text:
      "推荐给温哥华岛本地房东朋友：AI Rental Listing Marketing Studio / 房东 AI 租赁推广网 现在可以帮助推广出租房源。\n\n系统可快速整理中英双语出租广告、房源照片展示页、在线申请链接、手机扫码申请入口，以及房源照片与视频展示内容。\n\n特别适合忙碌的房东、业主和物业管理，把房源分享、租客查看和申请流程一次整理好。\n\nEnglish:\nA practical rental marketing tool for Vancouver Island landlords, property owners, and property managers. It helps package bilingual listing copy, a shareable photo page, QR-code access, and online applications in one lightweight workflow.",
  },
  {
    id: "owner-invite",
    label: "房东邀请文案 / Owner Invitation",
    rows: 8,
    text:
      "您好，想跟您分享一个适合出租房源推广的新工具：AI Rental Listing Marketing Studio / 房东 AI 租赁推广网。\n\n它可以帮您更快整理中英文广告文案、房源照片展示网页、在线申请链接，以及手机扫码申请入口，让租客直接在线查看和申请。\n\n如果您最近有房源要出租，很适合先看一下这个系统。\n\nHello, I wanted to share a rental marketing service that can help you prepare a cleaner and faster listing package, including bilingual ad copy, a public photo listing page, and an online application path.",
  },
  {
    id: "general-website",
    label: "网站分享文案 / Website Share Message",
    rows: 8,
    text:
      "欢迎体验 AI Rental Listing Marketing Studio / 房东 AI 租赁推广网。\n\n这个网站可以帮助房东和业主快速准备房源推广素材、公开房源照片页面、在线申请链接和手机扫码申请入口，整体流程简单、轻量，也更适合手机查看。\n\nEnglish:\nThis website helps landlords and property owners prepare rental listing promotion materials, public photo pages, and tenant application links in a simple, mobile-friendly format.",
  },
];

export default function Home({ lang }) {
  return (
    <>
      <section className="lh-home-topbar">
        <div className="lh-home-topbar__inner">
          <div className="lh-home-topbar__spacer" />
          <div className="lh-home-topbar__lang">🌐 EN / 中文</div>
        </div>
      </section>

      {/* Hero */}
      <section className="lh-hero">
        <div className="lh-hero__inner">
          <div className="lh-hero__content">
            <div className="lh-eyebrow">📚 PLATFORM / 平台</div>
            <h1 className="lh-hero__title">{t(lang, "home.heroTitle")}</h1>
            <p className="lh-hero__desc">{t(lang, "home.heroSubtitle")}</p>
            <p className="lh-hero__desc-ch">{t(lang, "home.heroChSubtitle")}</p>
            <p className="lh-hero__desc-ch">
              一个平台，满足租赁房源与房屋出售的营销需求，服务房东、物业管理者、屋主、FSBO 业主和房地产经纪人。
            </p>
            <div className="lh-hero__actions">
              <Link to="/contact" className="lh-btn lh-btn--sand">
                {t(lang, "home.ctaStart")}
              </Link>
              <Link to="/trial-access" className="lh-btn lh-btn--white">
                Trial Access / 已批准用户入口
              </Link>
              <a href="#studio-modules" className="lh-btn lh-btn--white">Learn More / 了解更多</a>
            </div>
          </div>

          <div className="lh-hero__showcase">
            <div className="lh-hero__card lh-hero__card--reasons">
              <div className="lh-rtb-card">
                <div className="lh-rtb-card__header">
                  <h3>Why Vanisland AI Studio?</h3>
                  <p>为什么选择我们？</p>
                </div>

                <div className="lh-benefit-list">
                  {PLATFORM_REASONS.map((item) => (
                    <div key={item.title} className="lh-benefit-item">
                      <div className="lh-benefit-item__icon">{item.icon}</div>
                      <div>
                        <strong>{item.title} / {item.ch}</strong>
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
            <div className="lh-section-kicker">SECTION 2 / 第二部分</div>
            <h2>选择您的营销模块 / Choose Your Studio</h2>
            <p>Select the studio that fits your needs. You can switch anytime.</p>
          </div>

          <div className="lh-platform-grid">
            <article className="lh-platform-card">
              <div className="lh-platform-card__icon">🏢</div>
              <div className="lh-platform-card__eyebrow">房东与物业管理使用 / For landlords and property managers</div>
              <h3>Rental Listing Marketing Studio</h3>
              <small>租赁房源 AI 营销工作台</small>
              <p>
                生成中英双语出租广告、房源展示页、二维码、在线租房申请链接与社交分享素材。
                <br />Create bilingual rental ads, listing pages, QR codes, online rental application links,
                and social sharing packages.
              </p>
              <Link to="/examples" className="lh-btn lh-btn--sand">
                进入 Rental Studio / Enter Rental Studio
              </Link>
            </article>

            <article className="lh-platform-card lh-platform-card--soft">
              <div className="lh-platform-card__icon lh-platform-card__icon--sale">🏠</div>
              <div className="lh-platform-card__eyebrow">屋主、FSBO 与地产经纪使用 / For home sellers, FSBO owners, and realtors</div>
              <h3>AI Home Sale Marketing Studio</h3>
              <small>房屋出售 AI 营销工作台</small>
              <p>
                生成卖房展示页、双语营销文案、照片与视频推广素材、二维码与买家咨询入口。
                <br />Create home sale listing pages, bilingual marketing copy, photo/video promotion materials,
                QR codes, and buyer inquiry links.
              </p>
              <Link to="/home-sale-studio" className="lh-btn lh-btn--white">
                进入 Home Sale Studio / Enter Home Sale Studio
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
                <strong>{item.title} / {item.ch}</strong>
                <p>{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lh-section lh-section--tight">
        <div className="lh-share-kit-wrap">
          <ShareKit
            buttonLabel="推广素材 / Admin Share Kit"
            title="房东推广素材 / Landlord Promotion Share Kit"
            subtitle="供房东、业主和客户转介绍使用。 / For landlords, property owners, and client referrals only."
            messages={LANDLORD_SHARE_MESSAGES}
            linkLabel="复制网站链接 / Copy Website Link"
          />
        </div>
      </section>

      {/* What We Generate */}
      <section className="lh-section">
        <div className="lh-section-title">
          <h2>我们能生成什么 / What We Generate</h2>
          <p>出租与出售房源推广素材一站式整理 / One workflow for rental and home sale marketing materials</p>
        </div>

        <div className="lh-output-group">
          <div className="lh-output-group__head">
            <h3>出租房源生成内容 / Rental Listing Outputs</h3>
            <p>适合房东、业主和物业管理的出租推广素材。</p>
          </div>
          <div className="lh-feature-grid lh-feature-grid--primary">
            {RENTAL_PRIMARY_OUTPUTS.map(({ icon, title, ch, desc }) => (
              <article key={title} className="lh-feature-card">
                <div className="lh-feature-icon">{icon}</div>
                <h3>{title}</h3>
                <small>{ch}</small>
                <p>{desc}</p>
              </article>
            ))}
          </div>
          {RENTAL_SECONDARY_OUTPUTS.length > 0 && (
            <div className="lh-output-group__secondary">
              <div className="lh-output-group__secondary-label">辅助内容 / Secondary outputs</div>
              <div className="lh-feature-grid lh-feature-grid--secondary">
                {RENTAL_SECONDARY_OUTPUTS.map(({ icon, title, ch, desc }) => (
                  <article key={title} className="lh-feature-card lh-feature-card--secondary">
                    <div className="lh-feature-icon">{icon}</div>
                    <h3>{title}</h3>
                    <small>{ch}</small>
                    <p>{desc}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lh-output-group">
          <div className="lh-output-group__head">
            <h3>出售房源生成内容 / Home Sale Outputs</h3>
            <p>面向屋主、FSBO 和地产经纪的售房推广资料整理。</p>
          </div>
          <div className="lh-feature-grid lh-feature-grid--primary">
            {HOME_SALE_PRIMARY_OUTPUTS.map(({ icon, title, ch, desc }) => (
              <article key={title} className="lh-feature-card">
                <div className="lh-feature-icon">{icon}</div>
                <h3>{title}</h3>
                <small>{ch}</small>
                <p>{desc}</p>
              </article>
            ))}
          </div>
          {HOME_SALE_SECONDARY_OUTPUTS.length > 0 && (
            <div className="lh-output-group__secondary">
              <div className="lh-output-group__secondary-label">辅助内容 / Secondary outputs</div>
              <div className="lh-feature-grid lh-feature-grid--secondary">
                {HOME_SALE_SECONDARY_OUTPUTS.map(({ icon, title, ch, desc }) => (
                  <article key={title} className="lh-feature-card lh-feature-card--secondary">
                    <div className="lh-feature-icon">{icon}</div>
                    <h3>{title}</h3>
                    <small>{ch}</small>
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
              扫码即刻访问 / Scan to Access the Platform
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, lineHeight: 1.3, marginBottom: 10 }}>
              Vanisland AI Marketing Studio
            </h2>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-primary)", marginBottom: 16 }}>
              房源 AI 营销工作台
            </p>
            <p style={{ lineHeight: 1.8, color: "var(--color-text)", marginBottom: 14 }}>
              专为温哥华岛本地房东、屋主、FSBO 卖家、物业管理和地产经纪设计的一站式房源 AI 营销平台。
              扫描二维码即可在手机上直接访问，方便随时分享给客户和合作伙伴。
            </p>
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
              <li>🌐 Bilingual (English + 中文) across all outputs</li>
            </ul>
            <ul className="lh-qr-features lh-qr-features--ch">
              <li>📋 出租工作台 — 双语广告、房源展示页、照片管理</li>
              <li>🔍 在线租房申请 + AI 初步筛查，整理摘要与缺失信息</li>
              <li>📄 申请 PDF 自动归档，保存至对应房源 Drive 文件夹</li>
              <li>🏡 出售工作台 — 售房展示页、营销文案、封面图</li>
              <li>🎬 短视频自动生成 —— 自动生成带音乐和照片动态效果的 MP4</li>
              <li>📱 二维码分享素材包 — 一键复制微信、Facebook 推广文案</li>
              <li>🌐 全平台中英双语输出</li>
            </ul>
          </div>

          <div className="lh-qr-code-wrap">
            <div className="lh-qr-card">
              <div className="lh-qr-badge">扫码体验 / Scan to Try</div>
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
                Scan to open the platform<br />
                房东、屋主、经纪适用
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
            <h2>准备推广您的出租或出售房源吗？ / Ready to market your rental or sale listing?</h2>
            <p>
              可申请 Rental Studio、Home Sale Studio，或两个模块一起使用。
              {" "}Request access for Rental Studio, Home Sale Studio, or both modules.
            </p>
          </div>
          <Link to="/contact" className="lh-btn lh-btn--sand">
            {t(lang, "home.ctaStart")}
          </Link>
        </div>
      </section>
    </>
  );
}
