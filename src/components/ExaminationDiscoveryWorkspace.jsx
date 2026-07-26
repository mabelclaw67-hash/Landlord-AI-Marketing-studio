import { useEffect, useState } from "react";
import { getDisputeExaminationDiscovery, saveDisputeExaminationDiscovery } from "../utils/disputeReview";
import {
  APPLICABILITY_STATUSES,
  EXAMINATION_DISCOVERY_CAUTIONS,
  EXAMINATION_DISCOVERY_NOTICE,
  EXAMINATION_STATUSES,
  EXAMINEE_SIDES,
  ISSUE_PREPARATION_STATUSES,
  ISSUE_SOURCE_TYPES,
  LOCATION_METHODS,
  READINESS_PREPARATION_STATUSES,
  UNDERTAKING_RESPONSE_STATUSES,
  computeUndertakingTiming,
  examinationDiscoverySummary,
  getExaminationReadiness,
  importIssuesFromDocumentDiscovery,
  importIssuesFromEvidenceMatrix,
  makeExaminationReadiness,
  makeExaminee,
  makePreparationIssue,
  makeTranscriptReference,
  makeUndertaking,
} from "../config/supremeCourtCivilClaimDefendantWorkflow";

const SECTIONS = ["Readiness", "Examinees", "Preparation Issues", "Undertakings", "Transcript Follow-Up"];

function emptyExamination() {
  return {
    version: 1,
    readiness: makeExaminationReadiness(),
    examinees: [],
    preparationIssues: [],
    undertakings: [],
    transcriptReferences: [],
  };
}

