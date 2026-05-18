function toPdfSafeText(value) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateValue(value) {
  if (!value) return "N/A";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  return text;
}

function wrapText(text, size, maxWidth) {
  const clean = toPdfSafeText(text);
  if (!clean) return [""];

  const approxCharWidth = size * 0.52;
  const maxChars = Math.max(18, Math.floor(maxWidth / approxCharWidth));
  const words = clean.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);

    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    let rest = word;
    while (rest.length > maxChars) {
      lines.push(rest.slice(0, maxChars - 1) + "-");
      rest = rest.slice(maxChars - 1);
    }
    current = rest;
  }

  if (current) lines.push(current);
  return lines;
}

function buildFormBlocks(listing, listingUrl) {
  const listingTitle = [listing.bedrooms, "Bed /", listing.bathrooms, "Bath -", listing.address]
    .filter(Boolean)
    .join(" ");

  const listingFacts = [
    `Property: ${listingTitle || "Current rental listing"}`,
    `Listing ID: ${listing.id || "N/A"}`,
    `City: ${listing.city || "N/A"}, BC`,
    `Monthly Rent: ${listing.rent ? `$${Number(listing.rent).toLocaleString()} / month` : "N/A"}`,
    `Available: ${formatDateValue(listing.available)}`,
    `Lease Term: ${listing.leaseTerm || "N/A"}`,
    `Utilities: ${listing.utilities || "N/A"}`,
    `Pets: ${listing.pets || "N/A"}`,
    `Parking: ${listing.parking || "N/A"}`,
    `Laundry: ${listing.laundry || "N/A"}`,
    `Smoking Policy: ${listing.smoking || "N/A"}`,
    `Listing Page: ${listingUrl}`,
  ];

  return [
    { text: "Rental Application Form", font: "F2", size: 19, gapAfter: 10 },
    { text: "Printable tenant PDF generated from the current rental listing page.", font: "F1", size: 11, gapAfter: 16 },

    { text: "Listing Information", font: "F2", size: 14, gapAfter: 8 },
    ...listingFacts.map((text) => ({ text, font: "F1", size: 11, gapAfter: 6 })),

    { text: "Applicant Information", font: "F2", size: 14, gapAfter: 8 },
    { text: "Full legal name: _________________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Date of birth: __________________    Phone: ______________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Email address: __________________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Current address: ________________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "How long at current address: ____________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Reason for moving: ______________________________________________", font: "F1", size: 11, gapAfter: 14 },

    { text: "Occupants", font: "F2", size: 14, gapAfter: 8 },
    { text: "Number of adult occupants: __________    Number of children: ______", font: "F1", size: 11, gapAfter: 8 },
    { text: "Names of all occupants: _________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "_______________________________________________________________", font: "F1", size: 11, gapAfter: 14 },

    { text: "Employment and Income", font: "F2", size: 14, gapAfter: 8 },
    { text: "Employer name: _________________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Position / occupation: _________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Monthly income: ________________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Other income source(s): ________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Supervisor or HR contact: ______________________________________", font: "F1", size: 11, gapAfter: 14 },

    { text: "Rental History and References", font: "F2", size: 14, gapAfter: 8 },
    { text: "Current landlord / manager: ____________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Landlord phone / email: ________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Previous landlord / manager: ___________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Previous landlord phone / email: ________________________________", font: "F1", size: 11, gapAfter: 14 },

    { text: "Additional Information", font: "F2", size: 14, gapAfter: 8 },
    { text: "Pets? [ ] Yes  [ ] No    If yes, describe: _______________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Vehicles / parking needs: ______________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Preferred move-in date: ________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Emergency contact name and phone: _______________________________", font: "F1", size: 11, gapAfter: 14 },

    { text: "Declarations", font: "F2", size: 14, gapAfter: 8 },
    { text: "I confirm that the information provided in this application is true and complete.", font: "F1", size: 11, gapAfter: 8 },
    { text: "I understand that additional supporting documents may be requested.", font: "F1", size: 11, gapAfter: 8 },
    { text: "Applicant signature: ____________________________________________", font: "F1", size: 11, gapAfter: 8 },
    { text: "Date: ___________________________", font: "F1", size: 11, gapAfter: 16 },

    { text: "Recommended supporting documents", font: "F2", size: 14, gapAfter: 8 },
    { text: "- Proof of income and/or employment", font: "F1", size: 11, gapAfter: 6 },
    { text: "- Credit report or written consent for a credit check", font: "F1", size: 11, gapAfter: 6 },
    { text: "- References", font: "F1", size: 11, gapAfter: 6 },
    { text: "- Tenant insurance information", font: "F1", size: 11, gapAfter: 6 },
  ];
}

function paginateBlocks(blocks) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 50;
  const topMargin = 56;
  const bottomMargin = 52;
  const maxWidth = pageWidth - marginX * 2;
  const pages = [];
  let page = [];
  let y = topMargin;

  for (const block of blocks) {
    const lines = wrapText(block.text, block.size, maxWidth);
    const lineHeight = Math.max(14, Math.round(block.size * 1.45));
    const blockHeight = lines.length * lineHeight + (block.gapAfter || 0);

    if (y + blockHeight > pageHeight - bottomMargin && page.length > 0) {
      pages.push(page);
      page = [];
      y = topMargin;
    }

    for (const line of lines) {
      page.push({
        text: line,
        font: block.font,
        size: block.size,
        x: marginX,
        y,
      });
      y += lineHeight;
    }

    y += block.gapAfter || 0;
  }

  if (page.length > 0) pages.push(page);
  return pages;
}

function buildPdfBlobFromPages(pages) {
  const pageWidth = 595;
  const pageHeight = 842;
  const header = "%PDF-1.4\n";
  const objects = [];
  const encoder = new TextEncoder();

  const contentObjects = pages.map((pageLines) => {
    const stream = pageLines.map((line) => {
      const y = pageHeight - line.y;
      return `BT /${line.font} ${line.size} Tf 1 0 0 1 ${line.x} ${y} Tm (${line.text}) Tj ET`;
    }).join("\n");

    return `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`;
  });

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  const pageObjectNumbers = pages.map((_, index) => 5 + index * 2);
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((_, index) => {
    const pageObjectNumber = 5 + index * 2;
    const contentObjectNumber = 6 + index * 2;
    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] = contentObjects[index];
  });

  let body = header;
  const offsets = [0];

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = encoder.encode(body).length;
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(body).length;
  body += `xref\n0 ${objects.length}\n`;
  body += "0000000000 65535 f \n";

  for (let i = 1; i < objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([body], { type: "application/pdf" });
}

// ── Submitted application PDF (pre-filled with actual data) ──────────────────
//
// Accepts a normalized `data` object. Call site is responsible for mapping
// from either the raw `form` state (tenant success page) or the backend `app`
// object (admin review page) to this structure.
//
// data: {
//   listingId, listingAddress, listingRent,
//   applicantName, email, phone, dateOfBirth, currentAddress, wechat,
//   employmentStatus, employer, monthlyIncome,
//   moveInDate, leaseTerm, occupants, adults, minors, occupantNamesAges,
//   landlordReference, creditHistory,
//   hasPets, petDetails, parkingRequest,
//   hasTenantInsurance, depositFundsAvailable,
//   reasonForMoving, additionalNotes,
//   recordId (optional), submittedAt (optional),
// }

function f(v) {
  const s = toPdfSafeText(v || "");
  return s || "--";
}

function buildSubmittedAppBlocks(data, recordId) {
  const now = new Date().toLocaleDateString("en-CA");
  const ref  = toPdfSafeText(recordId || data.recordId || "");

  const lines = [
    { text: "Rental Application -- Submitted Copy", font: "F2", size: 18, gapAfter: 8 },
    { text: `Generated: ${now}`, font: "F1", size: 10, gapAfter: 4 },
  ];

  if (ref) lines.push({ text: `Reference: ${ref}`, font: "F1", size: 10, gapAfter: 4 });

  const submittedAt = toPdfSafeText(data.submittedAt || "");
  if (submittedAt) lines.push({ text: `Submitted: ${submittedAt}`, font: "F1", size: 10, gapAfter: 12 });
  else lines.push({ text: "", font: "F1", size: 10, gapAfter: 12 });

  // Listing
  lines.push({ text: "Listing Applied For", font: "F2", size: 14, gapAfter: 8 });
  lines.push({ text: `Listing ID: ${f(data.listingId)}`, font: "F1", size: 11, gapAfter: 5 });
  if (data.listingAddress) lines.push({ text: `Address: ${f(data.listingAddress)}`, font: "F1", size: 11, gapAfter: 5 });
  if (data.listingRent) lines.push({ text: `Monthly Rent: ${f(data.listingRent)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });

  // Applicant
  lines.push({ text: "Applicant Information", font: "F2", size: 14, gapAfter: 8 });
  lines.push({ text: `Full Name: ${f(data.applicantName)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Email: ${f(data.email)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Phone: ${f(data.phone)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Date of Birth: ${f(data.dateOfBirth)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Current Address: ${f(data.currentAddress)}`, font: "F1", size: 11, gapAfter: 5 });
  if (data.wechat) lines.push({ text: `WeChat: ${f(data.wechat)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });

  // Employment
  lines.push({ text: "Employment & Income", font: "F2", size: 14, gapAfter: 8 });
  lines.push({ text: `Employment Status: ${f(data.employmentStatus)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Employer / Income Source: ${f(data.employer)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Monthly Income: ${f(data.monthlyIncome)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });

  // Move-in & Occupancy
  lines.push({ text: "Move-in & Occupancy", font: "F2", size: 14, gapAfter: 8 });
  lines.push({ text: `Preferred Move-in Date: ${f(data.moveInDate)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Desired Lease Term: ${f(data.leaseTerm)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Total Occupants: ${f(data.occupants)}`, font: "F1", size: 11, gapAfter: 5 });
  if (data.adults || data.minors) {
    lines.push({ text: `Adults: ${f(data.adults)}   Minors: ${f(data.minors)}`, font: "F1", size: 11, gapAfter: 5 });
  }
  if (data.occupantNamesAges) {
    lines.push({ text: `Occupant Names & Ages: ${f(data.occupantNamesAges)}`, font: "F1", size: 11, gapAfter: 5 });
  }
  lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });

  // Reference & Credit
  lines.push({ text: "Landlord Reference & Credit", font: "F2", size: 14, gapAfter: 8 });
  // landlordReference can be multi-line — truncate for PDF safety
  const refText = toPdfSafeText(data.landlordReference || "--");
  const refPreview = refText.length > 220 ? refText.slice(0, 220) + "..." : refText;
  lines.push({ text: `Landlord Reference: ${refPreview}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Credit History (self-rated): ${f(data.creditHistory)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });

  // Pets & Vehicles
  lines.push({ text: "Pets & Vehicles", font: "F2", size: 14, gapAfter: 8 });
  lines.push({ text: `Has Pets: ${f(data.hasPets)}`, font: "F1", size: 11, gapAfter: 5 });
  if (data.petDetails) lines.push({ text: `Pet Details: ${f(data.petDetails)}`, font: "F1", size: 11, gapAfter: 5 });
  if (data.parkingRequest) lines.push({ text: `Parking / Vehicles: ${f(data.parkingRequest)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });

  // Insurance & Deposit
  lines.push({ text: "Insurance & Deposit", font: "F2", size: 14, gapAfter: 8 });
  lines.push({ text: `Tenant Insurance Status: ${f(data.hasTenantInsurance)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Deposit & First Month Funds Ready: ${f(data.depositFundsAvailable)}`, font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });

  // Reason for moving
  if (data.reasonForMoving) {
    lines.push({ text: "Reason for Moving", font: "F2", size: 14, gapAfter: 8 });
    lines.push({ text: f(data.reasonForMoving), font: "F1", size: 11, gapAfter: 5 });
    lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });
  }

  // Additional notes
  if (data.additionalNotes) {
    lines.push({ text: "Additional Notes", font: "F2", size: 14, gapAfter: 8 });
    const notesText = toPdfSafeText(data.additionalNotes);
    const notesPreview = notesText.length > 300 ? notesText.slice(0, 300) + "..." : notesText;
    lines.push({ text: notesPreview, font: "F1", size: 11, gapAfter: 5 });
    lines.push({ text: "", font: "F1", size: 6, gapAfter: 10 });
  }

  // Declaration footer
  lines.push({ text: "Declaration", font: "F2", size: 14, gapAfter: 8 });
  lines.push({ text: "The applicant confirmed that all information provided is true and complete.", font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: "The applicant authorized reference and tenancy screening checks.", font: "F1", size: 11, gapAfter: 5 });
  lines.push({ text: `Confirmation recorded: ${now}`, font: "F1", size: 11, gapAfter: 16 });

  lines.push({ text: "This is a system-generated copy of the submitted rental application.", font: "F1", size: 9, gapAfter: 4 });
  lines.push({ text: "This document does not guarantee tenancy approval.", font: "F1", size: 9, gapAfter: 0 });

  return lines;
}

export function buildSubmittedAppPdfBlob(data, recordId) {
  const pages = paginateBlocks(buildSubmittedAppBlocks(data, recordId));
  return buildPdfBlobFromPages(pages);
}

export function downloadSubmittedAppPdf(data, recordId, fileName) {
  const blob = buildSubmittedAppPdfBlob(data, recordId);
  const url  = URL.createObjectURL(blob);
  const safe = String(fileName || recordId || data.listingId || "application").replace(/[^a-zA-Z0-9_-]/g, "-");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safe}-application.pdf`;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Blank listing application form PDF ───────────────────────────────────────
export function buildRentalApplicationPdfBlob(listing, listingUrl) {
  const pages = paginateBlocks(buildFormBlocks(listing, listingUrl));
  return buildPdfBlobFromPages(pages);
}

export function downloadRentalApplicationPdf(listing, listingUrl) {
  const blob = buildRentalApplicationPdfBlob(listing, listingUrl);
  const blobUrl = URL.createObjectURL(blob);
  const safeId = String(listing?.id || "listing").replace(/[^a-zA-Z0-9_-]/g, "-");
  const anchor = document.createElement("a");

  anchor.href = blobUrl;
  anchor.download = `${safeId}-rental-application.pdf`;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
