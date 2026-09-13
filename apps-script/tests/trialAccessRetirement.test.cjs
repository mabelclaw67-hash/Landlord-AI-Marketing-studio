"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const code = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
const homeSale = fs.readFileSync(path.join(__dirname, "..", "HomeSaleStudioRead.gs"), "utf8");
const trialAccess = fs.readFileSync(path.join(__dirname, "..", "..", "src", "utils", "trialAccess.js"), "utf8");
const appSource = fs.readFileSync(path.join(__dirname, "..", "..", "src", "App.jsx"), "utf8");
const adminGuard = fs.readFileSync(path.join(__dirname, "..", "..", "src", "components", "AdminGuard.jsx"), "utf8");

function makeSandbox() {
  const sent = [];
  const systemRows = [
    ["Key", "Value", "Updated At", "Updated By"],
    ["admin_access_code", "ADMIN-TEST-CODE", "", "test"],
  ];
  const systemSheet = {
    getLastRow: () => systemRows.length,
    getLastColumn: () => systemRows[0].length,
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => systemRows.slice(row - 1, row - 1 + rowCount)
        .map((source) => source.slice(column - 1, column - 1 + columnCount)),
    }),
  };
  const sandbox = {
    console,
    GmailApp: {
      getAliases: () => ["support@vanislandproperty.ca"],
      sendEmail: (...args) => sent.push(args),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => key === "ADMIN_ACCESS_CODE" ? "ADMIN-TEST-CODE" : null,
        setProperty() {},
      }),
    },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => systemSheet }),
      flush() {},
    },
    Logger: { log() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "Code.gs" });
  vm.runInContext(homeSale, sandbox, { filename: "HomeSaleStudioRead.gs" });
  sandbox.__sent = sent;
  return sandbox;
}

let failures = 0;
function check(condition, label) {
  try {
    assert.equal(Boolean(condition), true);
    console.log(`PASS ${label}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}: ${error.message}`);
  }
}

// Static guardrails: external Trial auth and the retired approval endpoints
// must not be present in the deployed source path.
check(!code.includes("allowTrial"), "Rental resolver has no Trial authorization option");
check(!code.includes('mode: "trial"'), "Rental backend cannot create Trial auth context");
check(!code.includes("validateAccessCode_"), "Rental backend has no Trial access-code validator");
check(!homeSale.includes("homeSaleValidateTrialAccess_"), "Home Sale backend has no Trial validator");
check(!homeSale.includes('mode: "trial"'), "Home Sale backend cannot create Trial auth context");
check(!trialAccess.includes("vanisland_trial_access_v1"), "Browser Trial session key is no longer used");
check(!trialAccess.includes("payload.accessEmail"), "Shared studio auth helper no longer emits Trial email credentials");
check(!trialAccess.includes("payload.accessCode"), "Shared studio auth helper no longer emits Trial access credentials");
check(!appSource.includes("trial-access"), "Public Trial login route is removed");
check(!appSource.includes("trial-requests"), "Admin Trial Requests route is removed");
check(!adminGuard.includes("readTrialAccess"), "AdminGuard does not accept browser Trial sessions");
check(!adminGuard.includes("canAccessModule"), "AdminGuard has no module-based Trial authorization");

const saveReportSource = code.slice(code.indexOf("function saveApplicantReportPdf_"), code.indexOf("function sanitizeApplicantReportFileName_"));
check(saveReportSource.includes("assertAdmin_(auth);"), "Applicant report save remains Admin-only");
check(!saveReportSource.includes("mode === \"trial\""), "Applicant report save has no Trial branch");

const contactSource = code.slice(code.indexOf("function saveContact_"), code.indexOf("function normalizeEmail_"));
check(contactSource.includes('"Contact Inquiry"'), "New Contact Us rows use a neutral inquiry status");
check(contactSource.includes('"support@vanislandproperty.ca"'), "Contact Us uses the existing support destination");
check(contactSource.includes('"New Contact Us Inquiry - Vanisland Property"'), "Contact Us uses ordinary company email subject");
check(!contactSource.includes("generateAccessCode_"), "Contact Us cannot generate an access code");

// Runtime resolver checks use only in-memory mocks and no production calls.
const sandbox = makeSandbox();
let error = null;
try {
  sandbox.resolveAccessContext_({ accessEmail: "old@example.com", accessCode: "OLD-TRIAL" }, "rental", {});
} catch (caught) {
  error = caught;
}
check(error && error.message === "Admin access required.", "Old Rental Trial credentials fail closed");
check(sandbox.resolveAccessContext_({ adminAccessCode: "ADMIN-TEST-CODE" }, "rental", {}).mode === "admin", "Existing Rental Admin credential still resolves");
check(sandbox.resolveAccessContext_({}, "rental", { allowNoAccess: true }).mode === "public", "Explicit Rental public action remains public");

error = null;
try {
  sandbox.homeSaleResolveAccess_({ accessEmail: "old@example.com", accessCode: "OLD-TRIAL" }, "sale", false);
} catch (caught) {
  error = caught;
}
check(error && error.message === "Admin access required.", "Old Home Sale Trial credentials fail closed");
check(sandbox.homeSaleResolveAccess_({ adminAccessCode: "ADMIN-TEST-CODE" }, "sale", false).mode === "admin", "Existing Home Sale Admin credential still resolves");

// Verify sender identity is fixed while legal Gmail options remain pass-through.
sandbox.sendCompanyEmail_("support@vanislandproperty.ca", "subject", "body", {
  from: "attacker@example.com",
  replyTo: "attacker@example.com",
  name: "Attacker",
  attachments: ["test-attachment"],
});
const options = sandbox.__sent[0][3];
check(options.from === "support@vanislandproperty.ca", "Company sender cannot be overridden");
check(options.replyTo === "support@vanislandproperty.ca", "Company reply-to cannot be overridden");
check(options.name === "Vanisland Property Management", "Company sender name cannot be overridden");
check(options.attachments[0] === "test-attachment", "Legal Gmail attachment option remains supported");

process.exitCode = failures ? 1 : 0;
