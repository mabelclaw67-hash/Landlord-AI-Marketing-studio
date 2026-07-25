import { useEffect, useMemo, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import {
  DISPUTE_STATUSES,
  NEXT_STEPS,
  REVIEW_PRIORITIES,
  assessFormTwoEligibility,
  buildFormTwoWorkingDraft,
  disputeColumnLabel,
  displayDisputeOption,
  downloadDisputeReportPdf,
  formatDisputeDate,
  formatDisputeDateTime,
  formatDisputeFieldValue,
  generateDisputeAiAnalysis,
  generateDisputeReport,
  generateDisputeWorkingDraft,
  generateFormTwoDraftPdf,
  getDisputeAiAnalysis,
  getDisputeReview,
  getDisputeReviews,
  rebuildReportsFromRecord,
  recordToForm,
  splitFollowUpAnswersStored,
  updateDisputeProfessionalReview,
} from "../../utils/disputeReview";

// Legal / dispute data is admin-only. The backend enforces this too — these
// actions throw "Admin access required" for any non-admin session.
const LIST_COLUMNS = [
  ["Review ID", "案件编号"],
  ["Created At", "创建时间"],
  ["Client Name", "客户姓名"],
  ["Dispute Type", "争议类型"],
  ["Status", "状态"],
  ["Hearing Date", "听证日期"],
  ["Filing Deadline", "提交期限"],
  ["AI Risk Level", "AI 风险等级"],
  ["Review Priority", "审核优先级"],
  ["Professional Review", "专业审核"],
];

const INTAKE_FIELDS = [
  "Client Name", "Email", "Phone", "Preferred Contact", "Client Role",
  "Dispute Type", "Tribunal / Authority", "Property Address", "City", "Province",
  "Opposing Party Name", "Relationship to Opposing Party", "Monetary Amount",
  "Current Proceeding Status", "Application Filed", "Response / Counterclaim Received",
  "Notice Date", "Service Date", "Filing Deadline", "Hearing Date", "Limitation Date",
  "Client Service Interest", "Consent to Contact", "Privacy Consent",
];

const LONG_FIELDS = [
  "Dispute Summary", "Client Position", "Opposing Party Position", "Desired Outcome",
  "Key Evidence Summary", "Missing Evidence", "Service / Procedure Concerns",
  "Legal / Compliance Issues", "Follow-up Answers",
];

// Quick-triage chips. Each checks only fields already present in the list
// view (AI Flags / Dispute Type / Review Priority), so no extra fetch is
// needed just to filter the table. The Form 2 chip is therefore an
// approximation (dispute type + role + registry/file number present in the
// Follow-up Answers text) — the authoritative check, which also needs the
// uploaded files, is assessFormTwoEligibility() run in the detail panel.
const QUICK_FILTERS = [
  { key: "supremeCourt", en: "Supreme Court", zh: "高院诉讼", test: (item) => item["Dispute Type"] === "Supreme Court Litigation" },
  { key: "urgentDeadline", en: "Urgent deadline", zh: "紧急期限", test: (item) => /URGENT|PASSED/.test(String(item["AI Flags"] || "")) },
  { key: "injunction", en: "Injunction", zh: "禁令", test: (item) => String(item["AI Flags"] || "").includes("INJUNCTION") },
  { key: "multipleDefendants", en: "Multiple defendants", zh: "多名被告", test: (item) => String(item["AI Flags"] || "").includes("MULTI_DEFENDANT") },
  { key: "insurerNotNotified", en: "Insurer not notified", zh: "未通知保险公司", test: (item) => String(item["AI Flags"] || "").includes("INSURER_NOT_NOTIFIED") },
  { key: "expertMissing", en: "Expert evidence missing", zh: "缺少专家证据", test: (item) => String(item["AI Flags"] || "").includes("EXPERT_EVIDENCE_MISSING") },
  {
    key: "formTwoLikely",
    en: "Form 2 likely eligible",
    zh: "可能符合 Form 2 条件",
    test: (item) => item["Dispute Type"] === "Supreme Court Litigation"
      && item["Client Role"] === "Defendant"
      && /Court Registry/.test(String(item["Follow-up Answers"] || ""))
      && /Court File Number/.test(String(item["Follow-up Answers"] || "")),
  },
];

function professionalState(record, isZh) {
  if (String(record["Professional Final Recommendation"] || "").trim()) {
    return isZh ? "已完成" : "Reviewed";
  }
  if (String(record["Professional Notes"] || "").trim()) {
    return isZh ? "进行中" : "In progress";
  }
  return isZh ? "待审核" : "Pending";
}

export default function DisputeReviews() {
  const lang = useLang();
  const isZh = lang === "zh";
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLang, setDetailLang] = useState("en");
  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState("");

  // Form 2 Working Draft (Supreme Court Litigation only)
  const [formTwoParagraphs, setFormTwoParagraphs] = useState([{ allegationText: "", position: "" }]);
  const [formTwoLegalBasis, setFormTwoLegalBasis] = useState("");
  const [formTwoReliefSought, setFormTwoReliefSought] = useState("");
  const [formTwoGenerating, setFormTwoGenerating] = useState(false);

  // AI Review: Content Analysis + Working Draft. envelope is what's actually
  // saved (from getDisputeAiAnalysis); the *Preview state holds an
  // in-session, not-yet-saved dryRun result. Only one of "preview" or
  // "saved" is shown at a time — a fresh preview always takes precedence
  // until Save (or closing the review) clears it.
  const [aiEnvelope, setAiEnvelope] = useState(null);
  const [analysisPreview, setAnalysisPreview] = useState(null);
  const [analysisBusy, setAnalysisBusy] = useState(""); // "generating" | "saving" | ""
  const [draftPreview, setDraftPreview] = useState(null);
  const [draftBusy, setDraftBusy] = useState("");

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      setRows(await getDisputeReviews());
    } catch (err) {
      setError(err.message || "Failed to load dispute reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getDisputeReviews()
      .then((items) => { if (active) setRows(Array.isArray(items) ? items : []); })
      .catch((err) => { if (active) setError(err.message || "Failed to load dispute reviews."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const activeTests = QUICK_FILTERS.filter((filter) => activeFilters.includes(filter.key));
    return rows.filter((item) => {
      if (needle && !["Review ID", "Client Name", "Email", "Dispute Type", "Status"]
        .some((key) => String(item[key] || "").toLowerCase().includes(needle))) return false;
      return activeTests.every((filter) => filter.test(item));
    });
  }, [query, rows, activeFilters]);

  const toggleFilter = (key) => {
    setActiveFilters((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const mappedFiles = useMemo(() => (selected?.files || []).map((file) => ({
    fileId: file["File ID"],
    fileName: file["File Name"],
    documentCategory: file["Document Category"],
    documentDate: file["Document Date"],
    senderIssuer: file["Sender / Issuer"],
    description: file["Description"],
  })), [selected]);

  // Rebuilt locally from the stored record so the reviewer sees exactly the
  // content that will be written to the PDFs.
  const rebuilt = useMemo(() => {
    if (!selected?.review) return null;
    try {
      return rebuildReportsFromRecord(selected.review, mappedFiles);
    } catch {
      return null;
    }
  }, [selected, mappedFiles]);

  // Form 2 eligibility is recomputed fresh from the stored record and files
  // every time — it is never a persisted flag, so it can never go stale.
  const formTwoForm = useMemo(() => (selected?.review ? recordToForm(selected.review) : null), [selected]);
  const formTwoEligibility = useMemo(
    () => (formTwoForm ? assessFormTwoEligibility(formTwoForm, mappedFiles) : null),
    [formTwoForm, mappedFiles]
  );

  async function openReview(reviewId) {
    setError("");
    setMessage("");
    setAnalysisPreview(null);
    setDraftPreview(null);
    try {
      const detail = await getDisputeReview(reviewId);
      setSelected(detail);
      setDetailLang(isZh ? "zh" : "en");
      setNotes(detail.review["Professional Notes"] || "");
      setRecommendation(detail.review["Professional Final Recommendation"] || "");
      setStatus(detail.review["Status"] || "");
      setPriority(detail.review["Review Priority"] || "");
      setNextStep(detail.review["Next Step"] || "");
    } catch (err) {
      setError(err.message || "Failed to load the dispute review.");
    }
    try {
      setAiEnvelope(await getDisputeAiAnalysis(reviewId));
    } catch {
      setAiEnvelope(null); // non-fatal — the AI Review panel just shows "not generated yet"
    }
  }

  // dryRun:true previews without saving; dryRun:false re-runs Gemini for
  // real and persists. There is no server-side hold of a previewed result,
  // so Save always issues a fresh generation rather than persisting the
  // exact previewed text.
  async function runContentAnalysis(dryRun) {
    if (!selected) return;
    setAnalysisBusy(dryRun ? "generating" : "saving");
    setError("");
    setMessage("");
    try {
      const reviewId = selected.review["Review ID"];
      const result = await generateDisputeAiAnalysis(reviewId, { dryRun });
      if (dryRun) {
        setAnalysisPreview(result);
      } else {
        setAnalysisPreview(null);
        setAiEnvelope(await getDisputeAiAnalysis(reviewId));
        setMessage(isZh ? "内容分析已保存。" : "Content analysis saved.");
      }
    } catch (err) {
      setError(err.message || "Failed to generate the content analysis.");
    } finally {
      setAnalysisBusy("");
    }
  }

  async function runWorkingDraft(dryRun) {
    if (!selected) return;
    setDraftBusy(dryRun ? "generating" : "saving");
    setError("");
    setMessage("");
    try {
      const reviewId = selected.review["Review ID"];
      const result = await generateDisputeWorkingDraft(reviewId, { dryRun });
      if (dryRun) {
        setDraftPreview(result);
      } else {
        setDraftPreview(null);
        setAiEnvelope(await getDisputeAiAnalysis(reviewId));
        setMessage(isZh ? "工作稿已保存。" : "Working draft saved.");
      }
    } catch (err) {
      setError(err.message || "Failed to generate the working draft.");
    } finally {
      setDraftBusy("");
    }
  }

  async function saveProfessionalReview() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateDisputeProfessionalReview({
        reviewId: selected.review["Review ID"],
        professionalNotes: notes,
        professionalFinalRecommendation: recommendation,
        status,
        reviewPriority: priority,
        nextStep,
      });
      setMessage(isZh ? "专业审核已保存。" : "Professional review saved.");
      await openReview(selected.review["Review ID"]);
      await loadRows();
    } catch (err) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  // English is regenerated first and the Chinese version is rendered from the
  // same analysis, then both PDFs are written in one call — they cannot drift.
  async function runGenerateReport() {
    if (!selected || !rebuilt) return;
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await generateDisputeReport(selected.review["Review ID"], rebuilt);
      setMessage(isZh
        ? `英文与中文报告已生成并保存到 Drive。${result.professionalReviewIncluded ? "" : "（注意：尚未填写专业最终建议，报告标记为 AI 草稿。）"}`
        : `English and Chinese reports generated and saved to Drive.${result.professionalReviewIncluded ? "" : " (Note: no professional final recommendation yet, so the report is marked as an AI draft.)"}`);
      await openReview(selected.review["Review ID"]);
      await loadRows();
    } catch (err) {
      setError(err.message || "Failed to generate the report.");
    } finally {
      setGenerating(false);
    }
  }

  async function runDownload(language) {
    if (!selected) return;
    setDownloading(language);
    setError("");
    setMessage("");
    try {
      const saved = await downloadDisputeReportPdf(
        selected.review["Review ID"],
        language,
        selected.downloadToken || ""
      );
      const kb = Math.max(1, Math.round(saved.sizeBytes / 1024));
      setMessage(isZh
        ? `已下载 ${saved.fileName}（${kb} KB）。`
        : `Downloaded ${saved.fileName} (${kb} KB).`);
    } catch (err) {
      setError(err.message || "Download failed.");
    } finally {
      setDownloading("");
    }
  }

  function updateFormTwoParagraph(index, field, value) {
    setFormTwoParagraphs((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }
  function addFormTwoParagraph() {
    setFormTwoParagraphs((current) => [...current, { allegationText: "", position: "" }]);
  }
  function removeFormTwoParagraph(index) {
    setFormTwoParagraphs((current) => current.filter((_, i) => i !== index));
  }

  async function runGenerateFormTwoDraft() {
    if (!formTwoForm || !selected) return;
    setFormTwoGenerating(true);
    setError("");
    setMessage("");
    try {
      const draft = buildFormTwoWorkingDraft(
        formTwoForm,
        formTwoParagraphs,
        { legalBasis: formTwoLegalBasis, reliefSought: formTwoReliefSought },
        detailLang
      );
      const saved = await generateFormTwoDraftPdf(selected.review["Review ID"], draft);
      setMessage(isZh
        ? `已生成并下载 ${saved.fileName}。此工作稿尚未提交至法院，须经律师审阅定稿。`
        : `Generated and downloaded ${saved.fileName}. This working draft is not filed and must be reviewed and finalized by counsel.`);
    } catch (err) {
      setError(err.message || "Failed to generate the Form 2 working draft.");
    } finally {
      setFormTwoGenerating(false);
    }
  }

  const review = selected?.review;
  const isSupremeCourt = review?.["Dispute Type"] === "Supreme Court Litigation";
  const activeReport = rebuilt?.[detailLang];
  const reportEnUrl = review?.["Report EN URL"] || "";
  const reportZhUrl = review?.["Report ZH URL"] || "";
  const reportsReady = !!(reportEnUrl && reportZhUrl);
  // The generation timestamp lives inside the stored report JSON.
  const generatedAt = (() => {
    try {
      return JSON.parse(review?.["Report EN JSON"] || "{}").generatedAt || "";
    } catch {
      return "";
    }
  })();

  // AI Review: a fresh in-session preview always takes precedence over the
  // saved envelope in what's displayed, until Save (or opening a different
  // review) clears it.
  const savedContentAnalysis = aiEnvelope?.contentAnalysis || null;
  const savedWorkingDraft = aiEnvelope?.workingDraft || null;
  const activeAnalysis = analysisPreview?.envelope?.contentAnalysis || savedContentAnalysis;
  const activeAnalysisMeta = analysisPreview || null; // providerMeta/fieldSummary/schemaValid only exist for an in-session run
  const analysisStatus = analysisPreview ? "preview" : (savedContentAnalysis ? "saved" : "none");
  const activeDraft = draftPreview?.envelope?.workingDraft || savedWorkingDraft;
  const draftMeta = draftPreview || null;
  const draftStatus = draftPreview ? "preview" : (savedWorkingDraft ? "saved" : "none");
  const analysisStatusLabel = { none: isZh ? "尚未生成" : "Not generated", preview: isZh ? "预览中（未保存）" : "Preview available (not saved)", saved: isZh ? "已保存" : "Saved" }[analysisStatus];
  const draftStatusLabel = { none: isZh ? "尚未生成" : "Not generated", preview: isZh ? "预览中（未保存）" : "Preview available (not saved)", saved: isZh ? "已保存" : "Saved" }[draftStatus];

  return (
    <div className="admin-page strategy-reports-page">
      <div className="admin-page__header">
        <div>
          <p className="eyebrow">Dispute_Reviews</p>
          <h1>{isZh ? "法律争议AI初评" : "AI Dispute Reviews"}</h1>
          <p className="text-muted">
            {isZh
              ? "管理员专用。法律与争议资料仅对授权管理员显示，不进入房产数据表。"
              : "Admin only. Legal and dispute material is visible to authorized administrators and is never stored with property data."}
          </p>
        </div>
      </div>

      <div className="card strategy-reports-toolbar">
        <input
          className="form-control"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isZh ? "搜索案件编号、姓名、邮箱、类型或状态" : "Search Review ID, name, email, type, or status"}
        />
        <button className="btn btn--secondary" onClick={loadRows}>{isZh ? "刷新" : "Refresh"}</button>
      </div>

      <div className="dispute-filter-chips">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`btn btn--ghost btn--small${activeFilters.includes(filter.key) ? " is-active" : ""}`}
            onClick={() => toggleFilter(filter.key)}
          >
            {isZh ? filter.zh : filter.en}
          </button>
        ))}
      </div>

      {error && <div className="notice notice--error"><p>{error}</p></div>}
      {message && <div className="notice notice--success"><p>{message}</p></div>}

      {loading ? <p>{isZh ? "正在读取案件…" : "Loading dispute reviews…"}</p> : (
        <div className="card strategy-reports-table-wrap">
          <table className="strategy-reports-table">
            <thead>
              <tr>
                {LIST_COLUMNS.map(([en, zh]) => <th key={en}>{isZh ? zh : en}</th>)}
                <th>{isZh ? "操作" : "Open"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item["Review ID"]}>
                  <td>{item["Review ID"]}</td>
                  <td>{formatDisputeFieldValue("Created At", item["Created At"], lang) || "-"}</td>
                  <td>{item["Client Name"] || "-"}</td>
                  <td>{displayDisputeOption(item["Dispute Type"], lang) || "-"}</td>
                  <td>{displayDisputeOption(item["Status"], lang) || "-"}</td>
                  <td>{formatDisputeDate(item["Hearing Date"], lang) || "-"}</td>
                  <td>{formatDisputeDate(item["Filing Deadline"], lang) || "-"}</td>
                  <td>{item["AI Risk Level"] ? displayDisputeOption(item["AI Risk Level"], lang) : (isZh ? "无法评估" : "Not assessable")}</td>
                  <td>{displayDisputeOption(item["Review Priority"], lang) || "-"}</td>
                  <td>{professionalState(item, isZh)}</td>
                  <td>
                    <button className="btn btn--secondary btn--small" onClick={() => openReview(item["Review ID"])}>
                      {isZh ? "打开" : "Open"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className="strategy-reports-empty">{isZh ? "没有匹配的案件。" : "No matching dispute reviews."}</p>}
        </div>
      )}

      {review && (
        <div className="strategy-report-modal" role="dialog" aria-modal="true" aria-label="Dispute review">
          <div className="strategy-report-modal__panel">
            {/* Sticky so the report actions stay reachable while scrolling. */}
            <div className="dispute-admin-bar">
              <div className="dispute-admin-bar__id">
                <h2>{review["Review ID"]}</h2>
                <p>
                  {displayDisputeOption(review["Dispute Type"], lang)} · {displayDisputeOption(review["Status"], lang)}
                  {reportsReady && generatedAt && (
                    <> · {isZh ? "报告生成于 " : "Reports generated "}{formatDisputeDateTime(generatedAt, lang)}</>
                  )}
                </p>
                {!reportsReady && (
                  <p className="dispute-admin-bar__warn">{isZh ? "报告尚未生成" : "Reports not generated yet"}</p>
                )}
              </div>

              <div className="dispute-admin-bar__actions">
                <button className="btn btn--primary btn--small" onClick={runGenerateReport} disabled={generating || !rebuilt}>
                  {generating
                    ? (isZh ? "生成中…" : "Generating…")
                    : reportsReady
                      ? (isZh ? "生成/更新报告" : "Generate / Update Reports")
                      : (isZh ? "生成报告" : "Generate Reports")}
                </button>

                <a
                  className={`btn btn--secondary btn--small${reportEnUrl ? "" : " is-disabled"}`}
                  href={reportEnUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!reportEnUrl}
                  onClick={(e) => { if (!reportEnUrl) e.preventDefault(); }}
                >
                  {isZh ? "打开英文报告" : "Open English Report"}
                </a>
                <button
                  className="btn btn--secondary btn--small"
                  onClick={() => runDownload("en")}
                  disabled={!reportsReady || downloading === "en"}
                >
                  {downloading === "en"
                    ? (isZh ? "下载中…" : "Downloading…")
                    : (isZh ? "下载英文 PDF" : "Download English PDF")}
                </button>

                <a
                  className={`btn btn--secondary btn--small${reportZhUrl ? "" : " is-disabled"}`}
                  href={reportZhUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!reportZhUrl}
                  onClick={(e) => { if (!reportZhUrl) e.preventDefault(); }}
                >
                  {isZh ? "打开中文报告" : "Open Chinese Report"}
                </a>
                <button
                  className="btn btn--secondary btn--small"
                  onClick={() => runDownload("zh")}
                  disabled={!reportsReady || downloading === "zh"}
                >
                  {downloading === "zh"
                    ? (isZh ? "下载中…" : "Downloading…")
                    : (isZh ? "下载中文 PDF" : "Download Chinese PDF")}
                </button>

                {review["File Folder URL"] && (
                  <a className="btn btn--ghost btn--small" href={review["File Folder URL"]} target="_blank" rel="noreferrer">
                    {isZh ? "证据文件夹" : "Evidence Folder"}
                  </a>
                )}
                <button className="btn btn--ghost btn--small" onClick={() => setSelected(null)}>
                  {isZh ? "关闭" : "Close"}
                </button>
              </div>
            </div>

            <h3 className="dispute-admin-heading">{isZh ? "问询资料" : "Intake"}</h3>
            <div className="strategy-report-detail-meta">
              {INTAKE_FIELDS.map((key) => review[key] ? (
                <div key={key}>
                  <strong>{disputeColumnLabel(key, lang)}</strong>
                  <span>{formatDisputeFieldValue(key, review[key], lang)}</span>
                </div>
              ) : null)}
            </div>
            {LONG_FIELDS.map((key) => review[key] ? (
              <div className="dispute-admin-long" key={key}>
                <strong>{disputeColumnLabel(key, lang)}</strong>
                <p>{key === "Follow-up Answers" ? splitFollowUpAnswersStored(review[key]).text : review[key]}</p>
              </div>
            ) : null)}

            <h3 className="dispute-admin-heading">
              {isZh ? "上传文件" : "Uploaded Files"} ({(selected.files || []).length})
            </h3>
            {(selected.files || []).length === 0 ? (
              <p className="text-muted">{isZh ? "没有上传文件。" : "No files uploaded."}</p>
            ) : (
              <ul className="dispute-file-list">
                {selected.files.map((file) => (
                  <li key={file["File ID"]}>
                    <div>
                      <strong>{file["File Name"]}</strong>
                      <span>{[displayDisputeOption(file["Document Category"], lang), formatDisputeDate(file["Document Date"], lang), file["Sender / Issuer"], file["Description"]].filter(Boolean).join(" · ")}</span>
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

            <h3 className="dispute-admin-heading">{isZh ? "专业审核" : "Professional Review"}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>{isZh ? "状态" : "Status"}</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {DISPUTE_STATUSES.map((option) => (
                    <option key={option} value={option}>{displayDisputeOption(option, lang)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{isZh ? "审核优先级" : "Review Priority"}</label>
                <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {REVIEW_PRIORITIES.map((option) => (
                    <option key={option} value={option}>{displayDisputeOption(option, lang)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{isZh ? "下一步" : "Next Step"}</label>
                <select className="form-control" value={nextStep} onChange={(e) => setNextStep(e.target.value)}>
                  <option value="">-</option>
                  {NEXT_STEPS.map((option) => (
                    <option key={option} value={option}>{displayDisputeOption(option, lang)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>{isZh ? "专业审核备注（内部）" : "Professional Notes (internal)"}</label>
              <textarea className="form-control" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{isZh ? "专业最终建议（英文原文，将出现在两份报告中）" : "Professional Final Recommendation (English original, appears in both reports)"}</label>
              <textarea className="form-control" rows={5} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
              <p className="strategy-help">
                {isZh
                  ? "英文是唯一事实来源。此处填写的内容会原文出现在英文和中文两份报告中，中文版本不会另行改写或新增判断。"
                  : "English is the single source of truth. This text appears verbatim in both the English and the Chinese report; the Chinese version never rewrites it or adds a judgment of its own."}
              </p>
            </div>

            <div className="dispute-admin-actions">
              <button className="btn btn--primary" onClick={saveProfessionalReview} disabled={saving}>
                {saving ? (isZh ? "保存中…" : "Saving…") : (isZh ? "保存专业审核" : "Save Professional Review")}
              </button>
            </div>

            <h3 className="dispute-admin-heading">{isZh ? "AI 初评内容" : "AI Preliminary Review"}</h3>
            <div className="dispute-lang-switch">
              <button
                type="button"
                className={`btn btn--ghost btn--sm${detailLang === "en" ? " is-active" : ""}`}
                onClick={() => setDetailLang("en")}
              >
                English
              </button>
              <button
                type="button"
                className={`btn btn--ghost btn--sm${detailLang === "zh" ? " is-active" : ""}`}
                onClick={() => setDetailLang("zh")}
              >
                中文
              </button>
            </div>
            {activeReport ? (
              <div className="strategy-report-detail-sections">
                <section>
                  <h3>{detailLang === "zh" ? "争议摘要" : "Executive Summary"}</h3>
                  <ul>{activeReport.executiveSummary.map((line, index) => <li key={index}>{line}</li>)}</ul>
                </section>
                {activeReport.sections.map((section) => (
                  <section key={section.key}>
                    <h3>{section.title}</h3>
                    {section.type === "table" ? (
                      <ul>{section.rows.map((row, index) => <li key={index}><strong>{row.label}:</strong> {row.value}</li>)}</ul>
                    ) : (
                      <ul>{section.items.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <p className="text-muted">{isZh ? "无法重建报告内容。" : "Report content could not be rebuilt."}</p>
            )}

            <h3 className="dispute-admin-heading">{isZh ? "AI 内容分析与工作稿" : "AI Review: Content Analysis & Working Draft"}</h3>
            <p className="strategy-help">
              {isZh
                ? "由管理员手动触发的真实 AI 生成，独立于上方基于规则的报告。请先预览确认，再点击保存；保存前的内容不会写入表格。"
                : "Admin-triggered real AI generation, separate from the rule-based report above. Always preview first — nothing is written until you explicitly click Save."}
            </p>

            <h4 className="dispute-admin-subheading">{isZh ? "内容分析" : "Content Analysis"}</h4>
            <p>
              <strong>{isZh ? "状态：" : "Status: "}</strong>{analysisStatusLabel}
              {(activeAnalysisMeta?.providerMeta?.model || aiEnvelope) && (
                <>
                  {" · "}{isZh ? "Schema 版本" : "Schema version"}: {aiEnvelope?.schemaVersion ?? "—"}
                  {activeAnalysisMeta?.providerMeta?.model && <>{" · Model: "}{activeAnalysisMeta.providerMeta.model}</>}
                  {activeAnalysis?.generatedAt && <>{" · "}{isZh ? "生成于 " : "Generated "}{formatDisputeDateTime(activeAnalysis.generatedAt, lang)}</>}
                </>
              )}
            </p>
            <div className="dispute-admin-actions">
              <button className="btn btn--secondary btn--small" onClick={() => runContentAnalysis(true)} disabled={analysisBusy !== ""}>
                {analysisBusy === "generating"
                  ? (isZh ? "生成中…" : "Generating…")
                  : (analysisStatus !== "none" ? (isZh ? "重新生成内容分析（预览）" : "Regenerate Content Analysis") : (isZh ? "生成内容分析（预览）" : "Generate Content Analysis"))}
              </button>
              <button className="btn btn--primary btn--small" onClick={() => runContentAnalysis(false)} disabled={analysisBusy !== ""}>
                {analysisBusy === "saving" ? (isZh ? "保存中…" : "Saving…") : (isZh ? "保存" : "Save")}
              </button>
            </div>
            {activeAnalysis ? (
              <>
                {activeAnalysis.unreadableFiles?.length > 0 && (
                  <div className="notice notice--warm strategy-inline-notice">
                    <p>
                      {isZh ? "以下文件无法自动读取：" : "These files could not be read automatically: "}
                      {activeAnalysis.unreadableFiles.map((f) => f.fileName).join(", ")}
                    </p>
                  </div>
                )}
                <div className="dispute-admin-long">
                  <strong>{isZh ? "案件材料摘要" : "Case Materials Summary"}</strong>
                  <p>{activeAnalysis.analysis?.caseMaterialsSummary}</p>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "缺失证据" : "Missing Evidence"}</strong>
                  <ul>{(activeAnalysis.analysis?.missingEvidence || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "时间线" : "Timeline"}</strong>
                  <ul>{(activeAnalysis.analysis?.timeline || []).map((item, i) => <li key={i}><strong>{item.date}</strong> — {item.description} ({item.source})</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "关键问题" : "Key Issues"}</strong>
                  <ul>{(activeAnalysis.analysis?.keyIssues || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "初步评估" : "Preliminary Assessment"}</strong>
                  <p>{activeAnalysis.analysis?.preliminaryAssessment}</p>
                </div>
              </>
            ) : (
              <p className="text-muted">{isZh ? "尚未生成内容分析。" : "No content analysis yet."}</p>
            )}

            <h4 className="dispute-admin-subheading">{isZh ? "工作稿" : "Working Draft"}</h4>
            <p className="strategy-help">
              {isZh
                ? "内部工作稿 — 不是法律意见，也不是可直接提交的正式法院文件，须经律师审阅。需先保存内容分析才能生成。"
                : "Internal working draft — not legal advice, not a document ready to file, must be reviewed by counsel. Requires a saved Content Analysis first."}
            </p>
            <p>
              <strong>{isZh ? "状态：" : "Status: "}</strong>{draftStatusLabel}
              {(draftMeta?.providerMeta?.model || aiEnvelope) && (
                <>
                  {" · "}{isZh ? "Schema 版本" : "Schema version"}: {aiEnvelope?.schemaVersion ?? "—"}
                  {draftMeta?.providerMeta?.model && <>{" · Model: "}{draftMeta.providerMeta.model}</>}
                </>
              )}
            </p>
            <div className="dispute-admin-actions">
              <button
                className="btn btn--secondary btn--small"
                onClick={() => runWorkingDraft(true)}
                disabled={draftBusy !== "" || !(savedContentAnalysis || analysisPreview)}
              >
                {draftBusy === "generating"
                  ? (isZh ? "生成中…" : "Generating…")
                  : (draftStatus !== "none" ? (isZh ? "重新生成工作稿（预览）" : "Regenerate Working Draft") : (isZh ? "生成工作稿（预览）" : "Generate Working Draft"))}
              </button>
              <button className="btn btn--primary btn--small" onClick={() => runWorkingDraft(false)} disabled={draftBusy !== ""}>
                {draftBusy === "saving" ? (isZh ? "保存中…" : "Saving…") : (isZh ? "保存" : "Save")}
              </button>
            </div>
            {!savedContentAnalysis && !analysisPreview && (
              <p className="text-muted">{isZh ? "请先生成并保存内容分析。" : "Generate and save a Content Analysis first."}</p>
            )}
            {activeDraft && (
              <>
                <div className="dispute-admin-long"><strong>{isZh ? "标题" : "Title"}</strong><p>{activeDraft.title}</p></div>
                <div className="dispute-admin-long"><strong>{isZh ? "案件立场摘要" : "Case Position Summary"}</strong><p>{activeDraft.casePositionSummary}</p></div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "疑似可承认事实 / 待核实程序性事实" : "Facts Potentially Admitted / Procedural Facts to Verify"}</strong>
                  <ul>{(activeDraft.factsToAdmit || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "不予承认 / 待核实事实" : "Facts to Deny / Not Admitted"}</strong>
                  <ul>{(activeDraft.factsToDenyOrNotAdmit || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "答辩要点" : "Response Points"}</strong>
                  <ul>{(activeDraft.responsePoints || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "所需证据" : "Evidence Needed"}</strong>
                  <ul>{(activeDraft.evidenceNeeded || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "后续程序步骤" : "Procedural Next Steps"}</strong>
                  <ul>{(activeDraft.proceduralNextSteps || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long">
                  <strong>{isZh ? "风险提示" : "Risk Notes"}</strong>
                  <ul>{(activeDraft.riskNotes || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                <div className="dispute-admin-long"><strong>{isZh ? "工作稿正文" : "Draft Text"}</strong><p>{activeDraft.draftText}</p></div>
                <div className="notice notice--warm strategy-inline-notice"><p>{activeDraft.disclaimer}</p></div>
              </>
            )}

            {isSupremeCourt && formTwoEligibility && (
              <>
                <h3 className="dispute-admin-heading">{isZh ? "Form 2 工作稿" : "Form 2 Working Draft"}</h3>
                <p className="strategy-help">
                  {isZh
                    ? "工作稿 — 不得用于提交法院。仅供内部使用，须经律师审阅并最终定稿后方可提交或送达。"
                    : "WORKING DRAFT — NOT FOR FILING. For internal use only; must be reviewed and finalized by counsel before filing or service."}
                </p>
                {formTwoEligibility.eligible ? (
                  <div className="notice notice--success strategy-inline-notice">
                    <p>{isZh ? "已满足生成 Form 2 工作稿的条件。" : "This file meets the requirements to generate a Form 2 working draft."}</p>
                  </div>
                ) : (
                  <div className="notice notice--warm strategy-inline-notice">
                    <p>{isZh ? "尚不符合生成条件，缺少：" : "Not yet eligible. Missing:"}</p>
                    <ul>{formTwoEligibility.missing.map((item, index) => <li key={index}>{isZh ? item.zh : item.en}</li>)}</ul>
                  </div>
                )}

                {formTwoEligibility.eligible && (
                  <>
                    <h4 className="dispute-admin-subheading">{isZh ? "逐段答辩" : "Paragraph-by-Paragraph Response"}</h4>
                    {formTwoParagraphs.map((row, index) => (
                      <div className="form-row dispute-form2-row" key={index}>
                        <div className="form-group">
                          <label>{isZh ? `第 ${index + 1} 段 — 指控内容` : `Paragraph ${index + 1} — Allegation`}</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            value={row.allegationText}
                            onChange={(e) => updateFormTwoParagraph(index, "allegationText", e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>{isZh ? "答复" : "Position"}</label>
                          <select
                            className="form-control"
                            value={row.position}
                            onChange={(e) => updateFormTwoParagraph(index, "position", e.target.value)}
                          >
                            <option value="">{isZh ? "请选择" : "Please select"}</option>
                            <option value="Admitted">{isZh ? "承认" : "Admitted"}</option>
                            <option value="Denied">{isZh ? "否认" : "Denied"}</option>
                            <option value="Outside Knowledge">{isZh ? "非本人所知" : "Outside Knowledge"}</option>
                          </select>
                        </div>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeFormTwoParagraph(index)}>
                          {isZh ? "删除" : "Remove"}
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn--secondary btn--small" onClick={addFormTwoParagraph}>
                      {isZh ? "+ 添加段落" : "+ Add Paragraph"}
                    </button>

                    <div className="form-group">
                      <label>{isZh ? "答辩的法律依据" : "Defendant's Legal Basis"}</label>
                      <textarea className="form-control" rows={3} value={formTwoLegalBasis} onChange={(e) => setFormTwoLegalBasis(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>{isZh ? "请求的济助" : "Relief Sought"}</label>
                      <textarea className="form-control" rows={2} value={formTwoReliefSought} onChange={(e) => setFormTwoReliefSought(e.target.value)} />
                    </div>

                    <div className="dispute-admin-actions">
                      <button className="btn btn--primary" onClick={runGenerateFormTwoDraft} disabled={formTwoGenerating}>
                        {formTwoGenerating
                          ? (isZh ? "生成中…" : "Generating…")
                          : (isZh ? "生成 Form 2 工作稿 PDF" : "Generate Form 2 Working Draft PDF")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
