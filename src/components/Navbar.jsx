import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { t } from "../translations";

export default function Navbar({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // Hide admin controls on public listing pages so applicants don't see them.
  const isPublicListing = pathname.startsWith("/listings/");

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
          {!isPublicListing && (
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
