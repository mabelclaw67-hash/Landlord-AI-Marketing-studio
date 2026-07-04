import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getAllApplications,
  getApplicationsByListing,
  getListings,
  requestSupportingDocuments,
} from "../../utils/storage";
import { useLang } from "../../contexts/LangContext";
import { isAdminSessionActive, readTrialAccess } from "../../utils/trialAccess";

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
  if (missing.length === 0) return { label: "complete", type: "ok" };
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

function documentBadge(app) {
  if (app.documentUploadStatus === "Complete") return { label: "Complete", bg: "#edf7ee", fg: "#2e7d4f", border: "#b8e4c4" };
  if (app.documentUploadStatus === "Uploaded") return { label: "Documents Uploaded", bg: "#edf7ee", fg: "#2e7d4f", border: "#b8e4c4" };
  if (app.documentRequestSent === "Yes") return { label: "Documents Pending", bg: "#fff8f3", fg: "#a05a00", border: "#f0cfa0" };
  if (app.shortlistStatus === "Shortlisted") return { label: "Shortlisted", bg: "#edf3ff", fg: "#2856a3", border: "#bfd0ff" };
  return { label: "New", bg: "#f5f8f5", fg: "#647067", border: "#dde7df" };
}

function reportBadge(app) {
  const status = String(app.fullAuditReportStatus || "").toLowerCase();
  if (status.includes("failed")) return { label: "Drive save failed", tone: "error" };
  if (app.fullAuditReportPdfUrl) {
    return { label: "Generated", tone: "ok" };
  }
  if (app.fullAuditReportUrl) return { label: "Drive save failed", tone: "error" };
  return { label: "Not generated", tone: "muted" };
}

function listingIdNumber(id) {
  const match = String(id || "").match(/(\d{4})\D+(\d+)\s*$/);
  if (match) return Number(match[1]) * 100000 + Number(match[2]);
  const fallback = String(id || "").match(/(\d+)\s*$/);
  return fallback ? Number(fallback[1]) : 0;
}

function compareListingIdDesc(a, b) {
  const numDiff = listingIdNumber(b) - listingIdNumber(a);
  if (numDiff) return numDiff;
  return String(b || "").localeCompare(String(a || ""));
}

