export default function ExecutiveSummary({ items = [] }) {
  return (
    <section className="report-executive-summary">
      {items.map((item) => (
        <div className="report-executive-summary__item" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <p>{item.note}</p>}
        </div>
      ))}
    </section>
  );
}
