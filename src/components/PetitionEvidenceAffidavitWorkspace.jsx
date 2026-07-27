import { useEffect, useState } from "react";
import { StageForms } from "./SupremeCourtPetitionCaseNavigator";
import { generateAffidavitDraftPdf, getDisputePetitionEvidence, saveDisputePetitionEvidence } from "../utils/disputeReview";
import {
  AFFIDAVIT_DRAFT_LABEL,
  AFFIDAVIT_WITNESS_ROLES,
  EVIDENCE_AFFIDAVIT_PLAN_CAUTIONS,
  EVIDENCE_AFFIDAVIT_PLAN_NOTICE,
  EVIDENCE_CATEGORIES,
  EVIDENCE_ITEM_STATUSES,
  buildAffidavitWorkingDraft,
  checkAffidavitDraftGate,
  evidenceAffidavitPlanSummary,
  makeAffidavitWitness,
  makeEvidenceItem,
} from "../config/supremeCourtPetitionJudicialReviewRespondentWorkflow";

function EvidenceRow({ item, expanded, onToggle, onChange, onRemove }) {
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{item.title || "(untitled evidence item)"}</span>
        <span className="scc-em-row__position">{item.evidenceCategory}</span>
        {item.admissibilityConcern && <span className="ccard__badge ccard__badge--not-started">Admissibility flag</span>}
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" value={item.title} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="form-control" value={item.evidenceCategory} onChange={(e) => onChange({ evidenceCategory: e.target.value })}>
                {EVIDENCE_CATEGORIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Source document reference</label>
              <input className="form-control" value={item.sourceDocumentReference} onChange={(e) => onChange({ sourceDocumentReference: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input className="form-control" type="date" value={item.date} onChange={(e) => onChange({ date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Exhibit label</label>
              <input className="form-control" value={item.exhibitLabel} onChange={(e) => onChange({ exhibitLabel: e.target.value })} placeholder="e.g. Exhibit A" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label><input type="checkbox" checked={item.admissibilityConcern} onChange={(e) => onChange({ admissibilityConcern: e.target.checked })} /> Potential admissibility/hearsay concern</label>
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={item.confidentialityFlag} onChange={(e) => onChange({ confidentialityFlag: e.target.checked })} /> Confidential / needs redaction review</label>
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={item.translationRequired} onChange={(e) => onChange({ translationRequired: e.target.checked })} /> Translation required</label>
            </div>
          </div>
          {item.admissibilityConcern && (
            <div className="form-group">
              <label>Admissibility notes (for legal review)</label>
              <textarea className="form-control" rows={2} value={item.admissibilityNotes} onChange={(e) => onChange({ admissibilityNotes: e.target.value })} />
            </div>
          )}
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={item.status} onChange={(e) => onChange({ status: e.target.value })}>
              {EVIDENCE_ITEM_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this evidence item</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WitnessCard({ witness, evidenceItems, review, reviewId, expanded, onToggle, onChange, onRemove }) {
  const gate = checkAffidavitDraftGate(witness);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState("");

  function toggleEvidenceLink(id) {
    const set = new Set(witness.sourceEvidenceIds || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange({ sourceEvidenceIds: Array.from(set) });
  }

  async function handleGenerateDraft() {
    setDraftBusy(true);
    setDraftError("");
    try {
      const draft = buildAffidavitWorkingDraft(review, witness, evidenceItems);
      await generateAffidavitDraftPdf(reviewId, draft);
    } catch (err) {
      setDraftError(err.message || "Failed to generate the affidavit working draft.");
    } finally {
      setDraftBusy(false);
    }
  }
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{witness.roleDescription}</span>
        <span className={`ccard__badge ${gate.eligible ? "ccard__badge--completed" : "ccard__badge--conditional"}`}>
          {gate.eligible ? "Affidavit draft eligible" : "Not yet eligible"}
        </span>
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-group">
            <label>Role</label>
            <select className="form-control" value={witness.roleDescription} onChange={(e) => onChange({ roleDescription: e.target.value })}>
              {AFFIDAVIT_WITNESS_ROLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Factual purpose of this affidavit</label>
            <textarea className="form-control" rows={2} value={witness.factualPurpose} onChange={(e) => onChange({ factualPurpose: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Linked evidence (source facts)</label>
            <div className="scc-late-checklist">
              {evidenceItems.length === 0 && <p className="strategy-help">No evidence items recorded yet.</p>}
              {evidenceItems.map((e) => (
                <label key={e.id} className="scc-late-checklist__row">
                  <input type="checkbox" checked={(witness.sourceEvidenceIds || []).includes(e.id)} onChange={() => toggleEvidenceLink(e.id)} /> {e.title || "(untitled)"}{e.exhibitLabel ? ` — ${e.exhibitLabel}` : ""}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={witness.verificationAcknowledged} onChange={(e) => onChange({ verificationAcknowledged: e.target.checked })} /> Affiant has acknowledged they must personally verify every fact before signing</label>
          </div>
          {!gate.eligible && (
            <div className="notice notice--warm strategy-inline-notice">
              <strong>Not yet eligible for an affidavit working draft</strong>
              <ul>{gate.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {gate.eligible && (
            <div className="notice notice--success strategy-inline-notice">
              <p>Eligible for an affidavit working draft, labelled &ldquo;{AFFIDAVIT_DRAFT_LABEL}&rdquo;.</p>
              <div className="dispute-admin-actions">
                <button type="button" className="btn btn--primary btn--small" onClick={handleGenerateDraft} disabled={draftBusy}>
                  {draftBusy ? "Generating…" : "Generate Affidavit Working Draft PDF"}
                </button>
              </div>
              {draftError && <p className="scc-em-save-status scc-em-save-status--error">{draftError}</p>}
            </div>
          )}
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={witness.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this affiant</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Combined Stage 6 (Evidence and Affidavit Plan) and Stage 7 (Affidavit
// Working Draft Route, conditional per-witness) workspace. Persisted to the
// "AI Analysis JSON" envelope's petitionEvidence sibling — see
// apps-script/DisputePetitionEvidence.gs. reviewId changing remounts this
// component (parent passes key={reviewId}).
export default function PetitionEvidenceAffidavitWorkspace({ reviewId, review, onPetitionEvidenceChange }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState(null);
  const [expandedWitnessId, setExpandedWitnessId] = useState(null);

  useEffect(() => {
    let active = true;
    getDisputePetitionEvidence(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.petitionEvidence || null;
        setState(loaded);
        onPetitionEvidenceChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Evidence & Affidavit Plan workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const base = state || { version: 1, evidenceItems: [], witnesses: [] };
  const evidenceItems = base.evidenceItems || [];
  const witnesses = base.witnesses || [];

  function replace(next) {
    setState(next);
    setDirty(true);
    setSaveState("idle");
    onPetitionEvidenceChange?.(next);
  }

  function addEvidence() {
    const item = makeEvidenceItem();
    replace({ ...base, evidenceItems: [...evidenceItems, item] });
    setExpandedEvidenceId(item.id);
  }
  function updateEvidence(id, patch) {
    replace({ ...base, evidenceItems: evidenceItems.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)) });
  }
  function removeEvidence(id) {
    if (!window.confirm("Remove this evidence item? The original source file is never deleted.")) return;
    replace({ ...base, evidenceItems: evidenceItems.filter((e) => e.id !== id) });
  }
  function addWitness() {
    const witness = makeAffidavitWitness();
    replace({ ...base, witnesses: [...witnesses, witness] });
    setExpandedWitnessId(witness.id);
  }
  function updateWitness(id, patch) {
    replace({ ...base, witnesses: witnesses.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w)) });
  }
  function removeWitness(id) {
    if (!window.confirm("Remove this affiant?")) return;
    replace({ ...base, witnesses: witnesses.filter((w) => w.id !== id) });
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const result = await saveDisputePetitionEvidence(reviewId, base);
      setState(result.petitionEvidence);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onPetitionEvidenceChange?.(result.petitionEvidence);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Evidence & Affidavit Plan workspace.");
    }
  }

  if (loading) {
    return (
      <div id="pjr-evidence-workspace" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Evidence &amp; Affidavit Plan</h3>
        <p className="strategy-help">Loading…</p>
      </div>
    );
  }

  const summary = evidenceAffidavitPlanSummary(evidenceItems, witnesses);

  return (
    <div id="pjr-evidence-workspace" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Stage 6-7: Evidence &amp; Affidavit Plan</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{EVIDENCE_AFFIDAVIT_PLAN_NOTICE}</p>
        <ul>{EVIDENCE_AFFIDAVIT_PLAN_CAUTIONS.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      <div className="scc-em-summary scc-dd-summary">
        <div className="scc-em-stat"><strong>{summary.totalEvidence}</strong><span>Evidence items</span></div>
        <div className="scc-em-stat"><strong>{summary.exhibitsAssigned}</strong><span>Exhibits assigned</span></div>
        <div className="scc-em-stat"><strong>{summary.admissibilityConcerns}</strong><span>Admissibility flags</span></div>
        <div className="scc-em-stat"><strong>{summary.translationNeeded}</strong><span>Translation needed</span></div>
        <div className="scc-em-stat"><strong>{summary.totalWitnesses}</strong><span>Proposed affiants</span></div>
        <div className="scc-em-stat"><strong>{summary.witnessesReady}</strong><span>Draft-eligible</span></div>
      </div>

      <StageForms stageId="evidenceAffidavitPlan" />

      <div className="dispute-admin-long">
        <strong>Evidence inventory</strong>
        <div className="dispute-admin-actions">
          <button type="button" className="btn btn--secondary btn--small" onClick={addEvidence}>+ Add evidence item</button>
        </div>
        {evidenceItems.length === 0 && <p className="strategy-help">No evidence items recorded yet.</p>}
        {evidenceItems.map((item) => (
          <EvidenceRow
            key={item.id}
            item={item}
            expanded={expandedEvidenceId === item.id}
            onToggle={() => setExpandedEvidenceId((c) => (c === item.id ? null : item.id))}
            onChange={(patch) => updateEvidence(item.id, patch)}
            onRemove={() => removeEvidence(item.id)}
          />
        ))}
      </div>

      <div className="dispute-admin-long">
        <strong>Stage 7 — Affidavit witness matrix</strong>
        <p className="strategy-help">Each affiant swears only to their own knowledge — witnesses are not merged into one affidavit by default.</p>
        <div className="dispute-admin-actions">
          <button type="button" className="btn btn--secondary btn--small" onClick={addWitness}>+ Add proposed affiant</button>
        </div>
        {witnesses.length === 0 && <p className="strategy-help">No affiants identified yet.</p>}
        {witnesses.map((witness) => (
          <WitnessCard
            key={witness.id}
            witness={witness}
            evidenceItems={evidenceItems}
            review={review}
            reviewId={reviewId}
            expanded={expandedWitnessId === witness.id}
            onToggle={() => setExpandedWitnessId((c) => (c === witness.id ? null : witness.id))}
            onChange={(patch) => updateWitness(witness.id, patch)}
            onRemove={() => removeWitness(witness.id)}
          />
        ))}
      </div>

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Evidence & Affidavit Plan"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
