// ============================================================
// Admin Studio authentication — password + TOTP (RFC 6238) MFA
// ============================================================
//
// Trust model
// -----------
// The browser never talks to this module directly. The Netlify functions
// `admin-auth` and `admin-api` hold the admin session in an HttpOnly,
// Secure, SameSite=Strict cookie and call Apps Script server-to-server with
// ADMIN_AUTH_BRIDGE_TOKEN. Every admin-auth action and every session-backed
// admin request therefore requires BOTH:
//   1. the gateway secret (proves the call came from our Netlify function), and
//   2. a live session token (proves a person passed password + TOTP).
//
// The single exception is a one-time "ticket" used for uploads larger than
// Netlify's 6 MB request limit: the gateway mints it for a live session, it is
// bound to one action + the SHA-256 of one exact payload, lives 2 minutes, and
// is consumed on first use (see adminAuthPrepareRequest_).
//
// Nothing here ever accepts the old reusable "admin access code" as a
// credential. All secrets live in Script Properties (editor-only), never in a
// spreadsheet, and the password is stored only as a salted, iterated hash.
//
// One-time setup is done by Mabel from the Apps Script editor (Run menu):
//   setupAdminMfa_1_HashAndErasePassword  — hash the current code, erase all plaintext
//   setupAdminMfa_2_CheckGatewaySecret    — validate the gateway secret Mabel pasted
//   setupAdminMfa_3_ArmEnrollmentToken    — arm the 15-minute setup token Mabel pasted
// No function prints a secret to the execution log.
// Emergency controls (also editor-only):
//   adminSecurity_RevokeAllSessions, adminSecurity_ClearLoginLockouts,
//   adminSecurity_ResetMfa

var ADMIN_AUTH_ = {
  SESSION_MAX_MS: 8 * 60 * 60 * 1000,
  SESSION_IDLE_MS: 30 * 60 * 1000,
  SESSION_TOUCH_MS: 60 * 1000,
  TOTP_STEP_SEC: 30,
  TOTP_WINDOW: 1,
  IP_FAIL_LIMIT: 5,
  IP_WINDOW_SEC: 15 * 60,
  IP_LOCK_SEC: 15 * 60,
  GLOBAL_FAIL_LIMIT: 20,
  GLOBAL_WINDOW_SEC: 60 * 60,
  GLOBAL_LOCK_SEC: 30 * 60,
  TICKET_TTL_SEC: 120,
  ENROLL_TOKEN_TTL_MS: 15 * 60 * 1000,
  RECOVERY_CODE_COUNT: 10,
  PASSWORD_MIN_LENGTH: 12,
  HASH_ITERATIONS: 600,
  ISSUER: "VanIsland Admin",
  ACCOUNT: "Admin Studio",
  AUDIT_SHEET: "09 Admin Security Log",
};

var ADMIN_AUTH_KEYS_ = {
  BRIDGE: "ADMIN_AUTH_BRIDGE_TOKEN",
  PASSWORD: "ADMIN_AUTH_PASSWORD_HASH",
  PASSWORD_UPDATED: "ADMIN_AUTH_PASSWORD_UPDATED_AT",
  TOTP: "ADMIN_AUTH_TOTP_SECRET",
  TOTP_LAST_STEP: "ADMIN_AUTH_TOTP_LAST_STEP",
  TOTP_PENDING: "ADMIN_AUTH_TOTP_PENDING",
  ENROLL: "ADMIN_AUTH_ENROLL_TOKEN",
  RECOVERY: "ADMIN_AUTH_RECOVERY_CODES",
  EPOCH: "ADMIN_AUTH_SESSION_EPOCH",
  SESSION_PREFIX: "ADMIN_AUTH_SESS_",
};

var ADMIN_AUTH_ACTIONS_ = [
  "adminAuthLogin",
  "adminAuthSession",
  "adminAuthLogout",
  "adminAuthLogoutAll",
  "adminAuthStatus",
  "adminAuthMintTicket",
  "adminMfaEnrollBegin",
  "adminMfaEnrollConfirm",
  "adminRecoveryCodesRegenerate",
  "adminChangePassword",
];

// Set only by adminAuthPrepareRequest_ after a ticket was verified and
// consumed for this execution. Every web request is its own execution, so
// this never leaks between requests.
var ADMIN_AUTH_VERIFIED_TICKET_ = null;

function isAdminAuthAction_(action) {
  return ADMIN_AUTH_ACTIONS_.indexOf(String(action || "")) >= 0;
}

// ── Request entry points ─────────────────────────────────────────────────────

// Auth writes whose response can be lost to Apps Script's intermittent
// echo-redirect 404 after the script already ran. The gateway retries them
// with the same requestId; the first outcome is replayed instead of being
// re-evaluated, so a lost response never burns a TOTP code into a
// "replay" failure or counts twice toward a lockout.
var ADMIN_AUTH_REPLAYABLE_ = [
  "adminAuthLogin",
  "adminAuthLogoutAll",
  "adminMfaEnrollBegin",
  "adminMfaEnrollConfirm",
  "adminRecoveryCodesRegenerate",
  "adminChangePassword",
];
var ADMIN_AUTH_REPLAY_TTL_SEC = 300;

