import { REPORT_BRAND, reportStatusTone } from "./reportTheme.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function attr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function listHtml(items = []) {
  return `<ul>${items.map((item) => {
    if (item && typeof item === "object" && item.href) {
      return `<li><a href="${attr(item.href)}" target="_blank" rel="noreferrer">${escapeHtml(item.label || item.href)}</a></li>`;
    }
    return `<li>${escapeHtml(item)}</li>`;
  }).join("")}</ul>`;
}

function statusBadge(value, tone = "") {
  const safeTone = tone || reportStatusTone(value);
  return `<span class="status status--${attr(safeTone)}">${escapeHtml(value || "-")}</span>`;
}

function keyValueRows(rows = []) {
  return rows.map((row) => `
    <tr>
      <th>${escapeHtml(row.label)}</th>
      <td>${escapeHtml(row.value)}</td>
    </tr>
  `).join("");
}

function summaryCards(items = []) {
  return items.map((item) => `
    <div class="summary-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
    </div>
  `).join("");
}

// Compact label/value tile grid — used for the Initial Screening Summary's
// candidate detail rows instead of a tall single-column key/value table, so
// Chinese labels get a reasonable width instead of wrapping one character
// per line, and the section stays a fixed, predictable height.
function factGrid(rows = []) {
  return `<div class="fact-grid">${rows.map((row) => `
    <div class="fact-tile">
      <span>${escapeHtml(row.label)}</span>
      <strong>${escapeHtml(row.value)}</strong>
    </div>
  `).join("")}</div>`;
}

function rankingList(items = []) {
  return items.map((item) => `
    <div class="ranking-row">
      <div class="rank-number">${escapeHtml(item.rank)}</div>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <p>${escapeHtml(item.recommendation)}</p>
      </div>
      ${statusBadge(item.category, item.tone)}
    </div>
  `).join("");
}

