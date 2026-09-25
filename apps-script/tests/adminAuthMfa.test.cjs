"use strict";

// Admin MFA backend: password + TOTP login, lockouts, recovery codes,
// sessions (8 h / 30 min idle / revocation), upload tickets, and proof that no
// legacy "admin access code" path grants admin. In-memory mocks only — no
// production calls.

const fs = require("node:fs");
const path = require("node:path");
const { loadBackend, totpAt, makeChecker } = require("./_appsScriptMocks.cjs");

const { check, expectThrow, failures } = makeChecker();
const MIN = 60 * 1000;
const BRIDGE = "test-bridge-token-0123456789abcdefghijklmnop";
const PASSWORD = "Correct-Horse-Battery-9";
const OLD_CODE = "LEGACY-ADMIN-CODE-2468";

function setup() {
  const env = loadBackend();
  const { sandbox, props } = env;
  props.set("ADMIN_AUTH_BRIDGE_TOKEN", BRIDGE);
  sandbox.adminAuthStorePassword_(PASSWORD);
  const enrollmentToken = "Setup-Token-From-Password-Manager-01";
  props.set("ADMIN_AUTH_ENROLL_INPUT", enrollmentToken);
  sandbox.setupAdminMfa_3_ArmEnrollmentToken();
  const begin = sandbox.handleAdminAuthAction_({ action: "adminMfaEnrollBegin", adminBridgeToken: BRIDGE, clientKey: "ip-a", password: PASSWORD, enrollmentToken });
  const confirm = sandbox.handleAdminAuthAction_({
    action: "adminMfaEnrollConfirm", adminBridgeToken: BRIDGE, clientKey: "ip-a",
    password: PASSWORD, enrollmentToken, totp: totpAt(begin.secret, env.clock.now),
  });
  env.clock.advance(31 * 1000); // next time step so login codes are fresh
  return { ...env, secret: begin.secret, recoveryCodes: confirm.recoveryCodes, enrollmentToken, begin };
}

function login(env, overrides = {}) {
  return env.sandbox.handleAdminAuthAction_({
    action: "adminAuthLogin", adminBridgeToken: BRIDGE, clientKey: "ip-a",
    password: PASSWORD, totp: totpAt(env.secret, env.clock.now), ...overrides,
  });
}

function doPost(env, body) {
  return JSON.parse(env.sandbox.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).getContent());
}

// ── Setup functions never write a secret to the execution log ──
{
  const env = loadBackend();
  const { sandbox, props, logs } = env;
  props.set("ADMIN_AUTH_BRIDGE_TOKEN", BRIDGE);
  sandbox.setupAdminMfa_2_CheckGatewaySecret();
  props.set("ADMIN_AUTH_ENROLL_INPUT", "Setup-Token-From-Password-Manager-02");
  sandbox.setupAdminMfa_3_ArmEnrollmentToken();
  const logText = logs.join("\n");
  check(!logText.includes(BRIDGE) && !logText.includes("Setup-Token-From-Password-Manager-02"), "Gateway secret and setup token never appear in the log");
  check(!props.has("ADMIN_AUTH_ENROLL_INPUT") && !JSON.stringify([...props.values()]).includes("Setup-Token-From-Password-Manager-02"), "Setup token input is deleted; only its hash is kept");
  props.set("ADMIN_AUTH_BRIDGE_TOKEN", "short");
  let threw = false; try { sandbox.setupAdminMfa_2_CheckGatewaySecret(); } catch { threw = true; }
  check(threw, "A weak gateway secret is rejected");
}

