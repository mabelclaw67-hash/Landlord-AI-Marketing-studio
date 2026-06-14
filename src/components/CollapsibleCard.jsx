import { useState } from "react";

export default function CollapsibleCard({
  title,
  icon = "",
  badge = null,
  defaultOpen = true,
  className = "",
  id,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div id={id} className={`ccard mb-24 ${open ? "ccard--open" : "ccard--closed"} ${className}`}>
      <button
        type="button"
        className="ccard__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="ccard__title">
          {icon && <span className="ccard__icon">{icon}</span>}
          {title}
        </span>
        <span className="ccard__right">
          {badge && <span className="ccard__badge">{badge}</span>}
          <span className="ccard__chevron" aria-hidden="true">{open ? "▲" : "▼"}</span>
        </span>
      </button>
      {open && <div className="ccard__body">{children}</div>}
    </div>
  );
}
