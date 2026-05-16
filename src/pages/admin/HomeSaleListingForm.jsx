import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { readTrialAccess } from "../../utils/trialAccess";
import {
  HOME_SALE_PROPERTY_TYPES,
  HOME_SALE_STATUS_OPTIONS,
  createEmptySaleListingForm,
  createSaleListing,
  getHomeSaleFieldConnectionWarnings,
  getHomeSaleListing,
  getHomeSaleListings,
  getSuggestedSaleListingId,
  updateSaleListing,
} from "../../utils/homeSaleSheet";

export default function HomeSaleListingForm({ mode }) {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";
  const isTrial = !!readTrialAccess();
  const [form, setForm] = useState(() =>
    createEmptySaleListingForm(
      isTrial ? {} : { contactName: "Mabel Chen", contactPhone: "672-514-8866", contactEmail: "mabelclaw67@gmail.com" }
    )
  );
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showOnboardingDetails, setShowOnboardingDetails] = useState(false);
  const [suggestedId, setSuggestedId] = useState("SALE-2026-001");
  const unsupportedFields = useMemo(() => getHomeSaleFieldConnectionWarnings(), []);

  useEffect(() => {
    getHomeSaleListings()
      .then((rows) => {
        setSuggestedId(getSuggestedSaleListingId(rows));
        if (!isEdit) {
          setForm((current) => ({
            ...current,
            listingId: current.listingId || getSuggestedSaleListingId(rows),
          }));
        }
      })
      .catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !listingId) return;
    setLoading(true);
    getHomeSaleListing(listingId)
      .then((row) => setForm(createEmptySaleListingForm(row)))
      .catch((err) => setError(err.message || "Failed to load listing."))
      .finally(() => setLoading(false));
  }, [isEdit, listingId]);

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError("");
    setSaveMessage("");
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSaveMessage("");
    try {
      const payload = { ...form };
      if (!payload.listingId) {
        payload.listingId = suggestedId;
      }
      if (isEdit) {
        await updateSaleListing(payload);
        setSaveMessage(`Updated ${payload.listingId}`);
      } else {
        const result = await createSaleListing(payload);
        setSaveMessage(`Created ${result?.listingId || payload.listingId}`);
      }
      navigate("/admin/home-sale/listings");
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>
            {isEdit ? "Edit Sale Listing / 编辑出售房源" : "New Sale Listing / 新增出售房源"}
          </h1>
          <p className="text-muted text-sm">Mirror the Rental Studio listing workflow, but save to the Home Sale sheet.</p>
        </div>
        <div className="flex gap-8">
          <Link to="/admin/home-sale/listings" className="btn btn--ghost">Back to Listings</Link>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={isEdit ? listingId : ""} />

      {!isTrial && unsupportedFields.length > 0 && (
        <div className="notice notice--warning">
          <h4>Sheet Header Reminder / 表头提醒</h4>
          <p>Current `01 Sale Listings` headers do not include: {unsupportedFields.join(", ")}.</p>
          <p>这些字段可先在前端填写，但在你给 Google Sheet 增加对应列之前不会真正保存。</p>
        </div>
      )}

      {error && (
        <div className="notice notice--error">
          <h4>Save failed</h4>
          <p>{error}</p>
        </div>
      )}

      {saveMessage && (
        <div className="notice notice--success">
          <h4>Saved</h4>
          <p>{saveMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Loading listing…</div>
      ) : (
        <form className="card" onSubmit={handleSubmit}>
          {!isEdit && isTrial && (
            <div style={{
              background: "#f0f7f2",
              border: "1px solid #b6d8c3",
              borderLeft: "4px solid #3e5b4b",
              borderRadius: "0 10px 10px 0",
              padding: "14px 16px",
              marginBottom: 24,
              fontSize: "0.875rem",
              lineHeight: 1.65,
              color: "#213128",
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>ℹ️ Step 1 — Fill in basic property information first.</div>
              <div style={{ fontSize: "0.82rem", color: "#4a6b57", marginBottom: 8 }}>
                保存后将自动开启照片上传和营销功能。
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardingDetails((v) => !v)}
                style={{ fontSize: "0.78rem", color: "#3e5b4b", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600 }}
              >
                {showOnboardingDetails ? "Hide Details ▲" : "Show Details ▼"}
              </button>
              {showOnboardingDetails && (
                <div style={{ marginTop: 10, borderTop: "1px solid #b6d8c3", paddingTop: 10 }}>
                  <div style={{ marginBottom: 4 }}>The system will automatically create:</div>
                  <div style={{ paddingLeft: 4, marginBottom: 8 }}>
                    {"• Property folder\n• Listing workspace\n• Photo/video storage\n• Public listing page".split("\n").map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 10 }}>After saving, additional upload and marketing tools will become available.</div>
                  <div style={{ borderTop: "1px solid #b6d8c3", paddingTop: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>第一步：请先填写房源基本信息。</div>
                    <div style={{ marginBottom: 4 }}>系统会自动创建：</div>
                    <div style={{ paddingLeft: 4, marginBottom: 8 }}>
                      {"• 房源文件夹\n• 房源工作区\n• 图片/视频存储空间\n• 公开房源页面".split("\n").map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                    <div>保存房源后，系统才会开放照片上传、视频生成、广告发布等功能。</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Listing ID <span className="ch-hint">房源编号</span></label>
              <input className="form-control" value={form.listingId} onChange={updateField("listingId")} placeholder={suggestedId} />
            </div>
            <div className="form-group">
              <label>Status <span className="ch-hint">状态</span></label>
              <select className="form-control" value={form.status} onChange={updateField("status")}>
                {HOME_SALE_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Owner / Realtor Name <span className="ch-hint">屋主/经纪姓名</span></label>
              <input className="form-control" value={form.ownerName} onChange={updateField("ownerName")} />
            </div>
            <div className="form-group">
              <label>Property Address <span className="ch-hint">房产地址</span></label>
              <input className="form-control" value={form.address} onChange={updateField("address")} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City <span className="ch-hint">城市</span></label>
              <input className="form-control" value={form.city} onChange={updateField("city")} />
            </div>
            <div className="form-group">
              <label>Province <span className="ch-hint">省份</span></label>
              <input className="form-control" value={form.province} onChange={updateField("province")} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Asking Price <span className="ch-hint">售价</span></label>
              <input className="form-control" value={form.askingPrice} onChange={updateField("askingPrice")} />
            </div>
            <div className="form-group">
              <label>Property Type <span className="ch-hint">房产类型</span></label>
              <select className="form-control" value={form.propertyType} onChange={updateField("propertyType")}>
                <option value="">— Select / 请选择 —</option>
                {HOME_SALE_PROPERTY_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Bedrooms <span className="ch-hint">卧室</span></label>
              <input className="form-control" value={form.bedrooms} onChange={updateField("bedrooms")} />
            </div>
            <div className="form-group">
              <label>Bathrooms <span className="ch-hint">卫生间</span></label>
              <input className="form-control" value={form.bathrooms} onChange={updateField("bathrooms")} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Interior SqFt <span className="ch-hint">室内面积</span></label>
              <input className="form-control" value={form.interiorSqft} onChange={updateField("interiorSqft")} />
            </div>
            <div className="form-group">
              <label>Lot Size <span className="ch-hint">土地面积</span></label>
              <input className="form-control" value={form.lotSize} onChange={updateField("lotSize")} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Year Built <span className="ch-hint">建造年份</span></label>
              <input className="form-control" value={form.yearBuilt} onChange={updateField("yearBuilt")} />
            </div>
            <div className="form-group">
              <label>MLS Number <span className="ch-hint">MLS 编号</span></label>
              <input className="form-control" value={form.mlsNumber} onChange={updateField("mlsNumber")} />
            </div>
          </div>

          <div className="form-group">
            <label>Key Features <span className="ch-hint">主要卖点</span></label>
            <textarea className="form-control" value={form.keyFeatures} onChange={updateField("keyFeatures")} rows={4} />
          </div>

          <div className="form-group">
            <label>Description CN <span className="ch-hint">中文简介</span></label>
            <textarea className="form-control" value={form.descriptionCn} onChange={updateField("descriptionCn")} rows={5} />
          </div>

          <div className="form-group">
            <label>Description EN <span className="ch-hint">英文简介</span></label>
            <textarea className="form-control" value={form.descriptionEn} onChange={updateField("descriptionEn")} rows={5} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact Name <span className="ch-hint">联系人</span></label>
              <input className="form-control" value={form.contactName} onChange={updateField("contactName")} />
            </div>
            <div className="form-group">
              <label>Contact Phone <span className="ch-hint">联系电话</span></label>
              <input className="form-control" value={form.contactPhone} onChange={updateField("contactPhone")} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact Email <span className="ch-hint">联系邮箱</span></label>
              <input className="form-control" value={form.contactEmail} onChange={updateField("contactEmail")} />
            </div>
            <div className="form-group">
              <label>Listing Source <span className="ch-hint">来源</span></label>
              <input className="form-control" value={form.listingSource} onChange={updateField("listingSource")} />
            </div>
          </div>

          {!isTrial && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Public Listing URL <span className="ch-hint">公开页面链接</span></label>
                  <input className="form-control" value={form.publicListingUrl} onChange={updateField("publicListingUrl")} />
                </div>
                <div className="form-group">
                  <label>QR Code URL <span className="ch-hint">二维码链接</span></label>
                  <input className="form-control" value={form.qrCodeUrl} onChange={updateField("qrCodeUrl")} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Google Drive Folder URL <span className="ch-hint">Drive 文件夹</span></label>
                  <input className="form-control" value={form.googleDriveFolderUrl} onChange={updateField("googleDriveFolderUrl")} />
                </div>
                <div className="form-group">
                  <label>Primary Photo URL <span className="ch-hint">主图链接</span></label>
                  <input className="form-control" value={form.primaryPhotoUrl} onChange={updateField("primaryPhotoUrl")} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Video URL <span className="ch-hint">视频链接</span></label>
                  <input className="form-control" value={form.videoUrl} onChange={updateField("videoUrl")} />
                </div>
                <div className="form-group">
                  <label>Internal Status <span className="ch-hint">内部状态</span></label>
                  <input className="form-control" value={form.internalStatus} onChange={updateField("internalStatus")} />
                </div>
              </div>

              <div className="form-group">
                <label>Notes <span className="ch-hint">备注</span></label>
                <textarea className="form-control" value={form.notes} onChange={updateField("notes")} rows={3} />
              </div>
            </>
          )}

          {!isEdit && isTrial && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
              Save basic information first to activate media upload features.<br />
              请先保存基础资料，再开启图片/视频上传功能。
            </p>
          )}
          <div className="flex gap-8">
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Listing / 保存房源" : "Create Listing / 创建房源"}
            </button>
            <Link to="/admin/home-sale/listings" className="btn btn--ghost">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}
