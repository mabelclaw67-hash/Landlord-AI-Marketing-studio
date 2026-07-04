import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { t } from "../translations";
import { normalizeLang } from "../utils/lang";

// Pages that get the tenant-only experience
function isTenantRoute(pathname) {
  return (
    pathname === "/examples" ||
    pathname === "/tenant-contact" ||
    pathname === "/apply" ||
    pathname === "/supporting-documents" ||
    pathname.startsWith("/listings/") ||
    pathname.startsWith("/apply/")
  );
}

function getListingIdFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "listings" && parts[1] && parts[2] !== "video") return parts[1];
  if (parts[0] === "apply" && parts[1]) return parts[1];
  return "";
}

const TENANT_NAV = {
  en: {
    brand: "Vanisland Rentals",
    home: "Home",
    rentalListings: "Rental Listings",
    contact: "Contact",
    applyNow: "Apply Now",
    admin: "Admin",
  },
  zh: {
    brand: "Vanisland 出租",
    home: "首页",
    rentalListings: "出租房源",
    contact: "联系",
    applyNow: "立即申请",
    admin: "后台",
  },
};

export default function Navbar({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const safeLang = normalizeLang(lang);
  const tenant = isTenantRoute(pathname);
  const tenantLabels = TENANT_NAV[safeLang] || TENANT_NAV.en;
  // When on a specific listing page, route Apply Now to the in-app form for that listing.
  const listingId = getListingIdFromPath(pathname);
  const applyTo = listingId ? `/apply/${listingId}` : "/apply";

  // ── Tenant top nav ─────────────────────────────────────────────────────────
  if (tenant) {
    return (
      <>
        <nav className="navbar">
          <div className="navbar__inner">
            <Link to="/" className="navbar__brand tenant-brand" onClick={() => setOpen(false)}>
              <span>🏠</span>
              {tenantLabels.brand}
            </Link>
            {/* Desktop tenant links */}
            <ul className="navbar__links navbar__links--tenant" style={{ display: "flex" }}>
              <li><Link to="/" onClick={() => setOpen(false)}>{tenantLabels.home}</Link></li>
              <li><Link to="/examples" onClick={() => setOpen(false)}>{tenantLabels.rentalListings}</Link></li>
              <li><Link to="/tenant-contact" onClick={() => setOpen(false)}>{tenantLabels.contact}</Link></li>
              <li><Link to="/admin" className="admin-link" onClick={() => setOpen(false)}>{tenantLabels.admin}</Link></li>
              <li>
                <Link
                  to={applyTo}
                  className="tenant-apply-link"
                  onClick={() => setOpen(false)}
                >
                  {tenantLabels.applyNow}
                </Link>
              </li>
              <li className="navbar__lang navbar__lang--tenant">
                <button
                  className={safeLang === "en" ? "active" : ""}
                  onClick={() => { setLang("en"); setOpen(false); }}
                  translate="no"
                  lang="en"
                >
                  EN
                </button>
                <button
                  className={safeLang === "zh" ? "active" : ""}
                  onClick={() => { setLang("zh"); setOpen(false); }}
                  translate="no"
                  lang="zh-CN"
                >
                  中文
                </button>
              </li>
            </ul>
            <div className="tenant-mobile-lang">
              <button
                className={safeLang === "en" ? "active" : ""}
                onClick={() => setLang("en")}
                translate="no"
                lang="en"
              >
                EN
              </button>
              <button
                className={safeLang === "zh" ? "active" : ""}
                onClick={() => setLang("zh")}
                translate="no"
                lang="zh-CN"
              >
                中文
              </button>
            </div>
          </div>
        </nav>

      </>
    );
  }

  // ── Full product nav (Admin Studio + public marketing pages) ───────────────
  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" onClick={() => setOpen(false)}>
          <span>🏠</span>
          Vanisland AI Studio
        </Link>

        <button
          className="navbar__menu-btn"
          onClick={() => setOpen((p) => !p)}
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>

        <ul className={`navbar__links${open ? " open" : ""}`}>
          {[
            ["home", "/"],
            ["services", "/services"],
            ["examples", "/examples"],
            ["strategyAssessment", "/landlord-ai/strategy-assessment"],
            ["saleListing", "/home-sale-studio"],
            ["resources", "/resources"],
            ["contact", "/contact"],
          ].map(([key, path]) => (
            <li key={key}>
              <NavLink
                to={path}
                end={path === "/"}
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setOpen(false)}
              >
                {t(lang, `nav.${key}`)}
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink
              to="/admin"
              className={({ isActive }) => `admin-link${isActive ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {t(lang, "nav.admin")}
            </NavLink>
          </li>
          <li className="navbar__lang">
            <button
              className={safeLang === "en" ? "active" : ""}
              onClick={() => { setLang("en"); setOpen(false); }}
              translate="no"
              lang="en"
            >
              EN
            </button>
            <button
              className={safeLang === "zh" ? "active" : ""}
              onClick={() => { setLang("zh"); setOpen(false); }}
              translate="no"
              lang="zh-CN"
            >
              中文
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