function comparisonTable(columns = [], rows = [], emptyText = "") {
  const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const body = rows.length
    ? rows.map((row) => `
      <tr>
        ${columns.map((column) => `<td>${column.isBadge ? statusBadge(row[column.key], row[`${column.key}Tone`]) : escapeHtml(row[column.key])}</td>`).join("")}
      </tr>
    `).join("")
    : `<tr><td colspan="${columns.length}">${escapeHtml(emptyText || "No rows")}</td></tr>`;
  return `
    <table class="comparison-table">
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function recommendationBox(title, value, tone = "neutral") {
  return `
    <aside class="recommendation recommendation--${attr(tone)}">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(value)}</p>
    </aside>
  `;
}

function valueHtml(value) {
  if (Array.isArray(value)) return listHtml(value);
  return `<p>${escapeHtml(value || "-")}</p>`;
}

function sectionHtml(section) {
  if (section.type === "table") {
    return `
      <section class="candidate-card">
        <div class="candidate-card__header"><h2>${escapeHtml(section.title)}</h2></div>
        <table>${keyValueRows(section.rows || [])}</table>
      </section>
    `;
  }
  if (section.type === "checklist") {
    return `
      <section class="candidate-card">
        <div class="candidate-card__header"><h2>${escapeHtml(section.title)}</h2></div>
        <table>${keyValueRows((section.items || []).map((item) => ({
          label: item.label,
          value: `${item.status || "-"}${item.note ? ` - ${item.note}` : ""}`,
        })))}</table>
      </section>
    `;
  }
  return `
    <section class="candidate-card">
      <div class="candidate-card__header"><h2>${escapeHtml(section.title)}</h2></div>
      ${valueHtml(section.items || section.body || [])}
    </section>
  `;
}

// Candidate detail card for the Initial Screening Summary. Kept compact and
// single-column-flow (fact tiles instead of a tall key/value table, one
// recommendation surface instead of three) so each applicant normally fits
// on one printed page. The `candidate-detail-card` class (in addition to the
// shared `candidate-card` visual styling) scopes the per-applicant
// page-break rules below to this report only — the Full Applicant Audit
// Report reuses `candidate-card` for its own, differently-shaped sections
// and must keep its existing pagination behavior unchanged.
function candidateCard(candidate, copy) {
  return `
    <section class="candidate-card candidate-detail-card">
      <div class="candidate-card__header">
        <div>
          <span class="eyebrow">${escapeHtml(copy.candidateDetail)}</span>
          <h2>${escapeHtml(candidate.rank)}. ${escapeHtml(candidate.name)}</h2>
        </div>
        ${statusBadge(candidate.category, candidate.categoryTone)}
      </div>
      <div class="candidate-card__metrics">
        ${summaryCards(candidate.metrics)}
      </div>
      <div class="fact-section">
        <h3>${escapeHtml(copy.coreFacts)}</h3>
        ${factGrid(candidate.coreFacts)}
      </div>
      <div class="fact-section">
        <h3>${escapeHtml(copy.employmentIncomeSummary)}</h3>
        ${factGrid(candidate.employmentIncome)}
      </div>
      <div class="fact-section">
        <h3>${escapeHtml(copy.rentalReferenceSummary)}</h3>
        ${factGrid(candidate.rentalReference)}
      </div>
      <div class="insight-grid">
        <div class="insight insight--strength">
          <h3>${escapeHtml(copy.strengths)}</h3>
          ${listHtml(candidate.strengths)}
        </div>
        <div class="insight insight--concern">
          <h3>${escapeHtml(copy.concerns)}</h3>
          ${listHtml(candidate.concerns)}
        </div>
        <div class="insight insight--recommendation">
          <h3>${escapeHtml(copy.recommendations)}</h3>
          ${listHtml(candidate.recommendations)}
        </div>
      </div>
      <p class="final-assessment"><strong>${escapeHtml(copy.finalAssessment)}:</strong> ${escapeHtml(candidate.finalAssessment)}</p>
    </section>
  `;
}

function reportStyles() {
  const c = REPORT_BRAND.colors;
  const f = REPORT_BRAND.fonts;
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: ${c.text};
      background: #fff;
      font-family: ${f.body};
      line-height: 1.5;
    }
    .page {
      min-height: 100vh;
      padding: 34px 38px 28px;
      background: linear-gradient(180deg, ${c.cream} 0, #fff 220px);
      page-break-after: always;
      position: relative;
    }
    .page:last-child { page-break-after: auto; }
    /* Opt-in for renderStructuredProfessionalReportHtml's continuousFlow mode
       (Full Applicant Audit Report only — see that function). Without this,
       the cover .page block always forces a hard page break after itself
       (above) *in addition to* whatever natural page break already occurred
       from its own content overflowing one physical page — stacking two
       breaks and leaving a near-empty page between the cover's overflow
       remainder and the next block's content. page-break-after: auto lets
       the next block's content continue filling the same physical page
       instead, so pages only break where content genuinely runs out of room. */
    .page--flow { page-break-after: auto; }
    .report-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 18px;
      border-bottom: 2px solid ${c.gold};
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .mark {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: ${c.green};
      color: ${c.gold};
      font-weight: 800;
      letter-spacing: 0;
    }
    .brand strong { display: block; font-size: 14px; }
    .brand span, .meta p, .muted { color: ${c.muted}; font-size: 10.5px; }
    h1, h2, h3 { color: ${c.green}; margin: 0; }
    h1 {
      margin-top: 26px;
      max-width: 680px;
      font-family: ${f.heading};
      font-size: 34px;
      font-weight: 600;
      line-height: 1.05;
    }
    .subtitle { max-width: 760px; margin: 12px 0 0; color: ${c.sage}; font-size: 13px; }
    .meta { text-align: right; min-width: 210px; }
    .meta p { margin: 0 0 5px; }
    .meta strong { color: ${c.green}; font-size: 10.5px; }
    .section-title {
      margin: 22px 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid ${c.line};
      padding-bottom: 8px;
    }
    .section-title span, .eyebrow {
      color: ${c.gold};
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .section-title h2 { font-size: 18px; }
    .summary-grid, .candidate-card__metrics {
      display: grid;
      gap: 10px;
      margin: 18px 0;
    }
    .summary-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .summary-grid .summary-card { grid-column: span 2; }
    .summary-grid .summary-card:nth-child(4) { grid-column: 2 / span 2; }
    .candidate-card__metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .summary-card {
      border: 1px solid ${c.line};
      border-radius: 10px;
      background: #fff;
      padding: 12px;
      min-height: 78px;
    }
    .summary-card span {
      display: block;
      color: ${c.muted};
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-card strong {
      display: block;
      margin-top: 5px;
      color: ${c.green};
      font-size: 16px;
      line-height: 1.15;
    }
    .summary-card p { margin: 6px 0 0; color: ${c.muted}; font-size: 10px; }
    .ranking-row {
      display: grid;
      grid-template-columns: 34px 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid ${c.line};
    }
    .ranking-row p { margin: 3px 0 0; color: ${c.muted}; font-size: 10.5px; }
    .rank-number {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: ${c.green};
      color: #fff;
      font-weight: 800;
      font-size: 11px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 9.5px;
      font-weight: 800;
      white-space: nowrap;
    }
    .status--success { color: ${c.green}; background: ${c.riskLow}; border: 1px solid #C9D9CE; }
    .status--warning { color: #7A5A12; background: ${c.riskMedium}; border: 1px solid #EAD399; }
    .status--danger { color: #8A3128; background: ${c.riskHigh}; border: 1px solid #E8B8B1; }
    .status--neutral { color: ${c.muted}; background: #F2F4F2; border: 1px solid ${c.line}; }
    .recommendation {
      margin: 16px 0;
      padding: 13px 15px;
      border-radius: 10px;
      border-left: 5px solid ${c.gold};
      background: ${c.goldSoft};
    }
    .recommendation strong { color: ${c.green}; font-size: 12px; }
    .recommendation p { margin: 5px 0 0; color: ${c.text}; font-size: 11.5px; }
    .recommendation--success { border-left-color: ${c.greenMid}; background: ${c.riskLow}; }
    .recommendation--warning { border-left-color: ${c.gold}; background: ${c.riskMedium}; }
    .recommendation--danger { border-left-color: #B04A3F; background: ${c.riskHigh}; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 0; }
    th, td { border: 1px solid ${c.line}; padding: 7px 8px; vertical-align: top; text-align: left; font-size: 10px; }
    th { background: #F7F3EA; color: ${c.green}; font-weight: 800; }
    /* Key/value tables (checklist-style sections) get a fixed layout with a
       reasonable minimum label-column width so a long value never squeezes
       the label column down to one-character-per-line CJK wrapping. The
       comparison table has its own column widths via <col>/content and is
       excluded. */
    table:not(.comparison-table) { table-layout: fixed; }
    table:not(.comparison-table) th { width: 34%; min-width: 120px; overflow-wrap: break-word; }
    table:not(.comparison-table) td { overflow-wrap: break-word; word-break: normal; }
    .comparison-table th { white-space: nowrap; }
    .comparison-table td { font-size: 9.5px; }
    .candidate-card {
      break-inside: avoid;
      margin: 0 0 18px;
      padding: 16px;
      border: 1px solid ${c.line};
      border-top: 4px solid ${c.gold};
      border-radius: 12px;
      background: #fff;
    }
    .candidate-card__header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }
    .candidate-card h2 { margin-top: 3px; font-size: 18px; }
    .candidate-card__metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 8px 0; }
    .candidate-card__metrics .summary-card { min-height: 50px; padding: 8px; }
    .candidate-card__metrics .summary-card strong { font-size: 14px; }
    /* Initial Screening Summary candidate cards: allow the card to flow
       across a page boundary if content genuinely exceeds one page, instead
       of the "avoid" above forcing the whole multi-page card onto a fresh
       page (which leaves the preceding page mostly blank). Each applicant
       still starts on its own page via the sibling rule below. Scoped to
       candidate-detail-card only — the Full Applicant Audit Report's
       differently-shaped candidate-card sections keep the default "avoid".
       Sizes and spacing in this block are deliberately tight (but still a
       readable ~9-10px) — Chinese (CJK) text runs taller per line than
       Latin text at the same font-size, so headroom here is what keeps
       Chinese candidate cards to one page too, not just English ones. */
    .candidate-detail-card { break-inside: auto; page-break-inside: auto; }
    .candidate-detail-card + .candidate-detail-card { break-before: page; page-break-before: always; }
    .fact-section { margin-top: 8px; }
    .fact-section h3 { font-size: 11px; margin-bottom: 5px; }
    .fact-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 5px;
    }
    .fact-tile {
      border: 1px solid ${c.line};
      border-radius: 7px;
      padding: 4px 7px;
      background: #fff;
      break-inside: avoid;
    }
    .fact-tile span {
      display: block;
      color: ${c.muted};
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .fact-tile strong {
      display: block;
      margin-top: 2px;
      color: ${c.text};
      font-size: 9.5px;
      font-weight: 600;
      line-height: 1.3;
      overflow-wrap: break-word;
    }
    .insight-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .insight {
      border: 1px solid ${c.line};
      border-radius: 10px;
      padding: 8px 9px;
      background: #fff;
      break-inside: avoid;
    }
    .insight h3 { font-size: 11px; margin-bottom: 5px; }
    .insight ul { margin: 5px 0 0 13px; padding: 0; }
    .insight li { margin-bottom: 2px; font-size: 9px; line-height: 1.3; }
    .insight--strength { background: #F7FAF7; }
    .insight--concern { background: #FFF9EA; }
    .insight--recommendation { background: #FAF8F4; }
    .final-assessment {
      margin: 8px 0 0;
      padding: 7px 10px;
      border-radius: 8px;
      background: ${c.goldSoft};
      font-size: 9.5px;
      color: ${c.text};
      break-inside: avoid;
    }
    .final-assessment strong { color: ${c.green}; }
    .notice {
      margin-top: 18px;
      padding: 11px 13px;
      border: 1px solid #EAD399;
      border-radius: 10px;
      background: #FFF9EA;
      color: ${c.muted};
      font-size: 10.5px;
    }
    .footer {
      position: absolute;
      left: 38px;
      right: 38px;
      bottom: 18px;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid ${c.line};
      padding-top: 8px;
      color: ${c.muted};
      font-size: 9px;
    }
    /* Keep section headings attached to the content that follows them
       instead of being orphaned alone at the bottom of a page. */
    .section-title, h1, h2, h3 {
      break-after: avoid;
      page-break-after: avoid;
    }
    @media print {
      @page { size: letter; margin: 0; }
      html, body { margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { min-height: 11in; padding: 0.45in 0.45in 0.62in; }
      .footer { position: absolute; left: 0.45in; right: 0.45in; bottom: 0.28in; }
    }
  `;
}