function handleAdminAuthAction_(body) {
  body = body || {};
  adminAuthAssertBridge_(body);
  var client = {
    key: String(body.clientKey || "unknown").slice(0, 64),
    ua: String(body.userAgent || "").slice(0, 120),
  };
  var requestId = String(body.requestId || "");
  if (ADMIN_AUTH_REPLAYABLE_.indexOf(body.action) < 0 || !/^[A-Za-z0-9_-]{16,64}$/.test(requestId)) {
    return adminAuthDispatch_(body, client);
  }
  // Keyed on every credential field, so only an identical request can read it back.
  var cacheKey = "aa_req_" + adminAuthSha256Hex_([
    body.action, requestId, body.password, body.totp, body.recoveryCode, body.enrollmentToken,
    body.adminSessionToken, body.currentPassword, body.newPassword, body.confirmPassword,
  ].map(function (v) { return String(v || ""); }).join("\u0000"));
  var cache = CacheService.getScriptCache();

  // Claim the requestId atomically. A re-send that arrives while the first
  // execution is still running waits for its outcome instead of running the
  // action a second time (which would burn the TOTP code into a replay error).
  var prior = null;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    prior = tryParse_(cache.get(cacheKey), null);
    if (!prior) cache.put(cacheKey, JSON.stringify({ pending: true }), ADMIN_AUTH_REPLAY_TTL_SEC);
  } finally {
    lock.releaseLock();
  }
  if (prior) {
    for (var waited = 0; prior && prior.pending && waited < 25000; waited += 500) {
      Utilities.sleep(500);
      prior = tryParse_(cache.get(cacheKey), null);
    }
    if (!prior || prior.pending) throw new Error("ADMIN_AUTH_BUSY");
    if (prior.error) throw new Error(prior.error);
    return prior.result;
  }
  try {
    var result = adminAuthDispatch_(body, client);
    cache.put(cacheKey, JSON.stringify({ result: result }), ADMIN_AUTH_REPLAY_TTL_SEC);
    return result;
  } catch (err) {
    cache.put(cacheKey, JSON.stringify({ error: String(err.message) }), ADMIN_AUTH_REPLAY_TTL_SEC);
    throw err;
  }
}

function adminAuthDispatch_(body, client) {
  switch (body.action) {
    case "adminAuthLogin": return adminAuthLogin_(body, client);
    case "adminAuthSession": return adminAuthSessionInfo_(body.adminSessionToken);
    case "adminAuthLogout": return adminAuthLogout_(body.adminSessionToken, client);
    case "adminAuthLogoutAll": return adminAuthLogoutAll_(body.adminSessionToken, client);
    case "adminAuthStatus": return adminAuthStatus_(body.adminSessionToken);
    case "adminAuthMintTicket": return adminAuthMintTicket_(body);
    case "adminMfaEnrollBegin": return adminMfaEnrollBegin_(body, client);
    case "adminMfaEnrollConfirm": return adminMfaEnrollConfirm_(body, client);
    case "adminRecoveryCodesRegenerate": return adminRecoveryCodesRegenerate_(body, client);
    case "adminChangePassword": return adminChangePassword_(body, client);
  }
  throw new Error("Unknown admin auth action.");
}

// Called by the router's resolvers. Returns true only for a verified ticket or
// a gateway-signed live session. Strips credential fields so they never reach
// business handlers or get persisted by accident.
function adminAuthResolveRequest_(payload) {
  if (!payload) return false;
  var sessionToken = String(payload.adminSessionToken || "");
  var bridgeToken = String(payload.adminBridgeToken || "");
  delete payload.adminSessionToken;
  delete payload.adminBridgeToken;
  delete payload.adminAccessCode;

  if (ADMIN_AUTH_VERIFIED_TICKET_ && ADMIN_AUTH_VERIFIED_TICKET_.action === String(payload.action || "")) {
    return true;
  }
  if (!sessionToken || !adminAuthBridgeMatches_(bridgeToken)) return false;
  if (adminAuthValidateSession_(sessionToken, true)) return true;
  // The gateway sent a session that has expired or was revoked: say so
  // explicitly so it clears the cookie (and only then).
  throw new Error("ADMIN_AUTH_SESSION_INVALID");
}

