import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { normalizeLang } from "../utils/lang";
import { AL } from "../utils/adminLabels";

// ── Public nav labels (unchanged from original) ───────────────────────────────
const PUBLIC_NAV = {
  en: { home: "Home", photoGuide: "Photos", rentals: "Rentals", strategy: "AI Plan", sale: "Sale", contact: "Contact", admin: "Admin" },
  zh: { home: "首页", photoGuide: "拍照", rentals: "出租", strategy: "初评", sale: "出售", contact: "联系", admin: "后台" },
};

// ── Admin bottom nav ─────────────────────────────────────────────────────────
function AdminMobileNav({ lang }) {
  const L = AL[lang] ?? AL.en;
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && (
        <div className="ambn-overlay" onClick={() => setMoreOpen(false)} aria-hidden="true">
          <div className="ambn-more-menu" onClick={(e) => e.stopPropagation()} role="menu">
            <NavLink to="/admin/strategy-assessments" className="ambn-more-item" onClick={() => setMoreOpen(false)}>
              📚 {lang === "zh" ? "策略评估报告" : "Strategy Assessment Reports"}
            </NavLink>
            <NavLink to="/admin/home-sale" className="ambn-more-item" onClick={() => setMoreOpen(false)}>
              🏡 {L.ambnHomeSale}
            </NavLink>
            <NavLink to="/admin/photo-tips" className="ambn-more-item" onClick={() => setMoreOpen(false)}>
              📷 {L.ambnPhotoTips}
            </NavLink>
            <NavLink to="/admin/faq" className="ambn-more-item" onClick={() => setMoreOpen(false)}>
              ❓ {L.ambnFaq}
            </NavLink>
            <NavLink to="/admin/settings" className="ambn-more-item" onClick={() => setMoreOpen(false)}>
              ⚙️ {L.ambnSettings}
            </NavLink>
          </div>
        </div>
      )}

      <nav className="admin-mobile-nav" aria-label={lang === "zh" ? "管理员底部导航" : "Admin navigation"}>
        <NavLink
          to="/admin"
          end
          className={({ isActive }) => `ambn-item${isActive ? " ambn-item--active" : ""}`}
        >
          <span className="ambn-icon">📊</span>
          <span className="ambn-label">{L.ambnDashboard}</span>
        </NavLink>

        <NavLink
          to="/admin/listings"
          className={({ isActive }) => `ambn-item${isActive ? " ambn-item--active" : ""}`}
        >
          <span className="ambn-icon">📋</span>
          <span className="ambn-label">{L.ambnListings}</span>
        </NavLink>

        <NavLink to="/admin/new" className="ambn-item ambn-item--new">
          <span className="ambn-icon">➕</span>
          <span className="ambn-label">{L.ambnNew}</span>
        </NavLink>

        <NavLink
          to="/admin/rental"
          className={({ isActive }) => `ambn-item${isActive ? " ambn-item--active" : ""}`}
        >
          <span className="ambn-icon">📩</span>
          <span className="ambn-label">{L.ambnApplications}</span>
        </NavLink>

        <button
          type="button"
          className={`ambn-item${moreOpen ? " ambn-item--active" : ""}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
        >
          <span className="ambn-icon">☰</span>
          <span className="ambn-label">{L.ambnMore}</span>
        </button>
      </nav>
    </>
  );
}

// ── Public nav (original, preserved exactly) ──────────────────────────────────
function PublicMobileNav({ lang }) {
  const labels = PUBLIC_NAV[lang] || PUBLIC_NAV.en;
  return (
    <nav className="lh-mobile-bottom" aria-label={lang === "zh" ? "手机底部导航" : "Mobile navigation"}>
      <NavLink to="/" end className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>🏠</span>
        <span>{labels.home}</span>
      </NavLink>
      <NavLink to="/photo-tips" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>📷</span>
        <span>{labels.photoGuide}</span>
      </NavLink>
      <NavLink to="/examples" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>🏘️</span>
        <span>{labels.rentals}</span>
      </NavLink>
      <NavLink to="/landlord-ai/strategy-assessment" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>🧭</span>
        <span>{labels.strategy}</span>
      </NavLink>
      <NavLink to="/home-sale-studio" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>🏡</span>
        <span>{labels.sale}</span>
      </NavLink>
      <NavLink to="/contact" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>✉️</span>
        <span>{labels.contact}</span>
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => `lh-mobile-bottom__item lh-mobile-bottom__item--admin${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>⚙️</span>
        <span>{labels.admin}</span>
      </NavLink>
    </nav>
  );
}

// ── Root export: picks admin vs public based on current route ─────────────────
export default function MobileBottomNav({ lang }) {
  const safeLang = normalizeLang(lang);
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <AdminMobileNav lang={safeLang} />;
  return <PublicMobileNav lang={safeLang} />;
}
