import { useEffect, useState } from "react";
import { getDisputeEvidenceMatrix, saveDisputeEvidenceMatrix } from "../utils/disputeReview";
import {
  DISCLOSURE_STATUSES,
  EVIDENCE_MATRIX_CAUTIONS,
  EVIDENCE_MATRIX_NOTICE,
  EVIDENCE_TYPES,
  POSITION_TYPES,
  ROW_STATUSES,
  ROW_STATUS_META,
  SUPPORTS_POSITION_VALUES,
  buildRowsFromFormTwoParagraphs,
  evidenceMatrixSummary,
  makeEvidenceItem,
  makeEvidenceMatrixRow,
  syncRowsFromFormTwoParagraphs,
} from "../config/supremeCourtCivilClaimDefendantWorkflow";

const ROW_FILTERS = ["All", "Missing Evidence", "Has Evidence", "Ready for Review", "Reviewed"];

function matchesRowFilter(row, filter) {
  if (filter === "All") return true;
  if (filter === "Has Evidence") return row.status !== "Missing Evidence";
  return row.status === filter;
}

function EvidenceItemEditor({ item, fileOptions, onChange, onRemove }) {
  const linkedFile = fileOptions.find((f) => f.fileId === item.fileReference);

  return (
    <div className="scc-em-evidence-item">
      <div className="form-row">
        <div className="form-group">
          <label>Title</label>
          <input className="form-control" value={item.title} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select className="form-control" value={item.evidenceType} onChange={(e) => onChange({ evidenceType: e.target.value })}>
            {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Date</label>
          <input className="form-control" type="date" value={item.date} onChange={(e) => onChange({ date: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Link an uploaded file (optional)</label>
          <select
            className="form-control"
            value={linkedFile ? item.fileReference : ""}
            onChange={(e) => {
              const file = fileOptions.find((f) => f.fileId === e.target.value);
              if (!file) return;
              onChange({ fileReference: file.fileId, title: item.title || file.fileName, source: file.fileName });
            }}
          >
            <option value="">— Manual reference —</option>
            {fileOptions.map((f) => <option key={f.fileId} value={f.fileId}>{f.fileName} ({f.documentCategory})</option>)}
          </select>
          {linkedFile?.driveUrl && (
            <a href={linkedFile.driveUrl} target="_blank" rel="noopener noreferrer" className="scc-em-file-link">Open linked file</a>
          )}
        </div>
        <div className="form-group">
          <label>Manual reference / source</label>
          <input
            className="form-control"
            placeholder="e.g. binder tab, physical file location"
            value={item.fileReference && !linkedFile ? item.fileReference : item.source}
            onChange={(e) => onChange(linkedFile ? { source: e.target.value } : { fileReference: e.target.value, source: e.target.value })}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea className="form-control" rows={2} value={item.description} onChange={(e) => onChange({ description: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Supports</label>
          <select className="form-control" value={item.supportsPosition} onChange={(e) => onChange({ supportsPosition: e.target.value })}>
            {SUPPORTS_POSITION_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Disclosure status</label>
          <select className="form-control" value={item.disclosureStatus} onChange={(e) => onChange({ disclosureStatus: e.target.value })}>
            {DISCLOSURE_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          {item.disclosureStatus === "Potentially Privileged" && (
            <p className="scc-em-hint">Reviewer flag only — confirm with counsel before disclosure.</p>
          )}
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

function MatrixRow({ row, expanded, onToggle, onChange, onRemove, fileOptions, sourceChanged }) {
  const statusMeta = ROW_STATUS_META[row.status] || ROW_STATUS_META["Missing Evidence"];

  function addEvidenceItem() {
    onChange({ evidenceItems: [...row.evidenceItems, makeEvidenceItem()] });
  }
  function updateEvidenceItem(itemId, patch) {
    onChange({ evidenceItems: row.evidenceItems.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) });
  }
  function removeEvidenceItem(itemId) {
    if (!window.confirm("Remove this evidence item from the matrix? This does not delete any uploaded file.")) return;
    onChange({ evidenceItems: row.evidenceItems.filter((it) => it.id !== itemId) });
  }
  function addWitness() {
    const name = window.prompt("Witness name or label:");
    if (!name || !name.trim()) return;
    onChange({ witnesses: [...row.witnesses, name.trim()] });
  }
  function removeWitness(index) {
    onChange({ witnesses: row.witnesses.filter((_, i) => i !== index) });
  }

  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__number">{row.sourceParagraphNumber != null ? `¶${row.sourceParagraphNumber}` : "—"}</span>
        <span className="scc-em-row__summary">{row.allegationOrIssue || "(untitled issue)"}</span>
        <span className="scc-em-row__position">{row.positionType}</span>
        <span className="scc-em-row__evidence-count">{row.evidenceItems.length} evidence</span>
        <span className={`ccard__badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>

      {sourceChanged && (
        <div className="notice notice--warm strategy-inline-notice scc-em-drift-notice">
          <p>The Form 2 text for paragraph {row.sourceParagraphNumber} has changed since this row was created. Review and update this row if needed.</p>
        </div>
      )}

      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-group">
            <label>Allegation or issue</label>
            <textarea className="form-control" rows={2} value={row.allegationOrIssue} onChange={(e) => onChange({ allegationOrIssue: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Defendant position</label>
              <textarea className="form-control" rows={2} value={row.defendantPosition} onChange={(e) => onChange({ defendantPosition: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Position type</label>
              <select className="form-control" value={row.positionType} onChange={(e) => onChange({ positionType: e.target.value })}>
                {POSITION_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <h4 className="dispute-admin-subheading">Evidence</h4>
          {row.evidenceItems.map((item) => (
            <EvidenceItemEditor
              key={item.id}
              item={item}
              fileOptions={fileOptions}
              onChange={(patch) => updateEvidenceItem(item.id, patch)}
              onRemove={() => removeEvidenceItem(item.id)}
            />
          ))}
          <button type="button" className="btn btn--secondary btn--small" onClick={addEvidenceItem}>+ Add evidence item</button>

          <h4 className="dispute-admin-subheading">Witnesses</h4>
          <div className="scc-em-witnesses">
            {row.witnesses.map((name, i) => (
              <span className="scc-em-witness-chip" key={i}>
                {name}
                <button type="button" onClick={() => removeWitness(i)} aria-label={`Remove witness ${name}`}>×</button>
              </span>
            ))}
          </div>
          <button type="button" className="btn btn--secondary btn--small" onClick={addWitness}>+ Add witness</button>

          <div className="form-group">
            <label>Relevance</label>
            <textarea className="form-control" rows={2} value={row.relevance} onChange={(e) => onChange({ relevance: e.target.value })} placeholder="Why does this evidence matter to this allegation?" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={row.status} onChange={(e) => onChange({ status: e.target.value })}>
                {ROW_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={row.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>

          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this row</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Case workspace for Stage 4 (Evidence Preparation). Persists to the same
// "AI Analysis JSON" envelope used by Content Analysis / Working Draft (see
// apps-script/DisputeEvidenceMatrix.gs) — reviewId changing remounts this
// component (parent passes key={reviewId}) so state never leaks across cases.
export default function EvidenceMatrix({ reviewId, files, formTwoParagraphs, onMatrixChange }) {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [rowFilter, setRowFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");

  // reviewId never actually changes on this component (the parent remounts
  // it via key={reviewId} on every review switch), so this effect only ever
  // runs once per mount and `loading` starting true already covers it.
  useEffect(() => {
    let active = true;
    getDisputeEvidenceMatrix(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.evidenceMatrix || null;
        setMatrix(loaded);
        onMatrixChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Evidence Matrix."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // onMatrixChange is the parent's setState function — stable, and
    // deliberately excluded from deps to keep this a mount-only effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const fileOptions = (files || []).map((f) => ({
    fileId: f["File ID"],
    fileName: f["File Name"],
    documentCategory: f["Document Category"],
    driveUrl: f["Google Drive URL"],
  }));

  // Every mutation notifies the parent synchronously, right here, rather than
  // via a useEffect keyed on `matrix` — avoids a state-update cascade through
  // the parent re-rendering this component with fresh (but logically
  // unchanged) prop references.
  function replaceRows(rows) {
    const next = { ...(matrix || { version: 1 }), rows };
    setMatrix(next);
    setDirty(true);
    setSaveState("idle");
    onMatrixChange?.(next);
  }

  function updateRow(rowId, patch) {
    replaceRows(matrix.rows.map((row) => (row.id === rowId ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row)));
  }

  function removeRow(rowId) {
    if (!window.confirm("Remove this row from the Evidence Matrix?")) return;
    replaceRows(matrix.rows.filter((row) => row.id !== rowId));
    if (expandedRowId === rowId) setExpandedRowId(null);
  }

  function addBlankRow() {
    const row = makeEvidenceMatrixRow();
    replaceRows([...(matrix?.rows || []), row]);
    setExpandedRowId(row.id);
  }

  function createFromForm2() {
    const rows = buildRowsFromFormTwoParagraphs(formTwoParagraphs);
    const next = { version: 1, rows, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setMatrix(next);
    setDirty(true);
    onMatrixChange?.(next);
  }

  function createBlank() {
    const next = { version: 1, rows: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setMatrix(next);
    setDirty(true);
    onMatrixChange?.(next);
  }

  function syncFromForm2() {
    replaceRows(syncRowsFromFormTwoParagraphs(matrix.rows, formTwoParagraphs));
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const result = await saveDisputeEvidenceMatrix(reviewId, matrix);
      setMatrix(result.evidenceMatrix);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onMatrixChange?.(result.evidenceMatrix);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Evidence Matrix.");
    }
  }

  const noticeBlock = (
    <div className="notice notice--warm strategy-inline-notice">
      <p>{EVIDENCE_MATRIX_NOTICE}</p>
      <ul>{EVIDENCE_MATRIX_CAUTIONS.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );

  if (loading) {
    return (
      <div id="scc-evidence-matrix" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Evidence Matrix</h3>
        <p className="strategy-help">Loading Evidence Matrix…</p>
      </div>
    );
  }

  if (!matrix) {
    const hasFormTwoData = (formTwoParagraphs || []).some((p) => (p.allegationText || "").trim());
    return (
      <div id="scc-evidence-matrix" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Evidence Matrix</h3>
        {noticeBlock}
        {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}
        <p className="strategy-help">No Evidence Matrix exists yet for this case.</p>
        <div className="dispute-admin-actions">
          {hasFormTwoData && (
            <button type="button" className="btn btn--primary" onClick={createFromForm2}>Create Evidence Matrix from Form 2</button>
          )}
          <button type="button" className="btn btn--secondary" onClick={createBlank}>Create Blank Evidence Matrix</button>
        </div>
      </div>
    );
  }

  const summary = evidenceMatrixSummary(matrix.rows);
  const visibleRows = matrix.rows.filter(
    (row) => matchesRowFilter(row, rowFilter) && (positionFilter === "All" || row.positionType === positionFilter)
  );
  const hasFormTwoData = (formTwoParagraphs || []).some((p) => (p.allegationText || "").trim());

  return (
    <div id="scc-evidence-matrix" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Evidence Matrix</h3>
      {noticeBlock}

      <div className="scc-em-summary">
        <div className="scc-em-stat"><strong>{summary.total}</strong><span>Total issues</span></div>
        <div className="scc-em-stat"><strong>{summary.hasEvidence}</strong><span>With evidence</span></div>
        <div className="scc-em-stat"><strong>{summary.missingEvidence}</strong><span>Missing evidence</span></div>
        <div className="scc-em-stat"><strong>{summary.readyForReview}</strong><span>Ready for review</span></div>
      </div>

      <div className="scc-em-toolbar">
        <select className="form-control" value={rowFilter} onChange={(e) => setRowFilter(e.target.value)}>
          {ROW_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="form-control" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
          <option value="All">All positions</option>
          {POSITION_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <div className="scc-em-toolbar__spacer" />
        {hasFormTwoData && (
          <button type="button" className="btn btn--ghost btn--small" onClick={syncFromForm2}>Sync from Form 2</button>
        )}
        <button type="button" className="btn btn--secondary btn--small" onClick={addBlankRow}>+ Add row</button>
      </div>

      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}

      {visibleRows.length === 0 && <p className="strategy-help">No rows match the current filter.</p>}

      {visibleRows.map((row) => {
        const liveParagraph = row.sourceParagraphNumber != null ? (formTwoParagraphs || [])[row.sourceParagraphNumber - 1] : null;
        const sourceChanged = !!(liveParagraph && (liveParagraph.allegationText || "").trim() && row.sourceSnapshotText &&
          liveParagraph.allegationText.trim() !== row.sourceSnapshotText);
        return (
          <MatrixRow
            key={row.id}
            row={row}
            expanded={expandedRowId === row.id}
            onToggle={() => setExpandedRowId((current) => (current === row.id ? null : row.id))}
            onChange={(patch) => updateRow(row.id, patch)}
            onRemove={() => removeRow(row.id)}
            fileOptions={fileOptions}
            sourceChanged={sourceChanged}
          />
        );
      })}

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Evidence Matrix"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