// Unwraps an upload ticket envelope before routing. The envelope is
// { adminTicket, adminTicketPayload: "<exact JSON string>" }; the ticket is
// bound to sha256(adminTicketPayload) and to its action, and is single-use.
function adminAuthPrepareRequest_(e) {
  ADMIN_AUTH_VERIFIED_TICKET_ = null;
  var raw = (e && e.postData && e.postData.contents) || "";
  if (raw.indexOf("\"adminTicket\"") < 0) return e;
  var envelope = tryParse_(raw, null);
  if (!envelope || !envelope.adminTicket) return e;

  var payloadText = String(envelope.adminTicketPayload || "");
  var payload = JSON.parse(payloadText || "{}");
  var ticketHash = adminAuthSha256Hex_(String(envelope.adminTicket));
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var stored;
  try {
    stored = cache.get("aa_ticket_" + ticketHash);
    if (stored) cache.remove("aa_ticket_" + ticketHash);
  } finally {
    lock.releaseLock();
  }
  if (!stored) throw new Error("Upload authorization expired. Please try again.");
  var ticket = JSON.parse(stored);
  if (ticket.a !== String(payload.action || "") ||
      !adminAuthConstantTimeEquals_(ticket.h, adminAuthSha256Hex_(payloadText)) ||
      !adminAuthValidateSessionHash_(ticket.s, false)) {
    throw new Error("Upload authorization failed.");
  }
  ADMIN_AUTH_VERIFIED_TICKET_ = { action: ticket.a };
  e.postData.contents = payloadText;
  return e;
}

// ── Login / logout ───────────────────────────────────────────────────────────

function adminAuthLogin_(body, client) {
  adminAuthAssertNotLocked_(client);
  var passwordOk = adminAuthVerifyPassword_(body.password);
  if (passwordOk && !adminAuthProps_().getProperty(ADMIN_AUTH_KEYS_.TOTP)) {
    adminAuthAudit_("login", "mfa-not-enrolled", client);
    throw new Error("ADMIN_AUTH_MFA_NOT_ENROLLED");
  }

  var usedRecovery = false;
  var secondOk = false;
  if (passwordOk) {
    if (body.recoveryCode) {
      secondOk = adminAuthConsumeRecoveryCode_(body.recoveryCode);
      usedRecovery = secondOk;
    } else {
      secondOk = adminAuthConsumeTotp_(body.totp);
    }
  }
  if (!passwordOk || !secondOk) {
    adminAuthRecordFailure_(client);
    adminAuthAudit_("login", "failed", client, passwordOk ? "second-factor" : "password");
    throw new Error("ADMIN_AUTH_INVALID_CREDENTIALS");
  }

  adminAuthClearFailures_(client);
  adminAuthSweepSessions_();
  var session = adminAuthCreateSession_(client);
  var remaining = adminAuthRecoveryHashes_().length;
  adminAuthAudit_("login", "success", client, usedRecovery ? "recovery-code (" + remaining + " left)" : "totp");
  return {
    sessionToken: session.token,
    expiresAt: session.expiresAt,
    idleTimeoutSec: ADMIN_AUTH_.SESSION_IDLE_MS / 1000,
    maxAgeSec: ADMIN_AUTH_.SESSION_MAX_MS / 1000,
    usedRecoveryCode: usedRecovery,
    recoveryCodesRemaining: remaining,
  };
}

function adminAuthSessionInfo_(token) {
  var session = adminAuthValidateSession_(token, true);
  if (!session) throw new Error("ADMIN_AUTH_SESSION_INVALID");
  return {
    active: true,
    expiresAt: new Date(session.c + ADMIN_AUTH_.SESSION_MAX_MS).toISOString(),
    idleTimeoutSec: ADMIN_AUTH_.SESSION_IDLE_MS / 1000,
  };
}

function adminAuthLogout_(token, client) {
  if (token) adminAuthProps_().deleteProperty(adminAuthSessionKey_(adminAuthSha256Hex_(String(token))));
  adminAuthAudit_("logout", "success", client);
  return { loggedOut: true };
}

function adminAuthLogoutAll_(token, client) {
  if (!adminAuthValidateSession_(token, false)) throw new Error("ADMIN_AUTH_SESSION_INVALID");
  var revoked = adminAuthRevokeAllSessions_();
  adminAuthAudit_("logout-all", "success", client, revoked + " session(s) revoked");
  return { revokedSessions: revoked };
}

function adminAuthStatus_(token) {
  var session = adminAuthValidateSession_(token, true);
  if (!session) throw new Error("ADMIN_AUTH_SESSION_INVALID");
  var props = adminAuthProps_();
  return {
    mfaEnrolled: !!props.getProperty(ADMIN_AUTH_KEYS_.TOTP),
    recoveryCodesRemaining: adminAuthRecoveryHashes_().length,
    passwordUpdatedAt: props.getProperty(ADMIN_AUTH_KEYS_.PASSWORD_UPDATED) || null,
    activeSessions: adminAuthListSessions_().length,
    sessionExpiresAt: new Date(session.c + ADMIN_AUTH_.SESSION_MAX_MS).toISOString(),
    idleTimeoutSec: ADMIN_AUTH_.SESSION_IDLE_MS / 1000,
  };
}

