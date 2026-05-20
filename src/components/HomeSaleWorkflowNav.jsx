import { NavLink } from "react-router-dom";

export default function HomeSaleWorkflowNav({ listingId = "" }) {
  const links = [
    { to: "/admin/home-sale", label: "Dashboard / 总览" },
    { to: "/admin/home-sale/listings", label: "Sale Listings / 出售房源" },
  ];

  if (listingId) {
    links.push(
      { to: `/admin/home-sale/listings/${listingId}`,         label: "Listing Info / 房源信息" },
      { to: `/admin/home-sale/media/${listingId}`,            label: "Original Photos / 原始照片" },
      { to: `/admin/home-sale/staging/${listingId}`,          label: "Virtual Staging / 虚拟布置" },
      { to: `/admin/home-sale/enhance/${listingId}`,          label: "Photo Enhancement / 照片美化" },
      { to: `/admin/home-sale/cover/${listingId}`,            label: "Cover Image / 封面图" },
      { to: `/admin/home-sale/marketing/${listingId}`,        label: "Marketing Copy / 营销文案" },
      { to: `/admin/home-sale/video/${listingId}`,            label: "Video Script · Music · Voiceover · AI Video" },
      { to: `/admin/home-sale/share/${listingId}`,            label: "Share Kit / QR / 分享素材" },
      { to: `/admin/home-sale/open-house/${listingId}`,       label: "Open House / 开放日" },
      { to: `/admin/home-sale/buyer-inquiry/${listingId}`,    label: "Showing Availability / 看房时间管理" },
      { to: `/admin/home-sale/review/${listingId}`,           label: "Review & Publish / 审核发布" },
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
