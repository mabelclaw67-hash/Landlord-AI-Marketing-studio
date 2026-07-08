export const REPORT_BRAND = {
  company: "VanIsland Property Management",
  mark: "VIPM",
  colors: {
    green: "#1E3A2F",
    greenMid: "#2D5A3D",
    sage: "#5C7A62",
    gold: "#C8A96A",
    goldSoft: "#F5EFE3",
    cream: "#FAF8F4",
    line: "#E8E2D9",
    text: "#1E3A2F",
    muted: "#62756A",
    riskLow: "#EAF0EB",
    riskMedium: "#FFF4D8",
    riskHigh: "#FBE8E6",
  },
  fonts: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  },
};

export function reportStatusTone(value = "") {
  const text = String(value).toLowerCase();
  if (/(strong|approved|complete|low|强|完整|低)/.test(text)) return "success";
  if (/(backup|verify|medium|pending|核实|备选|中)/.test(text)) return "warning";
  if (/(lower|high|missing|concern|risk|缺失|风险|高)/.test(text)) return "danger";
  return "neutral";
}
