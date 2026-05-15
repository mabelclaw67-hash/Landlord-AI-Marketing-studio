import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./styles/global.css";

import Navbar from "./components/Navbar";
import LandlordHomeLayout from "./components/LandlordHomeLayout";
import Services from "./pages/Services";
import Examples from "./pages/Examples";
import Resources from "./pages/Resources";
import Contact from "./pages/Contact";
import TrialAccess from "./pages/TrialAccess";
import HomeSaleStudio from "./pages/HomeSaleStudio";
import HomeSaleListingDetail from "./pages/HomeSaleListingDetail";
import HomeSaleAdmin from "./pages/HomeSaleAdmin";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import NewListing from "./pages/admin/NewListing";
import ListingDetail from "./pages/admin/ListingDetail";
import Listings from "./pages/admin/Listings";
import Leads from "./pages/admin/Leads";
import TrialRequests from "./pages/admin/TrialRequests";
import HomeSaleListings from "./pages/admin/HomeSaleListings";
import HomeSaleListingDetailAdmin from "./pages/admin/HomeSaleListingDetailAdmin";
import HomeSaleListingForm from "./pages/admin/HomeSaleListingForm";
import HomeSaleMedia from "./pages/admin/HomeSaleMedia";
import HomeSaleMarketing from "./pages/admin/HomeSaleMarketing";
import HomeSaleShare from "./pages/admin/HomeSaleShare";
import HomeSaleVideo from "./pages/admin/HomeSaleVideo";
import HomeSaleOpenHouse from "./pages/admin/HomeSaleOpenHouse";
import HomeSalePhotoEnhance from "./pages/admin/HomeSalePhotoEnhance";
import HomeSaleCoverImage from "./pages/admin/HomeSaleCoverImage";
import HomeSaleBuyerInquiry from "./pages/admin/HomeSaleBuyerInquiry";
import HomeSaleReviewPublish from "./pages/admin/HomeSaleReviewPublish";
import HomeSaleBuyerInquiries from "./pages/admin/HomeSaleBuyerInquiries";
import ApplicationReview from "./pages/admin/ApplicationReview";
import AdminSettings from "./pages/admin/AdminSettings";
import RentalApplication from "./pages/RentalApplication";
import PublicListing from "./pages/PublicListing";
import TenantContact from "./pages/TenantContact";
import { applyDocumentLang, normalizeLang, persistLang, readPreferredLang } from "./utils/lang";

function AppInner({ lang, setLang }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <>
      {!isHome && <Navbar lang={lang} setLang={setLang} />}
      <Routes>
        <Route path="/" element={<LandlordHomeLayout lang={lang} setLang={setLang} />} />
        <Route path="/services" element={<Services lang={lang} />} />
        <Route path="/examples" element={<Examples lang={lang} />} />
        <Route path="/resources" element={<Resources lang={lang} />} />
        <Route path="/contact" element={<Contact lang={lang} />} />
        <Route path="/trial-access" element={<TrialAccess lang={lang} />} />
        <Route path="/home-sale-studio" element={<HomeSaleStudio lang={lang} />} />
        <Route path="/home-sale-studio/listings/:listingId" element={<HomeSaleListingDetail lang={lang} />} />
        <Route path="/admin" element={<AdminLayout lang={lang} />}>
          <Route index element={<Dashboard lang={lang} />} />
          <Route path="rental" element={<Dashboard lang={lang} mode="rental" />} />
          <Route path="new" element={<NewListing lang={lang} />} />
          <Route path="listings" element={<Listings lang={lang} />} />
          <Route path="leads" element={<Leads />} />
          <Route path="trial-requests" element={<TrialRequests />} />
          <Route path="listing/:id" element={<ListingDetail lang={lang} />} />
          <Route path="home-sale" element={<HomeSaleAdmin />} />
          <Route path="home-sale/listings" element={<HomeSaleListings />} />
          <Route path="home-sale/listings/new" element={<HomeSaleListingForm mode="new" />} />
          <Route path="home-sale/listings/:listingId" element={<HomeSaleListingDetailAdmin />} />
          <Route path="home-sale/listings/:listingId/edit" element={<HomeSaleListingForm mode="edit" />} />
          <Route path="home-sale/buyer-inquiries" element={<HomeSaleBuyerInquiries />} />
          <Route path="home-sale/media/:listingId" element={<HomeSaleMedia />} />
          <Route path="home-sale/enhance/:listingId" element={<HomeSalePhotoEnhance />} />
          <Route path="home-sale/cover/:listingId" element={<HomeSaleCoverImage />} />
          <Route path="home-sale/marketing/:listingId" element={<HomeSaleMarketing />} />
          <Route path="home-sale/video/:listingId" element={<HomeSaleVideo />} />
          <Route path="home-sale/share/:listingId" element={<HomeSaleShare />} />
          <Route path="home-sale/open-house/:listingId" element={<HomeSaleOpenHouse />} />
          <Route path="home-sale/buyer-inquiry/:listingId" element={<HomeSaleBuyerInquiry />} />
          <Route path="home-sale/review/:listingId" element={<HomeSaleReviewPublish />} />
          <Route path="application/:applicationId" element={<ApplicationReview />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="/apply/:listingId" element={<RentalApplication />} />
        <Route path="/listings/:id" element={<PublicListing lang={lang} />} />
        <Route path="/tenant-contact" element={<TenantContact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState(readPreferredLang);

  useEffect(() => {
    applyDocumentLang(lang);
    persistLang(lang);
  }, [lang]);

  return (
    <BrowserRouter>
      <AppInner lang={lang} setLang={(value) => setLang(normalizeLang(value, readPreferredLang()))} />
    </BrowserRouter>
  );
}
