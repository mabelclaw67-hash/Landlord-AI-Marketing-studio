import { Outlet } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import AdminGuard from "../../components/AdminGuard";

export default function AdminLayout({ lang }) {
  return (
    <AdminGuard>
      <div className="page-wrapper">
        <div className="admin-layout">
          <AdminSidebar lang={lang} />
          <main className="admin-content">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
