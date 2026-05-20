import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import {
  buildHomeSalePublicUrl,
  getHomeSaleListing,
  getMarketingCopyByListingId,
} from "../../utils/homeSaleSheet";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function HomeSaleShare() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [marketingRows, setMarketingRows] = useState([]);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    Promise.all([
      getHomeSaleListing(listingId),
      getMarketingCopyByListingId(listingId),
    ])
      .then(([listingRow, marketingCopyRows]) => {
        setListing(listingRow);
        setMarketingRows(marketingCopyRows);
      })
      .catch((err) => setError(err.message || "Failed to load listing for Share Kit."));
  }, [listingId]);

  const publicUrl = useMemo(() => buildHomeSalePublicUrl(listingId), [listingId]);
  const shareQrRef = useRef(null);

  const copyBlocks = useMemo(() => {
    const displayOrder = [
      "Website-English",
      "Website-Chinese",
      "WeChat-Chinese",
      "Xiaohongshu-Chinese",
      "Facebook-English",
      "Realtor version-English",
      "FSBO owner version-English",
    ];

    return [...marketingRows]
      .sort((a, b) => {
        const keyA = `${a.channel || ""}-${a.language || ""}`;
        const keyB = `${b.channel || ""}-${b.language || ""}`;
        const idxA = displayOrder.indexOf(keyA);
        const idxB = displayOrder.indexOf(keyB);
        if (idxA !== -1 || idxB !== -1) {
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        }
        return `${a.channel || ""}${a.language || ""}`.localeCompare(`${b.channel || ""}${b.language || ""}`);
      })
      .map((row, index) => ({
        ...row,
        id: row.copyId || `${row.channel || "copy"}-${row.language || "lang"}-${index}`,
        shareText: [
          `Channel / 渠道: ${row.channel || "—"}`,
          `Language / 语言: ${row.language || "—"}`,
          `Headline / 标题: ${row.headline || "—"}`,
          "",
          `Body Copy / 正文:\n${row.bodyCopy || "—"}`,
          "",
          `Call To Action / 行动引导: ${row.callToAction || "—"}`,
          `Hashtags / 标签: ${row.hashtags || "—"}`,
        ].join("\n"),
      }));
  }, [marketingRows]);

  function handlePrintQr() {
    const win = window.open("", "_blank", "width=560,height=760");
    if (!win) return;
    win.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Home Sale QR Code</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #213128; text-align: center; }
    .wrap { max-width: 420px; margin: 0 auto; }
    .code { width: 240px; margin: 16px auto; }
    .code svg { display: block; width: 100%; height: auto; }
    .meta { font-size: 14px; line-height: 1.65; color: #4b5563; word-break: break-word; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>扫码查看出售房源</h1>
    <p class="meta">Scan to view the sale listing / 扫码查看出售房源</p>
    <div class="code">${shareQrRef.current?.querySelector("svg")?.outerHTML || ""}</div>
    <p class="meta">${escapeHtml(listing?.address || listingId)}</p>
    <p class="meta">${escapeHtml(publicUrl)}</p>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`);
    win.document.close();
  }

  async function handleCopy(key, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1800);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Share Kit / 分享素材</h1>
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
          <h4>Share workflow error</h4>
          <p>{error}</p>
        </div>
      )}

      <div className="card mb-24" style={{ borderColor: "#e5dfd6" }}>
        <h2 style={{ color: "#213128", fontSize: "1.05rem", fontWeight: 800, marginBottom: 10 }}>
          Sale QR Code / 出售房源二维码
        </h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 16 }}>
          扫码查看房源详情与买家咨询入口。 / Scan to open the sale listing and buyer inquiry page.
        </p>
        {/* Hidden ref — print handler extracts SVG HTML from here */}
        <div ref={shareQrRef} style={{ display: "none" }}>
          <QRCodeSVG value={publicUrl} size={200} fgColor="#2f4338" bgColor="#ffffff" />
        </div>
        <div style={{ width: 180, margin: "0 auto 12px", display: "flex", justifyContent: "center" }}>
          <QRCodeSVG value={publicUrl} size={180} fgColor="#2f4338" bgColor="#ffffff" />
        </div>
        <div className="flex" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--ghost" onClick={handlePrintQr}>Print QR Code / 打印二维码</button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">Open Public Page</a>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-16" style={{ alignItems: "flex-start", gap: 12 }}>
          <div>
            <h2 style={{ color: "#213128", fontSize: "1.05rem", fontWeight: 800, marginBottom: 8 }}>
              Marketing Copy Share Blocks / 营销文案分享块
            </h2>
            <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
              直接读取已生成的 Home Sale 营销文案，方便复制到微信、小红书、Facebook 等渠道。
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => handleCopy("public-link", publicUrl)}
          >
            {copiedKey === "public-link" ? "已复制链接 / Link Copied" : "复制公开页链接 / Copy Public Link"}
          </button>
        </div>

        {copyBlocks.length === 0 ? (
          <div className="notice notice--warning" style={{ marginBottom: 0 }}>
            <h4>Please generate Marketing Copy first / 请先生成营销文案</h4>
            <p style={{ marginBottom: 0 }}>
              <Link to={`/admin/home-sale/marketing/${listingId}`}>Go to Marketing Copy / 前往营销文案页面</Link>
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {copyBlocks.map((block) => (
              <article
                key={block.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 18,
                  padding: 18,
                  background: "#fffdf9",
                }}
              >
                <div className="flex-between mb-16" style={{ alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4 }}>
                      {block.channel || "Channel"} / {block.language || "Language"}
                    </h3>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      {block.copyId || "Pending"}{block.version ? ` · ${block.version}` : ""}{block.status ? ` · ${block.status}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleCopy(block.id, block.shareText)}
                  >
                    {copiedKey === block.id ? "已复制 / Copied" : "复制文案 / Copy"}
                  </button>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <p className="text-muted text-sm" style={{ marginBottom: 4 }}>Headline / 标题</p>
                    <div style={{ fontWeight: 700 }}>{block.headline || "—"}</div>
                  </div>
                  <div>
                    <p className="text-muted text-sm" style={{ marginBottom: 4 }}>Body Copy / 正文</p>
                    <textarea className="form-control" value={block.bodyCopy || ""} readOnly rows={6} />
                  </div>
                  <div>
                    <p className="text-muted text-sm" style={{ marginBottom: 4 }}>Call To Action / 行动引导</p>
                    <div>{block.callToAction || "—"}</div>
                  </div>
                  <div>
                    <p className="text-muted text-sm" style={{ marginBottom: 4 }}>Hashtags / 标签</p>
                    <div>{block.hashtags || "—"}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
