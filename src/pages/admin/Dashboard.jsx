import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getListings } from "../../utils/storage";
import { getHomeSaleListings } from "../../utils/homeSaleSheet";
import PrototypeBanner from "../../components/PrototypeBanner";
import ComingSoonSection from "../../components/ComingSoonSection";
import { useLang } from "../../contexts/LangContext";
import { AL, getStatusLabel } from "../../utils/adminLabels";
import { sortListingsNewestFirst } from "../../utils/listingSort";

// ── Status badge ──────────────────────────────────────────────────────────────
function statusBadge(status, lang) {
  const map = {
    Draft:              "badge--draft",
    "In Review":        "badge--review",
    "Ready to Publish": "badge--ready",
    Published:          "badge--published",
    Active:             "badge--published",
    "Open House":       "badge--ready",
    Pending:            "badge--review",
    Sold:               "badge--published",
    Archived:           "badge--draft",
  };
  return (
    <span className={`badge ${map[status] || "badge--draft"}`}>{getStatusLabel(status, lang)}</span>
  );
}

// ── Next-step derivation (uses only fields already present in listing data) ───

function getRentalNextStep(listing, L) {
  const s = listing.status || "Draft";
  if (s === "Published")
    return { label: L.nextStepMonitorApps, to: `/admin/listing/${listing.id}`, urgent: false };
  if (s === "Ready to Publish")
    return { label: L.nextStepPublishNow, to: `/admin/listing/${listing.id}`, urgent: true };
  if (s === "In Review")
    return { label: L.nextStepReviewPublish, to: `/admin/listing/${listing.id}`, urgent: true };
  // Draft: check content fields to find first incomplete step
  if (listing.adCopyEn)
    return { label: L.nextStepReviewPublish, to: `/admin/listing/${listing.id}`, urgent: false };
  if (listing.coverPhotoUrl)
    return { label: L.nextStepGenerateCopy, to: `/admin/listing/${listing.id}`, urgent: false };
  if (listing.address && listing.rent)
    return { label: L.nextStepUploadPhotos, to: `/admin/listing/${listing.id}`, urgent: false };
  return { label: L.nextStepCompleteDetails, to: "/admin/new", urgent: false };
}

function getSaleNextStep(listing, L) {
  const s = String(listing.status || "Draft");
  const sl = s.toLowerCase();
  if (["published", "active", "open house", "sold"].includes(sl))
    return {
      label: L.nextStepMonitorInquiries,
      to: `/admin/home-sale/buyer-inquiry/${listing.listingId}`,
      urgent: false,
    };
  if (sl === "ready to publish")
    return {
      label: L.nextStepPublishNow,
      to: `/admin/home-sale/review/${listing.listingId}`,
      urgent: true,
    };
  if (sl === "in review")
    return {
      label: L.nextStepReviewPublish,
      to: `/admin/home-sale/review/${listing.listingId}`,
      urgent: true,
    };
  // Draft: check content fields
  if (listing.videoUrl)
    return {
      label: L.nextStepReviewPublish,
      to: `/admin/home-sale/review/${listing.listingId}`,
      urgent: false,
    };
  if (listing.descriptionEn || listing.descriptionCn)
    return {
      label: L.nextStepCreateVideo,
      to: `/admin/home-sale/video/${listing.listingId}`,
      urgent: false,
    };
  if (listing.primaryPhotoUrl)
    return {
      label: L.nextStepGenerateCopy,
      to: `/admin/home-sale/marketing/${listing.listingId}`,
      urgent: false,
    };
  if (listing.address)
    return {
      label: L.nextStepUploadPhotos,
      to: `/admin/home-sale/media/${listing.listingId}`,
      urgent: false,
    };
  return {
    label: L.nextStepCompleteDetails,
    to: "/admin/home-sale/listings/new",
    urgent: false,
  };
}

// Higher = more urgency for "Recommended Next Step" ordering
function urgencyScore(listing) {
  const s = String(listing.status || "Draft").toLowerCase();
  if (s === "ready to publish") return 5;
  if (s === "in review") return 4;
  if (s === "draft") {
    // Within drafts: more progress = slightly higher score (closer to done)
    return (
      3 +
      (listing.address ? 0.1 : 0) +
      (listing.coverPhotoUrl || listing.primaryPhotoUrl ? 0.2 : 0) +
      (listing.adCopyEn || listing.descriptionEn || listing.descriptionCn ? 0.3 : 0)
    );
  }
  return 1; // Published / Active / Sold
}

