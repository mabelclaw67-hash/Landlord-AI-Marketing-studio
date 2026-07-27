import { useEffect, useState } from "react";
import { StageForms } from "./SupremeCourtPetitionCaseNavigator";
import { getDisputePetitionApplications, saveDisputePetitionApplications } from "../utils/disputeReview";
import {
  INTERLOCUTORY_CAUTIONS,
  INTERLOCUTORY_NOTICE,
  INTERLOCUTORY_STATUSES,
  INTERLOCUTORY_SUBROUTES,
  INTERLOCUTORY_TERMINAL_STATUSES,
  checkApplicationResponseGate,
  computeApplicationTiming,
  interlocutoryApplicationsSummary,
  makeInterlocutoryApplication,
} from "../config/supremeCourtPetitionJudicialReviewRespondentWorkflow";

const FILTERS = ["All", "Urgent", "Active", "Overdue", "Decided / Closed"];

function matchesFilter(app, filter) {
  const terminal = INTERLOCUTORY_TERMINAL_STATUSES.includes(app.status);
  switch (filter) {
    case "All": return true;
    case "Urgent": return app.urgent && !terminal;
    case "Active": return !terminal;
    case "Overdue": return computeApplicationTiming(app) === "Overdue";
    case "Decided / Closed": return terminal;
    default: return true;
  }
}

function ApplicationCard({ application, expanded, onToggle, onChange, onRemove }) {
  const timing = computeApplicationTiming(application);
  const gate = checkApplicationResponseGate(application);
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{application.title || "(untitled application)"}</span>
        <span className="scc-em-row__position">{application.subroute}</span>
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
              <label>Subroute</label>
              <select className="form-control" value={application.subroute} onChange={(e) => onChange({ subroute: e.target.value })}>
                {INTERLOCUTORY_SUBROUTES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={application.status} onChange={(e) => onChange({ status: e.target.value })}>
                {INTERLOCUTORY_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
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
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={application.draftOrderNeeded} onChange={(e) => onChange({ draftOrderNeeded: e.target.checked })} /> Draft order needed</label>
            </div>
          </div>
          {!gate.eligible && (
            <div className="notice notice--warm strategy-inline-notice">
              <strong>Not yet eligible for an application-response working draft</strong>
              <ul>{gate.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
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

// Stage 8 (Interlocutory Application / Stay / Injunction) workspace.
// Persisted to the "AI Analysis JSON" envelope's petitionApplications
// sibling — see apps-script/DisputePetitionApplications.gs. reviewId
// changing remounts this component (parent passes key={reviewId}).
export default function PetitionApplicationsWorkspace({ reviewId, onPetitionApplicationsChange }) {
  const [state, setState] = useState(null);
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
    getDisputePetitionApplications(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.petitionApplications || null;
        setState(loaded);
        onPetitionApplicationsChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Application / Stay / Injunction workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  function replaceApplications(list) {
    const next = { ...(state || { version: 1 }), applications: list };
    setState(next);
    setDirty(true);
    setSaveState("idle");
    onPetitionApplicationsChange?.(next);
  }

  function addApplication() {
    const a = makeInterlocutoryApplication();
    replaceApplications([...(state?.applications || []), a]);
    setExpandedId(a.id);
  }
  function updateApplication(id, patch) {
    replaceApplications((state?.applications || []).map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a)));
  }
  function removeApplication(id) {
    if (!window.confirm("Remove this application record?")) return;
    replaceApplications((state?.applications || []).filter((a) => a.id !== id));
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const toSave = state || { version: 1, applications: [] };
      const result = await saveDisputePetitionApplications(reviewId, toSave);
      setState(result.petitionApplications);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onPetitionApplicationsChange?.(result.petitionApplications);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Application / Stay / Injunction workspace.");
    }
  }

  if (loading) {
    return (
      <div id="pjr-applications-workspace" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Interlocutory Application / Stay / Injunction</h3>
        <p className="strategy-help">Loading…</p>
      </div>
    );
  }

  const list = state?.applications || [];
  const summary = interlocutoryApplicationsSummary(list);
  const visible = list.filter((a) => matchesFilter(a, filter));

  return (
    <div id="pjr-applications-workspace" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Stage 8: Interlocutory Application / Stay / Injunction</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{INTERLOCUTORY_NOTICE}</p>
        <ul>{INTERLOCUTORY_CAUTIONS.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      <div className="scc-em-summary scc-dd-summary">
        <div className="scc-em-stat"><strong>{summary.total}</strong><span>Total</span></div>
        <div className="scc-em-stat"><strong>{summary.urgent}</strong><span>Urgent</span></div>
        <div className="scc-em-stat"><strong>{summary.active}</strong><span>Active</span></div>
        <div className="scc-em-stat"><strong>{summary.decided}</strong><span>Decided</span></div>
      </div>

      <StageForms stageId="interlocutoryApplication" />

      <div className="dispute-admin-actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={addApplication}>+ Add application</button>
      </div>

      <div className="scc-em-toolbar">
        <select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

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
          {saveState === "saving" ? "Saving…" : "Save Application / Stay / Injunction Workspace"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
