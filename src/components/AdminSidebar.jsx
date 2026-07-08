import { NavLink, useNavigate } from "react-router-dom";
import { lockAdmin } from "./AdminGuard";
import { readTrialAccess, clearTrialAccess } from "../utils/trialAccess";
import { useLang } from "../contexts/LangContext";
import { AL } from "../utils/adminLabels";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const trialSession = readTrialAccess();
  const lang = useLang();
  const L = AL[lang] ?? AL.en;

  const handleExit = () => {
    if (trialSession) {
      clearTrialAccess();
      navigate("/", { replace: true });
    } else {
      lockAdmin();
    }
  };

  return (
    <aside className="admin-sidebar">
      {trialSession && (
        <div className="admin-sidebar__trial-badge">
          {L.trialMode}
          <span>{trialSession.approvedModule}</span>
        </div>
      )}
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
        {!trialSession && (
          <NavLink to="/admin/trial-requests" className={({ isActive }) => (isActive ? "active" : "")}>
            📨 {L.trialRequests}
          </NavLink>
        )}
        {!trialSession && (
          <NavLink to="/admin/strategy-reports" className={({ isActive }) => (isActive ? "active" : "")}>
            📄 {lang === "zh" ? "策略报告" : "Strategy Reports"}
          </NavLink>
        )}
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
        {!trialSession && (
          <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            ⚙️ {L.settings}
          </NavLink>
        )}
        <button className="admin-lock-btn" onClick={handleExit}>
          {trialSession ? `🚪 ${L.exitTrial}` : `🔒 ${L.lockAdmin}`}
        </button>
      </div>
    </aside>
  );
}
