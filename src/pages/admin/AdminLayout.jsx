import { Component } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import AdminGuard from "../../components/AdminGuard";

class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <h2 style={{ color: "#c0392b" }}>Admin render error</h2>
          <pre style={{ background: "#fee", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminLayout({ lang }) {
  return (
    <AdminGuard>
      <AdminErrorBoundary>
        <div className="page-wrapper">
          <div className="admin-layout">
            <AdminSidebar lang={lang} />
            <main className="admin-content">
              <Outlet />
            </main>
          </div>
        </div>
      </AdminErrorBoundary>
    </AdminGuard>
  );
}
