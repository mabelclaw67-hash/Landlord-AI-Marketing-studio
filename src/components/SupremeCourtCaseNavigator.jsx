import CollapsibleCard from "./CollapsibleCard";
import {
  FORM_USAGE,
  LEGAL_INFORMATION_NOTICE,
  STATUS_META,
  SUPREME_COURT_CIVIL_RULES_URL,
  WORKFLOW_STAGES,
  getFormsForStage,
  getWorkflowProgress,
} from "../config/supremeCourtCivilClaimDefendantWorkflow";

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.not_started;
  return <span className={`ccard__badge ${meta.badgeClass}`}>{meta.label}</span>;
}

function StageForms({ stageId }) {
  const forms = getFormsForStage(stageId);
  if (!forms.length) return null;

  return (
    <div className="dispute-admin-long">
      <strong>Official Forms and Rules</strong>
      <div className="scc-form-grid">
        {forms.map((form) => (
          <div className="scc-form-card" key={form.id}>
            <div className="scc-form-card__head">
              <span className="scc-form-card__number">{form.formNumber}</span>
              <span className={`scc-form-pill scc-form-pill--${form.usage}`}>{FORM_USAGE[form.usage]}</span>
            </div>
            <p className="scc-form-card__name">{form.name}</p>
            <p className="scc-form-card__purpose">{form.purpose}</p>
            <div className="scc-form-card__links">
              <a href={form.sourceUrl} target="_blank" rel="noopener noreferrer">
                Official form source
              </a>
              <a href={SUPREME_COURT_CIVIL_RULES_URL} target="_blank" rel="noopener noreferrer">
                Supreme Court Civil Rules
              </a>
            </div>
          </div>
        ))}
      </div>
      <p className="scc-form-verified">Last verified {forms[0]?.lastVerified || ""} against the official BC Government forms index.</p>
    </div>
  );
}

// Maps a workflow stage to the DOM id of its dedicated workspace section
// (elsewhere in the same case-detail modal) and the button label to show.
const STAGE_WORKSPACE_LINKS = {
  evidencePreparation: { targetId: "scc-evidence-matrix", label: "Open Evidence Matrix" },
  documentDiscovery: { targetId: "scc-document-discovery", label: "Open Document Discovery Workspace" },
  examinationForDiscovery: { targetId: "scc-examination-discovery", label: "Open Examination for Discovery Workspace" },
  applications: { targetId: "scc-applications", label: "Open Applications Workspace" },
  settlement: { targetId: "scc-settlement", label: "Open Settlement Workspace" },
};

function StageBody({ stage, onOpenWorkspace }) {
  const workspaceLink = STAGE_WORKSPACE_LINKS[stage.id];
  return (
    <>
      <div className="dispute-admin-long">
        <strong>What this stage means</strong>
        <p>{stage.whatItMeans}</p>
      </div>
      <div className="dispute-admin-long">
        <strong>When this stage may happen</strong>
        <p>{stage.whenItHappens}</p>
      </div>
      {workspaceLink && (
        <div className="dispute-admin-actions">
          <button type="button" className="btn btn--secondary btn--small" onClick={() => onOpenWorkspace(workspaceLink.targetId)}>
            {workspaceLink.label}
          </button>
        </div>
      )}
      <div className="dispute-admin-long">
        <strong>What the defendant should prepare</strong>
        <ul>{stage.prepare.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </div>
      <StageForms stageId={stage.id} />
      <div className="dispute-admin-long">
        <strong>Completion checklist</strong>
        <ul>{stage.completionChecklist.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </div>
      {stage.cautions.length > 0 && (
        <div className="notice notice--warm strategy-inline-notice">
          <strong>Important cautions</strong>
          <ul>{stage.cautions.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}
    </>
  );
}

// Guidance-only framework for what typically follows Form 2 in a BC Supreme
// Court civil claim where the client is the defendant. Status per stage is
// derived entirely from data already on the case record — see
// getWorkflowProgress in the config file for why nothing is persisted here.
export default function SupremeCourtCaseNavigator({ review, formTwoEligibility, evidenceMatrix, documentDiscovery, examinationDiscovery, applications, settlement }) {
  if (review?.["Dispute Type"] !== "Supreme Court Litigation") return null;

  const progress = getWorkflowProgress(review, formTwoEligibility, evidenceMatrix, documentDiscovery, examinationDiscovery, applications, settlement);

  function scrollToWorkspace(targetId) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="scc-navigator">
      <h3 className="dispute-admin-heading">BC Supreme Court Case Navigator</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{LEGAL_INFORMATION_NOTICE}</p>
      </div>

      {WORKFLOW_STAGES.map((stage) => {
        const status = progress[stage.id];
        return (
          <CollapsibleCard
            key={stage.id}
            id={`scc-stage-${stage.id}`}
            className="scc-stage-card"
            defaultOpen={stage.id === progress.currentStage}
            title={
              <span className="scc-stage-title">
                <span className="scc-stage-number">{stage.number}</span>
                {stage.title}
              </span>
            }
            badge={<StatusBadge status={status} />}
          >
            <p className="scc-stage-summary">{stage.summary}</p>
            <StageBody stage={stage} onOpenWorkspace={scrollToWorkspace} />
          </CollapsibleCard>
        );
      })}
    </div>
  );
}
