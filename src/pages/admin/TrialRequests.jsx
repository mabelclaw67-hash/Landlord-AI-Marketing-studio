import { useEffect, useMemo, useState } from "react";
import {
  approveContactRequest,
  getContactRequests,
  updateContactRequestNotes,
} from "../../utils/storage";

const MODULE_ACTIONS = [
  { label: "Approve Rental Only", value: "Rental Only" },
  { label: "Approve Sale Only", value: "Sale Only" },
  { label: "Approve Both", value: "Both" },
];

const ACCESS_TYPE_OPTIONS = ["Trial", "Paid", "Manual"];
const PAYMENT_STATUS_OPTIONS = ["Unpaid", "Paid", "Not Required", "Manual"];
const DURATION_OPTIONS = [7, 10, 30, 90];

function fmt(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-CA"); } catch { return iso; }
}

function fmtDateOnly(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-CA"); } catch { return iso; }
}

function getRemainingDays(iso) {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  return Math.ceil((ts - Date.now()) / 86400000);
}

function getDefaultDuration(accessType) {
  if (accessType === "Paid") return 30;
  if (accessType === "Manual") return 30;
  return 10;
}

function getDefaultPaymentStatus(accessType) {
  if (accessType === "Paid") return "Paid";
  if (accessType === "Manual") return "Not Required";
  return "Unpaid";
}

