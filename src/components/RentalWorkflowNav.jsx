import { useSearchParams } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { AL } from "../utils/adminLabels";

// Step completion detection from listing fields (no API call)
function isStepComplete(key, listing) {
  if (!listing) return false;
  switch (key) {
    case "details":      return !!(listing.address && listing.rent);
    case "photos":       return !!(listing.coverPhotoUrl);
    case "enhance":      return !!(listing.coverPhotoUrl); // no dedicated flag; treated as skippable
    case "cover":        return !!(listing.coverPhotoUrl);
    case "copy":         return !!(listing.adCopyEn);
    case "video":        return !!(listing.videoUrl);
    case "review": {
      const s = String(listing.status || "").toLowerCase();
      return s === "in review" || s === "ready to publish" || s === "published";
    }
    case "publish":      return String(listing.status || "").toLowerCase() === "published";
    case "applications": return false; // ongoing
    case "leads":        return false; // coming soon
    default:             return false;
  }
}

// Auto-select the first incomplete step if no URL param is set
export function getAutoStep(listing) {
  const ordered = ["details", "photos", "copy", "video", "review", "publish", "applications"];
  for (const key of ordered) {
    if (!isStepComplete(key, listing)) return key;
  }
  return "applications";
}

const STEPS = [
  { key: "details",      num: 1  },
  { key: "photos",       num: 2  },
  { key: "enhance",      num: 3, skippable: true },
  { key: "cover",        num: 4  },
  { key: "copy",         num: 5  },
  { key: "video",        num: 6, skippable: true },
  { key: "review",       num: 7  },
  { key: "publish",      num: 8  },
  { key: "applications", num: 9  },
  { key: "leads",        num: 10, comingSoon: true },
];

export default function RentalWorkflowNav({ listing }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = useLang();
  const L = AL[lang] ?? AL.en;

  const urlStep = searchParams.get("step");
  const activeKey = urlStep || getAutoStep(listing);

  const stepLabel = (key) => L[`wiz_${key}`] || key;

  const SECTION_MAP = {
    details:      "section-details",
    photos:       "section-photos",
    enhance:      "section-photos",
    cover:        "section-photos",
    copy:         "section-copy",
    video:        "section-photos",
    review:       "section-checklist",
    publish:      "section-checklist",
    applications: "section-details",
    leads:        "section-details",
  };

  function goToStep(key) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("step", key);
      return next;
    });
    // Scroll to the relevant section after state update
    requestAnimationFrame(() => {
      const sectionId = SECTION_MAP[key];
      if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  return (
    <div className="rental-workflow-nav" role="tablist" aria-label={lang === "zh" ? "出租房源工作流程" : "Rental listing workflow"}>
      {STEPS.map(({ key, num, skippable, comingSoon }) => {
        const done = isStepComplete(key, listing);
        const active = key === activeKey;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            className={[
              "rwn-step",
              active      ? "rwn-step--active"  : "",
              done        ? "rwn-step--done"    : "",
              comingSoon  ? "rwn-step--soon"    : "",
            ].filter(Boolean).join(" ")}
            onClick={() => goToStep(key)}
            title={comingSoon ? L.wizComingSoon : skippable ? L.wizSkippable : undefined}
          >
            <span className="rwn-step__dot">
              {done ? "✓" : num}
            </span>
            <span className="rwn-step__label">{stepLabel(key)}</span>
            {skippable && !done && (
              <span className="rwn-step__tag">{L.wizSkippable}</span>
            )}
            {comingSoon && (
              <span className="rwn-step__tag rwn-step__tag--soon">{L.wizComingSoon}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