// ── RFC 6238 compatibility (Apple Passwords / Google Authenticator / 1Password) ──
{
  const { sandbox } = loadBackend();
  const key = sandbox.adminAuthBase32Decode_("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  const vectors = [[59, "287082"], [1111111109, "081804"], [1111111111, "050471"], [1234567890, "005924"], [2000000000, "279037"]];
  check(vectors.every(([t, code]) => sandbox.adminAuthHotp_(key, Math.floor(t / 30), 6) === code), "TOTP matches RFC 6238 SHA-1 test vectors");
  const bytes = [1, 2, 3, 250, 128, 127, 0, 255, 64, 33];
  check(JSON.stringify(sandbox.adminAuthBase32Decode_(sandbox.adminAuthBase32Encode_(bytes)).map((b) => b & 0xff)) === JSON.stringify(bytes), "Base32 round-trips");
}

// ── Enrollment ──
{
  const env = loadBackend();
  env.props.set("ADMIN_AUTH_BRIDGE_TOKEN", BRIDGE);
  env.sandbox.adminAuthStorePassword_(PASSWORD);
  expectThrow(() => env.sandbox.handleAdminAuthAction_({ action: "adminMfaEnrollBegin", adminBridgeToken: BRIDGE, clientKey: "x", password: PASSWORD, enrollmentToken: "guess" }),
    /INVALID_CREDENTIALS/, "Enrollment without an editor-issued setup token is refused");
  expectThrow(() => env.sandbox.handleAdminAuthAction_({ action: "adminAuthLogin", adminBridgeToken: BRIDGE, clientKey: "y", password: PASSWORD, totp: "123456" }),
    /MFA_NOT_ENROLLED/, "Password alone never signs in before MFA is enrolled");
}
{
  const env = setup();
  check(/^[A-Z2-7]{32}$/.test(env.secret), "Enrollment issues a 160-bit Base32 TOTP secret");
  check(env.begin.otpauthUri.startsWith("otpauth://totp/") && env.begin.otpauthUri.includes("issuer="), "Enrollment returns a standard otpauth:// URI");
  check(env.recoveryCodes.length === 10 && env.recoveryCodes.every((c) => /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c)), "Enrollment returns 10 recovery codes");
  check(!JSON.stringify([...env.props.values()]).includes(env.recoveryCodes[0].replace(/-/g, "")), "Recovery codes are stored only as hashes");
  check(!env.props.has("ADMIN_AUTH_ENROLL_TOKEN") && !env.props.has("ADMIN_AUTH_TOTP_PENDING"), "Setup token and pending secret are consumed");
  expectThrow(() => env.sandbox.handleAdminAuthAction_({ action: "adminMfaEnrollBegin", adminBridgeToken: BRIDGE, clientKey: "ip-z", password: PASSWORD, enrollmentToken: env.enrollmentToken }),
    /INVALID_CREDENTIALS/, "A used setup token cannot re-pair a new device");
}

// ── Login ──
{
  const env = setup();
  expectThrow(() => env.sandbox.handleAdminAuthAction_({ action: "adminAuthLogin", clientKey: "ip-a", password: PASSWORD, totp: totpAt(env.secret, env.clock.now) }),
    /gateway authorization failed/, "Login without the gateway secret is refused (direct Apps Script call)");
  expectThrow(() => login(env, { password: "wrong-password" }), /INVALID_CREDENTIALS/, "Wrong password is refused");
  expectThrow(() => login(env, { totp: "000000" === totpAt(env.secret, env.clock.now) ? "111111" : "000000" }), /INVALID_CREDENTIALS/, "Correct password + wrong code is refused");
  expectThrow(() => login(env, { totp: "" }), /INVALID_CREDENTIALS/, "Correct password + no code is refused");

  const session = login(env);
  check(typeof session.sessionToken === "string" && session.sessionToken.length >= 40, "Password + valid TOTP returns a session token");
  check(session.idleTimeoutSec === 1800 && session.maxAgeSec === 28800, "Session policy is 30 min idle / 8 h max");
  expectThrow(() => login(env), /INVALID_CREDENTIALS/, "The same TOTP code cannot be replayed");
  env.clock.advance(30 * 1000);
  check(login(env).sessionToken, "The next time-step code works");

  const audit = JSON.stringify(env.sheets["09 Admin Security Log"].rows);
  check(audit.includes("success") && audit.includes("failed"), "Sign-in successes and failures are audited");
  check(!audit.includes(PASSWORD) && !audit.includes(session.sessionToken) && !audit.includes(env.secret), "Audit log never contains password, session token or TOTP secret");
  check(!JSON.stringify([...env.props.values()]).includes(PASSWORD), "Password is not stored in plaintext");
  check(!JSON.stringify([...env.props.keys()]).includes(session.sessionToken), "Session tokens are stored only as hashes");
}

