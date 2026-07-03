import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLang } from "../../contexts/LangContext";
import {
  getApplicationById,
  getListing,
  generateDraftScreeningReport,
  analyzeApplicantSupportDocuments,
  updateApplicationRetentionStatus,
  cleanupExpiredApplicationsPreview,
  deleteExpiredApplicantSensitiveFiles,
  getListingSubfolderFiles,
  requestSupportingDocuments,
  resendSupportingDocumentsEmail,
  updateApplicationStatus,
  updateApplicationNotes,
} from "../../utils/storage";
import { downloadSubmittedAppPdf } from "../../utils/rentalApplicationPdf";
import { isAdminSessionActive, readTrialAccess } from "../../utils/trialAccess";
import { downloadFullApplicantAuditReport } from "../../utils/applicantScreeningReports";
import {
  formatSupportDocumentStatus,
  formatSupportDocumentTypes,
  matchSupportDocumentsForApplicant,
} from "../../utils/applicantSupportDocuments";

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

function renderInlineMarkdown(text) {
  const parts = String(text || "").split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    return (
      <span key={index} style={{ fontWeight: 600 }}>
        {match[1]}
      </span>
    );
  });
}

function MarkdownReport({ markdown }) {
  const lines = String(markdown || "").split(/\r?\n/);
  return (
    <div style={{
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      padding: 18,
      background: "#fffdf8",
      lineHeight: 1.55,
      maxHeight: 620,
      overflow: "auto",
    }}>
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} style={{ height: 8 }} />;
        if (line.startsWith("# ")) {
          return <h2 key={index} style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 12px" }}>{line.slice(2)}</h2>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={index} style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-primary)", margin: "18px 0 8px" }}>{line.slice(3)}</h3>;
        }
        if (line.startsWith("  - ")) {
          return <p key={index} style={{ margin: "3px 0 3px 20px", color: "var(--color-text-muted)" }}>- {renderInlineMarkdown(line.slice(4))}</p>;
        }
        if (line.startsWith("- ")) {
          return <p key={index} style={{ margin: "4px 0 4px 10px" }}>- {renderInlineMarkdown(line.slice(2))}</p>;
        }
        return <p key={index} style={{ margin: "5px 0" }}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function getDocumentRequestBlocker(app) {
  if (String(app?.documentRequestSent || "").toLowerCase() === "yes") {
    return "Document request already sent.";
  }
  if (!app?.email) return "Applicant email is missing.";
  if (!app?.listingId) return "Listing ID is missing.";
  return "";
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
  const lang = useLang();
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
  const [requestingDocs, setRequestingDocs] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [fullAuditBusy, setFullAuditBusy] = useState(false);
  const [fullAuditReportLink, setFullAuditReportLink] = useState(null);
  const [fullAuditReport, setFullAuditReport] = useState(null);
  const [fullAuditDebug, setFullAuditDebug] = useState(null);
  const [supportFiles, setSupportFiles] = useState([]);
  const [supportFilesLoading, setSupportFilesLoading] = useState(false);
  const [retentionBusy, setRetentionBusy] = useState("");
  const [retentionPreview, setRetentionPreview] = useState(null);

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

  useEffect(() => {
    const listingId = app?.listingId || listing?.id;
    if (!listingId) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setSupportFilesLoading(true);
        return getListingSubfolderFiles("", "Supporting Documents", listingId);
      })
      .then((result) => {
        if (active) setSupportFiles(result?.files || []);
      })
      .catch(() => {
        if (active) setSupportFiles([]);
      })
      .finally(() => {
        if (active) setSupportFilesLoading(false);
      });
    return () => { active = false; };
  }, [app?.listingId, listing?.id]);

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

  async function handleRequestDocuments() {
    if (!app?.recordId) return;
    const ok = window.confirm(`Send supporting document upload link to ${app.email}?`);
    if (!ok) return;
    setRequestingDocs(true);
    setMessage("");
    try {
      const result = await requestSupportingDocuments(app.recordId);
      setApp((prev) => ({
        ...prev,
        shortlistStatus: result?.shortlistStatus || "Shortlisted",
        documentRequestSent: result?.documentRequestSent || "Yes",
        documentRequestSentAt: result?.documentRequestSentAt || new Date().toISOString(),
        uploadToken: result?.uploadToken || prev?.uploadToken,
        uploadTokenExpiresAt: result?.uploadTokenExpiresAt || prev?.uploadTokenExpiresAt,
        uploadLink: result?.uploadLink || prev?.uploadLink,
        supportDocumentFolderUrl: result?.supportDocumentFolderUrl || prev?.supportDocumentFolderUrl,
        documentUploadStatus: result?.documentUploadStatus || "Pending",
      }));
      setMessage("Supporting document request sent.");
    } catch (e) {
      setMessage("Document request failed: " + (e.message || "unknown error"));
    } finally {
      setRequestingDocs(false);
    }
  }

  async function handleResendDocumentsEmail() {
    if (!app?.recordId) return;
    const ok = window.confirm(`Resend supporting document upload link to ${app.email}?`);
    if (!ok) return;
    setRequestingDocs(true);
    setMessage("");
    try {
      const result = await resendSupportingDocumentsEmail(app.recordId);
      setApp((prev) => ({
        ...prev,
        documentRequestSent: result?.documentRequestSent || "Yes",
        documentRequestSentAt: result?.documentRequestSentAt || prev?.documentRequestSentAt,
      }));
      setMessage(`Supporting document email resent to ${result?.emailTo || app.email}.`);
    } catch (e) {
      setMessage("Resend failed: " + (e.message || "unknown error"));
    } finally {
      setRequestingDocs(false);
    }
  }

  async function handleGenerateDraftReport() {
    if (!app?.recordId) return;
    const ok = window.confirm("Generate an AI draft screening report for internal review?");
    if (!ok) return;
    setGeneratingReport(true);
    setMessage("");
    try {
      const result = await generateDraftScreeningReport(app.recordId);
      setApp((prev) => ({
        ...prev,
        screeningReportStatus: result?.screeningReportStatus || "Draft Generated",
        screeningReportGeneratedAt: result?.screeningReportGeneratedAt || new Date().toISOString(),
        screeningReportUrl: result?.screeningReportUrl || prev?.screeningReportUrl,
        screeningReportMarkdown: result?.screeningReportMarkdown || prev?.screeningReportMarkdown,
      }));
      setMessage("AI draft screening report generated.");
    } catch (e) {
      setMessage("Screening report failed: " + (e.message || "unknown error"));
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleGenerateFullAuditReport() {
    if (!app?.recordId) return;
    setFullAuditBusy(true);
    setFullAuditReportLink(null);
    setFullAuditReport(null);
    setFullAuditDebug(null);
    try {
      console.info("[Generate Full Applicant Audit Report clicked]", { listingId: app.listingId || listing?.id, recordId: app.recordId });
      let documentAnalysis;
      try {
        documentAnalysis = await analyzeApplicantSupportDocuments({
          listingId: app.listingId || listing?.id,
          recordId: app.recordId,
          applicantName: app.applicantName,
          application: app,
        });
      } catch (analysisError) {
        documentAnalysis = {
          files: supportSummary.files.map((file) => ({
            ...file,
            extractionStatus: "Manual verification required",
            extractionMethod: analysisError?.message || "Document analysis unavailable",
            snippet: "",
          })),
          extractedSummary: {
            identity: { found: false, notes: ["Photo ID was not automatically verified. Manual verification required."] },
            income: { found: false, confidence: "Low", notes: ["Income document was not automatically verified. Manual verification required."] },
            employment: { found: false, notes: ["Employment details were not automatically verified. Manual verification required."] },
            bank: { found: false, notes: ["Bank statement was not automatically verified. Manual verification required."] },
            credit: { found: false, notes: ["Credit/background document was not automatically verified. Manual verification required."] },
            reference: { found: false, notes: ["Reference document was not automatically verified. Manual verification required."] },
            inconsistencies: ["Potential missing item: document analysis could not be completed. Manual verification required."],
            recommendedDecision: "Request additional documents",
          },
          limitations: [`Document analysis unavailable: ${analysisError?.message || "unknown error"}. Manual verification required.`],
          debug: {
            recordId: app.recordId,
            matchedDocumentCount: supportSummary.count,
            documents: supportSummary.files.map((file) => ({
              name: file.name,
              type: file.type,
              readStatus: "Manual verification required",
              method: analysisError?.message || "Document analysis unavailable",
              ocrFallback: false,
              manualVerificationRequired: true,
            })),
          },
        };
      }
      const result = await downloadFullApplicantAuditReport({ applicant: app, listing, lang, supportFiles, documentAnalysis });
      const debugPayload = {
        recordId: app.recordId,
        matchedDocumentCount: documentAnalysis?.debug?.matchedDocumentCount ?? supportSummary.count,
        documents: documentAnalysis?.debug?.documents || [],
        manualVerificationRequired: Boolean((documentAnalysis?.limitations || []).length),
        reportSaved: Boolean(result?.saveResult?.url),
        saveResult: result?.saveResult || null,
      };
      if (_isAdmin) {
        console.info("[Full Applicant Audit Debug]", debugPayload);
        setFullAuditDebug(debugPayload);
      }
      setFullAuditReport(result || null);
      if (result?.saveResult?.url) {
        setFullAuditReportLink({ url: result.saveResult.url, fileName: result.saveResult.fileName || result.fileName });
      }
      setMessage(result?.saveResult?.url
        ? (lang === "zh" ? "完整申请人审核报告已保存到 Google Drive。" : "Full applicant audit report saved to Google Drive.")
        : (lang === "zh" ? "完整申请人审核报告已打开，可保存为 PDF。" : "Full applicant audit report opened for PDF download."));
    } catch (e) {
      setMessage((lang === "zh" ? "完整审核报告生成失败：" : "Full audit report failed: ") + (e.message || "unknown error"));
    } finally {
      setFullAuditBusy(false);
    }
  }

  async function handleRetentionStatus(retentionStatus) {
    if (!app?.recordId) return;
    const ok = window.confirm(`Set data retention status to "${retentionStatus}"?`);
    if (!ok) return;
    setRetentionBusy(retentionStatus);
    setMessage("");
    try {
      const result = await updateApplicationRetentionStatus(app.recordId, retentionStatus);
      setApp((prev) => ({
        ...prev,
        dataRetentionStatus: result?.dataRetentionStatus || prev?.dataRetentionStatus,
        retentionExpiryDate: result?.retentionExpiryDate || "",
        retentionAction: result?.retentionAction || prev?.retentionAction,
        retentionNotes: result?.retentionNotes || prev?.retentionNotes,
      }));
      setMessage(`Data retention status updated to ${result?.dataRetentionStatus || retentionStatus}.`);
    } catch (e) {
      setMessage("Retention update failed: " + (e.message || "unknown error"));
    } finally {
      setRetentionBusy("");
    }
  }

  async function handleRetentionPreview() {
    setRetentionBusy("preview");
    setMessage("");
    try {
      const result = await cleanupExpiredApplicationsPreview();
      setRetentionPreview(result);
      setMessage(`Expired retention preview found ${result?.count || 0} record(s).`);
    } catch (e) {
      setMessage("Retention preview failed: " + (e.message || "unknown error"));
    } finally {
      setRetentionBusy("");
    }
  }

  async function handleDeleteSensitiveFiles() {
    if (!app?.recordId) return;
    const ok = window.confirm("This will delete sensitive applicant files from Google Drive. The application record will remain for audit purposes. Continue?");
    if (!ok) return;
    setRetentionBusy("delete");
    setMessage("");
    try {
      const result = await deleteExpiredApplicantSensitiveFiles(app.recordId);
      setApp((prev) => ({
        ...prev,
        supportDocumentFolderUrl: "",
        uploadLink: "",
        uploadToken: "",
        uploadTokenExpiresAt: "",
        documentUploadStatus: "Sensitive files deleted",
        sensitiveFilesDeletedAt: result?.sensitiveFilesDeletedAt || new Date().toISOString(),
        retentionAction: result?.retentionAction || "Sensitive files deleted",
      }));
      setMessage("Sensitive applicant files were moved to trash. Application row kept for audit.");
    } catch (e) {
      setMessage("Sensitive file cleanup failed: " + (e.message || "unknown error"));
    } finally {
      setRetentionBusy("");
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading…</div>;

  if (!app) {
    const setupError = isSetupErr(error);
    return (
      <div>
        <div className="flex-between mb-24">
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{lang === "zh" ? "申请审核" : "Application Review"}</h1>
            <p className="text-muted text-sm" style={{ fontFamily: "monospace" }}>{applicationId}</p>
          </div>
          <Link to="/admin/leads" className="btn btn--ghost btn--sm">← Back to Leads</Link>
        </div>
        {setupError ? (
          <div className="notice notice--warm">
            <h4>{lang === "zh" ? "需要重新部署 Apps Script" : "Apps Script Redeploy Required"}</h4>
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
  const canRequestDocs = Boolean(
    app.email &&
    app.listingId &&
    String(app.documentRequestSent || "").toLowerCase() !== "yes"
  );
  const canResendDocsEmail = Boolean(
    app.email &&
    app.uploadLink &&
    String(app.documentRequestSent || "").toLowerCase() === "yes"
  );
  const canGenerateDraftReport = Boolean(
    app.supportDocumentFolderUrl &&
    ["uploaded", "complete"].includes(String(app.documentUploadStatus || "").toLowerCase())
  );
  const supportSummary = matchSupportDocumentsForApplicant(app, supportFiles);
  const canGenerateFullAuditReport = supportSummary.available;
  const documentRequestBlocker = getDocumentRequestBlocker(app);

  // ── PDF access control ────────────────────────────────────────────────────
  // Admin: always allowed.
  // Trial: only if their email matches the listing's ownerEmail.
  //   - If listing not loaded yet: deny until resolved (avoid flash of allowed state).
  //   - If listing has no ownerEmail field: grant (can't verify, benefit of the doubt).
  const _isAdmin      = isAdminSessionActive();
  const _trialSession = readTrialAccess();
  const _isTrial      = !!_trialSession && !_isAdmin;
  const canSeeInternalDriveLinks = _isAdmin;
  const canGenerateApplicantReports = Boolean(_isAdmin || _isTrial);
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
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem" }}>{lang === "zh" ? "申请审核" : "Application Review"}</h1>
          <p className="text-muted text-sm" style={{ fontFamily: "monospace" }}>{app.recordId}</p>
        </div>
        <div className="flex gap-8">
          <Link to="/admin/leads" className="btn btn--ghost btn--sm">← Leads</Link>
          {_isAdmin && canRequestDocs && (
            <button
              type="button"
              className="btn btn--sm"
              disabled={requestingDocs}
              onClick={handleRequestDocuments}
            >
              {requestingDocs ? "Sending..." : "Request Supporting Documents"}
            </button>
          )}
          {_isAdmin && canResendDocsEmail && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={requestingDocs}
              onClick={handleResendDocumentsEmail}
            >
              {requestingDocs ? "Sending..." : "Resend Email"}
            </button>
          )}
          {canSeeInternalDriveLinks && app.pdfUrl && canAccessSubmittedPdf && (
            <a href={app.pdfUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              Download PDF
            </a>
          )}
        </div>
      </div>

      {message && <div className="notice notice--sage mb-24"><p>{message}</p></div>}
      {fullAuditReport && (
        <div className="notice notice--sage mb-24">
          <p style={{ fontWeight: 700, marginBottom: 8 }}>
            {lang === "zh" ? "完整申请人审核报告已生成" : "Full Applicant Audit Report generated"}
          </p>
          <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
            {fullAuditReportLink?.url
              ? (lang === "zh" ? "状态：已保存到安全 Drive 归档。" : "Status: Saved to secure Drive archive.")
              : (lang === "zh" ? "状态：本地生成，可下载 PDF。" : "Status: Generated locally, PDF download available.")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => {
              const win = window.open("", "_blank", "noopener,noreferrer");
              if (win) {
                win.document.open();
                win.document.write(fullAuditReport.html);
                win.document.close();
              }
            }}>
              {lang === "zh" ? "查看报告" : "View Report"}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => {
              const win = window.open("", "_blank", "noopener,noreferrer");
              if (win) {
                win.document.open();
                win.document.write(fullAuditReport.html);
                win.document.close();
                win.focus();
                setTimeout(() => win.print(), 350);
              }
            }}>
              {lang === "zh" ? "下载 PDF" : "Download PDF"}
            </button>
            {canSeeInternalDriveLinks && fullAuditReportLink?.url && (
              <a href={fullAuditReportLink.url} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                Drive
              </a>
            )}
          </div>
        </div>
      )}
      {_isAdmin && fullAuditDebug && (
        <div className="card mb-24" style={{ borderColor: "#d7e5da", background: "#fbfdf9" }}>
          <h3 style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 10 }}>
            Full Audit Debug
          </h3>
          <div className="info-grid">
            <InfoRow label="Record ID" value={fullAuditDebug.recordId} mono />
            <InfoRow label="Supporting Documents Found" value={String(fullAuditDebug.matchedDocumentCount || 0)} />
            <InfoRow label="Manual Verification Required" value={fullAuditDebug.manualVerificationRequired ? "Yes" : "No"} />
            <InfoRow label="Report Saved" value={fullAuditDebug.reportSaved ? "Yes" : "No"} />
          </div>
          {(fullAuditDebug.documents || []).length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {fullAuditDebug.documents.map((doc, index) => (
                <div key={`${doc.name}-${index}`} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 10, background: "#fff" }}>
                  <strong>{doc.type || "Other"}:</strong> {doc.name || "Document"}
                  <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                    Read status: {doc.readStatus || "Manual verification required"} · Method: {doc.method || "—"} · OCR fallback: {doc.ocrFallback ? "Yes" : "No"} · Manual verification: {doc.manualVerificationRequired ? "Yes" : "No"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 1. Review Status ──────────────────────────────────────────────────── */}
      <div className="card mb-24">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 4 }}>
              {lang === "zh" ? "人工审核状态" : "Manual Review Status"}
            </h3>
            <span className={`badge ${STATUS_BADGE[app.reviewStatus] || "badge--draft"}`}>
              {app.reviewStatus || "Pending"}
            </span>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: 6 }}>
              {lang === "zh" ? "最终决定由房东人工确认。" : "Final decision is always made by the landlord."}
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

      <SectionCard title="Supporting Documents">
        <div className="info-grid">
          {_isAdmin && <InfoRow label="Shortlist Status" value={app.shortlistStatus || "New"} />}
          {_isAdmin && <InfoRow label="Document Request Sent" value={app.documentRequestSent || "No"} />}
          {_isAdmin && <InfoRow label="Document Request Sent At" value={app.documentRequestSentAt} />}
          <InfoRow label="Document Upload Status" value={app.documentUploadStatus || "—"} />
          <InfoRow label="Uploaded File Count" value={app.uploadedFileCount || "0"} />
          <InfoRow label={lang === "zh" ? "Supporting Documents" : "Supporting Documents"} value={supportFilesLoading ? (lang === "zh" ? "检查中..." : "Checking...") : formatSupportDocumentStatus(supportSummary, lang)} />
          <InfoRow label={lang === "zh" ? "Matched Files" : "Matched Files"} value={String(supportSummary.count)} />
          <InfoRow label={lang === "zh" ? "File Types" : "File Types"} value={formatSupportDocumentTypes(supportSummary, lang).replace(/^File types: |^文件类型: /, "")} />
          <InfoRow label={lang === "zh" ? "Last Uploaded / Modified" : "Last Uploaded / Modified"} value={supportSummary.latestModifiedAt ? fmt(supportSummary.latestModifiedAt) : "—"} />
          {_isAdmin && <InfoRow label="Last Upload At" value={app.lastUploadAt} />}
          {_isAdmin && <InfoRow label="Screening Report Status" value={app.screeningReportStatus || "—"} />}
          {_isAdmin && <InfoRow label="Screening Report Generated At" value={app.screeningReportGeneratedAt} />}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {_isAdmin && canRequestDocs && (
            <button
              type="button"
              className="btn btn--sm"
              disabled={requestingDocs}
              onClick={handleRequestDocuments}
            >
              {requestingDocs ? "Sending..." : "Request Supporting Documents"}
            </button>
          )}
          {_isAdmin && canResendDocsEmail && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={requestingDocs}
              onClick={handleResendDocumentsEmail}
            >
              {requestingDocs ? "Sending..." : "Resend Email"}
            </button>
          )}
          {_isAdmin && !canRequestDocs && documentRequestBlocker && (
            <span className="text-muted text-sm" style={{ alignSelf: "center" }}>
              {documentRequestBlocker}
            </span>
          )}
          {_isAdmin && canGenerateDraftReport && (
            <button
              type="button"
              className="btn btn--sm"
              disabled={generatingReport}
              onClick={handleGenerateDraftReport}
            >
              {generatingReport ? "Generating..." : "Generate AI Draft Screening Report"}
            </button>
          )}
          {canGenerateApplicantReports && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={fullAuditBusy || !canGenerateFullAuditReport}
                onClick={handleGenerateFullAuditReport}
                title={canGenerateFullAuditReport ? "" : (lang === "zh" ? "支持文件提交后可生成完整审核。" : "Full audit available after supporting documents are submitted.")}
              >
                {fullAuditBusy
                  ? (lang === "zh" ? "生成中..." : "Generating...")
                  : (lang === "zh" ? "生成完整申请人审核报告" : "Generate Full Applicant Audit Report")}
              </button>
              {!canGenerateFullAuditReport && (
                <span className="text-muted text-sm" style={{ alignSelf: "center" }}>
                  {lang === "zh" ? "支持文件提交后可生成完整审核。" : "Full audit available after supporting documents are submitted."}
                </span>
              )}
            </>
          )}
          {canSeeInternalDriveLinks && app.supportDocumentFolderUrl && (
            <a href={app.supportDocumentFolderUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              Open Support Folder
            </a>
          )}
          {canSeeInternalDriveLinks && app.uploadLink && (
            <a href={app.uploadLink} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              Open Upload Link
            </a>
          )}
          {canSeeInternalDriveLinks && app.screeningReportUrl && (
            <a href={app.screeningReportUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              Open Screening Report
            </a>
          )}
        </div>
      </SectionCard>

      {app.screeningReportMarkdown && (
        <SectionCard title="AI Draft Screening Report">
          <MarkdownReport markdown={app.screeningReportMarkdown} />
        </SectionCard>
      )}

      <SectionCard title="Data Retention">
        <div className="info-grid">
          <InfoRow label="Data Retention Status" value={app.dataRetentionStatus || "—"} />
          <InfoRow label="Retention Expiry Date" value={app.retentionExpiryDate || "—"} />
          {_isAdmin && <InfoRow label="Retention Action" value={app.retentionAction || "—"} />}
          {_isAdmin && <InfoRow label="Sensitive Files Deleted At" value={app.sensitiveFilesDeletedAt || "—"} />}
          {_isAdmin && <InfoRow label="Archived Tenant File URL" value={app.archivedTenantFileUrl || "—"} mono />}
        </div>
        {_isAdmin && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!!retentionBusy} onClick={() => handleRetentionStatus("Declined")}>
                {retentionBusy === "Declined" ? "Saving..." : "Mark as Not Selected"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!!retentionBusy} onClick={() => handleRetentionStatus("Withdrawn")}>
                {retentionBusy === "Withdrawn" ? "Saving..." : "Mark as Withdrawn"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!!retentionBusy} onClick={() => handleRetentionStatus("Incomplete")}>
                {retentionBusy === "Incomplete" ? "Saving..." : "Mark as Incomplete"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!!retentionBusy} onClick={() => handleRetentionStatus("Signed Tenant")}>
                {retentionBusy === "Signed Tenant" ? "Saving..." : "Mark as Signed Tenant"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!!retentionBusy} onClick={handleRetentionPreview}>
                {retentionBusy === "preview" ? "Checking..." : "Preview Expired Retention"}
              </button>
              {app.supportDocumentFolderUrl && (
                <button type="button" className="btn btn--ghost btn--sm" disabled={!!retentionBusy} onClick={handleDeleteSensitiveFiles}>
                  {retentionBusy === "delete" ? "Deleting..." : "Delete Sensitive Files"}
                </button>
              )}
            </div>
            {retentionPreview && (
              <div style={{ marginTop: 14, border: "1px solid var(--color-border)", borderRadius: 8, padding: 12, background: "#fffdf8" }}>
                <strong>Expired retention preview: {retentionPreview.count || 0} record(s)</strong>
                {(retentionPreview.records || []).slice(0, 8).map((item) => (
                  <p key={item.recordId} style={{ margin: "6px 0", fontSize: "0.84rem" }}>
                    {item.recordId} - {item.applicantName || "Applicant"} - {item.retentionStatus || "—"} - expires {item.expiryDate || "—"}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* ── 2. Applicant Information ──────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "申请人信息" : "Applicant Information"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "姓名" : "Full Name"}            value={app.applicantName} />
          <InfoRow label={lang === "zh" ? "邮箱" : "Email"}                value={app.email} />
          <InfoRow label={lang === "zh" ? "电话" : "Phone"}                value={app.phone} />
          <InfoRow label={lang === "zh" ? "出生日期" : "Date of Birth"}    value={app.dateOfBirth} />
          <InfoRow label={lang === "zh" ? "现居地址" : "Current Address"}  value={app.currentAddress} />
          <InfoRow label={lang === "zh" ? "微信号" : "WeChat"}             value={app.wechat} />
        </div>
      </SectionCard>

      {/* ── 3. Employment / Income ────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "就业与收入" : "Employment / Income"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "就业状态" : "Employment Status"}        value={app.employmentStatus} />
          <InfoRow label={lang === "zh" ? "雇主来源" : "Employer / Income Source"} value={app.employer} />
          <InfoRow label={lang === "zh" ? "月收入" : "Monthly Income"}             value={app.monthlyIncome} />
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
      <SectionCard title={lang === "zh" ? "房东参考与信用" : "Landlord Reference & Credit"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "房东参考" : "Landlord / Property Mgr Reference"} value={app.landlordReference} />
          <InfoRow label={lang === "zh" ? "信用记录自评" : "Credit History Self-Rating"}     value={app.creditHistory} />
        </div>
      </SectionCard>

      {/* ── 5. Move-in & Occupancy ────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "入住与居住人数" : "Move-in & Occupancy"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "期望入住日期" : "Preferred Move-in Date"}         value={app.moveInDate} />
          <InfoRow label={lang === "zh" ? "期望租期" : "Desired Lease Term"}                 value={app.leaseTerm} />
          <InfoRow label={lang === "zh" ? "总人数" : "Total Occupants"}                      value={app.occupants} />
          <InfoRow label={lang === "zh" ? "成年人" : "Adults (18+)"}                        value={app.adults} />
          <InfoRow label={lang === "zh" ? "未成年人" : "Minors (under 18)"}                 value={app.minors} />
          <InfoRow label={lang === "zh" ? "所有入住人员" : "All Occupants Names & Ages"}     value={app.occupantNamesAges} />
        </div>
      </SectionCard>

      {/* ── 6. Joint Applicant ────────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "联名申请人" : "Joint Applicant / Co-Applicant"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "是否有联名申请人" : "Has Joint Applicant"} value={app.hasJointApplicant} />
        </div>
        {hasJoint && (
          <div style={{ marginTop: 14, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
            <div className="info-grid">
              <InfoRow label={lang === "zh" ? "联名申请人姓名" : "Joint Applicant Name"}      value={app.jointName} />
              <InfoRow label={lang === "zh" ? "地址" : "Joint Applicant Address"}              value={app.jointAddress} />
              <InfoRow label={lang === "zh" ? "电话" : "Joint Applicant Phone"}               value={app.jointPhone} />
              <InfoRow label={lang === "zh" ? "邮箱" : "Joint Applicant Email"}               value={app.jointEmail} />
              <InfoRow label={lang === "zh" ? "出生日期" : "Joint Applicant DOB"}             value={app.jointDob} />
              <InfoRow label={lang === "zh" ? "就业状态" : "Joint Employment Status"}         value={jointEmployment.status} />
              <InfoRow label={lang === "zh" ? "雇主或收入来源" : "Joint Employer / Income Source"} value={jointEmployment.source} />
              <InfoRow label={lang === "zh" ? "月收入" : "Joint Applicant Monthly Income"}    value={app.jointIncome} />
              <InfoRow label={lang === "zh" ? "雇主联系方式" : "Joint Employer Contact"}      value={app.jointEmployerContact} />
              <InfoRow label={lang === "zh" ? "房东参考" : "Joint Landlord Reference"}        value={app.jointLandlordReference} />
              <InfoRow label={lang === "zh" ? "信用信息" : "Joint Credit Information"}        value={app.jointCreditInfo} />
              <InfoRow label={lang === "zh" ? "收入证明或信用报告" : "Joint Proof of Income / Credit Report"} value={app.jointProofOfIncome} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── 7. Lease & Deposit ───────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "租期与押金" : "Lease & Deposit"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "押金首月准备好" : "Deposit & First Month Funds Ready"} value={app.depositFundsAvailable} />
          <InfoRow label={lang === "zh" ? "押金协议" : "Deposit Agreement"}                       value={app.depositAgreement} />
        </div>
      </SectionCard>

      {/* ── 8. Pets ──────────────────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "宠物" : "Pets"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "是否有宠物" : "Has Pets"}               value={app.hasPets} />
          <InfoRow label={lang === "zh" ? "宠物押金准备好" : "Pet Deposit Funds Ready"} value={app.petDepositFunds} />
          <InfoRow label={lang === "zh" ? "宠物详情" : "Pet Details"}              value={app.petDetails} />
        </div>
      </SectionCard>

      {/* ── 9. Tenancy History ───────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "租赁历史" : "Tenancy History"}>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {app.evictionHistory || "—"}
        </p>
      </SectionCard>

      {/* ── 10. Smoking / Cannabis ───────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "吸烟·电子烟·大麻" : "Smoking / Vaping / Cannabis"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "是否吸烟或使用大麻" : "Smokes / Vapes / Uses Cannabis"} value={app.smokesVapesCannabis} />
          <InfoRow label={lang === "zh" ? "不吸烟协议" : "No-Smoking Agreement"}                   value={app.noSmokingAgreement} />
        </div>
      </SectionCard>

      {/* ── 11. Documents & Insurance ────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "文件与保险" : "Documents & Insurance"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "可提供收入证明" : "Can Provide Proof of Income"}             value={app.proofOfIncome} />
          <InfoRow label={lang === "zh" ? "当前是否持有租客保险" : "Current Tenant Insurance"}          value={app.hasTenantInsurance} />
          <InfoRow label={lang === "zh" ? "租客保险协议" : "Tenant Insurance Agreement"}               value={app.tenantInsuranceAgreement} />
          <InfoRow label={lang === "zh" ? "入住前可提供保险证明" : "Proof of Insurance Before Move-in"} value={app.proofInsuranceBeforeMoveIn} />
        </div>
      </SectionCard>

      {/* ── 12. Additional Information ────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "其他信息" : "Additional Information"}>
        <div className="info-grid">
          <InfoRow label={lang === "zh" ? "搬迁原因" : "Reason for Moving"}  value={app.reasonForMoving} />
          <InfoRow label={lang === "zh" ? "停车需求" : "Parking Request"}    value={app.parkingRequest} />
          <InfoRow label={lang === "zh" ? "其他备注" : "Other Notes"}        value={app.additionalNotes} />
        </div>
      </SectionCard>

      {/* ── 13. Application PDF ───────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "申请表 PDF" : "Application PDF"}>
        {canAccessSubmittedPdf ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              {canSeeInternalDriveLinks && app.pdfUrl && (
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
                {adminPdfBusy ? (lang === "zh" ? "准备中…" : "Preparing…") : (lang === "zh" ? "📄 下载已提交申请表" : "📄 Download Submitted Application")}
              </button>
            </div>
            {canSeeInternalDriveLinks && app.pdfUrl ? (
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                Drive PDF: stored in listing folder under <code>Applications/</code>
              </p>
            ) : (
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                {lang === "zh"
                ? "尚无 Drive PDF — 可点击\"生成申请表 PDF\"根据当前申请数据在本地生成。"
                : "No Drive PDF yet — use \"Generate PDF\" to create a local copy from the application data above."
              }
              </p>
            )}
          </>
        ) : (
          <div style={{ background: "#fff8f3", border: "1px solid #f0cfa0", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#7a4f00", marginBottom: 4 }}>
              {lang === "zh" ? "访问受限" : "Access Restricted"}
            </p>
            <p style={{ fontSize: "0.82rem", color: "#7a5a2f", lineHeight: 1.65 }}>
              {lang === "zh"
                ? <>申请表 PDF 仅供管理员及对应房源的拥有者查看。此申请所属房源（<code>{app.listingId}</code>）与您的试用账号不匹配。</>
                : <>Submitted application PDFs are only accessible by admins and the listing owner. This application is connected to listing <code>{app.listingId}</code>, which does not match your trial account.</>
              }
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── 14. Screening Summary ─────────────────────────────────────────────── */}
      <div className="card mb-24">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", marginBottom: 14 }}>
          {lang === "zh" ? "初筛摘要" : "Screening Summary"}
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
          {lang === "zh"
            ? "仅为规则性初步整理，不作出最终申请决定。所有最终决定由房东人工确认。"
            : "Rule-based checks only — no AI, no automated decisions. All final decisions are made by the landlord."
          }
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
              {lang === "zh" ? "缺失信息" : "Missing Information"}
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
            {lang === "zh" ? "建议跟进问题" : "Suggested Follow-up Questions"}
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 12 }}>
            {lang === "zh" ? "根据申请内容自动生成，可根据需要复制发送。" : "Based on the application — copy and send to applicant if needed."}
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
          {lang === "zh" ? "内部备注" : "Internal Notes"}
        </h3>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 10 }}>
          {lang === "zh" ? "仅管理员可见，保存至表格。" : "Admin-only — not visible to applicant. Saved to the sheet."}
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
            {savingNotes ? (lang === "zh" ? "保存中…" : "Saving…") : (lang === "zh" ? "保存备注" : "Save Notes")}
          </button>
          {notesSaved && <span style={{ fontSize: "0.82rem", color: "var(--color-primary)" }}>✅ Saved</span>}
        </div>
      </div>

      {/* ── 18. Record Metadata ───────────────────────────────────────────────── */}
      <SectionCard title={lang === "zh" ? "记录信息" : "Record Details"}>
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
