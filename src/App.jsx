import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import "./styles/global.css";

import Navbar from "./components/Navbar";
import LandlordHomeLayout from "./components/LandlordHomeLayout";
import MobileBottomNav from "./components/MobileBottomNav";
import Footer from "./components/Footer";
import { applyDocumentLang, normalizeLang, persistLang, readPreferredLang } from "./utils/lang";
import { LangContext } from "./contexts/LangContext";
import { PUBLIC_SITE_BASE_URL } from "./utils/publicUrls";

// Pages load on demand so public visitors do not download the admin studio.
// If a chunk is missing (a new version was deployed while this tab was open),
// reload once to pick up the current build instead of showing a blank page.
const CHUNK_RELOAD_KEY = "vanisland_chunk_reload_at";
function lazyPage(load) {
  return lazy(() =>
    load().catch((err) => {
      try {
        const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
        if (Date.now() - last > 60000) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
          window.location.reload();
          return new Promise(() => {});
        }
      } catch { /* storage unavailable — fall through to the error */ }
      throw err;
    })
  );
}

const Services = lazyPage(() => import("./pages/Services"));
const Examples = lazyPage(() => import("./pages/Examples"));
const Resources = lazyPage(() => import("./pages/Resources"));
const Contact = lazyPage(() => import("./pages/Contact"));
const HomeSaleStudio = lazyPage(() => import("./pages/HomeSaleStudio"));
const StrategyAssessment = lazyPage(() => import("./pages/StrategyAssessment"));
const AIReviewCenter = lazyPage(() => import("./pages/AIReviewCenter"));
const DisputeReview = lazyPage(() => import("./pages/DisputeReview"));
const HomeSaleListingDetail = lazyPage(() => import("./pages/HomeSaleListingDetail"));
const HomeSaleAdmin = lazyPage(() => import("./pages/HomeSaleAdmin"));
const AdminLayout = lazyPage(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazyPage(() => import("./pages/admin/Dashboard"));
const NewListing = lazyPage(() => import("./pages/admin/NewListing"));
const ListingDetail = lazyPage(() => import("./pages/admin/ListingDetail"));
const Listings = lazyPage(() => import("./pages/admin/Listings"));
const Leads = lazyPage(() => import("./pages/admin/Leads"));
const StrategyAssessments = lazyPage(() => import("./pages/admin/StrategyAssessments"));
const DisputeReviews = lazyPage(() => import("./pages/admin/DisputeReviews"));
const HomeSaleListings = lazyPage(() => import("./pages/admin/HomeSaleListings"));
const HomeSaleListingDetailAdmin = lazyPage(() => import("./pages/admin/HomeSaleListingDetailAdmin"));
const HomeSaleListingForm = lazyPage(() => import("./pages/admin/HomeSaleListingForm"));
const HomeSaleMedia = lazyPage(() => import("./pages/admin/HomeSaleMedia"));
const HomeSaleMarketing = lazyPage(() => import("./pages/admin/HomeSaleMarketing"));
const HomeSaleShare = lazyPage(() => import("./pages/admin/HomeSaleShare"));
const HomeSaleVideo = lazyPage(() => import("./pages/admin/HomeSaleVideo"));
const HomeSaleOpenHouse = lazyPage(() => import("./pages/admin/HomeSaleOpenHouse"));
const HomeSalePhotoEnhance = lazyPage(() => import("./pages/admin/HomeSalePhotoEnhance"));
const HomeSaleVirtualStaging = lazyPage(() => import("./pages/admin/HomeSaleVirtualStaging"));
const HomeSaleCoverImage = lazyPage(() => import("./pages/admin/HomeSaleCoverImage"));
const HomeSaleBuyerInquiry = lazyPage(() => import("./pages/admin/HomeSaleBuyerInquiry"));
const HomeSaleReviewPublish = lazyPage(() => import("./pages/admin/HomeSaleReviewPublish"));
const HomeSaleBuyerInquiries = lazyPage(() => import("./pages/admin/HomeSaleBuyerInquiries"));
const ApplicationReview = lazyPage(() => import("./pages/admin/ApplicationReview"));
const AdminSettings = lazyPage(() => import("./pages/admin/AdminSettings"));
const PhotoTips = lazyPage(() => import("./pages/admin/PhotoTips"));
const Faq = lazyPage(() => import("./pages/admin/Faq"));
const SystemPerformance = lazyPage(() => import("./pages/admin/SystemPerformance"));
const OurStory = lazyPage(() => import("./pages/OurStory"));
const RentalApplicationLanding = lazyPage(() => import("./pages/RentalApplicationLanding"));
const RentalApplication = lazyPage(() => import("./pages/RentalApplication"));
const SupportDocuments = lazyPage(() => import("./pages/SupportDocuments"));
const PublicListing = lazyPage(() => import("./pages/PublicListing"));
const PublicVideoPage = lazyPage(() => import("./pages/PublicVideoPage"));
const TenantContact = lazyPage(() => import("./pages/TenantContact"));
const TenantServiceRequest = lazyPage(() => import("./pages/TenantServiceRequest"));
const WebsiteReport = lazyPage(() => import("./pages/WebsiteReport"));
const DailyMarketBriefReport = lazyPage(() => import("./pages/DailyMarketBriefReport"));
const RetirementLivingBriefReport = lazyPage(() => import("./pages/RetirementLivingBriefReport"));
const AITenantScreeningDemo = lazyPage(() => import("./pages/AITenantScreeningDemo"));
const AITenantScreeningDemoViewer = lazyPage(() =>
  import("./pages/AITenantScreeningDemo").then((m) => ({ default: m.AITenantScreeningDemoViewer }))
);

// On page change: start at the top, or at the #anchor when the link has one,
// and keep <link rel="canonical"> pointing at the page actually shown.
function RouteEffects() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `${PUBLIC_SITE_BASE_URL}${pathname}`);
  }, [pathname]);

  useEffect(() => {
    if (!hash) {
      // Back/forward (POP) keeps the browser's own remembered position.
      if (navigationType !== "POP") window.scrollTo(0, 0);
      return undefined;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer = 0;
    const seek = () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ block: "start" });
      else if (tries++ < 20) timer = window.setTimeout(seek, 100);
    };
    seek();
    return () => window.clearTimeout(timer);
  }, [pathname, hash, navigationType]);

  return null;
}

