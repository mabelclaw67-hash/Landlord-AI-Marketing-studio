import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CLIENT_ROLES,
  CLIENT_SERVICE_INTERESTS,
  CONTACT_OPTIONS,
  DISPUTE_ACCEPT_ATTRIBUTE,
  DISPUTE_MAX_FILES,
  DISPUTE_TYPES,
  DOCUMENT_CATEGORIES,
  PROCEEDING_STATUS,
  RELATIONSHIPS,
  SERVICE_METHODS,
  TRIBUNALS,
  YES_NO_NOT_SURE,
  analyseDispute,
  buildDisputeReport,
  createEmptyDisputeReview,
  deleteDisputeFile,
  displayDisputeOption,
  getDisputeFollowUpQuestions,
  startDisputeReview,
  submitDisputeReview,
  downloadDisputeReportPdf,
  suggestedTribunal,
  uploadDisputeFile,
  validateDisputeFile,
} from "../utils/disputeReview";
import { normalizeLang } from "../utils/lang";
import { renderStructuredProfessionalReportHtml } from "../components/reports/professionalReportHtml";

const DISPUTE_REPORT_SESSION_KEY = "vipm_dispute_review_report_v1";

function saveDisputeReportSession(payload) {
  try {
    sessionStorage.setItem(DISPUTE_REPORT_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Session storage is a convenience for the public result route only.
  }
}

function readDisputeReportSession() {
  try {
    return JSON.parse(sessionStorage.getItem(DISPUTE_REPORT_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

// Every label, option, helper line, validation message and upload hint exists in
// both languages. There is no mixed-language state.
const L = {
  en: {
    title: "AI Dispute Review",
    subtitle: "A structured preliminary review of your dispute, prepared for professional review.",
    desc: "AI organizes the facts. Professional experience reviews the risk.",
    bullets: [
      "Key timeline",
      "Evidence check",
      "Service and procedure review",
      "Deadlines to verify",
      "Risks and next step",
    ],
    steps: [
      "Contact Information",
      "Dispute Type",
      "Parties",
      "Dispute Background",
      "Client's Position",
      "Opposing Party's Position",
      "Important Dates and Deadlines",
      "Documents and Evidence",
      "Desired Outcome",
      "Consent and Submission",
    ],
    progress: "Step {current} of {total}",
    select: "Please select",
    back: "Back",
    next: "Next",
    generate: "Generate My AI Preliminary Review",
    submitting: "Submitting...",
    startOver: "Start Over",
    aiPreviewTitle: "AI Preliminary Review",
    reviewTitle: "Review & Submit",
    reviewDesc: "Check your answers and uploaded documents before submitting.",
    resultTitle: "AI Dispute Review",
    reportGenerated: "Your preliminary review has been generated. You can read it below, or print and save it as a PDF.",
    publicReportMissing: "No local report was found for this review on this device. Please complete the intake again.",
    reviewId: "Review ID",
    printSavePdf: "Print / Save PDF",
    reportLanguage: "Report language",
    downloadEn: "Download English PDF",
    downloadZh: "Download Chinese PDF",
    downloading: "Downloading…",
    downloadPending: "The professional PDF is not ready yet. You can still print this page.",
    fields: {
      clientName: "Full Name",
      email: "Email",
      phone: "Phone",
      preferredContact: "Preferred Contact",
      clientRole: "Your Role in the Dispute",
      disputeType: "Dispute Type",
      tribunal: "Tribunal / Authority",
      propertyAddress: "Property Address",
      city: "City",
      province: "Province",
      opposingPartyName: "Opposing Party Name",
      relationshipToOpposingParty: "Relationship to Opposing Party",
      disputeSummary: "Dispute Summary",
      monetaryAmount: "Amount in Dispute",
      clientPosition: "Your Position",
      opposingPosition: "Opposing Party's Position",
      noticeDate: "Notice Date",
      serviceDate: "Service Date",
      filingDeadline: "Filing Deadline",
      hearingDate: "Hearing Date",
      limitationDate: "Limitation Date",
      proceedingStatus: "Current Proceeding Status",
      applicationFiled: "Application Filed",
      responseReceived: "Response / Counterclaim Received",
      serviceMethod: "How were documents served?",
      keyEvidenceSummary: "Key Evidence Summary",
      missingEvidence: "Evidence You Know Is Missing",
      serviceConcerns: "Service / Procedure Concerns",
      legalIssues: "Legal / Compliance Issues You Are Aware Of",
      desiredOutcome: "Desired Outcome",
      clientServiceInterest: "What Would You Like Help With?",
      consentToContact: "Consent to Contact",
      privacyConsent: "Privacy Consent",
    },
    help: {
      disputeType: "This single answer determines which follow-up questions and which procedure apply.",
      disputeSummary: "Describe what happened, in order. At least a few sentences — a short summary cannot be assessed reliably.",
      clientPosition: "What you say happened and why you should succeed.",
      opposingPosition: "What the other side says. If you do not know, say so — leaving it blank is itself a gap.",
      dates: "Enter only dates you can support with a document. Leave anything you are unsure of blank.",
      missingEvidence: "Naming what is missing makes the review more useful, not less.",
      desiredOutcome: "What a good result would actually look like for you.",
    },
    upload: {
      title: "Documents & Evidence",
      intro: "Upload the documents your dispute relies on. You can upload several files at once.",
      limits: `Accepted: PDF, JPG, PNG, HEIC, WEBP, DOC, DOCX, TXT, CSV, XLS, XLSX. Up to 15 MB per file and ${DISPUTE_MAX_FILES} files in total.`,
      examples: "Examples: tenancy agreement, notices, applications and responses, email or message screenshots, payment records, invoices, inspection photos, strata documents, tribunal or court documents. For Supreme Court Litigation: the pleading (Notice of Civil Claim, Petition, or Notice of Application), affidavits, exhibits, court orders, expert reports and correspondence.",
      category: "Document category",
      documentDate: "Document date",
      senderIssuer: "Sender / issuer",
      description: "Short description",
      choose: "Choose files",
      uploading: "Uploading...",
      uploaded: "Uploaded documents",
      remove: "Remove",
      removing: "Removing...",
      none: "No documents uploaded yet.",
      preparing: "Preparing your upload folder...",
      unavailable: "The upload service could not be reached, so no file has been uploaded. Please retry.",
      retry: "Retry",
      progress: "Uploading {done} of {total}…",
      errType: "{name}: this file type is not accepted.",
      errSize: "{name}: this file is larger than the 15 MB limit.",
      errCount: `You can upload at most ${DISPUTE_MAX_FILES} files.`,
      setCategoryFirst: "Please choose a document category before selecting files.",
    },
    consentText: "I agree to be contacted about this preliminary review.",
    privacyText: "I agree that the information and documents I provide may be stored and used for this preliminary review.",
    notLegalAdvice: "All AI reviews are preliminary working drafts based on the information and materials submitted. They are provided for case organization and professional review only and do not constitute legal advice, legal representation, or a guarantee of outcome. Applicable law, procedure, deadlines, and evidentiary requirements must still be verified under the current rules.",
    insufficientBanner: "Based on what has been provided so far, this file cannot yet be assessed reliably. The review below sets out exactly what is missing.",
    errRequiredRole: "Please select your role and the dispute type.",
    errSummary: "Please describe the dispute in more detail so it can be assessed.",
    explain: {
      heading: "Prepare the case before preparing the submission",
      body: "AI Dispute Review does not simply write a favourable submission based on one party’s position.",
      points: [
        "Distinguish confirmed facts, party allegations, and matters requiring verification",
        "Organize the key timeline, deadlines, and procedural status",
        "Review the available evidence and identify missing or defective materials",
        "Flag service, jurisdiction, limitation, expert-evidence, and other procedural risks",
        "Generate preliminary English and Chinese assessment reports for professional review and further preparation",
      ],
      note: "The AI does not automatically assume that either party is correct and does not manufacture missing facts. Where the materials are insufficient, the report will clearly identify what cannot yet be confirmed.",
    },
    receive: {
      heading: "What you may receive",
      items: [
        "Case and dispute summary",
        "Key timeline",
        "Organized party allegations",
        "Available-evidence inventory",
        "Missing or defective evidence",
        "Procedural and deadline risk flags",
        "Strengths and weaknesses",
        "Recommended documents and next steps",
        "Preliminary AI assessment reports in English and Chinese",
      ],
      footer: "Available outputs depend on the dispute type and materials provided.",
    },
  },
  zh: {
    title: "法律争议AI初评",
    subtitle: "对您的争议进行结构化初步审阅，供专业审核使用。",
    desc: "AI 整理事实，专业经验审阅风险。",
    bullets: [
      "关键时间线",
      "证据检查",
      "送达与程序审查",
      "需核实的期限",
      "风险与下一步",
    ],
    steps: [
      "联系方式",
      "争议类型",
      "当事人",
      "争议背景",
      "客户立场",
      "对方立场",
      "重要日期与期限",
      "文件与证据",
      "期望结果",
      "同意与提交",
    ],
    progress: "第 {current} 步，共 {total} 步",
    select: "请选择",
    back: "上一步",
    next: "下一步",
    generate: "生成我的 AI 初步审阅",
    submitting: "提交中...",
    startOver: "重新开始",
    aiPreviewTitle: "AI 初步审阅",
    reviewTitle: "确认并提交",
    reviewDesc: "提交前请检查您的回答和已上传的文件。",
    resultTitle: "法律争议AI初评",
    reportGenerated: "您的初步审阅已生成。您可以在下方阅读，也可以打印或另存为 PDF。",
    publicReportMissing: "本设备上未找到该案件的报告记录，请重新完成问询。",
    reviewId: "案件编号",
    printSavePdf: "打印 / 另存 PDF",
    reportLanguage: "报告语言",
    downloadEn: "下载英文 PDF",
    downloadZh: "下载中文 PDF",
    downloading: "下载中…",
    downloadPending: "专业版 PDF 尚未生成，您仍可打印本页。",
    fields: {
      clientName: "姓名",
      email: "邮箱",
      phone: "电话",
      preferredContact: "偏好联系方式",
      clientRole: "您在争议中的身份",
      disputeType: "争议类型",
      tribunal: "机构 / 主管",
      propertyAddress: "物业地址",
      city: "城市",
      province: "省份",
      opposingPartyName: "对方当事人姓名 / 名称",
      relationshipToOpposingParty: "与对方的关系",
      disputeSummary: "争议概述",
      monetaryAmount: "争议金额",
      clientPosition: "您的立场",
      opposingPosition: "对方的立场",
      noticeDate: "通知日期",
      serviceDate: "送达日期",
      filingDeadline: "提交期限",
      hearingDate: "听证日期",
      limitationDate: "时效期限",
      proceedingStatus: "当前程序状态",
      applicationFiled: "是否已提交申请",
      responseReceived: "是否收到答辩 / 反诉",
      serviceMethod: "文件是如何送达的？",
      keyEvidenceSummary: "关键证据概述",
      missingEvidence: "您已知缺失的证据",
      serviceConcerns: "对送达 / 程序的疑虑",
      legalIssues: "您已知的法规 / 合规问题",
      desiredOutcome: "期望结果",
      clientServiceInterest: "您希望获得哪方面的协助？",
      consentToContact: "同意联系",
      privacyConsent: "隐私同意",
    },
    help: {
      disputeType: "这一项决定了后续追问的问题以及适用的程序。",
      disputeSummary: "请按时间顺序说明经过。至少写几句话——过短的概述无法作出可靠评估。",
      clientPosition: "您认为事情的经过，以及您为何应当获得支持。",
      opposingPosition: "对方的说法。如果您不清楚，请如实说明——留空本身就是一个缺口。",
      dates: "只填写您能用文件支持的日期。不确定的请留空。",
      missingEvidence: "指出缺失的证据会让审阅更有价值，而不是更不利。",
      desiredOutcome: "对您而言，怎样才算一个理想的结果。",
    },
    upload: {
      title: "文件与证据",
      intro: "请上传您争议所依据的文件。可以一次上传多个文件。",
      limits: `支持格式：PDF、JPG、PNG、HEIC、WEBP、DOC、DOCX、TXT、CSV、XLS、XLSX。每个文件不超过 15 MB，最多 ${DISPUTE_MAX_FILES} 个文件。`,
      examples: "例如：租约、通知书、申请与答辩、邮件或信息截图、付款记录、发票、检查照片、分契物业文件、仲裁机构或法院文件。如为 BC省高等法院民事诉讼：诉讼文件（民事诉讼通知书、呈请状或申请通知）、宣誓陈述书、证物、法院命令、专家报告及往来信件。",
      category: "文件类别",
      documentDate: "文件日期",
      senderIssuer: "发出方 / 签发方",
      description: "简短说明",
      choose: "选择文件",
      uploading: "上传中...",
      uploaded: "已上传的文件",
      remove: "删除",
      removing: "删除中...",
      none: "尚未上传任何文件。",
      preparing: "正在准备您的上传文件夹...",
      unavailable: "无法连接上传服务，文件尚未上传。请重试。",
      retry: "重试",
      progress: "正在上传第 {done} / {total} 个文件…",
      errType: "{name}：不支持该文件类型。",
      errSize: "{name}：文件超过 15 MB 上限。",
      errCount: `最多只能上传 ${DISPUTE_MAX_FILES} 个文件。`,
      setCategoryFirst: "请先选择文件类别，再选择文件。",
    },
    consentText: "我同意就本次初步审阅与我联系。",
    privacyText: "我同意我所提供的信息和文件可被保存并用于本次初步审阅。",
    notLegalAdvice: "所有AI初评均为根据用户提交信息和材料生成的辅助性草稿，仅供案件整理及专业审核使用，不构成法律意见、律师代理或结果保证。适用法律、程序、期限及证据要求仍须根据案件所在地和当前规则核实。",
    insufficientBanner: "根据目前所提供的内容，本案尚无法作出可靠评估。下方审阅已列明具体缺少哪些内容。",
    errRequiredRole: "请选择您的身份和争议类型。",
    errSummary: "请更详细地描述争议，以便进行评估。",
    explain: {
      heading: "在准备陈述之前，先把案件准备清楚",
      body: "AI争议初评不会仅仅按照您的立场替您撰写一份有利陈述。",
      points: [
        "区分已经确认的事实、当事人的主张和仍待核实的事项",
        "整理关键时间线、期限和程序状态",
        "检查现有证据及缺失或有缺陷的材料",
        "识别送达、管辖权、期限、专家证据及其他程序风险",
        "生成中英文初步评估报告，供专业审核和下一步准备使用",
      ],
      note: "AI不会自动认定任何一方正确，也不会补造缺失事实。资料不足时，报告会明确指出无法确认的事项。",
    },
    receive: {
      heading: "您可能获得",
      items: [
        "案件事实与争议摘要",
        "关键时间线",
        "当事人主张整理",
        "现有证据清单",
        "缺失或有缺陷的证据",
        "程序和期限风险提示",
        "案件有利因素与薄弱环节",
        "建议补充的材料及下一步",
        "中英文AI初步评估报告",
      ],
      footer: "具体输出会根据争议类型及所提交材料而有所不同。",
    },
  },
};

export default function DisputeReview({ lang }) {
  const safeLang = normalizeLang(lang);
  const { reviewId: routeReviewId } = useParams();
  const copy = L[safeLang] || L.en;
  const formRef = useRef(null);

  const [form, setForm] = useState(() => createEmptyDisputeReview());
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const [uploadReady, setUploadReady] = useState(false);
  const [uploadAvailable, setUploadAvailable] = useState(true);
  const uploadStartedRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [removingId, setRemovingId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [pendingMeta, setPendingMeta] = useState({
    documentCategory: "",
    documentDate: "",
    senderIssuer: "",
    description: "",
  });

  const followUps = useMemo(() => getDisputeFollowUpQuestions(form), [form]);
  const analysis = useMemo(() => analyseDispute(form, files), [form, files]);
  const previewReport = useMemo(
    () => buildDisputeReport(form, files, safeLang, analysis),
    [form, files, safeLang, analysis]
  );

  const sessionReport = routeReviewId ? readDisputeReportSession() : null;
  const publicReport = sessionReport?.reviewId === routeReviewId ? sessionReport : null;
  const isLastStep = step === copy.steps.length - 1;

  // Reserve the Review ID and its Drive folder as soon as the client reaches
  // the upload step, so every file is linked to the right record from the start.
  useEffect(() => {
    if (step !== 7 || uploadStartedRef.current) return;
    uploadStartedRef.current = true;
    let active = true;
    startDisputeReview(form.reviewId)
      .then((result) => {
        if (!active) return;
        setForm((current) => ({ ...current, reviewId: result.reviewId }));
        setUploadReady(true);
      })
      .catch(() => {
        if (active) setUploadAvailable(false);
      });
    return () => { active = false; };
  }, [step, form.reviewId]);

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => {
      if (field !== "disputeType") return { ...current, [field]: value };
      // Changing the dispute type invalidates the forum-specific follow-ups.
      return {
        ...current,
        disputeType: value,
        tribunal: suggestedTribunal(value) || current.tribunal,
        followUpAnswers: {},
      };
    });
  };

  const updateFollowUp = (id) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      followUpAnswers: { ...(current.followUpAnswers || {}), [id]: value },
    }));
  };

  // Multi Select follow-ups (e.g. sc_expert_evidence) store a comma-joined
  // string, the same shape a single text answer already round-trips as.
  const toggleFollowUpMulti = (id, option) => (event) => {
    const checked = event.target.checked;
    setForm((current) => {
      const existing = String((current.followUpAnswers || {})[id] || "").split(",").map((v) => v.trim()).filter(Boolean);
      const next = checked
        ? Array.from(new Set([...existing, option]))
        : existing.filter((value) => value !== option);
      return { ...current, followUpAnswers: { ...(current.followUpAnswers || {}), [id]: next.join(",") } };
    });
  };

  const handleFileSelect = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    setUploadError("");

    if (!pendingMeta.documentCategory) {
      setUploadError(copy.upload.setCategoryFirst);
      return;
    }
    if (files.length + selected.length > DISPUTE_MAX_FILES) {
      setUploadError(copy.upload.errCount);
      return;
    }

    setUploading(true);
    const failures = [];
    try {
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        setUploadProgress({ done: i, total: selected.length });
        const check = validateDisputeFile(file);
        if (!check.ok) {
          failures.push((check.code === "size" ? copy.upload.errSize : copy.upload.errType).replace("{name}", file.name));
          continue;
        }
        let result;
        try {
          result = await uploadDisputeFile(form.reviewId, file, pendingMeta);
        } catch (err) {
          // Never record a file as uploaded when the server rejected it.
          failures.push(`${file.name}: ${err.message || "upload failed"}`);
          continue;
        }
        setFiles((current) => [...current, {
          fileId: result.fileId,
          fileName: result.fileName,
          documentCategory: result.documentCategory,
          documentDate: pendingMeta.documentDate,
          senderIssuer: pendingMeta.senderIssuer,
          description: pendingMeta.description,
          driveUrl: result.driveUrl,
          uploadedAt: result.uploadedAt,
        }]);
      }
      setPendingMeta((current) => ({ ...current, documentDate: "", senderIssuer: "", description: "" }));
      if (failures.length) setUploadError(failures.join(" · "));
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveFile = async (fileId) => {
    setRemovingId(fileId);
    setUploadError("");
    try {
      await deleteDisputeFile(form.reviewId, fileId);
      setFiles((current) => current.filter((item) => item.fileId !== fileId));
    } catch (err) {
      setUploadError(err.message || "Could not remove the file.");
    } finally {
      setRemovingId("");
    }
  };

  const goNext = () => {
    if (!formRef.current?.reportValidity()) return;
    if (step === 1 && (!form.clientRole || !form.disputeType)) {
      setError(copy.errRequiredRole);
      return;
    }
    if (step === 3 && String(form.disputeSummary || "").trim().length < 40) {
      setError(copy.errSummary);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, copy.steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const result = await submitDisputeReview(form, files, safeLang);
      const payload = {
        reviewId: result.reviewId,
        reports: result.reports,
        // Scoped to this case only; it never exposes another review.
        downloadToken: result.downloadToken || "",
        savedAt: new Date().toISOString(),
      };
      setSubmitted(payload);
      saveDisputeReportSession(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setSubmitted(null);
    setForm(createEmptyDisputeReview());
    setFiles([]);
    setStep(0);
    setError("");
    setUploadReady(false);
    setUploadAvailable(true);
    uploadStartedRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Public report route ────────────────────────────────────────────────────
  if (routeReviewId) {
    return (
      <ReportPage
        key={safeLang}
        copy={copy}
        lang={safeLang}
        reviewId={routeReviewId}
        reports={publicReport?.reports}
        downloadToken={publicReport?.downloadToken}
      />
    );
  }

  if (submitted) {
    return (
      <ReportPage
        key={safeLang}
        copy={copy}
        lang={safeLang}
        reviewId={submitted.reviewId}
        reports={submitted.reports}
        downloadToken={submitted.downloadToken}
        onStartOver={startOver}
      />
    );
  }

  const renderStep = () => {
    if (step === 0) {
      return (
        <Section title={copy.steps[0]}>
          <div className="form-row">
            <Text field="clientName" form={form} update={update} copy={copy} required />
            <Text field="email" form={form} update={update} copy={copy} type="email" required />
          </div>
          <div className="form-row">
            <Text field="phone" form={form} update={update} copy={copy} required />
            <Select field="preferredContact" form={form} update={update} copy={copy} lang={safeLang} options={CONTACT_OPTIONS} required />
          </div>
        </Section>
      );
    }

    if (step === 1) {
      return (
        <Section title={copy.steps[1]}>
          <div className="form-row">
            <Select field="clientRole" form={form} update={update} copy={copy} lang={safeLang} options={CLIENT_ROLES} required />
            <Select field="disputeType" form={form} update={update} copy={copy} lang={safeLang} options={DISPUTE_TYPES} required />
          </div>
          <p className="strategy-help">{copy.help.disputeType}</p>
          <Select field="tribunal" form={form} update={update} copy={copy} lang={safeLang} options={TRIBUNALS} />
        </Section>
      );
    }

    if (step === 2) {
      return (
        <Section title={copy.steps[2]}>
          <Text field="propertyAddress" form={form} update={update} copy={copy} />
          <div className="form-row">
            <Text field="city" form={form} update={update} copy={copy} />
            <Text field="province" form={form} update={update} copy={copy} />
          </div>
          <div className="form-row">
            <Text field="opposingPartyName" form={form} update={update} copy={copy} />
            <Select field="relationshipToOpposingParty" form={form} update={update} copy={copy} lang={safeLang} options={RELATIONSHIPS} />
          </div>
        </Section>
      );
    }

    if (step === 3) {
      return (
        <Section title={copy.steps[3]}>
          <Area field="disputeSummary" form={form} update={update} copy={copy} rows={6} required />
          <p className="strategy-help">{copy.help.disputeSummary}</p>
          <Text field="monetaryAmount" form={form} update={update} copy={copy} placeholder={safeLang === "zh" ? "例如：$4,200" : "e.g. $4,200"} />
        </Section>
      );
    }

    if (step === 4) {
      return (
        <Section title={copy.steps[4]}>
          <Area field="clientPosition" form={form} update={update} copy={copy} rows={6} required />
          <p className="strategy-help">{copy.help.clientPosition}</p>
        </Section>
      );
    }

    if (step === 5) {
      return (
        <Section title={copy.steps[5]}>
          <Area field="opposingPosition" form={form} update={update} copy={copy} rows={6} />
          <p className="strategy-help">{copy.help.opposingPosition}</p>
        </Section>
      );
    }

    if (step === 6) {
      return (
        <>
          <Section title={copy.steps[6]}>
            <p className="strategy-help">{copy.help.dates}</p>
            <div className="strategy-toggle-grid">
              <Text field="noticeDate" form={form} update={update} copy={copy} type="date" />
              <Text field="serviceDate" form={form} update={update} copy={copy} type="date" />
              <Text field="filingDeadline" form={form} update={update} copy={copy} type="date" />
              <Text field="hearingDate" form={form} update={update} copy={copy} type="date" />
            </div>
            <div className="strategy-toggle-grid">
              <Text field="limitationDate" form={form} update={update} copy={copy} type="date" />
              <Select field="proceedingStatus" form={form} update={update} copy={copy} lang={safeLang} options={PROCEEDING_STATUS} />
              <Select field="applicationFiled" form={form} update={update} copy={copy} lang={safeLang} options={YES_NO_NOT_SURE} />
              <Select field="responseReceived" form={form} update={update} copy={copy} lang={safeLang} options={YES_NO_NOT_SURE} />
            </div>
            <Select field="serviceMethod" form={form} update={update} copy={copy} lang={safeLang} options={SERVICE_METHODS} />
            <Area field="serviceConcerns" form={form} update={update} copy={copy} rows={3} />
          </Section>

          {followUps.length > 0 && (() => {
            const groups = [];
            followUps.forEach((item) => {
              if (!groups.includes(item.group)) groups.push(item.group);
            });
            const showGroupHeadings = groups.length > 1;
            return (
              <Section title={`${displayDisputeOption(form.disputeType, safeLang)} — ${safeLang === "zh" ? "补充问题" : "Follow-up Questions"}`}>
                {groups.map((group) => (
                  <div className="strategy-follow-up__group" key={group}>
                    {showGroupHeadings && <h3>{group}</h3>}
                    <div className="strategy-follow-up__grid">
                      {followUps.filter((item) => item.group === group).map((item) => {
                        const value = (form.followUpAnswers || {})[item.id] || "";
                        return (
                          <div className="form-group strategy-follow-up__field" key={item.id}>
                            <label>{safeLang === "zh" ? item.question.zh : item.question.en}</label>
                            {item.type === "choice" ? (
                              <select className="form-control" value={value} onChange={updateFollowUp(item.id)}>
                                <option value="">{copy.select}</option>
                                {item.options.map((option) => (
                                  <option key={option} value={option}>{displayDisputeOption(option, safeLang)}</option>
                                ))}
                              </select>
                            ) : item.type === "textarea" ? (
                              <textarea className="form-control" rows={3} value={value} onChange={updateFollowUp(item.id)} />
                            ) : item.type === "multichoice" ? (
                              <div className="strategy-follow-up__checkboxes">
                                {item.options.map((option) => {
                                  const selectedValues = value.split(",").map((v) => v.trim());
                                  return (
                                    <label className="strategy-check strategy-check--sm" key={option}>
                                      <input
                                        type="checkbox"
                                        checked={selectedValues.includes(option)}
                                        onChange={toggleFollowUpMulti(item.id, option)}
                                      />
                                      <span>{displayDisputeOption(option, safeLang)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <input
                                className="form-control"
                                type={item.type === "date" ? "date" : "text"}
                                value={value}
                                onChange={updateFollowUp(item.id)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </Section>
            );
          })()}
        </>
      );
    }

    if (step === 7) {
      return (
        <Section title={copy.upload.title}>
          <p>{copy.upload.intro}</p>
          <p className="strategy-help">{copy.upload.examples}</p>
          <p className="strategy-help">{copy.upload.limits}</p>

          {!uploadAvailable ? (
            <div className="notice notice--error strategy-inline-notice">
              <p>{copy.upload.unavailable}</p>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => { uploadStartedRef.current = false; setUploadAvailable(true); }}
              >
                {copy.upload.retry}
              </button>
            </div>
          ) : !uploadReady ? (
            <p className="strategy-help">{copy.upload.preparing}</p>
          ) : (
            <>
              <div className="strategy-toggle-grid">
                <div className="form-group">
                  <label>{copy.upload.category} *</label>
                  <select
                    className="form-control"
                    value={pendingMeta.documentCategory}
                    onChange={(event) => setPendingMeta((current) => ({ ...current, documentCategory: event.target.value }))}
                  >
                    <option value="">{copy.select}</option>
                    {DOCUMENT_CATEGORIES.map((option) => (
                      <option key={option} value={option}>{displayDisputeOption(option, safeLang)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{copy.upload.documentDate}</label>
                  <input
                    className="form-control"
                    type="date"
                    value={pendingMeta.documentDate}
                    onChange={(event) => setPendingMeta((current) => ({ ...current, documentDate: event.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>{copy.upload.senderIssuer}</label>
                  <input
                    className="form-control"
                    type="text"
                    value={pendingMeta.senderIssuer}
                    onChange={(event) => setPendingMeta((current) => ({ ...current, senderIssuer: event.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>{copy.upload.description}</label>
                  <input
                    className="form-control"
                    type="text"
                    value={pendingMeta.description}
                    onChange={(event) => setPendingMeta((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{copy.upload.choose}</label>
                <input
                  className="form-control"
                  type="file"
                  multiple
                  accept={DISPUTE_ACCEPT_ATTRIBUTE}
                  disabled={uploading}
                  onChange={handleFileSelect}
                />
                {uploading && (
                  <p className="strategy-help">
                    {uploadProgress
                      ? copy.upload.progress.replace("{done}", String(uploadProgress.done + 1)).replace("{total}", String(uploadProgress.total))
                      : copy.upload.uploading}
                  </p>
                )}
              </div>
            </>
          )}

          {uploadError && (
            <div className="notice notice--error strategy-inline-notice"><p>{uploadError}</p></div>
          )}

          <h3 className="dispute-file-heading">{copy.upload.uploaded} ({files.length})</h3>
          {files.length === 0 ? (
            <p className="strategy-help">{copy.upload.none}</p>
          ) : (
            <ul className="dispute-file-list">
              {files.map((file) => (
                <li key={file.fileId}>
                  <div>
                    <strong>{file.fileName}</strong>
                    <span>{[displayDisputeOption(file.documentCategory, safeLang), file.documentDate, file.senderIssuer, file.description].filter(Boolean).join(" · ")}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={removingId === file.fileId}
                    onClick={() => handleRemoveFile(file.fileId)}
                  >
                    {removingId === file.fileId ? copy.upload.removing : copy.upload.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Area field="keyEvidenceSummary" form={form} update={update} copy={copy} rows={4} />
          <Area field="missingEvidence" form={form} update={update} copy={copy} rows={3} />
          <p className="strategy-help">{copy.help.missingEvidence}</p>
        </Section>
      );
    }

    if (step === 8) {
      return (
        <Section title={copy.steps[8]}>
          <Area field="desiredOutcome" form={form} update={update} copy={copy} rows={4} required />
          <p className="strategy-help">{copy.help.desiredOutcome}</p>
          <Select field="clientServiceInterest" form={form} update={update} copy={copy} lang={safeLang} options={CLIENT_SERVICE_INTERESTS} />
          <Area field="legalIssues" form={form} update={update} copy={copy} rows={3} />
        </Section>
      );
    }

    return (
      <>
        <Section title={copy.reviewTitle}>
          <p className="strategy-review-desc">{copy.reviewDesc}</p>
          <div className="strategy-review__grid">
            {[
              ["clientName", form.clientName],
              ["email", form.email],
              ["clientRole", displayDisputeOption(form.clientRole, safeLang)],
              ["disputeType", displayDisputeOption(form.disputeType, safeLang)],
              ["tribunal", displayDisputeOption(form.tribunal, safeLang)],
              ["opposingPartyName", form.opposingPartyName],
              ["proceedingStatus", displayDisputeOption(form.proceedingStatus, safeLang)],
              ["monetaryAmount", form.monetaryAmount],
            ].filter(([, value]) => String(value || "").trim()).map(([field, value]) => (
              <div className="strategy-review__item" key={field}>
                <span>{copy.fields[field]}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="strategy-help">
            {copy.upload.uploaded}: {files.length}
          </p>

          <div className="strategy-review-next">
            <label className="strategy-check">
              <input type="checkbox" checked={form.consentToContact} onChange={update("consentToContact")} required />
              <span>{copy.fields.consentToContact}: {copy.consentText}</span>
            </label>
            <label className="strategy-check">
              <input type="checkbox" checked={form.privacyConsent} onChange={update("privacyConsent")} required />
              <span>{copy.fields.privacyConsent}: {copy.privacyText}</span>
            </label>
          </div>

          <div className="notice notice--info strategy-inline-notice">
            <p>{copy.notLegalAdvice}</p>
          </div>
        </Section>

        <Section title={copy.aiPreviewTitle}>
          {!analysis.sufficient && (
            <div className="notice notice--warm strategy-inline-notice">
              <p>{copy.insufficientBanner}</p>
            </div>
          )}
          <DisputeReportBody report={previewReport} />
        </Section>
      </>
    );
  };

  return (
    <div className="pub-page strategy-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{copy.title}</h1>
        <p className="pub-hero__sub">{copy.subtitle}</p>
        <p className="pub-hero__desc">{copy.desc}</p>
        <ul className="strategy-hero-bullets">
          {copy.bullets.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="section">
        <div className="container strategy-container">
          <Section title={copy.explain.heading}>
            <p>{copy.explain.body}</p>
            <ul>
              {copy.explain.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="notice notice--info strategy-inline-notice">
              <p>{copy.explain.note}</p>
            </div>
          </Section>

          <Section title={copy.receive.heading}>
            <ul>
              {copy.receive.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="strategy-help">{copy.receive.footer}</p>
          </Section>
        </div>
      </section>

      <section className="section">
        <div className="container strategy-container">
          {error && <div className="notice notice--error"><p>{error}</p></div>}

          <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="strategy-form">
            <div className="strategy-progress">
              <div className="strategy-progress__top">
                <span>{copy.progress.replace("{current}", String(step + 1)).replace("{total}", String(copy.steps.length))}</span>
                <strong>{copy.steps[step]}</strong>
              </div>
              <div className="strategy-progress__bar" aria-hidden="true">
                <div style={{ width: `${((step + 1) / copy.steps.length) * 100}%` }} />
              </div>
            </div>

            {renderStep()}

            <div className="strategy-wizard-actions">
              <button type="button" className="btn btn--ghost" onClick={goBack} disabled={step === 0 || submitting}>
                {copy.back}
              </button>
              {isLastStep ? (
                <button
                  type="button"
                  className="btn btn--sage"
                  disabled={submitting}
                  onClick={() => { if (formRef.current?.reportValidity()) handleSubmit(); }}
                >
                  {submitting ? copy.submitting : copy.generate}
                </button>
              ) : (
                <button type="button" className="btn btn--sage" onClick={goNext}>{copy.next}</button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

// ── Report display ────────────────────────────────────────────────────────────

// The report page always opens in the interface language, and offers an
// explicit switch. Both versions belong to the same Review ID.
function ReportPage({ copy, lang, reviewId, reports, downloadToken, onStartOver }) {
  const [downloading, setDownloading] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const handleDownload = async (language) => {
    setDownloading(language);
    setDownloadError("");
    try {
      await downloadDisputeReportPdf(reviewId, language, downloadToken || "");
    } catch (err) {
      setDownloadError(err.message || copy.downloadPending);
    } finally {
      setDownloading("");
    }
  };

  // Mounted with key={lang} by the caller, so switching the interface language
  // resets the report to that language while still allowing a manual override.
  const [reportLang, setReportLang] = useState(lang);
  const report = reports?.[reportLang];

  if (!report) {
    return (
      <div className="pub-page strategy-page">
        <section className="pub-hero">
          <h1 className="pub-hero__title">{copy.resultTitle}</h1>
          <p className="pub-hero__desc">{copy.publicReportMissing}</p>
        </section>
        <section className="section">
          <div className="container strategy-container">
            <div className="card strategy-success"><p>{copy.publicReportMissing}</p></div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pub-page strategy-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{report.title}</h1>
        <p className="pub-hero__sub">{report.brandLine}</p>
        <p className="pub-hero__desc">{copy.reportGenerated}</p>
      </section>

      <section className="section">
        <div className="container strategy-container">
          <div className="card strategy-section">
            <div className="strategy-result-card__top">
              <div>
                <span className="strategy-success__label">{copy.reviewId}</span>
                <strong>{reviewId}</strong>
              </div>
              <div className="dispute-lang-switch" role="group" aria-label={copy.reportLanguage}>
                <button
                  type="button"
                  className={`btn btn--ghost btn--sm${reportLang === "en" ? " is-active" : ""}`}
                  onClick={() => setReportLang("en")}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`btn btn--ghost btn--sm${reportLang === "zh" ? " is-active" : ""}`}
                  onClick={() => setReportLang("zh")}
                >
                  中文
                </button>
              </div>
            </div>

            <DisputeReportBody report={report} />

            {downloadError && (
              <div className="notice notice--warm strategy-inline-notice"><p>{downloadError}</p></div>
            )}

            <div className="strategy-result-actions">
              <button
                type="button"
                className="btn btn--sage"
                onClick={() => handleDownload("en")}
                disabled={downloading === "en"}
              >
                {downloading === "en" ? copy.downloading : copy.downloadEn}
              </button>
              <button
                type="button"
                className="btn btn--sage"
                onClick={() => handleDownload("zh")}
                disabled={downloading === "zh"}
              >
                {downloading === "zh" ? copy.downloading : copy.downloadZh}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => openDisputeReportPdf(report, reviewId)}>
                {copy.printSavePdf}
              </button>
              {onStartOver && (
                <button type="button" className="btn btn--ghost" onClick={onStartOver}>{copy.startOver}</button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DisputeReportBody({ report }) {
  return (
    <div className="strategy-assessment-preview">
      <div className="strategy-report-block">
        <h3>{report.language === "zh" ? "争议摘要" : "Executive Summary"}</h3>
        <ul>{report.executiveSummary.map((line, index) => <li key={index}>{line}</li>)}</ul>
      </div>
      {report.sections.map((section) => (
        <div className="strategy-report-block" key={section.key}>
          <h3>{section.title}</h3>
          {section.type === "table" ? (
            <ul>
              {section.rows.map((row, index) => (
                <li key={index}><strong>{row.label}:</strong> {row.value}</li>
              ))}
            </ul>
          ) : (
            <ul>{section.items.map((item, index) => <li key={index}>{item}</li>)}</ul>
          )}
        </div>
      ))}
    </div>
  );
}

function openDisputeReportPdf(report, reviewId) {
  const zh = report.language === "zh";
  const html = renderStructuredProfessionalReportHtml({
    language: report.language,
    title: report.title,
    subtitle: report.brandLine,
    copy: {
      preparedBy: zh ? "报告出具方" : "Prepared by",
      overview: zh ? "概览" : "Overview",
      executiveSummary: zh ? "争议摘要" : "Executive Summary",
      footerNotice: report.disclaimer,
    },
    meta: [
      { label: zh ? "案件编号" : "Review ID", value: reviewId || "" },
      { label: zh ? "生成日期" : "Generated", value: new Date().toLocaleDateString(zh ? "zh-CN" : "en-CA") },
      { label: zh ? "风险等级" : "Risk level", value: String(report.riskLevelLabel || report.riskLevel || "") },
    ],
    executiveSummary: report.executiveSummary.map((line) => ({ label: "", value: line })),
    notice: report.disclaimer,
    sections: report.sections.map((section) => (
      section.type === "table"
        ? { type: "table", title: section.title, rows: section.rows }
        : { title: section.title, items: section.items }
    )),
    emptyText: zh ? "无内容。" : "No content.",
  });
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ── Form primitives (same markup and classes as the Property Assessment) ─────

function Section({ title, children }) {
  return (
    <section className="card strategy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Text({ field, form, update, copy, type = "text", required = false, ...rest }) {
  return (
    <div className="form-group">
      <label>{copy.fields[field]}{required ? " *" : ""}</label>
      <input className="form-control" type={type} value={form[field]} onChange={update(field)} required={required} {...rest} />
    </div>
  );
}

function Select({ field, form, update, copy, lang, options, required = false }) {
  return (
    <div className="form-group">
      <label>{copy.fields[field]}{required ? " *" : ""}</label>
      <select className="form-control" value={form[field]} onChange={update(field)} required={required}>
        <option value="">{copy.select}</option>
        {options.map((option) => (
          <option key={option} value={option}>{displayDisputeOption(option, lang)}</option>
        ))}
      </select>
    </div>
  );
}

function Area({ field, form, update, copy, rows = 4, required = false }) {
  return (
    <div className="form-group">
      <label>{copy.fields[field]}{required ? " *" : ""}</label>
      <textarea className="form-control" rows={rows} value={form[field]} onChange={update(field)} required={required} />
    </div>
  );
}
