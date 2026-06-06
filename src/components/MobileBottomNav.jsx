import { NavLink } from "react-router-dom";
import { normalizeLang } from "../utils/lang";

const MOBILE_NAV = {
  en: {
    home: "Home",
    photoGuide: "Photos",
    rentals: "Rentals",
    sale: "Sale",
    trial: "Trial",
    contact: "Contact",
  },
  zh: {
    home: "首页",
    photoGuide: "拍照",
    rentals: "出租",
    sale: "出售",
    trial: "试用",
    contact: "联系",
  },
};

export default function MobileBottomNav({ lang }) {
  const safeLang = normalizeLang(lang);
  const labels = MOBILE_NAV[safeLang] || MOBILE_NAV.en;

  return (
    <nav className="lh-mobile-bottom" aria-label={safeLang === "zh" ? "手机底部导航" : "Mobile navigation"}>
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
      <NavLink to="/home-sale-studio" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>🏡</span>
        <span>{labels.sale}</span>
      </NavLink>
      <NavLink to="/trial-access" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>🗝️</span>
        <span>{labels.trial}</span>
      </NavLink>
      <NavLink to="/contact" className={({ isActive }) => `lh-mobile-bottom__item${isActive ? " lh-mobile-bottom__item--active" : ""}`}>
        <span>✉️</span>
        <span>{labels.contact}</span>
      </NavLink>
    </nav>
  );
}
