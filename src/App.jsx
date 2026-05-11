import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/global.css";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
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

export default function App() {
  const [lang, setLang] = useState("en");

  return (
    <BrowserRouter>
      <Navbar lang={lang} setLang={setLang} />
      <Routes>
        <Route path="/" element={<Home lang={lang} />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
