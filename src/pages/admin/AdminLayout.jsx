import { Outlet } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";

export default function AdminLayout({ lang }) {
  return (
    <div className="page-wrapper">
      <div className="admin-layout">
        <AdminSidebar lang={lang} />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
