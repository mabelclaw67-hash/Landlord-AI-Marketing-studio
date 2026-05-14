import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllApplications } from "../../utils/storage";

const STATUS_BADGE = {
  Pending:   "badge--draft",
  Reviewing: "badge--review",
  Approved:  "badge--published",
  Rejected:  "badge--draft",
  "On Hold": "badge--review",
};

function quickScreen(app) {
  const missing = [];
  if (!app.applicantName)            missing.push("Name");
  if (!app.email)                    missing.push("Email");
  if (!app.phone && !app.wechat)     missing.push("Contact");
  if (!app.moveInDate)               missing.push("Move-in Date");
  if (!app.employmentStatus)         missing.push("Employment");
  if (!app.monthlyIncome)            missing.push("Income");
  if (missing.length === 0) return { label: "Complete / 完整", type: "ok" };
  if (missing.length <= 2)  return { label: `${missing.length} field(s) missing`, type: "warn" };
  return { label: `${missing.length} fields missing`, type: "error" };
}

function fmt(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-CA"); } catch { return iso; }
}

function isSetupErr(msg) {
  return !msg ? false : (msg.includes("Unknown POST action") || msg.includes("Unknown GET action") || msg.includes("Unknown action"));
}

export default function Leads() {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    getAllApplications()
      .then(setApps)
      .catch((e) => setError(e.message || "Failed to load applications."))
      .finally(() => setLoading(false));
  }, []);

  const setupError  = isSetupErr(error);
  const listingIds  = [...new Set(apps.map((a) => a.listingId).filter(Boolean))];
  const visible     = filter ? apps.filter((a) => a.listingId === filter) : apps;

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>
            Rental Applications / AI 初筛
          </h1>
          <p className="text-muted text-sm">
            租客申请 · AI 初步筛查 · 数据来源：<code>07 Intake Records</code>
            {!loading && !setupError && ` · ${apps.length} total`}
          </p>
        </div>
        <Link to="/admin/listings" className="btn btn--ghost btn--sm">← Listings</Link>
      </div>

      {/* Setup notice — shown when Apps Script not yet redeployed */}
      {setupError && (
        <div className="notice notice--warm mb-24">
          <h4>Apps Script Redeploy Required / 需要重新部署 Apps Script</h4>
          <p style={{ marginBottom: 8 }}>
            The application intake API actions (<code>saveRentalApplication</code>,{" "}
            <code>getAllApplications</code>, <code>getApplicationById</code>, etc.) have not been
            deployed to Apps Script yet. Once you paste and redeploy the final Code.gs, this page
            will automatically load records from <code>07 Intake Records</code>.
          </p>
          <p style={{ opacity: 0.86 }}>
            后台函数尚未部署。完成 Apps Script 重新部署后，此页面将自动读取{" "}
            <code>07 Intake Records</code> 中的申请记录。
          </p>
        </div>
      )}

      {/* Real error (non-setup) */}
      {error && !setupError && (
        <div className="notice notice--error mb-24">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Listing filter */}
      {listingIds.length > 1 && (
        <div className="card mb-16" style={{ padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              Filter by listing:
            </span>
            <select
              className="select-control"
              style={{ maxWidth: 300 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All listings ({apps.length})</option>
              {listingIds.map((id) => (
                <option key={id} value={id}>
                  {id} ({apps.filter((a) => a.listingId === id).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="card mb-24">
          <div style={{ textAlign: "center", padding: "28px 12px" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>🗂️</div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 8 }}>
              {setupError
                ? "Waiting for Apps Script deployment / 等待后台部署"
                : "No applications yet / 暂无申请记录"}
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem", lineHeight: 1.7, maxWidth: 580, margin: "0 auto" }}>
              {setupError
                ? "Records will appear here once the Apps Script backend is redeployed."
                : <>
                    Share the application link with prospective tenants:{" "}
                    <code style={{ background: "#f5f8f5", padding: "2px 6px", borderRadius: 4 }}>
                      {window.location.origin}/apply/[listing-id]
                    </code>
                  </>}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
          <div className="card" style={{ padding: 0, overflow: "hidden", minWidth: 780 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f5f8f5", borderBottom: "1.5px solid var(--color-border)" }}>
                  {[
                    "Record ID",
                    "Listing",
                    "Applicant Name",
                    "Submitted",
                    "PDF",
                    "Screening / 初筛",
                    "Review Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((app, i) => {
                  const screen = quickScreen(app);
                  const screenColor =
                    screen.type === "ok"
                      ? { bg: "#edf7ee", fg: "#2e7d4f", border: "#b8e4c4" }
                      : screen.type === "warn"
                      ? { bg: "#fff8f3", fg: "#a05a00", border: "#f0cfa0" }
                      : { bg: "#fff0f0", fg: "#c0392b", border: "#f5c6c6" };

                  return (
                    <tr
                      key={app.recordId || i}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem" }}>
                        {app.recordId || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
                        {app.listingId || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {app.applicantName || <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {fmt(app.submittedAt)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {app.pdfUrl ? (
                          <a
                            href={app.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: 600 }}
                          >
                            PDF ↗
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: screenColor.bg,
                            color: screenColor.fg,
                            border: `1px solid ${screenColor.border}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {screen.type === "ok" ? "✅" : "⚠️"} {screen.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className={`badge ${STATUS_BADGE[app.reviewStatus] || "badge--draft"}`}>
                          {app.reviewStatus || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {app.recordId && (
                          <Link
                            to={`/admin/application/${app.recordId}`}
                            className="btn btn--ghost btn--sm"
                          >
                            Review →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application link helper */}
      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-primary)", marginBottom: 8 }}>
          Application Link / 申请入口链接
        </h3>
        <p style={{ fontSize: "0.84rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
          Share this URL with prospective tenants — replace <code>[listing-id]</code> with the actual ID:
        </p>
        <code
          style={{
            display: "block",
            background: "#f5f8f5",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: "0.82rem",
            wordBreak: "break-all",
          }}
        >
          {window.location.origin}/apply/[listing-id]
        </code>
      </div>
    </div>
  );
}
