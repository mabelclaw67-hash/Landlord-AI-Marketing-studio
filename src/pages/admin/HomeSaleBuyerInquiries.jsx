import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeSaleBuyerInquiries, updateHomeSaleBuyerInquiry } from "../../utils/homeSaleSheet";

const APPROVAL_COLORS = {
  Pending:   { background: "#fdf3e7", color: "#8a5a22", border: "1px solid #e7cda7" },
  Approved:  { background: "#edf7f0", color: "#276745", border: "1px solid #b6dfc7" },
  Reschedule:{ background: "#eff3ff", color: "#3550b4", border: "1px solid #c0cdf7" },
  Declined:  { background: "#fdf0f0", color: "#b42b2b", border: "1px solid #f0c0c0" },
};

function ApprovalBadge({ value }) {
  const style = APPROVAL_COLORS[value] || APPROVAL_COLORS.Pending;
  return (
    <span style={{ ...style, borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700, display: "inline-block" }}>
      {value || "Pending"}
    </span>
  );
}

function InquiryRow({ inquiry, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [sellerNotes, setSellerNotes] = useState(inquiry.sellerNotes || "");
  const [confirmedTime, setConfirmedTime] = useState(inquiry.confirmedShowingTime || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function applyAction(status, sellerApproval) {
    setSaving(true);
    setSaveMsg("");
    try {
      const result = await updateHomeSaleBuyerInquiry(inquiry.inquiryId, {
        status,
        sellerApproval,
        sellerNotes,
        confirmedShowingTime: confirmedTime,
        sendNotification: true,
      });
      setSaveMsg(result.emailSent ? "Saved — buyer notified by email" : "Saved (no email — buyer address missing)");
      onUpdated(inquiry.inquiryId, { status, sellerApproval, sellerNotes, confirmedShowingTime: confirmedTime });
    } catch (err) {
      setSaveMsg("Error: " + (err.message || "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    setSaveMsg("");
    try {
      await updateHomeSaleBuyerInquiry(inquiry.inquiryId, {
        status: inquiry.status,
        sellerApproval: inquiry.sellerApproval,
        sellerNotes,
        confirmedShowingTime: confirmedTime,
      });
      setSaveMsg("Saved");
      onUpdated(inquiry.inquiryId, { sellerNotes, confirmedShowingTime: confirmedTime });
    } catch (err) {
      setSaveMsg("Error: " + (err.message || "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  const buyerName = [inquiry.buyerFirstName, inquiry.buyerLastName].filter(Boolean).join(" ") || "—";

  return (
    <>
      <tr
        style={{ cursor: "pointer", background: expanded ? "#f7fbf8" : undefined }}
        onClick={() => setExpanded((p) => !p)}
      >
        <td><code style={{ fontSize: "0.78rem" }}>{inquiry.inquiryId}</code></td>
        <td style={{ fontSize: "0.85rem" }}>{inquiry.listingId}</td>
        <td style={{ fontSize: "0.85rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {inquiry.listingTitle || "—"}
        </td>
        <td style={{ fontSize: "0.85rem" }}>{buyerName}</td>
        <td style={{ fontSize: "0.85rem" }}>{inquiry.preferredShowingDate || "—"}</td>
        <td style={{ fontSize: "0.85rem" }}>{inquiry.preferredTimeWindow || "—"}</td>
        <td><ApprovalBadge value={inquiry.sellerApproval} /></td>
        <td style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
          {expanded ? "▲ Close" : "▼ Manage"}
        </td>
      </tr>

      {expanded && (
        <tr style={{ background: "#f7fbf8" }}>
          <td colSpan={8} style={{ padding: "16px 20px", borderTop: "1px solid #e2eae5" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>Buyer</div>
                <div style={{ fontWeight: 600 }}>{buyerName}</div>
                <div style={{ fontSize: "0.85rem" }}>{inquiry.email || "—"}</div>
                <div style={{ fontSize: "0.85rem" }}>{inquiry.phone || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>Showing Request</div>
                <div style={{ fontSize: "0.85rem" }}>📅 {inquiry.preferredShowingDate || "Not specified"}</div>
                <div style={{ fontSize: "0.85rem" }}>🕐 {inquiry.preferredTimeWindow || "Not specified"}</div>
              </div>
              {inquiry.message && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: 4 }}>Message</div>
                  <div style={{ fontSize: "0.85rem", background: "#fff", border: "1px solid #e2eae5", borderRadius: 8, padding: "8px 12px" }}>
                    {inquiry.message}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
                  Seller Notes / 卖家备注
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={sellerNotes}
                  onChange={(e) => setSellerNotes(e.target.value)}
                  disabled={saving}
                  placeholder="Internal notes for this inquiry…"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
                  Confirmed Showing Time / 确认看房时间
                </label>
                <input
                  className="form-control"
                  value={confirmedTime}
                  onChange={(e) => setConfirmedTime(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. 2026-05-22 10:00 AM"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                className="btn btn--primary btn--sm"
                disabled={saving}
                onClick={(e) => { e.stopPropagation(); applyAction("Approved", "Approved"); }}
              >
                ✓ Approve
              </button>
              <button
                className="btn btn--ghost btn--sm"
                style={{ borderColor: "#3550b4", color: "#3550b4" }}
                disabled={saving}
                onClick={(e) => { e.stopPropagation(); applyAction("Reschedule Requested", "Reschedule"); }}
              >
                ↺ Reschedule
              </button>
              <button
                className="btn btn--ghost btn--sm"
                style={{ borderColor: "#b42b2b", color: "#b42b2b" }}
                disabled={saving}
                onClick={(e) => { e.stopPropagation(); applyAction("Declined", "Declined"); }}
              >
                ✕ Decline
              </button>
              <button
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={(e) => { e.stopPropagation(); saveNotes(); }}
              >
                Save Notes
              </button>
              {saving && <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>Saving…</span>}
              {saveMsg && !saving && (
                <span style={{ fontSize: "0.82rem", color: saveMsg.startsWith("Error") ? "#b42b2b" : "#276745" }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function HomeSaleBuyerInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    getHomeSaleBuyerInquiries()
      .then((rows) => setInquiries(Array.isArray(rows) ? rows.reverse() : []))
      .catch((e) => setError(e.message || "Failed to load buyer inquiries."))
      .finally(() => setLoading(false));
  }, []);

  function handleUpdated(inquiryId, updates) {
    setInquiries((prev) =>
      prev.map((item) => item.inquiryId === inquiryId ? { ...item, ...updates } : item)
    );
  }

  const filters = ["All", "Pending", "Approved", "Reschedule", "Declined"];
  const filtered = filter === "All" ? inquiries : inquiries.filter((i) => i.sellerApproval === filter);

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Buyer Showing Requests / 买家看房预约管理</h1>
          <p className="text-muted text-sm">
            来自公开售房页面的看房预约申请 / Showing requests submitted from public sale listing pages
          </p>
        </div>
        <Link to="/admin/home-sale" className="btn btn--ghost">Home Sale Dashboard</Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {filters.map((f) => {
          const count = f === "All" ? inquiries.length : inquiries.filter((i) => i.sellerApproval === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                borderColor: filter === f ? "var(--color-primary)" : "#d1d5db",
                background: filter === f ? "var(--color-primary)" : "#fff",
                color: filter === f ? "#fff" : "var(--color-text-muted)",
              }}
            >
              {f} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading buyer inquiries…
          </div>
        ) : error ? (
          <div className="notice notice--error" style={{ margin: 16 }}>
            <h4>Failed to load buyer inquiries</h4>
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
            <p className="text-muted">
              {filter === "All" ? "No buyer inquiries yet." : `No ${filter} inquiries.`}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Inquiry ID</th>
                  <th>Listing ID</th>
                  <th>Listing Title</th>
                  <th>Buyer Name</th>
                  <th>Showing Date</th>
                  <th>Time Window</th>
                  <th>Seller Approval</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <InquiryRow key={item.inquiryId} inquiry={item} onUpdated={handleUpdated} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
