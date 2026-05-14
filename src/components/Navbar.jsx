import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { t } from "../translations";

const RENTAL_FORM_URL = import.meta.env.VITE_RENTAL_FORM_URL || "";
const FORM_READY = RENTAL_FORM_URL && !RENTAL_FORM_URL.startsWith("PASTE");

// Pages that get the tenant-only experience
function isTenantRoute(pathname) {
  return (
    pathname === "/examples" ||
    pathname === "/tenant-contact" ||
    pathname.startsWith("/listings/")
  );
}

export default function Navbar({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const tenant = isTenantRoute(pathname);

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
              {FORM_READY && (
                <li>
                  <a
                    href={RENTAL_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tenant-apply-link"
                    onClick={() => setOpen(false)}
                  >
                    Apply Now
                  </a>
                </li>
              )}
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
          {FORM_READY ? (
            <a
              href={RENTAL_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-bottom-nav__item mobile-bottom-nav__item--apply"
            >
              <span className="mobile-bottom-nav__icon">📋</span>
              <span className="mobile-bottom-nav__label">Apply</span>
            </a>
          ) : (
            <Link to="/examples" className="mobile-bottom-nav__item mobile-bottom-nav__item--apply">
              <span className="mobile-bottom-nav__icon">📋</span>
              <span className="mobile-bottom-nav__label">Apply</span>
            </Link>
          )}
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