function adminAuthMintTicket_(body) {
  var token = String(body.adminSessionToken || "");
  if (!adminAuthValidateSession_(token, true)) throw new Error("ADMIN_AUTH_SESSION_INVALID");
  var target = String(body.targetAction || "");
  var payloadHash = String(body.payloadHash || "").toLowerCase();
  if (!/^[A-Za-z][A-Za-z0-9]{2,60}$/.test(target) || isAdminAuthAction_(target)) throw new Error("Invalid ticket action.");
  if (!/^[0-9a-f]{64}$/.test(payloadHash)) throw new Error("Invalid ticket payload hash.");
  var ticket = adminAuthRandomToken_();
  CacheService.getScriptCache().put(
    "aa_ticket_" + adminAuthSha256Hex_(ticket),
    JSON.stringify({ a: target, h: payloadHash, s: adminAuthSha256Hex_(token) }),
    ADMIN_AUTH_.TICKET_TTL_SEC
  );
  return { ticket: ticket, expiresInSec: ADMIN_AUTH_.TICKET_TTL_SEC };
}

// ── MFA enrollment / recovery / password change ─────────────────────────────

function adminMfaEnrollBegin_(body, client) {
  adminAuthAssertNotLocked_(client);
  if (!adminAuthVerifyPassword_(body.password) || !adminAuthEnrollTokenValid_(body.enrollmentToken)) {
    adminAuthRecordFailure_(client);
    adminAuthAudit_("mfa-enroll-begin", "failed", client);
    throw new Error("ADMIN_AUTH_INVALID_CREDENTIALS");
  }
  var secret = adminAuthBase32Encode_(adminAuthRandomBytes_(20));
  adminAuthProps_().setProperty(ADMIN_AUTH_KEYS_.TOTP_PENDING, JSON.stringify({ secret: secret, createdAt: Date.now() }));
  adminAuthAudit_("mfa-enroll-begin", "success", client);
  var label = encodeURIComponent(ADMIN_AUTH_.ISSUER + ":" + ADMIN_AUTH_.ACCOUNT);
  return {
    secret: secret,
    otpauthUri: "otpauth://totp/" + label + "?secret=" + secret +
      "&issuer=" + encodeURIComponent(ADMIN_AUTH_.ISSUER) + "&algorithm=SHA1&digits=6&period=30",
  };
}

function adminMfaEnrollConfirm_(body, client) {
  adminAuthAssertNotLocked_(client);
  var props = adminAuthProps_();
  var pending = tryParse_(props.getProperty(ADMIN_AUTH_KEYS_.TOTP_PENDING), null);
  var fresh = pending && (Date.now() - Number(pending.createdAt || 0)) < ADMIN_AUTH_.ENROLL_TOKEN_TTL_MS;
  var step = fresh ? adminAuthMatchTotpStep_(pending.secret, body.totp, Date.now(), -1) : -1;
  if (!adminAuthVerifyPassword_(body.password) || !adminAuthEnrollTokenValid_(body.enrollmentToken) || step < 0) {
    adminAuthRecordFailure_(client);
    adminAuthAudit_("mfa-enroll-confirm", "failed", client);
    throw new Error("ADMIN_AUTH_INVALID_CREDENTIALS");
  }
  props.setProperty(ADMIN_AUTH_KEYS_.TOTP, pending.secret);
  props.setProperty(ADMIN_AUTH_KEYS_.TOTP_LAST_STEP, String(step));
  props.deleteProperty(ADMIN_AUTH_KEYS_.TOTP_PENDING);
  props.deleteProperty(ADMIN_AUTH_KEYS_.ENROLL);
  var codes = adminAuthIssueRecoveryCodes_();
  var revoked = adminAuthRevokeAllSessions_();
  adminAuthClearFailures_(client);
  adminAuthAudit_("mfa-enroll-confirm", "success", client, revoked + " prior session(s) revoked");
  return { enrolled: true, recoveryCodes: codes };
}

function adminRecoveryCodesRegenerate_(body, client) {
  if (!adminAuthValidateSession_(body.adminSessionToken, true)) throw new Error("ADMIN_AUTH_SESSION_INVALID");
  adminAuthAssertNotLocked_(client);
  if (!adminAuthConsumeTotp_(body.totp)) {
    adminAuthRecordFailure_(client);
    adminAuthAudit_("recovery-regenerate", "failed", client);
    throw new Error("ADMIN_AUTH_INVALID_CREDENTIALS");
  }
  var codes = adminAuthIssueRecoveryCodes_();
  adminAuthAudit_("recovery-regenerate", "success", client);
  return { recoveryCodes: codes };
}

