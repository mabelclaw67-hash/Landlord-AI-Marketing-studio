import { useEffect, useState } from "react";
import { getDisputeSettlement, saveDisputeSettlement } from "../utils/disputeReview";
import {
  SETTLEMENT_CAUTIONS,
  SETTLEMENT_DOCUMENTATION_STATUSES,
  SETTLEMENT_NOTICE,
  SETTLEMENT_OFFER_DIRECTIONS,
  SETTLEMENT_OFFER_TYPES,
  SETTLEMENT_STATUSES,
  SUPREME_COURT_CIVIL_RULES_URL,
  SUPREME_COURT_FORMS_INDEX_URL,
  computeSettlementTiming,
  getSettlementReadiness,
  makeSettlementOffer,
  settlementSummary,
} from "../config/supremeCourtCivilClaimDefendantWorkflow";

const FILTERS = ["All", "Active", "Awaiting Response", "Overdue", "Accepted", "Rejected / Expired / Withdrawn"];

function matchesFilter(offer, filter) {
  const terminal = ["Accepted", "Rejected", "Expired", "Withdrawn"].includes(offer.status);
  switch (filter) {
    case "All": return true;
    case "Active": return !terminal;
    case "Awaiting Response": return ["Sent / Delivered", "Under Review"].includes(offer.status);
    case "Overdue": return computeSettlementTiming(offer) === "Overdue";
    case "Accepted": return offer.status === "Accepted";
    case "Rejected / Expired / Withdrawn": return ["Rejected", "Expired", "Withdrawn"].includes(offer.status);
    default: return true;
  }
}

