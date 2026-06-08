import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDailyMarketBrief } from "../utils/dailyMarketBrief";

const FIELDS = {
  en: [
    ["policySummary", "Policy Summary"],
    ["bcRentalSummary", "BC Rental Summary"],
    ["bcSaleSummary", "BC Sale Summary"],
    ["nanaimoRentalSummary", "Nanaimo Rental Summary"],
    ["nanaimoSaleSummary", "Nanaimo Sale Summary"],
    ["landlordActionNotes", "Landlord Action Notes"],
    ["websiteSummary", "Website Summary"],
  ],
  zh: [
    ["policySummary", "政策摘要"],
    ["bcRentalSummary", "BC 租赁市场"],
    ["bcSaleSummary", "BC 销售市场"],
    ["nanaimoRentalSummary", "楠奈莫租赁市场"],
    ["nanaimoSaleSummary", "楠奈莫销售市场"],
    ["landlordActionNotes", "房东操作建议"],
    ["websiteSummary", "平台动态"],
  ],
};

export default function DailyMarketBriefReport({ lang }) {
  const safeLang = lang === "zh" ? "zh" : "en";
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadBrief() {
      setLoading(true);
      setError("");
      try {
        const data = await getDailyMarketBrief();
        if (active) setBrief(data || null);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load daily market brief.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBrief();
    return () => { active = false; };
  }, []);

  return (
    <main className="website-report">
      <div className="website-report__inner">
        <Link to="/" className="website-report__back">
          {safeLang === "zh" ? "← 返回首页" : "← Back to Home"}
        </Link>

        {loading ? (
          <div className="website-report__panel">
            {safeLang === "zh" ? "正在加载每日简报..." : "Loading daily brief..."}
          </div>
        ) : error ? (
          <div className="website-report__panel website-report__panel--error">
            {safeLang === "zh" ? "每日简报暂时无法加载。" : "The daily brief cannot be loaded right now."}
          </div>
        ) : (
          <>
            <header className="website-report__header">
              <div className="website-report__meta">
                <span>{safeLang === "zh" ? "每日市场简报" : "Daily Market Brief"}</span>
                <span>{brief?.date}</span>
              </div>
              <h1>{brief?.title}</h1>
            </header>

            <article className="website-report__content">
              {(FIELDS[safeLang] || FIELDS.en).map(([key, label]) => (
                <section key={key}>
                  <h2>{label}</h2>
                  <p>{brief?.[key] || "—"}</p>
                </section>
              ))}
            </article>
          </>
        )}
      </div>
    </main>
  );
}
