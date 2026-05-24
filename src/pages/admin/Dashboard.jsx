import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getListings } from "../../utils/storage";
import { getHomeSaleListings } from "../../utils/homeSaleSheet";
import PrototypeBanner from "../../components/PrototypeBanner";
import ComingSoonSection from "../../components/ComingSoonSection";
import { useLang } from "../../contexts/LangContext";
import { AL } from "../../utils/adminLabels";

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
  const L = AL[lang] ?? AL.en;

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
    { key: "draft",     label: L.kpiDraft,     val: counts.Draft },
    { key: "review",    label: L.kpiReview,    val: counts["In Review"] },
    { key: "ready",     label: L.kpiReady,     val: counts["Ready to Publish"] },
    { key: "published", label: L.kpiPublished, val: counts.Published },
  ];

  return (
    <div>
      <PrototypeBanner lang={lang} />

      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{L.rentalDashboardTitle}</h1>
          <p className="text-muted text-sm">{L.rentalDashboardDesc}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/admin/new" className="btn btn--primary">{L.newRentalListingBtn}</Link>
          <Link to="/admin/listings" className="btn btn--ghost">{L.rentalListingsBtn}</Link>
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
            {L.loading}
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load rental listings</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏘️</div>
            <p style={{ color: "var(--color-text-muted)" }}>{L.noRentalListings}</p>
            <Link to="/admin/new" className="btn btn--primary" style={{ marginTop: 16, display: "inline-block" }}>
              {L.newRentalListingBtn}
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{L.colListingId}</th>
                  <th>{L.colAddress}</th>
                  <th>{L.colCity}</th>
                  <th>{L.colRent}</th>
                  <th>{L.colStatus}</th>
                  <th>{L.colCreated}</th>
                  <th>{L.colAction}</th>
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
                      <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">{L.view}</Link>
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
  const resolvedLang = useLang() || lang;
  const L = AL[resolvedLang] ?? AL.en;
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
    return <RentalDashboardView lang={resolvedLang} />;
  }

  const rentalPublished = rentalListings.filter((item) => item.status === "Published").length;
  const saleDraft = saleListings.filter((item) => !item.status || String(item.status).toLowerCase() === "draft").length;

  return (
    <div>
      <PrototypeBanner lang={resolvedLang} />

      <div className="mb-24">
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{L.adminDashboard}</h1>
        <p className="text-muted text-sm">{L.adminDashboardDesc}</p>
      </div>

      {error && (
        <div className="notice notice--error" style={{ marginBottom: 16 }}>
          <h4>Dashboard data warning</h4>
          <p>{error}</p>
        </div>
      )}

      <div className="admin-module-grid">
        <section className="card admin-module-card">
          <div className="admin-module-card__eyebrow">{L.rentalListingStudioLabel}</div>
          <h2>{L.rentalStudio}</h2>
          <p>{L.rentalStudioDesc}</p>
          <div className="admin-module-card__stats">
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : rentalListings.length}</strong>
              <span>{L.rentalListingCount}</span>
            </div>
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : rentalPublished}</strong>
              <span>{L.published}</span>
            </div>
          </div>
          <div className="admin-module-card__actions">
            <Link to="/admin/rental" className="btn btn--primary">{L.openRentalDashboard}</Link>
            <Link to="/admin/new" className="btn btn--ghost">{L.newRentalListing}</Link>
            <Link to="/admin/listings" className="btn btn--ghost">{L.rentalListings}</Link>
          </div>
        </section>

        <section className="card admin-module-card admin-module-card--soft">
          <div className="admin-module-card__eyebrow">{L.homeSaleStudioLabel}</div>
          <h2>{L.homeSaleStudio}</h2>
          <p>{L.homeSaleStudioDesc}</p>
          <div className="admin-module-card__stats">
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : saleListings.length}</strong>
              <span>{L.saleListingCount}</span>
            </div>
            <div className="admin-module-card__stat">
              <strong>{loading ? "—" : saleDraft}</strong>
              <span>{L.draft}</span>
            </div>
          </div>
          <div className="admin-module-card__actions">
            <Link to="/admin/home-sale" className="btn btn--primary">{L.openHomeSaleDashboard}</Link>
            <Link to="/admin/home-sale/listings/new" className="btn btn--ghost">{L.newSaleListing}</Link>
            <Link to="/admin/home-sale/listings" className="btn btn--ghost">{L.saleListings}</Link>
          </div>
        </section>
      </div>

      <ComingSoonSection />
    </div>
  );
}
