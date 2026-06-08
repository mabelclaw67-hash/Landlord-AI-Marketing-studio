import { apiGet, isApiConnected } from "./api";

export async function getDailyMarketBrief() {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiGet({ action: "getDailyMarketBrief" });
}

export async function getWebsiteReport(reportId) {
  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }
  return apiGet({ action: "getWebsiteReport", reportId });
}
