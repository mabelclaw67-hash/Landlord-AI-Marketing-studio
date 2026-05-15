import { NavLink, Link } from "react-router-dom";
import Home from "../pages/Home";
import { normalizeLang } from "../utils/lang";

export default function LandlordHomeLayout({ lang, setLang }) {
  const safeLang = normalizeLang(lang);
  return (
    <div className="landlord-app">
      {/* Desktop Sidebar */}
      <aside className="lh-sidebar">
        <div className="lh-brand">
          <div className="lh-brand-mark">V</div>
          <div>
            <strong>Vanisland AI Studio</strong>
            <span>房东广告工作台</span>
          </div>
        </div>

        <nav className="lh-nav-group">
          <div className="lh-nav-label">Main</div>
          <NavLink to="/" end className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏠</span>
            <span><strong>Home</strong><small>首页</small></span>
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏷️</span>
            <span><strong>Services</strong><small>服务</small></span>
          </NavLink>
          <NavLink to="/examples" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏢</span>
            <span><strong>Rental Studio</strong><small>租赁工作台</small></span>
          </NavLink>
          <NavLink to="/home-sale-studio" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🏠</span>
            <span><strong>Home Sale Studio</strong><small>售房工作台</small></span>
          </NavLink>
          <NavLink to="/resources" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">📚</span>
            <span><strong>Resources</strong><small>资源</small></span>
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            <span className="lh-nav-item__icon">🎧</span>
            <span><strong>Contact / Beta</strong><small>联系 / 内测申请</small></span>
          </NavLink>
        </nav>

        <nav className="lh-nav-group">
          <div className="lh-nav-label">Workspace</div>
          <Link to="/admin" className="lh-nav-item lh-nav-item--admin">
            <span className="lh-nav-item__icon">⚙️</span>
            <span><strong>Admin Studio</strong><small>管理后台</small></span>
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
            <span>
              <strong>Request Access</strong>
              <small>申请使用</small>
            </span>
          </Link>
          <Link to="/trial-access" className="lh-sidebar-cta__btn lh-sidebar-cta__btn--secondary">
            <span className="lh-sidebar-cta__icon">🗝️</span>
            <span>
              <strong>Trial Access</strong>
              <small>已批准用户入口</small>
            </span>
          </Link>
        </div>

        <div className="lh-sidebar-footer">
          <strong>Mobile Experience / 移动端体验</strong>
          On mobile, the sidebar becomes a bottom navigation bar for seamless access across devices.
          <br />
          在移动端，侧边栏会变为底部导航栏，方便快速访问。
        </div>
      </aside>

      {/* Main Content */}
      <main className="lh-content">
        {/* Mobile Top Bar */}
        <div className="lh-mobile-top">
          <div>
            <strong>🏠 Vanisland AI Studio</strong>
            <span>房东广告工作台</span>
          </div>
          <div className="lh-mobile-actions">
            <Link to="/admin" className="lh-mobile-admin">
              ⚙️ Admin / 管理后台
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

      {/* Mobile Bottom Navigation */}
      <nav className="lh-mobile-bottom" aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🏠</span>
          <span>Home</span>
        </NavLink>
        <NavLink to="/examples" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🏘️</span>
          <span>Rentals</span>
        </NavLink>
        <NavLink to="/home-sale-studio" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🏡</span>
          <span>Sale</span>
        </NavLink>
        <NavLink to="/trial-access" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>🗝️</span>
          <span>Trial</span>
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>✉️</span>
          <span>Contact</span>
        </NavLink>
      </nav>
    </div>
  );
}
