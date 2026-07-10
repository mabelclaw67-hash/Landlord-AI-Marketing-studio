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
  nextSteps: ["Next Steps", "下一步行动"],
  suiteSplitRentalPotential: ["Suite / Split Rental Potential", "套房 / 分租潜力"],
  suiteQualityPrivacy: ["Suite Quality & Privacy", "套房质量与隐私"], locationRentAdjustment: ["Location Rent Adjustment", "位置租金调整"],
  communityLocationAnalysis: ["Community & Location Analysis", "社区与位置分析"], targetTenantProfile: ["Target Tenant Profile", "目标租客画像"],
  communityRentPositioningJudgment: ["Rent Positioning Judgment (internal, see Local Rent Positioning)", "租金定位判断（内部参考，详见本地租金判断）"],
  communityMarketingAngles: ["Marketing Angles", "营销角度"],
  communityRisksToVerify: ["Community Risks to Verify", "社区风险核查"], airbnbStrRegulationCheck: ["Airbnb / STR Regulation Check", "Airbnb / 短租法规核查"],
  legalComplianceRisk: ["Legal / Compliance Risk", "法律 / 合规风险"], aiConfidenceFlags: ["AI Internal Flags (ops only)", "AI 内部标记（仅供内部使用）"],
  aiAssessmentConfidence: ["AI Confidence", "AI 信心"], marketingSuggestions: ["Marketing Suggestions", "营销建议"],
  professionalPreliminaryRecommendation: ["Professional Preliminary Recommendation", "专业初步建议"], ownerGoalAlignment: ["Owner Goal Alignment", "业主目标匹配"],
  recommendedNextStep: ["Recommended Service Path", "推荐服务方案"], knowledgeLinks: ["Knowledge Links", "知识链接"], disclaimer: ["Disclaimer", "免责声明"],
  outputGuardWarnings: ["Output Guard Warnings (internal QA)", "输出防错提醒（内部质检）"],
};

function ReportValue({ value }) {
  if (Array.isArray(value)) return <ul>{value.map((item, index) => <li key={index}>{typeof item === "object" ? <ReportValue value={item} /> : String(item)}</li>)}</ul>;
  if (value && typeof value === "object") return <div>{Object.entries(value).map(([key, item]) => <div key={key}><strong>{key}</strong><ReportValue value={item} /></div>)}</div>;
  return <p>{String(value || "-")}</p>;
}

export default function StrategyAssessments() {
  const lang = useLang();
  const isZh = lang === "zh";
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const missingCount = reports.length - generatedCount;

  async function viewReport(assessmentId) {
    setError("");
    try { setSelected(await apiPost({ action: "getPropertyStrategyReport", assessmentId, ...getStudioRequestAuth("rental") })); }
    catch (err) { setError(err.message || "Failed to load report."); }
  }

  return (
    <div className="admin-page strategy-reports-page">
      <div className="admin-page__header"><div><p className="eyebrow">Strategy_Assessments</p><h1>{isZh ? "策略评估报告" : "Strategy Assessment Reports"}</h1><p className="text-muted">{isZh ? "管理员专用历史报告。报告正文直接读取已保存数据，不重新调用 AI。" : "Admin-only history. Saved report content is shown without calling AI again."}</p></div></div>
      <div className="strategy-report-stats" aria-label={isZh ? "报告数量" : "Report counts"}><div className="card"><strong>{reports.length}</strong><span>{isZh ? "全部" : "All"}</span></div><div className="card"><strong>{generatedCount}</strong><span>{isZh ? "已生成 PDF" : "PDF Generated"}</span></div><div className="card"><strong>{missingCount}</strong><span>{isZh ? "PDF 失败或缺失" : "PDF Failed or Missing"}</span></div></div>
      <div className="card strategy-reports-toolbar"><input className="form-control" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isZh ? "搜索 ID、业主、邮箱、地址或电话" : "Search ID, owner, email, address, or phone"} /><button className="btn btn--secondary" onClick={loadReports}>{isZh ? "刷新" : "Refresh"}</button></div>
      {error && <div className="notice notice--error"><p>{error}</p></div>}
      {loading ? <p>{isZh ? "正在读取报告…" : "Loading reports…"}</p> : (
        <div className="card strategy-reports-table-wrap"><table className="strategy-reports-table"><thead><tr>{["Assessment ID", "Created At", "Owner Name", "Email", "Phone", "Property Address", "City", "Community", "Property Type", "Target Rent", "Language", "Status", "View Report", "Open PDF"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>
          {filtered.map((item) => <tr key={item.assessmentId}><td>{item.assessmentId}</td><td>{item.createdAt || "-"}</td><td>{item.ownerName || "-"}</td><td>{item.email || "-"}</td><td>{item.phone || "-"}</td><td>{item.propertyAddress || "-"}</td><td>{item.city || "-"}</td><td>{item.community || "-"}</td><td>{item.propertyType || "-"}</td><td>{item.targetRent || "-"}</td><td>{item.language}</td><td>{item.status}</td><td><button className="btn btn--secondary btn--small" onClick={() => viewReport(item.assessmentId)}>{isZh ? "查看报告" : "View Report"}</button></td><td>{item.reportUrl ? <a className="btn btn--secondary btn--small" href={item.reportUrl} target="_blank" rel="noreferrer">{isZh ? "打开 PDF" : "Open PDF"}</a> : <span className="text-muted">{isZh ? "PDF 尚未生成" : "PDF Not Generated"}</span>}</td></tr>)}
        </tbody></table>{!filtered.length && <p className="strategy-reports-empty">{isZh ? "没有匹配的报告。" : "No matching reports."}</p>}</div>
      )}
      {selected && <div className="strategy-report-modal" role="dialog" aria-modal="true" aria-label="Strategy assessment report"><div className="strategy-report-modal__panel"><div className="strategy-report-modal__header"><div><h2>{selected.assessmentId}</h2><p>{selected.language} · {selected.status}</p></div><button className="btn btn--secondary" onClick={() => setSelected(null)}>{isZh ? "关闭" : "Close"}</button></div>
        <div className="strategy-report-detail-meta">{["Owner Name", "Email", "Phone", "Property Address", "City", "Community / Area", ...(selected.fields?.["Property Building Type"] || selected.fields?.["Rental Unit Type"] ? ["Property Building Type", "Rental Unit Type"] : ["Property Type"]), "Outdoor Space Type", "Fence Status", "Laundry Type", "Utilities Arrangement", "Shared Areas", "Target Rent", "Follow-up Answers", "AI Flags"].map((key) => selected.fields?.[key] ? <div key={key}><strong>{key}</strong><span>{selected.fields[key]}</span></div> : null)}</div>
        {selected.reportUrl ? <p><a className="btn btn--primary" href={selected.reportUrl} target="_blank" rel="noreferrer">{isZh ? "打开 PDF" : "Open PDF"}</a></p> : <div className="notice notice--warning"><p>{isZh ? "PDF 尚未生成" : "PDF Not Generated"}</p></div>}
        <div className="strategy-report-detail-sections">{selected.analysis ? Object.entries(selected.analysis).map(([key, value]) => <section key={key}><h3>{SECTION_LABELS[key]?.[isZh ? 1 : 0] || key}</h3><ReportValue value={value} /></section>) : <section><h3>AI Analysis</h3><p className="strategy-report-raw">{selected.analysisText || "No saved report content."}</p></section>}</div>
      </div></div>}
    </div>
  );
}
