import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ShareKit from "../../components/ShareKit";
import HomeSaleWorkflowNav from "../../components/HomeSaleWorkflowNav";
import { buildQrCodeSvg } from "../../utils/qrCodeSvg";
import { buildHomeSalePublicUrl, formatSalePrice, getHomeSaleListing } from "../../utils/homeSaleSheet";

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
  const [error, setError] = useState("");

  useEffect(() => {
    getHomeSaleListing(listingId)
      .then(setListing)
      .catch((err) => setError(err.message || "Failed to load listing for Share Kit."));
  }, [listingId]);

  const publicUrl = useMemo(() => buildHomeSalePublicUrl(listingId), [listingId]);
  const qrSvg = useMemo(() => buildQrCodeSvg(publicUrl, {
    cellSize: 5,
    quietZone: 4,
    foreground: "#2f4338",
    background: "#ffffff",
  }), [publicUrl]);

  const messages = useMemo(() => {
    const address = listing?.address || "房屋出售房源";
    const city = listing?.city ? `${listing.city}, ${listing.province || ""}`.replace(/,\s*$/, "") : "";
    const price = formatSalePrice(listing?.askingPrice);
    const propertyType = listing?.propertyType || "房产";
    const shortLine = [address, city].filter(Boolean).join(" · ");
    const publicLine = listing?.publicListingUrl || publicUrl;

    return [
      {
        id: "wechat-sale",
        label: "微信房源分享 / WeChat Sale Sharing",
        rows: 6,
        text: `房屋出售推荐：${shortLine}\n售价：${price}\n类型：${propertyType}\n欢迎扫码或打开链接查看房源详情。\n${publicLine}\n\nEnglish:\nHome for sale: ${shortLine}\nPrice: ${price}\nView the listing here: ${publicLine}`,
      },
      {
        id: "xiaohongshu-sale",
        label: "小红书分享 / Xiaohongshu Sharing",
        rows: 6,
        text: `今日房屋出售推荐：${shortLine}\n售价 ${price}，适合关注温哥华岛房产的买家参考。\n欢迎查看详情、保存链接、预约咨询。\n${publicLine}\n\n#温哥华岛房产 #房屋出售 #自住房推荐`,
      },
      {
        id: "facebook-sale",
        label: "Facebook 社区分享 / Facebook Community Sharing",
        rows: 6,
        text: `新出售房源分享：${shortLine}\nAsking Price: ${price}\nProperty Type: ${propertyType}\nSee the listing page and buyer inquiry details here:\n${publicLine}`,
      },
      {
        id: "realtor-fsbo",
        label: "Realtor / FSBO 版本 / Realtor / FSBO Version",
        rows: 7,
        text: `房屋出售推广链接：${shortLine}\n售价：${price}\n可用于 Realtor / FSBO 分享、朋友圈、社区群组与二维码海报。\n链接：${publicLine}\n\nEnglish:\nHome sale marketing link for Realtor / FSBO sharing:\n${publicLine}`,
      },
    ];
  }, [listing, publicUrl]);

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
    <div class="code">${qrSvg}</div>
    <p class="meta">${escapeHtml(listing?.address || listingId)}</p>
    <p class="meta">${escapeHtml(publicUrl)}</p>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`);
    win.document.close();
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
        <div style={{ width: 180, margin: "0 auto 12px" }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="flex" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--ghost" onClick={handlePrintQr}>Print QR Code / 打印二维码</button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">Open Public Page</a>
        </div>
      </div>

      <ShareKit
        buttonLabel="Sale Share Kit / 出售房源分享素材"
        title="Sale Share Kit / 出售房源分享素材"
        subtitle="面向屋主、Realtor、FSBO 和买家社区分享。 / For owners, realtors, FSBO, and buyer-facing sharing."
        messages={messages}
        linkLabel="复制当前公开页面链接 / Copy Public Listing Link"
        linkValue={publicUrl}
      />
    </div>
  );
}
