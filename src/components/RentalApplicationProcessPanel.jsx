import { useId, useState } from "react";
import { useLang } from "../contexts/LangContext";

const APPLICATION_PROCESS_TEXT = {
  en: {
    title: "Rental Application Process",
    subtitle: "A clear, consistent process for submitting information and completing requested checks.",
    mobileTrigger: "View Application Process",
    beforeApplyTitle: "Before You Apply",
    beforeApply: [
      "Please review the advertised rent, tenancy term, move-in date, pet policy, utility arrangements, and our rental process before applying.",
      "Please apply only if the advertised terms and the rental process are suitable for you.",
      "VanIsland supports the landlord by receiving and organizing application information and supporting documents. The landlord reviews the relevant information and makes the final rental decision, subject to applicable law.",
    ],
    reservationNotice: "Submitting an application, providing documents, completing screening, or receiving conditional approval from the landlord does not by itself reserve the property.",
    fairnessNotice: "Our rental process and screening criteria are applied consistently to all applicants, subject to applicable law and any accommodation required by law.",
    note: "Depending on the listing and applicable requirements, supporting documents may include government photo ID, proof of income, credit report/consent, and landlord references.",
    steps: [
      { title: "Apply Online" },
      { title: "Identity & Income Verification" },
      { title: "Screening & Verification" },
      {
        title: "Landlord Review & Decision",
        details: [
          "VanIsland organizes the application information for the landlord's review. The landlord makes the final rental decision, subject to applicable law.",
          "If the landlord decides to proceed, any offer or approval remains subject to the rental terms offered and completion of the remaining requirements.",
          "Any requested change to the rent, tenancy term, occupancy, pets, utilities, move-in date, or other material terms may require a new review and approval.",
        ],
      },
      {
        title: "Deposit & Lease Execution",
        details: [
          "The applicant reviews and signs the tenancy agreement.",
          "The required security deposit and, where applicable, pet damage deposit must then be received in cleared funds.",
          "The landlord will countersign after the required deposit has been received.",
          "The property is not considered secured until the required deposit has been received and the tenancy has been finalized.",
        ],
        depositLimits: [
          "Security deposit: up to 50% of one month’s rent.",
          "Pet damage deposit, where applicable: up to an additional 50% of one month’s rent.",
        ],
      },
      { title: "Tenant Insurance" },
      { title: "Move-In Inspection" },
      { title: "Ongoing Professional Support" },
    ],
  },
  zh: {
    title: "租赁申请流程",
    subtitle: "清晰、一致地提交资料并完成所需核验的流程。",
    mobileTrigger: "查看申请流程",
    beforeApplyTitle: "申请前请先确认",
    beforeApply: [
      "申请前，请先查看广告所列租金、租期、入住日期、宠物规定、水电及其他费用安排，以及我们的租赁流程。",
      "请仅在广告条款及租赁流程适合您的情况下提交申请。",
      "VanIsland 负责接收和整理申请资料及支持文件，协助房东审核。房东会查看相关信息，并在适用法律范围内作出最终租赁决定。",
    ],
    reservationNotice: "提交申请、提供文件、完成筛选或获得房东的条件批准，本身均不代表该房源已为您保留。",
    fairnessNotice: "我们的租赁流程和筛选标准会一致地适用于所有申请人，同时遵守适用法律及法律要求的合理便利安排。",
    note: "根据房源和适用要求，申请材料可能包括政府照片 ID、收入证明、信用报告／授权，以及前房东推荐。",
    steps: [
      { title: "在线申请" },
      { title: "身份与收入核验" },
      { title: "筛选与资料核验" },
      {
        title: "房东审核与决定",
        details: [
          "VanIsland 会整理申请资料供房东审核。房东会在适用法律范围内作出最终租赁决定。",
          "如房东决定继续，任何要约或批准仍须以接受所提供的租赁条款并完成剩余要求为条件。",
          "如申请人要求更改租金、租期、入住人数、宠物、水电及其他费用安排、入住日期或其他重要条款，可能需要重新审核及批准。",
        ],
      },
      {
        title: "押金与租约签署完成",
        details: [
          "申请人查看并签署租赁协议。",
          "随后，所需的保证金以及适用时的宠物损坏押金，必须以已结算资金形式到账。",
          "房东将在收到所需押金后会签。",
          "在收到所需押金并完成租赁手续前，该房源不视为已被锁定。",
        ],
        depositLimits: [
          "保证金：最高为一个月租金的 50%。",
          "宠物损坏押金（如适用）：最高可另收一个月租金的 50%。",
        ],
      },
      { title: "租客保险" },
      { title: "搬入检查" },
      { title: "持续专业支持" },
    ],
  },
};

export function RentalApplicationProcessCard() {
  const lang = useLang();
  const text = APPLICATION_PROCESS_TEXT[lang === "zh" ? "zh" : "en"];
  const [expandedStep, setExpandedStep] = useState(null);
  const detailsIdPrefix = useId();

  return (
    <section className="application-process-card" aria-label={text.title}>
      <div className="application-process-card__header">
        <h2 className="application-process-card__title">{text.title}</h2>
        <p className="application-process-card__subtitle">{text.subtitle}</p>
      </div>
      <div className="application-process-card__before">
        <h3>{text.beforeApplyTitle}</h3>
        {text.beforeApply.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <p className="application-process-card__reservation">{text.reservationNotice}</p>
      <ol className="application-process-steps">
        {text.steps.map((step, index) => (
          <li key={step.title} className="application-process-step">
            <span className="application-process-step__index">{index + 1}</span>
            <div className="application-process-step__content">
              {step.details ? (
                <button
                  type="button"
                  className="application-process-step__toggle"
                  aria-expanded={expandedStep === index}
                  aria-controls={`${detailsIdPrefix}-step-${index}`}
                  onClick={() => setExpandedStep((current) => current === index ? null : index)}
                >
                  <span className="application-process-step__label">{step.title}</span>
                  <span className="application-process-step__toggle-icon" aria-hidden="true">
                    {expandedStep === index ? "−" : "+"}
                  </span>
                </button>
              ) : (
                <span className="application-process-step__label">{step.title}</span>
              )}
              {step.details && expandedStep === index && (
                <div id={`${detailsIdPrefix}-step-${index}`} className="application-process-step__details">
                  {step.details.map((detail) => <p key={detail}>{detail}</p>)}
                  {step.depositLimits && (
                    <ul className="application-process-step__limits">
                      {step.depositLimits.map((limit) => <li key={limit}>{limit}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="application-process-card__note">{text.note}</p>
      <p className="application-process-card__fairness">{text.fairnessNotice}</p>
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
