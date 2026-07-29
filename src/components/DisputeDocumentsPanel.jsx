import { useState } from "react";
import { DISPUTE_ACCEPT_ATTRIBUTE, DOCUMENT_CATEGORIES, displayDisputeOption } from "../utils/disputeReview";
import CollapsibleCard from "./CollapsibleCard";

export default function DisputeDocumentsPanel({
  lang,
  copy,
  uploadExamplesText,
  uploadReady,
  uploadAvailable,
  onRetryUpload,
  turnstileWidget,
  turnstileReady,
  pendingMeta,
  setPendingMeta,
  files,
  uploading,
  uploadProgress,
  uploadError,
  onFileInputChange,
  onDrop,
  onDragOver,
  onRemoveFile,
  removingId,
  missingDocuments,
  form,
  update,
  defaultExpanded = true,
}) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <CollapsibleCard
      className="dispute-documents-panel"
      defaultOpen={defaultExpanded}
      title={`${copy.upload.title} (${files.length})`}
    >
      <p>{copy.upload.intro}</p>
      <p className="strategy-help">{uploadExamplesText}</p>
      <p className="strategy-help">{copy.upload.limits}</p>
      <div className="strategy-help">
        {turnstileWidget}
        {turnstileReady ? copy.upload.securityDone : copy.upload.securityPending}
      </div>

      {!uploadAvailable ? (
        <div className="notice notice--error strategy-inline-notice">
          <p>{copy.upload.unavailable}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetryUpload}>
            {copy.upload.retry}
          </button>
        </div>
      ) : !uploadReady ? (
        <p className="strategy-help">{copy.upload.preparing}</p>
      ) : (
        <>
          <div
            className={`dispute-dropzone${dragActive ? " dispute-dropzone--active" : ""}`}
            onDragOver={(event) => { onDragOver(event); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => { setDragActive(false); onDrop(event); }}
          >
            <p>{copy.upload.dropHint}</p>
            <input
              className="form-control"
              type="file"
              multiple
              accept={DISPUTE_ACCEPT_ATTRIBUTE}
              disabled={uploading}
              onChange={onFileInputChange}
            />
            {uploading && (
              <p className="strategy-help">
                {uploadProgress
                  ? copy.upload.progress.replace("{done}", String(uploadProgress.done + 1)).replace("{total}", String(uploadProgress.total))
                  : copy.upload.uploading}
              </p>
            )}
          </div>

          <div className="strategy-toggle-grid">
            <div className="form-group">
              <label>{copy.upload.category}</label>
              <select
                className="form-control"
                value={pendingMeta.documentCategory}
                onChange={(event) => setPendingMeta((current) => ({ ...current, documentCategory: event.target.value }))}
              >
                <option value="">{copy.select}</option>
                {DOCUMENT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{displayDisputeOption(option, lang)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{copy.upload.documentDate}</label>
              <input
                className="form-control"
                type="date"
                value={pendingMeta.documentDate}
                onChange={(event) => setPendingMeta((current) => ({ ...current, documentDate: event.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>{copy.upload.senderIssuer}</label>
              <input
                className="form-control"
                type="text"
                value={pendingMeta.senderIssuer}
                onChange={(event) => setPendingMeta((current) => ({ ...current, senderIssuer: event.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>{copy.upload.description}</label>
              <input
                className="form-control"
                type="text"
                value={pendingMeta.description}
                onChange={(event) => setPendingMeta((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
          </div>
        </>
      )}

      {uploadError && (
        <div className="notice notice--error strategy-inline-notice"><p>{uploadError}</p></div>
      )}

      {missingDocuments.length > 0 && (
        <div className="dispute-documents-panel__checklist">
          <h3>{copy.upload.stillNeeded}</h3>
          <ul>
            {missingDocuments.map((doc) => (
              <li key={doc.category} className={doc.decisive ? "is-decisive" : ""}>
                {displayDisputeOption(doc.category, lang)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="dispute-file-heading">{copy.upload.uploaded} ({files.length})</h3>
      {files.length === 0 ? (
        <p className="strategy-help">{copy.upload.none}</p>
      ) : (
        <ul className="dispute-file-list">
          {files.map((file) => (
            <li key={file.fileId}>
              <div>
                <strong>{file.fileName}</strong>
                <span>{[displayDisputeOption(file.documentCategory, lang), file.documentDate, file.senderIssuer, file.description].filter(Boolean).join(" · ")}</span>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={removingId === file.fileId}
                onClick={() => onRemoveFile(file.fileId)}
              >
                {removingId === file.fileId ? copy.upload.removing : copy.upload.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="form-group">
        <label>{copy.fields.keyEvidenceSummary}</label>
        <textarea
          className="form-control"
          rows={4}
          value={form.keyEvidenceSummary}
          onChange={update("keyEvidenceSummary")}
        />
      </div>
      <div className="form-group">
        <label>{copy.fields.missingEvidence}</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.missingEvidence}
          onChange={update("missingEvidence")}
        />
      </div>
      <p className="strategy-help">{copy.help.missingEvidence}</p>
    </CollapsibleCard>
  );
}