function submittedTime(app) {
  const time = new Date(app.submittedAt || app.createdAt || app.updatedAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortApplications(apps) {
  return [...apps].sort((a, b) => {
    const listingDiff = compareListingIdDesc(a.listingId, b.listingId);
    if (listingDiff) return listingDiff;
    const dateDiff = submittedTime(b) - submittedTime(a);
    if (dateDiff) return dateDiff;
    return String(b.recordId || "").localeCompare(String(a.recordId || ""));
  });
}

export default function Leads() {
  const lang = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryListingId = searchParams.get("listingId") || "";
  const [apps, setApps]       = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [busyId, setBusyId]   = useState("");
  const filter = queryListingId;
  const isInternalAdmin = isAdminSessionActive();
  const trialSession = readTrialAccess();
  const isTrialUser = !!trialSession && !isInternalAdmin;
  const canSeeInternalDriveLinks = isInternalAdmin;

  const refreshApplications = useCallback(() => {
    const appPromise = filter
      ? getApplicationsByListing(filter)
      : isInternalAdmin
      ? getAllApplications()
      : Promise.resolve([]);

    return Promise.all([appPromise, getListings()]).then(([appRows, listingRows]) => {
      setApps(Array.isArray(appRows) ? appRows : []);
      setListings(Array.isArray(listingRows) ? listingRows : []);
      setError("");
    });
  }, [filter, isInternalAdmin]);

  useEffect(() => {
    refreshApplications()
      .catch((e) => setError(e.message || "Failed to load applications."))
      .finally(() => setLoading(false));
  }, [refreshApplications]);

  async function handleRequestDocuments(app) {
    if (!app.recordId) return;
    const ok = window.confirm(`Send supporting document upload link to ${app.email}?`);
    if (!ok) return;
    setBusyId(app.recordId);
    setError("");
    try {
      await requestSupportingDocuments(app.recordId);
      await refreshApplications();
    } catch (e) {
      setError(e.message || "Failed to request supporting documents.");
    } finally {
      setBusyId("");
    }
  }

  function handleFilterChange(nextListingId) {
    if (nextListingId) setSearchParams({ listingId: nextListingId });
    else setSearchParams({});
  }

  const setupError  = isSetupErr(error);
  const sortedApps  = sortApplications(apps);
  const listingIdsFromApps = sortedApps.map((a) => a.listingId).filter(Boolean);
  const listingIdsFromListings = listings.map((l) => l.id).filter(Boolean);
  const listingIds  = [...new Set([...listingIdsFromListings, ...listingIdsFromApps])].sort(compareListingIdDesc);
  const visible = filter && !error
    ? sortedApps.filter((a) => a.listingId === filter)
    : isInternalAdmin
    ? sortedApps
    : [];
  const accessDenied = !setupError && String(error || "").toLowerCase().includes("access denied");
  const trialNeedsListing = isTrialUser && !filter && !loading && !setupError && !accessDenied;
  const resultLabel = accessDenied
    ? "Access denied. You do not have permission to view this listing's applications."
    : trialNeedsListing
    ? "Please select one of your listings to view applications."
    : filter
    ? `Showing ${visible.length} application${visible.length === 1 ? "" : "s"} for ${filter}`
    : `Showing ${visible.length} application${visible.length === 1 ? "" : "s"} across all listings`;

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>
            {lang === "zh" ? "租客申请 · AI 初筛" : "Rental Applications · AI Screening"}
          </h1>
          <p className="text-muted text-sm">
            租客申请 · AI 初步筛查 · 数据来源：<code>07 Intake Records</code>
            {!loading && !setupError && ` · ${apps.length} total`}
          </p>
          {!loading && !setupError && (
            <p className="text-muted text-sm" style={{ marginTop: 4 }}>
              {resultLabel}
            </p>
          )}
        </div>
        <Link to="/admin/listings" className="btn btn--ghost btn--sm">← Listings</Link>
      </div>

      {/* Setup notice — shown when Apps Script not yet redeployed */}
      {setupError && (
        <div className="notice notice--warm mb-24">
          <h4>{lang === "zh" ? "需要重新部署 Apps Script" : "Apps Script Redeploy Required"}</h4>
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
          <h4>{accessDenied ? "Access denied" : "Error"}</h4>
          <p>{accessDenied ? resultLabel : error}</p>
        </div>
      )}

      {/* Listing filter */}
      {!loading && !setupError && listingIds.length > 0 && (
        <div className="card mb-16 admin-leads-filter-card">
          <div className="admin-leads-filter-card__row">
            <label htmlFor="listing-filter" className="admin-leads-filter-card__label">
              Filter by listing
            </label>
            <select
              id="listing-filter"
              className="select-control"
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              {isInternalAdmin ? (
                <option value="">All listings ({apps.length})</option>
              ) : (
                <option value="" disabled>Select one of your listings</option>
              )}
              {listingIds.map((id) => (
                <option key={id} value={id}>
                  {id} ({apps.filter((a) => a.listingId === id).length})
                </option>
              ))}
            </select>
            <span className="admin-leads-filter-card__count">{resultLabel}</span>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          Loading…
        </div>
      ) : accessDenied ? (
        <div className="card mb-24">
          <div style={{ textAlign: "center", padding: "28px 12px" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 8 }}>
              {lang === "zh" ? "访问被拒绝" : "Access denied"}
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem", lineHeight: 1.7, maxWidth: 580, margin: "0 auto" }}>
              Access denied. You do not have permission to view this listing's applications.
            </p>
          </div>
        </div>
      ) : trialNeedsListing ? (
        <div className="card mb-24">
          <div style={{ padding: "24px 12px" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 8 }}>
              {lang === "zh" ? "请选择房源查看申请" : "Select a listing to view applications"}
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 14 }}>
              {lang === "zh"
                ? "外部房东账号只能查看自己房源下的申请，不能打开全部申请列表。"
                : "External listing owners can only view applications for their own listings. The all-applications view is internal admin only."}
            </p>
            <div className="admin-action-row admin-action-row--full-mobile">
              {listingIds.map((id) => (
                <Link key={id} to={`/admin/leads?listingId=${encodeURIComponent(id)}`} className="btn btn--ghost btn--sm">
                  {id} ({apps.filter((a) => a.listingId === id).length})
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="card mb-24">
          <div style={{ textAlign: "center", padding: "28px 12px" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>🗂️</div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 8 }}>
              {setupError
                ? (lang === "zh" ? "等待后台部署" : "Waiting for Apps Script deployment")
                : (lang === "zh" ? "暂无申请记录" : "No applications yet")}
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
        <>
        <div className="admin-mobile-card-list">
          {visible.map((app, i) => {
            const screen = quickScreen(app);
            const doc = documentBadge(app);
            const report = reportBadge(app);
            const canRequestDocs = app.email && app.listingId && app.documentRequestSent !== "Yes";
            const reviewPath = app.recordId ? `/admin/application/${app.recordId}` : "";

            return (
              <article className="admin-application-card" key={app.recordId || i}>
                <div className="admin-application-card__top">
                  <div>
                    <h2>{app.applicantName || "Applicant"}</h2>
                    <p>{app.recordId || "No record ID"}</p>
                  </div>
                  <span className={`badge ${STATUS_BADGE[app.reviewStatus] || "badge--draft"}`}>
                    {app.reviewStatus || "Pending"}
                  </span>
                </div>

                <div className="admin-application-card__meta">
                  <div><span>Listing</span><strong>{app.listingId || "—"}</strong></div>
                  <div><span>Submitted</span><strong>{fmt(app.submittedAt)}</strong></div>
                  <div><span>Documents</span><strong>{doc.label}</strong></div>
                  <div><span>Files</span><strong>{app.uploadedFileCount || 0}</strong></div>
                  <div><span>Initial Summary</span><strong>{screen.type === "ok" ? "Complete" : screen.label}</strong></div>
                  <div><span>Full Audit</span><strong className={`admin-report-status admin-report-status--${report.tone}`}>{report.label}</strong></div>
                </div>

                <div className="admin-application-card__actions">
                  {reviewPath && (
                    <Link to={reviewPath} className="btn btn--primary btn--sm">
                      View Application
                    </Link>
                  )}
                  {reviewPath && (
                    <Link to={`${reviewPath}#screening-summary`} className="btn btn--ghost btn--sm">
                      View Initial Summary
                    </Link>
                  )}
                  {reviewPath && (
                    <Link to={`${reviewPath}#full-audit-report`} className="btn btn--ghost btn--sm">
                      {report.tone === "ok" ? "View Full Audit" : "Generate Full Audit"}
                    </Link>
                  )}
                  {app.fullAuditReportPdfUrl && (
                    <a href={app.fullAuditReportPdfUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                      Download Full Audit PDF
                    </a>
                  )}
                  {canRequestDocs && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={busyId === app.recordId}
                      onClick={() => handleRequestDocuments(app)}
                    >
                      {busyId === app.recordId ? "Sending..." : "Request Documents"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="admin-desktop-table" style={{ overflowX: "auto", marginBottom: 24 }}>
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
                    "Initial Summary",
                    "Full Audit",
                    "Review Status",
                    "Documents",
                    "Support Folder",
                    "Upload Link",
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
                  const doc = documentBadge(app);
                  const report = reportBadge(app);
                  const canRequestDocs = app.email && app.listingId && app.documentRequestSent !== "Yes";
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
                        {canSeeInternalDriveLinks && app.pdfUrl ? (
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
                          {screen.type === "ok" ? "✅" : "⚠️"}{" "}
                          {screen.label === "complete"
                            ? (lang === "zh" ? "完整" : "Complete")
                            : screen.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: report.tone === "ok" ? "#edf7ee" : "#f5f8f5",
                            color: report.tone === "ok" ? "#2e7d4f" : "#647067",
                            border: `1px solid ${report.tone === "ok" ? "#b8e4c4" : "#dde7df"}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {report.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className={`badge ${STATUS_BADGE[app.reviewStatus] || "badge--draft"}`}>
                          {app.reviewStatus || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 180 }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: doc.bg,
                            color: doc.fg,
                            border: `1px solid ${doc.border}`,
                            whiteSpace: "nowrap",
                            marginBottom: 4,
                          }}
                        >
                          {doc.label}
                        </span>
                        <div style={{ color: "var(--color-text-muted)", fontSize: "0.76rem", lineHeight: 1.5 }}>
                          Sent: {app.documentRequestSentAt ? fmt(app.documentRequestSentAt) : "No"}<br />
                          Files: {app.uploadedFileCount || 0}<br />
                          Last: {app.lastUploadAt ? fmt(app.lastUploadAt) : "—"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {canSeeInternalDriveLinks && app.supportDocumentFolderUrl ? (
                          <a href={app.supportDocumentFolderUrl} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, fontSize: "0.8rem" }}>
                            Folder
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {app.uploadLink ? (
                          <a href={app.uploadLink} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, fontSize: "0.8rem" }}>
                            Upload
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {canRequestDocs && (
                            <button
                              type="button"
                              className="btn btn--sm"
                              disabled={busyId === app.recordId}
                              onClick={() => handleRequestDocuments(app)}
                            >
                              {busyId === app.recordId ? "Sending…" : "Request Supporting Documents"}
                            </button>
                          )}
                          {app.recordId && (
                            <Link
                              to={`/admin/application/${app.recordId}`}
                              className="btn btn--ghost btn--sm"
                            >
                              View Application →
                            </Link>
                          )}
                          {app.recordId && (
                            <Link
                              to={`/admin/application/${app.recordId}#full-audit-report`}
                              className="btn btn--ghost btn--sm"
                            >
                              {report.tone === "ok" ? "View Full Audit" : "Generate Full Audit"}
                            </Link>
                          )}
                          {app.fullAuditReportPdfUrl && (
                            <a
                              href={app.fullAuditReportPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn--ghost btn--sm"
                            >
                              Download Full Audit PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Application link helper */}
      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-primary)", marginBottom: 8 }}>
          {lang === "zh" ? "申请入口链接" : "Application Link"}
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
