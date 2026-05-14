import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import {
  HOME_SALE_LANGUAGES,
  HOME_SALE_MARKETING_CHANNELS,
  HOME_SALE_MARKETING_STATUS_OPTIONS,
  createOrUpdateMarketingCopy,
  getHomeSaleListing,
  getMarketingCopyByListingId,
} from "../../utils/homeSaleSheet";

function emptyMarketingForm(listingId) {
  return {
    copyId: "",
    listingId,
    channel: "Website",
    language: "Chinese",
    headline: "",
    bodyCopy: "",
    callToAction: "",
    hashtags: "",
    publicUrl: "",
    version: "v1",
    status: "Draft",
  };
}

export default function HomeSaleMarketing() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyMarketingForm(listingId));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const [listingRow, marketingRows] = await Promise.all([
      getHomeSaleListing(listingId),
      getMarketingCopyByListingId(listingId),
    ]);
    setListing(listingRow);
    setRows(marketingRows);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message || "Failed to load marketing copy workflow."))
      .finally(() => setLoading(false));
  }, [listingId]);

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError("");
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createOrUpdateMarketingCopy({
        ...form,
        publicUrl: form.publicUrl || listing?.publicListingUrl || "",
      });
      setForm(emptyMarketingForm(listingId));
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to save marketing copy.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Marketing Copy / 营销文案</h1>
          <p className="text-muted text-sm">{listingId}</p>
        </div>
        <div className="flex gap-8">
          <button type="button" className="btn btn--ghost" disabled>Generate AI Copy / 生成AI文案</button>
          <Link to={`/admin/home-sale/share/${listingId}`} className="btn btn--ghost">Share Kit</Link>
          <Link to={`/admin/home-sale/listings/${listingId}/edit`} className="btn btn--ghost">Edit Listing</Link>
        </div>
      </div>

      <HomeSaleWorkflowNav listingId={listingId} />

      <div className="notice notice--warning">
        <h4>AI Copy Generation / AI 文案生成</h4>
        <p>Coming next. 当前 v1 先支持手动维护 Website / WeChat / Xiaohongshu / Facebook / Realtor / FSBO 文案。</p>
      </div>

      {error && (
        <div className="notice notice--error">
          <h4>Marketing workflow error</h4>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Loading marketing workflow…</div>
      ) : (
        <>
          <form className="card mb-24" onSubmit={handleSubmit}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 16 }}>Add or Update Copy / 新增或更新文案</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Channel <span className="ch-hint">渠道</span></label>
                <select className="form-control" value={form.channel} onChange={updateField("channel")}>
                  {HOME_SALE_MARKETING_CHANNELS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Language <span className="ch-hint">语言</span></label>
                <select className="form-control" value={form.language} onChange={updateField("language")}>
                  {HOME_SALE_LANGUAGES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Version <span className="ch-hint">版本</span></label>
                <input className="form-control" value={form.version} onChange={updateField("version")} />
              </div>
              <div className="form-group">
                <label>Status <span className="ch-hint">状态</span></label>
                <select className="form-control" value={form.status} onChange={updateField("status")}>
                  {HOME_SALE_MARKETING_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Headline <span className="ch-hint">标题</span></label>
              <input className="form-control" value={form.headline} onChange={updateField("headline")} />
            </div>
            <div className="form-group">
              <label>Body Copy <span className="ch-hint">正文</span></label>
              <textarea className="form-control" value={form.bodyCopy} onChange={updateField("bodyCopy")} rows={5} />
            </div>
            <div className="form-group">
              <label>Call To Action <span className="ch-hint">行动引导</span></label>
              <input className="form-control" value={form.callToAction} onChange={updateField("callToAction")} />
            </div>
            <div className="form-group">
              <label>Hashtags <span className="ch-hint">标签</span></label>
              <input className="form-control" value={form.hashtags} onChange={updateField("hashtags")} />
            </div>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save Marketing Copy / 保存文案"}
            </button>
          </form>

          <div className="card" style={{ padding: 0 }}>
            <div className="flex-between" style={{ padding: "20px 20px 12px" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800 }}>Current Copy Rows / 当前文案行</h2>
            </div>
            {rows.length === 0 ? (
              <div style={{ padding: "24px 20px", color: "var(--color-text-muted)" }}>No marketing copy rows yet for this listing.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Copy ID</th>
                      <th>Channel</th>
                      <th>Language</th>
                      <th>Headline</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.copyId || `${item.channel}-${item.language}`}>
                        <td><code>{item.copyId || "Pending"}</code></td>
                        <td>{item.channel}</td>
                        <td>{item.language}</td>
                        <td>{item.headline || "—"}</td>
                        <td>{item.status || "Draft"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setForm({
                              copyId: item.copyId || "",
                              listingId,
                              channel: item.channel || "Website",
                              language: item.language || "Chinese",
                              headline: item.headline || "",
                              bodyCopy: item.bodyCopy || "",
                              callToAction: item.callToAction || "",
                              hashtags: item.hashtags || "",
                              publicUrl: item.publicUrl || listing?.publicListingUrl || "",
                              version: item.version || "v1",
                              status: item.status || "Draft",
                            })}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
