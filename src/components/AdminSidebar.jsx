import { NavLink } from "react-router-dom";
import { lockAdmin } from "./AdminGuard";
import { useLang } from "../contexts/LangContext";
import { AL } from "../utils/adminLabels";

export default function AdminSidebar() {
  const lang = useLang();
  const L = AL[lang] ?? AL.en;

  return (
    <aside className="admin-sidebar">
      <h3>{L.platformMenu}</h3>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">{L.groupAdmin}</div>
        <NavLink to="/admin" end className={({ isActive }) => (isActive ? "active" : "")}>
          📊 {L.dashboard}
        </NavLink>
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">{L.groupRental}</div>
        <NavLink to="/admin/rental" className={({ isActive }) => (isActive ? "active" : "")}>
          🏘️ {L.rentalDashboard}
        </NavLink>
        <NavLink to="/admin/new" className={({ isActive }) => (isActive ? "active" : "")}>
          ➕ {L.newRentalListing}
        </NavLink>
        <NavLink to="/admin/listings" className={({ isActive }) => (isActive ? "active" : "")}>
          📋 {L.rentalListings}
        </NavLink>
        <NavLink to="/admin/leads" className={({ isActive }) => (isActive ? "active" : "")}>
          🗂️ {L.rentalLeads}
        </NavLink>
        <NavLink to="/admin/strategy-assessments" className={({ isActive }) => (isActive ? "active" : "")}>
            📚 {lang === "zh" ? "房产出租策略初评" : "Property Strategy Reviews"}
        </NavLink>
        <NavLink to="/admin/dispute-reviews" className={({ isActive }) => (isActive ? "active" : "")}>
            ⚖️ {lang === "zh" ? "法律争议AI初评" : "AI Dispute Reviews"}
        </NavLink>
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">{L.groupSale}</div>
        <NavLink to="/admin/home-sale" className={({ isActive }) => (isActive ? "active" : "")}>
          🏡 {L.homeSaleDashboard}
        </NavLink>
        <NavLink to="/admin/home-sale/listings/new" className={({ isActive }) => (isActive ? "active" : "")}>
          ➕ {L.newSaleListing}
        </NavLink>
        <NavLink to="/admin/home-sale/listings" className={({ isActive }) => (isActive ? "active" : "")}>
          📋 {L.saleListings}
        </NavLink>
        <NavLink to="/admin/home-sale/buyer-inquiries" className={({ isActive }) => (isActive ? "active" : "")}>
          💬 {L.buyerInquiries}
        </NavLink>
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">{L.groupResources}</div>
        <NavLink to="/admin/photo-tips" className={({ isActive }) => (isActive ? "active" : "")}>
          📷 {L.photoTips}
        </NavLink>
        <NavLink to="/admin/faq" className={({ isActive }) => (isActive ? "active" : "")}>
          ❓ {L.faq}
        </NavLink>
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">{L.groupSystem}</div>
        <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            ⚙️ {L.settings}
        </NavLink>
        <NavLink to="/admin/system-performance" className={({ isActive }) => (isActive ? "active" : "")}>
            📈 {L.systemPerformance}
        </NavLink>
        <button className="admin-lock-btn" onClick={lockAdmin}>
          🔒 {L.lockAdmin}
        </button>
      </div>
    </aside>
  );
}
