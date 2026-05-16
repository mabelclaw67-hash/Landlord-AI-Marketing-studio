import { useState } from "react";
import { Link } from "react-router-dom";
import { readTrialAccess } from "../../utils/trialAccess";

const FAQS = [
  {
    q: "How do I create a listing? / 如何创建房源？",
    a: "For a Sale Listing: go to Home Sale Studio → New Sale Listing, fill in the basic property information, and click Create Listing. For a Rental Listing: go to Rental Dashboard → New Rental Listing and fill in the form.\n\n出售房源：进入 Home Sale Studio → 新增出售房源，填写基本房源信息后点击创建。出租房源：进入出租后台 → 新增出租房源，填写表单即可。",
  },
  {
    q: "Why do I need to save basic information before uploading photos? / 为什么要先保存基本信息才能上传照片？",
    a: "When you save a listing for the first time, the system automatically creates a Google Drive folder for your property, assigns a unique Listing ID, and sets up the workspace for photos, videos, and marketing materials. Photos and media can only be attached to an existing listing record.\n\n首次保存房源时，系统会自动创建专属的 Google Drive 文件夹、分配唯一房源编号，并初始化照片、视频和营销素材的工作区。照片和媒体文件只能附加到已存在的房源记录上。",
  },
  {
    q: "How do I upload photos? / 如何上传照片？",
    a: "After saving a listing, navigate to the Media tab in the Home Sale workflow (for sale listings) or use the photo upload section in the listing detail (for rental listings). You can upload photos directly from your device — they will be stored in your listing's Google Drive folder.\n\n保存房源后，在 Home Sale 工作流的 Media 标签页（出售房源）或房源详情中的照片上传区域（出租房源）上传照片。照片将直接存储到该房源的 Google Drive 文件夹中。",
  },
  {
    q: "How do I generate marketing copy? / 如何生成广告文案？",
    a: "For Sale Listings: after saving your listing, go to the Marketing tab in the Home Sale workflow. The system can generate bilingual (English + Chinese) marketing copy for multiple channels including WeChat, Xiaohongshu, and Facebook. For Rental Listings: marketing copy is generated automatically when you create the listing.\n\n出售房源：保存后进入 Home Sale 工作流的 Marketing 标签页，系统可生成微信、小红书、Facebook 等平台的双语广告文案。出租房源：创建房源时系统自动生成广告文案。",
  },
  {
    q: "What can trial users access? / Trial 用户能使用哪些功能？",
    a: "Trial users can: create sale or rental listings (depending on approved module), upload photos, generate marketing copy, view public listing pages, use the QR code feature, access Smart Photo Tips, and read the FAQ.\n\nTrial users cannot: use Virtual Staging, access AI Advanced Image Generation, or use other Premium features.\n\nTrial 用户可以：创建出售或出租房源（取决于已批准模块）、上传照片、生成广告文案、查看公开房源页、使用二维码功能、访问智能拍照建议和常见问题。\n\nTrial 用户不能使用：AI 虚拟布置、AI 高级图片生成及其他 Premium 功能。",
  },
  {
    q: "What are Premium features? / Premium 功能是什么？",
    a: "Premium features are advanced AI-powered tools that require a paid subscription. These include:\n• AI Virtual Staging — automatically furnish empty room photos using AI\n• AI Advanced Image Generation — enhance and transform listing photos with AI\n\nThese features are planned for future release. Contact us to be notified when they become available.\n\nPremium 功能是需要付费订阅的高级 AI 工具，包括：\n• AI 虚拟布置 — AI 自动为空房间照片添加家具布置\n• AI 高级图片生成 — AI 增强和优化房源照片\n\n这些功能计划在未来上线。如需第一时间获得通知，请联系我们。",
  },
  {
    q: "How long does trial access last? / 试用期多长时间？",
    a: "Trial access duration is set when your access code is approved. You can see your access expiry in the Trial Mode badge in the sidebar. Contact us if you need to extend your trial or upgrade to a paid plan.\n\n试用期长度在您的访问码批准时设定。您可以在侧边栏的试用模式标识中查看到期时间。如需延长试用或升级为付费计划，请联系我们。",
  },
  {
    q: "Can I share my listing page with buyers or tenants? / 如何将房源页面分享给买家或租客？",
    a: "Yes. Every published listing has a public URL and QR code. Use the Share button on any listing page, or copy the Public Listing URL from the listing details. Buyers and tenants can view the listing and submit inquiries without needing an account.\n\n可以。每个已发布的房源都有公开页面链接和二维码。使用房源页面上的分享按钮，或从房源详情中复制公开链接。买家和租客无需账号即可查看房源和提交咨询。",
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="card"
      style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "14px 18px",
          background: open ? "#f0f7f2" : "#ffffff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#213128", lineHeight: 1.4 }}>
          {item.q}
        </span>
        <span style={{ fontSize: "1rem", color: "#3e5b4b", flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div style={{ padding: "12px 18px 16px", borderTop: "1px solid #e4ede7" }}>
          {item.a.split("\n\n").map((para, i) => (
            <p key={i} style={{
              fontSize: "0.87rem",
              color: i % 2 === 0 ? "#213128" : "var(--color-text-muted)",
              lineHeight: 1.75,
              margin: i === 0 ? "0 0 10px" : "0",
              whiteSpace: "pre-line",
            }}>
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  const isTrial = !!readTrialAccess();

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>FAQ / 常见问题</h1>
          <p className="text-muted text-sm">
            Frequently asked questions about using the platform. / 关于平台使用的常见问题解答。
          </p>
        </div>
        <Link to="/admin" className="btn btn--ghost">← Back / 返回</Link>
      </div>

      {isTrial && (
        <div className="notice notice--sage" style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: "0.88rem" }}>
            💡 You are in Trial Mode. See <strong>"What can trial users access?"</strong> below for details on your available features. / 您正在使用试用模式，请查看下方"Trial 用户能使用哪些功能"了解详情。
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {FAQS.map((item, i) => (
          <FaqItem key={i} item={item} />
        ))}
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/admin" className="btn btn--ghost">← Back to Dashboard / 返回后台</Link>
        <Link to="/admin/photo-tips" className="btn btn--ghost">📷 Photo Tips →</Link>
      </div>
    </div>
  );
}
