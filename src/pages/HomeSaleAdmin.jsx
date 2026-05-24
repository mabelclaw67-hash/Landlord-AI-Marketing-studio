import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { formatSalePrice, getHomeSaleListings } from "../utils/homeSaleSheet";
import PrototypeBanner from "../components/PrototypeBanner";
import ComingSoonSection from "../components/ComingSoonSection";
import { useLang } from "../contexts/LangContext";
import { AL } from "../utils/adminLabels";

function statusBadge(status) {
  const map = {
    Draft: "badge--draft",
    "In Review": "badge--review",
    "Ready to Publish": "badge--ready",
    Published: "badge--published",
    "Open House": "badge--review",
    Active: "badge--ready",
    Pending: "badge--draft",
    Sold: "badge--published",
    Archived: "badge--draft",
  };
  return <span className={`badge ${map[status] || "badge--draft"}`}>{status || "Draft"}</span>;
}

export default function HomeSaleAdmin() {
  const lang = useLang();
  const L = AL[lang] ?? AL.en;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    setError(null);
    getHomeSaleListings()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location.key]);

  const counts = { total: 0, draft: 0, openHouse: 0, sold: 0 };
  listings.forEach((l) => {
    counts.total++;
    const s = String(l.status || "").toLowerCase();
    if (!l.status || s === "draft") counts.draft++;
    if (s === "open house") counts.openHouse++;
    if (s === "sold") counts.sold++;
  });

  const kpis = [
    { key: "total",     label: lang === "zh" ? "总房源数" : "Total Listings",  val: counts.total },
    { key: "draft",     label: lang === "zh" ? "草稿" : "Draft",              val: counts.draft },
    { key: "openHouse", label: lang === "zh" ? "开放日" : "Open House",       val: counts.openHouse },
    { key: "sold",      label: lang === "zh" ? "已出售" : "Sold",             val: counts.sold },
  ];

  return (
    <div>
      <PrototypeBanner />

      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{lang === "zh" ? "出售房源管理" : "Home Sale Studio"}</h1>
          <p className="text-muted text-sm">{lang === "zh" ? "管理所有出售房源广告包" : "Manage all sale listing marketing packages"}</p>
        </div>
        <Link to="/admin/home-sale/listings/new" className="btn btn--primary">
          {lang === "zh" ? "+ 新增出售房源" : "+ New Sale Listing"}
        </Link>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map(({ key, label, val }) => (
          <div key={key} className="kpi-card">
            <div className="kpi-card__number">{loading ? "—" : val}</div>
            <div className="kpi-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Listings table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading sale listings…
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load sale listings</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏡</div>
            <p style={{ color: "var(--color-text-muted)" }}>No sale listings yet.</p>
            <Link to="/admin/home-sale/listings/new" className="btn btn--primary" style={{ marginTop: 16, display: "inline-block" }}>
              + New Sale Listing
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Listing ID</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Asking Price</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td><code style={{ fontSize: "0.8rem" }}>{l.id}</code></td>
                    <td>{l.address || "Pending"}</td>
                    <td>{l.city || "Pending"}</td>
                    <td>{formatSalePrice(l.askingPrice)}</td>
                    <td>{statusBadge(l.status)}</td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
                      {l.updatedAt || l.createdAt || "—"}
                    </td>
                    <td>
                      <Link to={`/admin/home-sale/listings/${l.id}`} className="btn btn--ghost btn--sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ComingSoonSection />
    </div>
  );
}
