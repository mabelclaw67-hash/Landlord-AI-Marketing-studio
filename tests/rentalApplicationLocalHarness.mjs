// LOCAL browser regression only. Real Code.gs and React form, fake Sheets,
// Drive/PDF and captured email. Does not contact Google or production.
// Start: node tests/rentalApplicationLocalHarness.mjs
// Then: VITE_STUDIO_EXEC_URL=http://127.0.0.1:8788/exec npm run dev -- --host 127.0.0.1 --port 5175
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { makeSandbox, intakeHeaders } = require("../apps-script/tests/duplicateRentalApplication.test.cjs");
const port = 8788;
const env = makeSandbox({
  "Record ID": "APP-SYNTHETIC-SEED",
  "Listing ID": "LST-TEST-001",
  "Applicant Name": "TEST SEED",
  "Review Status": "Pending",
});
const listing = {
  id: "LST-TEST-001", listingId: "LST-TEST-001", address: "TEST ONLY 123 Main St",
  status: "Published", workflowStatus: "Published", availabilityStatus: "Available",
  listingType: "Rental", city: "TEST City", rent: 1000,
};
env.getListings_ = () => [listing];
env.findListingById_ = () => listing;
const requests = [];
let delayNextWriteMs = 0;
let originalRow = null;
const idx = (header) => intakeHeaders.indexOf(header);
const normalized = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
const send = (res, body, status = 200) => {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "http://127.0.0.1:5175" });
  res.end(JSON.stringify(body));
};

function sheetTypes() {
  for (const row of env.__rows.slice(1)) {
    for (const header of ["Date of Birth", "Move-in Date", "Joint DOB"]) {
      if (typeof row[idx(header)] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row[idx(header)])) row[idx(header)] = new Date(row[idx(header)] + "T00:00:00.000Z");
    }
    for (const header of ["Monthly Income", "Occupants", "Adults", "Minors", "Joint Income"]) {
      if (row[idx(header)] !== "" && row[idx(header)] != null) row[idx(header)] = Number(row[idx(header)]);
    }
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === "/__test/next-write-delay") {
    delayNextWriteMs = Number(url.searchParams.get("ms") || 19000);
    return send(res, { delayNextWriteMs });
  }
  if (url.pathname === "/__test/state") {
    const rows = env.__rows.slice(1).filter((row) => row[idx("Record ID")] !== "APP-SYNTHETIC-SEED");
    let unchangedDifferences = [];
    if (originalRow && rows[0]) unchangedDifferences = intakeHeaders.filter((header) => !["PDF URL", "Updated At", "Application Download Token", "Application Download Expires At"].includes(header)).filter((header) => normalized(originalRow[idx(header)]) !== normalized(rows[0][idx(header)]));
    return send(res, {
      rows: rows.map((row) => Object.fromEntries(intakeHeaders.filter((h) => !/Token|URL|Link|Internal/.test(h)).map((header) => [header, row[idx(header)]]))),
      originalRecordId: originalRow?.[idx("Record ID")], unchangedDifferences,
      requests, emailSubjects: env.__sentEmails.map((mail) => mail.subject),
    });
  }
  if (url.pathname === "/__test/latest-resume-email") {
    const mail = env.__sentEmails.filter((mail) => mail.subject === "Continue Your Rental Application").at(-1);
    return send(res, mail ? { to: mail.to, subject: mail.subject, body: mail.body } : { error: "No resume email generated yet" });
  }
  if (url.pathname !== "/exec") return send(res, { error: "Local test route not found" }, 404);
  let raw = "";
  req.on("data", (part) => { raw += part; });
  req.on("end", () => {
    let body;
    try {
      body = raw ? JSON.parse(raw) : Object.fromEntries(url.searchParams);
      requests.push({ action: body.action, at: new Date().toISOString() });
      let data;
      if (body.action === "getListingById") data = listing;
      else if (body.action === "getListings") data = [listing];
      else if (body.action === "saveRentalApplication") {
        data = env.saveRentalApplication_(body.data);
        sheetTypes();
        if (data.recordId && !data.duplicate) originalRow = env.__rows.at(-1).slice();
      } else if (body.action === "getRentalApplicationResume") {
        data = env.getRentalApplicationResume_(body.listingId, body.recordId, body.token);
      } else if (body.action === "updateRentalApplication") {
        data = env.updateRentalApplication_(body.listingId, body.recordId, body.token, body.data);
        sheetTypes();
      } else throw new Error("Unsupported local test action");
      const isWrite = ["saveRentalApplication", "updateRentalApplication"].includes(body.action);
      const delay = isWrite ? delayNextWriteMs : 0;
      if (isWrite) delayNextWriteMs = 0;
      if (delay) setTimeout(() => send(res, { data }), delay);
      else send(res, { data });
    } catch (error) {
      send(res, { error: error.message });
    }
  });
}).listen(port, "127.0.0.1", () => console.log(`Synthetic local rental test backend: http://127.0.0.1:${port}`));
