// Builds the ONLY approved Apps Script rollback target for the Admin MFA
// launch: the pre-MFA production code (v177 = commit 37c7ddb) with every
// admin path hard-disabled. Public site, rental applications, Supporting
// Documents, Home Sale public pages and the Portal keep working; nobody can
// get Admin (fail-closed) until MFA is fixed forward.
//
// Rolling back to plain v177 is forbidden: it accepts the admin password as a
// bearer credential with no MFA and no rate limit.
//
//   node ops/buildRollbackPublicOnly.mjs <outDir>
// Then, only with Mabel's approval: clasp push from <outDir> → clasp version →
// clasp deploy -i <main deployment id> -V <that version>.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import process from "node:process";

const BASE = "37c7ddb";
const outDir = process.argv[2];
if (!outDir) throw new Error("Usage: node ops/buildRollbackPublicOnly.mjs <outDir>");
fs.mkdirSync(outDir, { recursive: true });

const files = execFileSync("git", ["ls-tree", "--name-only", `${BASE}:apps-script`], { encoding: "utf8" })
  .split("\n").filter((f) => f.endsWith(".gs") || f === "appsscript.json");

function replaceFunction(src, name, body) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}" && --depth === 0) return src.slice(0, start) + body + src.slice(i + 1);
  }
  throw new Error(`${name} not closed`);
}

const NOTE = "// ROLLBACK (public-only): admin access disabled until MFA is fixed forward.";
const patches = {
  "Code.gs": (src) => {
    src = replaceFunction(src, "resolveAccessContext_", `function resolveAccessContext_(payload, moduleName, options) {
  ${NOTE}
  options = options || {};
  if (options.allowNoAccess) return { mode: "public", module: moduleName || "" };
  throw new Error("Admin access required.");
}`);
    src = replaceFunction(src, "validateAdminAccessCode_", `function validateAdminAccessCode_(code) {
  ${NOTE}
  return { valid: false };
}`);
    return replaceFunction(src, "updateAdminAccessCode_", `function updateAdminAccessCode_(body, auth) {
  ${NOTE}
  throw new Error("Admin access required.");
}`);
  },
  "HomeSaleStudioRead.gs": (src) => replaceFunction(src, "homeSaleResolveAccess_", `function homeSaleResolveAccess_(payload, moduleName, allowPublic) {
  ${NOTE}
  if (allowPublic) return { mode: "public", module: moduleName || "" };
  throw new Error("Admin access required.");
}`),
};

for (const file of files) {
  let src = execFileSync("git", ["show", `${BASE}:apps-script/${file}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (patches[file]) src = patches[file](src);
  fs.writeFileSync(path.join(outDir, file), src);
}

// Self-check: the built bundle must never grant admin, and public actions stay public.
const CODE = "ROLLBACK-TEST-ADMIN-CODE";
const sheet = { getLastRow: () => 2, getLastColumn: () => 4, getRange: () => ({ getValues: () => [["admin_access_code", CODE, "", ""]] }) };
const sandbox = {
  console,
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => CODE, setProperty() {} }) },
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
  ContentService: { MimeType: { JSON: 1 }, createTextOutput: (v) => ({ v, setMimeType() { return this; }, getContent() { return this.v; } }) },
  Logger: { log() {} },
};
vm.createContext(sandbox);
for (const file of ["Code.gs", "HomeSaleStudioRead.gs"]) vm.runInContext(fs.readFileSync(path.join(outDir, file), "utf8"), sandbox);
const denied = (fn) => { try { fn(); return false; } catch (e) { return /Admin access required/.test(e.message); } };
const checks = [
  ["rental admin with the stored code is denied", denied(() => sandbox.resolveAccessContext_({ adminAccessCode: CODE }, "rental", {}))],
  ["rental public action stays public", sandbox.resolveAccessContext_({ adminAccessCode: CODE }, "rental", { allowNoAccess: true }).mode === "public"],
  ["validateAdminAccessCode always false", sandbox.validateAdminAccessCode_(CODE).valid === false],
  ["home sale admin with the stored code is denied", denied(() => sandbox.homeSaleResolveAccess_({ adminAccessCode: CODE }, "sale", false))],
  ["home sale public read stays public", sandbox.homeSaleResolveAccess_({}, "sale", true).mode === "public"],
  ["admin POST via doPost is denied", /Admin access required/.test(JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify({ action: "getAllApplications", adminAccessCode: CODE }) } }).getContent()).error || "")],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed++; }
const changed = execFileSync("bash", ["-c", `cd "${outDir}" && for f in *; do git -C "${process.cwd()}" show ${BASE}:apps-script/$f | cmp -s - "$f" || echo "$f"; done`], { encoding: "utf8" }).trim().split("\n");
console.log(`Built ${files.length} files from ${BASE} into ${outDir}; patched: ${changed.join(", ")}`);
if (failed || changed.join() !== "Code.gs,HomeSaleStudioRead.gs") process.exit(1);