function adminChangePassword_(body, client) {
  if (!adminAuthValidateSession_(body.adminSessionToken, true)) throw new Error("ADMIN_AUTH_SESSION_INVALID");
  adminAuthAssertNotLocked_(client);
  var newPassword = String(body.newPassword || "");
  if (newPassword.length < ADMIN_AUTH_.PASSWORD_MIN_LENGTH) {
    throw new Error("New password must be at least " + ADMIN_AUTH_.PASSWORD_MIN_LENGTH + " characters.");
  }
  if (newPassword !== String(body.confirmPassword || "")) throw new Error("New password and confirmation do not match.");
  if (!adminAuthVerifyPassword_(body.currentPassword) || !adminAuthConsumeTotp_(body.totp)) {
    adminAuthRecordFailure_(client);
    adminAuthAudit_("password-change", "failed", client);
    throw new Error("ADMIN_AUTH_INVALID_CREDENTIALS");
  }
  adminAuthStorePassword_(newPassword);
  var revoked = adminAuthRevokeAllSessions_();
  adminAuthAudit_("password-change", "success", client, revoked + " session(s) revoked");
  return { changed: true, signedOut: true };
}

// ── Sessions ─────────────────────────────────────────────────────────────────

function adminAuthCreateSession_(client) {
  var token = adminAuthRandomToken_();
  var now = Date.now();
  adminAuthProps_().setProperty(adminAuthSessionKey_(adminAuthSha256Hex_(token)), JSON.stringify({
    c: now,
    s: now,
    ep: adminAuthEpoch_(),
    k: String(client.key || "").slice(0, 12),
    ua: String(client.ua || "").slice(0, 80),
  }));
  return { token: token, expiresAt: new Date(now + ADMIN_AUTH_.SESSION_MAX_MS).toISOString() };
}

function adminAuthValidateSession_(token, touch) {
  token = String(token || "");
  if (token.length < 32) return null;
  return adminAuthValidateSessionHash_(adminAuthSha256Hex_(token), touch);
}

function adminAuthValidateSessionHash_(tokenHash, touch) {
  if (!/^[0-9a-f]{64}$/.test(String(tokenHash || ""))) return null;
  var props = adminAuthProps_();
  var key = adminAuthSessionKey_(tokenHash);
  var session = tryParse_(props.getProperty(key), null);
  if (!session) return null;
  var now = Date.now();
  if (session.ep !== adminAuthEpoch_() ||
      now - session.c > ADMIN_AUTH_.SESSION_MAX_MS ||
      now - session.s > ADMIN_AUTH_.SESSION_IDLE_MS) {
    props.deleteProperty(key);
    return null;
  }
  if (touch && now - session.s > ADMIN_AUTH_.SESSION_TOUCH_MS) {
    session.s = now;
    props.setProperty(key, JSON.stringify(session));
  }
  return session;
}

function adminAuthSessionKey_(tokenHash) {
  return ADMIN_AUTH_KEYS_.SESSION_PREFIX + tokenHash.slice(0, 48);
}

function adminAuthEpoch_() {
  return Number(adminAuthProps_().getProperty(ADMIN_AUTH_KEYS_.EPOCH) || 0);
}

function adminAuthListSessions_() {
  var all = adminAuthProps_().getProperties();
  return Object.keys(all).filter(function (key) {
    return key.indexOf(ADMIN_AUTH_KEYS_.SESSION_PREFIX) === 0;
  });
}

function adminAuthRevokeAllSessions_() {
  var props = adminAuthProps_();
  props.setProperty(ADMIN_AUTH_KEYS_.EPOCH, String(adminAuthEpoch_() + 1));
  var keys = adminAuthListSessions_();
  keys.forEach(function (key) { props.deleteProperty(key); });
  return keys.length;
}

function adminAuthSweepSessions_() {
  var props = adminAuthProps_();
  var all = props.getProperties();
  var now = Date.now();
  var epoch = adminAuthEpoch_();
  Object.keys(all).forEach(function (key) {
    if (key.indexOf(ADMIN_AUTH_KEYS_.SESSION_PREFIX) !== 0) return;
    var s = tryParse_(all[key], null);
    if (!s || s.ep !== epoch || now - s.c > ADMIN_AUTH_.SESSION_MAX_MS || now - s.s > ADMIN_AUTH_.SESSION_IDLE_MS) {
      props.deleteProperty(key);
    }
  });
}

// ── Password ─────────────────────────────────────────────────────────────────

function adminAuthVerifyPassword_(password) {
  password = String(password || "");
  var stored = adminAuthProps_().getProperty(ADMIN_AUTH_KEYS_.PASSWORD);
  if (!password || !stored) return false;
  var parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "hmac256") return false;
  var candidate = adminAuthHashPassword_(password, parts[2], Number(parts[1]));
  return adminAuthConstantTimeEquals_(candidate, parts[3]);
}

function adminAuthStorePassword_(password) {
  var salt = Utilities.base64Encode(adminAuthRandomBytes_(16));
  var iterations = ADMIN_AUTH_.HASH_ITERATIONS;
  var props = adminAuthProps_();
  props.setProperty(ADMIN_AUTH_KEYS_.PASSWORD, ["hmac256", iterations, salt, adminAuthHashPassword_(password, salt, iterations)].join("$"));
  props.setProperty(ADMIN_AUTH_KEYS_.PASSWORD_UPDATED, new Date().toISOString());
}

