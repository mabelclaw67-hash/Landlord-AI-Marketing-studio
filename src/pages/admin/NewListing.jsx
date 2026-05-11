import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../../translations";
import { saveListing, generateListingId } from "../../utils/storage";
import { generateOutputs } from "../../utils/generateContent";
import PrototypeBanner from "../../components/PrototypeBanner";

const PLATFORMS = ["Facebook", "Craigslist", "WeChat", "Short Video", "Owner Summary"];
const LANGUAGES = ["Bilingual", "English", "Chinese"];
const LEASE_TERMS = ["Month-to-Month", "6 Months", "12 Months", "Other"];
const UTILITIES_OPTS = ["None included", "Electricity", "Water", "Gas", "Internet", "All included"];
const PET_OPTS = ["No pets", "Cats allowed", "Small dogs allowed", "Pets negotiable"];
const PARKING_OPTS = ["No parking", "1 stall included", "2 stalls included", "Street parking"];
const LAUNDRY_OPTS = ["In-suite", "Shared laundry", "Laundry hookups", "No laundry"];
const SMOKING_OPTS = ["No smoking anywhere", "Outside only", "Not specified"];

const INIT = {
  ownerName: "", ownerEmail: "", address: "", city: "", bedrooms: "2", bathrooms: "1",
  rent: "", available: "", leaseTerm: "12 Months", utilities: "None included",
  pets: "No pets", parking: "1 stall included", laundry: "In-suite", smoking: "No smoking anywhere",
  features: "", targetAudience: "",
  language: "Bilingual", platforms: ["Facebook", "Craigslist", "WeChat", "Owner Summary"],
};

