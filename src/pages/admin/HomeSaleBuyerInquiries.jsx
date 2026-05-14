import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeSaleListings } from "../../utils/homeSaleSheet";

export default function HomeSaleBuyerInquiries() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHomeSaleListings()
      .then(setListings)
      .catch((e) => setError(e.message || "Failed to load sale listings."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Buyer Inquiries / 买家咨询</h1>
          <p className="text-muted text-sm">从这里进入各出售房源的买家咨询页面 / Open buyer inquiry pages by sale listing</p>
        </div>
        <Link to="/admin/home-sale" className="btn btn--ghost">Home Sale Dashboard / 出售后台</Link>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading buyer inquiry routes…
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load buyer inquiry routes</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>💬</div>
            <p className="text-muted">No sale listings available for buyer inquiry yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Listing ID</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id}>
                    <td><code style={{ fontSize: "0.8rem" }}>{item.id}</code></td>
                    <td>{item.address || "Pending"}</td>
                    <td>{item.city || "Pending"}</td>
                    <td>{item.status || "Draft"}</td>
                    <td>
                      <Link to={`/admin/home-sale/buyer-inquiry/${item.id}`} className="btn btn--ghost btn--sm">
                        Open Buyer Inquiry / 打开买家咨询
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
