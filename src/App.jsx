import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./styles/global.css";

import Navbar from "./components/Navbar";
import LandlordHomeLayout from "./components/LandlordHomeLayout";
import Services from "./pages/Services";
import Examples from "./pages/Examples";
import Resources from "./pages/Resources";
import Contact from "./pages/Contact";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import NewListing from "./pages/admin/NewListing";
import ListingDetail from "./pages/admin/ListingDetail";
import Listings from "./pages/admin/Listings";
import PublicListing from "./pages/PublicListing";
import TenantContact from "./pages/TenantContact";

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
        <Route path="/admin" element={<AdminLayout lang={lang} />}>
          <Route index element={<Dashboard lang={lang} />} />
          <Route path="new" element={<NewListing lang={lang} />} />
          <Route path="listings" element={<Listings lang={lang} />} />
          <Route path="listing/:id" element={<ListingDetail lang={lang} />} />
        </Route>
        <Route path="/listings/:id" element={<PublicListing />} />
        <Route path="/tenant-contact" element={<TenantContact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState("en");

  return (
    <BrowserRouter>
      <AppInner lang={lang} setLang={setLang} />
    </BrowserRouter>
  );
}