function ReadinessSection({ readiness, onChange }) {
  return (
    <div className="scc-em-row__body scc-em-row--open">
      <div className="form-row">
        <div className="form-group">
          <label>Applicability status</label>
          <select className="form-control" value={readiness.applicabilityStatus} onChange={(e) => onChange({ applicabilityStatus: e.target.value })}>
            {APPLICABILITY_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Preparation status</label>
          <select className="form-control" value={readiness.preparationStatus} onChange={(e) => onChange({ preparationStatus: e.target.value })}>
            {READINESS_PREPARATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Scheduled date</label>
          <input className="form-control" type="date" value={readiness.scheduledDate} onChange={(e) => onChange({ scheduledDate: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Scheduled time</label>
          <input className="form-control" type="time" value={readiness.scheduledTime} onChange={(e) => onChange({ scheduledTime: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Location / method</label>
          <select className="form-control" value={readiness.locationOrMethod} onChange={(e) => onChange({ locationOrMethod: e.target.value })}>
            {LOCATION_METHODS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label><input type="checkbox" checked={readiness.noticeReceived} onChange={(e) => onChange({ noticeReceived: e.target.checked })} /> Notice received</label>
        </div>
        <div className="form-group">
          <label>Notice date</label>
          <input className="form-control" type="date" value={readiness.noticeDate} onChange={(e) => onChange({ noticeDate: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Appointment form reference (Form 23)</label>
          <input className="form-control" value={readiness.appointmentFormReference} onChange={(e) => onChange({ appointmentFormReference: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Estimated duration</label>
          <input className="form-control" value={readiness.estimatedDuration} onChange={(e) => onChange({ estimatedDuration: e.target.value })} placeholder="e.g. half day" />
        </div>
        <div className="form-group">
          <label><input type="checkbox" checked={readiness.interpreterNeeded} onChange={(e) => onChange({ interpreterNeeded: e.target.checked })} /> Interpreter needed</label>
        </div>
        <div className="form-group">
          <label><input type="checkbox" checked={readiness.counselOrAdvisorReviewRecommended} onChange={(e) => onChange({ counselOrAdvisorReviewRecommended: e.target.checked })} /> Counsel/advisor review recommended</label>
        </div>
      </div>
      <div className="form-group">
        <label>Accessibility needs</label>
        <textarea className="form-control" rows={2} value={readiness.accessibilityNeeds} onChange={(e) => onChange({ accessibilityNeeds: e.target.value })} />
      </div>
      <div className="form-group">
        <label>General notes</label>
        <textarea className="form-control" rows={2} value={readiness.generalNotes} onChange={(e) => onChange({ generalNotes: e.target.value })} />
      </div>

      <div className="dispute-admin-long">
        <strong>Official Forms and Rules</strong>
        <div className="scc-form-grid">
          <div className="scc-form-card">
            <div className="scc-form-card__head">
              <span className="scc-form-card__number">Form 23</span>
              <span className="scc-form-pill scc-form-pill--conditional">Conditional</span>
            </div>
            <p className="scc-form-card__name">Appointment to Examine for Discovery</p>
            <p className="scc-form-card__purpose">Sets the date, time, and place for an oral examination for discovery. Not every case requires one.</p>
            <div className="scc-form-card__links">
              <a href="https://www2.gov.bc.ca/gov/content/justice/courthouse-services/documents-forms-records/court-forms/sup-civil-forms" target="_blank" rel="noopener noreferrer">Official form source</a>
              <a href="https://www.bclaws.gov.bc.ca/civix/document/id/crbc/crbc/168_2009_multi" target="_blank" rel="noopener noreferrer">Supreme Court Civil Rules</a>
            </div>
          </div>
        </div>
        <p className="scc-form-verified">Filing and service requirements vary by case — confirm current deadlines with the registry or counsel; none shown here should be treated as universal.</p>
      </div>
    </div>
  );
}

function ExamineeCard({ examinee, expanded, onToggle, onChange, onRemove }) {
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{examinee.name || "(unnamed examinee)"}</span>
        <span className="scc-em-row__position">{examinee.side}</span>
        <span className="ccard__badge ccard__badge--conditional">{examinee.examinationStatus}</span>
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input className="form-control" value={examinee.name} onChange={(e) => onChange({ name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Party or role</label>
              <input className="form-control" value={examinee.partyOrRole} onChange={(e) => onChange({ partyOrRole: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Organization</label>
              <input className="form-control" value={examinee.organization} onChange={(e) => onChange({ organization: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Side</label>
              <select className="form-control" value={examinee.side} onChange={(e) => onChange({ side: e.target.value })}>
                {EXAMINEE_SIDES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Examination status</label>
              <select className="form-control" value={examinee.examinationStatus} onChange={(e) => onChange({ examinationStatus: e.target.value })}>
                {EXAMINATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Scheduled date</label>
              <input className="form-control" type="date" value={examinee.scheduledDate} onChange={(e) => onChange({ scheduledDate: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Estimated duration</label>
              <input className="form-control" value={examinee.estimatedDuration} onChange={(e) => onChange({ estimatedDuration: e.target.value })} />
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={examinee.interpreterNeeded} onChange={(e) => onChange({ interpreterNeeded: e.target.checked })} /> Interpreter needed</label>
            </div>
          </div>
          <div className="form-group">
            <label>Preparation notes</label>
            <textarea className="form-control" rows={2} value={examinee.preparationNotes} onChange={(e) => onChange({ preparationNotes: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={examinee.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this examinee</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreparationIssueCard({ issue, expanded, onToggle, onChange, onRemove, sourceChanged }) {
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{issue.title || "(untitled issue)"}</span>
        <span className="scc-em-row__position">{issue.sourceType}</span>
        <span className="ccard__badge ccard__badge--conditional">{issue.preparationStatus}</span>
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {sourceChanged && (
        <div className="notice notice--warm strategy-inline-notice scc-em-drift-notice">
          <p>The source content for this issue has changed since it was imported. Review and update if needed.</p>
        </div>
      )}
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-group">
            <label>Title</label>
            <input className="form-control" value={issue.title} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Source type</label>
              <select className="form-control" value={issue.sourceType} onChange={(e) => onChange({ sourceType: e.target.value })}>
                {ISSUE_SOURCE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Preparation status</label>
              <select className="form-control" value={issue.preparationStatus} onChange={(e) => onChange({ preparationStatus: e.target.value })}>
                {ISSUE_PREPARATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Factual summary</label>
            <textarea className="form-control" rows={2} value={issue.factualSummary} onChange={(e) => onChange({ factualSummary: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Clarification needed</label>
            <textarea className="form-control" rows={2} value={issue.clarificationNeeded} onChange={(e) => onChange({ clarificationNeeded: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Known answer</label>
              <textarea className="form-control" rows={2} value={issue.knownAnswer} onChange={(e) => onChange({ knownAnswer: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Uncertainty or gap</label>
              <textarea className="form-control" rows={2} value={issue.uncertaintyOrGap} onChange={(e) => onChange({ uncertaintyOrGap: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={issue.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this issue</button>
          </div>
        </div>
      )}
    </div>
  );
}

function UndertakingCard({ undertaking, expanded, onToggle, onChange, onRemove, examinees }) {
  const timing = computeUndertakingTiming(undertaking);
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__number">{undertaking.undertakingNumber || "—"}</span>
        <span className="scc-em-row__summary">{undertaking.description || "(no description)"}</span>
        <span className="ccard__badge ccard__badge--conditional">{undertaking.responseStatus}</span>
        {timing && <span className={`ccard__badge ${timing === "Overdue" ? "ccard__badge--not-started" : timing === "Due Soon" ? "ccard__badge--conditional" : "ccard__badge--completed"}`}>{timing}</span>}
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Undertaking #</label>
              <input className="form-control" value={undertaking.undertakingNumber} onChange={(e) => onChange({ undertakingNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Given by</label>
              <input className="form-control" value={undertaking.givenBy} onChange={(e) => onChange({ givenBy: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Related examinee</label>
              <select className="form-control" value={undertaking.relatedExamineeId} onChange={(e) => onChange({ relatedExamineeId: e.target.value })}>
                <option value="">— None —</option>
                {examinees.map((ex) => <option key={ex.id} value={ex.id}>{ex.name || "(unnamed)"}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" rows={2} value={undertaking.description} onChange={(e) => onChange({ description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date given</label>
              <input className="form-control" type="date" value={undertaking.dateGiven} onChange={(e) => onChange({ dateGiven: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Due date</label>
              <input className="form-control" type="date" value={undertaking.dueDate} onChange={(e) => onChange({ dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Response status</label>
              <select className="form-control" value={undertaking.responseStatus} onChange={(e) => onChange({ responseStatus: e.target.value })}>
                {UNDERTAKING_RESPONSE_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Response summary</label>
            <textarea className="form-control" rows={2} value={undertaking.responseSummary} onChange={(e) => onChange({ responseSummary: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Served date</label>
              <input className="form-control" type="date" value={undertaking.servedDate} onChange={(e) => onChange({ servedDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={undertaking.followUpRequired} onChange={(e) => onChange({ followUpRequired: e.target.checked })} /> Follow-up required</label>
            </div>
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={undertaking.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this undertaking</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TranscriptCard({ item, expanded, onToggle, onChange, onRemove, examinees }) {
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{item.transcriptReference || "(no reference)"}</span>
        <span className="scc-em-row__position">{item.transcriptAvailable ? "Available" : "Not yet available"}</span>
        {item.followUpNeeded && <span className="ccard__badge ccard__badge--conditional">Follow-up needed</span>}
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Examinee</label>
              <select className="form-control" value={item.examineeId} onChange={(e) => onChange({ examineeId: e.target.value })}>
                <option value="">— None —</option>
                {examinees.map((ex) => <option key={ex.id} value={ex.id}>{ex.name || "(unnamed)"}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={item.transcriptAvailable} onChange={(e) => onChange({ transcriptAvailable: e.target.checked })} /> Transcript available</label>
            </div>
            <div className="form-group">
              <label>Transcript date</label>
              <input className="form-control" type="date" value={item.transcriptDate} onChange={(e) => onChange({ transcriptDate: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Transcript reference</label>
              <input className="form-control" value={item.transcriptReference} onChange={(e) => onChange({ transcriptReference: e.target.value })} placeholder="e.g. binder tab, file location" />
            </div>
            <div className="form-group">
              <label>Page reference</label>
              <input className="form-control" value={item.pageReference} onChange={(e) => onChange({ pageReference: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Issue summary</label>
            <textarea className="form-control" rows={2} value={item.issueSummary} onChange={(e) => onChange({ issueSummary: e.target.value })} />
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={item.followUpNeeded} onChange={(e) => onChange({ followUpNeeded: e.target.checked })} /> Follow-up needed</label>
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={item.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this reference</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Case workspace for Stage 6 (Examination for Discovery). Persists to the
// same "AI Analysis JSON" envelope used by Evidence Matrix / Document
// Discovery (see apps-script/DisputeExaminationDiscovery.gs) — reviewId
// changing remounts this component (parent passes key={reviewId}).
export default function ExaminationDiscoveryWorkspace({ reviewId, evidenceMatrix, documentDiscovery, onExaminationChange }) {
  const [examination, setExamination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState("Readiness");
  const [expandedId, setExpandedId] = useState(null);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    let active = true;
    getDisputeExaminationDiscovery(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.examinationDiscovery || null;
        setExamination(loaded);
        onExaminationChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Examination for Discovery workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const ex = examination || emptyExamination();

  function commit(next) {
    setExamination(next);
    setDirty(true);
    setSaveState("idle");
    onExaminationChange?.(next);
  }

  function patchReadiness(patch) {
    commit({ ...ex, readiness: { ...ex.readiness, ...patch, updatedAt: new Date().toISOString() } });
  }

  function addExaminee() {
    const e = makeExaminee();
    commit({ ...ex, examinees: [...ex.examinees, e] });
    setExpandedId(e.id);
  }
  function updateExaminee(id, patch) {
    commit({ ...ex, examinees: ex.examinees.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)) });
  }
  function removeExaminee(id) {
    if (!window.confirm("Remove this examinee?")) return;
    commit({ ...ex, examinees: ex.examinees.filter((e) => e.id !== id) });
  }

  function addManualIssue() {
    const i = makePreparationIssue();
    commit({ ...ex, preparationIssues: [...ex.preparationIssues, i] });
    setExpandedId(i.id);
  }
  function updateIssue(id, patch) {
    commit({ ...ex, preparationIssues: ex.preparationIssues.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i)) });
  }
  function removeIssue(id) {
    if (!window.confirm("Remove this preparation issue?")) return;
    commit({ ...ex, preparationIssues: ex.preparationIssues.filter((i) => i.id !== id) });
  }
  function importFromEvidenceMatrix() {
    const result = importIssuesFromEvidenceMatrix(evidenceMatrix, ex.preparationIssues);
    commit({ ...ex, preparationIssues: result.issues });
    setImportMessage(`${result.added} new issue(s) added from Evidence Matrix, ${result.alreadyLinked} already linked.`);
  }
  function importFromDocumentDiscovery() {
    const result = importIssuesFromDocumentDiscovery(documentDiscovery, ex.preparationIssues);
    commit({ ...ex, preparationIssues: result.issues });
    setImportMessage(`${result.added} new issue(s) added from Document Discovery, ${result.alreadyLinked} already linked.`);
  }

  function addUndertaking() {
    const u = makeUndertaking();
    commit({ ...ex, undertakings: [...ex.undertakings, u] });
    setExpandedId(u.id);
  }
  function updateUndertaking(id, patch) {
    commit({ ...ex, undertakings: ex.undertakings.map((u) => (u.id === id ? { ...u, ...patch, updatedAt: new Date().toISOString() } : u)) });
  }
  function removeUndertaking(id) {
    if (!window.confirm("Remove this undertaking?")) return;
    commit({ ...ex, undertakings: ex.undertakings.filter((u) => u.id !== id) });
  }

  function addTranscriptRef() {
    const t = makeTranscriptReference();
    commit({ ...ex, transcriptReferences: [...ex.transcriptReferences, t] });
    setExpandedId(t.id);
  }
  function updateTranscriptRef(id, patch) {
    commit({ ...ex, transcriptReferences: ex.transcriptReferences.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)) });
  }
  function removeTranscriptRef(id) {
    if (!window.confirm("Remove this transcript reference?")) return;
    commit({ ...ex, transcriptReferences: ex.transcriptReferences.filter((t) => t.id !== id) });
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const result = await saveDisputeExaminationDiscovery(reviewId, ex);
      setExamination(result.examinationDiscovery);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onExaminationChange?.(result.examinationDiscovery);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Examination for Discovery workspace.");
    }
  }

  if (loading) {
    return (
      <div id="scc-examination-discovery" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Examination for Discovery Workspace</h3>
        <p className="strategy-help">Loading Examination for Discovery workspace…</p>
      </div>
    );
  }

  const summary = examinationDiscoverySummary(ex);
  const readinessLabel = getExaminationReadiness(ex);

  return (
    <div id="scc-examination-discovery" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Examination for Discovery Workspace</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{EXAMINATION_DISCOVERY_NOTICE}</p>
        <ul>{EXAMINATION_DISCOVERY_CAUTIONS.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
      <div className="notice notice--sage strategy-inline-notice">
        <p><strong>{readinessLabel}</strong></p>
      </div>

      <div className="scc-em-summary scc-dd-summary">
        <div className="scc-em-stat"><strong>{summary.applicabilityStatus}</strong><span>Applicability</span></div>
        <div className="scc-em-stat"><strong>{summary.examinees}</strong><span>Examinees</span></div>
        <div className="scc-em-stat"><strong>{summary.preparationIssues}</strong><span>Preparation issues</span></div>
        <div className="scc-em-stat"><strong>{summary.issuesReadyForReview}</strong><span>Ready for review</span></div>
        <div className="scc-em-stat"><strong>{summary.openUndertakings}</strong><span>Open undertakings</span></div>
        <div className="scc-em-stat"><strong>{summary.overdueUndertakings}</strong><span>Overdue undertakings</span></div>
        <div className="scc-em-stat"><strong>{summary.transcriptFollowUps}</strong><span>Transcript follow-ups</span></div>
      </div>

      <div className="scc-tabs">
        {SECTIONS.map((s) => (
          <button key={s} type="button" className={`scc-tab ${section === s ? "scc-tab--active" : ""}`} onClick={() => setSection(s)}>{s}</button>
        ))}
      </div>

      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      {section === "Readiness" && <ReadinessSection readiness={ex.readiness} onChange={patchReadiness} />}

      {section === "Examinees" && (
        <div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--secondary btn--small" onClick={addExaminee}>+ Add examinee</button>
          </div>
          {ex.examinees.length === 0 && <p className="strategy-help">No examinees recorded yet.</p>}
          {ex.examinees.map((e) => (
            <ExamineeCard key={e.id} examinee={e} expanded={expandedId === e.id} onToggle={() => setExpandedId((c) => (c === e.id ? null : e.id))} onChange={(patch) => updateExaminee(e.id, patch)} onRemove={() => removeExaminee(e.id)} />
          ))}
        </div>
      )}

      {section === "Preparation Issues" && (
        <div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--secondary btn--small" onClick={importFromEvidenceMatrix}>Import from Evidence Matrix</button>
            <button type="button" className="btn btn--secondary btn--small" onClick={importFromDocumentDiscovery}>Import from Document Discovery</button>
            <button type="button" className="btn btn--secondary btn--small" onClick={addManualIssue}>+ Add manual preparation issue</button>
          </div>
          {importMessage && <div className="notice notice--success strategy-inline-notice"><p>{importMessage}</p></div>}
          {ex.preparationIssues.length === 0 && <p className="strategy-help">No preparation issues recorded yet.</p>}
          {ex.preparationIssues.map((i) => {
            let changed = false;
            if (i.sourceType === "Evidence Matrix" && i.linkedEvidenceMatrixRowIds?.length) {
              const row = (evidenceMatrix?.rows || []).find((r) => i.linkedEvidenceMatrixRowIds.includes(r.id));
              changed = !!(row && i.sourceSnapshotText && row.allegationOrIssue !== i.sourceSnapshotText);
            } else if (i.sourceType === "Document Discovery" && i.linkedDocumentDiscoveryIds?.length) {
              const doc = (documentDiscovery?.documents || []).find((d) => i.linkedDocumentDiscoveryIds.includes(d.id));
              changed = !!(doc && i.sourceSnapshotText && doc.title !== i.sourceSnapshotText);
            }
            return (
              <PreparationIssueCard key={i.id} issue={i} expanded={expandedId === i.id} onToggle={() => setExpandedId((c) => (c === i.id ? null : i.id))} onChange={(patch) => updateIssue(i.id, patch)} onRemove={() => removeIssue(i.id)} sourceChanged={changed} />
            );
          })}
        </div>
      )}

      {section === "Undertakings" && (
        <div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--secondary btn--small" onClick={addUndertaking}>+ Add undertaking</button>
          </div>
          {ex.undertakings.length === 0 && <p className="strategy-help">No undertakings recorded yet.</p>}
          {ex.undertakings.map((u) => (
            <UndertakingCard key={u.id} undertaking={u} expanded={expandedId === u.id} onToggle={() => setExpandedId((c) => (c === u.id ? null : u.id))} onChange={(patch) => updateUndertaking(u.id, patch)} onRemove={() => removeUndertaking(u.id)} examinees={ex.examinees} />
          ))}
        </div>
      )}

      {section === "Transcript Follow-Up" && (
        <div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--secondary btn--small" onClick={addTranscriptRef}>+ Add transcript reference</button>
          </div>
          {ex.transcriptReferences.length === 0 && <p className="strategy-help">No transcript references recorded yet.</p>}
          {ex.transcriptReferences.map((t) => (
            <TranscriptCard key={t.id} item={t} expanded={expandedId === t.id} onToggle={() => setExpandedId((c) => (c === t.id ? null : t.id))} onChange={(patch) => updateTranscriptRef(t.id, patch)} onRemove={() => removeTranscriptRef(t.id)} examinees={ex.examinees} />
          ))}
        </div>
      )}

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Examination for Discovery Workspace"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
