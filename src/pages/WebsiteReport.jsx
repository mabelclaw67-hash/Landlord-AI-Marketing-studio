import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getWebsiteReport } from "../utils/dailyMarketBrief";
import ContentAccordion from "../components/ContentAccordion";

function getLineType(line) {
  if (/^[一二三四五六七八九十]+、/.test(line)) return "h2";
  if (/^\d+\.\d+\s+/.test(line)) return "h3";
  if (/^⚠/.test(line) || /^免责声明[:：]/.test(line)) return "callout";
  if (/^\*\s+/.test(line)) return "bullet";
  return "p";
}

function ReportLine({ line }) {
  const type = getLineType(line);
  const text = type === "bullet" ? line.replace(/^\*\s+/, "") : line;

  if (type === "h2") return <h2>{text}</h2>;
  if (type === "h3") return <h3>{text}</h3>;
  if (type === "callout") return <p className="website-report__callout">{text}</p>;
  if (type === "bullet") return <li>{text}</li>;
  return <p>{text}</p>;
}

function renderLines(lines) {
  return lines.map((line, index) => {
    const type = getLineType(line);
    if (type !== "bullet") {
      return <ReportLine key={`${index}-${line}`} line={line} />;
    }
    return (
      <ul key={`${index}-${line}`} className="website-report__list">
        <ReportLine line={line} />
      </ul>
    );
  });
}

// Group lines into h2 sections so each section can render as its own
// collapsible accordion. Lines before the first h2 (if any) stay outside.
function groupSections(lines) {
  const preamble = [];
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    if (getLineType(line) === "h2") {
      current = { title: line, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  });

  return { preamble, sections };
}

function sectionSummary(lines) {
  return lines
    .filter((line) => getLineType(line) !== "h3")
    .map((line) => line.replace(/^\*\s+/, "").replace(/^⚠\s*/, ""))
    .join(" ")
    .trim();
}

export default function WebsiteReport({ lang }) {
  const { reportId } = useParams();
  const safeLang = lang === "zh" ? "zh" : "en";
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadReport() {
      setLoading(true);
      setError("");
      try {
        const data = await getWebsiteReport(reportId);
        if (active) setReport(data || null);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load report.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReport();
    return () => { active = false; };
  }, [reportId]);

  const title = safeLang === "zh" ? report?.titleCn : report?.titleEn;
  const description = safeLang === "zh" ? report?.descriptionCn : report?.descriptionEn;
  const lines = useMemo(() => Array.isArray(report?.lines) ? report.lines : [], [report]);
  const { preamble, sections } = useMemo(() => groupSections(lines), [lines]);

  return (
    <main className="website-report">
      <div className="website-report__inner">
        <Link to="/" className="website-report__back">
          {safeLang === "zh" ? "← 返回首页" : "← Back to Home"}
        </Link>

        {loading ? (
          <div className="website-report__panel">
            {safeLang === "zh" ? "正在加载报告..." : "Loading report..."}
          </div>
        ) : error ? (
          <div className="website-report__panel website-report__panel--error">
            {safeLang === "zh" ? "报告暂时无法加载。" : "The report cannot be loaded right now."}
          </div>
        ) : (
          <>
            <header className="website-report__header">
              <div className="website-report__meta">
                <span>{report?.category}</span>
                <span>{report?.date}</span>
              </div>
              <h1>{title}</h1>
              <p>{description}</p>
            </header>

            <article className="website-report__content">
              {preamble.length > 0 && renderLines(preamble)}
              {sections.map((section, index) => (
                <ContentAccordion
                  key={`${index}-${section.title}`}
                  title={section.title}
                  summary={sectionSummary(section.lines)}
                  defaultOpen={false}
                  className="website-report__section"
                >
                  {renderLines(section.lines)}
                </ContentAccordion>
              ))}
            </article>
          </>
        )}
      </div>
    </main>
  );
}
