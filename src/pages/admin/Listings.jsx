import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getListings } from "../../utils/storage";
import { useLang } from "../../contexts/LangContext";
import { AL, getStatusLabel } from "../../utils/adminLabels";
import { getRentalNextStepInfo } from "../../components/ListingStatusBanner";
import { sortListingsNewestFirst } from "../../utils/listingSort";

export default function Listings() {
  const lang = useLang();
  const L = AL[lang] ?? AL.en;
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState("all");
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

  // Filter logic
  const IN_PROGRESS_STATUSES = ["In Review", "Ready to Publish"];
  const sortedListings = sortListingsNewestFirst(listings);
  const filtered = sortedListings.filter((l) => {
    if (filter === "all")        return true;
    if (filter === "draft")      return (l.status || "Draft") === "Draft";
    if (filter === "inprogress") return IN_PROGRESS_STATUSES.includes(l.status);
    if (filter === "published")  return l.status === "Published";
    return true;
  });

  // Count helpers
  const counts = {
    all:        listings.length,
    draft:      listings.filter((l) => (l.status || "Draft") === "Draft").length,
    inprogress: listings.filter((l) => IN_PROGRESS_STATUSES.includes(l.status)).length,
    published:  listings.filter((l) => l.status === "Published").length,
  };

  const FILTER_TABS = [
    { key: "all",        label: L.filterAll,        count: counts.all },
    { key: "draft",      label: L.filterDraft,       count: counts.draft },
    { key: "inprogress", label: L.filterInProgress,  count: counts.inprogress },
    { key: "published",  label: L.filterPublished,   count: counts.published },
  ];

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{L.rentalListingsTitle}</h1>
        </div>
        <Link to="/admin/new" className="btn btn--primary">{L.newRentalListingBtn}</Link>
      </div>

      {/* Status filter tabs */}
      {!loading && !error && listings.length > 0 && (
        <div className="dash-filter-tabs" style={{ marginBottom: 16 }}>
          {FILTER_TABS.map(({ key, label, count }) => (
            <button
              key={key}
              className={`dash-filter-tab${filter === key ? " dash-filter-tab--active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
              {count > 0 && <span className="dash-filter-tab__count">{count}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            {L.loading}
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>{L.loadFailedListings}</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p className="text-muted">{L.noListings}</p>
            <Link to="/admin/new" className="btn btn--primary" style={{ marginTop: 16, display: "inline-block" }}>
              {L.newRentalListingBtn}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            {L.filterNoResults || "No listings match this filter."}
          </div>
        ) : isMobile ? (
          /* Mobile card view */
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filtered.map((l, idx) => {
              const next = getRentalNextStepInfo(l, L);
              return (
                <div
                  key={l.id}
                  style={{
                    padding: "16px",
                    borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", flex: 1, marginRight: 8 }}>
                      {l.address}
                    </div>
                    <span className={`badge ${statusClass[l.status] || "badge--draft"}`} style={{ flexShrink: 0 }}>
                      {getStatusLabel(l.status, lang)}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 4 }}>
                    {l.city} · ${Number(l.rent || 0).toLocaleString()}{L.perMonth}
                  </div>

                  {/* Next step chip */}
                  <div style={{
                    fontSize: "0.78rem", color: "#78716c",
                    marginBottom: 10, display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ color: next.urgent ? "#d97706" : "var(--color-text-muted)" }}>→</span>
                    <span style={{ fontWeight: 600, color: next.urgent ? "#92400e" : "var(--color-text-muted)" }}>
                      {L.listNextStep}:
                    </span>
                    <span>{next.label}</span>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Link to={next.to} className={`btn btn--sm ${next.urgent ? "btn--primary" : "btn--ghost"}`}>
                      {next.label} →
                    </Link>
                    <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">
                      {L.view}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop table view (unchanged) */
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{L.colListingId}</th>
                  <th>{L.colAddress}</th>
                  <th>{L.colCity}</th>
                  <th>{L.colRent}</th>
                  <th>{L.colStatus}</th>
                  <th>{L.listNextStep || "Next Step"}</th>
                  <th>{L.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const next = getRentalNextStepInfo(l, L);
                  return (
                    <tr key={l.id}>
                      <td><code style={{ fontSize: "0.8rem" }}>{l.id}</code></td>
                      <td>{l.address}</td>
                      <td>{l.city}</td>
                      <td>${Number(l.rent || 0).toLocaleString()}{L.perMonth}</td>
                      <td><span className={`badge ${statusClass[l.status] || "badge--draft"}`}>{getStatusLabel(l.status, lang)}</span></td>
                      <td>
                        <Link
                          to={next.to}
                          className="btn btn--ghost btn--sm"
                          style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}
                        >
                          {next.label} →
                        </Link>
                      </td>
                      <td>
                        <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">
                          {L.view}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
