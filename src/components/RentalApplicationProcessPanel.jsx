const APPLICATION_PROCESS_STEPS = [
  "Apply Online",
  "Identity & Income Verification",
  "Screening & Verification",
  "Conditional Approval",
  "Deposit & Lease Signing",
  "Tenant Insurance",
  "Move-In Inspection",
  "Professional Property Management",
];

const APPLICATION_PROCESS_NOTE = "Supporting documents may include government photo ID, proof of income, credit report/consent, and landlord references.";

function RentalApplicationProcessCard() {
  return (
    <section className="application-process-card" aria-label="Rental Application Process">
      <div className="application-process-card__header">
        <h2 className="application-process-card__title">Rental Application Process</h2>
        <p className="application-process-card__subtitle">Professional screening process for qualified applicants.</p>
      </div>
      <ol className="application-process-steps">
        {APPLICATION_PROCESS_STEPS.map((step, index) => (
          <li key={step} className="application-process-step">
            <span className="application-process-step__index">{index + 1}</span>
            <span className="application-process-step__label">{step}</span>
          </li>
        ))}
      </ol>
      <p className="application-process-card__note">{APPLICATION_PROCESS_NOTE}</p>
    </section>
  );
}

export function MobileApplicationProcessCard() {
  return (
    <details className="application-process-mobile">
      <summary className="application-process-mobile__trigger">View Application Process</summary>
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