// ── Brute-force limits ──
{
  const env = setup();
  for (let i = 0; i < 5; i++) {
    try { login(env, { clientKey: "attacker", password: "guess-" + i }); } catch { /* expected */ }
  }
  expectThrow(() => login(env, { clientKey: "attacker" }), /LOCKED/, "5 failures lock that client even with correct credentials");
  check(login(env, { clientKey: "mabel-phone" }).sessionToken, "Other clients are unaffected by one client's lockout");
  env.clock.advance(16 * MIN);
  check(login(env, { clientKey: "attacker" }).sessionToken, "Client lockout expires after 15 minutes");

  for (let i = 0; i < 20; i++) {
    try { login(env, { clientKey: "bot-" + i, password: "guess" }); } catch { /* expected */ }
  }
  expectThrow(() => login(env, { clientKey: "mabel-laptop" }), /LOCKED/, "20 failures across clients trigger a global lock");
  env.sandbox.adminSecurity_ClearLoginLockouts();
  env.clock.advance(31 * 1000);
  check(login(env, { clientKey: "mabel-laptop" }).sessionToken, "Mabel can clear the global lock from the Apps Script editor");
}

// ── Recovery codes ──
{
  const env = setup();
  const code = env.recoveryCodes[3];
  const first = login(env, { totp: undefined, recoveryCode: code.toLowerCase() });
  check(first.sessionToken && first.usedRecoveryCode && first.recoveryCodesRemaining === 9, "A recovery code signs in once and is consumed");
  expectThrow(() => login(env, { totp: undefined, recoveryCode: code }), /INVALID_CREDENTIALS/, "A used recovery code is rejected");
  expectThrow(() => login(env, { password: "wrong", totp: undefined, recoveryCode: env.recoveryCodes[4] }), /INVALID_CREDENTIALS/, "Recovery code with wrong password is rejected");
  check(login(env, { totp: undefined, recoveryCode: env.recoveryCodes[4] }).recoveryCodesRemaining === 8, "Wrong-password attempt did not burn the recovery code");

  const token = login(env).sessionToken;
  env.clock.advance(31 * 1000);
  const regenerated = env.sandbox.handleAdminAuthAction_({ action: "adminRecoveryCodesRegenerate", adminBridgeToken: BRIDGE, clientKey: "ip-a", adminSessionToken: token, totp: totpAt(env.secret, env.clock.now) });
  check(regenerated.recoveryCodes.length === 10, "Regenerating issues 10 new codes (TOTP required)");
  expectThrow(() => login(env, { totp: undefined, recoveryCode: env.recoveryCodes[5] }), /INVALID_CREDENTIALS/, "Old recovery codes stop working after regeneration");
}

