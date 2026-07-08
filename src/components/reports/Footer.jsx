import { REPORT_BRAND } from "./reportTheme";

export default function Footer({ notice }) {
  return (
    <footer className="report-footer">
      <span>{REPORT_BRAND.company}</span>
      {notice && <span>{notice}</span>}
    </footer>
  );
}
