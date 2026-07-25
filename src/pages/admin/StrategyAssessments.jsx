import { useEffect, useMemo, useState } from "react";
import { apiPost } from "../../utils/api";
import { getStudioRequestAuth } from "../../utils/trialAccess";
import { useLang } from "../../contexts/LangContext";

const SECTION_LABELS = {
  propertyClassification: ["Building and Rental Unit Classification", "建筑与出租单元分类"],
  executiveSummary: ["Professional Summary", "专业结论摘要"], propertyPositioning: ["Property Positioning", "物业定位"],
  propertyStrengths: ["Factors Supporting the Price", "支持价格的因素"],
  rentalChallenges: ["Factors Limiting the Price", "限制价格的因素"], suggestedRentalStrategy: ["Rental Strategy", "出租策略"],
  estimatedRentRange: ["Local Rent Positioning", "本地租金判断"], marketRisks: ["Market Risks", "市场风险"],
  nextSteps: ["Next Steps", "下一步行动"], suiteSplitRentalPotential: ["Suite / Split Rental Potential", "套房 / 分租潜力"],
  suiteQualityPrivacy: ["Suite Quality & Privacy", "套房质量与隐私"], locationRentAdjustment: ["Location Rent Adjustment", "位置租金调整"],
  communityLocationAnalysis: ["Community & Location Analysis", "社区与位置分析"], targetTenantProfile: ["Target Tenant Profile", "目标租客画像"],
  educationResources: ["Education Resources", "教育资源"], medicalPharmacyResources: ["Medical & Pharmacy", "医疗与药房"],
  shoppingConvenience: ["Shopping & Daily Convenience", "购物与生活便利"],
  communityRentPositioningJudgment: ["Rent Positioning Judgment (internal, see Local Rent Positioning)", "租金定位判断（内部参考，详见本地租金判断）"],
  communityMarketingAngles: ["Marketing Angles", "营销角度"], communityRisksToVerify: ["Community Risks to Verify", "社区风险核查"],
  airbnbStrRegulationCheck: ["Airbnb / STR Regulation Check", "Airbnb / 短租法规核查"], legalComplianceRisk: ["Legal / Compliance Risk", "法律 / 合规风险"],
  aiConfidenceFlags: ["AI Internal Flags (ops only)", "AI 内部标记（仅供内部使用）"], aiAssessmentConfidence: ["AI Confidence", "AI 信心"],
  marketingSuggestions: ["Marketing Suggestions", "营销建议"], professionalPreliminaryRecommendation: ["Professional Preliminary Recommendation", "专业初步建议"],
  ownerGoalAlignment: ["Owner Goal Alignment", "业主目标匹配"], recommendedNextStep: ["Recommended Service Path", "推荐服务方案"],
  knowledgeLinks: ["Knowledge Links", "知识链接"], disclaimer: ["Disclaimer", "免责声明"], servicePath: ["Service Path", "服务路径"],
  outputGuardWarnings: ["Output Guard Warnings (internal QA)", "输出防错提醒（内部质检）"],
};

const DETAIL_FIELDS = [
  "Owner Name", "Email", "Phone", "Property Address", "City", "Community ID", "Community Name", "Community / Area",
  "Property Building Type", "Rental Unit Type", "Property Type", "Outdoor Space Type", "Fence Status", "Laundry Type",
  "Utilities Arrangement", "Shared Areas", "Target Rent", "Photo Upload Notes", "Follow-up Answers", "AI Flags",
];

function ReportValue({ value }) {
  if (Array.isArray(value)) return <ul>{value.map((item, index) => <li key={index}>{typeof item === "object" ? <ReportValue value={item} /> : String(item)}</li>)}</ul>;
  if (value && typeof value === "object") return <div>{Object.entries(value).map(([key, item]) => <div key={key}><strong>{key}</strong><ReportValue value={item} /></div>)}</div>;
  return <p>{String(value || "-")}</p>;
}

