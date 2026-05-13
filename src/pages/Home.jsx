import { Link } from "react-router-dom";
import { t } from "../translations";
import ShareKit from "../components/ShareKit";

const FEATURES = [
  {
    icon: "📝",
    title: "Rental Ad Package",
    ch: "中英文广告文案包",
    desc: "中英双语 Facebook、Craigslist、微信推广文案，可直接审阅后发布。 / Bilingual Facebook, Craigslist, and WeChat copy ready to review and post.",
  },
  {
    icon: "🖼️",
    title: "Photo Listing Page",
    ch: "在线图片房源页面",
    desc: "可分享的房源照片网页，包含房屋信息与在线申请链接。 / A shareable listing page with photos, property details, and an application link.",
  },
  {
    icon: "📋",
    title: "Online Application",
    ch: "在线申请表链接",
    desc: "连接在线 Rental Application 申请入口与手机扫码申请，无需进入后台。 / Connect tenants to the existing rental application flow without entering Admin Studio.",
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
      {/* Hero */}
      <section className="lh-hero">
        <div className="lh-hero__inner">
          <div>
            <div className="lh-eyebrow">🇨🇦 温哥华岛 · BC 房东服务 / Vancouver Island · BC Landlords</div>
            <h1 className="lh-hero__title">{t(lang, "home.heroTitle")}</h1>
            <p className="lh-hero__desc">{t(lang, "home.heroSubtitle")}</p>
            <p className="lh-hero__desc-ch">{t(lang, "home.heroChSubtitle")}</p>
            <div className="lh-hero__actions">
              <Link to="/contact" className="lh-btn lh-btn--sand">
                {t(lang, "home.ctaStart")}
              </Link>
              <Link to="/examples" className="lh-btn lh-btn--white">
                查看当前房源 / View Current Listing
              </Link>
            </div>
            <div className="lh-share-kit-wrap">
              <ShareKit
                buttonLabel="推广素材 / Admin Share Kit"
                title="房东推广素材 / Landlord Promotion Share Kit"
                subtitle="供房东、业主和客户转介绍使用。 / For landlords, property owners, and client referrals only."
                messages={LANDLORD_SHARE_MESSAGES}
                linkLabel="复制网站链接 / Copy Website Link"
              />
            </div>
          </div>

          {/* BC Rental Update card */}
          <div className="lh-hero__card">
            <div className="lh-rtb-card">
              <div className="lh-rtb-card__header">
                <div className="lh-rtb-card__badge">⚖️ BC RTB</div>
                <h3>BC Rental Update</h3>
                <p>BC租赁法规提醒</p>
              </div>

              <ul className="lh-rtb-card__list">
                <li>Rent increase and RTB rule changes should be verified before publishing notices.</li>
                <li>Review notice periods, pet policy wording, and tenant screening requirements before listing.</li>
                <li>Always confirm the latest official RTB guidance before sending legal notices.</li>
              </ul>

              <ul className="lh-rtb-card__list lh-rtb-card__list--ch">
                <li>发布出租广告或通知前，请先核对最新租金涨幅和 RTB 规则。</li>
                <li>上市前请检查通知期限、宠物政策和租客筛选要求。</li>
                <li>发送法律通知前，应以 BC 官方 RTB 信息为准。</li>
              </ul>

              <a
                href="https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies"
                target="_blank"
                rel="noopener noreferrer"
                className="lh-rtb-card__btn"
              >
                查看 RTB 资料 / View RTB Resources →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What We Generate */}
      <section className="lh-section">
        <div className="lh-section-title">
          <h2>我们能生成什么 / What We Generate</h2>
          <p>房东推广素材一站式整理</p>
        </div>
        <div className="lh-feature-grid">
          {FEATURES.map(({ icon, title, ch, desc }) => (
            <article key={title} className="lh-feature-card">
              <div className="lh-feature-icon">{icon}</div>
              <h3>{title}</h3>
              <small>{ch}</small>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <section className="lh-cta-band">
        <div className="lh-cta-inner">
          <div>
            <h2>准备推广您的出租房源吗？ / Ready to list your rental?</h2>
            <p>
              联系 Mabel，快速准备您的中英文房源广告包。
              {" "}Contact Mabel to get your bilingual rental package ready.
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
