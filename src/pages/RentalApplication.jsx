import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getListing, saveRentalApplication } from "../utils/storage";

// ── Option lists ───────────────────────────────────────────────────────────────
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

// ── Tiny style helpers ─────────────────────────────────────────────────────────
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const sTitle = {
  fontWeight: 700, fontSize: "0.95rem",
  color: "var(--color-primary)", marginBottom: 16,
};
const NOTICE = {
  background: "#fdf6e3", border: "1px solid #e8d5a3",
  borderRadius: 8, padding: "12px 14px",
  fontSize: "0.82rem", color: "#7a5a2f", lineHeight: 1.65, marginBottom: 12,
};

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginTop: 4 }}>
      {options.map((opt) => (
        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.88rem" }}>
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function serializeJointEmployment(status, source) {
  const cleanStatus = status.trim();
  const cleanSource = source.trim();
  if (!cleanStatus && !cleanSource) return "";
  if (cleanStatus && cleanSource) {
    return `Status: ${cleanStatus}\nEmployer / Income Source: ${cleanSource}`;
  }
  if (cleanStatus) return cleanStatus;
  return `Employer / Income Source: ${cleanSource}`;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RentalApplication() {
  const { listingId } = useParams();
  const [listing, setListing]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError]         = useState("");

  const [form, setForm] = useState({
    // Applicant info
    applicantName:     "",
    email:             "",
    phone:             "",
    dateOfBirth:       "",
    currentAddress:    "",
    wechat:            "",
    // Employment / Income
    employmentStatus:  "",
    employer:          "",
    monthlyIncome:     "",
    // Landlord reference & credit
    landlordReference: "",
    creditHistory:     "",
    // Move-in / Occupancy
    moveInDate:        "",
    leaseTerm:         "",
    totalOccupants:    "",
    adults:            "",
    minors:            "",
    occupantNamesAges: "",
    // Joint applicant
    hasJointApplicant:      "No / 没有",
    jointName:              "",
    jointPhone:             "",
    jointEmail:             "",
    jointDob:               "",
    jointAddress:           "",
    jointEmploymentStatus:  "",
    jointEmployerIncomeSource: "",
    jointIncome:            "",
    jointEmployerContact:   "",
    jointLandlordReference: "",
    jointCreditInfo:        "",
    jointProofOfIncome:     "",
    // Lease / Deposit
    depositFundsAvailable: "",
    depositAgreement:      false,
    // Pets
    hasPets:         "No",
    petDepositFunds: "",
    petDetails:      "",
    // Tenancy history
    evictionHistory: "",
    // Smoking / Vaping / Cannabis
    smokesVapesCannabis: "",
    noSmokingAgreement:  false,
    // Supporting documents
    proofOfIncome: "",
    // Tenant insurance
    hasTenantInsurance:        "",
    tenantInsuranceAgreement:  false,
    proofInsuranceBeforeMoveIn: "",
    // Additional info
    reasonForMoving: "",
    parkingRequest:  "",
    additionalNotes: "",
    // Declaration
    agreed: false,
  });

  useEffect(() => {
    getListing(listingId)
      .then(setListing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleJointApplicantChange(value) {
    setForm((prev) => (
      value === "Yes / 有"
        ? { ...prev, hasJointApplicant: value }
        : { ...prev, hasJointApplicant: value, ...EMPTY_JOINT_APPLICANT }
    ));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.applicantName.trim()) { setError("Applicant name is required. / 申请人姓名为必填项。"); return; }
    if (!form.email.trim())         { setError("Email is required. / 邮箱为必填项。"); return; }
    if (!form.moveInDate)           { setError("Preferred move-in date is required. / 期望入住日期为必填项。"); return; }
    if (!form.agreed)               { setError("Please confirm the declaration at the bottom. / 请确认底部声明。"); return; }

    setSubmitting(true);
    try {
      const result = await saveRentalApplication({
        listingId,
        // Applicant
        applicantName:    form.applicantName.trim(),
        email:            form.email.trim(),
        phone:            form.phone.trim(),
        dateOfBirth:      form.dateOfBirth,
        currentAddress:   form.currentAddress.trim(),
        wechat:           form.wechat.trim(),
        // Employment
        employmentStatus: form.employmentStatus,
        employer:         form.employer.trim(),
        monthlyIncome:    form.monthlyIncome.trim(),
        // Reference / credit
        landlordReference: form.landlordReference.trim(),
        creditHistory:     form.creditHistory,
        // Occupancy
        moveInDate:        form.moveInDate,
        leaseTerm:         form.leaseTerm,
        occupants:         form.totalOccupants,
        adults:            form.adults,
        minors:            form.minors,
        occupantNamesAges: form.occupantNamesAges.trim(),
        // Joint applicant
        hasJointApplicant:      form.hasJointApplicant,
        jointName:              form.jointName.trim(),
        jointProofOfIncome:     form.jointProofOfIncome,
        jointPhone:             form.jointPhone.trim(),
        jointEmail:             form.jointEmail.trim(),
        jointDob:               form.jointDob,
        jointAddress:           form.jointAddress.trim(),
        jointEmployment:        serializeJointEmployment(form.jointEmploymentStatus, form.jointEmployerIncomeSource),
        jointIncome:            form.jointIncome.trim(),
        jointEmployerContact:   form.jointEmployerContact.trim(),
        jointLandlordReference: form.jointLandlordReference.trim(),
        jointCreditInfo:        form.jointCreditInfo,
        // Deposit
        depositFundsAvailable: form.depositFundsAvailable,
        depositAgreement:      form.depositAgreement ? "Agreed" : "Not confirmed",
        // Pets
        hasPets:         form.hasPets,
        petDepositFunds: form.petDepositFunds,
        petDetails:      form.petDetails.trim(),
        // Tenancy history
        evictionHistory: form.evictionHistory.trim(),
        // Smoking
        smokesVapesCannabis: form.smokesVapesCannabis,
        noSmokingAgreement:  form.noSmokingAgreement ? "Agreed" : "Not confirmed",
        // Documents
        proofOfIncome: form.proofOfIncome,
        // Insurance
        hasTenantInsurance:        form.hasTenantInsurance,
        tenantInsuranceAgreement:  form.tenantInsuranceAgreement ? "Agreed" : "Not confirmed",
        proofInsuranceBeforeMoveIn: form.proofInsuranceBeforeMoveIn,
        // Additional
        reasonForMoving: form.reasonForMoving.trim(),
        parkingRequest:  form.parkingRequest.trim(),
        additionalNotes: form.additionalNotes.trim(),
      });
      setSubmitted(result);
    } catch (err) {
      setError(err.message || "Submission failed. Please try again. / 提交失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", padding: "0 20px" }}>
        <div className="card" style={{ textAlign: "center", padding: "40px 32px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
          <h1 style={{ fontWeight: 800, fontSize: "1.4rem", marginBottom: 8 }}>
            Application Submitted / 申请已提交
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginBottom: 20, lineHeight: 1.7 }}>
            Thank you! Your application has been received and will be reviewed shortly.
            <br />感谢您的申请！我们将尽快审核并与您联系。
          </p>
          <div style={{ background: "#f5f8f5", borderRadius: 10, padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
            <p style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", marginBottom: 4 }}>
              Reference Number / 参考编号
            </p>
            <p style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: "monospace" }}>
              {submitted.recordId}
            </p>
          </div>
          {submitted.pdfUrl && (
            <a href={submitted.pdfUrl} target="_blank" rel="noreferrer" className="btn btn--primary">
              Download PDF Copy / 下载 PDF 副本
            </a>
          )}
          <p style={{ marginTop: 20, fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            Please keep your reference number for follow-up inquiries.
            <br />请保存您的参考编号以便后续联系。
          </p>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  const title = listing
    ? [listing.bedrooms && `${listing.bedrooms} Bed`, listing.bathrooms && `${listing.bathrooms} Bath`, listing.address].filter(Boolean).join(" / ")
    : listingId;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: 6 }}>
          Residential Tenancy Application / 住宅租赁申请表
        </h1>
        {listing && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.92rem" }}>
            {title}{listing.city ? `, ${listing.city}` : ""}
            {listing.rent ? ` · $${Number(listing.rent).toLocaleString()}/mo` : ""}
          </p>
        )}
        <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginTop: 4 }}>
          Listing ID: <strong>{listingId}</strong>
        </p>
        <div style={NOTICE}>
          Please complete this application if you are interested in renting this property.
          All adult occupants may be required to provide supporting documents before move-in.
          Submitting this form does not guarantee approval.
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

        {/* ── Section 1: Property Applied For ─────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>1. Property Applied For / 申请房源</h3>
          <div style={{ background: "#edf3ee", borderRadius: 8, padding: "12px 16px", fontSize: "0.88rem", lineHeight: 2 }}>
            <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Listing ID / 房源编号：</span> <code>{listingId}</code></div>
            {listing?.address && <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Address / 地址：</span> {listing.address}{listing.city ? `, ${listing.city}` : ""}</div>}
            {listing?.rent && <div><span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Rent / 月租：</span> ${Number(listing.rent).toLocaleString()}/mo</div>}
          </div>
        </div>

        {/* ── Section 2: Applicant Information ────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>2. Applicant Information / 申请人信息</h3>
          <div className="form-group">
            <label className="form-label">Applicant Full Name(s) / 申请人全名 *</label>
            <input
              className="form-control"
              value={form.applicantName}
              onChange={(e) => set("applicantName", e.target.value)}
              placeholder="Legal name(s) as on government-issued ID / 与政府证件一致的全名"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Current Mailing Address / 现居住地址</label>
            <input
              className="form-control"
              value={form.currentAddress}
              onChange={(e) => set("currentAddress", e.target.value)}
              placeholder="Street, City, Province, Postal Code"
            />
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Primary Phone Number / 主要联系电话 *</label>
              <input
                className="form-control"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (250) 000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Primary Email Address / 主要邮箱 *</label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="your@email.com"
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
              <label className="form-label">WeChat ID / 微信号 <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>(Optional)</span></label>
              <input
                className="form-control"
                value={form.wechat}
                onChange={(e) => set("wechat", e.target.value)}
                placeholder="Optional / 选填"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Employment / Income ──────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>3. Employment / Income / 就业与收入</h3>
          <div className="form-group">
            <label className="form-label">Current Employment Status / 当前就业状态</label>
            <select className="select-control" value={form.employmentStatus} onChange={(e) => set("employmentStatus", e.target.value)}>
              <option value="">Select… / 请选择</option>
              {EMPLOYMENT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Current Employer / Source of Income / 雇主或收入来源</label>
              <input
                className="form-control"
                value={form.employer}
                onChange={(e) => set("employer", e.target.value)}
                placeholder="Employer name, business, or income source"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Household Income / 月收入 (CAD)</label>
              <input
                className="form-control"
                value={form.monthlyIncome}
                onChange={(e) => set("monthlyIncome", e.target.value)}
                placeholder="e.g. $5,000"
              />
            </div>
          </div>
        </div>

        {/* ── Section 4: Current Landlord / Reference ──────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>4. Current Landlord / Reference / 现任房东参考信息</h3>
          <div className="form-group">
            <label className="form-label">Current Landlord or Property Manager Reference / 现任房东或物业管理公司联系方式</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.landlordReference}
              onChange={(e) => set("landlordReference", e.target.value)}
              placeholder="Name, phone/email, relationship (e.g. John Smith, 250-555-0100, current landlord) / 姓名、联系方式、关系"
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* ── Section 5: Credit Information ────────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>5. Credit Information / 信用记录</h3>
          <div className="form-group">
            <label className="form-label">How would you rate your current credit history? / 如何描述您目前的信用记录？</label>
            <RadioGroup
              name="creditHistory"
              options={CREDIT_OPTIONS}
              value={form.creditHistory}
              onChange={(v) => set("creditHistory", v)}
            />
          </div>
        </div>

        {/* ── Section 6: Move-in / Occupancy ───────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>6. Move-in &amp; Occupancy / 入住日期与居住人数</h3>
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
              <label className="form-label">Total Number of People (incl. applicant) / 入住总人数（含申请人）</label>
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
          </div>
          <div style={grid2}>
            <div className="form-group">
              <label className="form-label">Number of Adults (18+) / 成年人数量（18岁及以上）</label>
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
            <div className="form-group">
              <label className="form-label">Number of Minors (under 18) / 未成年人数量（18岁以下）</label>
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
          </div>
          <div className="form-group">
            <label className="form-label">Names and Ages of All Occupants / 所有入住人员姓名及年龄</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.occupantNamesAges}
              onChange={(e) => set("occupantNamesAges", e.target.value)}
              placeholder="e.g. Jane Doe (32), John Doe (34), Emily Doe (8) / 例：张三（32岁）、李四（30岁）"
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* ── Section 7: Joint Applicant / Co-Applicant ────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>7. Joint Applicant / Co-Applicant / 联名申请人</h3>
          <div className="form-group">
            <label className="form-label">Will there be a joint applicant? / 是否有联名申请人？</label>
            <RadioGroup
              name="hasJointApplicant"
              options={["Yes / 有", "No / 没有"]}
              value={form.hasJointApplicant}
              onChange={handleJointApplicantChange}
            />
          </div>

          {form.hasJointApplicant === "Yes / 有" && (
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 8 }}>
              <div className="form-group">
                <label className="form-label">Joint Applicant Full Legal Name / 联名申请人全名</label>
                <input
                  className="form-control"
                  value={form.jointName}
                  onChange={(e) => set("jointName", e.target.value)}
                  placeholder="Legal name as on government-issued ID / 与政府证件一致的全名"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Joint Applicant Current Address / 联名申请人现居地址</label>
                <input
                  className="form-control"
                  value={form.jointAddress}
                  onChange={(e) => set("jointAddress", e.target.value)}
                  placeholder="Street, City, Province, Postal Code"
                />
              </div>
              <div style={grid2}>
                <div className="form-group">
                  <label className="form-label">Joint Applicant Phone / 联名申请人电话</label>
                  <input className="form-control" type="tel" value={form.jointPhone} onChange={(e) => set("jointPhone", e.target.value)} placeholder="+1 (250) 000-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Joint Applicant Email / 联名申请人邮箱</label>
                  <input className="form-control" type="email" value={form.jointEmail} onChange={(e) => set("jointEmail", e.target.value)} placeholder="email@example.com" />
                </div>
              </div>
              <div style={grid2}>
                <div className="form-group">
                  <label className="form-label">Joint Applicant Date of Birth / 出生日期</label>
                  <input className="form-control" type="date" value={form.jointDob} onChange={(e) => set("jointDob", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Joint Applicant Employment Status / 联名申请人当前就业状态</label>
                  <select className="select-control" value={form.jointEmploymentStatus} onChange={(e) => set("jointEmploymentStatus", e.target.value)}>
                    <option value="">Select… / 请选择</option>
                    {EMPLOYMENT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={grid2}>
                <div className="form-group">
                  <label className="form-label">Joint Applicant Employer / Income Source / 联名申请人雇主或收入来源</label>
                  <input
                    className="form-control"
                    value={form.jointEmployerIncomeSource}
                    onChange={(e) => set("jointEmployerIncomeSource", e.target.value)}
                    placeholder="Employer name, business, pension, student funding, or other income source"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Joint Applicant Monthly Income / 月收入 (CAD)</label>
                  <input className="form-control" value={form.jointIncome} onChange={(e) => set("jointIncome", e.target.value)} placeholder="e.g. $4,000" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Joint Applicant Employer Contact / 雇主联系方式</label>
                <input className="form-control" value={form.jointEmployerContact} onChange={(e) => set("jointEmployerContact", e.target.value)} placeholder="Name, phone, email / 姓名、电话、邮箱" />
              </div>
              <div className="form-group">
                <label className="form-label">Joint Applicant Current Landlord Reference / 联名申请人当前房东参考</label>
                <textarea className="form-control" rows={3} value={form.jointLandlordReference} onChange={(e) => set("jointLandlordReference", e.target.value)} placeholder="Name, phone/email, relationship (e.g. current landlord) / 姓名、联系方式、关系" style={{ resize: "vertical" }} />
              </div>
              <div className="form-group">
                <label className="form-label">Joint Applicant Credit Information / 联名申请人信用信息</label>
                <RadioGroup name="jointCreditInfo" options={CREDIT_OPTIONS} value={form.jointCreditInfo} onChange={(v) => set("jointCreditInfo", v)} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Joint Applicant: willing to provide proof of income and/or credit report? /
                  联名申请人：是否愿意提供收入证明和/或信用报告？
                </label>
                <RadioGroup
                  name="jointProofOfIncome"
                  options={PROOF_INCOME_OPTIONS}
                  value={form.jointProofOfIncome}
                  onChange={(v) => set("jointProofOfIncome", v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Section 8: Lease / Deposit ───────────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>8. Lease &amp; Deposit / 租期与押金</h3>
          <div className="form-group">
            <label className="form-label">Desired Lease Term / 期望租期</label>
            <select className="select-control" value={form.leaseTerm} onChange={(e) => set("leaseTerm", e.target.value)}>
              <option value="">Select… / 请选择</option>
              {LEASE_TERM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Do you have funds available for the security deposit and first month's rent? / 是否已准备好押金和首月租金？
            </label>
            <RadioGroup
              name="depositFundsAvailable"
              options={DEPOSIT_OPTIONS}
              value={form.depositFundsAvailable}
              onChange={(v) => set("depositFundsAvailable", v)}
            />
          </div>
          <div style={NOTICE}>
            Under the BC Residential Tenancy Act, the security deposit is a maximum of half one month's rent.
            If you have pets, an additional pet deposit (max half one month's rent) may also be required.
            All deposits and first month's rent must be paid before move-in.
            <br />
            根据卑诗省住宅租赁法，押金最高为半个月租金。如有宠物，可能需额外支付宠物押金（最高半个月租金）。所有款项须在入住前支付。
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.87rem", lineHeight: 1.6 }}>
            <input
              type="checkbox"
              checked={form.depositAgreement}
              onChange={(e) => set("depositAgreement", e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            I understand and agree to the security deposit, first month's rent, and pet deposit requirements. /
            本人了解并同意押金、首月租金及宠物押金的相关规定。
          </label>
        </div>

        {/* ── Section 9: Pets ──────────────────────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>9. Pets / 宠物</h3>
          <div className="form-group">
            <label className="form-label">Do you have pets? / 您是否有宠物？</label>
            <RadioGroup
              name="hasPets"
              options={["No / 无宠物", "Yes / 有宠物"]}
              value={form.hasPets}
              onChange={(v) => set("hasPets", v)}
            />
          </div>
          {form.hasPets === "Yes / 有宠物" && (
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 8 }}>
              <div className="form-group">
                <label className="form-label">
                  Do you have funds available for a pet deposit? / 是否已准备好宠物押金？
                </label>
                <RadioGroup
                  name="petDepositFunds"
                  options={["Yes / 是", "No / 否"]}
                  value={form.petDepositFunds}
                  onChange={(v) => set("petDepositFunds", v)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Pet Details: Type, Breed, Weight, Name / 宠物详情：种类、品种、体重、名字
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.petDetails}
                  onChange={(e) => set("petDetails", e.target.value)}
                  placeholder="e.g. Dog, Golden Retriever, 30 lbs, Max / 例：狗，金毛，30磅，Max"
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Section 10: Tenancy History ──────────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>10. Tenancy History / 租赁历史</h3>
          <div className="form-group">
            <label className="form-label">
              Have you or any co-applicant ever been evicted or found in breach of a tenancy agreement? /
              您或联名申请人是否曾被驱逐或违反过租赁协议？
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={form.evictionHistory}
              onChange={(e) => set("evictionHistory", e.target.value)}
              placeholder={'If yes, please explain. If no, write "No". / 如有，请说明。如无，请填写"否"。'}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* ── Section 11: Smoking / Vaping / Cannabis ──────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>11. Smoking / Vaping / Cannabis / 吸烟·电子烟·大麻</h3>
          <div className="form-group">
            <label className="form-label">
              Do you or any occupant smoke, vape, use cannabis, or use recreational drugs? /
              您或任何入住人员是否吸烟、使用电子烟、大麻或娱乐性药物？
            </label>
            <RadioGroup
              name="smokesVapesCannabis"
              options={["No / 否", "Yes / 是"]}
              value={form.smokesVapesCannabis}
              onChange={(v) => set("smokesVapesCannabis", v)}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.87rem", lineHeight: 1.6 }}>
              <input
                type="checkbox"
                checked={form.noSmokingAgreement}
                onChange={(e) => set("noSmokingAgreement", e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              I agree that no smoking, vaping, cannabis use, or recreational drug use is permitted on the property. /
              本人同意在物业内禁止吸烟、使用电子烟、大麻或娱乐性药物。
            </label>
          </div>
        </div>

        {/* ── Section 12: Supporting Documents ─────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>12. Supporting Documents / 支持文件</h3>
          <div className="form-group">
            <label className="form-label">
              Are you able to provide proof of income and/or a recent credit report if requested? /
              如被要求，您是否能提供收入证明和/或近期信用报告？
            </label>
            <RadioGroup
              name="proofOfIncome"
              options={PROOF_INCOME_OPTIONS}
              value={form.proofOfIncome}
              onChange={(v) => set("proofOfIncome", v)}
            />
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Proof of income may include: pay stubs, employment letter, T4, bank statements, or NOA.
            Do not upload documents at this stage — they will be requested separately if needed.
            <br />
            收入证明可包括：工资单、雇主证明信、T4、银行流水或税务评估通知书。请勿在此上传文件，如需要将单独联系。
          </p>
        </div>

        {/* ── Section 13: Tenant Insurance ─────────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>13. Tenant Insurance / 租客保险</h3>
          <div className="form-group">
            <label className="form-label">
              Do you currently have tenant insurance? / 您目前是否持有租客保险？
            </label>
            <RadioGroup
              name="hasTenantInsurance"
              options={INSURANCE_STATUS_OPTIONS}
              value={form.hasTenantInsurance}
              onChange={(v) => set("hasTenantInsurance", v)}
            />
          </div>
          <div style={{ ...NOTICE, marginTop: 12 }}>
            Tenant insurance with a minimum $1,000,000 third-party liability coverage is required before move-in. /
            入住前须持有最低 $1,000,000 第三方责任险的租客保险。
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.87rem", lineHeight: 1.6, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={form.tenantInsuranceAgreement}
              onChange={(e) => set("tenantInsuranceAgreement", e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            I understand that tenant insurance with minimum $1M third-party liability is required before move-in. /
            本人了解入住前须持有最低 $1,000,000 第三方责任险的租客保险。
          </label>
          <div className="form-group">
            <label className="form-label">
              Can you provide proof of tenant insurance before move-in? / 能否在入住前提供租客保险证明？
            </label>
            <RadioGroup
              name="proofInsuranceBeforeMoveIn"
              options={PROOF_INSURANCE_OPTIONS}
              value={form.proofInsuranceBeforeMoveIn}
              onChange={(v) => set("proofInsuranceBeforeMoveIn", v)}
            />
          </div>
        </div>

        {/* ── Section 14: Additional Information ───────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={sTitle}>14. Additional Information / 其他信息</h3>
          <div className="form-group">
            <label className="form-label">Reason for Moving / 搬迁原因</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.reasonForMoving}
              onChange={(e) => set("reasonForMoving", e.target.value)}
              placeholder="Why are you looking to move? / 您搬迁的原因是什么？"
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Parking Request / 停车需求</label>
            <input
              className="form-control"
              value={form.parkingRequest}
              onChange={(e) => set("parkingRequest", e.target.value)}
              placeholder="Number of vehicles, type, special needs / 车辆数量、类型、特殊需求"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Other Special Requests / 其他特殊需求</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.additionalNotes}
              onChange={(e) => set("additionalNotes", e.target.value)}
              placeholder="References, special circumstances, questions, etc. / 参考人、特殊情况、问题等"
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* ── Section 15: Declaration ───────────────────────────────────────────── */}
        <div className="card mb-24" style={{ background: "#f5f8f5", border: "2px solid var(--color-border)" }}>
          <h3 style={sTitle}>15. Declaration / 申请人声明</h3>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.75, color: "var(--color-text)", marginBottom: 16 }}>
            By submitting this application, you confirm that: / 提交此申请，即代表您确认：
          </p>
          <ul style={{ fontSize: "0.84rem", lineHeight: 1.9, paddingLeft: 20, color: "var(--color-text)", marginBottom: 16 }}>
            <li>All information provided is true, accurate, and complete to the best of your knowledge. / 所提供的所有信息均属实、准确且完整。</li>
            <li>You understand that submitting this application does not guarantee approval. / 您了解提交申请并不保证获得批准。</li>
            <li>You authorize the landlord / property manager to contact the references provided. / 您授权房东或物业管理公司联系您提供的参考人。</li>
            <li>You consent to your information being used for tenancy screening purposes only. / 您同意将相关信息仅用于租赁审核目的。</li>
          </ul>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(e) => set("agreed", e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
              required
            />
            <span style={{ fontSize: "0.88rem", lineHeight: 1.6, fontWeight: 600 }}>
              I confirm the above declaration and agree to the terms. /
              本人确认以上声明并同意相关条款。 *
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

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: 12, lineHeight: 1.6 }}>
          By submitting, you agree that your information will be used for tenancy screening. /
          提交即表示同意将信息用于租赁审核。
        </p>
      </form>
    </div>
  );
}
