import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { t } from "../../translations";
import { getListings } from "../../utils/storage";

export default function Listings({ lang }) {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    getListings()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const statusClass = {
    Draft:              "badge--draft",
    "In Review":        "badge--review",
    "Ready to Publish": "badge--ready",
    Published:          "badge--published",
  };

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Rental Listings / 出租房源列表</h1>
          <p className="text-muted text-sm">All saved rental listings / 所有已保存出租房源</p>
        </div>
        <Link to="/admin/new" className="btn btn--primary">+ New Rental Listing / 新增出租房源</Link>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading…
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load listings</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p className="text-muted">{t(lang, "admin.noListings")}</p>
            <Link to="/admin/new" className="btn btn--primary" style={{ marginTop: 16, display: "inline-block" }}>
              + New Rental Listing / 新增出租房源
            </Link>
          </div>
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {listings.map((l, idx) => (
              <div
                key={l.id}
                style={{
                  padding: "16px",
                  borderBottom: idx < listings.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", flex: 1, marginRight: 8 }}>
                    {l.address}
                  </div>
                  <span className={`badge ${statusClass[l.status] || "badge--draft"}`} style={{ flexShrink: 0 }}>
                    {l.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 4 }}>
                  {l.city}
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 4 }}>
                  ${Number(l.rent).toLocaleString()}/mo
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: 8 }}>
                  <code style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", background: "var(--color-bg-subtle, #f4f4f4)", padding: "2px 5px", borderRadius: 4 }}>
                    {l.id}
                  </code>
                  {l.createdDate && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      · {l.createdDate}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">
                    {t(lang, "admin.view")}
                  </Link>
                  <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">
                    Edit / 编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t(lang, "admin.listingId")}</th>
                  <th>{t(lang, "admin.address")}</th>
                  <th>{t(lang, "admin.city")}</th>
                  <th>{t(lang, "admin.rent")}</th>
                  <th>{t(lang, "admin.status")}</th>
                  <th>{t(lang, "admin.created")}</th>
                  <th>{t(lang, "admin.action")}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td><code style={{ fontSize: "0.8rem" }}>{l.id}</code></td>
                    <td>{l.address}</td>
                    <td>{l.city}</td>
                    <td>${Number(l.rent).toLocaleString()}/mo</td>
                    <td><span className={`badge ${statusClass[l.status] || "badge--draft"}`}>{l.status}</span></td>
                    <td className="text-muted text-sm">{l.createdDate}</td>
                    <td>
                      <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">
                        {t(lang, "admin.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
