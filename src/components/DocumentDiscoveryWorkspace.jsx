import { useEffect, useState } from "react";
import { getDisputeDocumentDiscovery, saveDisputeDocumentDiscovery } from "../utils/disputeReview";
import {
  DOCUMENT_DISCOVERY_CAUTIONS,
  DOCUMENT_DISCOVERY_NOTICE,
  DOCUMENT_TYPES,
  DISCOVERY_REVIEW_STATUSES,
  POSSESSION_STATUSES,
  PRIVILEGE_FLAGS,
  PRODUCTION_STATUSES,
  SOURCE_TYPES,
  documentDiscoverySummary,
  getDiscoveryReadiness,
  importDocumentFromFile,
  importDocumentsFromEvidenceMatrix,
  makeDiscoveryDocument,
} from "../config/supremeCourtCivilClaimDefendantWorkflow";

const DOC_FILTERS = [
  "All",
  "Missing / Requested",
  "Needs Review",
  "Potentially Privileged",
  "Ready for Production",
  "Produced",
  "Received from Other Party",
  "Duplicate / Not Relevant",
];

function matchesDocFilter(doc, filter) {
  switch (filter) {
    case "All": return true;
    case "Missing / Requested": return ["Missing", "Requested", "Expected from Other Party"].includes(doc.possessionStatus);
    case "Needs Review": return ["Not Reviewed", "In Review", "Needs Legal Review"].includes(doc.reviewStatus);
    case "Potentially Privileged": return ["Potentially Privileged", "Needs Legal Review"].includes(doc.privilegeFlag);
    case "Ready for Production": return doc.productionStatus === "Ready for Production";
    case "Produced": return doc.productionStatus === "Produced";
    case "Received from Other Party": return doc.sourceType === "Received from Other Party" || doc.productionStatus === "Received from Other Party";
    case "Duplicate / Not Relevant": return ["Duplicate", "Not Relevant"].includes(doc.reviewStatus);
    default: return true;
  }
}

