import { useState } from "react";

export default function ShareButton({ title, text, url, className = "" }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // user cancelled — do nothing
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — silent fail
    }
  }

  return (
    <button
      className={`share-btn${className ? " " + className : ""}`}
      onClick={handleShare}
      aria-label="Share this listing"
    >
      {copied ? (
        <span className="share-btn__copied">✓ Link copied</span>
      ) : (
        <>
          <svg className="share-btn__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="15" cy="4" r="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="15" cy="16" r="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.6" />
            <line x1="6.9" y1="9.1" x2="13.1" y2="5.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="6.9" y1="10.9" x2="13.1" y2="14.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Share Listing
        </>
      )}
    </button>
  );
}
