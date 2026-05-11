import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { t } from "../../translations";
import { getListings } from "../../utils/storage";

export default function Listings({ lang }) {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getListings()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{t(lang, "adminNav.listings")}</h1>
          <p className="text-muted text-sm">All saved listings / 所有已保存房源</p>
        </div>
        <Link to="/admin/new" className="btn btn--primary">+ {t(lang, "admin.newListing")}</Link>
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
