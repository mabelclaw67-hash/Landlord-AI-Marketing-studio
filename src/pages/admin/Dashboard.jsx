import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { t } from "../../translations";
import { getListings } from "../../utils/storage";
import PrototypeBanner from "../../components/PrototypeBanner";

function statusBadge(status) {
  const map = {
    Draft:              "badge--draft",
    "In Review":        "badge--review",
    "Ready to Publish": "badge--ready",
    Published:          "badge--published",
  };
  return <span className={`badge ${map[status] || "badge--draft"}`}>{status}</span>;
}

export default function Dashboard({ lang }) {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getListings()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = { Draft: 0, "In Review": 0, "Ready to Publish": 0, Published: 0 };
  listings.forEach((l) => { if (counts[l.status] !== undefined) counts[l.status]++; });

  const kpis = [
    { key: "totalDraft",     label: t(lang, "admin.totalDraft"),     val: counts["Draft"] },
    { key: "totalReview",    label: t(lang, "admin.totalReview"),    val: counts["In Review"] },
    { key: "totalReady",     label: t(lang, "admin.totalReady"),     val: counts["Ready to Publish"] },
    { key: "totalPublished", label: t(lang, "admin.totalPublished"), val: counts["Published"] },
  ];

  return (
    <div>
      <PrototypeBanner lang={lang} />

      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{t(lang, "admin.dashboard")}</h1>
          <p className="text-muted text-sm">管理你的所有房源广告包 / Manage all your listing marketing packages</p>
        </div>
        <Link to="/admin/new" className="btn btn--primary">+ {t(lang, "admin.newListing")}</Link>
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
            Loading listings…
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load listings</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
            <p style={{ color: "var(--color-text-muted)" }}>{t(lang, "admin.noListings")}</p>
            <Link to="/admin/new" className="btn btn--primary" style={{ marginTop: 16, display: "inline-block" }}>
              + {t(lang, "admin.newListing")}
            </Link>
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
                    <td>{statusBadge(l.status)}</td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{l.createdDate}</td>
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
