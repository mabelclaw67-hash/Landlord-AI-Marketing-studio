export default function RecommendationBox({ title, children, tone = "neutral" }) {
  return (
    <aside className={`report-recommendation report-recommendation--${tone}`}>
      {title && <strong>{title}</strong>}
      <p>{children}</p>
    </aside>
  );
}
