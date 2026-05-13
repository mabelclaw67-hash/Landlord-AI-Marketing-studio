import { NavLink } from "react-router-dom";
import { t } from "../translations";
import { lockAdmin } from "./AdminGuard";

export default function AdminSidebar({ lang }) {
  return (
    <aside className="admin-sidebar">
      <h3>Admin Studio</h3>
      <NavLink
        to="/admin"
        end
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        📊 {t(lang, "adminNav.dashboard")}
      </NavLink>
      <NavLink
        to="/admin/new"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        ➕ {t(lang, "adminNav.newListing")}
      </NavLink>
      <NavLink
        to="/admin/listings"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        📋 {t(lang, "adminNav.listings")}
      </NavLink>
      <NavLink
        to="/admin/leads"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        🗂️ Leads / 申请
      </NavLink>

      <button className="admin-lock-btn" onClick={lockAdmin}>
        🔒 Lock Admin / 锁定
      </button>
    </aside>
  );
}
