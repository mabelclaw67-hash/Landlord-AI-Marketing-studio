import { Link } from "react-router-dom";
import { useAdminSessionStatus } from "../utils/adminSession";

export const COMPANY_FOOTER = {
  year: String(new Date().getFullYear()),
  name: "VanIsland Property",
  location: "Vancouver Island, BC",
  email: "support@vanislandproperty.ca",
  phone: "672-514-8866",
  phoneHref: "6725148866",
};

export default function Footer({ lang } = {}) {
  // /admin stays reachable by typing the address; the link itself is shown
  // only to an admin who is already signed in.
  const showAdminLink = useAdminSessionStatus() === "active";
  return (
    <footer className="footer">
      <img
        src="/brand/company-logo-420.png"
        alt="VanIsland Property"
        width="420"
        height="280"
        loading="lazy"
        decoding="async"
        className="footer__logo"
      />
      <p>
        &copy; {COMPANY_FOOTER.year} <strong>{COMPANY_FOOTER.name}</strong>
      </p>
      <p className="footer__contact">
        <span>{COMPANY_FOOTER.location}</span>
        <a href={`mailto:${COMPANY_FOOTER.email}`}>{COMPANY_FOOTER.email}</a>
        <a href={`tel:${COMPANY_FOOTER.phoneHref}`}>{COMPANY_FOOTER.phone}</a>
      </p>
      {showAdminLink && (
      <p style={{ marginTop: 10, fontSize: "0.72rem", opacity: 0.55 }}>
        <Link to="/admin" style={{ color: "inherit" }}>
          {lang === "zh" ? "管理后台" : "Admin Studio"}
        </Link>
      </p>
      )}
    </footer>
  );
}
