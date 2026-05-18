import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getApplicationById,
  getListing,
  updateApplicationStatus,
  updateApplicationNotes,
} from "../../utils/storage";
import { downloadSubmittedAppPdf } from "../../utils/rentalApplicationPdf";
import { isAdminSessionActive, readTrialAccess } from "../../utils/trialAccess";

const REVIEW_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected", "On Hold"];

const STATUS_BADGE = {
  Pending:   "badge--draft",
  Reviewing: "badge--review",
  Approved:  "badge--published",
  Rejected:  "badge--draft",
  "On Hold": "badge--review",
};

const TYPE_STYLE = {
  ok:      { bg: "#f2fbf4", border: "#b8e4c4", icon: "✅" },
  warning: { bg: "#fff8f3", border: "#f0cfa0", icon: "⏳" },
  caution: { bg: "#fff3cd", border: "#ffd97a", icon: "⚠️" },
  info:    { bg: "#f0f4ff", border: "#b3c6f5", icon: "ℹ️" },
  pass:    { bg: "#f0fdf4", border: "#86efac", icon: "✔" },
};

function fmt(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-CA"); } catch { return iso; }
}

function isSetupErr(msg) {
  return !msg ? false : (
    msg.includes("Unknown GET action") ||
    msg.includes("Unknown POST action") ||
    msg.includes("Unknown action")
  );
}

