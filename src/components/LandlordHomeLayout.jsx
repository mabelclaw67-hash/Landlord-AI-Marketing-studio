import { NavLink, Link } from "react-router-dom";
import Home from "../pages/Home";

export default function LandlordHomeLayout({ lang, setLang }) {
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
            🏠 Home
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            🧰 Services
          </NavLink>
          <NavLink to="/examples" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            🏘️ Rental Listings
          </NavLink>
          <NavLink to="/resources" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            📚 Resources
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `lh-nav-item${isActive ? " lh-nav-item--active" : ""}`}>
            ✉️ Contact / Beta
          </NavLink>
        </nav>

        <nav className="lh-nav-group">
          <div className="lh-nav-label">Workspace</div>
          <Link to="/admin" className="lh-nav-item lh-nav-item--admin">
            ⚙️ Admin Studio
          </Link>
          <div className="lh-nav-item lh-lang-row">
            🌐
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <span>/</span>
            <button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中</button>
          </div>
        </nav>

        <div className="lh-sidebar-footer">
          <strong>Client-facing home</strong>
          This page is for landlords and property clients. Tenant rental pages stay separate.
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
          <div className="lh-mobile-lang">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <span>/</span>
            <button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中</button>
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
          <span>Listings</span>
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>✉️</span>
          <span>Contact</span>
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
          <span>⚙️</span>
          <span>Admin</span>
        </NavLink>
      </nav>
    </div>
  );
}
