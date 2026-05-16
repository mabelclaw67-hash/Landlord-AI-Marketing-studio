import { NavLink, useNavigate } from "react-router-dom";
import { lockAdmin } from "./AdminGuard";
import { readTrialAccess, clearTrialAccess } from "../utils/trialAccess";

export default function AdminSidebar({ lang }) {
  const navigate = useNavigate();
  const trialSession = readTrialAccess();

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
          Trial Mode / 试用模式
          <span>{trialSession.approvedModule}</span>
        </div>
      )}
      <h3>Platform Menu / 平台菜单</h3>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">ADMIN STUDIO / 管理后台</div>
        <NavLink to="/admin" end className={({ isActive }) => (isActive ? "active" : "")}>
          📊 Dashboard / 总览
        </NavLink>
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">RENTAL STUDIO / 出租房源</div>
        <NavLink to="/admin/rental" className={({ isActive }) => (isActive ? "active" : "")}>
          🏘️ Rental Dashboard / 出租后台
        </NavLink>
        <NavLink to="/admin/new" className={({ isActive }) => (isActive ? "active" : "")}>
          ➕ New Rental Listing / 新增出租房源
        </NavLink>
        <NavLink to="/admin/listings" className={({ isActive }) => (isActive ? "active" : "")}>
          📋 Rental Listings / 出租房源列表
        </NavLink>
        <NavLink to="/admin/leads" className={({ isActive }) => (isActive ? "active" : "")}>
          🗂️ Rental Leads / 租客申请
        </NavLink>
        {!trialSession && (
          <NavLink to="/admin/trial-requests" className={({ isActive }) => (isActive ? "active" : "")}>
            📨 Trial Requests / 试用申请
          </NavLink>
        )}
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">HOME SALE STUDIO / 出售房源</div>
        <NavLink to="/admin/home-sale" className={({ isActive }) => (isActive ? "active" : "")}>
          🏡 Home Sale Dashboard / 出售后台
        </NavLink>
        <NavLink to="/admin/home-sale/listings/new" className={({ isActive }) => (isActive ? "active" : "")}>
          ➕ New Sale Listing / 新增出售房源
        </NavLink>
        <NavLink to="/admin/home-sale/listings" className={({ isActive }) => (isActive ? "active" : "")}>
          📋 Sale Listings / 出售房源列表
        </NavLink>
        <NavLink to="/admin/home-sale/buyer-inquiries" className={({ isActive }) => (isActive ? "active" : "")}>
          💬 Buyer Inquiries / 买家咨询
        </NavLink>
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">RESOURCES / 资源</div>
        <NavLink to="/admin/photo-tips" className={({ isActive }) => (isActive ? "active" : "")}>
          📷 Photo Tips / 拍照建议
        </NavLink>
        <NavLink to="/admin/faq" className={({ isActive }) => (isActive ? "active" : "")}>
          ❓ FAQ / 常见问题
        </NavLink>
      </div>

      <div className="admin-sidebar__group">
        <div className="admin-sidebar__label">SYSTEM / 系统</div>
        {!trialSession && (
          <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            ⚙️ Settings / 系统设置
          </NavLink>
        )}
        <button className="admin-lock-btn" onClick={handleExit}>
          {trialSession ? "🚪 Exit Trial / 退出试用" : "🔒 Lock Admin / 锁定"}
        </button>
      </div>
    </aside>
  );
}
