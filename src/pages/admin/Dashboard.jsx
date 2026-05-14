import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getListings } from "../../utils/storage";
import { getHomeSaleListings } from "../../utils/homeSaleSheet";
import PrototypeBanner from "../../components/PrototypeBanner";

function statusBadge(status) {
  const map = {
    Draft: "badge--draft",
    "In Review": "badge--review",
    "Ready to Publish": "badge--ready",
    Published: "badge--published",
  };
  return <span className={`badge ${map[status] || "badge--draft"}`}>{status}</span>;
}

function RentalDashboardView({ lang }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    setError(null);
    getListings()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location.key]);

  const counts = { Draft: 0, "In Review": 0, "Ready to Publish": 0, Published: 0 };
  listings.forEach((l) => {
    if (counts[l.status] !== undefined) counts[l.status]++;
  });

  const kpis = [
    { key: "draft", label: "Draft / 草稿", val: counts.Draft },
    { key: "review", label: "In Review / 审核中", val: counts["In Review"] },
    { key: "ready", label: "Ready / 待发布", val: counts["Ready to Publish"] },
    { key: "published", label: "Published / 已发布", val: counts.Published },
  ];

  return (
    <div>
      <PrototypeBanner lang={lang} />

      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Rental Dashboard / 出租后台</h1>
          <p className="text-muted text-sm">管理出租房源营销工作流 / Manage the rental listing marketing workflow</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/admin/new" className="btn btn--primary">+ New Rental Listing / 新增出租房源</Link>
          <Link to="/admin/listings" className="btn btn--ghost">Rental Listings / 出租房源列表</Link>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map(({ key, label, val }) => (
          <div key={key} className="kpi-card">
            <div className="kpi-card__number">{loading ? "—" : val}</div>
            <div className="kpi-card__label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading rental listings…
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load rental listings</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏘️</div>
            <p style={{ color: "var(--color-text-muted)" }}>No rental listings yet / 暂无出租房源</p>
            <Link to="/admin/new" className="btn btn--primary" style={{ marginTop: 16, display: "inline-block" }}>
              + New Rental Listing / 新增出租房源
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
                  <th>Rent</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
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
                      <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">View</Link>
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

export default function Dashboard({ lang, mode = "platform" }) {
  const [rentalListings, setRentalListings] = useState([]);
  const [saleListings, setSaleListings] = useState([]);
  const [loading, setLoading] = useState(mode === "platform");
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (mode !== "platform") return;
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([getListings().catch(() => []), getHomeSaleListings().catch(() => [])])
      .then(([rentals, sales]) => {
        if (!mounted) return;
        setRentalListings(Array.isArray(rentals) ? rentals : []);
        setSaleListings(Array.isArray(sales) ? sales : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || "Failed to load platform dashboard.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [mode, location.key]);

  if (mode === "rental") {
    return <RentalDashboardView lang={lang} />;
  }

  const rentalPublished = rentalListings.filter((item) => item.status === "Published").length;
  const saleDraft = saleListings.filter((item) => !item.status || String(item.status).toLowerCase() === "draft").length;

  return (
    <div>
      <PrototypeBanner lang={lang} />

      <div className="mb-24">
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Admin Dashboard / 管理后台</h1>
        <p className="text-muted text-sm">
          Manage Rental Studio and Home Sale Studio from one place.
          <br />
          统一管理出租房源与出售房源营销工作流。
        </p>
      </div>

      {error && (
        <div className="notice notice--error" style={{ marginBottom: 16 }}>
          <h4>Dashboard data warning</h4>
          <p>{error}</p>
        </div>
      )}

      <div className="admin-module-grid">
        <section className="card admin-module-card">
          <div className="admin-module-card__eyebrow">RENTAL STUDIO / 出租房源</div>
          <h2>Rental Listing Studio / 出租房源工作台</h2>
          <p>
            Manage rental listings, rental applications, marketing copy, photos, videos, QR codes, and publish workflow.
            <br />
            管理出租房源、租客申请、营销文案、照片、视频、二维码和发布流程。
          </p>
          <div className="admin-module-card__stats">
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : rentalListings.length}</strong>
              <span>Rental Listings / 出租房源</span>
            </div>
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : rentalPublished}</strong>
              <span>Published / 已发布</span>
            </div>
          </div>
          <div className="admin-module-card__actions">
            <Link to="/admin/rental" className="btn btn--primary">Open Rental Dashboard / 打开出租后台</Link>
            <Link to="/admin/new" className="btn btn--ghost">New Rental Listing / 新增出租房源</Link>
            <Link to="/admin/listings" className="btn btn--ghost">Rental Listings / 出租房源列表</Link>
          </div>
        </section>

        <section className="card admin-module-card admin-module-card--soft">
          <div className="admin-module-card__eyebrow">HOME SALE STUDIO / 出售房源</div>
          <h2>Home Sale Studio / 出售房源工作台</h2>
          <p>
            Manage sale listings, buyer inquiries, marketing copy, photos, videos, QR codes, open house, and publish workflow.
            <br />
            管理出售房源、买家咨询、营销文案、照片、视频、二维码、开放日和发布流程。
          </p>
          <div className="admin-module-card__stats">
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : saleListings.length}</strong>
              <span>Sale Listings / 出售房源</span>
            </div>
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : saleDraft}</strong>
              <span>Draft / 草稿</span>
            </div>
          </div>
          <div className="admin-module-card__actions">
            <Link to="/admin/home-sale" className="btn btn--primary">Open Home Sale Dashboard / 打开出售后台</Link>
            <Link to="/admin/home-sale/listings/new" className="btn btn--ghost">New Sale Listing / 新增出售房源</Link>
            <Link to="/admin/home-sale/listings" className="btn btn--ghost">Sale Listings / 出售房源列表</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
