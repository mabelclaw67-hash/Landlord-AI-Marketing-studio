import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { isAdminSessionActive } from "../../utils/trialAccess";
import { formatSalePrice, getHomeSaleListings, getSuggestedSaleListingId, homeSaleSheetConfig } from "../../utils/homeSaleSheet";
import { useLang } from "../../contexts/LangContext";
import { AL } from "../../utils/adminLabels";

export default function HomeSaleListings() {
  const lang = useLang();
  const L = AL[lang] ?? AL.en;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHomeSaleListings()
      .then(setListings)
      .catch((err) => setError(err.message || "Failed to load Home Sale listings."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{L.saleListingsTitle}</h1>
          <p className="text-muted text-sm">Manage listings in {homeSaleSheetConfig.tabs.listings}</p>
        </div>
        <div className="flex gap-8">
          <Link to="/admin/home-sale/listings/new" className="btn btn--primary">
            {L.newSaleListingBtn}
          </Link>
          {isAdminSessionActive() && (
            <a href={homeSaleSheetConfig.spreadsheetUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">
              Open Sale Database
            </a>
          )}
        </div>
      </div>

      <HomeSaleWorkflowNav />

      <div className="notice notice--sage">
        <h4>Suggested Next ID</h4>
        <p>{loading ? L.loading : getSuggestedSaleListingId(listings)}</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            {L.loading}
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load sale listings</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            {L.noListings}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{L.colListingId}</th>
                  <th>{L.colAddress}</th>
                  <th>{L.colCity}</th>
                  <th>Asking Price</th>
                  <th>{L.colStatus}</th>
                  <th>Property Type</th>
                  <th>Bedrooms</th>
                  <th>Bathrooms</th>
                  <th>Public Listing URL</th>
                  <th>Updated At</th>
                  <th>{L.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id}>
                    <td><code>{item.id}</code></td>
                    <td>{item.address || "Pending"}</td>
                    <td>{item.city || "Pending"}</td>
                    <td>{formatSalePrice(item.askingPrice)}</td>
                    <td><span className="badge badge--draft">{item.status || "Draft"}</span></td>
                    <td>{item.propertyType || "Pending"}</td>
                    <td>{item.bedrooms || "—"}</td>
                    <td>{item.bathrooms || "—"}</td>
                    <td>
                      <a href={item.publicListingUrl} target="_blank" rel="noreferrer">{L.open}</a>
                    </td>
                    <td>{item.updatedAt || item.createdAt || "—"}</td>
                    <td>
                      <div className="flex gap-8">
                        <Link to={`/admin/home-sale/listings/${item.id}`} className="btn btn--ghost btn--sm">{L.view}</Link>
                        <Link to={`/admin/home-sale/listings/${item.id}/edit`} className="btn btn--ghost btn--sm">{L.edit}</Link>
                        <a href={item.publicListingUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">{L.viewPublicPage}</a>
                      </div>
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
