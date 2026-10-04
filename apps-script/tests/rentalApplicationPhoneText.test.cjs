"use strict";

// Phone / Joint Phone must be stored as text (never parsed as a Sheets
// formula) and duplicate comparison must use one normalisation rule.
// In-memory only; the sheet mock emulates Sheets' "typed value" parsing.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
let failures = 0;
function check(condition, label) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) failures += 1;
}

// Emulates Sheets: appendRow and setValue on a General cell evaluate strings that
// start with "+", "-" or "=" as formulas ("#ERROR!" when invalid); a "@"-formatted cell keeps text.
function makeSheet(headers) {
  const rows = [headers.slice()];
  const textCols = new Set();
  const parse = (v, text) => (!text && typeof v === "string" && /^[=+\-]/.test(v) ? "#ERROR!" : v);
  return {
    rows,
    appendRow(values) { rows.push(values.map((v) => parse(v, false))); },
    getLastRow() { return rows.length; },
    getLastColumn() { return headers.length; },
    getRange(r, c) {
      return {
        setNumberFormat(f) { if (f === "@") textCols.add(`${r}:${c}`); return this; },
        setValue(v) { rows[r - 1][c - 1] = parse(v, textCols.has(`${r}:${c}`)); return this; },
        getValues() { return [[rows[r - 1][c - 1]]]; },
      };
    },
  };
}

const sandbox = { console, Utilities: {}, Logger: { log() {} } };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const variants = ["+1 (250) 555-0100", "1-250-555-0100", "250-555-0100", "(250) 555 0100", "1 250 555 0100"];
const expected = "2505550100";
variants.forEach((v) => check(sandbox.normalizeApplicantDuplicatePhone_(v) === expected, `normalizes "${v}" to ${expected}`));
check(sandbox.normalizeApplicantDuplicatePhone_("") === "", "empty phone normalizes to empty (duplicate check skipped)");
check(sandbox.normalizeApplicantDuplicatePhone_("+44 20 7946 0958") === "442079460958", "non-NANP number keeps all digits");
check(sandbox.normalizeApplicantDuplicatePhone_("12505550100") === sandbox.normalizeApplicantDuplicatePhone_("250-555-0100"), "stored and incoming values use the same rule");

const headers = ["Record ID", "Phone", "Joint Phone", "Joint Applicant Phone Number", "Employer"];
const headerMap = Object.fromEntries(headers.map((h, i) => [h, i]));
variants.forEach((v) => {
  const sheet = makeSheet(headers);
  sheet.appendRow(["APP-1", "", "", "", "=1+"]); // non-phone cells keep existing behaviour (not touched by this fix)
  sandbox.setApplicationCells_(sheet, 2, headerMap, { "Phone": v, "Joint Phone": v, "Joint Applicant Phone Number": v });
  check(sheet.rows[1][1] === v && sheet.rows[1][2] === v && sheet.rows[1][3] === v, `phone cells keep "${v}" as text, no #ERROR!`);
});
const control = makeSheet(headers);
control.appendRow(["APP-2", "+1 (250) 555-0100", "", "", ""]);
check(control.rows[1][1] === "#ERROR!", "control: the mock reproduces the original #ERROR! for a raw appendRow");

if (failures) process.exitCode = 1;
