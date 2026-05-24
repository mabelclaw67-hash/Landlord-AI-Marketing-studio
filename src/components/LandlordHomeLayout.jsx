import { NavLink, Link } from "react-router-dom";
import Home from "../pages/Home";
import { normalizeLang } from "../utils/lang";

const FREE_CARDS = {
  en: [
    { icon: "📷", title: "Photo Tips", to: "/photo-tips" },
    { icon: "❓", title: "FAQ",         to: "/faq" },
  ],
  zh: [
    { icon: "📷", title: "拍照建议", to: "/photo-tips" },
    { icon: "❓", title: "常见问题", to: "/faq" },
  ],
};

const NAV = {
  en: {
    mainLabel: "MAIN",
    home: "Home",
    services: "Services",
    rental: "Rental Studio",
    sale: "Home Sale Studio",
    resources: "Resources",
    contact: "Contact / Request",
    workspaceLabel: "WORKSPACE",
    admin: "Admin Studio",
    requestAccess: "Request Access",
    trialAccess: "Trial Access",
    mobileFooter: "On mobile, the sidebar becomes a bottom navigation bar for seamless access across devices.",
    mobileFooterTitle: "Mobile Experience",
    mobileAdmin: "⚙️ Admin",
    mobileRentals: "Rentals",
    mobileSale: "Sale",
    mobileTrial: "Trial",
    mobileContact: "Contact",
  },
  zh: {
    mainLabel: "导航",
    home: "首页",
    services: "服务",
    rental: "出租工作台",
    sale: "出售工作台",
    resources: "资源",
    contact: "联系 / 申请",
    workspaceLabel: "工作区",
    admin: "管理后台",
    requestAccess: "申请访问",
    trialAccess: "免费试用",
    mobileFooter: "在移动端，侧边栏将变为底部导航栏，方便随时访问。",
    mobileFooterTitle: "移动端体验",
    mobileAdmin: "⚙️ 后台",
    mobileRentals: "出租",
    mobileSale: "出售",
    mobileTrial: "试用",
    mobileContact: "联系",
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
          <NavLink to="/home-sale-studio" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏠</span>
            <span><strong>{n.sale}</strong></span>
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
          <Link to="/admin" className="lh-nav-item lh-nav-item--admin">
            <span className="lh-nav-item__icon">⚙️</span>
            <span><strong>{n.admin}</strong></span>
          </Link>
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
            <Link to="/admin" className="lh-mobile-admin">
              {n.mobileAdmin}
            </Link>
            <div className="lh-mobile-lang">
              <button className={safeLang === "en" ? "active" : ""} onClick={() => setLang("en")} translate="no" lang="en">EN</button>
              <span>/</span>
              <button className={safeLang === "zh" ? "active" : ""} onClick={() => setLang("zh")} translate="no" lang="zh-CN">中文</button>
            </div>
          </div>
        </div>

        <Home lang={lang} />
      </main>

      {/* Floating Resource Cards */}
      <div className="lh-float-resources" aria-label="Free resources">
        {FREE_CARDS[safeLang].map((card) => (
          <Link key={card.to} to={card.to} className="lh-float-card">
            <span className="lh-float-card__icon">{card.icon}</span>
            <span className="lh-float-card__label">{card.title}</span>
          </Link>
        ))}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lh-mobile-bottom" aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🏠</span>
          <span>{n.home}</span>
        </NavLink>
        <NavLink to="/examples" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🏘️</span>
          <span>{n.mobileRentals}</span>
        </NavLink>
        <NavLink to="/home-sale-studio" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🏡</span>
          <span>{n.mobileSale}</span>
        </NavLink>
        <NavLink to="/trial-access" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🗝️</span>
          <span>{n.mobileTrial}</span>
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>✉️</span>
          <span>{n.mobileContact}</span>
        </NavLink>
      </nav>
    </div>
  );
}
