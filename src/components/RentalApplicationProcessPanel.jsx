import { useLang } from "../contexts/LangContext";

const APPLICATION_PROCESS_TEXT = {
  en: {
    title: "Rental Application Process",
    subtitle: "Professional screening process for qualified applicants.",
    mobileTrigger: "View Application Process",
    note: "Supporting documents may include government photo ID, proof of income, credit report/consent, and landlord references.",
    steps: [
      "Apply Online",
      "Identity & Income Verification",
      "Screening & Verification",
      "Conditional Approval",
      "Deposit & Lease Signing",
      "Tenant Insurance",
      "Move-In Inspection",
      "Professional Property Management",
    ],
  },
  zh: {
    title: "租赁申请流程",
    subtitle: "为合格申请人提供专业筛选流程。",
    mobileTrigger: "查看申请流程",
    note: "申请材料通常包括政府照片 ID、收入证明、信用报告/授权，以及前房东推荐。",
    steps: [
      "在线申请",
      "身份与收入核验",
      "筛选与资料核验",
      "条件批准",
      "押金与租约签署",
      "租客保险",
      "搬入检查",
      "专业物业管理",
    ],
  },
};

function RentalApplicationProcessCard() {
  const lang = useLang();
  const text = APPLICATION_PROCESS_TEXT[lang === "zh" ? "zh" : "en"];

  return (
    <section className="application-process-card" aria-label={text.title}>
      <div className="application-process-card__header">
        <h2 className="application-process-card__title">{text.title}</h2>
        <p className="application-process-card__subtitle">{text.subtitle}</p>
      </div>
      <ol className="application-process-steps">
        {text.steps.map((step, index) => (
          <li key={step} className="application-process-step">
            <span className="application-process-step__index">{index + 1}</span>
            <span className="application-process-step__label">{step}</span>
          </li>
        ))}
      </ol>
      <p className="application-process-card__note">{text.note}</p>
    </section>
  );
}

export function MobileApplicationProcessCard() {
  const lang = useLang();
  const text = APPLICATION_PROCESS_TEXT[lang === "zh" ? "zh" : "en"];

  return (
    <details className="application-process-mobile">
      <summary className="application-process-mobile__trigger">{text.mobileTrigger}</summary>
      <div className="application-process-mobile__content">
        <RentalApplicationProcessCard />
      </div>
    </details>
  );
}

export function DesktopApplicationProcessSidebar() {
  return (
    <aside className="application-process-sidebar">
      <div className="application-process-sidebar__sticky">
        <RentalApplicationProcessCard />
      </div>
    </aside>
  );
}
