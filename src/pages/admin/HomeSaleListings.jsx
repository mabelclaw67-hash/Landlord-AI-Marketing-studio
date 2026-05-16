import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { isAdminSessionActive } from "../../utils/trialAccess";
import { formatSalePrice, getHomeSaleListings, getSuggestedSaleListingId, homeSaleSheetConfig } from "../../utils/homeSaleSheet";

export default function HomeSaleListings() {
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
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Sale Listings / 出售房源</h1>
          <p className="text-muted text-sm">Manage listings in {homeSaleSheetConfig.tabs.listings}</p>
        </div>
        <div className="flex gap-8">
          <Link to="/admin/home-sale/listings/new" className="btn btn--primary">
            + New Sale Listing / 新增出售房源
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
        <h4>Suggested Next ID / 建议编号</h4>
        <p>{loading ? "Loading…" : getSuggestedSaleListingId(listings)}</p>
      </div>

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
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            No sale listings found in the Google Sheet yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Listing ID</th>
                  <th>Property Address</th>
                  <th>City</th>
                  <th>Asking Price</th>
                  <th>Status</th>
                  <th>Property Type</th>
                  <th>Bedrooms</th>
                  <th>Bathrooms</th>
                  <th>Public Listing URL</th>
                  <th>Updated At</th>
                  <th>Actions</th>
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
                      <a href={item.publicListingUrl} target="_blank" rel="noreferrer">Open</a>
                    </td>
                    <td>{item.updatedAt || item.createdAt || "—"}</td>
                    <td>
                      <div className="flex gap-8">
                        <Link to={`/admin/home-sale/listings/${item.id}`} className="btn btn--ghost btn--sm">View</Link>
                        <Link to={`/admin/home-sale/listings/${item.id}/edit`} className="btn btn--ghost btn--sm">Edit</Link>
                        <a href={item.publicListingUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">Public Page</a>
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
