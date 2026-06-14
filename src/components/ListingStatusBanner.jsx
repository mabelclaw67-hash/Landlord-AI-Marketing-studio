import { Link } from "react-router-dom";
import { AL, getStatusLabel } from "../utils/adminLabels";
import { useLang } from "../contexts/LangContext";

// Derive the "next step" for a rental listing from its fields (no API call needed)
export function getRentalNextStepInfo(listing, L) {
  const status = String(listing?.status || "Draft");
  const id = listing?.id;

  if (status === "Published") {
    return {
      label: L.nextStepMonitorApps,
      to: `/admin/listing/${id}?step=applications`,
      urgent: false,
      stepKey: "applications",
    };
  }
  if (status === "Ready to Publish") {
    return {
      label: L.nextStepPublishNow,
      to: `/admin/listing/${id}?step=publish`,
      urgent: true,
      stepKey: "publish",
    };
  }
  if (status === "In Review") {
    return {
      label: L.nextStepReviewPublish,
      to: `/admin/listing/${id}?step=review`,
      urgent: true,
      stepKey: "review",
    };
  }
  if (listing?.videoUrl) {
    return {
      label: L.nextStepReviewPublish,
      to: `/admin/listing/${id}?step=review`,
      urgent: false,
      stepKey: "review",
    };
  }
  if (listing?.adCopyEn) {
    return {
      label: L.nextStepCreateVideo,
      to: `/admin/listing/${id}?step=video`,
      urgent: false,
      stepKey: "video",
    };
  }
  if (listing?.coverPhotoUrl) {
    return {
      label: L.nextStepGenerateCopy,
      to: `/admin/listing/${id}?step=copy`,
      urgent: false,
      stepKey: "copy",
    };
  }
  if (listing?.address && listing?.rent) {
    return {
      label: L.nextStepUploadPhotos,
      to: `/admin/listing/${id}?step=photos`,
      urgent: false,
      stepKey: "photos",
    };
  }
  return {
    label: L.nextStepCompleteDetails,
    to: `/admin/listing/${id}?step=details`,
    urgent: false,
    stepKey: "details",
  };
}

export default function ListingStatusBanner({ listing }) {
  const lang = useLang();
  const L = AL[lang] ?? AL.en;

  if (!listing) return null;

  const statusLabel = getStatusLabel(listing.status, lang);
  const next = getRentalNextStepInfo(listing, L);
  const isPublished = String(listing.status || "").toLowerCase() === "published";

  return (
    <div className={`listing-status-banner ${next.urgent ? "listing-status-banner--urgent" : isPublished ? "listing-status-banner--published" : ""}`}>
      <div className="listing-status-banner__status">
        <span className="listing-status-banner__label">{L.wizStatusLabel}:</span>
        <span className="listing-status-banner__value">{statusLabel}</span>
      </div>
      <div className="listing-status-banner__next">
        <span className="listing-status-banner__label">{L.wizBannerNextStep}</span>
        <Link
          to={next.to}
          className={`btn btn--sm ${next.urgent ? "btn--primary" : "btn--ghost"}`}
        >
          {next.label} →
        </Link>
      </div>
    </div>
  );
}