// Defined outside NewListing so its identity is stable across renders.
// Defining a component inside another component causes React to remount its
// children on every render (new function reference = new component type),
// which triggers browser autocomplete on remounted inputs and corrupts field values.
function FormGroup({ label, chHint, children }) {
  return (
    <div className="form-group">
      <label>
        {label}
        {chHint && <span className="ch-hint">{chHint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function NewListing({ lang }) {
  const [form, setForm] = useState(INIT);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const togglePlatform = (p) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Capture each field explicitly — prevents accidental spread pollution.
    const snapshot = {
      ownerName:      form.ownerName,
      ownerEmail:     form.ownerEmail,
      address:        form.address,
      city:           form.city,
      bedrooms:       form.bedrooms,
      bathrooms:      form.bathrooms,
      rent:           form.rent,
      available:      form.available,
      leaseTerm:      form.leaseTerm,
      utilities:      form.utilities,
      pets:           form.pets,
      parking:        form.parking,
      laundry:        form.laundry,
      smoking:        form.smoking,
      features:       form.features,
      targetAudience: form.targetAudience,
      language:       form.language,
      platforms:      [...form.platforms],
    };

    try {
      const id      = await generateListingId();
      const outputs = generateOutputs(snapshot);
      const listing = {
        id,
        ownerName:      snapshot.ownerName,
        ownerEmail:     snapshot.ownerEmail,
        address:        snapshot.address,
        city:           snapshot.city,
        bedrooms:       snapshot.bedrooms,
        bathrooms:      snapshot.bathrooms,
        rent:           snapshot.rent,
        available:      snapshot.available,
        leaseTerm:      snapshot.leaseTerm,
        utilities:      snapshot.utilities,
        pets:           snapshot.pets,
        parking:        snapshot.parking,
        laundry:        snapshot.laundry,
        smoking:        snapshot.smoking,
        features:       snapshot.features,
        targetAudience: snapshot.targetAudience,
        language:       snapshot.language,
        platforms:      snapshot.platforms,
        outputs,
        status:         "Draft",
        createdDate:    new Date().toLocaleDateString("en-CA"),
        reviewStatus:   Object.fromEntries(Object.keys(outputs).map((k) => [k, "Draft"])),
        complianceFlag: Object.fromEntries(Object.keys(outputs).map((k) => [k, "Review Needed"])),
        mediaChecklist: [false, false, false, false],
        driveFiles:     [],
      };
      await saveListing(listing);
      navigate(`/admin/listing/${id}`);
    } catch (err) {
      alert("Error saving listing: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PrototypeBanner lang={lang} />

      <div className="mb-24">
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{t(lang, "newListing.title")}</h1>
        <p className="text-muted text-sm">{t(lang, "newListing.chTitle")} — Fill in the property details to generate your marketing package.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Owner Info */}
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            👤 Owner Information / 房东信息
          </h3>
          <div className="form-row">
            <FormGroup label={t(lang, "newListing.ownerName")} chHint="房东姓名">
              <input className="form-control" required value={form.ownerName} onChange={set("ownerName")} placeholder="Full name" />
            </FormGroup>
            <FormGroup label={t(lang, "newListing.ownerEmail")} chHint="房东邮箱">
              <input className="form-control" type="email" value={form.ownerEmail} onChange={set("ownerEmail")} placeholder="owner@email.com" />
            </FormGroup>
          </div>
        </div>

        {/* Property Details */}
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            🏠 Property Details / 房源信息
          </h3>
          <div className="form-row">
            <FormGroup label={t(lang, "newListing.address")} chHint="地址">
              <input className="form-control" required value={form.address} onChange={set("address")} placeholder="123 Main St" />
            </FormGroup>
            <FormGroup label={t(lang, "newListing.city")} chHint="城市">
              <input className="form-control" required value={form.city} onChange={set("city")} placeholder="Nanaimo" />
            </FormGroup>
          </div>
          <div className="form-row">
            <FormGroup label={t(lang, "newListing.bedrooms")} chHint="卧室">
              <select className="form-control" value={form.bedrooms} onChange={set("bedrooms")}>
                {["Studio", "1", "2", "3", "4", "5+"].map((n) => <option key={n}>{n}</option>)}
              </select>
            </FormGroup>
            <FormGroup label={t(lang, "newListing.bathrooms")} chHint="卫生间">
              <select className="form-control" value={form.bathrooms} onChange={set("bathrooms")}>
                {["1", "1.5", "2", "2.5", "3+"].map((n) => <option key={n}>{n}</option>)}
              </select>
            </FormGroup>
          </div>
          <div className="form-row">
            <FormGroup label={t(lang, "newListing.rent")} chHint="月租金">
              <input className="form-control" required type="number" min="500" value={form.rent} onChange={set("rent")} placeholder="2000" />
            </FormGroup>
            <FormGroup label={t(lang, "newListing.available")} chHint="可入住日期">
              <input className="form-control" required type="date" value={form.available} onChange={set("available")} />
            </FormGroup>
          </div>
          <FormGroup label={t(lang, "newListing.leaseTerm")} chHint="租约期">
            <select className="form-control" value={form.leaseTerm} onChange={set("leaseTerm")}>
              {LEASE_TERMS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormGroup>
        </div>

        {/* Policies */}
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            📋 Policies & Amenities / 政策与设施
          </h3>
          <div className="form-row">
            <FormGroup label={t(lang, "newListing.utilities")} chHint="水电">
              <select className="form-control" value={form.utilities} onChange={set("utilities")}>
                {UTILITIES_OPTS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FormGroup>
            <FormGroup label={t(lang, "newListing.pets")} chHint="宠物">
              <select className="form-control" value={form.pets} onChange={set("pets")}>
                {PET_OPTS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FormGroup>
          </div>
          <div className="form-row">
            <FormGroup label={t(lang, "newListing.parking")} chHint="停车">
              <select className="form-control" value={form.parking} onChange={set("parking")}>
                {PARKING_OPTS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FormGroup>
            <FormGroup label={t(lang, "newListing.laundry")} chHint="洗衣">
              <select className="form-control" value={form.laundry} onChange={set("laundry")}>
                {LAUNDRY_OPTS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FormGroup>
          </div>
          <FormGroup label={t(lang, "newListing.smoking")} chHint="吸烟">
            <select className="form-control" value={form.smoking} onChange={set("smoking")}>
              {SMOKING_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormGroup>
        </div>

        {/* Marketing */}
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem", color: "var(--color-primary)" }}>
            ✨ Marketing Details / 广告信息
          </h3>
          <FormGroup label={t(lang, "newListing.features")} chHint="主要特色（用逗号分隔）">
            <textarea
              className="form-control"
              value={form.features}
              onChange={set("features")}
              placeholder="Mountain views, hardwood floors, updated kitchen, quiet street"
              rows={3}
            />
          </FormGroup>
          <FormGroup label={t(lang, "newListing.targetAudience")} chHint="目标租客">
            <input
              className="form-control"
              value={form.targetAudience}
              onChange={set("targetAudience")}
              placeholder="e.g. Long-term tenants welcome"
            />
          </FormGroup>
          <FormGroup label={t(lang, "newListing.language")} chHint="默认语言">
            <select className="form-control" value={form.language} onChange={set("language")}>
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </FormGroup>

          <div className="form-group">
            <label>
              {t(lang, "newListing.platforms")}
              <span className="ch-hint">目标平台</span>
            </label>
            <div className="checkbox-group">
              {PLATFORMS.map((p) => (
                <label
                  key={p}
                  className={`checkbox-label${form.platforms.includes(p) ? " checked" : ""}`}
                  onClick={() => togglePlatform(p)}
                >
                  <input type="checkbox" readOnly checked={form.platforms.includes(p)} />
                  {p}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 8 }}>
              English Ad and Chinese Summary are always generated / 英文广告和中文摘要始终生成
            </p>
          </div>
        </div>

        <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ fontSize: "1rem", padding: "14px" }}>
          {loading ? t(lang, "newListing.generating") : t(lang, "newListing.submit")}
        </button>
      </form>
    </div>
  );
}
