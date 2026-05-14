const RENTAL_FORM_URL = import.meta.env.VITE_RENTAL_FORM_URL || "";
const FORM_READY = RENTAL_FORM_URL && !RENTAL_FORM_URL.startsWith("PASTE");

export default function Leads() {
  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Rental Leads / 租客申请</h1>
          <p className="text-muted text-sm">Rental application leads / 出租房源申请线索</p>
        </div>
      </div>

      <div className="card">
        <div style={{ textAlign: "center", padding: "28px 12px" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>🗂️</div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 8 }}>
            No application leads connected yet / 暂无已连接申请记录
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: 620, margin: "0 auto" }}>
            Online applications are ready. Lead storage/export can be connected next.
          </p>
          {FORM_READY && (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.84rem", lineHeight: 1.7, maxWidth: 620, margin: "14px auto 0" }}>
              Current tenant applications submit to the external Google Form configured in <code>VITE_RENTAL_FORM_URL</code>.
              Responses are not yet connected to this Admin Leads view.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