// ── Info row helper ────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
  return (
    <div className="info-item">
      <label>{label}</label>
      <p style={mono ? { fontFamily: "monospace", fontSize: "0.85rem" } : {}}>
        {value || "—"}
      </p>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="card mb-24">
      <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function parseJointEmployment(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { status: "", source: "" };
  const statusMatch = raw.match(/(?:^|\n)Status:\s*(.*?)(?:\n|$)/);
  const sourceMatch = raw.match(/(?:^|\n)Employer \/ Income Source:\s*(.*?)(?:\n|$)/);
  if (statusMatch || sourceMatch) {
    return {
      status: (statusMatch?.[1] || "").trim(),
      source: (sourceMatch?.[1] || "").trim(),
    };
  }
  return { status: raw, source: "" };
}

// ── Screening logic ────────────────────────────────────────────────────────────
function buildSummary(app, listing) {
  const flags = [];

  // Required field completeness
  const missing = [];
  if (!app.applicantName)              missing.push("Applicant Name");
  if (!app.email)                      missing.push("Email");
  if (!app.phone)                      missing.push("Phone");
  if (!app.moveInDate)                 missing.push("Move-in Date");
  if (!app.occupants)                  missing.push("Total Occupants");
  if (!app.employmentStatus)           missing.push("Employment Status");
  if (!app.monthlyIncome)              missing.push("Monthly Income");
  if (!app.creditHistory)              missing.push("Credit History");
  if (!app.landlordReference)          missing.push("Landlord Reference");
  if (missing.length > 0) {
    flags.push({ type: "warning", label: `Incomplete — ${missing.length} key field(s) missing`, text: missing.join(" · ") });
  } else {
    flags.push({ type: "ok", label: "All Key Fields Present", text: "Application appears complete." });
  }

  // Income-to-rent ratio
  const income = parseFloat(String(app.monthlyIncome || "").replace(/[^0-9.]/g, ""));
  const rent   = parseFloat(String(listing?.rent || "").replace(/[^0-9.]/g, ""));
  if (income && rent) {
    const ratio = income / rent;
    flags.push({
      type: ratio >= 2.5 ? "ok" : "caution",
      label: ratio >= 2.5 ? "Income Ratio — Meets Threshold" : "Income Ratio — Below Threshold",
      text: `${ratio.toFixed(1)}× rent — ${ratio >= 2.5 ? "meets" : "below"} 2.5× (income $${income.toLocaleString()}/mo, rent $${rent.toLocaleString()}/mo)`
    });
  } else if (app.monthlyIncome && !income) {
    flags.push({ type: "info", label: "Income Not Parseable as Number", text: `Stated: "${app.monthlyIncome}" — verify manually.` });
  }

  // Credit history
  const credit = String(app.creditHistory || "").toLowerCase();
  if (credit.includes("excellent") || credit.includes("good")) {
    flags.push({ type: "ok", label: "Credit History", text: `Self-rated: ${app.creditHistory}` });
  } else if (credit.includes("fair") || credit.includes("poor")) {
    flags.push({ type: "caution", label: "Credit History — Needs Attention", text: `Self-rated: ${app.creditHistory} — request credit report.` });
  } else if (credit.includes("no credit")) {
    flags.push({ type: "info", label: "No Credit History", text: "Applicant reports no credit history. May require co-signer or guarantor." });
  }

  // Joint applicant credit
  if (String(app.hasJointApplicant || "").includes("Yes") && app.jointName) {
    const jc = String(app.jointCreditInfo || "").toLowerCase();
    if (jc.includes("fair") || jc.includes("poor")) {
      flags.push({ type: "caution", label: "Joint Applicant Credit — Needs Attention", text: `Joint applicant ${app.jointName} self-rated: ${app.jointCreditInfo}` });
    } else if (jc) {
      flags.push({ type: "info", label: "Joint Applicant", text: `${app.jointName} — credit: ${app.jointCreditInfo || "not provided"}` });
    }
  }

  // Pets conflict
  const hasPets    = String(app.hasPets || app.pets || "").toLowerCase().startsWith("yes");
  const petsPolicy = String(listing?.pets || "").toLowerCase();
  if (hasPets && petsPolicy && (petsPolicy.includes("no pet") || petsPolicy.includes("not allow"))) {
    flags.push({ type: "caution", label: "Pets Policy Conflict", text: "Applicant has pets — listing policy may not allow pets. Confirm with landlord." });
  } else if (hasPets) {
    flags.push({ type: "info", label: "Pets Declared", text: `Pet details: ${app.petDetails || "not specified"}` });
  }

  // Eviction history
  const eviction = String(app.evictionHistory || "").toLowerCase();
  if (eviction && eviction !== "no" && eviction !== "none" && eviction.length > 2) {
    flags.push({ type: "caution", label: "Eviction / Breach History Declared", text: `Applicant response: "${app.evictionHistory}" — review carefully.` });
  }

  // Smoking
  const smokes = String(app.smokesVapesCannabis || "").toLowerCase();
  if (smokes.startsWith("yes")) {
    flags.push({ type: "caution", label: "Smoking / Cannabis Declared", text: "Applicant or occupant(s) smoke or use cannabis. Confirm no-smoking agreement was accepted." });
  }

  // Insurance
  const insStatus = String(app.hasTenantInsurance || "").toLowerCase();
  if (insStatus.includes("no, but")) {
    flags.push({ type: "info", label: "Tenant Insurance — Will Obtain", text: "Applicant will obtain before move-in. Confirm proof is provided." });
  } else if (insStatus.startsWith("no")) {
    flags.push({ type: "caution", label: "No Tenant Insurance", text: "Applicant does not have tenant insurance. $1M liability required before move-in." });
  } else if (insStatus.includes("yes")) {
    flags.push({ type: "ok", label: "Tenant Insurance — Active", text: `Status: ${app.hasTenantInsurance}` });
  }

  // Deposit funds
  const deposit = String(app.depositFundsAvailable || "").toLowerCase();
  if (deposit.startsWith("no")) {
    flags.push({ type: "caution", label: "Deposit Funds Not Ready", text: "Applicant indicated funds for security deposit / first month's rent are not yet available." });
  }

  // Move-in vs available
  if (app.moveInDate && listing?.available) {
    const moveIn    = new Date(app.moveInDate);
    const available = new Date(listing.available);
    if (!isNaN(moveIn) && !isNaN(available) && moveIn < available) {
      flags.push({ type: "caution", label: "Move-in Before Available Date", text: `Requested ${app.moveInDate}; listing available ${listing.available}.` });
    }
  }

  // Occupant count
  const occ = parseInt(app.occupants || "0");
  if (occ > 4) {
    flags.push({ type: "info", label: "High Occupant Count", text: `${occ} occupants — confirm within property limits.` });
  }

  return flags;
}

function buildFollowUpQuestions(app, listing) {
  const qs = [];
  const jointEmployment = parseJointEmployment(app.jointEmployment);

  if (!app.phone) qs.push("Can you provide a phone number where we can reach you?");
  if (!app.currentAddress) qs.push("What is your current home address?");
  if (!app.leaseTerm) qs.push("What lease term are you looking for?");
  if (!app.moveInDate) qs.push("What is your target move-in date?");
  if (!app.dateOfBirth) qs.push("Can you provide your date of birth for our records?");

  const employment = String(app.employmentStatus || "").toLowerCase();
  if (employment.includes("self")) {
    qs.push("Since you are self-employed, can you provide 3 months of bank statements or a recent Notice of Assessment?");
  }
  if (employment.includes("student")) {
    qs.push("As a student, can you provide proof of enrollment and confirm if you have a co-signer or guarantor?");
  }
  if (!app.employer && employment && !employment.includes("retired") && !employment.includes("student")) {
    qs.push("Who is your current employer or primary income source?");
  }

  const income = parseFloat(String(app.monthlyIncome || "").replace(/[^0-9.]/g, ""));
  const rent   = parseFloat(String(listing?.rent || "").replace(/[^0-9.]/g, ""));
  if (income && rent && income < rent * 2.5) {
    qs.push("Your stated monthly income appears below the typical 2.5× rent threshold. Can you provide supporting documentation or a co-signer?");
  }
  if (!app.monthlyIncome) qs.push("Can you provide your gross monthly income?");

  if (!app.landlordReference) {
    qs.push("Can you provide your current landlord's name and contact information as a reference?");
  }

  const credit = String(app.creditHistory || "").toLowerCase();
  if (credit.includes("fair") || credit.includes("poor") || credit.includes("no credit")) {
    qs.push(`Your credit history is listed as "${app.creditHistory}". Would you be able to provide a recent credit report or a co-signer/guarantor?`);
  }

  if (String(app.hasJointApplicant || "").includes("Yes") && !app.jointName) {
    qs.push("You indicated a joint applicant — please provide their full name, contact information, employment, and income details.");
  }
  if (String(app.hasJointApplicant || "").includes("Yes") && !jointEmployment.status) {
    qs.push("Please confirm the joint applicant's current employment status.");
  }
  if (String(app.hasJointApplicant || "").includes("Yes") && !jointEmployment.source) {
    qs.push("Please provide the joint applicant's employer or primary income source.");
  }

  const hasPets = String(app.hasPets || app.pets || "").toLowerCase().startsWith("yes");
  if (hasPets && !app.petDetails) {
    qs.push("Please provide full pet details: species, breed, weight, age, and whether they are house-trained.");
  }
  if (hasPets && String(app.petDepositFunds || "").toLowerCase().startsWith("no")) {
    qs.push("Pet deposit funds are not yet available. When would you be able to provide the pet deposit?");
  }

  const eviction = String(app.evictionHistory || "").toLowerCase();
  if (eviction && eviction !== "no" && eviction !== "none" && eviction.length > 2) {
    qs.push("You indicated a previous eviction or tenancy breach. Can you provide additional context or documentation regarding this?");
  }

  const insStatus = String(app.hasTenantInsurance || "").toLowerCase();
  if (insStatus.startsWith("no")) {
    qs.push("Tenant insurance with $1M third-party liability is required before move-in. Can you confirm you will obtain this, and provide proof before the move-in date?");
  }

  if (String(app.depositFundsAvailable || "").toLowerCase().startsWith("no")) {
    qs.push("When do you anticipate having the security deposit and first month's rent available?");
  }

  if (!app.additionalNotes && !app.reasonForMoving) {
    qs.push("Is there anything else you would like us to know about your application?");
  }

  const occ = parseInt(app.occupants || "0");
  if (occ > 4) {
    qs.push(`You indicated ${occ} occupants. Please confirm the full list of names and ages for all occupants.`);
  }

  return qs;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ApplicationReview() {
  const { applicationId } = useParams();
  const [app, setApp]           = useState(null);
  const [listing, setListing]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes]       = useState("");
  const [savingNotes, setSavingNotes]   = useState(false);
  const [notesSaved, setNotesSaved]     = useState(false);
  const [adminPdfBusy, setAdminPdfBusy] = useState(false);

  useEffect(() => {
    getApplicationById(applicationId)
      .then((data) => {
        setApp(data);
        setNotes(data?.internalNotes || "");
        if (data?.listingId) getListing(data.listingId).then(setListing).catch(() => {});
      })
      .catch((e) => setError(e.message || "Failed to load application."))
      .finally(() => setLoading(false));
  }, [applicationId]);

  async function handleStatusChange(newStatus) {
    if (!app) return;
    setSavingStatus(true);
    setMessage("");
    try {
      await updateApplicationStatus(app.recordId, newStatus);
      setApp((prev) => ({ ...prev, reviewStatus: newStatus }));
      setMessage(`Status updated to "${newStatus}".`);
    } catch (e) {
      setMessage("Save failed: " + (e.message || "unknown error"));
    } finally { setSavingStatus(false); }
  }

  async function handleSaveNotes() {
    if (!app) return;
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await updateApplicationNotes(app.recordId, notes);
      setApp((prev) => ({ ...prev, internalNotes: notes }));
      setNotesSaved(true);
      window.setTimeout(() => setNotesSaved(false), 2500);
    } catch (e) {
      setMessage("Notes save failed: " + (e.message || "unknown error"));
    } finally { setSavingNotes(false); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading…</div>;

  if (!app) {
    const setupError = isSetupErr(error);
    return (
      <div>
        <div className="flex-between mb-24">
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Application Review / 申请审核</h1>
            <p className="text-muted text-sm" style={{ fontFamily: "monospace" }}>{applicationId}</p>
          </div>
          <Link to="/admin/leads" className="btn btn--ghost btn--sm">← Back to Leads</Link>
        </div>
        {setupError ? (
          <div className="notice notice--warm">
            <h4>Apps Script Redeploy Required / 需要重新部署 Apps Script</h4>
            <p style={{ marginBottom: 8 }}>
              The <code>getApplicationById</code> action is not yet deployed. Once the Apps Script
              is redeployed, this page will load the full application record for{" "}
              <code>{applicationId}</code>.
            </p>
            <p style={{ opacity: 0.86 }}>
              <code>getApplicationById</code> 函数尚未部署。完成 Apps Script 重新部署后，此页面将正确加载申请记录。
            </p>
          </div>
        ) : (
          <div className="notice notice--error">
            <h4>Application Not Found</h4>
            <p>{error || `No record found for "${applicationId}".`}</p>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <Link to="/admin/leads" className="btn btn--ghost btn--sm">← Back to Leads</Link>
        </div>
      </div>
    );
  }

  const summary           = buildSummary(app, listing);
  const followUpQuestions = buildFollowUpQuestions(app, listing);
  const hasJoint          = String(app.hasJointApplicant || "").includes("Yes");
  const jointEmployment   = parseJointEmployment(app.jointEmployment);

  // ── PDF access control ────────────────────────────────────────────────────
  // Admin: always allowed.
  // Trial: only if their email matches the listing's ownerEmail.
  //   - If listing not loaded yet: deny until resolved (avoid flash of allowed state).
  //   - If listing has no ownerEmail field: grant (can't verify, benefit of the doubt).
  const _isAdmin      = isAdminSessionActive();
  const _trialSession = readTrialAccess();
  const _isTrial      = !!_trialSession && !_isAdmin;
  const canAccessSubmittedPdf = _isAdmin
    || !_isTrial
    || (!listing && false)  // listing still loading → hold off
    || (listing && !listing.ownerEmail)  // ownerEmail not set → can't verify, allow
    || (listing?.ownerEmail?.toLowerCase() === (_trialSession?.email || "").toLowerCase());

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Application Review / 申请审核</h1>
          <p className="text-muted text-sm" style={{ fontFamily: "monospace" }}>{app.recordId}</p>
        </div>
        <div className="flex gap-8">
          <Link to="/admin/leads" className="btn btn--ghost btn--sm">← Leads</Link>
          {app.pdfUrl && canAccessSubmittedPdf && (
            <a href={app.pdfUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              Download PDF
            </a>
          )}
        </div>
      </div>

      {message && <div className="notice notice--sage mb-24"><p>{message}</p></div>}

      {/* ── 1. Review Status ──────────────────────────────────────────────────── */}
      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
              Manual Review Status / 人工审核状态
            </h3>
            <span className={`badge ${STATUS_BADGE[app.reviewStatus] || "badge--draft"}`}>
              {app.reviewStatus || "Pending"}
            </span>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: 6 }}>
              Final decision is always made by the landlord. / 最终决定由房东人工确认。
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {savingStatus && <span className="text-muted text-sm">Saving…</span>}
            <select
              className="select-control"
              value={app.reviewStatus || "Pending"}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
            >
              {REVIEW_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. Applicant Information ──────────────────────────────────────────── */}
      <SectionCard title="Applicant Information / 申请人信息">
        <div className="info-grid">
          <InfoRow label="Full Name / 姓名"           value={app.applicantName} />
          <InfoRow label="Email / 邮箱"               value={app.email} />
          <InfoRow label="Phone / 电话"               value={app.phone} />
          <InfoRow label="Date of Birth / 出生日期"   value={app.dateOfBirth} />
          <InfoRow label="Current Address / 现居地址" value={app.currentAddress} />
          <InfoRow label="WeChat / 微信号"             value={app.wechat} />
        </div>
      </SectionCard>

      {/* ── 3. Employment / Income ────────────────────────────────────────────── */}
      <SectionCard title="Employment / Income / 就业与收入">
        <div className="info-grid">
          <InfoRow label="Employment Status / 就业状态"       value={app.employmentStatus} />
          <InfoRow label="Employer / Income Source / 雇主来源" value={app.employer} />
          <InfoRow label="Monthly Income / 月收入"            value={app.monthlyIncome} />
        </div>
        {listing?.rent && (
          <p style={{ marginTop: 10, fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            Listing rent: <strong>${Number(listing.rent).toLocaleString()}/mo</strong>
            {(() => {
              const inc = parseFloat(String(app.monthlyIncome || "").replace(/[^0-9.]/g, ""));
              const r   = parseFloat(String(listing.rent || "").replace(/[^0-9.]/g, ""));
              if (inc && r) return ` · Income ratio: ${(inc/r).toFixed(1)}×`;
              return "";
            })()}
          </p>
        )}
      </SectionCard>

      {/* ── 4. Reference & Credit ─────────────────────────────────────────────── */}
      <SectionCard title="Landlord Reference &amp; Credit / 房东参考与信用">
        <div className="info-grid">
          <InfoRow label="Landlord / Property Mgr Reference / 房东参考" value={app.landlordReference} />
          <InfoRow label="Credit History Self-Rating / 信用记录自评"    value={app.creditHistory} />
        </div>
      </SectionCard>

      {/* ── 5. Move-in & Occupancy ────────────────────────────────────────────── */}
      <SectionCard title="Move-in &amp; Occupancy / 入住与居住人数">
        <div className="info-grid">
          <InfoRow label="Preferred Move-in Date / 期望入住日期"   value={app.moveInDate} />
          <InfoRow label="Desired Lease Term / 期望租期"           value={app.leaseTerm} />
          <InfoRow label="Total Occupants / 总人数"                value={app.occupants} />
          <InfoRow label="Adults (18+) / 成年人"                   value={app.adults} />
          <InfoRow label="Minors (under 18) / 未成年人"            value={app.minors} />
          <InfoRow label="All Occupants Names &amp; Ages / 所有入住人员" value={app.occupantNamesAges} />
        </div>
      </SectionCard>

      {/* ── 6. Joint Applicant ────────────────────────────────────────────────── */}
      <SectionCard title="Joint Applicant / Co-Applicant / 联名申请人">
        <div className="info-grid">
          <InfoRow label="Has Joint Applicant / 是否有联名申请人" value={app.hasJointApplicant} />
        </div>
        {hasJoint && (
          <div style={{ marginTop: 14, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
            <div className="info-grid">
              <InfoRow label="Joint Applicant Name / 联名申请人姓名"    value={app.jointName} />
              <InfoRow label="Joint Applicant Address / 地址"           value={app.jointAddress} />
              <InfoRow label="Joint Applicant Phone / 电话"             value={app.jointPhone} />
              <InfoRow label="Joint Applicant Email / 邮箱"             value={app.jointEmail} />
              <InfoRow label="Joint Applicant DOB / 出生日期"           value={app.jointDob} />
              <InfoRow label="Joint Employment Status / 就业状态"       value={jointEmployment.status} />
              <InfoRow label="Joint Employer / Income Source / 雇主或收入来源" value={jointEmployment.source} />
              <InfoRow label="Joint Applicant Monthly Income / 月收入"  value={app.jointIncome} />
              <InfoRow label="Joint Employer Contact / 雇主联系方式"    value={app.jointEmployerContact} />
              <InfoRow label="Joint Landlord Reference / 房东参考"      value={app.jointLandlordReference} />
              <InfoRow label="Joint Credit Information / 信用信息"      value={app.jointCreditInfo} />
              <InfoRow label="Joint Proof of Income / Credit Report / 收入证明或信用报告" value={app.jointProofOfIncome} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── 7. Lease & Deposit ───────────────────────────────────────────────── */}
      <SectionCard title="Lease &amp; Deposit / 租期与押金">
        <div className="info-grid">
          <InfoRow label="Deposit &amp; First Month Funds Ready / 押金首月准备好" value={app.depositFundsAvailable} />
          <InfoRow label="Deposit Agreement / 押金协议"                            value={app.depositAgreement} />
        </div>
      </SectionCard>

      {/* ── 8. Pets ──────────────────────────────────────────────────────────── */}
      <SectionCard title="Pets / 宠物">
        <div className="info-grid">
          <InfoRow label="Has Pets / 是否有宠物"                 value={app.hasPets} />
          <InfoRow label="Pet Deposit Funds Ready / 宠物押金准备好" value={app.petDepositFunds} />
          <InfoRow label="Pet Details / 宠物详情"               value={app.petDetails} />
        </div>
      </SectionCard>

      {/* ── 9. Tenancy History ───────────────────────────────────────────────── */}
      <SectionCard title="Tenancy History / 租赁历史">
        <p style={{ fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {app.evictionHistory || "—"}
        </p>
      </SectionCard>

      {/* ── 10. Smoking / Cannabis ───────────────────────────────────────────── */}
      <SectionCard title="Smoking / Vaping / Cannabis / 吸烟·电子烟·大麻">
        <div className="info-grid">
          <InfoRow label="Smokes / Vapes / Uses Cannabis / 是否吸烟或使用大麻" value={app.smokesVapesCannabis} />
          <InfoRow label="No-Smoking Agreement / 不吸烟协议"                    value={app.noSmokingAgreement} />
        </div>
      </SectionCard>

      {/* ── 11. Documents & Insurance ────────────────────────────────────────── */}
      <SectionCard title="Documents &amp; Insurance / 文件与保险">
        <div className="info-grid">
          <InfoRow label="Can Provide Proof of Income / 可提供收入证明"             value={app.proofOfIncome} />
          <InfoRow label="Current Tenant Insurance / 当前是否持有租客保险"          value={app.hasTenantInsurance} />
          <InfoRow label="Tenant Insurance Agreement / 租客保险协议"               value={app.tenantInsuranceAgreement} />
          <InfoRow label="Proof of Insurance Before Move-in / 入住前可提供保险证明" value={app.proofInsuranceBeforeMoveIn} />
        </div>
      </SectionCard>

      {/* ── 12. Additional Information ────────────────────────────────────────── */}
      <SectionCard title="Additional Information / 其他信息">
        <div className="info-grid">
          <InfoRow label="Reason for Moving / 搬迁原因"   value={app.reasonForMoving} />
          <InfoRow label="Parking Request / 停车需求"     value={app.parkingRequest} />
          <InfoRow label="Other Notes / 其他备注"         value={app.additionalNotes} />
        </div>
      </SectionCard>

      {/* ── 13. Application PDF ───────────────────────────────────────────────── */}
      <SectionCard title="Application PDF / 申请表 PDF">
        {canAccessSubmittedPdf ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              {app.pdfUrl && (
                <a href={app.pdfUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                  Open PDF (Drive) →
                </a>
              )}
              {/* Client-side PDF generation — admin and listing-owner trial users only */}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={adminPdfBusy}
                onClick={() => {
                  if (adminPdfBusy) return;
                  setAdminPdfBusy(true);
                  try {
                    const data = {
                      listingId:             app.listingId,
                      listingAddress:        listing?.address || "",
                      listingRent:           listing?.rent ? `$${Number(listing.rent).toLocaleString()}/mo` : "",
                      applicantName:         app.applicantName,
                      email:                 app.email,
                      phone:                 app.phone,
                      dateOfBirth:           app.dateOfBirth,
                      currentAddress:        app.currentAddress,
                      wechat:                app.wechat,
                      employmentStatus:      app.employmentStatus,
                      employer:              app.employer,
                      monthlyIncome:         app.monthlyIncome,
                      moveInDate:            app.moveInDate,
                      leaseTerm:             app.leaseTerm,
                      occupants:             app.occupants,
                      adults:                app.adults,
                      minors:                app.minors,
                      occupantNamesAges:     app.occupantNamesAges,
                      landlordReference:     app.landlordReference,
                      creditHistory:         app.creditHistory,
                      hasPets:               app.hasPets,
                      petDetails:            app.petDetails,
                      parkingRequest:        app.parkingRequest,
                      hasTenantInsurance:    app.hasTenantInsurance,
                      depositFundsAvailable: app.depositFundsAvailable,
                      reasonForMoving:       app.reasonForMoving,
                      additionalNotes:       app.additionalNotes,
                      recordId:              app.recordId,
                      submittedAt:           app.submittedAt,
                    };
                    downloadSubmittedAppPdf(data, app.recordId, app.recordId);
                  } finally {
                    window.setTimeout(() => setAdminPdfBusy(false), 800);
                  }
                }}
              >
                {adminPdfBusy ? "Preparing…" : "📄 Download Submitted Application / 下载已提交申请表"}
              </button>
            </div>
            {app.pdfUrl ? (
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                Drive PDF: stored in listing folder under <code>Applications/</code>
              </p>
            ) : (
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                No Drive PDF yet — use &ldquo;Generate PDF&rdquo; to create a local copy from the application data above.
                <br />
                尚无 Drive PDF — 可点击"生成申请表 PDF"根据当前申请数据在本地生成。
              </p>
            )}
          </>
        ) : (
          <div style={{ background: "#fff8f3", border: "1px solid #f0cfa0", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#7a4f00", marginBottom: 4 }}>
              Access Restricted / 访问受限
            </p>
            <p style={{ fontSize: "0.82rem", color: "#7a5a2f", lineHeight: 1.65 }}>
              Submitted application PDFs are only accessible by admins and the listing owner.
              This application is connected to listing <code>{app.listingId}</code>, which does not match your trial account.
              <br />
              申请表 PDF 仅供管理员及对应房源的拥有者查看。此申请所属房源与您的试用账号不匹配。
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── 14. Screening Summary ─────────────────────────────────────────────── */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
          Screening Summary / 初筛摘要
        </h3>
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {summary.map(({ type, label, text }, i) => {
            const s = TYPE_STYLE[type] || TYPE_STYLE.info;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8 }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
          Rule-based checks only — no AI, no automated decisions. All final decisions are made by the landlord. /
          仅为规则性初步整理，不自动批准或拒绝。所有最终决定由房东人工确认。
        </p>
      </div>

      {/* ── 15. Missing Information ───────────────────────────────────────────── */}
      {(() => {
        const missing = [];
        if (!app.applicantName)     missing.push("Full legal name");
        if (!app.email)             missing.push("Email address");
        if (!app.phone)             missing.push("Phone number");
        if (!app.dateOfBirth)       missing.push("Date of birth");
        if (!app.currentAddress)    missing.push("Current home address");
        if (!app.moveInDate)        missing.push("Desired move-in date");
        if (!app.leaseTerm)         missing.push("Preferred lease term");
        if (!app.occupants)         missing.push("Number of occupants");
        if (!app.employmentStatus)  missing.push("Employment status");
        if (!app.employer)          missing.push("Employer or income source");
        if (!app.monthlyIncome)     missing.push("Monthly income");
        if (!app.landlordReference) missing.push("Landlord reference");
        if (!app.creditHistory)     missing.push("Credit history self-rating");
        if (hasJoint && !app.jointName)                  missing.push("Joint applicant full legal name");
        if (hasJoint && !app.jointAddress)               missing.push("Joint applicant current address");
        if (hasJoint && !app.jointPhone)                 missing.push("Joint applicant phone number");
        if (hasJoint && !app.jointEmail)                 missing.push("Joint applicant email address");
        if (hasJoint && !app.jointDob)                   missing.push("Joint applicant date of birth");
        if (hasJoint && !jointEmployment.status)         missing.push("Joint applicant employment status");
        if (hasJoint && !jointEmployment.source)         missing.push("Joint applicant employer or income source");
        if (hasJoint && !app.jointIncome)                missing.push("Joint applicant monthly income");
        if (hasJoint && !app.jointEmployerContact)       missing.push("Joint applicant employer contact");
        if (hasJoint && !app.jointLandlordReference)     missing.push("Joint applicant landlord reference");
        if (hasJoint && !app.jointCreditInfo)            missing.push("Joint applicant credit information");
        if (hasJoint && !app.jointProofOfIncome)         missing.push("Joint applicant proof of income / credit report answer");
        if (missing.length === 0) return null;
        return (
          <div className="card mb-24">
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 12 }}>
              Missing Information / 缺失信息
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
              {missing.map((m) => <li key={m} style={{ fontSize: "0.88rem", color: "#a05a00" }}>{m}</li>)}
            </ul>
          </div>
        );
      })()}

      {/* ── 16. Suggested Follow-up Questions ────────────────────────────────── */}
      {followUpQuestions.length > 0 && (
        <div className="card mb-24">
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
            Suggested Follow-up Questions / 建议跟进问题
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 12 }}>
            Based on the application — copy and send to applicant if needed. / 根据申请内容自动生成，可根据需要复制发送。
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10 }}>
            {followUpQuestions.map((q, i) => (
              <li key={i} style={{ fontSize: "0.88rem", lineHeight: 1.6 }}>{q}</li>
            ))}
          </ol>
        </div>
      )}

      {/* ── 17. Internal Notes ────────────────────────────────────────────────── */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 6 }}>
          Internal Notes / 内部备注
        </h3>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 10 }}>
          Admin-only — not visible to applicant. Saved to the sheet. / 仅管理员可见，保存至表格。
        </p>
        <textarea
          className="form-control"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Scheduled follow-up call. Income docs requested."
          style={{ resize: "vertical", marginBottom: 10 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={handleSaveNotes} disabled={savingNotes}>
            {savingNotes ? "Saving…" : "Save Notes / 保存备注"}
          </button>
          {notesSaved && <span style={{ fontSize: "0.82rem", color: "var(--color-primary)" }}>✅ Saved</span>}
        </div>
      </div>

      {/* ── 18. Record Metadata ───────────────────────────────────────────────── */}
      <SectionCard title="Record Details / 记录信息">
        <div className="info-grid">
          <InfoRow label="Record ID"    value={app.recordId}   mono />
          <InfoRow label="Listing ID"   value={app.listingId}  mono />
          <InfoRow label="Submitted At" value={fmt(app.submittedAt)} />
          <InfoRow label="Updated At"   value={fmt(app.updatedAt)} />
        </div>
      </SectionCard>

      {/* Nav */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/admin/leads" className="btn btn--ghost btn--sm">← Back to Leads</Link>
        {app.listingId && (
          <Link to={`/admin/listing/${app.listingId}`} className="btn btn--ghost btn--sm">
            View Listing →
          </Link>
        )}
      </div>
    </div>
  );
}
