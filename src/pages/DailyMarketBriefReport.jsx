import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDailyMarketBrief, parseDailyMarketBrief } from "../utils/dailyMarketBrief";
import ContentAccordion from "../components/ContentAccordion";

function isReportSubheading(line) {
  return line.length <= 100 && (
    /[:：]$/.test(line)
    || /^(North Nanaimo \/ Country Club|Departure Bay|South Nanaimo \/ Hospital \/ Pleasant Valley|Downtown|Lantzville|Ladysmith|新增供应|优惠 Incentives|Days on Market)$/i.test(line)
  );
}

function ReportLines({ lines, className = "" }) {
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const blocks = [];
  let list = [];
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: "list", lines: list });
      list = [];
    }
  };

  lines.forEach((line) => {
    if (isReportSubheading(line)) {
      flushList();
      blocks.push({ type: "heading", line: line.replace(/[:：]$/, "") });
    } else {
      list.push(line.replace(/^[-•]\s*/, ""));
    }
  });
  flushList();

  return (
    <div className={`website-report__structured-body ${className}`.trim()}>
      {blocks.map((block, index) => block.type === "heading" ? (
        <h3 key={`${index}-${block.line}`}>{block.line}</h3>
      ) : (
        <ul key={`${index}-list`} className="website-report__list">
          {block.lines.map((line, lineIndex) => <li key={`${lineIndex}-${line}`}>{line}</li>)}
        </ul>
      ))}
    </div>
  );
}

function SectionHeading({ section, lang }) {
  return <h2>{lang === "zh" ? section.titleZh : section.titleEn}</h2>;
}

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

  useEffect(() => {
    if (loading || error || !window.location.hash) return;
    var target = document.getElementById(window.location.hash.slice(1));
    if (target) target.scrollIntoView({ block: "start" });
  }, [loading, error]);

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
              {parseDailyMarketBrief(brief).sections.map((section) => (
                <section key={section.id} id={section.id} className="website-report__structured-section">
                  <SectionHeading section={section} lang={safeLang} />
                  {section.id === "marketplace" ? (
                    <>
                      <ReportLines lines={section.introLines} />
                      {section.subsections.map((subsection) => (
                        <div key={subsection.id} className="website-report__structured-subsection">
                          <h3>{safeLang === "zh" ? subsection.titleZh : subsection.titleEn}</h3>
                          <ReportLines lines={subsection.lines} />
                        </div>
                      ))}
                    </>
                  ) : (
                    <ReportLines
                      lines={section.lines}
                      className={section.id === "sources" ? "website-report__sources" : ""}
                    />
                  )}
                </section>
              ))}
              {brief?.fullContent ? (
                <ContentAccordion
                  key="fullContent"
                  id="fullContent"
                  title={safeLang === "zh" ? "报告原文" : "Source Report"}
                  summary={safeLang === "zh" ? "展开后查看 Google Doc 原始全文" : "Open to view the original Google Doc text"}
                  defaultOpen={false}
                  className="website-report__section website-report__raw-section"
                >
                  <p>{brief.fullContent}</p>
                </ContentAccordion>
              ) : null}
            </article>
          </>
        )}
      </div>
    </main>
  );
}