// ── Sessions: admin access, idle, absolute, revocation ──
{
  const env = setup();
  const { sandbox } = env;
  const token = login(env).sessionToken;
  check(sandbox.resolveAccessContext_({ adminSessionToken: token, adminBridgeToken: BRIDGE }, "rental", {}).mode === "admin", "Gateway-signed live session resolves as Admin");
  check(sandbox.homeSaleResolveAccess_({ adminSessionToken: token, adminBridgeToken: BRIDGE }, "sale", false).mode === "admin", "Home Sale resolver accepts the same session");
  expectThrow(() => sandbox.resolveAccessContext_({ adminSessionToken: token }, "rental", {}), /Admin access required/, "A stolen session token without the gateway secret is useless against Apps Script");
  const payload = { adminSessionToken: token, adminBridgeToken: BRIDGE, data: 1 };
  sandbox.resolveAccessContext_(payload, "rental", {});
  check(!("adminSessionToken" in payload) && !("adminBridgeToken" in payload), "Credential fields are stripped before business handlers run");

  env.clock.advance(20 * MIN);
  check(sandbox.adminAuthValidateSession_(token, true), "Session survives 20 min and activity refreshes it");
  env.clock.advance(20 * MIN);
  check(sandbox.adminAuthValidateSession_(token, true), "Active session is still valid 40 min after login");
  env.clock.advance(31 * MIN);
  check(!sandbox.adminAuthValidateSession_(token, true), "Session ends after 30 minutes idle");
  expectThrow(() => sandbox.resolveAccessContext_({ adminSessionToken: token, adminBridgeToken: BRIDGE, action: "getAllApplications" }, "rental", {}),
    /^ADMIN_AUTH_SESSION_INVALID$/, "An expired session is reported explicitly (gateway clears the cookie only on this)");

  env.clock.advance(31 * 1000);
  const longToken = login(env).sessionToken;
  let alive = true;
  for (let elapsed = 0; elapsed < 8 * 60 * MIN - 25 * MIN; elapsed += 25 * MIN) {
    env.clock.advance(25 * MIN);
    alive = alive && !!sandbox.adminAuthValidateSession_(longToken, true);
  }
  check(alive, "Continuously used session stays valid up to 8 h");
  env.clock.advance(26 * MIN);
  check(!sandbox.adminAuthValidateSession_(longToken, true), "Session ends at 8 h even with constant activity");
}
{
  const env = setup();
  const laptop = login(env, { clientKey: "laptop" }).sessionToken;
  env.clock.advance(31 * 1000);
  const phone = login(env, { clientKey: "phone" }).sessionToken;
  const result = env.sandbox.handleAdminAuthAction_({ action: "adminAuthLogoutAll", adminBridgeToken: BRIDGE, clientKey: "laptop", adminSessionToken: laptop });
  check(result.revokedSessions === 2, "Sign out everywhere revokes every session");
  check(!env.sandbox.adminAuthValidateSession_(laptop) && !env.sandbox.adminAuthValidateSession_(phone), "Revoked sessions no longer authenticate");

  env.clock.advance(31 * 1000);
  const again = login(env).sessionToken;
  env.sandbox.handleAdminAuthAction_({ action: "adminAuthLogout", adminBridgeToken: BRIDGE, clientKey: "ip-a", adminSessionToken: again });
  check(!env.sandbox.adminAuthValidateSession_(again), "Single logout ends that session");

  env.clock.advance(31 * 1000);
  const killed = login(env).sessionToken;
  env.sandbox.adminSecurity_RevokeAllSessions();
  check(!env.sandbox.adminAuthValidateSession_(killed), "Editor kill switch revokes all sessions");
}

// ── Password change ──
{
  const env = setup();
  const token = login(env).sessionToken;
  expectThrow(() => env.sandbox.handleAdminAuthAction_({ action: "adminChangePassword", adminBridgeToken: BRIDGE, clientKey: "ip-a", adminSessionToken: token, currentPassword: PASSWORD, newPassword: "New-Password-2026!", confirmPassword: "New-Password-2026!", totp: "" }),
    /INVALID_CREDENTIALS/, "Password change requires a fresh TOTP code");
  env.clock.advance(31 * 1000);
  const changed = env.sandbox.handleAdminAuthAction_({ action: "adminChangePassword", adminBridgeToken: BRIDGE, clientKey: "ip-a", adminSessionToken: token, currentPassword: PASSWORD, newPassword: "New-Password-2026!", confirmPassword: "New-Password-2026!", totp: totpAt(env.secret, env.clock.now) });
  check(changed.signedOut && !env.sandbox.adminAuthValidateSession_(token), "Password change signs out every session");
  env.clock.advance(31 * 1000);
  expectThrow(() => login(env), /INVALID_CREDENTIALS/, "Old password stops working");
  check(login(env, { password: "New-Password-2026!" }).sessionToken, "New password + TOTP works");
}

