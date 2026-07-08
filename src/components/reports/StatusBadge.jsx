import { reportStatusTone } from "./reportTheme";

export default function StatusBadge({ children, tone }) {
  const safeTone = tone || reportStatusTone(children);
  return <span className={`report-status-badge report-status-badge--${safeTone}`}>{children}</span>;
}