// PBKDF2-style chained HMAC-SHA256 keyed by the password (Apps Script has no
// native PBKDF2). Brute force is bounded primarily by the lockouts below.
function adminAuthHashPassword_(password, saltB64, iterations) {
  var key = Utilities.newBlob(String(password)).getBytes();
  var block = Utilities.base64Decode(saltB64);
  var acc = null;
  for (var i = 0; i < iterations; i++) {
    block = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, block, key);
    if (!acc) {
      acc = block.slice();
    } else {
      for (var j = 0; j < acc.length; j++) acc[j] = acc[j] ^ block[j];
    }
  }
  return Utilities.base64Encode(acc);
}

// ── TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ───────────────────────────────────

function adminAuthConsumeTotp_(code) {
  var props = adminAuthProps_();
  var secret = props.getProperty(ADMIN_AUTH_KEYS_.TOTP);
  if (!secret) return false;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var lastStep = Number(props.getProperty(ADMIN_AUTH_KEYS_.TOTP_LAST_STEP) || -1);
    var step = adminAuthMatchTotpStep_(secret, code, Date.now(), lastStep);
    if (step < 0) return false;
    // A code is single-use: its time step (and every earlier one) is burned.
    props.setProperty(ADMIN_AUTH_KEYS_.TOTP_LAST_STEP, String(step));
    return true;
  } finally {
    lock.releaseLock();
  }
}

function adminAuthMatchTotpStep_(secretB32, code, nowMs, lastStep) {
  code = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return -1;
  var key = adminAuthBase32Decode_(secretB32);
  var current = Math.floor(nowMs / 1000 / ADMIN_AUTH_.TOTP_STEP_SEC);
  for (var offset = -ADMIN_AUTH_.TOTP_WINDOW; offset <= ADMIN_AUTH_.TOTP_WINDOW; offset++) {
    var step = current + offset;
    if (step <= lastStep) continue;
    if (adminAuthConstantTimeEquals_(adminAuthHotp_(key, step, 6), code)) return step;
  }
  return -1;
}

function adminAuthHotp_(keyBytes, counter, digits) {
  var msg = [];
  var value = counter;
  for (var i = 7; i >= 0; i--) {
    msg[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  msg = msg.map(function (b) { return b > 127 ? b - 256 : b; });
  var mac = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, msg, keyBytes)
    .map(function (b) { return b & 0xff; });
  var offset = mac[mac.length - 1] & 0x0f;
  var binary = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  var otp = String(binary % Math.pow(10, digits));
  while (otp.length < digits) otp = "0" + otp;
  return otp;
}

var ADMIN_AUTH_B32_ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function adminAuthBase32Encode_(bytes) {
  var bits = 0, value = 0, out = "";
  for (var i = 0; i < bytes.length; i++) {
    value = (value << 8) | (bytes[i] & 0xff);
    bits += 8;
    while (bits >= 5) {
      out += ADMIN_AUTH_B32_.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) out += ADMIN_AUTH_B32_.charAt((value << (5 - bits)) & 31);
  return out;
}

function adminAuthBase32Decode_(text) {
  text = String(text || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  var bits = 0, value = 0, out = [];
  for (var i = 0; i < text.length; i++) {
    value = (value << 5) | ADMIN_AUTH_B32_.indexOf(text.charAt(i));
    bits += 5;
    if (bits >= 8) {
      var b = (value >>> (bits - 8)) & 0xff;
      out.push(b > 127 ? b - 256 : b);
      bits -= 8;
    }
  }
  return out;
}

// ── Recovery codes ───────────────────────────────────────────────────────────

function adminAuthIssueRecoveryCodes_() {
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var codes = [];
  for (var n = 0; n < ADMIN_AUTH_.RECOVERY_CODE_COUNT; n++) {
    var bytes = adminAuthRandomBytes_(12);
    var raw = "";
    for (var i = 0; i < 12; i++) raw += alphabet.charAt((bytes[i] & 0xff) % alphabet.length);
    codes.push(raw.slice(0, 4) + "-" + raw.slice(4, 8) + "-" + raw.slice(8, 12));
  }
  adminAuthProps_().setProperty(ADMIN_AUTH_KEYS_.RECOVERY, JSON.stringify(codes.map(adminAuthRecoveryHash_)));
  return codes;
}

function adminAuthRecoveryHash_(code) {
  return adminAuthSha256Hex_("recovery:" + String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""));
}

function adminAuthRecoveryHashes_() {
  var list = tryParse_(adminAuthProps_().getProperty(ADMIN_AUTH_KEYS_.RECOVERY), []);
  return Array.isArray(list) ? list : [];
}

function adminAuthConsumeRecoveryCode_(code) {
  var normalized = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== 12) return false;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var hashes = adminAuthRecoveryHashes_();
    var target = adminAuthRecoveryHash_(normalized);
    var index = -1;
    for (var i = 0; i < hashes.length; i++) {
      if (adminAuthConstantTimeEquals_(hashes[i], target)) index = i;
    }
    if (index < 0) return false;
    hashes.splice(index, 1);
    adminAuthProps_().setProperty(ADMIN_AUTH_KEYS_.RECOVERY, JSON.stringify(hashes));
    return true;
  } finally {
    lock.releaseLock();
  }
}

