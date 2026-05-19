import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getListing, getPublicListings, saveRentalApplication } from "../utils/storage";
import { downloadSubmittedAppPdf } from "../utils/rentalApplicationPdf";

const LEASE_TERM_OPTIONS = [
  "Month-to-Month / 月租",
  "6 Months / 半年",
  "1 Year / 一年",
  "2 Years / 两年",
  "Flexible / 灵活",
];

const EMPLOYMENT_OPTIONS = [
  "Employed Full-Time / 全职",
  "Employed Part-Time / 兼职",
  "Self-Employed / 自雇",
  "Student / 学生",
  "Retired / 退休",
  "Other / 其他",
];

const CREDIT_OPTIONS = [
  "Excellent / 优秀",
  "Good / 良好",
  "Fair / 一般",
  "Poor / 较差",
  "No Credit History / 无信用记录",
];

const YES_NO_OPTIONS = ["Yes / 是", "No / 否"];
const JOINT_APPLICANT_OPTIONS = ["No / 否", "Yes / 是"];
const PET_OPTIONS = ["No / 无宠物", "Yes / 有宠物"];
const DEPOSIT_OPTIONS = ["Yes / 是", "No / 否", "Partially / 部分准备好"];
const PROOF_INCOME_OPTIONS = ["Yes / 是", "No / 否", "Will obtain / 将获取"];
const INSURANCE_STATUS_OPTIONS = [
  "Yes, currently insured / 是，目前已投保",
  "No, but will obtain before move-in / 否，但将在入住前购买",
  "No / 否",
];
const PROOF_INSURANCE_OPTIONS = ["Yes / 是", "No / 否", "In progress / 办理中"];

const EMPTY_JOINT_APPLICANT = {
  jointName: "",
  jointPhone: "",
  jointEmail: "",
  jointDob: "",
  jointAddress: "",
  jointEmploymentStatus: "",
  jointEmployerIncomeSource: "",
  jointIncome: "",
  jointEmployerContact: "",
  jointLandlordReference: "",
  jointCreditInfo: "",
  jointProofOfIncome: "",
};

const EMPTY_PET_FIELDS = {
  petDepositFunds: "",
  petDetails: "",
};

const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const sTitle = {
  fontWeight: 700,
  fontSize: "0.95rem",
  color: "var(--color-primary)",
  marginBottom: 16,
};
const NOTICE = {
  background: "#fdf6e3",
  border: "1px solid #e8d5a3",
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: "0.82rem",
  color: "#7a5a2f",
  lineHeight: 1.65,
  marginBottom: 12,
};

