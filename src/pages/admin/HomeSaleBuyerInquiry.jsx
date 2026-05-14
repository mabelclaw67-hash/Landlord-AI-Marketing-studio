import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { getHomeSaleListing } from "../../utils/homeSaleSheet";

export default function HomeSaleBuyerInquiry() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHomeSaleListing(listingId)
      .then(setListing)
      .catch((err) => setError(err.message || "Failed to load listing."));
  }, [listingId]);

  const publicUrl = listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`;

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Buyer Inquiry / 买家咨询</h1>
          <p className="text-muted text-sm">{listingId}</p>
        </div>
        <div className="flex gap-8">
          <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost">Edit Listing</Link>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">Public Page</a>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {error && (
        <div className="notice notice--error">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      )}

      <div className="notice notice--sage" style={{ marginBottom: 24 }}>
        <h4>📬 Buyer Inquiry / 买家咨询入口 — Coming Soon</h4>
        <p>
          本步骤将整合买家咨询表格：姓名、电话、邮箱、希望看房时间与留言，
          提交后自动写入 Google Sheet 并发送通知邮件给屋主。
        </p>
        <p style={{ marginTop: 8, opacity: 0.86 }}>
          This step will wire up the buyer inquiry form — name, phone, email, preferred showing time,
          and message — with automatic Google Sheet logging and owner notification email.
        </p>
      </div>

      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
          🔗 公开买家咨询入口 / Public Buyer Inquiry
        </h3>
        <p style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", marginBottom: 12 }}>
          买家可在以下公开页面填写咨询表格。表格目前为本地测试模式，尚未提交到 Google Sheet。
          <br />
          Buyers can submit inquiries on the public listing page. Form is local-test only — not yet wired to the sheet.
        </p>
        <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
          🔗 Open Public Listing Page →
        </a>
      </div>

      {listing && (
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
            📞 联系信息 / Contact Info
          </h3>
          <div className="info-grid">
            {[
              ["Contact Name", listing.contactName],
              ["Contact Phone", listing.contactPhone],
              ["Contact Email", listing.contactEmail],
              ["Owner Name", listing.ownerName],
            ].map(([label, val]) => (
              <div key={label} className="info-item">
                <label>{label}</label>
                <p>{val || "—"}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            要更新联系信息，请点击 Edit Listing。
            To update contact info, click Edit Listing above.
          </p>
        </div>
      )}

      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 12 }}>
          📋 工作流导航 / Workflow Navigation
        </h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/admin/home-sale/share/${listingId}`} className="btn btn--ghost btn--sm">
            ← Share Kit / QR
          </Link>
          <Link to={`/admin/home-sale/review/${listingId}`} className="btn btn--ghost btn--sm">
            Review & Publish →
          </Link>
        </div>
      </div>
    </div>
  );
}
