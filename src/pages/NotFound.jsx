import { Link } from "react-router-dom";

const COPY = {
  en: {
    code: "404",
    title: "Page not found",
    body: "The page you are looking for does not exist or has been moved.",
    home: "Go to Home",
    rentals: "View Rental Listings",
  },
  zh: {
    code: "404",
    title: "页面不存在",
    body: "您访问的页面不存在，或已被移动。",
    home: "返回首页",
    rentals: "查看出租房源",
  },
};

export default function NotFound({ lang }) {
  const copy = COPY[lang === "zh" ? "zh" : "en"];
  return (
    <div className="page-wrapper" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div className="card" style={{ maxWidth: 520, width: "100%", textAlign: "center", padding: "40px 24px" }}>
        <p style={{ fontSize: "2.6rem", fontWeight: 800, color: "var(--color-primary)", margin: 0 }}>{copy.code}</p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "8px 0 10px" }}>{copy.title}</h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 24 }}>{copy.body}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" className="btn btn--primary">{copy.home}</Link>
          <Link to="/rentals" className="btn btn--ghost">{copy.rentals}</Link>
        </div>
      </div>
    </div>
  );
}