// ── Enrollment token (created only from the Apps Script editor) ─────────────

function adminAuthEnrollTokenValid_(token) {
  var stored = tryParse_(adminAuthProps_().getProperty(ADMIN_AUTH_KEYS_.ENROLL), null);
  if (!stored || !token) return false;
  if (Date.now() > Number(stored.expiresAt || 0)) return false;
  return adminAuthConstantTimeEquals_(stored.hash, adminAuthSha256Hex_(String(token).trim()));
}

// ── Brute-force protection ───────────────────────────────────────────────────
// The gateway secret means only our Netlify function can reach these actions,
// so the client key it forwards (salted IP digest) is trustworthy. A global
// ceiling also stops distributed guessing; Mabel can clear it from the editor.

function adminAuthAssertNotLocked_(client) {
  var cache = CacheService.getScriptCache();
  if (cache.get("aa_lock_global") || cache.get("aa_lock_ip_" + client.key)) {
    adminAuthAudit_("login", "locked", client);
    throw new Error("ADMIN_AUTH_LOCKED");
  }
}

function adminAuthRecordFailure_(client) {
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var now = Date.now();
    var ipKey = "aa_fail_ip_" + client.key;
    var ipFails = adminAuthRecentFailures_(cache.get(ipKey), now, ADMIN_AUTH_.IP_WINDOW_SEC);
    ipFails.push(now);
    cache.put(ipKey, JSON.stringify(ipFails), ADMIN_AUTH_.IP_WINDOW_SEC);
    if (ipFails.length >= ADMIN_AUTH_.IP_FAIL_LIMIT) {
      cache.put("aa_lock_ip_" + client.key, "1", ADMIN_AUTH_.IP_LOCK_SEC);
      adminAuthAudit_("lockout", "ip-locked", client, ipFails.length + " failures");
    }
    var globalFails = adminAuthRecentFailures_(cache.get("aa_fail_global"), now, ADMIN_AUTH_.GLOBAL_WINDOW_SEC);
    globalFails.push(now);
    cache.put("aa_fail_global", JSON.stringify(globalFails), ADMIN_AUTH_.GLOBAL_WINDOW_SEC);
    if (globalFails.length >= ADMIN_AUTH_.GLOBAL_FAIL_LIMIT) {
      cache.put("aa_lock_global", "1", ADMIN_AUTH_.GLOBAL_LOCK_SEC);
      adminAuthAudit_("lockout", "global-locked", client, globalFails.length + " failures");
    }
  } finally {
    lock.releaseLock();
  }
}

function adminAuthRecentFailures_(stored, now, windowSec) {
  var list = tryParse_(stored, []);
  if (!Array.isArray(list)) return [];
  return list.filter(function (t) { return now - Number(t) < windowSec * 1000; });
}

function adminAuthClearFailures_(client) {
  CacheService.getScriptCache().remove("aa_fail_ip_" + client.key);
}

// ── Gateway secret ───────────────────────────────────────────────────────────

function adminAuthBridgeMatches_(supplied) {
  var expected = adminAuthProps_().getProperty(ADMIN_AUTH_KEYS_.BRIDGE);
  return !!expected && !!supplied && adminAuthConstantTimeEquals_(String(supplied), expected);
}

function adminAuthAssertBridge_(body) {
  if (!adminAuthBridgeMatches_(body && body.adminBridgeToken)) throw new Error("Admin gateway authorization failed.");
}

// ── Audit log ────────────────────────────────────────────────────────────────
// No secrets are ever written: only event, outcome, a 12-char prefix of the
// salted client digest, and a truncated user agent.

function adminAuthAudit_(event, outcome, client, detail) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(ADMIN_AUTH_.AUDIT_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(ADMIN_AUTH_.AUDIT_SHEET);
      sheet.appendRow(["Timestamp", "Event", "Outcome", "Client", "User Agent", "Detail"]);
    }
    sheet.appendRow([
      new Date().toISOString(),
      String(event || ""),
      String(outcome || ""),
      String((client && client.key) || "").slice(0, 12),
      String((client && client.ua) || "").slice(0, 80),
      String(detail || ""),
    ]);
  } catch (_) {}
}

// ── Crypto helpers ───────────────────────────────────────────────────────────

function adminAuthProps_() {
  return PropertiesService.getScriptProperties();
}

// Utilities.getUuid() is backed by a CSPRNG (v4 UUID, 122 random bits);
// several are folded through SHA-256 to produce uniform bytes.
function adminAuthRandomBytes_(count) {
  var out = [];
  while (out.length < count) {
    var seed = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid() + Date.now();
    out = out.concat(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed));
  }
  return out.slice(0, count);
}

function adminAuthRandomToken_() {
  return Utilities.base64EncodeWebSafe(adminAuthRandomBytes_(32)).replace(/=+$/, "");
}

