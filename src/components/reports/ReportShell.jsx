import { REPORT_BRAND } from "./reportTheme";

export default function ReportShell({ title, subtitle, meta = [], children, footer }) {
  return (
    <article className="report-shell">
      <header className="report-shell__header">
        <div className="report-shell__brand">
          <div className="report-shell__mark">{REPORT_BRAND.mark}</div>
          <div>
            <strong>{REPORT_BRAND.company}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
        <h1>{title}</h1>
        {meta.length > 0 && (
          <dl className="report-shell__meta">
            {meta.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>
      <main>{children}</main>
      {footer && <footer className="report-shell__footer">{footer}</footer>}
    </article>
  );
}