function DocumentCard({ doc, expanded, onToggle, onChange, onRemove, fileOptions, linkedIssueLabels, linkedItemLabels }) {
  const linkedFile = fileOptions.find((f) => f.fileId === doc.linkedFileId);

  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{doc.title || "(untitled document)"}</span>
        <span className="scc-em-row__position">{doc.documentDate || "no date"}</span>
        <span className="scc-em-row__evidence-count">{doc.documentType}</span>
        <span className="scc-em-row__evidence-count">{(doc.linkedIssueIds || []).length} issue(s)</span>
        <span className="ccard__badge ccard__badge--not-started">{doc.possessionStatus}</span>
        <span className="ccard__badge ccard__badge--conditional">{doc.reviewStatus}</span>
        <span className="ccard__badge ccard__badge--in-progress">{doc.productionStatus}</span>
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" value={doc.title} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Document date</label>
              <input className="form-control" type="date" value={doc.documentDate} onChange={(e) => onChange({ documentDate: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Document type</label>
              <select className="form-control" value={doc.documentType} onChange={(e) => onChange({ documentType: e.target.value })}>
                {DOCUMENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Source type</label>
              <select className="form-control" value={doc.sourceType} onChange={(e) => onChange({ sourceType: e.target.value })}>
                {SOURCE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {(linkedIssueLabels.length > 0 || linkedItemLabels.length > 0 || linkedFile) && (
            <div className="dispute-admin-long">
              <strong>Linked references</strong>
              {linkedIssueLabels.length > 0 && <p>Evidence Matrix issues: {linkedIssueLabels.join("; ")}</p>}
              {linkedItemLabels.length > 0 && <p>Evidence items: {linkedItemLabels.join("; ")}</p>}
              {linkedFile && (
                <p>
                  Linked file: {linkedFile.fileName}{" "}
                  {linkedFile.driveUrl && <a href={linkedFile.driveUrl} target="_blank" rel="noopener noreferrer">Open linked file</a>}
                </p>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" rows={2} value={doc.description} onChange={(e) => onChange({ description: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Relevance note</label>
            <textarea className="form-control" rows={2} value={doc.relevanceNote} onChange={(e) => onChange({ relevanceNote: e.target.value })} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Possession status</label>
              <select className="form-control" value={doc.possessionStatus} onChange={(e) => onChange({ possessionStatus: e.target.value })}>
                {POSSESSION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Review status</label>
              <select className="form-control" value={doc.reviewStatus} onChange={(e) => onChange({ reviewStatus: e.target.value })}>
                {DISCOVERY_REVIEW_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Privilege flag</label>
              <select className="form-control" value={doc.privilegeFlag} onChange={(e) => onChange({ privilegeFlag: e.target.value })}>
                {PRIVILEGE_FLAGS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {doc.privilegeFlag === "Potentially Privileged" && (
                <p className="scc-em-hint">Reviewer flag only — confirm with counsel before disclosure.</p>
              )}
            </div>
            <div className="form-group">
              <label>Production status</label>
              <select className="form-control" value={doc.productionStatus} onChange={(e) => onChange({ productionStatus: e.target.value })}>
                {PRODUCTION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Production date</label>
              <input className="form-control" type="date" value={doc.productionDate} onChange={(e) => onChange({ productionDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Received from</label>
              <input className="form-control" value={doc.receivedFrom} onChange={(e) => onChange({ receivedFrom: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Received date</label>
              <input className="form-control" type="date" value={doc.receivedDate} onChange={(e) => onChange({ receivedDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Duplicate of (document title or id, if applicable)</label>
            <input className="form-control" value={doc.duplicateOf} onChange={(e) => onChange({ duplicateOf: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={doc.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>

          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this record</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Case workspace for Stage 5 (Document Discovery). Persists to the same
// "AI Analysis JSON" envelope used by Evidence Matrix / Content Analysis /
// Working Draft (see apps-script/DisputeDocumentDiscovery.gs) — reviewId
// changing remounts this component (parent passes key={reviewId}).
export default function DocumentDiscoveryWorkspace({ reviewId, evidenceMatrix, files, onDiscoveryChange }) {
  const [discovery, setDiscovery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    let active = true;
    getDisputeDocumentDiscovery(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.documentDiscovery || null;
        setDiscovery(loaded);
        onDiscoveryChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Document Discovery workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const fileOptions = (files || []).map((f) => ({
    fileId: f["File ID"],
    fileName: f["File Name"],
    documentCategory: f["Document Category"],
    driveUrl: f["Google Drive URL"],
  }));

  function replaceDocuments(documents) {
    const next = { ...(discovery || { version: 1 }), documents };
    setDiscovery(next);
    setDirty(true);
    setSaveState("idle");
    onDiscoveryChange?.(next);
  }

  function updateDoc(id, patch) {
    replaceDocuments(discovery.documents.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)));
  }

  function removeDoc(id) {
    if (!window.confirm("Remove this record from the Document Discovery workspace? This does not delete any uploaded file.")) return;
    replaceDocuments(discovery.documents.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function addManualDocument() {
    const doc = makeDiscoveryDocument({ sourceType: "Manual Reference" });
    replaceDocuments([...(discovery?.documents || []), doc]);
    setExpandedId(doc.id);
  }

  function importFromEvidenceMatrix() {
    const base = discovery || { version: 1, documents: [] };
    const result = importDocumentsFromEvidenceMatrix(evidenceMatrix, base.documents);
    replaceDocuments(result.documents);
    setImportMessage(`${result.added} new record(s) added, ${result.alreadyLinked} evidence item(s) already linked.`);
  }

  function importFromFile(fileId) {
    const file = fileOptions.find((f) => f.fileId === fileId);
    if (!file) return;
    const base = discovery || { version: 1, documents: [] };
    const result = importDocumentFromFile(file, base.documents);
    if (result.added) {
      replaceDocuments(result.documents);
      setImportMessage(`Linked "${file.fileName}" as a new document record.`);
    } else {
      setImportMessage(`"${file.fileName}" is already linked in this workspace.`);
    }
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const result = await saveDisputeDocumentDiscovery(reviewId, discovery);
      setDiscovery(result.documentDiscovery);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onDiscoveryChange?.(result.documentDiscovery);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Document Discovery workspace.");
    }
  }

  const noticeBlock = (
    <div className="notice notice--warm strategy-inline-notice">
      <p>{DOCUMENT_DISCOVERY_NOTICE}</p>
      <ul>{DOCUMENT_DISCOVERY_CAUTIONS.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );

  if (loading) {
    return (
      <div id="scc-document-discovery" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Document Discovery Workspace</h3>
        <p className="strategy-help">Loading Document Discovery workspace…</p>
      </div>
    );
  }

  const documents = discovery?.documents || [];
  const summary = documentDiscoverySummary(documents);
  const readiness = getDiscoveryReadiness(documents);
  const needle = search.trim().toLowerCase();
  const visibleDocs = documents.filter(
    (d) => matchesDocFilter(d, filter) && (!needle || d.title.toLowerCase().includes(needle) || d.description.toLowerCase().includes(needle))
  );
  const hasEvidenceMatrixData = (evidenceMatrix?.rows || []).some((r) => (r.evidenceItems || []).length > 0);

  return (
    <div id="scc-document-discovery" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Document Discovery Workspace</h3>
      {noticeBlock}

      <div className="notice notice--sage strategy-inline-notice">
        <p><strong>{readiness.label}</strong></p>
        {readiness.flags.length > 0 && <ul>{readiness.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>}
      </div>

      <div className="scc-em-summary scc-dd-summary">
        <div className="scc-em-stat"><strong>{summary.total}</strong><span>Total documents</span></div>
        <div className="scc-em-stat"><strong>{summary.available}</strong><span>Available</span></div>
        <div className="scc-em-stat"><strong>{summary.missingOrRequested}</strong><span>Missing / Requested</span></div>
        <div className="scc-em-stat"><strong>{summary.needsReview}</strong><span>Needs review</span></div>
        <div className="scc-em-stat"><strong>{summary.potentiallyPrivileged}</strong><span>Potentially privileged</span></div>
        <div className="scc-em-stat"><strong>{summary.readyForProduction}</strong><span>Ready for production</span></div>
        <div className="scc-em-stat"><strong>{summary.produced}</strong><span>Produced</span></div>
        <div className="scc-em-stat"><strong>{summary.receivedFromOtherParty}</strong><span>Received from other party</span></div>
      </div>

      <div className="dispute-admin-actions">
        {hasEvidenceMatrixData && (
          <button type="button" className="btn btn--secondary btn--small" onClick={importFromEvidenceMatrix}>Import from Evidence Matrix</button>
        )}
        <select className="form-control" defaultValue="" onChange={(e) => { if (e.target.value) importFromFile(e.target.value); e.target.value = ""; }}>
          <option value="">Import uploaded case file…</option>
          {fileOptions.map((f) => <option key={f.fileId} value={f.fileId}>{f.fileName} ({f.documentCategory})</option>)}
        </select>
        <button type="button" className="btn btn--secondary btn--small" onClick={addManualDocument}>+ Add manual document reference</button>
      </div>
      {importMessage && <div className="notice notice--success strategy-inline-notice"><p>{importMessage}</p></div>}

      <div className="scc-em-toolbar">
        <select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {DOC_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input className="form-control" placeholder="Search title or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      {visibleDocs.length === 0 && <p className="strategy-help">No records match the current filter.</p>}

      {visibleDocs.map((doc) => (
        <DocumentCard
          key={doc.id}
          doc={doc}
          expanded={expandedId === doc.id}
          onToggle={() => setExpandedId((current) => (current === doc.id ? null : doc.id))}
          onChange={(patch) => updateDoc(doc.id, patch)}
          onRemove={() => removeDoc(doc.id)}
          fileOptions={fileOptions}
          linkedIssueLabels={(doc.linkedIssueIds || []).map((id) => {
            const row = (evidenceMatrix?.rows || []).find((r) => r.id === id);
            return row ? (row.allegationOrIssue || "(untitled issue)") : id;
          })}
          linkedItemLabels={(doc.linkedEvidenceItemIds || []).map((id) => {
            for (const row of evidenceMatrix?.rows || []) {
              const item = (row.evidenceItems || []).find((it) => it.id === id);
              if (item) return item.title || "(untitled evidence item)";
            }
            return id;
          })}
        />
      ))}

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Document Discovery Workspace"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
