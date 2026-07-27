import { useEffect, useState } from "react";
import { StageForms } from "./SupremeCourtPetitionCaseNavigator";
import { generateForm67DraftPdf, getDisputePetitionRelief, saveDisputePetitionRelief } from "../utils/disputeReview";
import {
  AG_NOTICE_STATUSES,
  FORM67_DRAFT_LABEL,
  JR_ISSUE_CATEGORIES,
  JR_SCREENING_NOTICE,
  RELIEF_MATRIX_NOTICE,
  RELIEF_MATRIX_ROW_STATUSES,
  RELIEF_POSITIONS,
  TRIBUNAL_RECORD_STATUSES,
  buildForm67WorkingDraft,
  checkForm67Eligibility,
  makeJrScreening,
  makeReliefMatrixRow,
  reliefMatrixSummary,
} from "../config/supremeCourtPetitionJudicialReviewRespondentWorkflow";

const YES_NO_NOT_SURE = ["Yes", "No", "Not Sure"];

function ReliefRow({ row, expanded, onToggle, onChange, onRemove }) {
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">
          {row.paragraphNumber ? `¶${row.paragraphNumber} — ` : ""}{row.orderSought || "(order not yet described)"}
        </span>
        <span className="ccard__badge ccard__badge--conditional">{row.respondentPosition}</span>
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Petition paragraph number</label>
              <input className="form-control" type="number" value={row.paragraphNumber || ""} onChange={(e) => onChange({ paragraphNumber: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="form-group">
              <label>Respondent position</label>
              <select className="form-control" value={row.respondentPosition} onChange={(e) => onChange({ respondentPosition: e.target.value })}>
                {RELIEF_POSITIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Order sought (petitioner's own words)</label>
            <textarea className="form-control" rows={2} value={row.orderSought} onChange={(e) => onChange({ orderSought: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Petitioner's factual basis</label>
            <textarea className="form-control" rows={2} value={row.petitionerFactualBasis} onChange={(e) => onChange({ petitionerFactualBasis: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Petitioner's legal basis</label>
            <textarea className="form-control" rows={2} value={row.petitionerLegalBasis} onChange={(e) => onChange({ petitionerLegalBasis: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Respondent's factual basis</label>
            <textarea className="form-control" rows={2} value={row.factualBasis} onChange={(e) => onChange({ factualBasis: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Respondent's legal basis</label>
            <textarea className="form-control" rows={2} value={row.legalBasis} onChange={(e) => onChange({ legalBasis: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label><input type="checkbox" checked={row.needsAffidavitEvidence} onChange={(e) => onChange({ needsAffidavitEvidence: e.target.checked })} /> Needs affidavit evidence</label>
            </div>
            <div className="form-group">
              <label>Row status</label>
              <select className="form-control" value={row.status} onChange={(e) => onChange({ status: e.target.value })}>
                {RELIEF_MATRIX_ROW_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={row.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this order</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Combined Stage 3 (Relief & Position Matrix), Stage 4 (Judicial Review
// Screening, conditional), and Stage 5 (Response to Petition Planning /
// Form 67 gate) workspace. Persisted to the "AI Analysis JSON" envelope's
// petitionRelief sibling — see apps-script/DisputePetitionRelief.gs.
// reviewId changing remounts this component (parent passes key={reviewId}).
export default function PetitionReliefWorkspace({ reviewId, review, onPetitionReliefChange }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState("");

  useEffect(() => {
    let active = true;
    getDisputePetitionRelief(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.petitionRelief || null;
        setState(loaded);
        onPetitionReliefChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Relief & Judicial Review workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const base = state || { version: 1, reliefMatrix: { rows: [] }, jrScreening: makeJrScreening() };
  const rows = base.reliefMatrix?.rows || [];
  const jrScreening = base.jrScreening || makeJrScreening();
  const form67Eligibility = checkForm67Eligibility(review, rows);

  function replace(next) {
    setState(next);
    setDirty(true);
    setSaveState("idle");
    onPetitionReliefChange?.({ ...next, form67Eligibility: checkForm67Eligibility(review, next.reliefMatrix?.rows || []) });
  }

  function addRow() {
    const row = makeReliefMatrixRow();
    replace({ ...base, reliefMatrix: { rows: [...rows, row] } });
    setExpandedId(row.id);
  }
  function updateRow(id, patch) {
    replace({ ...base, reliefMatrix: { rows: rows.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)) } });
  }
  function removeRow(id) {
    if (!window.confirm("Remove this requested order from the matrix?")) return;
    replace({ ...base, reliefMatrix: { rows: rows.filter((r) => r.id !== id) } });
  }
  function updateJrScreening(patch) {
    replace({ ...base, jrScreening: { ...jrScreening, ...patch, updatedAt: new Date().toISOString() } });
  }
  function toggleIssueFlag(category) {
    updateJrScreening({ issueFlags: { ...jrScreening.issueFlags, [category]: !jrScreening.issueFlags?.[category] } });
  }

  async function handleGenerateForm67Draft() {
    setDraftBusy(true);
    setDraftError("");
    try {
      const draft = buildForm67WorkingDraft(review, rows);
      await generateForm67DraftPdf(reviewId, draft);
    } catch (err) {
      setDraftError(err.message || "Failed to generate the Form 67 working draft.");
    } finally {
      setDraftBusy(false);
    }
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const result = await saveDisputePetitionRelief(reviewId, base);
      setState(result.petitionRelief);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onPetitionReliefChange?.({ ...result.petitionRelief, form67Eligibility: checkForm67Eligibility(review, result.petitionRelief?.reliefMatrix?.rows || []) });
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Relief & Judicial Review workspace.");
    }
  }

  if (loading) {
    return (
      <div id="pjr-relief-workspace" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Relief, Judicial Review Screening &amp; Response Planning</h3>
        <p className="strategy-help">Loading…</p>
      </div>
    );
  }

  const isJr = jrScreening.isJudicialReview === "Yes";
  const summary = reliefMatrixSummary(rows);

  return (
    <div id="pjr-relief-workspace" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Stage 3-5: Relief, Judicial Review Screening &amp; Response Planning</h3>

      <div className="notice notice--warm strategy-inline-notice">
        <p>{RELIEF_MATRIX_NOTICE}</p>
      </div>
      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      <div className="scc-em-summary scc-dd-summary">
        <div className="scc-em-stat"><strong>{summary.total}</strong><span>Total orders</span></div>
        <div className="scc-em-stat"><strong>{summary.consent}</strong><span>Consent</span></div>
        <div className="scc-em-stat"><strong>{summary.oppose}</strong><span>Oppose</span></div>
        <div className="scc-em-stat"><strong>{summary.noPosition}</strong><span>No position</span></div>
        <div className="scc-em-stat"><strong>{summary.unclear}</strong><span>Unclear / manual review</span></div>
      </div>

      <StageForms stageId="petitionReliefAnalysis" />

      <div className="dispute-admin-actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={addRow}>+ Add requested order</button>
      </div>

      {rows.length === 0 && <p className="strategy-help">No requested orders recorded yet — add one for each order in Part 1 of the Petition.</p>}
      {rows.map((row) => (
        <ReliefRow
          key={row.id}
          row={row}
          expanded={expandedId === row.id}
          onToggle={() => setExpandedId((c) => (c === row.id ? null : row.id))}
          onChange={(patch) => updateRow(row.id, patch)}
          onRemove={() => removeRow(row.id)}
        />
      ))}

      <div className="dispute-admin-long">
        <strong>Stage 4 — Judicial Review Screening (conditional)</strong>
        <div className="notice notice--warm strategy-inline-notice">
          <p>{JR_SCREENING_NOTICE}</p>
        </div>
        <div className="form-group">
          <label>Is this a Judicial Review?</label>
          <select className="form-control" value={jrScreening.isJudicialReview} onChange={(e) => updateJrScreening({ isJudicialReview: e.target.value })}>
            {YES_NO_NOT_SURE.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {isJr && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Decision-maker / tribunal</label>
                <input className="form-control" value={jrScreening.decisionMaker} onChange={(e) => updateJrScreening({ decisionMaker: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Enabling statute</label>
                <input className="form-control" value={jrScreening.enablingStatute} onChange={(e) => updateJrScreening({ enablingStatute: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Decision under review</label>
              <textarea className="form-control" rows={2} value={jrScreening.decisionUnderReview} onChange={(e) => updateJrScreening({ decisionUnderReview: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Decision date</label>
                <input className="form-control" type="date" value={jrScreening.decisionDate} onChange={(e) => updateJrScreening({ decisionDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Reasons received date</label>
                <input className="form-control" type="date" value={jrScreening.reasonsReceivedDate} onChange={(e) => updateJrScreening({ reasonsReceivedDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Tribunal record status</label>
                <select className="form-control" value={jrScreening.tribunalRecordStatus} onChange={(e) => updateJrScreening({ tribunalRecordStatus: e.target.value })}>
                  {TRIBUNAL_RECORD_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Remedy sought</label>
              <textarea className="form-control" rows={2} value={jrScreening.remedySought} onChange={(e) => updateJrScreening({ remedySought: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Interim relief requested?</label>
                <select className="form-control" value={jrScreening.interimReliefRequested} onChange={(e) => updateJrScreening({ interimReliefRequested: e.target.value })}>
                  {YES_NO_NOT_SURE.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Stay requested?</label>
                <select className="form-control" value={jrScreening.stayRequested} onChange={(e) => updateJrScreening({ stayRequested: e.target.value })}>
                  {YES_NO_NOT_SURE.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Attorney General notice status</label>
                <select className="form-control" value={jrScreening.agNoticeStatus} onChange={(e) => updateJrScreening({ agNoticeStatus: e.target.value })}>
                  {AG_NOTICE_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Screening issue categories (flags for review only — not conclusions)</label>
              <div className="scc-late-checklist">
                {JR_ISSUE_CATEGORIES.map((cat) => (
                  <label key={cat} className="scc-late-checklist__row">
                    <input type="checkbox" checked={!!jrScreening.issueFlags?.[cat]} onChange={() => toggleIssueFlag(cat)} /> {cat}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Facts vs. legal grounds notes (internal only)</label>
              <textarea className="form-control" rows={2} value={jrScreening.factsVsGroundsNotes} onChange={(e) => updateJrScreening({ factsVsGroundsNotes: e.target.value })} />
            </div>
          </>
        )}
      </div>

      <div className="dispute-admin-long">
        <strong>Stage 5 — Response to Petition (Form 67) Eligibility</strong>
        <div className={`notice ${form67Eligibility.eligible ? "notice--success" : "notice--warm"} strategy-inline-notice`}>
          {form67Eligibility.eligible ? (
            <>
              <p>Minimum information threshold met. A working draft can be generated, labelled &ldquo;{FORM67_DRAFT_LABEL}&rdquo;.</p>
              <div className="dispute-admin-actions">
                <button type="button" className="btn btn--primary btn--small" onClick={handleGenerateForm67Draft} disabled={draftBusy}>
                  {draftBusy ? "Generating…" : "Generate Form 67 Working Draft PDF"}
                </button>
              </div>
              {draftError && <p className="scc-em-save-status scc-em-save-status--error">{draftError}</p>}
            </>
          ) : (
            <>
              <p>Not yet eligible for a Form 67 working draft. Outstanding:</p>
              <ul>{form67Eligibility.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </>
          )}
        </div>
      </div>

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Relief, Screening & Response Planning"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
