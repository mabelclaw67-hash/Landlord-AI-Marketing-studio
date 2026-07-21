import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getRetirementBrief,
  field,
  roomType,
  classifySection,
  parseScore,
  parseConfidence,
} from "../utils/retirementBrief";
import ContentAccordion from "../components/ContentAccordion";

// Display blocks in page order (spec §1). Each raw "Report Section" variant is
// routed into one of these via classifySection(); intra-block order follows the
// global rank in classifySection() (spec §7), then AI score desc.
const BLOCKS = [
  ["top", "今日最佳退休生活推荐"],
  ["new", "新上市房源"],
  ["watch", "值得关注"],
  ["drop", "降价房源"],
  ["skip", "跳过 / 回避"],
];

// One label/value row. Hidden entirely when the value is empty — never renders
// an empty row and never fabricates "待确认" (spec §3).
function Field({ label, value }) {
  const v = field(value, "");
  if (!v) return null;
  return (
    <div className="rl-listing__row">
      <dt>{label}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function FieldGroup({ title, children }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  if (!rows || (Array.isArray(rows) && rows.length === 0)) return null;
  return (
    <div className="rl-listing__group">
      <p className="rl-listing__group-title">{title}</p>
      <dl className="rl-listing__grid">{rows}</dl>
    </div>
  );
}

function ListingCard({ listing }) {
  const score = parseScore(listing);
  const confidence = parseConfidence(listing);
  const bedBath = roomType(listing, "");
  const sqft = field(listing?.sqft, "");
  const petInfo = field(listing?.notes, "") || field(listing?.risk, "");
  const sourceUrl = field(listing?.sourceUrl, "");

  const chips = [
    field(listing?.region, ""),
    field(listing?.price, ""),
    score != null ? `AI评分 ${score}/100` : "",
    field(listing?.reportSection, ""),
  ].filter(Boolean);

  return (
    <div className="rl-listing">
      <h3 className="rl-listing__title">{field(listing?.address, "未命名房源")}</h3>
      {chips.length ? (
        <div className="rl-listing__chips">
          {chips.map((c, i) => (
            <span key={i} className="rl-listing__chip">{c}</span>
          ))}
        </div>
      ) : null}

      <FieldGroup title="基本信息">
        <Field key="mls" label="MLS" value={listing?.mls} />
        <Field key="room" label="户型" value={bedBath} />
        <Field key="year" label="建造年份" value={listing?.yearBuilt} />
        <Field key="sqft" label="面积" value={sqft ? `${sqft} sqft` : ""} />
        <Field key="strata" label="物业费" value={listing?.strataFee} />
        <Field key="ptype" label="房源类型" value={listing?.propertyType} />
        <Field key="dom" label="在售天数" value={listing?.daysOnMarket} />
        <Field key="pchange" label="价格变动" value={listing?.priceChange} />
      </FieldGroup>

      <FieldGroup title="配套与限制">
        <Field key="parking" label="停车与储物" value={listing?.parking} />
        <Field key="pet" label="宠物 / 出租 / 限制" value={petInfo} />
        <Field key="transit" label="公交与步行" value={listing?.transit} />
        <Field key="dist" label="距离 UVic / 医院" value={listing?.distanceUvicHospital} />
      </FieldGroup>

      <FieldGroup title="分析">
        <Field key="reason" label="推荐理由" value={listing?.aiReason} />
        <Field key="risk" label="风险与待确认" value={listing?.risk} />
        <Field key="conf" label="置信度" value={confidence} />
        <Field key="action" label="下一步" value={listing?.action} />
        <Field key="realtor" label="经纪跟进" value={listing?.realtorFollowup} />
      </FieldGroup>

      {sourceUrl ? (
        <div className="rl-listing__links">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rl-listing__link-btn"
          >
            查看房源 ↗
          </a>
        </div>
      ) : null}
    </div>
  );
}

// 今日总结: synthesized from the day's listings (spec §4) — never just the first
// record's AI Reason.
function computeDailySummary(listings) {
  if (!listings.length) return "今日暂无有效房源。";
  let top = 0, watch = 0, drop = 0;
  let best = null, bestScore = -1;
  listings.forEach((l) => {
    const c = classifySection(l);
    if (c.rank <= 2) top++;
    else if (c.block === "watch") watch++;
    else if (c.block === "drop") drop++;
    const sc = parseScore(l);
    if (sc != null && sc > bestScore) { bestScore = sc; best = l; }
  });
  const parts = [`今日共 ${listings.length} 套有效房源。`];
  const seg = [];
  if (top) seg.push(`${top} 套 Top Pick`);
  if (watch) seg.push(`${watch} 套 Worth Watching`);
  if (drop) seg.push(`${drop} 套 降价`);
  if (seg.length) parts.push(seg.join("，") + "。");
  if (best && bestScore >= 0) parts.push(`最高评分为 ${field(best.address, "")}，${bestScore}/100。`);
  parts.push("建议优先索取 strata 文件后安排看房。");
  return parts.join("");
}

function groupSummary(items) {
  if (!items.length) return "暂无房源";
  return items.map((l) => field(l?.address, "未命名房源")).join("、");
}

export default function RetirementLivingBriefReport() {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null); // null = latest

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getRetirementBrief(selectedDate || undefined);
        if (active) setBrief(data || null);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load retirement living brief.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [selectedDate]);

  // Flat listings for the selected day (backend also keeps `sections` for the
  // homepage card). Fall back to flattening sections for backward compatibility.
  const listings = Array.isArray(brief?.listings)
    ? brief.listings
    : Object.values(brief?.sections || {}).flat().filter(Boolean);

  const availableDates = Array.isArray(brief?.availableDates) ? brief.availableDates : [];
  const currentDate = selectedDate || field(brief?.date, "");

  // Bucket + sort (rank asc, then AI score desc). No-score items sort last.
  const grouped = { top: [], new: [], watch: [], drop: [], skip: [] };
  listings.forEach((l) => {
    const c = classifySection(l);
    grouped[c.block].push({ listing: l, rank: c.rank, score: parseScore(l) });
  });
  Object.keys(grouped).forEach((k) => {
    grouped[k].sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const sa = a.score == null ? -1 : a.score;
      const sb = b.score == null ? -1 : b.score;
      return sb - sa;
    });
  });

  const dailySummary = computeDailySummary(listings);

  // 下一步建议: one entry per listing (spec §5), not a single run-on paragraph.
  const nextSteps = listings
    .filter((l) => field(l?.action, "") || field(l?.realtorFollowup, ""))
    .map((l) => ({
      address: field(l?.address, "未命名房源"),
      action: field(l?.action, ""),
      followup: field(l?.realtorFollowup, ""),
    }));

  return (
    <main className="website-report">
      <div className="website-report__inner">
        <Link to="/" className="website-report__back">← 返回首页</Link>

        {loading && !brief ? (
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
                <span>{field(brief?.date, "")}</span>
              </div>
              <h1>{field(brief?.cardTitle, "退休生活房源简报")}</h1>
              {availableDates.length > 1 ? (
                <div className="rl-datepicker">
                  <label htmlFor="rl-date">选择日期：</label>
                  <select
                    id="rl-date"
                    value={currentDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    disabled={loading}
                  >
                    {availableDates.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {loading ? <span className="rl-datepicker__loading">加载中…</span> : null}
                </div>
              ) : null}
            </header>

            <article className="website-report__content">
              {/* 1. 今日总结 */}
              <ContentAccordion
                title="今日总结"
                summary={dailySummary}
                defaultOpen
                className="website-report__section"
              >
                <p>{dailySummary}</p>
              </ContentAccordion>

              {/* 2–5. 房源分区 */}
              {BLOCKS.map(([block, label]) => {
                const items = grouped[block].map((x) => x.listing);
                return (
                  <ContentAccordion
                    key={block}
                    title={`${label}${items.length ? ` (${items.length})` : ""}`}
                    summary={groupSummary(items)}
                    defaultOpen={block === "top" && items.length > 0}
                    className="website-report__section"
                  >
                    {items.length ? (
                      items.map((listing, i) => (
                        <ListingCard key={`${block}-${i}`} listing={listing} />
                      ))
                    ) : (
                      <p className="rl-listing__empty">暂无房源</p>
                    )}
                  </ContentAccordion>
                );
              })}

              {/* 6. 下一步建议 */}
              <ContentAccordion
                title="下一步建议"
                summary={nextSteps.length ? `${nextSteps.length} 条待办` : "暂无"}
                defaultOpen={false}
                className="website-report__section"
              >
                {nextSteps.length ? (
                  <ul className="rl-nextsteps">
                    {nextSteps.map((s, i) => (
                      <li key={i} className="rl-nextsteps__item">
                        <strong>{s.address}</strong>
                        <ul>
                          {s.action ? <li>{s.action}</li> : null}
                          {s.followup ? <li>经纪跟进：{s.followup}</li> : null}
                        </ul>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rl-listing__empty">暂无</p>
                )}
              </ContentAccordion>
            </article>
          </>
        ) : null}
      </div>
    </main>
  );
}
