import { useState } from "react";

export default function ContentAccordion({
  title,
  summary,
  defaultOpen = false,
  id,
  className = "",
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen((v) => !v);

  return (
    <div
      id={id}
      className={`ca-accordion ${open ? "ca-accordion--open" : "ca-accordion--closed"} ${className}`}
    >
      <button
        type="button"
        className="ca-accordion__toggle"
        onClick={toggle}
        aria-expanded={open}
      >
        <div className="ca-accordion__toggle-inner">
          <span className="ca-accordion__title">{title}</span>
          {!open && summary && (
            <span className="ca-accordion__preview">{summary}</span>
          )}
        </div>
        <span className="ca-accordion__chevron" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div className="ca-accordion__body">{children}</div>}
    </div>
  );
}
