import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { getHomeSaleListing } from "../../utils/homeSaleSheet";

export default function HomeSaleOpenHouse() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHomeSaleListing(listingId)
      .then(setListing)
      .catch((err) => setError(err.message || "Failed to load listing."));
  }, [listingId]);

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Open House / 开放日</h1>
          <p className="text-muted text-sm">{listingId}</p>
        </div>
        <div className="flex gap-8">
          <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost">Edit Listing</Link>
          <a href={listing?.publicListingUrl || `/home-sale-studio/listings/${listingId}`} target="_blank" rel="noreferrer" className="btn btn--ghost">Public Page</a>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      {error && (
        <div className="notice notice--error">
          <h4>Open House workflow error</h4>
          <p>{error}</p>
        </div>
      )}

      <div className="notice notice--warning">
        <h4>Coming next / 下一步</h4>
        <p>当前先保留 Open House 流程位置，不新增 Google Sheet tab，也不擅自改现有表结构。</p>
        <p>Recommended future columns: Open House Date, Open House Time, Showing Notes, Appointment Required, Contact Person.</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 16 }}>Suggested Open House Workflow / 建议流程</h2>
        <div style={{ display: "grid", gap: 12, lineHeight: 1.75 }}>
          <p>1. 在 listing status 中切换为 `Open House`。</p>
          <p>2. 准备 showing notes、contact person、appointment rule。</p>
          <p>3. 更新公开页二维码与现场看房卡。</p>
          <p>4. 如需正式接表，再为 Home Sale sheet 增加对应列。</p>
        </div>
      </div>
    </div>
  );
}
