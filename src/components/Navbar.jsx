import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { t } from "../translations";
import { readTrialAccess } from "../utils/trialAccess";

// Keep env var available (used elsewhere), but Apply Now now uses the in-app route.
// eslint-disable-next-line no-unused-vars
const _RENTAL_FORM_URL = import.meta.env.VITE_RENTAL_FORM_URL || "";

// Pages that get the tenant-only experience
function isTenantRoute(pathname) {
  return (
    pathname === "/examples" ||
    pathname === "/tenant-contact" ||
    pathname.startsWith("/listings/") ||
    pathname.startsWith("/apply/")
  );
}

export default function Navbar({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const trialSession = readTrialAccess();
  const tenant = isTenantRoute(pathname);
  // When on a specific listing or apply page, route Apply Now to the in-app form for that listing.
  const listingId = pathname.startsWith("/listings/") ? pathname.replace("/listings/", "")
    : pathname.startsWith("/apply/") ? pathname.replace("/apply/", "")
    : null;
  const applyTo = listingId ? `/apply/${listingId}` : "/examples";

  // ── Tenant top nav ─────────────────────────────────────────────────────────
  if (tenant) {
    return (
      <>
        <nav className="navbar">
          <div className="navbar__inner">
            <Link to="/" className="navbar__brand tenant-brand" onClick={() => setOpen(false)}>
              <span>🏠</span>
              Vanisland Rentals
            </Link>
            {/* Desktop tenant links */}
            <ul className="navbar__links navbar__links--tenant" style={{ display: "flex" }}>
              <li><Link to="/" onClick={() => setOpen(false)}>Home</Link></li>
              <li><Link to="/examples" onClick={() => setOpen(false)}>Rental Listings</Link></li>
              <li><Link to="/tenant-contact" onClick={() => setOpen(false)}>Contact</Link></li>
              <li>
                <Link
                  to={applyTo}
                  className="tenant-apply-link"
                  onClick={() => setOpen(false)}
                >
                  Apply Now
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* ── Mobile bottom nav — tenant pages only ─────────────────────────── */}
        <nav className="mobile-bottom-nav" aria-label="Tenant navigation">
          <Link to="/" className={`mobile-bottom-nav__item${pathname === "/" ? " active" : ""}`}>
            <span className="mobile-bottom-nav__icon">🏠</span>
            <span className="mobile-bottom-nav__label">Home</span>
          </Link>
          <Link to="/examples" className={`mobile-bottom-nav__item${pathname === "/examples" ? " active" : ""}`}>
            <span className="mobile-bottom-nav__icon">🏘</span>
            <span className="mobile-bottom-nav__label">Rentals</span>
          </Link>
          <Link to="/tenant-contact" className={`mobile-bottom-nav__item${pathname === "/tenant-contact" ? " active" : ""}`}>
            <span className="mobile-bottom-nav__icon">📞</span>
            <span className="mobile-bottom-nav__label">Contact</span>
          </Link>
          <Link to={applyTo} className="mobile-bottom-nav__item mobile-bottom-nav__item--apply">
            <span className="mobile-bottom-nav__icon">📋</span>
            <span className="mobile-bottom-nav__label">Apply</span>
          </Link>
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
          <span>/ 房东广告工作台</span>
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
          {!trialSession && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) => `admin-link${isActive ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {t(lang, "nav.admin")}
              </NavLink>
            </li>
          )}
          <li className="navbar__lang">
            <button
              className={lang === "en" ? "active" : ""}
              onClick={() => { setLang("en"); setOpen(false); }}
            >
              EN
            </button>
            <button
              className={lang === "zh" ? "active" : ""}
              onClick={() => { setLang("zh"); setOpen(false); }}
            >
              中
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
