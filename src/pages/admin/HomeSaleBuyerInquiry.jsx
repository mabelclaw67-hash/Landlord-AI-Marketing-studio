import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import {
  getHomeSaleListing,
  getHomeSaleBuyerInquiries,
  updateHomeSaleBuyerInquiry,
  saveHomeSaleShowingAvailability,
} from "../../utils/homeSaleSheet";

const APPROVAL_COLORS = {
  Pending:    { background: "#fdf3e7", color: "#8a5a22", border: "1px solid #e7cda7" },
  Approved:   { background: "#edf7f0", color: "#276745", border: "1px solid #b6dfc7" },
  Reschedule: { background: "#eff3ff", color: "#3550b4", border: "1px solid #c0cdf7" },
  Declined:   { background: "#fdf0f0", color: "#b42b2b", border: "1px solid #f0c0c0" },
};

function ApprovalBadge({ value }) {
  const style = APPROVAL_COLORS[value] || APPROVAL_COLORS.Pending;
  return (
    <span style={{ ...style, borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700, display: "inline-block" }}>
      {value || "Pending"}
    </span>
  );
}

function InquiryCard({ inquiry, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [sellerNotes, setSellerNotes] = useState(inquiry.sellerNotes || "");
  const [confirmedTime, setConfirmedTime] = useState(inquiry.confirmedShowingTime || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const buyerName = [inquiry.buyerFirstName, inquiry.buyerLastName].filter(Boolean).join(" ") || "—";

  async function applyAction(status, sellerApproval) {
    setSaving(true); setMsg("");
    try {
      const result = await updateHomeSaleBuyerInquiry(inquiry.inquiryId, {
        status, sellerApproval, sellerNotes, confirmedShowingTime: confirmedTime, sendNotification: true,
      });
      setMsg(result.emailSent ? "Saved — buyer notified" : "Saved (no buyer email on record)");
      onUpdated(inquiry.inquiryId, { status, sellerApproval, sellerNotes, confirmedShowingTime: confirmedTime });
    } catch (err) { setMsg("Error: " + (err.message || "Save failed")); }
    finally { setSaving(false); }
  }

  async function saveNotes() {
    setSaving(true); setMsg("");
    try {
      await updateHomeSaleBuyerInquiry(inquiry.inquiryId, {
        status: inquiry.status, sellerApproval: inquiry.sellerApproval, sellerNotes, confirmedShowingTime: confirmedTime,
      });
      setMsg("Saved");
      onUpdated(inquiry.inquiryId, { sellerNotes, confirmedShowingTime: confirmedTime });
    } catch (err) { setMsg("Error: " + (err.message || "Save failed")); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ border: "1px solid #e2eae5", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", background: expanded ? "#f7fbf8" : "#fff" }}
        onClick={() => setExpanded(p => !p)}
      >
        <code style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", minWidth: 90 }}>{inquiry.inquiryId}</code>
        <span style={{ fontWeight: 600, flex: 1 }}>{buyerName}</span>
        <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>📅 {inquiry.preferredShowingDate || "—"}</span>
        <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>🕐 {inquiry.preferredTimeWindow || "—"}</span>
        <ApprovalBadge value={inquiry.sellerApproval} />
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "14px 16px", borderTop: "1px solid #e2eae5", background: "#f7fbf8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 3 }}>Buyer</div>
              <div style={{ fontWeight: 600 }}>{buyerName}</div>
              <div style={{ fontSize: "0.84rem" }}>{inquiry.email || "—"}</div>
              <div style={{ fontSize: "0.84rem" }}>{inquiry.phone || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 3 }}>Showing Request</div>
              <div style={{ fontSize: "0.84rem" }}>📅 {inquiry.preferredShowingDate || "Not specified"}</div>
              <div style={{ fontSize: "0.84rem" }}>🕐 {inquiry.preferredTimeWindow || "Not specified"}</div>
            </div>
            {inquiry.message && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 3 }}>Message</div>
                <div style={{ fontSize: "0.84rem", background: "#fff", border: "1px solid #e2eae5", borderRadius: 6, padding: "6px 10px" }}>{inquiry.message}</div>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Seller Notes</label>
              <textarea className="form-control" rows={2} value={sellerNotes} onChange={e => setSellerNotes(e.target.value)} disabled={saving} placeholder="Internal notes…" />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Confirmed Showing Time</label>
              <input className="form-control" value={confirmedTime} onChange={e => setConfirmedTime(e.target.value)} disabled={saving} placeholder="e.g. 2026-05-22 10:00 AM" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn--primary btn--sm" disabled={saving} onClick={e => { e.stopPropagation(); applyAction("Approved", "Approved"); }}>✓ Approve</button>
            <button className="btn btn--ghost btn--sm" style={{ borderColor: "#3550b4", color: "#3550b4" }} disabled={saving} onClick={e => { e.stopPropagation(); applyAction("Reschedule Requested", "Reschedule"); }}>↺ Reschedule</button>
            <button className="btn btn--ghost btn--sm" style={{ borderColor: "#b42b2b", color: "#b42b2b" }} disabled={saving} onClick={e => { e.stopPropagation(); applyAction("Declined", "Declined"); }}>✕ Decline</button>
            <button className="btn btn--ghost btn--sm" disabled={saving} onClick={e => { e.stopPropagation(); saveNotes(); }}>Save Notes</button>
            {saving && <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Saving…</span>}
            {msg && !saving && <span style={{ fontSize: "0.8rem", color: msg.startsWith("Error") ? "#b42b2b" : "#276745" }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeSaleBuyerInquiry() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [listingError, setListingError] = useState("");

  const [availability, setAvailability] = useState("");
  const [availSaving, setAvailSaving] = useState(false);
  const [availMsg, setAvailMsg] = useState("");
  const availDirty = useRef(false);

  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [inquiriesError, setInquiriesError] = useState("");

  useEffect(() => {
    getHomeSaleListing(listingId)
      .then(l => { setListing(l); setAvailability(l.showingAvailability || ""); })
      .catch(err => setListingError(err.message || "Failed to load listing."));

    getHomeSaleBuyerInquiries()
      .then(rows => setInquiries((rows || []).filter(r => r.listingId === listingId).reverse()))
      .catch(err => setInquiriesError(err.message || "Failed to load inquiries."))
      .finally(() => setInquiriesLoading(false));
  }, [listingId]);

  async function handleSaveAvailability() {
    setAvailSaving(true); setAvailMsg("");
    try {
      await saveHomeSaleShowingAvailability(listingId, availability);
      setAvailMsg("Saved — availability updated on public page");
      availDirty.current = false;
    } catch (err) { setAvailMsg("Error: " + (err.message || "Save failed")); }
    finally { setAvailSaving(false); }
  }

  function handleInquiryUpdated(inquiryId, updates) {
    setInquiries(prev => prev.map(i => i.inquiryId === inquiryId ? { ...i, ...updates } : i));
  }

  const publicUrl = listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`;
  const pending = inquiries.filter(i => i.sellerApproval === "Pending").length;

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Buyer Inquiry & Showing / 买家咨询与看房管理</h1>
          <p className="text-muted text-sm">{listingId}{listing?.address ? ` — ${listing.address}` : ""}</p>
        </div>
        <div className="flex gap-8">
          <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost">Edit Listing</Link>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">Public Page</a>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {listingError && (
        <div className="notice notice--error" style={{ marginBottom: 16 }}>
          <p>{listingError}</p>
        </div>
      )}

      {/* ── Showing Availability ─────────────────────────────────────── */}
      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
              🗓 Showing Availability / 可看房时间设置
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
              此内容将显示在公开房源页面供买家参考。/ This text appears on the public listing page for buyers.
            </p>
          </div>
          <a href={publicUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "var(--color-primary)" }}>
            Preview public page →
          </a>
        </div>

        <textarea
          className="form-control"
          rows={3}
          value={availability}
          onChange={e => { setAvailability(e.target.value); availDirty.current = true; setAvailMsg(""); }}
          disabled={availSaving}
          placeholder={"e.g.\nMon–Fri: 10:00 AM – 4:00 PM\nWeekends: By appointment\nNext open house: May 25, 2:00 – 4:00 PM"}
          style={{ fontFamily: "inherit", fontSize: "0.88rem" }}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
          <button className="btn btn--primary btn--sm" onClick={handleSaveAvailability} disabled={availSaving}>
            {availSaving ? "Saving…" : "Save Availability / 保存时间设置"}
          </button>
          {availMsg && <span style={{ fontSize: "0.82rem", color: availMsg.startsWith("Error") ? "#b42b2b" : "#276745" }}>{availMsg}</span>}
        </div>
      </div>

      {/* ── This listing's inquiries ──────────────────────────────────── */}
      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 2 }}>
              📋 Showing Requests / 看房申请
              {pending > 0 && (
                <span style={{ marginLeft: 8, background: "#fdf3e7", color: "#8a5a22", border: "1px solid #e7cda7", borderRadius: 20, padding: "2px 8px", fontSize: "0.75rem" }}>
                  {pending} pending
                </span>
              )}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
              仅显示本房源的申请 / Showing requests for this listing only
            </p>
          </div>
          <Link to="/admin/home-sale/buyer-inquiries" style={{ fontSize: "0.82rem", color: "var(--color-primary)" }}>
            All listings view →
          </Link>
        </div>

        {inquiriesLoading ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>Loading…</p>
        ) : inquiriesError ? (
          <div className="notice notice--error"><p>{inquiriesError}</p></div>
        ) : inquiries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: "0.88rem" }}>No showing requests for this listing yet.</p>
          </div>
        ) : (
          inquiries.map(item => (
            <InquiryCard key={item.inquiryId} inquiry={item} onUpdated={handleInquiryUpdated} />
          ))
        )}
      </div>

      {/* ── Workflow nav ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to={`/admin/home-sale/share/${listingId}`} className="btn btn--ghost btn--sm">← Share Kit / QR</Link>
        <Link to={`/admin/home-sale/review/${listingId}`} className="btn btn--ghost btn--sm">Review & Publish →</Link>
      </div>
    </div>
  );
}
