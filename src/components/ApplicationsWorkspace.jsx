import { useEffect, useState } from "react";
import { getDisputeApplications, saveDisputeApplications } from "../utils/disputeReview";
import {
  APPLICATION_MATERIALS_STATUSES,
  APPLICATION_PREPARATION_STATUSES,
  APPLICATION_ROLES,
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  APPLICATIONS_CAUTIONS,
  APPLICATIONS_NOTICE,
  SUPREME_COURT_CIVIL_RULES_URL,
  SUPREME_COURT_FORMS_INDEX_URL,
  applicationsSummary,
  computeApplicationTiming,
  getApplicationsReadiness,
  makeApplication,
} from "../config/supremeCourtCivilClaimDefendantWorkflow";

const FILTERS = ["All", "Urgent", "Active", "Materials Outstanding", "Overdue", "Decided / Closed"];

function matchesFilter(app, filter) {
  const terminal = ["Decided", "Withdrawn", "Not Applicable"].includes(app.status);
  switch (filter) {
    case "All": return true;
    case "Urgent": return app.urgent && !terminal;
    case "Active": return !terminal;
    case "Materials Outstanding":
      return !terminal && ((app.affidavitsNeeded && !["Filed", "Not Applicable"].includes(app.affidavitsStatus)) ||
        (app.draftOrderNeeded && !["Filed", "Not Applicable"].includes(app.draftOrderStatus)));
    case "Overdue": return computeApplicationTiming(app) === "Overdue";
    case "Decided / Closed": return terminal;
    default: return true;
  }
}

