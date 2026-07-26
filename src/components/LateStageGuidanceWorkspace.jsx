import { useEffect, useState } from "react";
import CollapsibleCard from "./CollapsibleCard";
import { StageForms } from "./SupremeCourtCaseNavigator";
import { getDisputeLateStageGuidance, saveDisputeLateStageGuidance } from "../utils/disputeReview";
import {
  LATE_STAGE_CHECKLIST_ITEMS,
  LATE_STAGE_CHECKLIST_STATUSES,
  LATE_STAGE_GUIDANCE_NOTICE,
  LATE_STAGE_LAWYER_REVIEW_CHECKPOINTS,
  STATUS_META,
  WORKFLOW_STAGES,
  deriveLateStageStatus,
  makeLateStageGuidance,
} from "../config/supremeCourtCivilClaimDefendantWorkflow";

const LATE_STAGE_IDS = ["trialPreparation", "courtBinder", "judgmentCostsEnforcement"];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.not_started;
  return <span className={`ccard__badge ${meta.badgeClass}`}>{meta.label}</span>;
}

function LateStageCard({ stageId, subState, onChecklistChange, onNotesChange }) {
  const stage = WORKFLOW_STAGES.find((s) => s.id === stageId);
  const items = LATE_STAGE_CHECKLIST_ITEMS[stageId] || [];
  const checklist = subState?.checklist || {};
  const computedStatus = deriveLateStageStatus(stageId, checklist);

  return (
    <CollapsibleCard
      id={`scc-stage-workspace-${stageId}`}
      className="scc-stage-card"
      defaultOpen={false}
      title={
        <span className="scc-stage-title">
          <span className="scc-stage-number">{stage.number}</span>
          {stage.title}
        </span>
      }
      badge={<StatusBadge status={computedStatus} />}
    >
      <div className="dispute-admin-long">
        <strong>What this stage means</strong>
        <p>{stage.whatItMeans}</p>
      </div>
      <div className="dispute-admin-long">
        <strong>When this stage may apply</strong>
        <p>{stage.whenItHappens}</p>
      </div>
      <div className="dispute-admin-long">
        <strong>What to organize</strong>
        <ul>{stage.prepare.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </div>

      <StageForms stageId={stageId} />

      <div className="dispute-admin-long">
        <strong>Completion checklist</strong>
        <div className="scc-late-checklist">
          {items.map((item) => (
            <div className="scc-late-checklist__row" key={item.id}>
              <span className="scc-late-checklist__label">{item.label}</span>
              <select
                className="form-control"
                value={checklist[item.id] || "Not Started"}
                onChange={(e) => onChecklistChange(item.id, e.target.value)}
              >
                {LATE_STAGE_CHECKLIST_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {stage.cautions.length > 0 && (
        <div className="notice notice--warm strategy-inline-notice">
          <strong>Important cautions</strong>
          <ul>{stage.cautions.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}

      <div className="notice notice--sage strategy-inline-notice">
        <strong>Lawyer review checkpoint</strong>
        <p>{LATE_STAGE_LAWYER_REVIEW_CHECKPOINTS[stageId]}</p>
      </div>

      <div className="form-group">
        <label>Notes (internal only)</label>
        <textarea
          className="form-control"
          rows={2}
          value={subState?.notes || ""}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </CollapsibleCard>
  );
}

// Combined, deliberately lighter workspace for Stages 9-11 (Trial
// Preparation, Hearing / Court Binder, Judgment/Costs/Enforcement) — guide +
// checklist + resources + lawyer-review checkpoints, never courtroom
// strategy. Persists one compact sibling in the same "AI Analysis JSON"
// envelope used by every other workspace (see
// apps-script/DisputeLateStageGuidance.gs) — reviewId changing remounts this
// component (parent passes key={reviewId}).
export default function LateStageGuidanceWorkspace({ reviewId, onLateStageGuidanceChange }) {
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    getDisputeLateStageGuidance(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.lateStageGuidance || null;
        setGuidance(loaded);
        onLateStageGuidanceChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the late-stage guidance workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  function updateStage(stageId, patch) {
    const base = guidance || makeLateStageGuidance();
    const nextStageState = { ...(base[stageId] || {}), ...patch, updatedAt: new Date().toISOString() };
    nextStageState.status = deriveLateStageStatus(stageId, nextStageState.checklist || {});
    const next = { ...base, [stageId]: nextStageState };
    setGuidance(next);
    setDirty(true);
    setSaveState("idle");
    onLateStageGuidanceChange?.(next);
  }

  function updateChecklistItem(stageId, itemId, value) {
    const base = guidance || makeLateStageGuidance();
    const checklist = { ...(base[stageId]?.checklist || {}), [itemId]: value };
    updateStage(stageId, { checklist });
  }

  function updateNotes(stageId, notes) {
    updateStage(stageId, { notes });
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const toSave = guidance || makeLateStageGuidance();
      const result = await saveDisputeLateStageGuidance(reviewId, toSave);
      setGuidance(result.lateStageGuidance);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onLateStageGuidanceChange?.(result.lateStageGuidance);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the late-stage guidance workspace.");
    }
  }

  if (loading) {
    return (
      <div id="scc-late-stage-guidance" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Trial, Hearing &amp; Post-Judgment Guidance</h3>
        <p className="strategy-help">Loading late-stage guidance…</p>
      </div>
    );
  }

  return (
    <div id="scc-late-stage-guidance" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Trial, Hearing &amp; Post-Judgment Guidance</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{LATE_STAGE_GUIDANCE_NOTICE}</p>
      </div>

      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      {LATE_STAGE_IDS.map((stageId) => (
        <LateStageCard
          key={stageId}
          stageId={stageId}
          subState={guidance?.[stageId]}
          onChecklistChange={(itemId, value) => updateChecklistItem(stageId, itemId, value)}
          onNotesChange={(notes) => updateNotes(stageId, notes)}
        />
      ))}

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Late-Stage Guidance"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