// ── No legacy bypass ──
{
  const env = setup();
  const { sandbox, props } = env;
  props.set("ADMIN_ACCESS_CODE", OLD_CODE);
  props.set("HOME_SALE_ADMIN_ACCESS_CODE", OLD_CODE);
  sandbox.getSystemSetting_ = (key) => (key === "admin_access_code" ? OLD_CODE : null);

  expectThrow(() => sandbox.resolveAccessContext_({ adminAccessCode: OLD_CODE }, "rental", {}), /Admin access required/, "Rental resolver rejects the old access code");
  expectThrow(() => sandbox.homeSaleResolveAccess_({ adminAccessCode: OLD_CODE }, "sale", false), /Admin access required/, "Home Sale resolver rejects the old access code");
  check(sandbox.resolveAccessContext_({ adminAccessCode: OLD_CODE }, "rental", { allowNoAccess: true }).mode === "public", "Old code on a public action only yields public mode");
  check(/two-step verification/.test(doPost(env, { action: "validateAdminAccessCode", code: OLD_CODE }).error || ""), "validateAdminAccessCode endpoint is retired");
  check(/two-step verification/.test(doPost(env, { action: "updateAdminAccessCode", adminAccessCode: OLD_CODE, newCode: "x".repeat(12), confirmCode: "x".repeat(12) }).error || ""), "updateAdminAccessCode endpoint is retired");
  check(/Admin access required/.test(doPost(env, { action: "getAllApplications", adminAccessCode: OLD_CODE }).error || ""), "Admin POST with old code is denied");
  check(/Admin access required/.test(doPost(env, { action: "getBuyerInquiries", adminAccessCode: OLD_CODE }).error || ""), "Home Sale admin POST with old code is denied");
  const getResult = JSON.parse(sandbox.doGet({ parameter: { action: "getApplicationById", applicationId: "APP-1", adminAccessCode: OLD_CODE } }).getContent());
  check(/Admin access required/.test(getResult.error || ""), "Admin GET with old code is denied");
  check(/Admin access required/.test(doPost(env, { action: "getAllApplications", adminProxyGet: true, adminAccessCode: OLD_CODE }).error || "") ||
    /Unknown GET action/.test(doPost(env, { action: "getAllApplications", adminProxyGet: true }).error || ""), "Proxy-GET shim grants nothing without a session");
  expectThrow(() => sandbox.handleAdminAuthAction_({ action: "adminAuthLogin", adminBridgeToken: BRIDGE, clientKey: "legacy", password: OLD_CODE, totp: totpAt(env.secret, env.clock.now) }),
    /INVALID_CREDENTIALS/, "Old code is not accepted as the MFA password either (hash is authoritative)");

  const sources = ["Code.gs", "HomeSaleStudioRead.gs", "AdminAuth.gs"].map((f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8")).join("\n");
  check(!/adminAccessCode\s*===|===\s*expectedAdminCode|getAdminAccessCode_\s*\(/.test(sources), "No source compares a request against a stored admin code");
}

// ── Migration: hash, then erase every plaintext copy in one run ──
{
  const env = loadBackend();
  const { sandbox, props } = env;
  const settings = { admin_access_code: OLD_CODE };
  sandbox.getSystemSetting_ = (key) => settings[key] || null;
  sandbox.setSystemSetting_ = (key, value) => { settings[key] = value; };
  props.set("ADMIN_ACCESS_CODE", OLD_CODE);
  props.set("HOME_SALE_ADMIN_ACCESS_CODE", OLD_CODE);
  sandbox.setupAdminMfa_1_HashAndErasePassword();
  check(sandbox.adminAuthVerifyPassword_(OLD_CODE), "Migration keeps the current code as the password (hashed)");
  check(settings.admin_access_code === "" && !props.has("ADMIN_ACCESS_CODE") && !props.has("HOME_SALE_ADMIN_ACCESS_CODE"), "Migration erases every plaintext copy immediately (closes v177 / Home Sale v29 password paths)");
  check(!JSON.stringify([...props.values()]).includes(OLD_CODE), "No plaintext code remains in Script Properties");
  sandbox.setupAdminMfa_1_HashAndErasePassword();
  check(sandbox.adminAuthVerifyPassword_(OLD_CODE), "Re-running is harmless (hash kept, nothing to erase)");
}

// ── Lost responses (Apps Script echo-redirect 404) never lock Mabel out ──
{
  const env = setup();
  const code = totpAt(env.secret, env.clock.now);
  const first = login(env, { totp: code, requestId: "req-aaaaaaaaaaaaaaaa" });
  const replay = login(env, { totp: code, requestId: "req-aaaaaaaaaaaaaaaa" });
  check(replay.sessionToken === first.sessionToken, "Retry after a lost response replays the same session (code not treated as replay)");
  expectThrow(() => login(env, { totp: code, requestId: "req-bbbbbbbbbbbbbbbb" }), /INVALID_CREDENTIALS/, "A different request with the used code is still refused");
  expectThrow(() => login(env, { totp: code, password: "other", requestId: "req-aaaaaaaaaaaaaaaa" }), /INVALID_CREDENTIALS/, "Same requestId with different credentials gets no replay");
  env.clock.advance(31 * 1000);
  for (let i = 0; i < 4; i++) {
    try { login(env, { clientKey: "slow-net", password: "typo", requestId: "req-typo-000000000" }); } catch { /* expected */ }
  }
  check(login(env, { clientKey: "slow-net" }).sessionToken, "Retries of one failed attempt count once, not toward lockout");
  const b1 = env.sandbox.handleAdminAuthAction_({ action: "adminAuthStatus", adminBridgeToken: BRIDGE, adminSessionToken: first.sessionToken });
  check(b1.mfaEnrolled, "Read-only auth actions are unaffected");
}

// ── A re-send that arrives while the first login is still running never runs twice ──
{
  const env = setup();
  const { sandbox } = env;
  const code = totpAt(env.secret, env.clock.now);
  const body = { action: "adminAuthLogin", adminBridgeToken: BRIDGE, clientKey: "ip-a", password: PASSWORD, totp: code, requestId: "req-concurrent-000001" };
  const realDispatch = sandbox.adminAuthDispatch_;
  let dispatches = 0, concurrent = null;
  sandbox.adminAuthDispatch_ = (b, c) => {
    dispatches++;
    if (dispatches === 1) { // simulate the gateway's re-send landing mid-execution
      try { sandbox.handleAdminAuthAction_({ ...body }); concurrent = "ran"; } catch (e) { concurrent = e.message; }
    }
    return realDispatch(b, c);
  };
  const first = sandbox.handleAdminAuthAction_({ ...body });
  sandbox.adminAuthDispatch_ = realDispatch;
  check(dispatches === 1 && concurrent === "ADMIN_AUTH_BUSY", "Concurrent re-send waits, then reports BUSY — the login is not executed a second time");
  const later = sandbox.handleAdminAuthAction_({ ...body });
  check(first.sessionToken && later.sessionToken === first.sessionToken, "After the first run finishes, the same requestId replays its session");
  expectThrow(() => sandbox.handleAdminAuthAction_({ ...body, requestId: "req-concurrent-000002" }), /INVALID_CREDENTIALS/, "The code was consumed exactly once");
}

// ── Public Supporting Documents uploads pass through the new doPost entry unchanged ──
{
  const env = setup();
  const { sandbox, props } = env;
  props.set("PUBLIC_UPLOAD_BRIDGE_TOKEN", "public-upload-bridge-token-for-tests-000000");
  let seen = null;
  sandbox.uploadPublicSupportingDocument_ = (data) => { seen = data; return { stored: true }; };
  const bigBase64 = "QUJD".repeat(1_500_000); // ~6 MB of base64, like a real document
  const body = { action: "uploadPublicSupportingDocument", publicUploadBridgeToken: "public-upload-bridge-token-for-tests-000000", data: { fileName: "id.pdf", data: bigBase64 } };
  const res = doPost(env, body);
  const direct = JSON.parse(sandbox.rentalDoPost_({ postData: { contents: JSON.stringify(body) } }).getContent());
  check(JSON.stringify(res) === JSON.stringify(direct), "Upload response via new doPost entry is identical to the pre-MFA router path");
  check(!/adminTicket|Admin access/.test(JSON.stringify(res)), "Upload is not treated as an admin/ticket request");
  const bad = doPost(env, { ...body, publicUploadBridgeToken: "wrong" });
  check(/Upload authorization failed/.test(bad.error || ""), "Upload bridge token is still enforced");
  const sneaky = doPost(env, { ...body, data: { fileName: '"adminTicket" in a name.pdf', data: "QUJD" } });
  check(JSON.stringify(sneaky) === JSON.stringify(JSON.parse(sandbox.rentalDoPost_({ postData: { contents: JSON.stringify({ ...body, data: { fileName: '"adminTicket" in a name.pdf', data: "QUJD" } }) } }).getContent())), "A file named like the ticket field is not mistaken for a ticket");
}

// ── Upload tickets (payloads over Netlify's 6 MB limit) ──
{
  const env = setup();
  const { sandbox } = env;
  sandbox.uploadToSubfolder_ = (body, auth) => ({ uploaded: true, mode: auth.mode });
  const token = login(env).sessionToken;
  const payloadText = JSON.stringify({ action: "getAllApplications", filler: "x".repeat(1000) });
  const hash = sandbox.adminAuthSha256Hex_(payloadText);
  const mint = (target, h) => sandbox.handleAdminAuthAction_({ action: "adminAuthMintTicket", adminBridgeToken: BRIDGE, clientKey: "ip-a", adminSessionToken: token, targetAction: target, payloadHash: h }).ticket;
  sandbox.getAllApplications_ = (auth) => ({ ok: true, mode: auth.mode });

  const ticket = mint("getAllApplications", hash);
  const used = doPost(env, { adminTicket: ticket, adminTicketPayload: payloadText });
  check(used.data && used.data.mode === "admin", "Ticket authorises exactly one matching upload as Admin");
  check(/expired/.test(doPost(env, { adminTicket: ticket, adminTicketPayload: payloadText }).error || ""), "A ticket cannot be reused");

  const t2 = mint("getAllApplications", hash);
  check(/failed/.test(doPost(env, { adminTicket: t2, adminTicketPayload: payloadText.replace("xxx", "yyy") }).error || ""), "Ticket is bound to the exact payload");
  const t3 = mint("saveListing", hash);
  check(/failed/.test(doPost(env, { adminTicket: t3, adminTicketPayload: payloadText }).error || ""), "Ticket is bound to one action");
  expectThrow(() => mint("adminAuthLogoutAll", hash), /Invalid ticket action/, "Tickets cannot target auth actions");

  const t4 = mint("getAllApplications", hash);
  env.clock.advance(3 * MIN);
  check(/expired/.test(doPost(env, { adminTicket: t4, adminTicketPayload: payloadText }).error || ""), "Tickets expire after 2 minutes");
  const t5 = mint("getAllApplications", hash);
  sandbox.adminSecurity_RevokeAllSessions();
  check(/failed/.test(doPost(env, { adminTicket: t5, adminTicketPayload: payloadText }).error || ""), "Revoking sessions voids outstanding tickets");
}

// ── Gateway GET relay ──
{
  const env = setup();
  env.sandbox.getApplicationById_ = (id, auth) => ({ id, mode: auth.mode });
  const token = login(env).sessionToken;
  const relayed = doPost(env, { action: "getApplicationById", applicationId: "APP-9", adminProxyGet: true, adminSessionToken: token, adminBridgeToken: BRIDGE });
  check(relayed.data && relayed.data.mode === "admin" && relayed.data.id === "APP-9", "Gateway relays admin GET reads as POST (token never in a URL)");
}

if (failures()) {
  console.log(`\n${failures()} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll Admin MFA backend checks passed.");
