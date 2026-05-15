import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getListing, getListings, saveRentalApplication } from "../utils/storage";

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
          const all = await getListings();
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
      setError("Applicant name is required. / 申请人姓名为必填项。");
      return;
    }
    if (!clean(form.email)) {
      setError("Email is required. / 邮箱为必填项。");
      return;
    }
    if (!form.moveInDate) {
      setError("Preferred move-in date is required. / 期望入住日期为必填项。");
      return;
    }
    if (!form.agreed) {
      setError("Please confirm the declaration at the bottom. / 请确认底部声明。");
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
        err.message || "Submission failed. Please try again. / 提交失败，请重试。"
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
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", padding: "0 20px" }}>
        <div className="card" style={{ textAlign: "center", padding: "40px 32px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
          <h1 style={{ fontWeight: 800, fontSize: "1.4rem", marginBottom: 8 }}>
            Application Submitted / 申请已提交
          </h1>
          <p
            style={{
              color: "var(--color-text-muted)",
              marginBottom: 20,
              lineHeight: 1.7,
            }}
          >
            Thank you! Your application has been received and will be reviewed shortly.
            <br />
            感谢您的申请！我们将尽快审核并与您联系。
          </p>
          <div
            style={{
              background: "#f5f8f5",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 20,
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
              Reference Number / 参考编号
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
          {submitted.pdfUrl && (
            <a
              href={submitted.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn--primary"
            >
              Download PDF Copy / 下载 PDF 副本
            </a>
          )}
          <p
            style={{
              marginTop: 20,
              fontSize: "0.82rem",
              color: "var(--color-text-muted)",
            }}
          >
            Please keep your reference number for follow-up inquiries.
            <br />
            请保存您的参考编号以便后续联系。
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
          Residential Tenancy Application / 住宅租赁申请表
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
          <br />
          请如实填写此申请表。所有成年入住人员在入住前可能需提供支持文件。提交申请不代表获得批准。
        </div>
      </div>

      {error && (
        <div className="notice notice--error" style={{ marginBottom: 20 }}>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card mb-24">
          <h3 style={sTitle}>1. Property Applied For / 申请房源</h3>
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
                Listing ID / 房源编号：
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
                  Address / 地址：
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
                  Rent / 月租：
                </span>{" "}
                ${Number(listing.rent).toLocaleString()}/mo
              </div>
            )}
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>2. Applicant Information / 申请人信息</h3>
          <div className="form-group">
            <label className="form-label">Full Legal Name / 法定全名 *</label>
            <input
              className="form-control"
              value={form.applicantName}
              onChange={(e) => set("applicantName", e.target.value)}
              placeholder="Legal name as shown on ID / 与证件一致的姓名"
              required
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Phone Number / 电话 *</label>
              <input
                className="form-control"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (250) 000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address / 邮箱 *</label>
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
              <label className="form-label">Date of Birth / 出生日期</label>
              <input
                className="form-control"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">WeChat ID / 微信号</label>
              <input
                className="form-control"
                value={form.wechat}
                onChange={(e) => set("wechat", e.target.value)}
                placeholder="Optional / 选填"
              />
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>3. Current Residence / 现居住信息</h3>
          <div className="form-group">
            <label className="form-label">Current Address / 当前住址</label>
            <input
              className="form-control"
              value={form.currentResidenceAddress}
              onChange={(e) => set("currentResidenceAddress", e.target.value)}
              placeholder="Street, City, Province, Postal Code"
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">How long have you lived there? / 现住址居住时间</label>
              <input
                className="form-control"
                value={form.currentResidenceSince}
                onChange={(e) => set("currentResidenceSince", e.target.value)}
                placeholder="e.g. Mar 2024 - Present"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current Monthly Rent / 当前月租</label>
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
              <label className="form-label">Current Landlord / Property Manager / 现任房东或物业</label>
              <input
                className="form-control"
                value={form.currentResidenceLandlordName}
                onChange={(e) => set("currentResidenceLandlordName", e.target.value)}
                placeholder="Name / 姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Landlord Contact / 房东联系方式</label>
              <input
                className="form-control"
                value={form.currentResidenceLandlordContact}
                onChange={(e) => set("currentResidenceLandlordContact", e.target.value)}
                placeholder="Phone or email / 电话或邮箱"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Leaving / 搬离原因</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.currentResidenceReasonForLeaving}
              onChange={(e) => set("currentResidenceReasonForLeaving", e.target.value)}
              placeholder="Why are you moving from your current residence? / 为什么准备搬离现住址？"
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>4. Previous Residence / 前居住信息</h3>
          <div className="form-group">
            <label className="form-label">Previous Address / 之前住址</label>
            <input
              className="form-control"
              value={form.previousResidenceAddress}
              onChange={(e) => set("previousResidenceAddress", e.target.value)}
              placeholder="Street, City, Province, Postal Code"
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Residence Dates / 居住时间</label>
              <input
                className="form-control"
                value={form.previousResidenceDates}
                onChange={(e) => set("previousResidenceDates", e.target.value)}
                placeholder="e.g. Jan 2022 - Feb 2024"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Previous Monthly Rent / 之前月租</label>
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
              <label className="form-label">Previous Landlord / Property Manager / 之前房东或物业</label>
              <input
                className="form-control"
                value={form.previousResidenceLandlordName}
                onChange={(e) => set("previousResidenceLandlordName", e.target.value)}
                placeholder="Name / 姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Landlord Contact / 房东联系方式</label>
              <input
                className="form-control"
                value={form.previousResidenceLandlordContact}
                onChange={(e) => set("previousResidenceLandlordContact", e.target.value)}
                placeholder="Phone or email / 电话或邮箱"
              />
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>5. Employment &amp; Income / 工作与收入</h3>
          <div className="form-group">
            <label className="form-label">Employment Status / 就业状态</label>
            <select
              className="select-control"
              value={form.employmentStatus}
              onChange={(e) => set("employmentStatus", e.target.value)}
            >
              <option value="">Select… / 请选择</option>
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Employer / Income Source / 雇主或收入来源</label>
              <input
                className="form-control"
                value={form.employer}
                onChange={(e) => set("employer", e.target.value)}
                placeholder="Employer, business, pension, student funding, etc."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Income / 月收入 (CAD)</label>
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
              <label className="form-label">Length of Employment / 工作时长</label>
              <input
                className="form-control"
                value={form.employmentLength}
                onChange={(e) => set("employmentLength", e.target.value)}
                placeholder="e.g. 2 years 4 months"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Employer Contact / 雇主联系方式</label>
              <input
                className="form-control"
                value={form.employerContact}
                onChange={(e) => set("employerContact", e.target.value)}
                placeholder="Manager name, phone, email"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Other Income / Additional Notes / 其他收入说明</label>
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
          <h3 style={sTitle}>6. Occupants / 入住人员</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Preferred Move-in Date / 期望入住日期 *</label>
              <input
                className="form-control"
                type="date"
                value={form.moveInDate}
                onChange={(e) => set("moveInDate", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Desired Lease Term / 期望租期</label>
              <select
                className="select-control"
                value={form.leaseTerm}
                onChange={(e) => set("leaseTerm", e.target.value)}
              >
                <option value="">Select… / 请选择</option>
                {LEASE_TERM_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Total Occupants / 入住总人数</label>
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
              <label className="form-label">Adults / 成年人数</label>
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
              <label className="form-label">Minors / 未成年人数量</label>
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
              <label className="form-label">Occupant Summary / 入住人员说明</label>
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
          <h3 style={sTitle}>7. Joint Applicant / Co-applicant / 共同申请人</h3>
          <div className="form-group">
            <label className="form-label">
              Do you have a joint applicant / co-applicant? / 是否有共同申请人？
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
                <label className="form-label">Full Legal Name / 法定全名</label>
                <input
                  className="form-control"
                  value={form.jointName}
                  onChange={(e) => set("jointName", e.target.value)}
                  placeholder="Legal name as shown on ID"
                />
              </div>
              <div style={grid2}>
                <div className="form-group">
                  <label className="form-label">Date of Birth / 出生日期</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.jointDob}
                    onChange={(e) => set("jointDob", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number / 电话</label>
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
                  <label className="form-label">Email Address / 邮箱</label>
                  <input
                    className="form-control"
                    type="email"
                    value={form.jointEmail}
                    onChange={(e) => set("jointEmail", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Address / 当前住址</label>
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
                  <label className="form-label">Employment Status / 就业状态</label>
                  <select
                    className="select-control"
                    value={form.jointEmploymentStatus}
                    onChange={(e) => set("jointEmploymentStatus", e.target.value)}
                  >
                    <option value="">Select… / 请选择</option>
                    {EMPLOYMENT_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Income / 月收入 (CAD)</label>
                  <input
                    className="form-control"
                    value={form.jointIncome}
                    onChange={(e) => set("jointIncome", e.target.value)}
                    placeholder="e.g. $4,200"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Employer / Income Source / 雇主或收入来源</label>
                <input
                  className="form-control"
                  value={form.jointEmployerIncomeSource}
                  onChange={(e) => set("jointEmployerIncomeSource", e.target.value)}
                  placeholder="Employer, business, pension, student funding, etc."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Employer Contact / 雇主联系方式</label>
                <input
                  className="form-control"
                  value={form.jointEmployerContact}
                  onChange={(e) => set("jointEmployerContact", e.target.value)}
                  placeholder="Manager name, phone, email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Landlord Reference / 当前房东参考</label>
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
                <label className="form-label">Credit Information / 信用信息</label>
                <RadioGroup
                  name="jointCreditInfo"
                  options={CREDIT_OPTIONS}
                  value={form.jointCreditInfo}
                  onChange={(value) => set("jointCreditInfo", value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Willing to provide proof of income / credit report / 是否愿意提供收入证明或信用报告
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
          <h3 style={sTitle}>8. Pets / 宠物</h3>
          <div className="form-group">
            <label className="form-label">Do you have pets? / 是否有宠物？</label>
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
                <label className="form-label">Pet Deposit Ready / 是否已准备宠物押金</label>
                <RadioGroup
                  name="petDepositFunds"
                  options={YES_NO_OPTIONS}
                  value={form.petDepositFunds}
                  onChange={(value) => set("petDepositFunds", value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pet Details / 宠物详情</label>
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
          <h3 style={sTitle}>9. Vehicles / 车辆</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Number of Vehicles / 车辆数量</label>
              <input
                className="form-control"
                value={form.vehicleCount}
                onChange={(e) => set("vehicleCount", e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Details / 车辆详情</label>
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
          <h3 style={sTitle}>10. Smoking / Vaping / 吸烟或电子烟</h3>
          <div className="form-group">
            <label className="form-label">
              Do you or any occupant smoke, vape, or use cannabis? / 您或任何入住人员是否吸烟、使用电子烟或大麻？
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
            I agree that no smoking, vaping, or cannabis use is permitted on the
            property. / 本人同意在物业内禁止吸烟、电子烟或大麻使用。
          </label>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>11. References / 推荐人</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Reference 1 Name / 推荐人 1 姓名</label>
              <input
                className="form-control"
                value={form.referenceOneName}
                onChange={(e) => set("referenceOneName", e.target.value)}
                placeholder="Name / 姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reference 1 Relationship / 关系</label>
              <input
                className="form-control"
                value={form.referenceOneRelationship}
                onChange={(e) => set("referenceOneRelationship", e.target.value)}
                placeholder="Employer, landlord, colleague, etc."
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reference 1 Contact / 联系方式</label>
            <input
              className="form-control"
              value={form.referenceOneContact}
              onChange={(e) => set("referenceOneContact", e.target.value)}
              placeholder="Phone and/or email"
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Reference 2 Name / 推荐人 2 姓名</label>
              <input
                className="form-control"
                value={form.referenceTwoName}
                onChange={(e) => set("referenceTwoName", e.target.value)}
                placeholder="Name / 姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reference 2 Relationship / 关系</label>
              <input
                className="form-control"
                value={form.referenceTwoRelationship}
                onChange={(e) => set("referenceTwoRelationship", e.target.value)}
                placeholder="Employer, landlord, colleague, etc."
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reference 2 Contact / 联系方式</label>
            <input
              className="form-control"
              value={form.referenceTwoContact}
              onChange={(e) => set("referenceTwoContact", e.target.value)}
              placeholder="Phone and/or email"
            />
          </div>
        </div>

        <div className="card mb-24">
          <h3 style={sTitle}>12. Emergency Contact / 紧急联系人</h3>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Name / 姓名</label>
              <input
                className="form-control"
                value={form.emergencyName}
                onChange={(e) => set("emergencyName", e.target.value)}
                placeholder="Name / 姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Relationship / 关系</label>
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
              <label className="form-label">Phone Number / 电话</label>
              <input
                className="form-control"
                value={form.emergencyPhone}
                onChange={(e) => set("emergencyPhone", e.target.value)}
                placeholder="+1 (250) 000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address / 邮箱</label>
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
          <h3 style={sTitle}>13. Background / Credit / 租赁背景与信用</h3>
          <div className="form-group">
            <label className="form-label">Current Credit Profile / 当前信用情况</label>
            <RadioGroup
              name="creditHistory"
              options={CREDIT_OPTIONS}
              value={form.creditHistory}
              onChange={(value) => set("creditHistory", value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Have you or any co-applicant ever been evicted or found in breach of a
              tenancy agreement? / 您或共同申请人是否曾被驱逐或违反租约？
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={form.evictionHistory}
              onChange={(e) => set("evictionHistory", e.target.value)}
              placeholder='If no, write "No". / 如无，请填写 "No"。'
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Additional Background / Credit Notes / 其他背景或信用说明
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
          <h3 style={sTitle}>14. Supporting Documents / 支持文件说明</h3>
          <div className="form-group">
            <label className="form-label">
              Can you provide proof of income and/or a recent credit report if
              requested? / 如被要求，您能否提供收入证明或近期信用报告？
            </label>
            <RadioGroup
              name="proofOfIncome"
              options={PROOF_INCOME_OPTIONS}
              value={form.proofOfIncome}
              onChange={(value) => set("proofOfIncome", value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Supporting Document Notes / 支持文件说明</label>
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
              Do you currently have tenant insurance? / 您目前是否有租客保险？
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
              Can you provide proof of tenant insurance before move-in? /
              能否在入住前提供租客保险证明？
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
            Do not upload files on this page. Documents can be requested separately
            after review. / 此页无需上传文件，审核后如有需要会再单独联系。
          </p>
        </div>

        <div
          className="card mb-24"
          style={{ background: "#f5f8f5", border: "2px solid var(--color-border)" }}
        >
          <h3 style={sTitle}>15. Consent &amp; Declaration / 同意与声明</h3>
          <div className="form-group">
            <label className="form-label">
              Do you have funds available for the security deposit and first month's
              rent? / 是否已准备好押金和首月租金？
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
            <br />
            根据卑诗省住宅租赁法，押金最高为半个月租金。如有宠物，可能需要额外宠物押金。入住前须持有至少
            $1,000,000 第三方责任险的租客保险。
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
            I understand and agree to the deposit requirements. /
            本人了解并同意押金相关要求。
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
            I understand that tenant insurance is required before move-in. /
            本人了解入住前必须提供租客保险。
          </label>
          <div className="form-group">
            <label className="form-label">Additional Notes / 其他补充说明</label>
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
            <li>All information provided is true and complete. / 所有信息真实且完整。</li>
            <li>Submitting this application does not guarantee approval. / 提交申请不代表必然获批。</li>
            <li>You authorize reference and tenancy screening checks. / 您授权进行推荐人和租赁背景核查。</li>
            <li>Your information will be used only for tenancy review. / 您的信息仅用于租赁审核。</li>
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
              I confirm the declaration above and consent to the review of this
              application. / 本人确认以上声明，并同意本申请进入审核。 *
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
          style={{ width: "100%", padding: "16px 0", fontSize: "1.05rem", fontWeight: 700 }}
        >
          {submitting ? "Submitting… / 提交中…" : "Submit Application / 提交申请"}
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
          By submitting, you agree that your information will be used for tenancy
          screening. / 提交即表示同意将信息用于租赁审核。
        </p>
      </form>
    </div>
  );
}