function driveDownloadUrl(url) {
  const match = String(url || "").match(/\/d\/([a-zA-Z0-9_-]+)/) || String(url || "").match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?export=download&id=${match[1]}` : url;
}

export default function StrategyAssessments() {
  const lang = useLang();
  const isZh = lang === "zh";
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLang, setDetailLang] = useState("en");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");
    try { setReports(await apiPost({ action: "getPropertyStrategyReports", ...getStudioRequestAuth("rental") })); }
    catch (err) { setError(err.message || "Failed to load reports."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    apiPost({ action: "getPropertyStrategyReports", ...getStudioRequestAuth("rental") })
      .then((items) => { if (active) setReports(items); })
      .catch((err) => { if (active) setError(err.message || "Failed to load reports."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return reports;
    return reports.filter((item) => [item.assessmentId, item.ownerName, item.email, item.propertyAddress, item.phone]
      .some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [query, reports]);

  const generatedCount = reports.filter((item) => item.reportUrl).length;

  async function viewReport(assessmentId) {
    setError("");
    setMessage("");
    try {
      const report = await apiPost({ action: "getPropertyStrategyReport", assessmentId, ...getStudioRequestAuth("rental") });
      setSelected(report);
      setDetailLang(report.reports?.en ? "en" : "zh");
    } catch (err) { setError(err.message || "Failed to load report."); }
  }

  async function generateReport() {
    if (!selected?.assessmentId) return;
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await apiPost({
        action: "regeneratePropertyStrategyReport",
        assessmentId: selected.assessmentId,
        ...getStudioRequestAuth("rental"),
      });
      const refreshed = await apiPost({
        action: "getPropertyStrategyReport",
        assessmentId: selected.assessmentId,
        ...getStudioRequestAuth("rental"),
      });
      setSelected(refreshed);
      await loadReports();
      setMessage(isZh
        ? `报告已生成/更新，并已写回第 ${result.rowNumber} 行 Report URL。`
        : `Reports generated/updated and Report URL written back on row ${result.rowNumber}.`);
    } catch (err) { setError(err.message || "Failed to generate the report."); }
    finally { setGenerating(false); }
  }

  const reportEnUrl = selected?.reportUrls?.en || selected?.reportUrl || "";
  const reportZhUrl = selected?.reportUrls?.zh || selected?.reportUrl || "";
  const activeReport = selected?.reports?.[detailLang] || selected?.analysis;

  return (
    <div className="admin-page strategy-reports-page">
      <div className="admin-page__header"><div>
        <p className="eyebrow">Strategy_Assessments</p>
        <h1>{isZh ? "房产出租策略初评" : "Property Strategy Reviews"}</h1>
        <p className="text-muted">{isZh ? "统一查看、搜索、生成和下载房产出租策略初评报告。" : "View, search, generate, and download property strategy review reports."}</p>
      </div></div>

      <div className="strategy-report-stats" aria-label={isZh ? "报告数量" : "Report counts"}>
        <div className="card"><strong>{reports.length}</strong><span>{isZh ? "全部" : "All"}</span></div>
        <div className="card"><strong>{generatedCount}</strong><span>{isZh ? "已生成 PDF" : "PDF Generated"}</span></div>
        <div className="card"><strong>{reports.length - generatedCount}</strong><span>{isZh ? "PDF 失败或缺失" : "PDF Failed or Missing"}</span></div>
      </div>

      <div className="card strategy-reports-toolbar">
        <input className="form-control" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isZh ? "搜索 Assessment ID、业主、邮箱、地址或电话" : "Search Assessment ID, owner, email, address, or phone"} />
        <button className="btn btn--secondary" onClick={loadReports}>{isZh ? "刷新" : "Refresh"}</button>
      </div>
      {error && <div className="notice notice--error"><p>{error}</p></div>}
      {message && <div className="notice notice--success"><p>{message}</p></div>}

      {loading ? <p>{isZh ? "正在读取报告…" : "Loading reports…"}</p> : (
        <div className="card strategy-reports-table-wrap"><table className="strategy-reports-table"><thead><tr>
          {["Assessment ID", "Created At", "Owner Name", "Email", "Phone", "Property Address", "City", "Community", "Property Type", "Target Rent", "Language", "Status", isZh ? "操作" : "Open"].map((heading) => <th key={heading}>{heading}</th>)}
        </tr></thead><tbody>
          {filtered.map((item) => <tr key={item.assessmentId}>
            <td>{item.assessmentId}</td><td>{item.createdAt || "-"}</td><td>{item.ownerName || "-"}</td><td>{item.email || "-"}</td><td>{item.phone || "-"}</td><td>{item.propertyAddress || "-"}</td><td>{item.city || "-"}</td><td>{item.community || "-"}</td><td>{item.propertyType || "-"}</td><td>{item.targetRent || "-"}</td><td>{item.language}</td><td>{item.status}</td>
            <td><button className="btn btn--secondary btn--small" onClick={() => viewReport(item.assessmentId)}>{isZh ? "打开详情" : "Open Details"}</button></td>
          </tr>)}
        </tbody></table>{!filtered.length && <p className="strategy-reports-empty">{isZh ? "没有匹配的报告。" : "No matching reports."}</p>}</div>
      )}

      {selected && <div className="strategy-report-modal" role="dialog" aria-modal="true" aria-label="Property strategy review"><div className="strategy-report-modal__panel">
        <div className="dispute-admin-bar">
          <div className="dispute-admin-bar__id"><h2>{selected.assessmentId}</h2><p>{selected.language} · {selected.status}</p></div>
          <div className="dispute-admin-bar__actions">
            <button className="btn btn--primary btn--small" onClick={generateReport} disabled={generating}>{generating ? (isZh ? "生成中…" : "Generating…") : (isZh ? "生成/更新报告" : "Generate / Update Reports")}</button>
            <a className={`btn btn--secondary btn--small${reportEnUrl ? "" : " is-disabled"}`} href={reportEnUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!reportEnUrl} onClick={(event) => { if (!reportEnUrl) event.preventDefault(); }}>{isZh ? "打开英文报告" : "Open English Report"}</a>
            <a className={`btn btn--secondary btn--small${reportEnUrl ? "" : " is-disabled"}`} href={reportEnUrl ? driveDownloadUrl(reportEnUrl) : undefined} download aria-disabled={!reportEnUrl} onClick={(event) => { if (!reportEnUrl) event.preventDefault(); }}>{isZh ? "下载英文PDF" : "Download English PDF"}</a>
            <a className={`btn btn--secondary btn--small${reportZhUrl ? "" : " is-disabled"}`} href={reportZhUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!reportZhUrl} onClick={(event) => { if (!reportZhUrl) event.preventDefault(); }}>{isZh ? "打开中文报告" : "Open Chinese Report"}</a>
            <a className={`btn btn--secondary btn--small${reportZhUrl ? "" : " is-disabled"}`} href={reportZhUrl ? driveDownloadUrl(reportZhUrl) : undefined} download aria-disabled={!reportZhUrl} onClick={(event) => { if (!reportZhUrl) event.preventDefault(); }}>{isZh ? "下载中文PDF" : "Download Chinese PDF"}</a>
            <button className="btn btn--ghost btn--small" onClick={() => setSelected(null)}>{isZh ? "关闭" : "Close"}</button>
          </div>
        </div>

        <div className="strategy-report-detail-meta">{DETAIL_FIELDS.map((key) => selected.fields?.[key] ? <div key={key}><strong>{key}</strong><span>{selected.fields[key]}</span></div> : null)}</div>

        <h3 className="dispute-admin-heading">
          {isZh ? "支持文件" : "Supporting Files"} ({(selected.files || []).length})
        </h3>
        {(selected.files || []).length === 0 ? (
          <p className="text-muted">{isZh ? "没有上传文件。" : "No files uploaded."}</p>
        ) : (
          <ul className="dispute-file-list">
            {selected.files.map((file) => (
              <li key={file["File ID"]}>
                <div>
                  <strong>{file["File Name"]}</strong>
                  <span>{[file["Photo Category"], file["Room / Area"], file["File Type"], file["Uploaded At"]].filter(Boolean).join(" · ")}</span>
                </div>
                {file["Google Drive URL"] && (
                  <a className="btn btn--ghost btn--sm" href={file["Google Drive URL"]} target="_blank" rel="noreferrer">
                    {isZh ? "打开" : "Open"}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <h3 className="dispute-admin-heading">{isZh ? "评估报告" : "Assessment Report"}</h3>
        <div className="dispute-lang-switch">
          <button type="button" className={`btn btn--ghost btn--sm${detailLang === "en" ? " is-active" : ""}`} onClick={() => setDetailLang("en")}>English</button>
          <button type="button" className={`btn btn--ghost btn--sm${detailLang === "zh" ? " is-active" : ""}`} onClick={() => setDetailLang("zh")}>中文</button>
        </div>
        <div className="strategy-report-detail-sections">{activeReport ? Object.entries(activeReport).map(([key, value]) => <section key={key}><h3>{SECTION_LABELS[key]?.[detailLang === "zh" ? 1 : 0] || key}</h3><ReportValue value={value} /></section>) : <section><h3>AI Analysis</h3><p className="strategy-report-raw">{selected.analysisText || "No saved report content."}</p></section>}</div>
      </div></div>}
    </div>
  );
}
