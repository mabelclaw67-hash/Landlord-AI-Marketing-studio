"use strict";

// In-memory stand-ins for the Apps Script services AdminAuth.gs uses, backed
// by Node crypto so hashing/HMAC behave exactly like the real Utilities API
// (signed byte arrays in, signed byte arrays out). Time is controllable.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const toSigned = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const toBuffer = (value) => (typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value.map((b) => b & 0xff)));

function makeClock(start = Date.UTC(2026, 8, 24, 12, 0, 0)) {
  const clock = { now: start };
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(clock.now);
      else super(...args);
    }
    static now() { return clock.now; }
  }
  clock.Date = FakeDate;
  clock.advance = (ms) => { clock.now += ms; };
  return clock;
}

function makeServices(clock) {
  const props = new Map();
  const cache = new Map();
  const sheets = {};
  const logs = [];
  const makeSheet = (name) => {
    const rows = [];
    return {
      name,
      rows,
      appendRow: (row) => rows.push(row),
      getLastRow: () => rows.length,
      getLastColumn: () => (rows[0] || []).length,
      getRange: () => ({ getValues: () => rows, setValues() {}, setFontWeight() { return this; }, setBackground() { return this; } }),
    };
  };
  const services = {
    Utilities: {
      MacAlgorithm: { HMAC_SHA_1: "sha1", HMAC_SHA_256: "sha256" },
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeHmacSignature: (alg, value, key) => toSigned(crypto.createHmac(alg, toBuffer(key)).update(toBuffer(value)).digest()),
      computeDigest: (alg, value) => toSigned(crypto.createHash(alg).update(toBuffer(value)).digest()),
      getUuid: () => crypto.randomUUID(),
      base64Encode: (bytes) => toBuffer(bytes).toString("base64"),
      base64EncodeWebSafe: (bytes) => toBuffer(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_"),
      base64Decode: (text) => toSigned(Buffer.from(text, "base64")),
      newBlob: (text) => ({ getBytes: () => toSigned(Buffer.from(String(text), "utf8")) }),
      sleep: (ms) => { clock.now += ms; if (services.__onSleep) services.__onSleep(); },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => (props.has(key) ? props.get(key) : null),
        setProperty: (key, value) => { props.set(key, String(value)); },
        deleteProperty: (key) => { props.delete(key); },
        getProperties: () => Object.fromEntries(props),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => {
          const entry = cache.get(key);
          if (!entry || entry.expires <= clock.now) { cache.delete(key); return null; }
          return entry.value;
        },
        put: (key, value, ttlSec) => { cache.set(key, { value: String(value), expires: clock.now + (ttlSec || 600) * 1000 }); },
        remove: (key) => { cache.delete(key); },
      }),
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }),
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) => sheets[name] || null,
        insertSheet: (name) => (sheets[name] = makeSheet(name)),
      }),
      flush() {},
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (value) => ({ value, setMimeType() { return this; }, getContent() { return this.value; } }),
    },
    Logger: { log: (message) => logs.push(String(message)) },
  };
  return { services, props, cache, sheets, logs };
}

// Loads the real backend sources into a fresh VM context.
function loadBackend(files = ["Code.gs", "HomeSaleStudioRead.gs", "AdminAuth.gs"]) {
  const clock = makeClock();
  const env = makeServices(clock);
  const sandbox = { console, Date: clock.Date, ...env.services };
  vm.createContext(sandbox);
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    vm.runInContext(source, sandbox, { filename: file });
  }
  return { sandbox, clock, ...env };
}

// RFC 6238 TOTP computed independently of AdminAuth.gs, as an authenticator app would.
function totpAt(secretB32, ms) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretB32.replace(/=+$/, "")) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(ms / 1000 / 30)));
  const mac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

function makeChecker() {
  let failures = 0;
  const check = (condition, label) => {
    if (condition) console.log(`PASS ${label}`);
    else { failures += 1; console.log(`FAIL ${label}`); }
  };
  const expectThrow = (fn, pattern, label) => {
    try { fn(); } catch (error) { check(pattern.test(String(error.message)), `${label} (${error.message})`); return; }
    check(false, `${label} (did not throw)`);
  };
  return { check, expectThrow, failures: () => failures };
}

module.exports = { loadBackend, totpAt, makeChecker };