function AppInner({ lang, setLang }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <>
      <RouteEffects />
      {!isHome && <Navbar lang={lang} setLang={setLang} />}
      <Suspense fallback={<div style={{ minHeight: "60vh" }} aria-busy="true" />}>
      <Routes>
        <Route path="/" element={<LandlordHomeLayout lang={lang} setLang={setLang} />} />
        <Route path="/services" element={<Services lang={lang} />} />
        <Route path="/rentals" element={<Examples lang={lang} />} />
        {/* Old public rental homepage URL — keep working for existing links/QR codes */}
        <Route path="/examples" element={<Navigate to="/rentals" replace />} />
        <Route path="/our-story" element={<OurStory lang={lang} />} />
        <Route path="/resources" element={<Resources lang={lang} />} />
        <Route path="/contact" element={<Contact lang={lang} />} />
        <Route path="/home-sale-studio" element={<HomeSaleStudio lang={lang} />} />
        <Route path="/landlord-ai/strategy-assessment" element={<StrategyAssessment lang={lang} />} />
        <Route path="/strategy-assessment/report/:assessmentId" element={<StrategyAssessment lang={lang} />} />
        <Route path="/landlord-ai/review-center" element={<AIReviewCenter lang={lang} />} />
        <Route path="/landlord-ai/dispute-review" element={<DisputeReview lang={lang} />} />
        <Route path="/dispute-review/report/:reviewId" element={<DisputeReview lang={lang} />} />
        <Route path="/demo/ai-screening" element={<AITenantScreeningDemo lang={lang} />} />
        <Route path="/demo/ai-screening/:demoLang/:demoId" element={<AITenantScreeningDemoViewer lang={lang} />} />
        <Route path="/home-sale-studio/listings/:listingId" element={<HomeSaleListingDetail lang={lang} />} />
        <Route path="/home-sale-studio/listings/:listingId/video" element={<PublicVideoPage type="homeSale" />} />
        <Route path="/admin" element={<AdminLayout lang={lang} />}>
          <Route index element={<Dashboard lang={lang} />} />
          <Route path="rental" element={<Dashboard lang={lang} mode="rental" />} />
          <Route path="new" element={<NewListing lang={lang} />} />
          <Route path="listings" element={<Listings lang={lang} />} />
          <Route path="leads" element={<Leads />} />
          <Route path="strategy-reports" element={<Navigate to="/admin/strategy-assessments" replace />} />
          <Route path="strategy-assessments" element={<StrategyAssessments />} />
          <Route path="dispute-reviews" element={<DisputeReviews />} />
          <Route path="listing/:id" element={<ListingDetail lang={lang} />} />
          <Route path="home-sale" element={<HomeSaleAdmin />} />
          <Route path="home-sale/listings" element={<HomeSaleListings />} />
          <Route path="home-sale/listings/new" element={<HomeSaleListingForm mode="new" />} />
          <Route path="home-sale/listings/:listingId" element={<HomeSaleListingDetailAdmin />} />
          <Route path="home-sale/listings/:listingId/edit" element={<HomeSaleListingForm mode="edit" />} />
          <Route path="home-sale/buyer-inquiries" element={<HomeSaleBuyerInquiries />} />
          <Route path="home-sale/media/:listingId" element={<HomeSaleMedia />} />
          <Route path="home-sale/staging/:listingId" element={<HomeSaleVirtualStaging />} />
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
          <Route path="system-performance" element={<SystemPerformance />} />
          <Route path="photo-tips" element={<PhotoTips />} />
          <Route path="faq" element={<Faq />} />
        </Route>
        <Route path="/photo-tips" element={<PhotoTips />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/apply" element={<RentalApplicationLanding />} />
        <Route path="/apply/:listingId" element={<RentalApplication />} />
        <Route path="/supporting-documents" element={<SupportDocuments />} />
        <Route path="/support-documents/:listingId/:recordId" element={<SupportDocuments />} />
        <Route path="/listings/:id" element={<PublicListing lang={lang} />} />
        <Route path="/listings/:id/video" element={<PublicVideoPage type="rental" />} />
        <Route path="/reports/daily-market-brief" element={<DailyMarketBriefReport lang={lang} />} />
        <Route path="/reports/retirement-living-brief" element={<RetirementLivingBriefReport lang={lang} />} />
        <Route path="/reports/:reportId" element={<WebsiteReport lang={lang} />} />
        <Route path="/tenant-contact" element={<TenantContact />} />
        <Route path="/tenant-service-request" element={<TenantServiceRequest lang={lang} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <Footer lang={lang} />
      <MobileBottomNav lang={lang} />
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
    <LangContext.Provider value={lang}>
      <BrowserRouter>
        <AppInner lang={lang} setLang={(value) => setLang(normalizeLang(value, readPreferredLang()))} />
      </BrowserRouter>
    </LangContext.Provider>
  );
}
