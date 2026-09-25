// LOCAL TESTING ONLY. Serves the real Apps Script sources (Code.gs,
// HomeSaleStudioRead.gs, AdminAuth.gs) from an in-memory sandbox so the admin
// MFA flow can be exercised end-to-end in a browser with `netlify dev`.
// It never touches Google, the production spreadsheet or Script Properties.
//
//   node tests/localAdminHarness.mjs            (listens on 127.0.0.1:8787)
//   GET /__harness/totp          → current code, as the authenticator app shows it
//   GET /__harness/enroll-token  → a fresh 15-minute setup token
//   GET /__harness/advance?min=N → move the backend clock forward N minutes
import http from "node:http";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const { loadBackend, totpAt } = require("../apps-script/tests/_appsScriptMocks.cjs");

const PORT = Number(process.env.HARNESS_PORT || 8787);
const BRIDGE = process.env.ADMIN_BRIDGE_TOKEN || "local-harness-bridge-token-0123456789";
const PASSWORD = process.env.HARNESS_ADMIN_PASSWORD || "Local-Test-Password-1";

const env = loadBackend();
const { sandbox, clock, props } = env;
let offsetMs = 0;
const syncClock = () => { clock.now = Date.now() + offsetMs; };
syncClock();

props.set("ADMIN_AUTH_BRIDGE_TOKEN", BRIDGE);
sandbox.adminAuthStorePassword_(PASSWORD);
// Minimal data so admin pages render something after sign-in.
sandbox.getAllApplications_ = () => [];
sandbox.getListings_ = () => [];
sandbox.getAdminSettings_ = () => ({});

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "content-type": type, "access-control-allow-origin": "*" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

http.createServer((req, res) => {
  syncClock();
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/__harness/totp") {
    const secret = props.get("ADMIN_AUTH_TOTP_SECRET") || JSON.parse(props.get("ADMIN_AUTH_TOTP_PENDING") || "{}").secret;
    return send(res, 200, { code: secret ? totpAt(secret, clock.now) : null });
  }
  if (url.pathname === "/__harness/enroll-token") {
    const token = `local-setup-${Date.now()}-token`;
    props.set("ADMIN_AUTH_ENROLL_INPUT", token);
    sandbox.setupAdminMfa_3_ArmEnrollmentToken();
    return send(res, 200, { token });
  }
  if (url.pathname === "/__harness/advance") {
    offsetMs += Number(url.searchParams.get("min") || 0) * 60 * 1000;
    return send(res, 200, { offsetMinutes: offsetMs / 60000 });
  }
  if (url.pathname === "/__harness/state") {
    const sessions = Object.keys(Object.fromEntries(props)).filter((k) => k.startsWith("ADMIN_AUTH_SESS_")).length;
    const audit = (env.sheets["09 Admin Security Log"]?.rows || []).slice(-8);
    return send(res, 200, { sessions, enrolled: props.has("ADMIN_AUTH_TOTP_SECRET"), audit });
  }
  let raw = "";
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end", () => {
    try {
      const out = req.method === "POST"
        ? sandbox.doPost({ postData: { contents: raw } })
        : sandbox.doGet({ parameter: Object.fromEntries(url.searchParams) });
      send(res, 200, out.getContent());
    } catch (error) {
      send(res, 200, { error: error.message });
    }
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Local Apps Script harness on http://127.0.0.1:${PORT} (admin password: ${PASSWORD})`);
});