function ApplicationCard({ application, expanded, onToggle, onChange, onRemove }) {
  const timing = computeApplicationTiming(application);
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{application.title || "(untitled application)"}</span>
        <span className="scc-em-row__position">{application.applicationRole}</span>
        <span className="ccard__badge ccard__badge--conditional">{application.status}</span>
        {application.urgent && <span className="ccard__badge ccard__badge--not-started">Urgent</span>}
        {timing && <span className={`ccard__badge ${timing === "Overdue" ? "ccard__badge--not-started" : timing === "Due Soon" ? "ccard__badge--conditional" : "ccard__badge--completed"}`}>{timing}</span>}
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" value={application.title} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={application.urgent} onChange={(e) => onChange({ urgent: e.target.checked })} /> Urgent</label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Role</label>
              <select className="form-control" value={application.applicationRole} onChange={(e) => onChange({ applicationRole: e.target.value })}>
                {APPLICATION_ROLES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="form-control" value={application.applicationType} onChange={(e) => onChange({ applicationType: e.target.value })}>
                {APPLICATION_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={application.status} onChange={(e) => onChange({ status: e.target.value })}>
                {APPLICATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Relief sought</label>
            <textarea className="form-control" rows={2} value={application.reliefSought} onChange={(e) => onChange({ reliefSought: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Grounds summary</label>
            <textarea className="form-control" rows={2} value={application.groundsSummary} onChange={(e) => onChange({ groundsSummary: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Hearing date</label>
              <input className="form-control" type="date" value={application.hearingDate} onChange={(e) => onChange({ hearingDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Hearing time</label>
              <input className="form-control" type="time" value={application.hearingTime} onChange={(e) => onChange({ hearingTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Location / method</label>
              <select className="form-control" value={application.locationOrMethod} onChange={(e) => onChange({ locationOrMethod: e.target.value })}>
                <option value="Not Yet Confirmed">Not Yet Confirmed</option>
                <option value="In Person">In Person</option>
                <option value="Video Conference">Video Conference</option>
                <option value="Telephone">Telephone</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Filing deadline</label>
              <input className="form-control" type="date" value={application.filingDeadline} onChange={(e) => onChange({ filingDeadline: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Service deadline</label>
              <input className="form-control" type="date" value={application.serviceDeadline} onChange={(e) => onChange({ serviceDeadline: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label><input type="checkbox" checked={application.noticeOfApplicationFiled} onChange={(e) => onChange({ noticeOfApplicationFiled: e.target.checked })} /> Notice of Application filed</label>
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={application.applicationResponseFiled} onChange={(e) => onChange({ applicationResponseFiled: e.target.checked })} /> Application Response filed</label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label><input type="checkbox" checked={application.affidavitsNeeded} onChange={(e) => onChange({ affidavitsNeeded: e.target.checked })} /> Affidavit(s) needed</label>
              {application.affidavitsNeeded && (
                <select className="form-control" value={application.affidavitsStatus} onChange={(e) => onChange({ affidavitsStatus: e.target.value })}>
                  {APPLICATION_MATERIALS_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={application.draftOrderNeeded} onChange={(e) => onChange({ draftOrderNeeded: e.target.checked })} /> Draft order needed</label>
              {application.draftOrderNeeded && (
                <select className="form-control" value={application.draftOrderStatus} onChange={(e) => onChange({ draftOrderStatus: e.target.value })}>
                  {APPLICATION_MATERIALS_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Preparation status</label>
            <select className="form-control" value={application.preparationStatus} onChange={(e) => onChange({ preparationStatus: e.target.value })}>
              {APPLICATION_PREPARATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={application.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this application</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Case workspace for Stage 7 (Applications). Persists to the same
// "AI Analysis JSON" envelope used by Evidence Matrix / Document Discovery /
// Examination for Discovery (see apps-script/DisputeApplications.gs) —
// reviewId changing remounts this component (parent passes key={reviewId}).
export default function ApplicationsWorkspace({ reviewId, onApplicationsChange }) {
  const [applications, setApplications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let active = true;
    getDisputeApplications(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.applications || null;
        setApplications(loaded);
        onApplicationsChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Applications workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  function replaceApplications(list) {
    const next = { ...(applications || { version: 1 }), applications: list };
    setApplications(next);
    setDirty(true);
    setSaveState("idle");
    onApplicationsChange?.(next);
  }

  function addApplication() {
    const a = makeApplication();
    replaceApplications([...(applications?.applications || []), a]);
    setExpandedId(a.id);
  }
  function updateApplication(id, patch) {
    replaceApplications((applications?.applications || []).map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a)));
  }
  function removeApplication(id) {
    if (!window.confirm("Remove this application record?")) return;
    replaceApplications((applications?.applications || []).filter((a) => a.id !== id));
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const toSave = applications || { version: 1, applications: [] };
      const result = await saveDisputeApplications(reviewId, toSave);
      setApplications(result.applications);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onApplicationsChange?.(result.applications);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Applications workspace.");
    }
  }

  if (loading) {
    return (
      <div id="scc-applications" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Applications Workspace</h3>
        <p className="strategy-help">Loading Applications workspace…</p>
      </div>
    );
  }

  const list = applications?.applications || [];
  const summary = applicationsSummary(list);
  const readiness = getApplicationsReadiness(list);
  const visible = list.filter((a) => matchesFilter(a, filter));

  return (
    <div id="scc-applications" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Applications Workspace</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{APPLICATIONS_NOTICE}</p>
        <ul>{APPLICATIONS_CAUTIONS.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
      <div className="notice notice--sage strategy-inline-notice">
        <p><strong>{readiness}</strong></p>
      </div>

      <div className="scc-em-summary scc-dd-summary">
        <div className="scc-em-stat"><strong>{summary.total}</strong><span>Total applications</span></div>
        <div className="scc-em-stat"><strong>{summary.urgent}</strong><span>Urgent</span></div>
        <div className="scc-em-stat"><strong>{summary.scheduled}</strong><span>Scheduled</span></div>
        <div className="scc-em-stat"><strong>{summary.materialsOutstanding}</strong><span>Materials outstanding</span></div>
        <div className="scc-em-stat"><strong>{summary.overdue}</strong><span>Overdue</span></div>
        <div className="scc-em-stat"><strong>{summary.filed}</strong><span>Filed</span></div>
        <div className="scc-em-stat"><strong>{summary.decided}</strong><span>Decided</span></div>
      </div>

      <div className="dispute-admin-long">
        <strong>Official Forms and Rules</strong>
        <div className="scc-form-grid">
          <div className="scc-form-card">
            <div className="scc-form-card__head"><span className="scc-form-card__number">Form 32</span><span className="scc-form-pill scc-form-pill--commonly_used">Commonly used</span></div>
            <p className="scc-form-card__name">Notice of Application</p>
            <p className="scc-form-card__purpose">Starts a court application, setting out what order is sought and on what grounds.</p>
            <div className="scc-form-card__links">
              <a href={SUPREME_COURT_FORMS_INDEX_URL} target="_blank" rel="noopener noreferrer">Official form source</a>
              <a href={SUPREME_COURT_CIVIL_RULES_URL} target="_blank" rel="noopener noreferrer">Supreme Court Civil Rules</a>
            </div>
          </div>
          <div className="scc-form-card">
            <div className="scc-form-card__head"><span className="scc-form-card__number">Form 33</span><span className="scc-form-pill scc-form-pill--commonly_used">Commonly used</span></div>
            <p className="scc-form-card__name">Application Response</p>
            <p className="scc-form-card__purpose">The responding party's formal reply to a Notice of Application.</p>
            <div className="scc-form-card__links">
              <a href={SUPREME_COURT_FORMS_INDEX_URL} target="_blank" rel="noopener noreferrer">Official form source</a>
              <a href={SUPREME_COURT_CIVIL_RULES_URL} target="_blank" rel="noopener noreferrer">Supreme Court Civil Rules</a>
            </div>
          </div>
        </div>
        <p className="scc-form-verified">This workspace tracks whether these materials are needed and their status — it does not generate them.</p>
      </div>

      <div className="dispute-admin-actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={addApplication}>+ Add application</button>
      </div>

      <div className="scc-em-toolbar">
        <select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}
      {visible.length === 0 && <p className="strategy-help">No applications match the current filter.</p>}

      {visible.map((a) => (
        <ApplicationCard
          key={a.id}
          application={a}
          expanded={expandedId === a.id}
          onToggle={() => setExpandedId((c) => (c === a.id ? null : a.id))}
          onChange={(patch) => updateApplication(a.id, patch)}
          onRemove={() => removeApplication(a.id)}
        />
      ))}

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Applications Workspace"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
