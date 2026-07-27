import { useEffect, useState } from "react";
import CollapsibleCard from "./CollapsibleCard";
import { StageForms } from "./SupremeCourtPetitionCaseNavigator";
import { generatePetitionHearingBinderIndexPdf, getDisputePetitionGuidance, saveDisputePetitionGuidance } from "../utils/disputeReview";
import {
  BINDER_SECTIONS,
  FINAL_ORDER_NOTICE,
  HEARING_BINDER_NOTICE,
  HEARING_READINESS_NOTICE,
  LATE_STAGE_CHECKLIST_STATUSES,
  PETITION_GUIDANCE_CHECKLIST_ITEMS,
  STATUS_META,
  WORKFLOW_STAGES,
  buildHearingBinderIndexDraft,
  checkHearingBinderGate,
  deriveGuidanceStatus,
  makePetitionGuidance,
} from "../config/supremeCourtPetitionJudicialReviewRespondentWorkflow";

const GUIDANCE_STAGE_IDS = ["hearingReadiness", "hearingBinder", "finalOrder"];
const GUIDANCE_NOTICES = {
  hearingReadiness: HEARING_READINESS_NOTICE,
  hearingBinder: HEARING_BINDER_NOTICE,
  finalOrder: FINAL_ORDER_NOTICE,
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.not_started;
  return <span className={`ccard__badge ${meta.badgeClass}`}>{meta.label}</span>;
}

function GuidanceCard({ stageId, subState, reviewId, review, onChecklistChange, onNotesChange, onAcceptMissingWarning, onConfirmedDocumentsChange }) {
  const stage = WORKFLOW_STAGES.find((s) => s.id === stageId);
  const items = PETITION_GUIDANCE_CHECKLIST_ITEMS[stageId] || [];
  const checklist = subState?.checklist || {};
  const computedStatus = deriveGuidanceStatus(stageId, checklist);
  const binderGate = stageId === "hearingBinder" ? checkHearingBinderGate(subState) : null;
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState("");

  async function handleGenerateBinderIndex() {
    setDraftBusy(true);
    setDraftError("");
    try {
      const labels = String(subState?.confirmedDocumentsText || "").split("\n").map((s) => s.trim()).filter(Boolean);
      const draft = buildHearingBinderIndexDraft(review, subState, labels);
      await generatePetitionHearingBinderIndexPdf(reviewId, draft);
    } catch (err) {
      setDraftError(err.message || "Failed to generate the hearing binder index.");
    } finally {
      setDraftBusy(false);
    }
  }

  return (
    <CollapsibleCard
      id={`pjr-stage-workspace-${stageId}`}
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
      <div className="notice notice--warm strategy-inline-notice">
        <p>{GUIDANCE_NOTICES[stageId]}</p>
      </div>

      {stageId === "hearingBinder" && (
        <div className="dispute-admin-long">
          <strong>Binder sections (populated only from verified filed/generated documents)</strong>
          <ul>{BINDER_SECTIONS.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

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

      {stageId === "hearingBinder" && (
        <>
          <div className="form-group">
            <label>Confirmed filed/generated documents (one per line — only these appear in the index)</label>
            <textarea
              className="form-control"
              rows={3}
              value={subState?.confirmedDocumentsText || ""}
              onChange={(e) => onConfirmedDocumentsChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={!!subState?.missingDocumentWarningAccepted} onChange={(e) => onAcceptMissingWarning(e.target.checked)} />
              {" "}I have reviewed the missing-document warning and understand unfiled evidence will not silently enter the binder
            </label>
          </div>
          {binderGate && !binderGate.eligible && (
            <div className="notice notice--warm strategy-inline-notice">
              <strong>Binder index not yet available</strong>
              <ul>{binderGate.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {binderGate && binderGate.eligible && (
            <div className="notice notice--success strategy-inline-notice">
              <p>Minimum requirements met. A binder index can be generated (labelled &ldquo;Preliminary Binder&rdquo; unless the hearing date is confirmed).</p>
              <div className="dispute-admin-actions">
                <button type="button" className="btn btn--primary btn--small" onClick={handleGenerateBinderIndex} disabled={draftBusy}>
                  {draftBusy ? "Generating…" : "Generate Hearing Binder Index PDF"}
                </button>
              </div>
              {draftError && <p className="scc-em-save-status scc-em-save-status--error">{draftError}</p>}
            </div>
          )}
        </>
      )}

      {stage.cautions.length > 0 && (
        <div className="notice notice--warm strategy-inline-notice">
          <strong>Important cautions</strong>
          <ul>{stage.cautions.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}

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

// Combined, deliberately lighter workspace for Stages 9-11 (Hearing
// Readiness, Hearing Binder, Final Order/Post-Decision) — guide + checklist,
// never courtroom strategy or a merits prediction. Mirrors
// LateStageGuidanceWorkspace's pattern from the Civil Claim workflow.
// Persists one compact sibling in the "AI Analysis JSON" envelope — see
// apps-script/DisputePetitionGuidance.gs. reviewId changing remounts this
// component (parent passes key={reviewId}).
export default function PetitionGuidanceWorkspace({ reviewId, review, onPetitionGuidanceChange }) {
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    getDisputePetitionGuidance(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.petitionGuidance || null;
        setGuidance(loaded);
        onPetitionGuidanceChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Hearing Readiness / Binder / Final Order workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  function updateStage(stageId, patch) {
    const base = guidance || makePetitionGuidance();
    const nextStageState = { ...(base[stageId] || {}), ...patch, updatedAt: new Date().toISOString() };
    nextStageState.status = deriveGuidanceStatus(stageId, nextStageState.checklist || {});
    const next = { ...base, [stageId]: nextStageState };
    setGuidance(next);
    setDirty(true);
    setSaveState("idle");
    onPetitionGuidanceChange?.(next);
  }

  function updateChecklistItem(stageId, itemId, value) {
    const base = guidance || makePetitionGuidance();
    const checklist = { ...(base[stageId]?.checklist || {}), [itemId]: value };
    updateStage(stageId, { checklist });
  }
  function updateNotes(stageId, notes) {
    updateStage(stageId, { notes });
  }
  function updateMissingWarning(accepted) {
    updateStage("hearingBinder", { missingDocumentWarningAccepted: accepted });
  }
  function updateConfirmedDocuments(text) {
    updateStage("hearingBinder", { confirmedDocumentsText: text });
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const toSave = guidance || makePetitionGuidance();
      const result = await saveDisputePetitionGuidance(reviewId, toSave);
      setGuidance(result.petitionGuidance);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onPetitionGuidanceChange?.(result.petitionGuidance);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Hearing Readiness / Binder / Final Order workspace.");
    }
  }

  if (loading) {
    return (
      <div id="pjr-guidance-workspace" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Hearing Readiness, Binder &amp; Final Order</h3>
        <p className="strategy-help">Loading…</p>
      </div>
    );
  }

  return (
    <div id="pjr-guidance-workspace" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Stage 9-11: Hearing Readiness, Binder &amp; Final Order</h3>
      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      {GUIDANCE_STAGE_IDS.map((stageId) => (
        <GuidanceCard
          key={stageId}
          stageId={stageId}
          subState={guidance?.[stageId]}
          reviewId={reviewId}
          review={review}
          onChecklistChange={(itemId, value) => updateChecklistItem(stageId, itemId, value)}
          onNotesChange={(notes) => updateNotes(stageId, notes)}
          onAcceptMissingWarning={updateMissingWarning}
          onConfirmedDocumentsChange={updateConfirmedDocuments}
        />
      ))}

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Hearing Readiness / Binder / Final Order"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