// ── Listing card (used in My Listings section) ────────────────────────────────
function ListingCard({ listing, listingType, L, lang }) {
  const isRental = listingType === "rental";
  const nextStep = isRental
    ? getRentalNextStep(listing, L)
    : getSaleNextStep(listing, L);

  const detailTo = isRental
    ? `/admin/listing/${listing.id}`
    : `/admin/home-sale/listings/${listing.listingId}`;

  return (
    <div className="dash-listing-card">
      <div className="dash-listing-card__top">
        <div className="dash-listing-card__info">
          <div className="dash-listing-card__address">
            {listing.address || "—"}
          </div>
          <div className="dash-listing-card__meta">
            {listing.city && <span>{listing.city}</span>}
            {isRental && listing.rent && (
              <span>${Number(listing.rent).toLocaleString()}{L.perMonth}</span>
            )}
            {!isRental && listing.askingPrice && (
              <span>${Number(listing.askingPrice).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="dash-listing-card__badges">
          {statusBadge(listing.status || "Draft", lang)}
          <span
            className={`dash-listing-card__type-chip ${
              isRental
                ? "dash-listing-card__type-chip--rental"
                : "dash-listing-card__type-chip--sale"
            }`}
          >
            {isRental ? L.rentalListingStudioLabel : L.homeSaleStudioLabel}
          </span>
        </div>
      </div>

      <div className="dash-listing-card__next-row">
        <div className="dash-listing-card__next-text">
          <span className="dash-listing-card__next-prefix">
            {nextStep.urgent ? "⚡" : "→"}
          </span>{" "}
          {nextStep.label}
        </div>
        <div className="dash-listing-card__actions">
          <Link
            to={nextStep.to}
            className={`btn btn--sm ${
              nextStep.urgent ? "btn--primary" : "btn--ghost"
            }`}
          >
            {nextStep.label}
          </Link>
          <Link to={detailTo} className="btn btn--sm btn--ghost">
            {L.view}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Rental Dashboard view (at /admin/rental — unchanged from original) ────────
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
  const sortedListings = sortListingsNewestFirst(listings);

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
            <h4>{L.loadFailedRental}</h4>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏘️</div>
            <p style={{ color: "var(--color-text-muted)" }}>{L.noRentalListings}</p>
            <Link
              to="/admin/new"
              className="btn btn--primary"
              style={{ marginTop: 16, display: "inline-block" }}
            >
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
                {sortedListings.map((l) => (
                  <tr key={l.id}>
                    <td><code style={{ fontSize: "0.8rem" }}>{l.id}</code></td>
                    <td>{l.address}</td>
                    <td>{l.city}</td>
                    <td>${Number(l.rent).toLocaleString()}{L.perMonth}</td>
                    <td>{statusBadge(l.status, lang)}</td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{l.createdDate}</td>
                    <td>
                      <Link to={`/admin/listing/${l.id}`} className="btn btn--ghost btn--sm">
                        {L.view}
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

// ── Main Platform Dashboard (at /admin) ───────────────────────────────────────
export default function Dashboard({ lang, mode = "platform" }) {
  const resolvedLang = useLang() || lang;
  const L = AL[resolvedLang] ?? AL.en;
  const [rentalListings, setRentalListings] = useState([]);
  const [saleListings, setSaleListings] = useState([]);
  const [loading, setLoading] = useState(mode === "platform");
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (mode !== "platform") return;
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getListings().catch(() => []),
      getHomeSaleListings().catch(() => []),
    ])
      .then(([rentals, sales]) => {
        if (!mounted) return;
        setRentalListings(Array.isArray(rentals) ? rentals : []);
        setSaleListings(Array.isArray(sales) ? sales : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || L.loadFailedDashboard);
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

  // Combine listings from both studios into a unified list
  const rentalWithType = rentalListings.map((l) => ({
    ...l,
    _listingType: "rental",
    status: l.status || "Draft",
  }));
  const saleWithType = saleListings.map((l) => ({
    ...l,
    _listingType: "sale",
    status: l.status || "Draft",
  }));
  const allListings = sortListingsNewestFirst([...rentalWithType, ...saleWithType]);

  // Filter predicates
  const isDraft       = (l) => l.status === "Draft";
  const isInProgress  = (l) => ["In Review", "Ready to Publish"].includes(l.status);
  const isPublishedGr = (l) => ["Published", "Active", "Open House", "Pending", "Sold"].includes(l.status);

  const draftCount     = allListings.filter(isDraft).length;
  const inProgCount    = allListings.filter(isInProgress).length;
  const publishedCount = allListings.filter(isPublishedGr).length;

  const filteredListings = allListings.filter((l) => {
    if (filter === "draft")      return isDraft(l);
    if (filter === "inprogress") return isInProgress(l);
    if (filter === "published")  return isPublishedGr(l);
    return true;
  });

  // Recommended next step: pick the highest-urgency listing
  const topListing =
    allListings.length > 0
      ? [...allListings].sort((a, b) => urgencyScore(b) - urgencyScore(a))[0]
      : null;
  const topNextStep = topListing
    ? topListing._listingType === "rental"
      ? getRentalNextStep(topListing, L)
      : getSaleNextStep(topListing, L)
    : null;

  // Stats for the Advanced Tools section (kept from original)
  const rentalPublished = rentalListings.filter((l) => l.status === "Published").length;
  const saleDraft = saleListings.filter(
    (l) => !l.status || String(l.status).toLowerCase() === "draft"
  ).length;

  const filterTabs = [
    { key: "all",        label: L.filterAll,        count: allListings.length },
    { key: "draft",      label: L.filterDraft,       count: draftCount },
    { key: "inprogress", label: L.filterInProgress,  count: inProgCount },
    { key: "published",  label: L.filterPublished,   count: publishedCount },
  ];

  return (
    <div>
      <PrototypeBanner lang={resolvedLang} />

      {/* ── Section 1: Start New Listing ─────────────────────────────────── */}
      <div className="dash-start-hero">
        <div className="dash-start-hero__text">
          <h1 className="dash-start-hero__title">{L.startNewListing}</h1>
          <p className="dash-start-hero__hint">{L.startNewListingHint}</p>
        </div>
        <div className="dash-start-hero__btns">
          <Link to="/admin/new" className="dash-start-hero__btn dash-start-hero__btn--rental">
            <span className="dash-start-hero__btn-icon">🏘️</span>
            <span className="dash-start-hero__btn-label">{L.newRentalListingCta}</span>
          </Link>
          <Link
            to="/admin/home-sale/listings/new"
            className="dash-start-hero__btn dash-start-hero__btn--sale"
          >
            <span className="dash-start-hero__btn-icon">🏡</span>
            <span className="dash-start-hero__btn-label">{L.newSaleListingCta}</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="notice notice--error" style={{ marginBottom: 16 }}>
          <h4>{L.dashboardDataWarning}</h4>
          <p>{error}</p>
        </div>
      )}

      {/* ── Section 2: My Listings ───────────────────────────────────────── */}
      <div className="mb-24">
        <div className="dash-section-header">
          <h2 className="dash-section-title">{L.myListings}</h2>
          <div className="dash-filter-tabs">
            {filterTabs.map(({ key, label, count }) => (
              <button
                key={key}
                className={`dash-filter-tab${filter === key ? " dash-filter-tab--active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
                {count > 0 && (
                  <span className="dash-filter-tab__count">{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="dash-loading">{L.loading}</div>
        ) : filteredListings.length === 0 ? (
          <div className="dash-empty-state">
            <div className="dash-empty-state__icon">🏘️</div>
            <p className="dash-empty-state__text">
              {allListings.length === 0 ? L.dashNoListings : L.filterNoResults}
            </p>
            {allListings.length === 0 && (
              <p className="dash-empty-state__hint">{L.dashNoListingsHint}</p>
            )}
          </div>
        ) : (
          <div className="dash-listing-list">
            {filteredListings.map((l) => (
              <ListingCard
                key={
                  l._listingType === "rental"
                    ? `rental-${l.id}`
                    : `sale-${l.listingId}`
                }
                listing={l}
                listingType={l._listingType}
                L={L}
                lang={resolvedLang}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3: Recommended Next Step ────────────────────────────── */}
      {!loading && topListing && topNextStep && (
        <div className="dash-next-step-card mb-24">
          <div className="dash-next-step-card__eyebrow">⚡ {L.recommendedNextStep}</div>
          <div className="dash-next-step-card__body">
            <div>
              <div className="dash-next-step-card__listing">
                {topListing.address || "—"}
                <span className="dash-next-step-card__type">
                  {" · "}
                  {topListing._listingType === "rental"
                    ? L.rentalListingStudioLabel
                    : L.homeSaleStudioLabel}
                </span>
              </div>
              <div className="dash-next-step-card__action">{topNextStep.label}</div>
            </div>
            <Link to={topNextStep.to} className="btn btn--primary">
              {topNextStep.label} →
            </Link>
          </div>
        </div>
      )}

      {/* ── Section 4: Quick Access / Advanced Tools (collapsible) ──────── */}
      <div className="dash-advanced">
        <button
          className="dash-advanced__toggle"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
        >
          <span>{L.advancedTools}</span>
          <span className="dash-advanced__chevron" aria-hidden="true">
            {advancedOpen ? "▲" : "▼"}
          </span>
        </button>

        {advancedOpen && (
          <div className="dash-advanced__content">
            <div className="admin-module-grid" style={{ marginTop: 16 }}>
              <section className="card admin-module-card">
                <div className="admin-module-card__eyebrow">{L.rentalListingStudioLabel}</div>
                <h2>{L.rentalStudio}</h2>
                <p>{L.rentalStudioDesc}</p>
                <div className="admin-module-card__stats">
                  <div className="admin-module-card__stat">
                    <strong>{rentalListings.length}</strong>
                    <span>{L.rentalListingCount}</span>
                  </div>
                  <div className="admin-module-card__stat">
                    <strong>{rentalPublished}</strong>
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
                    <strong>{saleListings.length}</strong>
                    <span>{L.saleListingCount}</span>
                  </div>
                  <div className="admin-module-card__stat">
                    <strong>{saleDraft}</strong>
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
        )}
      </div>
    </div>
  );
}
