export const RENTAL_APPLICATION_PROCESS_URL = "https://www.vanislandproperty.ca/rentals";

export const RENTAL_APPLICATION_PROCESS_NOTICE =
  "Before applying, please review our Rental Application Process at vanislandproperty.ca/rentals.";

const COMPLIANCE_FOOTER_MARKER = "\n\n---\n⚠️";
const APPLICANT_FACING_OUTPUT_KEYS = new Set([
  "Facebook Post",
  "Craigslist Ad",
  "WeChat Post",
  "Short Video Script",
  "English Rental Ad",
  "Chinese Owner Summary",
]);

export function appendRentalApplicationProcessNotice(text) {
  const copy = String(text ?? "");
  if (!copy || copy.includes(RENTAL_APPLICATION_PROCESS_NOTICE)) return copy;

  const footerIndex = copy.lastIndexOf(COMPLIANCE_FOOTER_MARKER);
  const main = footerIndex >= 0 ? copy.slice(0, footerIndex) : copy;
  const footer = footerIndex >= 0 ? copy.slice(footerIndex) : "";

  return `${main.trimEnd()}\n\n${RENTAL_APPLICATION_PROCESS_NOTICE}${footer}`;
}

export function addRentalApplicationProcessNoticeToOutput(outputKey, text) {
  return APPLICANT_FACING_OUTPUT_KEYS.has(outputKey)
    ? appendRentalApplicationProcessNotice(text)
    : text;
}
