import { useEffect, useMemo, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import { getPerfLog, clearPerfLog, PERF_OPERATIONS, SLOW_MS_THRESHOLD } from "../../utils/perfLog";

const OPERATIONS = Object.values(PERF_OPERATIONS);

const T = {
  en: {
    title: "System Performance",
    desc: "Timing and error log for the last 100 requests, captured in this browser only. Monitoring only — nothing here changes any listing, upload, or marketing data.",
    clearLog: "Clear Log",
    clearConfirm: "Clear the local performance log? This only affects monitoring data on this browser.",
    refresh: "Refresh",
    totalLogged: "Requests logged",
    errorCount: "Errors",
    slowCount: `Slow (>${(SLOW_MS_THRESHOLD / 1000).toFixed(0)}s)`,
    avgDuration: "Avg duration",
    filterAll: "All",
    colTime: "Time",
    colOperation: "Operation",
    colAction: "Function",
    colDuration: "Duration",
    colStatus: "Status",
    colRequestId: "Request ID",
    colDetail: "Detail",
    statusOk: "OK",
    statusError: "Error",
    empty: "No requests logged yet. Use Load Listings, Generate/Save Cover Page, Upload Image, AI Marketing, or Property Update anywhere in the Studio, then come back here.",
    noteTitle: "What this measures",
    note: "These 6 operations run as a single direct request from the browser to the Google Apps Script backend — there is no separate Netlify hop to measure for them. \"Duration\" is the full round trip (network + Apps Script execution + the Google Sheets/Drive save). A future phase can report Apps Script's own execution time separately if finer breakdown is needed.",
  },
  zh: {
    title: "系统性能监控",
    desc: "记录最近 100 次请求的耗时与错误，仅保存在当前浏览器。仅用于监控，不会更改任何房源、上传或营销数据。",
    clearLog: "清空日志",
    clearConfirm: "确定要清空本地性能日志吗？此操作仅影响本浏览器的监控数据。",
    refresh: "刷新",
    totalLogged: "已记录请求数",
    errorCount: "错误数",
    slowCount: `慢请求 (>${(SLOW_MS_THRESHOLD / 1000).toFixed(0)}秒)`,
    avgDuration: "平均耗时",
    filterAll: "全部",
    colTime: "时间",
    colOperation: "操作类型",
    colAction: "函数",
    colDuration: "耗时",
    colStatus: "状态",
    colRequestId: "请求ID",
    colDetail: "详情",
    statusOk: "成功",
    statusError: "失败",
    empty: "暂无记录。请在后台任意页面执行「加载房源列表」「生成/保存封面」「上传图片」「AI营销文案」或「更新房源信息」后再回到此页查看。",
    noteTitle: "监控说明",
    note: "以上 6 项操作都是浏览器直接请求 Google Apps Script 后端，中间没有经过 Netlify，因此不存在单独的 Netlify 耗时环节。「耗时」是完整往返时间（网络 + Apps Script 执行 + 写入 Google 表格/云端硬盘）。如需更细的拆分，后续可让 Apps Script 在响应中附带自身执行时间。",
  },
};

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

function durationColor(entry) {
  if (entry.status === "error") return "var(--color-error)";
  if (entry.durationMs >= SLOW_MS_THRESHOLD) return "var(--color-warning)";
  return "var(--color-success)";
}

function rowBg(entry) {
  if (entry.status === "error") return "rgba(220, 38, 38, 0.06)";
  if (entry.durationMs >= SLOW_MS_THRESHOLD) return "rgba(217, 119, 6, 0.06)";
  return "transparent";
}

export default function SystemPerformance() {
  const lang = useLang();
  const Lp = T[lang] ?? T.en;
  const [entries, setEntries] = useState(() => getPerfLog());
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const id = setInterval(() => setEntries(getPerfLog()), 4000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.operation === filter)),
    [entries, filter]
  );

  const stats = useMemo(() => {
    const errorCount = entries.filter((e) => e.status === "error").length;
    const slowCount = entries.filter((e) => e.status !== "error" && e.durationMs >= SLOW_MS_THRESHOLD).length;
    const avg = entries.length
      ? Math.round(entries.reduce((sum, e) => sum + (e.durationMs || 0), 0) / entries.length)
      : 0;
    return { total: entries.length, errorCount, slowCount, avg };
  }, [entries]);

  function handleClear() {
    if (!window.confirm(Lp.clearConfirm)) return;
    clearPerfLog();
    setEntries([]);
  }

  const statCards = [
    { label: Lp.totalLogged, value: stats.total, color: "var(--color-text)" },
    { label: Lp.errorCount, value: stats.errorCount, color: stats.errorCount ? "var(--color-error)" : "var(--color-text)" },
    { label: Lp.slowCount, value: stats.slowCount, color: stats.slowCount ? "var(--color-warning)" : "var(--color-text)" },
    { label: Lp.avgDuration, value: `${stats.avg}ms`, color: "var(--color-text)" },
  ];

  return (
    <div>
      <div className="flex-between mb-24" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{Lp.title}</h1>
          <p className="text-muted" style={{ marginTop: 4, maxWidth: 640 }}>{Lp.desc}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="btn" onClick={() => setEntries(getPerfLog())}>{Lp.refresh}</button>
          <button className="btn" onClick={handleClear}>{Lp.clearLog}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: "14px 16px" }}>
            <div className="text-muted" style={{ fontSize: "0.78rem", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontWeight: 800, fontSize: "1.4rem", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="dash-filter-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`dash-filter-tab${filter === "all" ? " dash-filter-tab--active" : ""}`}
          onClick={() => setFilter("all")}
        >
          {Lp.filterAll}
          {entries.length > 0 && <span className="dash-filter-tab__count">{entries.length}</span>}
        </button>
        {OPERATIONS.map((op) => {
          const count = entries.filter((e) => e.operation === op).length;
          return (
            <button
              key={op}
              className={`dash-filter-tab${filter === op ? " dash-filter-tab--active" : ""}`}
              onClick={() => setFilter(op)}
            >
              {op}
              {count > 0 && <span className="dash-filter-tab__count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p className="text-muted">{Lp.empty}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {[Lp.colTime, Lp.colOperation, Lp.colAction, Lp.colDuration, Lp.colStatus, Lp.colRequestId, Lp.colDetail].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.requestId} style={{ borderBottom: "1px solid var(--color-border)", background: rowBg(e) }}>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--color-text-muted)" }}>{fmtTime(e.startedAt)}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{e.operation}</td>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--color-text-muted)" }}>{e.action}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700, whiteSpace: "nowrap", color: durationColor(e) }}>
                      {e.durationMs}ms
                    </td>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                      <span
                        className="badge"
                        style={{
                          background: e.status === "error" ? "rgba(220,38,38,0.12)" : "rgba(22,163,74,0.12)",
                          color: e.status === "error" ? "var(--color-error)" : "var(--color-success)",
                        }}
                      >
                        {e.status === "error" ? Lp.statusError : Lp.statusOk}
                        {e.httpStatus ? ` · ${e.httpStatus}` : ""}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }} title={e.requestId}>
                      {String(e.requestId).slice(0, 8)}
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--color-error)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.errorMessage || ""}>
                      {e.errorMessage || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{Lp.noteTitle}</div>
        <p className="text-muted" style={{ fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>{Lp.note}</p>
      </div>
    </div>
  );
}