function SettlementCard({ offer, expanded, onToggle, onChange, onRemove }) {
  const timing = computeSettlementTiming(offer);
  return (
    <div className={`scc-em-row ${expanded ? "scc-em-row--open" : ""}`}>
      <button type="button" className="scc-em-row__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="scc-em-row__summary">{offer.title || "(untitled offer)"}</span>
        <span className="scc-em-row__position">{offer.offerDirection}</span>
        <span className="ccard__badge ccard__badge--conditional">{offer.status}</span>
        {timing && <span className={`ccard__badge ${timing === "Overdue" ? "ccard__badge--not-started" : timing === "Due Soon" ? "ccard__badge--conditional" : "ccard__badge--completed"}`}>{timing}</span>}
        <span className="ccard__chevron" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="scc-em-row__body">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" value={offer.title} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Offer direction</label>
              <select className="form-control" value={offer.offerDirection} onChange={(e) => onChange({ offerDirection: e.target.value })}>
                {SETTLEMENT_OFFER_DIRECTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Offer type</label>
              <select className="form-control" value={offer.offerType} onChange={(e) => onChange({ offerType: e.target.value })}>
                {SETTLEMENT_OFFER_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={offer.status} onChange={(e) => onChange({ status: e.target.value })}>
                {SETTLEMENT_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Monetary amount / terms</label>
            <input className="form-control" value={offer.monetaryAmount} onChange={(e) => onChange({ monetaryAmount: e.target.value })} placeholder="e.g. $5,000 or N/A" />
          </div>
          <div className="form-group">
            <label>Non-monetary terms</label>
            <textarea className="form-control" rows={2} value={offer.nonMonetaryTerms} onChange={(e) => onChange({ nonMonetaryTerms: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label><input type="checkbox" checked={offer.releaseRequired} onChange={(e) => onChange({ releaseRequired: e.target.checked })} /> Release required</label>
              {offer.releaseRequired && (
                <input className="form-control" value={offer.releaseScope} onChange={(e) => onChange({ releaseScope: e.target.value })} placeholder="Scope of release" />
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Costs terms</label>
            <textarea className="form-control" rows={2} value={offer.costsTerms} onChange={(e) => onChange({ costsTerms: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Payment terms</label>
            <textarea className="form-control" rows={2} value={offer.paymentTerms} onChange={(e) => onChange({ paymentTerms: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date made</label>
              <input className="form-control" type="date" value={offer.dateMade} onChange={(e) => onChange({ dateMade: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Response deadline</label>
              <input className="form-control" type="date" value={offer.responseDeadline} onChange={(e) => onChange({ responseDeadline: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label><input type="checkbox" checked={offer.consentOrderNeeded} onChange={(e) => onChange({ consentOrderNeeded: e.target.checked })} /> Consent order needed</label>
              {offer.consentOrderNeeded && (
                <select className="form-control" value={offer.consentOrderStatus} onChange={(e) => onChange({ consentOrderStatus: e.target.value })}>
                  {SETTLEMENT_DOCUMENTATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                  <option value="Filed">Filed</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              )}
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={offer.discontinuanceNeeded} onChange={(e) => onChange({ discontinuanceNeeded: e.target.checked })} /> Notice of Discontinuance needed</label>
              {offer.discontinuanceNeeded && (
                <select className="form-control" value={offer.discontinuanceStatus} onChange={(e) => onChange({ discontinuanceStatus: e.target.value })}>
                  {SETTLEMENT_DOCUMENTATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                  <option value="Filed">Filed</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Final agreement documentation status</label>
            <select className="form-control" value={offer.documentationStatus} onChange={(e) => onChange({ documentationStatus: e.target.value })}>
              {SETTLEMENT_DOCUMENTATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Reviewer notes (internal only)</label>
            <textarea className="form-control" rows={2} value={offer.reviewerNotes} onChange={(e) => onChange({ reviewerNotes: e.target.value })} />
          </div>
          <div className="dispute-admin-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={onRemove}>Remove this offer</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Case workspace for Stage 8 (Settlement). Persists to the same
// "AI Analysis JSON" envelope used by Evidence Matrix / Document Discovery /
// Examination for Discovery / Applications (see
// apps-script/DisputeSettlement.gs) — reviewId changing remounts this
// component (parent passes key={reviewId}).
export default function SettlementWorkspace({ reviewId, onSettlementChange }) {
  const [settlement, setSettlement] = useState(null);
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
    getDisputeSettlement(reviewId)
      .then((data) => {
        if (!active) return;
        const loaded = data?.settlement || null;
        setSettlement(loaded);
        onSettlementChange?.(loaded);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Failed to load the Settlement workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  function replaceOffers(list) {
    const next = { ...(settlement || { version: 1 }), offers: list };
    setSettlement(next);
    setDirty(true);
    setSaveState("idle");
    onSettlementChange?.(next);
  }

  function addOffer() {
    const o = makeSettlementOffer();
    replaceOffers([...(settlement?.offers || []), o]);
    setExpandedId(o.id);
  }
  function updateOffer(id, patch) {
    replaceOffers((settlement?.offers || []).map((o) => (o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o)));
  }
  function removeOffer(id) {
    if (!window.confirm("Remove this settlement offer record?")) return;
    replaceOffers((settlement?.offers || []).filter((o) => o.id !== id));
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    try {
      const toSave = settlement || { version: 1, offers: [] };
      const result = await saveDisputeSettlement(reviewId, toSave);
      setSettlement(result.settlement);
      setDirty(false);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      onSettlementChange?.(result.settlement);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message || "Failed to save the Settlement workspace.");
    }
  }

  if (loading) {
    return (
      <div id="scc-settlement" className="scc-evidence-matrix">
        <h3 className="dispute-admin-heading">Settlement Workspace</h3>
        <p className="strategy-help">Loading Settlement workspace…</p>
      </div>
    );
  }

  const list = settlement?.offers || [];
  const summary = settlementSummary(list);
  const readiness = getSettlementReadiness(list);
  const visible = list.filter((o) => matchesFilter(o, filter));

  return (
    <div id="scc-settlement" className="scc-evidence-matrix">
      <h3 className="dispute-admin-heading">Settlement Workspace</h3>
      <div className="notice notice--warm strategy-inline-notice">
        <p>{SETTLEMENT_NOTICE}</p>
        <ul>{SETTLEMENT_CAUTIONS.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
      <div className="notice notice--sage strategy-inline-notice">
        <p><strong>{readiness}</strong></p>
      </div>

      <div className="scc-em-summary scc-dd-summary">
        <div className="scc-em-stat"><strong>{summary.total}</strong><span>Total offers</span></div>
        <div className="scc-em-stat"><strong>{summary.active}</strong><span>Active</span></div>
        <div className="scc-em-stat"><strong>{summary.awaitingResponse}</strong><span>Awaiting response</span></div>
        <div className="scc-em-stat"><strong>{summary.overdue}</strong><span>Overdue</span></div>
        <div className="scc-em-stat"><strong>{summary.accepted}</strong><span>Accepted</span></div>
        <div className="scc-em-stat"><strong>{summary.formalOffers}</strong><span>Formal (Rule 9-1)</span></div>
        <div className="scc-em-stat"><strong>{summary.formalizationOutstanding}</strong><span>Formalization outstanding</span></div>
      </div>

      <div className="dispute-admin-long">
        <strong>Official Forms and Rules</strong>
        <div className="scc-form-grid">
          <div className="scc-form-card">
            <div className="scc-form-card__head"><span className="scc-form-card__number">Form 34</span><span className="scc-form-pill scc-form-pill--conditional">Conditional</span></div>
            <p className="scc-form-card__name">Consent Order</p>
            <p className="scc-form-card__purpose">An order both parties agree to, submitted to the court for approval without a contested hearing.</p>
            <div className="scc-form-card__links">
              <a href={SUPREME_COURT_FORMS_INDEX_URL} target="_blank" rel="noopener noreferrer">Official form source</a>
              <a href={SUPREME_COURT_CIVIL_RULES_URL} target="_blank" rel="noopener noreferrer">Supreme Court Civil Rules</a>
            </div>
          </div>
          <div className="scc-form-card">
            <div className="scc-form-card__head"><span className="scc-form-card__number">Form 36</span><span className="scc-form-pill scc-form-pill--only_if_applicable">Only if applicable</span></div>
            <p className="scc-form-card__name">Notice of Discontinuance</p>
            <p className="scc-form-card__purpose">Formally ends a claim, counterclaim, or third party claim, in whole or in part.</p>
            <div className="scc-form-card__links">
              <a href={SUPREME_COURT_FORMS_INDEX_URL} target="_blank" rel="noopener noreferrer">Official form source</a>
              <a href={SUPREME_COURT_CIVIL_RULES_URL} target="_blank" rel="noopener noreferrer">Supreme Court Civil Rules</a>
            </div>
          </div>
        </div>
        <p className="scc-form-verified">This workspace tracks whether these materials are needed and their status — it does not generate them.</p>
      </div>

      <div className="dispute-admin-actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={addOffer}>+ Add settlement offer</button>
      </div>

      <div className="scc-em-toolbar">
        <select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {loadError && <div className="notice notice--error"><p>{loadError}</p></div>}
      {visible.length === 0 && <p className="strategy-help">No settlement offers match the current filter.</p>}

      {visible.map((o) => (
        <SettlementCard
          key={o.id}
          offer={o}
          expanded={expandedId === o.id}
          onToggle={() => setExpandedId((c) => (c === o.id ? null : o.id))}
          onChange={(patch) => updateOffer(o.id, patch)}
          onRemove={() => removeOffer(o.id)}
        />
      ))}

      <div className="scc-em-save-bar">
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === "saving" || !dirty}>
          {saveState === "saving" ? "Saving…" : "Save Settlement Workspace"}
        </button>
        {saveState === "saved" && !dirty && <span className="scc-em-save-status scc-em-save-status--ok">Saved{lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleString()}` : ""}.</span>}
        {saveState === "error" && <span className="scc-em-save-status scc-em-save-status--error">{saveError}</span>}
        {dirty && saveState !== "saving" && <span className="scc-em-save-status">Unsaved changes.</span>}
      </div>
    </div>
  );
}
