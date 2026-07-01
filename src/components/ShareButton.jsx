import { useState } from "react";
import { shareListing } from "../utils/shareListing";

export default function ShareButton({
  listing,
  listingId,
  title,
  text,
  url,
  className = "",
  label = "Share Listing",
  copiedLabel = "✓ Link copied",
  ariaLabel = "Share this listing",
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const hasListingShare = Boolean(listing || listingId);
    if (hasListingShare) {
      try {
        const result = await shareListing(listing || listingId);
        if (result === "copied") {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch {
        // user cancelled or sharing blocked — do nothing
      }
      return;
    }

    const shareUrl = url || window.location.href;
    const shareText = text && !text.includes(shareUrl)
      ? `${text}\n${shareUrl}`
      : text;
    const payload = { title, text: shareText || shareUrl, url: shareUrl };
    if (navigator.share) {
      try {
        await navigator.share(payload);
      } catch {
        // user cancelled — do nothing
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText || shareUrl);
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
      aria-label={ariaLabel}
    >
      {copied ? (
        <span className="share-btn__copied">{copiedLabel}</span>
      ) : (
        <>
          <svg className="share-btn__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="15" cy="4" r="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="15" cy="16" r="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.6" />
            <line x1="6.9" y1="9.1" x2="13.1" y2="5.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="6.9" y1="10.9" x2="13.1" y2="14.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
