import { Link } from "react-router-dom";
import { isAdminSessionActive, readTrialAccess } from "../utils/trialAccess";

const FREE_MODULES = [
  {
    icon: "📷",
    title: "Smart Photo Tips",
    titleCn: "智能拍照建议",
    desc: "Photography checklist to take listing photos that attract more inquiries.",
    descCn: "拍摄清单，帮助您拍出吸引更多咨询的房源照片。",
    to: "/admin/photo-tips",
    label: "Open / 打开",
  },
  {
    icon: "❓",
    title: "FAQ",
    titleCn: "常见问题",
    desc: "Answers to common questions about listings, photos, and platform features.",
    descCn: "关于房源、照片和平台功能的常见问题解答。",
    to: "/admin/faq",
    label: "Open / 打开",
  },
];

const PREMIUM_MODULES = [
  {
    icon: "🛋️",
    title: "AI Virtual Staging",
    titleCn: "AI 虚拟布置",
    desc: "Upload an empty room photo — AI furnishes it with your chosen style.",
    descCn: "上传空房间照片，AI 自动布置家具风格。",
  },
  {
    icon: "✨",
    title: "AI Advanced Image Generation",
    titleCn: "AI 高级图片生成",
    desc: "Enhance and transform listing photos with AI for professional results.",
    descCn: "AI 增强和优化房源照片，呈现专业级效果。",
  },
];

export default function ComingSoonSection() {
  const isAdmin = isAdminSessionActive();

  function premiumButtonLabel() {
    return isAdmin ? "Architecture Preview Only" : "Premium — Upgrade to Access";
  }

  return (
    <div style={{ marginTop: 36 }}>

      {/* ── Free modules ──────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.05rem", color: "#213128", marginBottom: 4 }}>
          Available Now / 现已开放
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 14 }}>
          Free features accessible to all users. / 所有用户均可免费访问。
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}>
          {FREE_MODULES.map((mod) => (
            <div
              key={mod.title}
              className="card"
              style={{ padding: "16px 14px", display: "flex", flexDirection: "column", borderColor: "#b6d8c3" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: "1.35rem", flexShrink: 0, lineHeight: 1 }}>{mod.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#213128", lineHeight: 1.3 }}>{mod.title}</div>
                  <div style={{ fontSize: "0.77rem", color: "var(--color-text-muted)" }}>{mod.titleCn}</div>
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: 12, flexGrow: 1 }}>
                {mod.desc}<br />{mod.descCn}
              </p>
              <Link
                to={mod.to}
                className="btn btn--sage btn--sm"
                style={{ textAlign: "center", display: "block" }}
              >
                {mod.label}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Premium modules ────────────────────────────────────── */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.05rem", color: "#213128", marginBottom: 4 }}>
          Premium Features / 高级付费功能
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 14 }}>
          Advanced AI tools for paid accounts. / 付费账号专属 AI 高级功能。
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}>
          {PREMIUM_MODULES.map((mod) => (
            <div
              key={mod.title}
              className="card"
              style={{ padding: "16px 14px", display: "flex", flexDirection: "column", opacity: 0.88 }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: "1.35rem", flexShrink: 0, lineHeight: 1 }}>{mod.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#213128", lineHeight: 1.3 }}>{mod.title}</div>
                  <div style={{ fontSize: "0.77rem", color: "var(--color-text-muted)" }}>{mod.titleCn}</div>
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: 10, flexGrow: 1 }}>
                {mod.desc}<br />{mod.descCn}
              </p>
              <div style={{
                display: "inline-block",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#7c4a00",
                background: "#fdf3e7",
                border: "1px solid #f0c98a",
                borderRadius: 4,
                padding: "2px 7px",
                marginBottom: 10,
                alignSelf: "flex-start",
              }}>
                ✨ Premium Feature
              </div>
              <button
                disabled
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  borderRadius: 7,
                  border: "1px solid #d0d8d2",
                  background: "#f4f7f5",
                  color: "#8a9e94",
                  cursor: "not-allowed",
                }}
              >
                {premiumButtonLabel()}
              </button>
              {!isAdmin && (
                <p style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
                  Available for paid accounts only.<br />付费账号专属功能。
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
