export default function SectionTitle({ eyebrow, children }) {
  return (
    <div className="report-section-title">
      {eyebrow && <span>{eyebrow}</span>}
      <h2>{children}</h2>
    </div>
  );
}
