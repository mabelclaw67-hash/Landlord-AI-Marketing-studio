import { NavLink, Link } from "react-router-dom";
import Home from "../pages/Home";
import { normalizeLang } from "../utils/lang";

const NAV = {
  en: {
    mainLabel: "MAIN",
    home: "Home",
    services: "Services",
    rental: "Rental Studio",
    strategy: "AI Strategy Assessment",
    sale: "Home Sale Studio",
    photoGuide: "Photo Guide",
    faq: "FAQ",
    resources: "Resources",
    contact: "Contact / Apply",
    workspaceLabel: "WORKSPACE",
    admin: "Admin Studio",
    requestAccess: "Request Access",
    trialAccess: "Trial Access",
    mobileFooter: "On mobile, the sidebar becomes a bottom navigation bar for seamless access across devices.",
    mobileFooterTitle: "Mobile Experience",
    mobileAdmin: "⚙️ Admin",
  },
  zh: {
    mainLabel: "导航",
    home: "首页",
    services: "服务介绍",
    rental: "出租工作台",
    strategy: "AI 出租策略初评",
    sale: "出售工作台",
    photoGuide: "拍照指南",
    faq: "常见问题",
    resources: "资源中心",
    contact: "联系 / 申请",
    workspaceLabel: "工作区",
    admin: "管理后台",
    requestAccess: "申请访问",
    trialAccess: "免费试用",
    mobileFooter: "在移动端，侧边栏将变为底部导航栏，方便随时访问。",
    mobileFooterTitle: "移动端体验",
    mobileAdmin: "⚙️ 后台",
  },
};

export default function LandlordHomeLayout({ lang, setLang }) {
  const safeLang = normalizeLang(lang);
  const n = NAV[safeLang] || NAV.en;

  return (
    <div className="landlord-app">
      {/* Desktop Sidebar */}
      <aside className="lh-sidebar">
        <div className="lh-brand">
          <div className="lh-brand-mark">V</div>
          <div>
            <strong>Vanisland AI Studio</strong>
          </div>
        </div>

        <nav className="lh-nav-group">
          <div className="lh-nav-label">{n.mainLabel}</div>
          <NavLink to="/" end className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏠</span>
            <span><strong>{n.home}</strong></span>
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏷️</span>
            <span><strong>{n.services}</strong></span>
          </NavLink>
          <NavLink to="/examples" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏢</span>
            <span><strong>{n.rental}</strong></span>
          </NavLink>
          <NavLink to="/landlord-ai/strategy-assessment" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🧭</span>
            <span><strong>{n.strategy}</strong></span>
          </NavLink>
          <NavLink to="/home-sale-studio" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏠</span>
            <span><strong>{n.sale}</strong></span>
          </NavLink>
          <NavLink to="/photo-tips" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">📷</span>
            <span><strong>{n.photoGuide}</strong></span>
          </NavLink>
          <NavLink to="/faq" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">❓</span>
            <span><strong>{n.faq}</strong></span>
          </NavLink>
          <NavLink to="/resources" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">📚</span>
            <span><strong>{n.resources}</strong></span>
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🎧</span>
            <span><strong>{n.contact}</strong></span>
          </NavLink>
        </nav>

        <nav className="lh-nav-group">
          <div className="lh-nav-label">{n.workspaceLabel}</div>
          <NavLink to="/admin" className={({ isActive }) => `lh-nav-item lh-nav-item--admin${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">⚙️</span>
            <span><strong>{n.admin}</strong></span>
          </NavLink>
          <div className="lh-nav-item lh-lang-row">
            🌐
            <button className={safeLang === "en" ? "active" : ""} onClick={() => setLang("en")} translate="no" lang="en">EN</button>
            <span>/</span>
            <button className={safeLang === "zh" ? "active" : ""} onClick={() => setLang("zh")} translate="no" lang="zh-CN">中文</button>
          </div>
        </nav>

        <div className="lh-sidebar-cta">
          <Link to="/contact" className="lh-sidebar-cta__btn">
            <span className="lh-sidebar-cta__icon">🔐</span>
            <span><strong>{n.requestAccess}</strong></span>
          </Link>
          <Link to="/trial-access" className="lh-sidebar-cta__btn lh-sidebar-cta__btn--secondary">
            <span className="lh-sidebar-cta__icon">🗝️</span>
            <span><strong>{n.trialAccess}</strong></span>
          </Link>
        </div>

        <div className="lh-sidebar-footer">
          <strong>{n.mobileFooterTitle}</strong>
          {n.mobileFooter}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lh-content">
        {/* Mobile Top Bar */}
        <div className="lh-mobile-top">
          <div>
            <strong>🏠 Vanisland AI Studio</strong>
          </div>
          <div className="lh-mobile-actions">
            <div className="lh-mobile-lang">
              <button className={safeLang === "en" ? "active" : ""} onClick={() => setLang("en")} translate="no" lang="en">EN</button>
              <span>/</span>
              <button className={safeLang === "zh" ? "active" : ""} onClick={() => setLang("zh")} translate="no" lang="zh-CN">中文</button>
            </div>
          </div>
        </div>

        <Home lang={lang} />
      </main>
    </div>
  );
}