export function renderProfessionalReportHtml(report) {
  const copy = report.copy;
  const title = report.title;
  const language = report.language === "zh" ? "zh-CN" : "en";
  const candidatePages = report.candidates.map((candidate) => candidateCard(candidate, copy)).join("");

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${reportStyles()}</style>
</head>
<body>
  <section class="page">
    <header class="report-header">
      <div class="brand">
        <div class="mark">${escapeHtml(REPORT_BRAND.mark)}</div>
        <div>
          <strong>${escapeHtml(REPORT_BRAND.company)}</strong>
          <span>${escapeHtml(copy.preparedBy)}</span>
        </div>
      </div>
      <div class="meta">
        ${report.meta.map((item) => `<p><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</p>`).join("")}
      </div>
    </header>
    <h1>${escapeHtml(title)}</h1>
    ${report.subtitle ? `<p class="subtitle">${escapeHtml(report.subtitle)}</p>` : ""}
    <div class="notice">${escapeHtml(report.notice)}</div>
    <div class="section-title">
      <div>
        <span>${escapeHtml(copy.overview)}</span>
        <h2>${escapeHtml(copy.executiveSummary)}</h2>
      </div>
    </div>
    <div class="summary-grid">${summaryCards(report.executiveSummary)}</div>
    ${recommendationBox(copy.aiRecommendation, report.aiRecommendation, report.recommendationTone)}
    <div class="section-title">
      <div>
        <span>${escapeHtml(copy.executiveSummary)}</span>
        <h2>${escapeHtml(copy.applicantRanking)}</h2>
      </div>
      ${statusBadge(report.riskLevel, report.riskTone)}
    </div>
    ${rankingList(report.ranking)}
    <div class="section-title">
      <div>
        <span>${escapeHtml(copy.overview)}</span>
        <h2>${escapeHtml(copy.comparisonTable)}</h2>
      </div>
    </div>
    ${comparisonTable(report.comparisonColumns, report.comparisonRows, report.emptyText)}
    <div class="footer">
      <span>${escapeHtml(REPORT_BRAND.company)}</span>
      <span>${escapeHtml(copy.footerNotice)}</span>
    </div>
  </section>
  <section class="page">
    <div class="section-title">
      <div>
        <span>${escapeHtml(copy.candidateDetail)}</span>
        <h2>${escapeHtml(copy.candidateDetails)}</h2>
      </div>
    </div>
    ${candidatePages || `<p>${escapeHtml(report.emptyText)}</p>`}
    <div class="footer">
      <span>${escapeHtml(REPORT_BRAND.company)}</span>
      <span>${escapeHtml(copy.footerNotice)}</span>
    </div>
  </section>
</body>
</html>`;
}

export function renderStructuredProfessionalReportHtml(report) {
  const copy = report.copy || {};
  const title = report.title;
  const language = report.language === "zh" ? "zh-CN" : "en";
  const sections = (report.sections || []).map(sectionHtml).join("");
  // continuousFlow: opt-in only (Full Applicant Audit Report — see
  // downloadFullApplicantAuditReport). Strategy Assessment and Dispute
  // Review reports don't pass this and keep their exact current pagination.
  const coverPageClass = report.continuousFlow ? "page page--flow" : "page";
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${reportStyles()}</style>
</head>
<body>
  <section class="${coverPageClass}">
    <header class="report-header">
      <div class="brand">
        <div class="mark">${escapeHtml(REPORT_BRAND.mark)}</div>
        <div>
          <strong>${escapeHtml(REPORT_BRAND.company)}</strong>
          <span>${escapeHtml(copy.preparedBy || "Prepared by")}</span>
        </div>
      </div>
      <div class="meta">
        ${(report.meta || []).map((item) => `<p><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</p>`).join("")}
      </div>
    </header>
    <h1>${escapeHtml(title)}</h1>
    ${report.subtitle ? `<p class="subtitle">${escapeHtml(report.subtitle)}</p>` : ""}
    ${report.candidateSummary?.length ? `
      <div class="section-title"><div><span>${escapeHtml(copy.overview || "Overview")}</span><h2>${escapeHtml(copy.candidateSummary || "Candidate Summary")}</h2></div></div>
      <table>${keyValueRows(report.candidateSummary)}</table>
    ` : ""}
    ${report.executiveSummary?.length ? `
      <div class="section-title"><div><span>${escapeHtml(copy.overview || "Overview")}</span><h2>${escapeHtml(copy.executiveSummary || "Executive Summary")}</h2></div></div>
      <div class="summary-grid">${summaryCards(report.executiveSummary)}</div>
    ` : ""}
    ${report.aiRecommendation ? recommendationBox(copy.aiRecommendation || "AI Recommendation", report.aiRecommendation, report.recommendationTone || "neutral") : ""}
    ${report.notice ? `<div class="notice">${escapeHtml(report.notice)}</div>` : ""}
    <div class="footer">
      <span>${escapeHtml(REPORT_BRAND.company)}</span>
      <span>${escapeHtml(copy.footerNotice || "")}</span>
    </div>
  </section>
  <section class="page">
    ${sections || `<p>${escapeHtml(report.emptyText || "")}</p>`}
    <div class="footer">
      <span>${escapeHtml(REPORT_BRAND.company)}</span>
      <span>${escapeHtml(copy.footerNotice || "")}</span>
    </div>
  </section>
</body>
</html>`;
}
