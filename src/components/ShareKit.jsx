import { useState } from "react";

export default function ShareKit({
  buttonLabel,
  title,
  subtitle,
  messages,
  linkLabel,
  linkValue,
}) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  async function copyText(key, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1800);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <div className="share-kit">
      <button
        type="button"
        className="share-kit__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{buttonLabel}</span>
        <span className="share-kit__toggle-icon" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="share-kit__panel">
          <div className="share-kit__header">
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          <div className="share-kit__list">
            {messages.map((message) => (
              <article key={message.id} className="share-kit__item">
                <div className="share-kit__item-head">
                  <h4>{message.label}</h4>
                  <button
                    type="button"
                    className="share-kit__copy"
                    onClick={() => copyText(message.id, message.text)}
                  >
                    {copiedKey === message.id ? "已复制 / Copied" : "复制文案 / Copy"}
                  </button>
                </div>
                <textarea
                  className="share-kit__text"
                  value={message.text}
                  readOnly
                  rows={message.rows || 4}
                />
              </article>
            ))}
          </div>

          <button
            type="button"
            className="share-kit__link"
            onClick={() => copyText("page-link", linkValue || window.location.href)}
          >
            {copiedKey === "page-link" ? "已复制链接 / Link Copied" : linkLabel}
          </button>
        </div>
      )}
    </div>
  );
}
