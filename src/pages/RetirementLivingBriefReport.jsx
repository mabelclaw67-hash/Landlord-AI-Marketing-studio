import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getRetirementBrief,
  field,
  roomType,
  strategyScore,
} from "../utils/retirementBrief";

const TODO = "待确认"; // shown for genuinely missing fields (never fabricate)

// Region: use explicit field, else the parenthetical hint inside the address
// (traceable to source data), else 待确认.
function region(listing) {
  const explicit = field(listing?.region, "");
  if (explicit) return explicit;
  const m = String(listing?.address || "").match(/[（(]([^）)]+)[）)]/);
  return m ? m[1].trim() : TODO;
}

function ListingCard({ listing }) {
  const rows = [
    ["地址", field(listing?.address, TODO)],
    ["区域", region(listing)],
    ["价格", field(listing?.price, TODO)],
    ["年份", field(listing?.yearBuilt, TODO)],
    ["房型（2房/2卫）", roomType(listing, TODO)],
    ["面积", field(listing?.sqft, TODO) === TODO ? TODO : `${field(listing?.sqft, TODO)} sqft`],
    ["Strata Fee", field(listing?.strataFee, TODO)],
    ["距 UVic / Downtown / 医疗", field(listing?.distanceUvicHospital, field(listing?.transit, TODO))],
    ["交通说明", field(listing?.transit, TODO)],
    ["退休策略评分", strategyScore(listing)],
    ["适合退休生活原因", field(listing?.aiReason, TODO)],
    ["适合出租原因", field(listing?.rentReason, TODO)],
    ["风险提示", field(listing?.risk, TODO)],
    ["AI Rating", field(listing?.aiRating, TODO)],
    ["Action", field(listing?.action, TODO)],
  ];
  const source = field(listing?.sourceLink, "");

  return (
    <div className="rl-listing">
      <h3 className="rl-listing__title">{field(listing?.address, TODO)}</h3>
      <dl className="rl-listing__grid">
        {rows.map(([label, value]) => (
          <div key={label} className="rl-listing__row">
            <dt>{label}</dt>
            <dd className={value === TODO ? "rl-listing__todo" : ""}>{value}</dd>
          </div>
        ))}
      </dl>
      {source ? (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="rl-listing__source"
        >
          Source Link ↗
        </a>
      ) : (
        <span className="rl-listing__todo">Source Link {TODO}</span>
      )}
    </div>
  );
}

export default function RetirementLivingBriefReport() {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getRetirementBrief();
        if (active) setBrief(data || null);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load retirement living brief.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const sections = brief?.sections || {};
  const titles = brief?.sectionTitles || {};
  const reportUrl = field(brief?.reportDocUrl, "");

  // Detail order per spec (Price Drops / New Listings included so no data is lost).
  const ORDER = [
    ["Best Opportunity", "今日最佳退休生活推荐"],
    ["New Listings", "新上市房源"],
    ["Worth Watching", "值得关注"],
    ["Price Drops", "降价房源"],
    ["Skip / Avoid", "跳过 / 回避"],
  ];

  // 下一步建议: synthesized from each Strong Match / Best Opportunity action.
  const nextSteps = Object.values(sections)
    .flat()
    .filter((l) => l && field(l.action, "") && field(l.action, "").toLowerCase() !== "skip")
    .map((l) => ({ address: field(l.address, TODO), action: field(l.action, TODO) }));

  return (
    <main className="website-report">
      <div className="website-report__inner">
        <Link to="/" className="website-report__back">← 返回首页</Link>

        {loading ? (
          <div className="website-report__panel">正在加载退休生活房源简报...</div>
        ) : error ? (
          <div className="website-report__panel website-report__panel--error">
            退休生活房源简报暂时无法加载。
          </div>
        ) : brief ? (
          <>
            <header className="website-report__header">
              <div className="website-report__meta">
                <span>退休生活房源简报</span>
                <span>{field(brief?.date, TODO)}</span>
              </div>
              <h1>{field(brief?.cardTitle, "退休生活房源简报")}</h1>
              {field(brief?.rankingNote, "") ? (
                <p>{brief.rankingNote}</p>
              ) : null}
              {reportUrl ? (
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lh-btn lh-btn--sand rl-report-btn"
                >
                  打开完整中文报告 ↗
                </a>
              ) : null}
            </header>

            <article className="website-report__content">
              {/* 1. 今日总结 */}
              <section className="website-report__section">
                <h2>今日总结</h2>
                <p>{field(brief?.dailySummary, TODO)}</p>
              </section>

              {/* 2–5. 房源分区 */}
              {ORDER.map(([key, fallbackLabel]) => {
                const items = Array.isArray(sections[key]) ? sections[key] : [];
                const label = field(titles[key], fallbackLabel);
                return (
                  <section key={key} className="website-report__section">
                    <h2>{label}</h2>
                    {items.length ? (
                      items.map((listing, i) => (
                        <ListingCard key={`${key}-${i}`} listing={listing} />
                      ))
                    ) : (
                      <p className="rl-listing__todo">暂无房源</p>
                    )}
                  </section>
                );
              })}

              {/* 6. 下一步建议 */}
              <section className="website-report__section">
                <h2>下一步建议</h2>
                {nextSteps.length ? (
                  <ul className="rl-nextsteps">
                    {nextSteps.map((s, i) => (
                      <li key={i}><strong>{s.address}</strong> — {s.action}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="rl-listing__todo">{TODO}</p>
                )}
              </section>
            </article>

            {reportUrl ? (
              <div className="lh-daily-brief__actions">
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lh-btn lh-btn--sand"
                >
                  打开完整中文报告 ↗
                </a>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