export default function TrialRequests() {
  const [items, setItems] = useState([]);
  const [draftNotes, setDraftNotes] = useState({});
  const [draftAccess, setDraftAccess] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyRow, setBusyRow] = useState(0);
  const [error, setError] = useState("");

  const pendingCount = useMemo(
    () => items.filter((item) => (item.approvalStatus || "Pending") === "Pending").length,
    [items]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getContactRequests();
      setItems(rows);
      setDraftNotes(Object.fromEntries(rows.map((row) => [row.rowNumber, row.adminNotes || ""])));
      setDraftAccess(Object.fromEntries(rows.map((row) => {
        const accessType = row.accessType || "Trial";
        return [row.rowNumber, {
          accessType,
          paymentStatus: row.paymentStatus || getDefaultPaymentStatus(accessType),
          durationDays: String(getDefaultDuration(accessType)),
        }];
      })));
    } catch (err) {
      setError(err.message || "Failed to load trial requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runAction = async (rowNumber, runner) => {
    setBusyRow(rowNumber);
    setError("");
    try {
      await runner();
      await load();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyRow(0);
    }
  };

  const copyAccess = async (item) => {
    try {
      const expiryText = fmtDateOnly(item.accessExpiresAt);
      const text = [
        `Website: ${window.location.origin}/trial-access`,
        `Name: ${item.name || ""}`,
        `Login Email: ${item.email || ""}`,
        `Access Code: ${item.accessCode || ""}`,
        `Approved Module: ${item.approvedModule || ""}`,
        `Access Type: ${item.accessType || ""}`,
        `Payment Status: ${item.paymentStatus || ""}`,
        `Expiry Date: ${expiryText}`,
        `Note: this access code will expire automatically.`,
      ].join("\n");
      await navigator.clipboard.writeText(text);
    } catch (err) {
      setError(err.message || "Failed to copy access info.");
    }
  };

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>
            Trial Requests / 试用申请
          </h1>
          <p className="text-muted text-sm">
            数据来源：<code>Contacts</code> · Pending {pendingCount} · Total {items.length}
          </p>
        </div>
      </div>

      {error ? (
        <div className="notice notice--error mb-24">
          <p>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
          Loading trial requests...
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "28px 12px" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>📨</div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 6 }}>No trial requests yet</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
              Contact / Beta form submissions will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((item) => {
            const isBusy = busyRow === item.rowNumber;
            const status = item.approvalStatus || "Pending";
            return (
              <section key={item.rowNumber} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 6 }}>
                      {item.name || "—"} <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>· {item.email || "—"}</span>
                    </h2>
                    <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                      Submitted: {fmt(item.submittedAt)} · Status: <strong>{status}</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                    <div>Approved Module: {item.approvedModule || "—"}</div>
                    <div>Access Type: {item.accessType || "—"}</div>
                    <div>Payment Status: {item.paymentStatus || "—"}</div>
                    <div>Access Code: {item.accessCode || "—"}</div>
                    <div>Expires: {fmt(item.accessExpiresAt)}</div>
                    <div>Remaining Days: {item.accessExpiresAt ? getRemainingDays(item.accessExpiresAt) : "—"}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 }}>
                  <Info label="Phone" value={item.phone} />
                  <Info label="WeChat ID" value={item.wechat} />
                  <Info label="City" value={item.city} />
                  <Info label="Service Interest" value={item.serviceInterest} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 }}>
                    Message
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {item.message || "—"}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Admin Notes / 管理备注</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={draftNotes[item.rowNumber] || ""}
                    onChange={(e) => setDraftNotes((prev) => ({ ...prev, [item.rowNumber]: e.target.value }))}
                    placeholder="Optional notes / 选填备注"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Access Type / 访问类型</label>
                    <select
                      className="form-control"
                      value={draftAccess[item.rowNumber]?.accessType || "Trial"}
                      onChange={(e) => {
                        const accessType = e.target.value;
                        setDraftAccess((prev) => ({
                          ...prev,
                          [item.rowNumber]: {
                            accessType,
                            paymentStatus: getDefaultPaymentStatus(accessType),
                            durationDays: String(getDefaultDuration(accessType)),
                          },
                        }));
                      }}
                    >
                      {ACCESS_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Payment Status / 付款状态</label>
                    <select
                      className="form-control"
                      value={draftAccess[item.rowNumber]?.paymentStatus || "Unpaid"}
                      onChange={(e) => setDraftAccess((prev) => ({
                        ...prev,
                        [item.rowNumber]: {
                          ...(prev[item.rowNumber] || {}),
                          accessType: prev[item.rowNumber]?.accessType || "Trial",
                          durationDays: prev[item.rowNumber]?.durationDays || "10",
                          paymentStatus: e.target.value,
                        },
                      }))}
                    >
                      {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Duration / 天数</label>
                    <select
                      className="form-control"
                      value={draftAccess[item.rowNumber]?.durationDays || "10"}
                      onChange={(e) => setDraftAccess((prev) => ({
                        ...prev,
                        [item.rowNumber]: {
                          ...(prev[item.rowNumber] || {}),
                          accessType: prev[item.rowNumber]?.accessType || "Trial",
                          paymentStatus: prev[item.rowNumber]?.paymentStatus || "Unpaid",
                          durationDays: e.target.value,
                        },
                      }))}
                    >
                      {DURATION_OPTIONS.map((option) => <option key={option} value={String(option)}>{option} days</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {MODULE_ACTIONS.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      className="btn btn--sage btn--sm"
                      disabled={isBusy}
                      onClick={() => runAction(item.rowNumber, () => approveContactRequest(
                        item.rowNumber,
                        action.value,
                        draftNotes[item.rowNumber] || "",
                        "Approved",
                        draftAccess[item.rowNumber]?.accessType || "Trial",
                        Number(draftAccess[item.rowNumber]?.durationDays || 10),
                        draftAccess[item.rowNumber]?.paymentStatus || "Unpaid"
                      ))}
                    >
                      {action.label} {draftAccess[item.rowNumber]?.durationDays || "10"} days
                    </button>
                  ))}

                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={isBusy}
                    onClick={() => runAction(item.rowNumber, () => approveContactRequest(
                      item.rowNumber,
                      "",
                      draftNotes[item.rowNumber] || "",
                      "Rejected / Not Now"
                    ))}
                  >
                    Reject / Not Now
                  </button>

                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={isBusy}
                    onClick={() => runAction(item.rowNumber, () => updateContactRequestNotes(
                      item.rowNumber,
                      draftNotes[item.rowNumber] || ""
                    ))}
                  >
                    Save Admin Notes
                  </button>

                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={!item.accessCode}
                    onClick={() => copyAccess(item)}
                  >
                    Copy Access Info
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ background: "#f7faf8", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ lineHeight: 1.6 }}>{value || "—"}</div>
    </div>
  );
}
