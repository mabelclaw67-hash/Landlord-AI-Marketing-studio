import { Link } from "react-router-dom";
import Footer from "../components/Footer";

const LISTING_PATH = "/listings/LST-2026-002";

const APP_CARDS = [
  {
    icon: "🏠",
    title: "Current Rental Listing",
    ch: "查看当前房源",
    to: LISTING_PATH,
  },
  {
    icon: "📋",
    title: "Apply Online",
    ch: "在线申请",
    to: LISTING_PATH,
  },
  {
    icon: "📞",
    title: "Contact Mabel",
    ch: "联系 Mabel",
    to: "/contact",
  },
];

export default function Home() {
  return (
    <div className="page-wrapper">
      {/* Hero */}
      <section className="hero">
        <div className="hero__badge">🇨🇦 Vancouver Island · BC</div>
        <h1 className="hero__title">Vanisland Rental Listings</h1>
        <p className="hero__subtitle">View current rental listings and apply online.</p>
        <p className="hero__sub2">查看当前招租房源并在线申请。</p>
        <div className="hero__actions">
          <Link to={LISTING_PATH} className="btn btn--accent">View Current Rental Listing</Link>
          <Link to={LISTING_PATH} className="btn btn--outline">Apply Online</Link>
        </div>
      </section>

      {/* App-style cards */}
      <section className="section">
        <div className="container">
          <div className="grid-3">
            {APP_CARDS.map(({ icon, title, ch, to }) => (
              <Link
                key={title}
                to={to}
                style={{ textDecoration: "none" }}
              >
                <div className="card card--hover" style={{ textAlign: "center", padding: "32px 20px", cursor: "pointer" }}>
                  <div style={{ fontSize: "2.4rem", marginBottom: 12 }}>{icon}</div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>{title}</h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{ch}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
