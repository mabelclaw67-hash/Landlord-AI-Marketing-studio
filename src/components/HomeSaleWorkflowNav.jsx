import { NavLink } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { AL } from "../utils/adminLabels";

export default function HomeSaleWorkflowNav({ listingId = "" }) {
  const lang = useLang();
  const L = AL[lang] ?? AL.en;

  const links = [
    { to: "/admin/home-sale", label: L.homeSaleDashboard },
    { to: "/admin/home-sale/listings", label: L.saleListings },
  ];

  if (listingId) {
    links.push(
      { to: `/admin/home-sale/listings/${listingId}`,         label: L.listingInfo },
      { to: `/admin/home-sale/media/${listingId}`,            label: L.originalPhotos },
      { to: `/admin/home-sale/staging/${listingId}`,          label: L.virtualStaging },
      { to: `/admin/home-sale/enhance/${listingId}`,          label: L.photoEnhancement },
      { to: `/admin/home-sale/cover/${listingId}`,            label: L.coverImage },
      { to: `/admin/home-sale/marketing/${listingId}`,        label: L.marketingCopy },
      { to: `/admin/home-sale/video/${listingId}`,            label: L.videoScriptNav },
      { to: `/admin/home-sale/share/${listingId}`,            label: L.shareKit },
      { to: `/admin/home-sale/open-house/${listingId}`,       label: L.openHouse },
      { to: `/admin/home-sale/buyer-inquiry/${listingId}`,    label: L.showingAvailability },
      { to: `/admin/home-sale/review/${listingId}`,           label: L.reviewPublish },
    );
  }

  return (
    <div className="tabs home-sale-subnav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/admin/home-sale" || link.to === `/admin/home-sale/listings/${listingId}`}
          className={({ isActive }) => `home-sale-subnav__link${isActive ? " active" : ""}`}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
