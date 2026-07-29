import { useState } from "react";
import { PROPERTY_STRATEGY_ACCEPT_ATTRIBUTE, PROPERTY_STRATEGY_FILE_CATEGORIES, displayPropertyStrategyCategory } from "../utils/strategyAssessment";
import CollapsibleCard from "./CollapsibleCard";

export default function PropertyDocumentsPanel({
  lang,
  copy,
  restoringFiles,
  restoreNotice,
  uploadReady,
  uploadAvailable,
  onRetryUpload,
  turnstileWidget,
  turnstileReady,
  pendingCategory,
  setPendingCategory,
  pendingRoomArea,
  setPendingRoomArea,
  files,
  uploading,
  uploadProgress,
  uploadError,
  onFileInputChange,
  onDrop,
  onDragOver,
  onRemoveFile,
  removingId,
  defaultExpanded = true,
}) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <CollapsibleCard
      className="dispute-documents-panel"
      defaultOpen={defaultExpanded}
      title={`${copy.photoLabel} (${files.length})`}
    >
      <p>{copy.photoHelp}</p>
      <p className="strategy-help">{copy.upload.limits}</p>
      <div className="strategy-help">
        {turnstileWidget}
        {turnstileReady ? copy.upload.securityDone : copy.upload.securityPending}
      </div>

      {restoreNotice && (
        <div className="notice notice--warm strategy-inline-notice"><p>{restoreNotice}</p></div>
      )}

      {restoringFiles ? (
        <p className="strategy-help">{copy.upload.restoring}</p>
      ) : !uploadAvailable ? (
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
              accept={PROPERTY_STRATEGY_ACCEPT_ATTRIBUTE}
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
                value={pendingCategory}
                onChange={(event) => setPendingCategory(event.target.value)}
              >
                <option value="">{copy.select}</option>
                {PROPERTY_STRATEGY_FILE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{displayPropertyStrategyCategory(option, lang)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{copy.upload.roomArea}</label>
              <input
                className="form-control"
                type="text"
                value={pendingRoomArea}
                onChange={(event) => setPendingRoomArea(event.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {uploadError && (
        <div className="notice notice--error strategy-inline-notice"><p>{uploadError}</p></div>
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
                <span>{[displayPropertyStrategyCategory(file.category, lang), file.roomArea].filter(Boolean).join(" · ")}</span>
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

      <p className="strategy-help">{copy.upload.privacyNote}</p>
    </CollapsibleCard>
  );
}
