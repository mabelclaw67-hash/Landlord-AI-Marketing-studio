export default function ReportCard({ title, subtitle, children, actions }) {
  return (
    <section className="report-card">
      <header className="report-card__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
