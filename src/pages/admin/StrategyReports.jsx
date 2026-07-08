import { useState } from "react";
import { apiPost } from "../../utils/api";
import { getStudioRequestAuth } from "../../utils/trialAccess";
import { useLang } from "../../contexts/LangContext";

export default function StrategyReports() {
  const lang = useLang();
  const isZh = lang === "zh";
  const [assessmentId, setAssessmentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanId = assessmentId.trim();
    if (!cleanId) {
      setMessage({ type: "error", text: isZh ? "请输入 Assessment ID。" : "Please enter an Assessment ID." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await apiPost({
        action: "regeneratePropertyStrategyReport",
        assessmentId: cleanId,
        ...getStudioRequestAuth("rental"),
      });
      setMessage({
        type: "success",
        text: isZh
          ? `报告已重新生成，并已写回第 ${result.rowNumber} 行 Report URL。`
          : `Report regenerated and written back to Report URL on row ${result.rowNumber}.`,
        reportUrl: result.reportUrl,
        folderName: result.folderName,
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to regenerate report." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <p className="eyebrow">{isZh ? "内部工具" : "Internal Tool"}</p>
          <h1>{isZh ? "AI 房产策略报告" : "AI Property Strategy Reports"}</h1>
          <p className="text-muted">
            {isZh
              ? "从 Strategy_Assessments 读取已有数据，重新生成内部 PDF，并写回 Report URL。"
              : "Read an existing Strategy_Assessments row, regenerate the internal PDF, and write back Report URL."}
          </p>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Assessment ID</label>
          <input
            className="form-control"
            value={assessmentId}
            onChange={(event) => setAssessmentId(event.target.value)}
            placeholder="PSA-20260707-123456"
            disabled={busy}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? (isZh ? "正在生成..." : "Regenerating...") : (isZh ? "重新生成 Report PDF" : "Regenerate Report PDF")}
          </button>
        </div>
      </form>

      {message && (
        <div className={`notice ${message.type === "error" ? "notice--error" : "notice--success"}`}>
          <p>{message.text}</p>
          {message.folderName && (
            <p>{isZh ? "保存文件夹：" : "Saved folder:"} {message.folderName}</p>
          )}
          {message.reportUrl && (
            <p>
              <a href={message.reportUrl} target="_blank" rel="noreferrer">
                {isZh ? "打开内部 Drive PDF" : "Open internal Drive PDF"}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
