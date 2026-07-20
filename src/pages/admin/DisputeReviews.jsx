import { useEffect, useMemo, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import {
  DISPUTE_STATUSES,
  NEXT_STEPS,
  REVIEW_PRIORITIES,
  displayDisputeOption,
  generateDisputeReport,
  getDisputeReview,
  getDisputeReviews,
  rebuildReportsFromRecord,
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
    if (!needle) return rows;
    return rows.filter((item) => ["Review ID", "Client Name", "Email", "Dispute Type", "Status"]
      .some((key) => String(item[key] || "").toLowerCase().includes(needle)));
  }, [query, rows]);

  // Rebuilt locally from the stored record so the reviewer sees exactly the
  // content that will be written to the PDFs.
  const rebuilt = useMemo(() => {
    if (!selected?.review) return null;
    try {
      return rebuildReportsFromRecord(selected.review, (selected.files || []).map((file) => ({
        fileId: file["File ID"],
        fileName: file["File Name"],
        documentCategory: file["Document Category"],
        documentDate: file["Document Date"],
        senderIssuer: file["Sender / Issuer"],
        description: file["Description"],
      })));
    } catch {
      return null;
    }
  }, [selected]);

  async function openReview(reviewId) {
    setError("");
    setMessage("");
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

  const review = selected?.review;
  const activeReport = rebuilt?.[detailLang];

  return (
    <div className="admin-page strategy-reports-page">
      <div className="admin-page__header">
        <div>
          <p className="eyebrow">Dispute_Reviews</p>
          <h1>{isZh ? "争议初评案件" : "Dispute Reviews"}</h1>
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
                  <td>{item["Created At"] || "-"}</td>
                  <td>{item["Client Name"] || "-"}</td>
                  <td>{displayDisputeOption(item["Dispute Type"], lang) || "-"}</td>
                  <td>{displayDisputeOption(item["Status"], lang) || "-"}</td>
                  <td>{item["Hearing Date"] || "-"}</td>
                  <td>{item["Filing Deadline"] || "-"}</td>
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
            <div className="strategy-report-modal__header">
              <div>
                <h2>{review["Review ID"]}</h2>
                <p>{displayDisputeOption(review["Dispute Type"], lang)} · {displayDisputeOption(review["Status"], lang)}</p>
              </div>
              <button className="btn btn--secondary" onClick={() => setSelected(null)}>{isZh ? "关闭" : "Close"}</button>
            </div>

            <div className="dispute-admin-actions">
              {review["File Folder URL"] && (
                <a className="btn btn--secondary btn--small" href={review["File Folder URL"]} target="_blank" rel="noreferrer">
                  {isZh ? "打开证据文件夹" : "Open Evidence Folder"}
                </a>
              )}
              {review["Report EN URL"] && (
                <a className="btn btn--secondary btn--small" href={review["Report EN URL"]} target="_blank" rel="noreferrer">
                  {isZh ? "英文报告 PDF" : "English Report PDF"}
                </a>
              )}
              {review["Report ZH URL"] && (
                <a className="btn btn--secondary btn--small" href={review["Report ZH URL"]} target="_blank" rel="noreferrer">
                  {isZh ? "中文报告 PDF" : "Chinese Report PDF"}
                </a>
              )}
            </div>

            <h3 className="dispute-admin-heading">{isZh ? "问询资料" : "Intake"}</h3>
            <div className="strategy-report-detail-meta">
              {INTAKE_FIELDS.map((key) => review[key] ? (
                <div key={key}><strong>{key}</strong><span>{displayDisputeOption(review[key], lang)}</span></div>
              ) : null)}
            </div>
            {LONG_FIELDS.map((key) => review[key] ? (
              <div className="dispute-admin-long" key={key}>
                <strong>{key}</strong>
                <p>{review[key]}</p>
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
                      <span>{[displayDisputeOption(file["Document Category"], lang), file["Document Date"], file["Sender / Issuer"], file["Description"]].filter(Boolean).join(" · ")}</span>
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
              <button className="btn btn--secondary" onClick={runGenerateReport} disabled={generating || !rebuilt}>
                {generating
                  ? (isZh ? "生成中…" : "Generating…")
                  : (isZh ? "生成 / 重新生成英文 + 中文报告" : "Generate / Regenerate EN + ZH Reports")}
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
          </div>
        </div>
      )}
    </div>
  );
}
