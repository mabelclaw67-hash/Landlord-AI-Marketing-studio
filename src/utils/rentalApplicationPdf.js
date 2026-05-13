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
