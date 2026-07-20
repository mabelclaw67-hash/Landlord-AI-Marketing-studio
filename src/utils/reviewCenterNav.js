// AI Review Center is the top-level module. Property Assessment and Dispute
// Review are services underneath it, so every navigation surface points at the
// Review Center and stays highlighted while the visitor is inside any of its
// sub-pages (including the public report routes).

export const REVIEW_CENTER_PATH = "/landlord-ai/review-center";

const REVIEW_ROUTE_PREFIXES = [
  "/landlord-ai/review-center",
  "/landlord-ai/strategy-assessment",
  "/landlord-ai/dispute-review",
  "/strategy-assessment/report",
  "/dispute-review/report",
];

export function isReviewCenterRoute(pathname) {
  const path = String(pathname || "");
  return REVIEW_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
