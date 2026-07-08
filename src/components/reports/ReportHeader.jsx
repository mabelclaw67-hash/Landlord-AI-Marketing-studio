import { REPORT_BRAND } from "./reportTheme";

export default function ReportHeader({ title, subtitle, meta = [] }) {
  return (
    <header className="report-header">
      <div className="report-header__brand">
        <div className="report-header__mark">{REPORT_BRAND.mark}</div>
        <div>
          <strong>{REPORT_BRAND.company}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </div>
      <h1>{title}</h1>
      <div className="report-header__meta">
        {meta.map((item) => (
          <p key={item.label}><strong>{item.label}</strong> {item.value}</p>
        ))}
      </div>
    </header>
  );
}
