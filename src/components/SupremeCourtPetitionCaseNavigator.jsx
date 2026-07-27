import CollapsibleCard from "./CollapsibleCard";
import { isPetitionJrRespondentCase } from "../utils/disputeReview";
import {
  FORM_USAGE,
  JUDICIAL_REVIEW_PROCEDURE_ACT_URL,
  LEGAL_INFORMATION_NOTICE,
  STATUS_META,
  SUPREME_COURT_CIVIL_RULES_URL,
  WORKFLOW_STAGES,
  getFormsForStage,
  getWorkflowProgress,
} from "../config/supremeCourtPetitionJudicialReviewRespondentWorkflow";

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.not_started;
  return <span className={`ccard__badge ${meta.badgeClass}`}>{meta.label}</span>;
}

// Exported so PetitionGuidanceWorkspace can reuse the same official-forms
// card rendering for Stages 9-11 instead of a second copy of this markup.
export function StageForms({ stageId }) {
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
            <p className="scc-form-card__purpose"><strong>Source Rule:</strong> {form.sourceRule}</p>
            <p className="scc-form-card__purpose"><strong>Confirm before relying on this:</strong> {form.confirmNote}</p>
            <div className="scc-form-card__links">
              <a href={form.sourceUrl} target="_blank" rel="noopener noreferrer">
                Official form source
              </a>
              <a href={SUPREME_COURT_CIVIL_RULES_URL} target="_blank" rel="noopener noreferrer">
                Supreme Court Civil Rules
              </a>
              <a href={JUDICIAL_REVIEW_PROCEDURE_ACT_URL} target="_blank" rel="noopener noreferrer">
                Judicial Review Procedure Act
              </a>
            </div>
          </div>
        ))}
      </div>
      <p className="scc-form-verified">Last verified {forms[0]?.lastVerified || ""} against the official BC Government forms index. The registry or a lawyer may need to confirm the exact procedural requirement for this case.</p>
    </div>
  );
}

const STAGE_WORKSPACE_LINKS = {
  petitionReliefAnalysis: { targetId: "pjr-relief-workspace", label: "Open Relief & Position Matrix" },
  jrScreening: { targetId: "pjr-relief-workspace", label: "Open Judicial Review Screening" },
  responsePlanning: { targetId: "pjr-relief-workspace", label: "Open Response Planning (Form 67)" },
  evidenceAffidavitPlan: { targetId: "pjr-evidence-workspace", label: "Open Evidence & Affidavit Plan" },
  affidavitDraft: { targetId: "pjr-evidence-workspace", label: "Open Affidavit Working Draft Route" },
  interlocutoryApplication: { targetId: "pjr-applications-workspace", label: "Open Application / Stay / Injunction Workspace" },
  hearingReadiness: { targetId: "pjr-guidance-workspace", label: "Open Hearing Readiness Checklist" },
  hearingBinder: { targetId: "pjr-guidance-workspace", label: "Open Hearing Binder Plan" },
  finalOrder: { targetId: "pjr-guidance-workspace", label: "Open Final Order & Post-Decision Checklist" },
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
        <strong>What the respondent should prepare</strong>
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

// Guidance-only framework for a respondent to a BC Supreme Court Petition,
// including a Petition for Judicial Review. Structurally parallel to
// SupremeCourtCaseNavigator (Civil Claim Defendant workflow) but with its
// own stage list — see supremeCourtPetitionJudicialReviewRespondentWorkflow.js
// for why a Petition is not answered the same way as a Notice of Civil
// Claim. Status per stage is derived from data already on the case record;
// see getWorkflowProgress for why nothing is persisted here.
export default function SupremeCourtPetitionCaseNavigator({ review, petitionRelief, petitionEvidence, petitionApplications, petitionGuidance }) {
  if (!isPetitionJrRespondentCase(review || {})) return null;

  const progress = getWorkflowProgress(
    review,
    petitionRelief?.reliefMatrix,
    petitionRelief?.jrScreening,
    petitionRelief?.form67Eligibility,
    petitionEvidence,
    petitionApplications,
    petitionGuidance
  );

  function scrollToWorkspace(targetId) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="scc-navigator">
      <h3 className="dispute-admin-heading">BC Supreme Court Petition / Judicial Review Case Navigator</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{LEGAL_INFORMATION_NOTICE}</p>
      </div>

      {WORKFLOW_STAGES.map((stage) => {
        const status = progress[stage.id];
        return (
          <CollapsibleCard
            key={stage.id}
            id={`pjr-stage-${stage.id}`}
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