const INITIAL_FORM = {
  applicantName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  wechat: "",
  currentResidenceAddress: "",
  currentResidenceSince: "",
  currentResidenceLandlordName: "",
  currentResidenceLandlordContact: "",
  currentResidenceMonthlyRent: "",
  currentResidenceReasonForLeaving: "",
  previousResidenceAddress: "",
  previousResidenceDates: "",
  previousResidenceLandlordName: "",
  previousResidenceLandlordContact: "",
  previousResidenceMonthlyRent: "",
  employmentStatus: "",
  employer: "",
  employmentLength: "",
  employerContact: "",
  otherIncome: "",
  monthlyIncome: "",
  moveInDate: "",
  leaseTerm: "",
  totalOccupants: "",
  adults: "",
  minors: "",
  occupantNamesAges: "",
  hasJointApplicant: "No / 否",
  ...EMPTY_JOINT_APPLICANT,
  hasPets: "No / 无宠物",
  ...EMPTY_PET_FIELDS,
  vehicleCount: "",
  vehicleDetails: "",
  smokesVapesCannabis: "",
  noSmokingAgreement: false,
  referenceOneName: "",
  referenceOneRelationship: "",
  referenceOneContact: "",
  referenceTwoName: "",
  referenceTwoRelationship: "",
  referenceTwoContact: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyEmail: "",
  creditHistory: "",
  evictionHistory: "",
  backgroundNotes: "",
  proofOfIncome: "",
  supportingDocsNotes: "",
  hasTenantInsurance: "",
  tenantInsuranceAgreement: false,
  proofInsuranceBeforeMoveIn: "",
  depositFundsAvailable: "",
  depositAgreement: false,
  additionalNotes: "",
  agreed: false,
};

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginTop: 4 }}>
      {options.map((opt) => (
        <label
          key={opt}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontSize: "0.88rem",
          }}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function clean(value) {
  return String(value || "").trim();
}

function formatSection(title, lines) {
  const normalized = lines.map(clean).filter(Boolean);
  if (!normalized.length) return "";
  return `${title}\n${normalized.join("\n")}`;
}

function joinSections(sections) {
  return sections.filter(Boolean).join("\n\n");
}

function formatReference(label, name, relationship, contact) {
  const parts = [];
  if (clean(name)) parts.push(clean(name));
  if (clean(relationship)) parts.push(`Relationship: ${clean(relationship)}`);
  if (clean(contact)) parts.push(`Contact: ${clean(contact)}`);
  return parts.length ? `${label}: ${parts.join(" | ")}` : "";
}

function serializeJointEmployment(status, source) {
  const cleanStatus = clean(status);
  const cleanSource = clean(source);
  if (!cleanStatus && !cleanSource) return "";
  if (cleanStatus && cleanSource) {
    return `Status: ${cleanStatus}\nEmployer / Income Source: ${cleanSource}`;
  }
  if (cleanStatus) return cleanStatus;
  return `Employer / Income Source: ${cleanSource}`;
}

export default function RentalApplication() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      try {
        const result = await Promise.race([
          getListing(listingId),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("listing_lookup_timeout")), 3000)
          ),
        ]);
        if (!cancelled) setListing(result);
      } catch {
        try {
          const all = await getPublicListings();
          const fallback = all.find((item) => item.id === listingId) || null;
          if (!cancelled) setListing(fallback);
        } catch {
          if (!cancelled) setListing(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadListing();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleJointApplicantChange(value) {
    setForm((prev) =>
      value === "Yes / 是"
        ? { ...prev, hasJointApplicant: value }
        : { ...prev, hasJointApplicant: value, ...EMPTY_JOINT_APPLICANT }
    );
  }

  function handlePetsChange(value) {
    setForm((prev) =>
      value === "Yes / 有宠物"
        ? { ...prev, hasPets: value }
        : { ...prev, hasPets: value, ...EMPTY_PET_FIELDS }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!clean(form.applicantName)) {
      setError("Applicant name is required.");
      return;
    }
    if (!clean(form.email)) {
      setError("Email is required.");
      return;
    }
    if (!form.moveInDate) {
      setError("Preferred move-in date is required.");
      return;
    }
    if (!form.agreed) {
      setError("Please confirm the declaration at the bottom.");
      return;
    }

    const landlordReference = joinSections([
      formatSection("Current Residence", [
        clean(form.currentResidenceLandlordName) &&
          `Landlord / Manager: ${clean(form.currentResidenceLandlordName)}`,
        clean(form.currentResidenceLandlordContact) &&
          `Landlord Contact: ${clean(form.currentResidenceLandlordContact)}`,
        clean(form.currentResidenceMonthlyRent) &&
          `Current Monthly Rent: ${clean(form.currentResidenceMonthlyRent)}`,
        clean(form.currentResidenceSince) &&
          `Residence Period: ${clean(form.currentResidenceSince)}`,
      ]),
      formatSection("Previous Residence", [
        clean(form.previousResidenceAddress) &&
          `Address: ${clean(form.previousResidenceAddress)}`,
        clean(form.previousResidenceDates) &&
          `Residence Period: ${clean(form.previousResidenceDates)}`,
        clean(form.previousResidenceMonthlyRent) &&
          `Monthly Rent: ${clean(form.previousResidenceMonthlyRent)}`,
        clean(form.previousResidenceLandlordName) &&
          `Landlord / Manager: ${clean(form.previousResidenceLandlordName)}`,
        clean(form.previousResidenceLandlordContact) &&
          `Landlord Contact: ${clean(form.previousResidenceLandlordContact)}`,
      ]),
      formatSection("References", [
        formatReference(
          "Reference 1",
          form.referenceOneName,
          form.referenceOneRelationship,
          form.referenceOneContact
        ),
        formatReference(
          "Reference 2",
          form.referenceTwoName,
          form.referenceTwoRelationship,
          form.referenceTwoContact
        ),
      ]),
    ]);

    const employerSummary = joinSections([
      formatSection("Employment & Income", [
        clean(form.employer) &&
          `Employer / Income Source: ${clean(form.employer)}`,
        clean(form.employmentLength) &&
          `Length of Employment: ${clean(form.employmentLength)}`,
        clean(form.employerContact) &&
          `Employer Contact: ${clean(form.employerContact)}`,
        clean(form.otherIncome) &&
          `Other Income: ${clean(form.otherIncome)}`,
      ]),
    ]);

    const backgroundSummary = formatSection("Background / Credit", [
      clean(form.evictionHistory) &&
        `Evictions / tenancy breaches: ${clean(form.evictionHistory)}`,
      clean(form.backgroundNotes) &&
        `Additional background or credit notes: ${clean(form.backgroundNotes)}`,
    ]);

    const emergencySummary = formatSection("Emergency Contact", [
      clean(form.emergencyName) && `Name: ${clean(form.emergencyName)}`,
      clean(form.emergencyRelationship) &&
        `Relationship: ${clean(form.emergencyRelationship)}`,
      clean(form.emergencyPhone) && `Phone: ${clean(form.emergencyPhone)}`,
      clean(form.emergencyEmail) && `Email: ${clean(form.emergencyEmail)}`,
    ]);

    const supportingSummary = formatSection("Supporting Documents", [
      clean(form.supportingDocsNotes) &&
        `Available documents / notes: ${clean(form.supportingDocsNotes)}`,
    ]);

    const vehicleSummary = [
      clean(form.vehicleCount) && `Vehicles: ${clean(form.vehicleCount)}`,
      clean(form.vehicleDetails) &&
        `Vehicle details: ${clean(form.vehicleDetails)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const additionalNotes = joinSections([
      emergencySummary,
      supportingSummary,
      clean(form.additionalNotes) &&
        formatSection("Other Notes", [clean(form.additionalNotes)]),
    ]);

    setSubmitting(true);
    try {
      const result = await saveRentalApplication({
        listingId,
        applicantName: clean(form.applicantName),
        email: clean(form.email),
        phone: clean(form.phone),
        dateOfBirth: form.dateOfBirth,
        currentAddress: clean(form.currentResidenceAddress),
        wechat: clean(form.wechat),
        employmentStatus: form.employmentStatus,
        employer: employerSummary || clean(form.employer),
        monthlyIncome: clean(form.monthlyIncome),
        landlordReference,
        creditHistory: form.creditHistory,
        moveInDate: form.moveInDate,
        leaseTerm: form.leaseTerm,
        occupants: form.totalOccupants,
        adults: form.adults,
        minors: form.minors,
        occupantNamesAges: clean(form.occupantNamesAges),
        hasJointApplicant: form.hasJointApplicant,
        jointName: clean(form.jointName),
        jointProofOfIncome: form.jointProofOfIncome,
        jointPhone: clean(form.jointPhone),
        jointEmail: clean(form.jointEmail),
        jointDob: form.jointDob,
        jointAddress: clean(form.jointAddress),
        jointEmployment: serializeJointEmployment(
          form.jointEmploymentStatus,
          form.jointEmployerIncomeSource
        ),
        jointIncome: clean(form.jointIncome),
        jointEmployerContact: clean(form.jointEmployerContact),
        jointLandlordReference: clean(form.jointLandlordReference),
        jointCreditInfo: form.jointCreditInfo,
        depositFundsAvailable: form.depositFundsAvailable,
        depositAgreement: form.depositAgreement ? "Agreed" : "Not confirmed",
        hasPets: form.hasPets,
        petDepositFunds: form.petDepositFunds,
        petDetails: clean(form.petDetails),
        evictionHistory: backgroundSummary,
        smokesVapesCannabis: form.smokesVapesCannabis,
        noSmokingAgreement: form.noSmokingAgreement ? "Agreed" : "Not confirmed",
        proofOfIncome: form.proofOfIncome,
        hasTenantInsurance: form.hasTenantInsurance,
        tenantInsuranceAgreement: form.tenantInsuranceAgreement
          ? "Agreed"
          : "Not confirmed",
        proofInsuranceBeforeMoveIn: form.proofInsuranceBeforeMoveIn,
        reasonForMoving: clean(form.currentResidenceReasonForLeaving),
        parkingRequest: vehicleSummary,
        additionalNotes,
      });
      setSubmitted(result);
    } catch (err) {
      setError(
        err.message || "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--color-text-muted)",
        }}
      >
        Loading…
      </div>
    );
  }

  if (submitted) {
    // Build the normalized data object for client-side PDF generation.
    // Uses the form state (still in memory) as source of truth.
    function handleDownloadPdf() {
      if (pdfBusy) return;
      // If backend returned a real Drive URL, open it directly.
      if (submitted.pdfUrl) {
        window.open(submitted.pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }
      // Otherwise generate client-side from the submitted form data.
      setPdfBusy(true);
      try {
        const data = {
          listingId:             listingId,
          listingAddress:        listing?.address || "",
          listingRent:           listing?.rent ? `$${Number(listing.rent).toLocaleString()}/mo` : "",
          applicantName:         form.applicantName,
          email:                 form.email,
          phone:                 form.phone,
          dateOfBirth:           form.dateOfBirth,
          currentAddress:        form.currentResidenceAddress,
          wechat:                form.wechat,
          employmentStatus:      form.employmentStatus,
          employer:              form.employer,
          monthlyIncome:         form.monthlyIncome,
          moveInDate:            form.moveInDate,
          leaseTerm:             form.leaseTerm,
          occupants:             form.totalOccupants,
          adults:                form.adults,
          minors:                form.minors,
          occupantNamesAges:     form.occupantNamesAges,
          landlordReference:     [
            form.currentResidenceLandlordName && `Current landlord: ${form.currentResidenceLandlordName}`,
            form.currentResidenceLandlordContact && `Contact: ${form.currentResidenceLandlordContact}`,
            form.previousResidenceLandlordName && `Previous landlord: ${form.previousResidenceLandlordName}`,
            form.referenceOneName && `Ref 1: ${form.referenceOneName}`,
            form.referenceTwoName && `Ref 2: ${form.referenceTwoName}`,
          ].filter(Boolean).join(" | "),
          creditHistory:         form.creditHistory,
          hasPets:               form.hasPets,
          petDetails:            form.petDetails,
          parkingRequest:        [
            form.vehicleCount && `Vehicles: ${form.vehicleCount}`,
            form.vehicleDetails,
          ].filter(Boolean).join(" "),
          hasTenantInsurance:    form.hasTenantInsurance,
          depositFundsAvailable: form.depositFundsAvailable,
          reasonForMoving:       form.currentResidenceReasonForLeaving,
          additionalNotes:       form.additionalNotes,
          recordId:              submitted.recordId,
          submittedAt:           submitted.submittedAt,
        };
        downloadSubmittedAppPdf(data, submitted.recordId, submitted.recordId || listingId);
      } finally {
        window.setTimeout(() => setPdfBusy(false), 800);
      }
    }

    return (
      <div style={{ maxWidth: 600, margin: "60px auto", padding: "0 20px" }}>
        <div className="card" style={{ textAlign: "center", padding: "40px 32px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
          <h1 style={{ fontWeight: 800, fontSize: "1.4rem", marginBottom: 8 }}>
            Application Submitted
          </h1>
          <p
            style={{
              color: "var(--color-text-muted)",
              marginBottom: 20,
              lineHeight: 1.7,
            }}
          >
            Thank you! Your application has been received and will be reviewed shortly.
          </p>
          <div
            style={{
              background: "#f5f8f5",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 24,
              textAlign: "left",
            }}
          >
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--color-text-muted)",
                marginBottom: 4,
              }}
            >
              Reference Number
            </p>
            <p
              style={{
                fontWeight: 700,
                fontSize: "1.1rem",
                fontFamily: "monospace",
              }}
            >
              {submitted.recordId}
            </p>
          </div>

          {/* ── Submitted application PDF — private, shown only on this success screen ── */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            style={{
              display: "block",
              width: "100%",
              padding: "15px 20px",
              background: pdfBusy ? "#d7dce1" : "#3e5b4b",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              fontWeight: 700,
              fontSize: "1rem",
              cursor: pdfBusy ? "wait" : "pointer",
              fontFamily: "var(--font)",
              marginBottom: 10,
            }}
          >
            {pdfBusy
              ? "Preparing…"
              : "📄 Download Submitted Application"}
          </button>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            {submitted.pdfUrl
              ? "Downloads your completed application from our system."
              : "Saves a copy of your completed application to this device."}
          </p>

          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--color-text-muted)",
            }}
          >
            Please keep your reference number for follow-up inquiries.
          </p>
        </div>
      </div>
    );
  }

  const title = listing
    ? [
        listing.bedrooms && `${listing.bedrooms} Bed`,
        listing.bathrooms && `${listing.bathrooms} Bath`,
        listing.address,
      ]
        .filter(Boolean)
        .join(" / ")
    : listingId;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: 6 }}>
          Residential Tenancy Application
        </h1>
        {listing && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.92rem" }}>
            {title}
            {listing.city ? `, ${listing.city}` : ""}
            {listing.rent ? ` · $${Number(listing.rent).toLocaleString()}/mo` : ""}
          </p>
        )}
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--color-text-muted)",
            marginTop: 4,
          }}
        >
          Listing ID: <strong>{listingId}</strong>
        </p>
        <div style={NOTICE}>
          Please complete this application if you are interested in renting this
          property. All adult occupants may be required to provide supporting
          documents before move-in. Submitting this form does not guarantee approval.
        </div>
      </div>

      {error && (
        <div className="notice notice--error" style={{ marginBottom: 20 }}>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card mb-24">
          <h3 style={sTitle}>1. Property Applied For</h3>
          <div
            style={{
              background: "#edf3ee",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: "0.88rem",
              lineHeight: 2,
            }}
          >
            <div>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                }}
              >
                Listing ID:
              </span>{" "}
              <code>{listingId}</code>
            </div>
            {listing?.address && (
              <div>
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Address:
                </span>{" "}
                {listing.address}
                {listing.city ? `, ${listing.city}` : ""}
              </div>
            )}
            {listing?.rent && (
              <div>
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Rent:
                </span>{" "}
                ${Number(listing.rent).toLocaleString()}/mo
              </div>
            )}
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>2. Applicant Information</h3>
          <div className="form-group">
            <label className="form-label">Full Legal Name *</label>
            <input
              className="form-control"
              value={form.applicantName}
              onChange={(e) => set("applicantName", e.target.value)}
              placeholder="Legal name as shown on ID"
              required
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                className="form-control"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (250) 000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@email.com"
                required
              />
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                className="form-control"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">WeChat ID</label>
              <input
                className="form-control"
                value={form.wechat}
                onChange={(e) => set("wechat", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>3. Current Residence</h3>
          <div className="form-group">
            <label className="form-label">Current Address</label>
            <input
              className="form-control"
              value={form.currentResidenceAddress}
              onChange={(e) => set("currentResidenceAddress", e.target.value)}
              placeholder="Street, City, Province, Postal Code"
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">How long have you lived there?</label>
              <input
                className="form-control"
                value={form.currentResidenceSince}
                onChange={(e) => set("currentResidenceSince", e.target.value)}
                placeholder="e.g. Mar 2024 - Present"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current Monthly Rent</label>
              <input
                className="form-control"
                value={form.currentResidenceMonthlyRent}
                onChange={(e) => set("currentResidenceMonthlyRent", e.target.value)}
                placeholder="e.g. $2,100"
              />
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Current Landlord / Property Manager</label>
              <input
                className="form-control"
                value={form.currentResidenceLandlordName}
                onChange={(e) => set("currentResidenceLandlordName", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Landlord Contact</label>
              <input
                className="form-control"
                value={form.currentResidenceLandlordContact}
                onChange={(e) => set("currentResidenceLandlordContact", e.target.value)}
                placeholder="Phone or email"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Leaving</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.currentResidenceReasonForLeaving}
              onChange={(e) => set("currentResidenceReasonForLeaving", e.target.value)}
              placeholder="Why are you moving from your current residence?"
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>4. Previous Residence</h3>
          <div className="form-group">
            <label className="form-label">Previous Address</label>
            <input
              className="form-control"
              value={form.previousResidenceAddress}
              onChange={(e) => set("previousResidenceAddress", e.target.value)}
              placeholder="Street, City, Province, Postal Code"
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Residence Dates</label>
              <input
                className="form-control"
                value={form.previousResidenceDates}
                onChange={(e) => set("previousResidenceDates", e.target.value)}
                placeholder="e.g. Jan 2022 - Feb 2024"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Previous Monthly Rent</label>
              <input
                className="form-control"
                value={form.previousResidenceMonthlyRent}
                onChange={(e) => set("previousResidenceMonthlyRent", e.target.value)}
                placeholder="e.g. $1,950"
              />
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Previous Landlord / Property Manager</label>
              <input
                className="form-control"
                value={form.previousResidenceLandlordName}
                onChange={(e) => set("previousResidenceLandlordName", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Landlord Contact</label>
              <input
                className="form-control"
                value={form.previousResidenceLandlordContact}
                onChange={(e) => set("previousResidenceLandlordContact", e.target.value)}
                placeholder="Phone or email"
              />
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>5. Employment &amp; Income</h3>
          <div className="form-group">
            <label className="form-label">Employment Status</label>
            <select
              className="select-control"
              value={form.employmentStatus}
              onChange={(e) => set("employmentStatus", e.target.value)}
            >
              <option value="">Select…</option>
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Employer / Income Source</label>
              <input
                className="form-control"
                value={form.employer}
                onChange={(e) => set("employer", e.target.value)}
                placeholder="Employer, business, pension, student funding, etc."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Income (CAD)</label>
              <input
                className="form-control"
                value={form.monthlyIncome}
                onChange={(e) => set("monthlyIncome", e.target.value)}
                placeholder="e.g. $5,500"
              />
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Length of Employment</label>
              <input
                className="form-control"
                value={form.employmentLength}
                onChange={(e) => set("employmentLength", e.target.value)}
                placeholder="e.g. 2 years 4 months"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Employer Contact</label>
              <input
                className="form-control"
                value={form.employerContact}
                onChange={(e) => set("employerContact", e.target.value)}
                placeholder="Manager name, phone, email"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Other Income / Additional Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.otherIncome}
              onChange={(e) => set("otherIncome", e.target.value)}
              placeholder="Benefits, savings, support, freelance income, etc."
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>6. Occupants</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Preferred Move-in Date *</label>
              <input
                className="form-control"
                type="date"
                value={form.moveInDate}
                onChange={(e) => set("moveInDate", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Desired Lease Term</label>
              <select
                className="select-control"
                value={form.leaseTerm}
                onChange={(e) => set("leaseTerm", e.target.value)}
              >
                <option value="">Select…</option>
                {LEASE_TERM_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Total Occupants</label>
              <input
                className="form-control"
                type="number"
                min="1"
                max="20"
                value={form.totalOccupants}
                onChange={(e) => set("totalOccupants", e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Adults</label>
              <input
                className="form-control"
                type="number"
                min="1"
                max="20"
                value={form.adults}
                onChange={(e) => set("adults", e.target.value)}
                placeholder="e.g. 2"
              />
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Minors</label>
              <input
                className="form-control"
                type="number"
                min="0"
                max="20"
                value={form.minors}
                onChange={(e) => set("minors", e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Occupant Summary</label>
              <input
                className="form-control"
                value={form.occupantNamesAges}
                onChange={(e) => set("occupantNamesAges", e.target.value)}
                placeholder="Names, ages, and relationship"
              />
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>7. Joint Applicant / Co-applicant</h3>
          <div className="form-group">
            <label className="form-label">
              Do you have a joint applicant / co-applicant?
            </label>
            <RadioGroup
              name="hasJointApplicant"
              options={JOINT_APPLICANT_OPTIONS}
              value={form.hasJointApplicant}
              onChange={handleJointApplicantChange}
            />
          </div>

          {form.hasJointApplicant === "Yes / 是" && (
            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: 16,
                marginTop: 8,
              }}
            >
              <div className="form-group">
                <label className="form-label">Full Legal Name</label>
                <input
                  className="form-control"
                  value={form.jointName}
                  onChange={(e) => set("jointName", e.target.value)}
                  placeholder="Legal name as shown on ID"
                />
              </div>
              <div style={grid2}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.jointDob}
                    onChange={(e) => set("jointDob", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-control"
                    type="tel"
                    value={form.jointPhone}
                    onChange={(e) => set("jointPhone", e.target.value)}
                    placeholder="+1 (250) 000-0000"
                  />
                </div>
              </div>
              <div style={grid2}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-control"
                    type="email"
                    value={form.jointEmail}
                    onChange={(e) => set("jointEmail", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Address</label>
                  <input
                    className="form-control"
                    value={form.jointAddress}
                    onChange={(e) => set("jointAddress", e.target.value)}
                    placeholder="Street, City, Province, Postal Code"
                  />
                </div>
              </div>
              <div style={grid2}>
                <div className="form-group">
                  <label className="form-label">Employment Status</label>
                  <select
                    className="select-control"
                    value={form.jointEmploymentStatus}
                    onChange={(e) => set("jointEmploymentStatus", e.target.value)}
                  >
                    <option value="">Select…</option>
                    {EMPLOYMENT_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Income (CAD)</label>
                  <input
                    className="form-control"
                    value={form.jointIncome}
                    onChange={(e) => set("jointIncome", e.target.value)}
                    placeholder="e.g. $4,200"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Employer / Income Source</label>
                <input
                  className="form-control"
                  value={form.jointEmployerIncomeSource}
                  onChange={(e) => set("jointEmployerIncomeSource", e.target.value)}
                  placeholder="Employer, business, pension, student funding, etc."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Employer Contact</label>
                <input
                  className="form-control"
                  value={form.jointEmployerContact}
                  onChange={(e) => set("jointEmployerContact", e.target.value)}
                  placeholder="Manager name, phone, email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Landlord Reference</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.jointLandlordReference}
                  onChange={(e) => set("jointLandlordReference", e.target.value)}
                  placeholder="Name, contact, relationship"
                  style={{ resize: "vertical" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Credit Information</label>
                <RadioGroup
                  name="jointCreditInfo"
                  options={CREDIT_OPTIONS}
                  value={form.jointCreditInfo}
                  onChange={(value) => set("jointCreditInfo", value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Willing to provide proof of income / credit report
                </label>
                <RadioGroup
                  name="jointProofOfIncome"
                  options={PROOF_INCOME_OPTIONS}
                  value={form.jointProofOfIncome}
                  onChange={(value) => set("jointProofOfIncome", value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>8. Pets</h3>
          <div className="form-group">
            <label className="form-label">Do you have pets?</label>
            <RadioGroup
              name="hasPets"
              options={PET_OPTIONS}
              value={form.hasPets}
              onChange={handlePetsChange}
            />
          </div>
          {form.hasPets === "Yes / 有宠物" && (
            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: 16,
                marginTop: 8,
              }}
            >
              <div className="form-group">
                <label className="form-label">Pet Deposit Ready</label>
                <RadioGroup
                  name="petDepositFunds"
                  options={YES_NO_OPTIONS}
                  value={form.petDepositFunds}
                  onChange={(value) => set("petDepositFunds", value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pet Details</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.petDetails}
                  onChange={(e) => set("petDetails", e.target.value)}
                  placeholder="Type, breed, age, weight, name"
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>9. Vehicles</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Number of Vehicles</label>
              <input
                className="form-control"
                value={form.vehicleCount}
                onChange={(e) => set("vehicleCount", e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Details</label>
              <input
                className="form-control"
                value={form.vehicleDetails}
                onChange={(e) => set("vehicleDetails", e.target.value)}
                placeholder="Make, model, colour, plate if available"
              />
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>10. Smoking / Vaping</h3>
          <div className="form-group">
            <label className="form-label">
              Do you or any occupant smoke, vape, or use cannabis?
            </label>
            <RadioGroup
              name="smokesVapesCannabis"
              options={YES_NO_OPTIONS}
              value={form.smokesVapesCannabis}
              onChange={(value) => set("smokesVapesCannabis", value)}
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
              fontSize: "0.87rem",
              lineHeight: 1.6,
            }}
          >
            <input
              type="checkbox"
              checked={form.noSmokingAgreement}
              onChange={(e) => set("noSmokingAgreement", e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            I agree that no smoking, vaping, or cannabis use is permitted on the property.
          </label>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>11. References</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Reference 1 Name</label>
              <input
                className="form-control"
                value={form.referenceOneName}
                onChange={(e) => set("referenceOneName", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reference 1 Relationship</label>
              <input
                className="form-control"
                value={form.referenceOneRelationship}
                onChange={(e) => set("referenceOneRelationship", e.target.value)}
                placeholder="Employer, landlord, colleague, etc."
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reference 1 Contact</label>
            <input
              className="form-control"
              value={form.referenceOneContact}
              onChange={(e) => set("referenceOneContact", e.target.value)}
              placeholder="Phone and/or email"
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Reference 2 Name</label>
              <input
                className="form-control"
                value={form.referenceTwoName}
                onChange={(e) => set("referenceTwoName", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reference 2 Relationship</label>
              <input
                className="form-control"
                value={form.referenceTwoRelationship}
                onChange={(e) => set("referenceTwoRelationship", e.target.value)}
                placeholder="Employer, landlord, colleague, etc."
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reference 2 Contact</label>
            <input
              className="form-control"
              value={form.referenceTwoContact}
              onChange={(e) => set("referenceTwoContact", e.target.value)}
              placeholder="Phone and/or email"
            />
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>12. Emergency Contact</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-control"
                value={form.emergencyName}
                onChange={(e) => set("emergencyName", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Relationship</label>
              <input
                className="form-control"
                value={form.emergencyRelationship}
                onChange={(e) => set("emergencyRelationship", e.target.value)}
                placeholder="Family, friend, coworker, etc."
              />
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                className="form-control"
                value={form.emergencyPhone}
                onChange={(e) => set("emergencyPhone", e.target.value)}
                placeholder="+1 (250) 000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-control"
                type="email"
                value={form.emergencyEmail}
                onChange={(e) => set("emergencyEmail", e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>13. Background / Credit</h3>
          <div className="form-group">
            <label className="form-label">Current Credit Profile</label>
            <RadioGroup
              name="creditHistory"
              options={CREDIT_OPTIONS}
              value={form.creditHistory}
              onChange={(value) => set("creditHistory", value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Have you or any co-applicant ever been evicted or found in breach of a tenancy agreement?
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={form.evictionHistory}
              onChange={(e) => set("evictionHistory", e.target.value)}
              placeholder='If no, write "No".'
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Additional Background / Credit Notes
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={form.backgroundNotes}
              onChange={(e) => set("backgroundNotes", e.target.value)}
              placeholder="Outstanding rent, collections, bankruptcy, or anything you want reviewed."
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>14. Supporting Documents</h3>
          <div className="form-group">
            <label className="form-label">
              Can you provide proof of income and/or a recent credit report if requested?
            </label>
            <RadioGroup
              name="proofOfIncome"
              options={PROOF_INCOME_OPTIONS}
              value={form.proofOfIncome}
              onChange={(value) => set("proofOfIncome", value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Supporting Document Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.supportingDocsNotes}
              onChange={(e) => set("supportingDocsNotes", e.target.value)}
              placeholder="Pay stubs, employment letter, bank statements, ID, credit report, etc."
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Do you currently have tenant insurance?
            </label>
            <RadioGroup
              name="hasTenantInsurance"
              options={INSURANCE_STATUS_OPTIONS}
              value={form.hasTenantInsurance}
              onChange={(value) => set("hasTenantInsurance", value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Can you provide proof of tenant insurance before move-in?
            </label>
            <RadioGroup
              name="proofInsuranceBeforeMoveIn"
              options={PROOF_INSURANCE_OPTIONS}
              value={form.proofInsuranceBeforeMoveIn}
              onChange={(value) => set("proofInsuranceBeforeMoveIn", value)}
            />
          </div>
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--color-text-muted)",
              lineHeight: 1.6,
            }}
          >
            Do not upload files on this page. Documents can be requested separately after review.
          </p>
        </div>

        <div
          className="card mb-24"
          style={{ background: "#f5f8f5", border: "2px solid var(--color-border)" }}
        >
          <h3 style={sTitle}>15. Consent &amp; Declaration</h3>
          <div className="form-group">
            <label className="form-label">
              Do you have funds available for the security deposit and first month's rent?
            </label>
            <RadioGroup
              name="depositFundsAvailable"
              options={DEPOSIT_OPTIONS}
              value={form.depositFundsAvailable}
              onChange={(value) => set("depositFundsAvailable", value)}
            />
          </div>
          <div style={NOTICE}>
            Under the BC Residential Tenancy Act, the security deposit is a maximum
            of half one month's rent. If you have pets, an additional pet deposit may
            be required. Tenant insurance with at least $1,000,000 third-party
            liability is required before move-in.
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
              fontSize: "0.87rem",
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            <input
              type="checkbox"
              checked={form.depositAgreement}
              onChange={(e) => set("depositAgreement", e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            I understand and agree to the deposit requirements.
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
              fontSize: "0.87rem",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={form.tenantInsuranceAgreement}
              onChange={(e) => set("tenantInsuranceAgreement", e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            I understand that tenant insurance is required before move-in.
          </label>
          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.additionalNotes}
              onChange={(e) => set("additionalNotes", e.target.value)}
              placeholder="Anything else you would like the reviewer to know."
              style={{ resize: "vertical" }}
            />
          </div>
          <ul
            style={{
              fontSize: "0.84rem",
              lineHeight: 1.9,
              paddingLeft: 20,
              color: "var(--color-text)",
              marginBottom: 16,
            }}
          >
            <li>All information provided is true and complete.</li>
            <li>Submitting this application does not guarantee approval.</li>
            <li>You authorize reference and tenancy screening checks.</li>
            <li>Your information will be used only for tenancy review.</li>
          </ul>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(e) => set("agreed", e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
              required
            />
            <span style={{ fontSize: "0.88rem", lineHeight: 1.6, fontWeight: 600 }}>
              I confirm the declaration above and consent to the review of this application. *
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
          style={{ width: "100%", padding: "16px 0", fontSize: "1.05rem", fontWeight: 700 }}
        >
          {submitting ? "Submitting…" : "Submit Application"}
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--color-text-muted)",
            marginTop: 12,
            lineHeight: 1.6,
          }}
        >
          By submitting, you agree that your information will be used for tenancy screening.
        </p>
      </form>
    </div>
  );
}