function adminAuthSha256Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8)
    .map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); })
    .join("");
}

function adminAuthConstantTimeEquals_(a, b) {
  a = String(a || "");
  b = String(b || "");
  // Only fixed-length values (hashes, codes, tokens) are compared, so an
  // early length mismatch leaks nothing useful.
  if (!a || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Editor-only setup & emergency functions (Run menu) ───────────────────────
// None of these are reachable from doGet/doPost.

// Hashes the current code, then erases every plaintext copy in the same run,
// which immediately closes the old password-only paths (v177 and the separate
// Home Sale project both read it from 08 System Settings). Rollback never needs
// the plaintext: the approved rollback target is fail-closed (see
// ops/buildRollbackPublicOnly.mjs), so admin simply stays unavailable.
function setupAdminMfa_1_HashAndErasePassword() {
  var props = adminAuthProps_();
  var plaintext = String(getSystemSetting_("admin_access_code") || props.getProperty("ADMIN_ACCESS_CODE") || "").trim();
  if (!props.getProperty(ADMIN_AUTH_KEYS_.PASSWORD)) {
    if (!plaintext) throw new Error("No existing admin access code found to hash.");
    adminAuthStorePassword_(plaintext);
    if (!adminAuthVerifyPassword_(plaintext)) throw new Error("Hash verification failed — nothing erased.");
    Logger.log("Current admin access code stored as a salted hash. It is now the Admin password for two-step sign-in.");
  } else {
    Logger.log("Admin password hash already exists — hash left unchanged.");
  }
  if (getSystemSetting_("admin_access_code")) setSystemSetting_("admin_access_code", "", "migrated-to-mfa");
  props.deleteProperty("ADMIN_ACCESS_CODE");
  props.deleteProperty("HOME_SALE_ADMIN_ACCESS_CODE");
  Logger.log("Plaintext copies removed from 08 System Settings and Script Properties.");
}

// Secrets are never generated into, or printed to, the execution log. Mabel
// creates each value in her password manager and pastes it into
// Project Settings → Script Properties; these functions only validate it.

// Mabel pastes the same random value (≥ 32 chars, letters/digits/-/_) into
// Script Property ADMIN_AUTH_BRIDGE_TOKEN and Netlify env ADMIN_BRIDGE_TOKEN.
function setupAdminMfa_2_CheckGatewaySecret() {
  var token = String(adminAuthProps_().getProperty(ADMIN_AUTH_KEYS_.BRIDGE) || "");
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    throw new Error("Script Property " + ADMIN_AUTH_KEYS_.BRIDGE + " is missing or not 32–128 letters/digits/-/_.");
  }
  Logger.log("Gateway secret OK (length " + token.length + "). Value not shown.");
}

// Mabel pastes a one-time setup token (≥ 16 chars) into Script Property
// ADMIN_AUTH_ENROLL_INPUT, runs this, then types the same token on the
// /admin first-time setup page within 15 minutes. The input property is
// deleted here; only a hash is kept.
function setupAdminMfa_3_ArmEnrollmentToken() {
  var props = adminAuthProps_();
  var token = String(props.getProperty(ENROLL_INPUT_KEY_) || "").trim();
  props.deleteProperty(ENROLL_INPUT_KEY_);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
    throw new Error("Script Property " + ENROLL_INPUT_KEY_ + " is missing or not 16–128 letters/digits/-/_.");
  }
  var expiresAt = Date.now() + ADMIN_AUTH_.ENROLL_TOKEN_TTL_MS;
  props.setProperty(ADMIN_AUTH_KEYS_.ENROLL, JSON.stringify({ hash: adminAuthSha256Hex_(token), expiresAt: expiresAt }));
  Logger.log("Setup token armed until " + new Date(expiresAt).toISOString() + " (single use). Value not shown; input property deleted.");
}

var ENROLL_INPUT_KEY_ = "ADMIN_AUTH_ENROLL_INPUT";

function adminSecurity_RevokeAllSessions() {
  Logger.log(adminAuthRevokeAllSessions_() + " admin session(s) revoked.");
}

function adminSecurity_ClearLoginLockouts() {
  var cache = CacheService.getScriptCache();
  cache.remove("aa_lock_global");
  cache.remove("aa_fail_global");
  Logger.log("Global lockout cleared. Per-client lockouts expire on their own within 15 minutes.");
}

function adminSecurity_ResetMfa() {
  var props = adminAuthProps_();
  props.deleteProperty(ADMIN_AUTH_KEYS_.TOTP);
  props.deleteProperty(ADMIN_AUTH_KEYS_.TOTP_LAST_STEP);
  props.deleteProperty(ADMIN_AUTH_KEYS_.RECOVERY);
  adminAuthRevokeAllSessions_();
  Logger.log("MFA removed and all sessions revoked. Arm a new setup token (setupAdminMfa_3_ArmEnrollmentToken) to pair a new device.");
}
