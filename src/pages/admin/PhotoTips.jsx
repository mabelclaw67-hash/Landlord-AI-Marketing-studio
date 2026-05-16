import { Link } from "react-router-dom";

const SECTIONS = [
  {
    icon: "🕐",
    title: "Best Time to Shoot / 最佳拍摄时间",
    items: [
      { en: "Shoot mid-morning (9–11 AM) or late afternoon (3–5 PM) for the best natural light.", cn: "最佳拍摄时段为上午 9–11 点或下午 3–5 点，自然光最充足。" },
      { en: "Avoid shooting at noon — harsh shadows flatten the space.", cn: "避免正午拍摄，强烈阳光会产生难看的阴影。" },
      { en: "On cloudy days, diffused light can work well — turn on all interior lights.", cn: "阴天散射光效果也不错，同时开启室内所有灯光。" },
    ],
  },
  {
    icon: "💡",
    title: "Lighting / 光线",
    items: [
      { en: "Turn on every light in the room — lamps, ceiling lights, and under-cabinet lights.", cn: "打开房间所有灯光：台灯、吸顶灯、橱柜灯全部开启。" },
      { en: "Open all curtains and blinds to maximize natural light.", cn: "拉开所有窗帘和百叶窗，让自然光充分进入。" },
      { en: "Avoid shooting directly into bright windows — move to the side.", cn: "避免直接对着明亮窗户拍摄，从侧面角度拍效果更好。" },
    ],
  },
  {
    icon: "📱",
    title: "Orientation / 横屏拍摄",
    items: [
      { en: "Always shoot in landscape (horizontal) mode — never portrait.", cn: "始终使用横屏模式拍摄，不要竖屏拍房间。" },
      { en: "Landscape photos show more of the room and look better on listing pages.", cn: "横屏照片能展示更多空间，在房源页面上效果更佳。" },
      { en: "Shoot from a corner or doorway to capture the full room.", cn: "从角落或门口拍摄，可以展示更完整的房间视野。" },
    ],
  },
  {
    icon: "🏠",
    title: "Must-Shoot Rooms / 必拍房间",
    items: [
      { en: "Living Room — show the full space, sofa, and any fireplace or feature wall.", cn: "客厅：展示完整空间、沙发、壁炉或特色墙面。" },
      { en: "Kitchen — show countertops, cabinets, appliances, and dining area if adjacent.", cn: "厨房：展示台面、橱柜、家电，以及相邻用餐区。" },
      { en: "Each Bedroom — show the bed, closet, and window.", cn: "每间卧室：展示床铺、衣橱和窗户。" },
      { en: "Bathroom(s) — clean thoroughly before shooting; show sink, shower/tub.", cn: "浴室/卫生间：拍摄前彻底清洁；展示洗手台和淋浴/浴缸。" },
      { en: "At least 2 photos per room from different angles.", cn: "每个房间至少拍 2 张照片，从不同角度拍摄。" },
    ],
  },
  {
    icon: "🧹",
    title: "Declutter / 清除杂物",
    items: [
      { en: "Remove personal items — family photos, toys, pet bowls, toiletries.", cn: "移除个人物品：家庭照片、玩具、宠物碗、洗漱用品。" },
      { en: "Clear kitchen countertops — leave only 1–2 decorative items.", cn: "清空厨房台面，最多留 1–2 件装饰品。" },
      { en: "Make all beds and fluff pillows before shooting.", cn: "拍摄前整理所有床铺、拍松枕头。" },
      { en: "Hide cables and chargers out of sight.", cn: "将电线和充电器收藏整齐，不要出现在镜头中。" },
    ],
  },
  {
    icon: "🌿",
    title: "Exterior / 外观拍摄",
    items: [
      { en: "Shoot the front exterior — ideally with a clear sky background.", cn: "拍摄房屋正面外观，最好以晴天蓝天为背景。" },
      { en: "Include parking stall(s) if available.", cn: "拍摄停车位（如有）。" },
      { en: "Include backyard, garden, balcony, or patio if applicable.", cn: "包括后院、花园、阳台或露台（如有）。" },
      { en: "Mow the lawn and remove any outdoor clutter before shooting.", cn: "拍摄前修剪草坪、清理室外杂物。" },
    ],
  },
];

export default function PhotoTips() {
  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Smart Photo Tips / 智能拍照建议</h1>
          <p className="text-muted text-sm">
            Follow this checklist to take listing photos that attract more inquiries. / 按照此清单拍摄，帮助您的房源吸引更多咨询。
          </p>
        </div>
        <Link to="/admin" className="btn btn--ghost">← Back / 返回</Link>
      </div>

      <div className="notice notice--sage" style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: "0.88rem" }}>
          📷 Good photos are the single biggest factor in attracting tenant or buyer inquiries. Use this checklist before every shoot. / 好照片是吸引租客和买家的最重要因素。每次拍摄前请参考此清单。
        </p>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {SECTIONS.map((section) => (
          <div key={section.title} className="card" style={{ padding: "18px 20px" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#213128", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {section.items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#e4f0e8",
                    border: "1.5px solid #a8d4b4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#3e5b4b",
                    marginTop: 2,
                  }}>
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: "0.88rem", color: "#213128", lineHeight: 1.5 }}>{item.en}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{item.cn}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/admin" className="btn btn--ghost">← Back to Dashboard / 返回后台</Link>
        <Link to="/admin/home-sale" className="btn btn--ghost">Home Sale Studio →</Link>
      </div>
    </div>
  );
}
