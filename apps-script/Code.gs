// ============================================================
//  Vanisland AI Marketing Studio — Apps Script Backend v0.3
//  Spreadsheet ID : 1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4
//  Drive Folder ID: 1RNF_WZWsDECSnIqnaZuXWsbUy-xtmE2r
// ============================================================

var SPREADSHEET_ID  = "1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4";
var DRIVE_FOLDER_ID = "1RNF_WZWsDECSnIqnaZuXWsbUy-xtmE2r";
var ADMIN_ACCESS_CODE = ""; // source of truth is 08 System Settings — no hardcoded fallback
var LISTINGS_SHEET  = "01 Listings";
var CONTACTS_SHEET  = "Contacts";
var INTAKE_SHEET    = "07 Intake Records";
var SYSTEM_SETTINGS_SHEET = "08 System Settings";

var INTAKE_HEADERS = [
  // System
  "Record ID",                       // A
  "Listing ID",                      // B
  "Submitted At",                    // C
  // Applicant info
  "Applicant Name",                  // D
  "Email",                           // E
  "Phone",                           // F
  "Date of Birth",                   // G
  "Current Address",                 // H
  "WeChat",                          // I
  // Employment / Income
  "Employment Status",               // J
  "Employer",                        // K
  "Monthly Income",                  // L
  // Reference & Credit
  "Landlord Reference",              // M
  "Credit History",                  // N
  // Move-in / Occupancy
  "Move-in Date",                    // O
  "Lease Term Requested",            // P
  "Occupants",                       // Q  (total occupants)
  "Adults",                          // R
  "Minors",                          // S
  "Occupant Names Ages",             // T
  // Joint applicant
  "Has Joint Applicant",             // U
  "Joint Name",                      // V
  "Joint Phone",                     // W
  "Joint Email",                     // X
  "Joint DOB",                       // Y
  "Joint Address",                   // Z
  "Joint Employment",                // AA
  "Joint Income",                    // AB
  "Joint Employer Contact",          // AC
  "Joint Landlord Reference",        // AD
  "Joint Credit Info",               // AE
  "Joint Proof of Income",           // AF
  // Lease / Deposit
  "Deposit Funds Available",         // AF
  "Deposit Agreement",               // AG
  // Pets
  "Has Pets",                        // AH
  "Pet Deposit Funds",               // AI
  "Pet Details",                     // AJ
  // Tenancy history
  "Eviction History",                // AK
  // Smoking
  "Smokes Vapes Cannabis",           // AL
  "No Smoking Agreement",            // AM
  // Supporting documents
  "Proof of Income",                 // AN
  // Tenant insurance
  "Has Tenant Insurance",            // AO
  "Tenant Insurance Agreement",      // AP
  "Proof Insurance Before Move-in",  // AQ
  // Additional info
  "Reason for Moving",               // AR
  "Parking Request",                 // AS
  "Additional Notes",                // AT
  // Admin (managed by backend only)
  "PDF URL",                         // AU
  "Review Status",                   // AV
  "Internal Notes",                  // AW
  "Updated At",                      // AX
];

var CONTACT_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "WeChat ID",
  "City",
  "Service Interest",
  "Message",
  "Submitted At",
  "Approval Status",
  "Approved Module",
  "Access Type",
  "Payment Status",
  "Access Code",
  "Approved At",
  "Access Expires At",
  "Approval Email Sent At",
  "Admin Notes",
];

// ── Column reference — actual "01 Listings" header row ────────────────────────
//
//  A  0   Listing ID
//  B  1   Created Date
//  C  2   Owner Name
//  D  3   Owner Email
//  E  4   Property Address
//  F  5   City
//  G  6   Province
//  H  7   Bedrooms
//  I  8   Bathrooms
//  J  9   Rent
//  K  10  Available Date
//  L  11  Lease Term
//  M  12  Utilities
//  N  13  Pet Policy
//  O  14  Parking
//  P  15  Laundry
//  Q  16  Smoking Policy
//  R  17  Key Features
//  S  18  Target Audience
//  T  19  Language
//  U  20  Platforms          (comma-string for manual rows; JSON array for app rows)
//  V  21  Status
//  W  22  Drive Folder Link  ← EXISTING column — source of truth for listing photos
//  X  23  Outputs            JSON object  (app-managed)
//  Y  24  Review Status      JSON object  (app-managed)
//  Z  25  Compliance Flag    JSON object  (app-managed)
//  AA 26  Media Checklist    JSON array   (app-managed)
//  AB 27  Drive Files        JSON array   (app-managed, legacy upload refs)
//
// All read/write uses header-name lookups (getHeaderMap_) so column order
// changes in the sheet will not break the mapping.

var LISTING_HEADERS = [
  "Listing ID",        // A  0
  "Created Date",      // B  1
  "Owner Name",        // C  2
  "Owner Email",       // D  3
  "Property Address",  // E  4
  "City",              // F  5
  "Province",          // G  6
  "Bedrooms",          // H  7
  "Bathrooms",         // I  8
  "Rent",              // J  9
  "Available Date",    // K 10
  "Lease Term",        // L 11
  "Utilities",         // M 12
  "Pet Policy",        // N 13
  "Parking",           // O 14
  "Laundry",           // P 15
  "Smoking Policy",    // Q 16
  "Key Features",      // R 17
  "Target Audience",   // S 18
  "Language",          // T 19
  "Platforms",         // U 20
  "Workflow Status",   // V 21  — actual header name in the sheet
  "Drive Folder Link", // W 22  — existing column, source of truth for photos
  "Final Package Link", // X 23  URL to admin marketing package
  "Published Link",     // Y 24  URL to public tenant-facing listing
  "Listing Status",     // Z 25  tenant-facing public listing status
  "Open House Date / Time", // AA 26
  "Open House Viewing Instructions", // AB 27
  "Open House Parking Notes", // AC 28
  "Outputs",           // Z 25  JSON (generated copy — app-managed)
  "Media Checklist",      // AA 26 JSON
  "Drive Files",          // AB 27 JSON
  "Enhanced Folder ID",   // AC 28 — 02_AI_Enhanced_Photos subfolder Drive ID
  "videoUrl",             // AD 29 — generated MP4 video URL (Google Drive link)
  "Created By Email",
  "Created By Access Code",
  "Created By Role",
];

// ── Router ───────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";
    if (action === "ping")               return ok({ status: "connected" });
    var publicGetActions = ["getListings", "getListingById"];
    var isPublicGet = publicGetActions.indexOf(action) >= 0;
    var auth = resolveAccessContext_(e.parameter || {}, "rental", { allowAdmin: true, allowTrial: true, allowNoAccess: isPublicGet });
    if (action === "getListings")         return ok(getListings_(auth));
    if (action === "getListingById")      return ok(getListingById_(e.parameter.listingId, auth));
    if (action === "getListingFolder")    return ok(getListingFolderFiles_(e.parameter.folderId, e.parameter.listingId, auth));
    if (action === "getListingSubfolder") return ok(getListingSubfolderFiles_(e.parameter.folderId, e.parameter.subfolderName, e.parameter.listingId, auth));
    if (action === "getApplicationById")  return ok(getApplicationById_(e.parameter.applicationId, auth));
    if (action === "getContactRequests")  return ok(getContactRequests_(auth));
    return err("Unknown GET action: " + action);
  } catch (ex) {
    return err(ex.message);
  }
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action || "";
    // Actions that do not require any session (login/public endpoints)
    var noAuthActions = ["saveContact", "validateAccessCode", "saveRentalApplication", "validateAdminAccessCode", "getListings", "getListingById"];
    var isNoAuth = noAuthActions.indexOf(action) >= 0;
    var auth = resolveAccessContext_(body || {}, "rental", {
      allowAdmin: true,
      allowTrial: !isNoAuth,
      allowNoAccess: isNoAuth,
    });
    if (action === "getListings")       return ok(getListings_(auth));        // POST avoids GET cache
    if (action === "getListingById")    return ok(getListingById_(body.listingId, auth));
    if (action === "generateListingId") return ok({ listingId: generateListingId_() });
    if (action === "saveListing")       return ok(saveListing_(body.data, auth));
    if (action === "saveContact")       return ok(saveContact_(body.data));
    if (action === "uploadFile")        return ok(uploadFile_(body, auth));
    if (action === "uploadToSubfolder") return ok(uploadToSubfolder_(body, auth));
    if (action === "updateVideoUrl")    return ok(updateVideoUrl_(body.listingId, body.videoUrl, auth));
    if (action === "syncVideoUrl")      return ok(syncVideoUrl_(body.listingId, auth));
    if (action === "syncAllVideoUrls")       return ok(syncAllVideoUrls_());
    if (action === "saveRentalApplication")  return ok(saveRentalApplication_(body.data));
    if (action === "getApplicationsByListing") return ok(getApplicationsByListing_(body.listingId, auth));
    if (action === "getAllApplications")     return ok(getAllApplications_(auth));
    if (action === "updateApplicationStatus") return ok(updateApplicationStatus_(body.applicationId, body.reviewStatus, auth));
    if (action === "updateApplicationNotes")  return ok(updateApplicationNotes_(body.applicationId, body.notes, auth));
    if (action === "approveContactRequest")   return ok(approveContactRequest_(body, auth));
    if (action === "updateContactRequestNotes") return ok(updateContactRequestNotes_(body.rowNumber, body.notes, auth));
    if (action === "validateAccessCode")      return ok(validateAccessCode_(body.email, body.accessCode));
    if (action === "validateAdminAccessCode") return ok(validateAdminAccessCode_(body.code));
    if (action === "updateAdminAccessCode")   return ok(updateAdminAccessCode_(body, auth));
    if (action === "getAdminSettings")        return ok(getAdminSettings_(auth));
    return err("Unknown POST action: " + action);
  } catch (ex) {
    return err(ex.message);
  }
}

// ── Response helpers ──────────────────────────────────────────────────────────

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────

function getSheet_(name) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(
    "Sheet not found: \"" + name + "\". Please create it manually in the spreadsheet."
  );
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  // Only writes headers when the sheet is completely empty — never overwrites.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight("bold")
         .setBackground("#E8F0FE");
  }
}

// Build a {headerName: columnIndex} map from the sheet's first row.
// Used so all reads/writes are resilient to column order changes.
function getHeaderMap_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) return {};
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim();
    if (h) map[h] = i;
  }
  return map;
}

// Safe cell reader: returns "" when the header doesn't exist in this sheet.
function colVal_(row, headerMap, name) {
  var idx = headerMap[name];
  return (idx !== undefined && idx < row.length) ? (row[idx] || "") : "";
}

// ── System Settings helpers ───────────────────────────────────────────────────

function getSystemSetting_(key) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SYSTEM_SETTINGS_SHEET);
    if (!sheet) return null;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    var rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === key) {
        var val = String(rows[i][1] || "").trim();
        return val || null;
      }
    }
    return null;
  } catch (_) { return null; }
}

function setSystemSetting_(key, value, updatedBy) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SYSTEM_SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SYSTEM_SETTINGS_SHEET);
    var hdr = sheet.getRange(1, 1, 1, 4);
    hdr.setValues([["Setting Key", "Setting Value", "Updated At", "Updated By"]]);
    hdr.setFontWeight("bold").setBackground("#E8F0FE");
  }
  var lastRow = sheet.getLastRow();
  var now = new Date().toISOString();
  if (lastRow >= 2) {
    var rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === key) {
        sheet.getRange(i + 2, 2, 1, 3).setValues([[value, now, updatedBy || ""]]);
        return;
      }
    }
  }
  sheet.appendRow([key, value, now, updatedBy || ""]);
}

function getAdminAccessCode_() {
  try {
    // 1. Sheet is the authoritative source of truth (set by Admin Settings UI)
    var fromSheet = getSystemSetting_("admin_access_code");
    if (fromSheet) {
      // Keep PropertiesService in sync so updateAdminAccessCode_ cache-busts correctly
      PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", fromSheet);
      return fromSheet;
    }
    // 2. Hardcoded bootstrap value — used until Mabel sets a real code via Admin Settings
    //    Intentionally skip PropertiesService here to avoid stale cached values
    //    from previous deployments overriding the hardcoded bootstrap.
    var bootstrap = ADMIN_ACCESS_CODE || "";
    if (bootstrap) PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", bootstrap);
    return bootstrap;
  } catch (_) {
    return ADMIN_ACCESS_CODE || "";
  }
}

// ── Admin Settings action handlers ───────────────────────────────────────────

function validateAdminAccessCode_(code) {
  var entered = String(code || "").trim();
  if (!entered) return { valid: false };
  return { valid: entered === getAdminAccessCode_() };
}

function updateAdminAccessCode_(body, auth) {
  assertAdmin_(auth);
  var newCode    = String(body.newCode     || "").trim();
  var confirmCode = String(body.confirmCode || "").trim();
  if (newCode.length < 10) throw new Error("New code must be at least 10 characters.");
  if (newCode !== confirmCode) throw new Error("New code and confirm code do not match.");
  setSystemSetting_("admin_access_code", newCode, "admin");
  PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", newCode);
  return { success: true, updatedAt: new Date().toISOString() };
}

function getAdminSettings_(auth) {
  assertAdmin_(auth);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SYSTEM_SETTINGS_SHEET);
    if (!sheet) return { codeMasked: "••••••••", updatedAt: null, updatedBy: null };
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { codeMasked: "••••••••", updatedAt: null, updatedBy: null };
    var rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === "admin_access_code") {
        return {
          codeMasked: "••••••••",
          updatedAt:  rows[i][2] ? new Date(rows[i][2]).toISOString() : null,
          updatedBy:  rows[i][3] || null,
        };
      }
    }
  } catch (_) {}
  return { codeMasked: "••••••••", updatedAt: null, updatedBy: null };
}

function resolveAccessContext_(payload, moduleName, options) {
  payload = payload || {};
  options = options || {};
  var adminAccessCode = String(payload.adminAccessCode || "").trim();
  var expectedAdminCode = getAdminAccessCode_();
  if (options.allowAdmin !== false && adminAccessCode && expectedAdminCode && adminAccessCode === expectedAdminCode) {
    return { mode: "admin", module: moduleName || "" };
  }

  var accessEmail = normalizeEmail_(payload.accessEmail || payload.email || "");
  var accessCode = String(payload.accessCode || "").trim().toUpperCase();
  if (options.allowTrial !== false && accessEmail && accessCode) {
    var validated = validateAccessCode_(accessEmail, accessCode);
    if (!validated.valid) throw new Error(validated.message || "Trial access denied.");
    if (moduleName && !approvedModuleAllows_(validated.approvedModule, moduleName)) {
      throw new Error("Access denied for this module.");
    }
    return {
      mode: "trial",
      module: moduleName || "",
      email: validated.email,
      accessCode: validated.accessCode,
      approvedModule: validated.approvedModule,
      accessExpiresAt: validated.accessExpiresAt,
    };
  }

  if (options.allowNoAccess) {
    return { mode: "public", module: moduleName || "" };
  }

  throw new Error("Access denied. Please sign in with an approved trial access code.");
}

function approvedModuleAllows_(approvedModule, moduleName) {
  var text = String(approvedModule || "").toLowerCase();
  var module = String(moduleName || "").toLowerCase();
  if (text.indexOf("both") >= 0) return true;
  if (module === "rental") return text.indexOf("rental") >= 0;
  if (module === "sale") return text.indexOf("sale") >= 0;
  return false;
}

function assertAdmin_(auth) {
  if (!auth || auth.mode !== "admin") throw new Error("Admin access required.");
}

function tryParse_(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str) || fallback; }
  catch (_) { return fallback; }
}

function extractJointEmploymentParts_(rawValue) {
  var raw = String(rawValue || "").trim();
  if (!raw) return { status: "", source: "" };
  var statusMatch = raw.match(/(?:^|\n)Status:\s*(.*?)(?:\n|$)/);
  var sourceMatch = raw.match(/(?:^|\n)Employer \/ Income Source:\s*(.*?)(?:\n|$)/);
  if (statusMatch || sourceMatch) {
    return {
      status: statusMatch ? String(statusMatch[1] || "").trim() : "",
      source: sourceMatch ? String(sourceMatch[1] || "").trim() : "",
    };
  }
  return { status: raw, source: "" };
}

function extractSupportingDocsChoice_(rawValue, label) {
  var raw = String(rawValue || "").trim();
  if (!raw) return "";
  var marker = label + ":";
  var start = raw.indexOf(marker);
  if (start === -1) return "";
  return raw.substring(start + marker.length).split("|")[0].trim();
}

// Handles both legacy comma-separated strings ("Facebook, WeChat")
// and JSON arrays ('["Facebook","WeChat"]') stored in the Platforms column.
function parsePlatforms_(val) {
  if (!val) return [];
  try {
    var parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return String(val).split(",").map(function(s) { return s.trim(); }).filter(Boolean);
}

// ── Listings ──────────────────────────────────────────────────────────────────

function getListings_(auth) {
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];

  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var data      = sheet.getRange(2, 1, last - 1, numCols).getValues();

  return data
    .map(function(row) { return rowToListing_(row, headerMap); })
    .filter(function(l) { return canAccessListingRecord_(l, auth); })
    .map(function(l) { return sanitizeListingForAccess_(l, auth); })
    .filter(function(l) { return !!l.id; });
}

function getListingById_(listingId, auth) {
  if (!listingId) throw new Error("Missing listingId.");
  var listing = findListingById_(listingId);
  if (!listing) throw new Error("Listing not found: " + listingId);
  if (!canAccessListingRecord_(listing, auth)) {
    throw new Error("Access denied for this listing.");
  }
  return sanitizeListingForAccess_(listing, auth);
}

function findListingById_(listingId) {
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || "").trim() === String(listingId).trim()) {
      var row = sheet.getRange(i + 2, 1, 1, numCols).getValues()[0];
      var listing = rowToListing_(row, headerMap);
      listing._rowNumber = i + 2;
      return listing;
    }
  }
  return null;
}

function findListingByIdForEmail_(listingId, email) {
  var listing = findListingById_(listingId);
  if (!listing) return null;
  return normalizeEmail_(listing.createdByEmail) === normalizeEmail_(email) ? listing : null;
}

function canAccessListingRecord_(listing, auth) {
  if (!listing) return false;
  if (!auth) return true;
  if (auth.mode === "admin") return true;
  if (auth.mode === "public") return listing.status === "Published";
  if (auth.mode === "trial") {
    return normalizeEmail_(listing.createdByEmail) === normalizeEmail_(auth.email);
  }
  return false;
}

function sanitizeListingForAccess_(listing, auth) {
  if (!listing) return null;
  if (!auth || auth.mode === "admin") return listing;

  var safe = {};
  for (var key in listing) {
    if (!Object.prototype.hasOwnProperty.call(listing, key)) continue;
    safe[key] = listing[key];
  }

  delete safe.driveFolderLink;
  delete safe.driveFiles;
  delete safe.enhancedFolderId;
  delete safe.reviewStatus;
  delete safe.complianceFlag;
  delete safe.mediaChecklist;
  delete safe.createdByEmail;
  delete safe.createdByAccessCode;
  delete safe.createdByRole;
  return safe;
}

// Convert a sheet row to a listing object using header-name lookup.
function rowToListing_(row, headerMap) {
  function col(name) { return colVal_(row, headerMap, name); }
  return {
    id:              col("Listing ID"),
    createdDate:     col("Created Date"),
    ownerName:       col("Owner Name"),
    ownerEmail:      col("Owner Email"),
    address:         col("Property Address"),
    city:            col("City"),
    province:        col("Province"),
    bedrooms:        col("Bedrooms"),
    bathrooms:       col("Bathrooms"),
    rent:            col("Rent"),
    available:       col("Available Date"),
    leaseTerm:       col("Lease Term"),
    utilities:       col("Utilities"),
    pets:            col("Pet Policy"),
    parking:         col("Parking"),
    laundry:         col("Laundry"),
    smoking:         col("Smoking Policy"),
    features:        col("Key Features"),
    targetAudience:  col("Target Audience"),
    language:        col("Language"),
    platforms:        parsePlatforms_(col("Platforms")),
    status:           col("Workflow Status") || "Draft", // V — actual sheet column name
    driveFolderLink:  col("Drive Folder Link"),          // W — existing column
    finalPackageLink: col("Final Package Link") || null, // X
    publishedLink:    col("Published Link")    || null,  // Y
    listingStatus:    col("Listing Status") || col("Tenant Listing Status") || col("Public Status") || "",
    tenantListingStatus: col("Tenant Listing Status") || col("Listing Status") || "",
    publicStatus:     col("Public Status") || col("Listing Status") || "",
    openHouseDateTime: col("Open House Date / Time") || "",
    openHouseViewingInstructions: col("Open House Viewing Instructions") || "",
    openHouseParkingNotes: col("Open House Parking Notes") || "",
    outputs:          tryParse_(col("Outputs"),         {}),
    reviewStatus:     tryParse_(col("Review Status"),   {}),
    complianceFlag:   tryParse_(col("Compliance Flag"), {}),
    mediaChecklist:  tryParse_(col("Media Checklist"), [false, false, false, false]),
    driveFiles:      tryParse_(col("Drive Files"),     []),
    enhancedFolderId: col("Enhanced Folder ID") || null,
    videoUrl:         col("videoUrl")           || null,
    createdByEmail:   col("Created By Email")   || "",
    createdByAccessCode: col("Created By Access Code") || "",
    createdByRole:    col("Created By Role")    || "",
  };
}

// Build a {headerName: value} map from a listing object.
function makeDataMap_(d) {
  var m = {};
  m["Listing ID"]        = d.id              || "";
  m["Created Date"]      = d.createdDate     || new Date().toLocaleDateString("en-CA");
  m["Owner Name"]        = d.ownerName       || "";
  m["Owner Email"]       = d.ownerEmail      || "";
  m["Property Address"]  = d.address         || "";
  m["City"]              = d.city            || "";
  m["Province"]          = d.province        || "";
  m["Bedrooms"]          = d.bedrooms        || "";
  m["Bathrooms"]         = d.bathrooms       || "";
  m["Rent"]              = d.rent            || "";
  m["Available Date"]    = d.available       || "";
  m["Lease Term"]        = d.leaseTerm       || "";
  m["Utilities"]         = d.utilities       || "";
  m["Pet Policy"]        = d.pets            || "";
  m["Parking"]           = d.parking         || "";
  m["Laundry"]           = d.laundry         || "";
  m["Smoking Policy"]    = d.smoking         || "";
  m["Key Features"]      = d.features        || "";
  m["Target Audience"]   = d.targetAudience  || "";
  m["Language"]          = d.language        || "";
  m["Platforms"]          = JSON.stringify(d.platforms      || []);
  m["Workflow Status"]    = d.status          || "Draft";   // V — actual column name
  m["Drive Folder Link"]  = d.driveFolderLink || "";        // W — never overwrite with blank
  m["Final Package Link"] = d.finalPackageLink || "";       // X
  m["Published Link"]     = d.publishedLink    || "";       // Y
  m["Listing Status"]     = d.listingStatus || d.tenantListingStatus || d.publicStatus || "";
  m["Open House Date / Time"] = d.openHouseDateTime || "";
  m["Open House Viewing Instructions"] = d.openHouseViewingInstructions || "";
  m["Open House Parking Notes"] = d.openHouseParkingNotes || "";
  m["Outputs"]            = JSON.stringify(d.outputs        || {});
  m["Review Status"]      = JSON.stringify(d.reviewStatus   || {});
  m["Compliance Flag"]    = JSON.stringify(d.complianceFlag || {});
  m["Media Checklist"]      = JSON.stringify(d.mediaChecklist || [false, false, false, false]);
  m["Drive Files"]          = JSON.stringify(d.driveFiles     || []);
  m["Enhanced Folder ID"]   = d.enhancedFolderId || "";
  m["videoUrl"]             = d.videoUrl        || "";
  m["Created By Email"]     = d.createdByEmail || "";
  m["Created By Access Code"] = d.createdByAccessCode || "";
  m["Created By Role"]      = d.createdByRole || "";
  return m;
}

// Appends any headers from `headers` array that don't already exist in the sheet's row 1.
// Safe to call on sheets that already have data — never removes or reorders existing columns.
function addMissingHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E8F0FE");
    return;
  }
  var existing = getHeaderMap_(sheet);
  var lastCol  = sheet.getLastColumn();
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (existing[h] === undefined) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(h).setFontWeight("bold").setBackground("#E8F0FE");
    }
  }
}

// Targeted write: update only the videoUrl cell for one listing.
// Creates the "videoUrl" column header if it doesn't exist yet.
// Returns sheetName, rowNumber, colName, colIndex so the caller can log them.
function updateVideoUrl_(listingId, videoUrl, auth) {
  if (!listingId) throw new Error("updateVideoUrl: listingId required");
  getListingById_(listingId, auth);
  var sheet = getSheet_(LISTINGS_SHEET);

  Logger.log("[updateVideoUrl] listingId: " + listingId);
  Logger.log("[updateVideoUrl] sheet    : " + LISTINGS_SHEET);

  // Ensure the column header exists (safe on existing sheets).
  addMissingHeaders_(sheet, LISTING_HEADERS);

  var headerMap   = getHeaderMap_(sheet);
  var videoColIdx = headerMap["videoUrl"];
  if (videoColIdx === undefined) throw new Error("videoUrl column still missing after addMissingHeaders_");

  Logger.log("[updateVideoUrl] videoUrl col index (0-based): " + videoColIdx);

  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No listing rows found");

  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === listingId) {
      var rowNumber = i + 2;
      sheet.getRange(rowNumber, videoColIdx + 1).setValue(videoUrl || "");
      SpreadsheetApp.flush();
      Logger.log("[updateVideoUrl] wrote to row " + rowNumber + ", col " + (videoColIdx + 1) + " → " + videoUrl);
      return {
        success:   true,
        id:        listingId,
        videoUrl:  videoUrl,
        sheetName: LISTINGS_SHEET,
        rowNumber: rowNumber,
        colName:   "videoUrl",
        colIndex:  videoColIdx + 1,
      };
    }
  }
  throw new Error("Listing not found in sheet \"" + LISTINGS_SHEET + "\": " + listingId);
}

function saveListing_(data, auth) {
  if (!data || !data.id) throw new Error("Listing data missing id");
  var sheet = getSheet_(LISTINGS_SHEET);
  addMissingHeaders_(sheet, LISTING_HEADERS);

  var headerMap = getHeaderMap_(sheet);
  var dataMap   = makeDataMap_(data);

  var last = sheet.getLastRow();
  var existingRow = -1;

  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === data.id) { existingRow = i + 2; break; }
    }
  }

  if (existingRow > 0) {
    var existingListing = findListingById_(data.id);
    if (!canAccessListingRecord_(existingListing, auth)) {
      throw new Error("Access denied for this listing.");
    }
    // Update only the columns that exist in the header row (safe for partial schemas).
    if (auth && auth.mode === "trial") {
      dataMap["Created By Email"] = auth.email;
      dataMap["Created By Access Code"] = auth.accessCode;
      dataMap["Created By Role"] = "Trial User";
    }
    if (auth && auth.mode === "admin" && !existingListing.createdByRole) {
      dataMap["Created By Role"] = "Admin";
    }
    for (var name in dataMap) {
      var colIdx = headerMap[name];
      if (colIdx !== undefined) {
        // Do not blank out Drive Folder Link if the incoming value is empty.
        if (name === "Drive Folder Link" && !dataMap[name]) continue;
        sheet.getRange(existingRow, colIdx + 1).setValue(dataMap[name]);
      }
    }
  } else {
    // New row: build array sized to the current last column.
    if (auth && auth.mode === "trial") {
      dataMap["Created By Email"] = auth.email;
      dataMap["Created By Access Code"] = auth.accessCode;
      dataMap["Created By Role"] = "Trial User";
    } else if (auth && auth.mode === "admin") {
      dataMap["Created By Role"] = "Admin";
    }
    var numCols = sheet.getLastColumn();
    var row = new Array(numCols).fill("");
    for (var name in dataMap) {
      var colIdx = headerMap[name];
      if (colIdx !== undefined) row[colIdx] = dataMap[name];
    }
    sheet.appendRow(row);
  }

  SpreadsheetApp.flush(); // commit writes before returning response
  return { success: true, id: data.id };
}

function generateListingId_() {
  var sheet = getSheet_(LISTINGS_SHEET);
  addMissingHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  var year = new Date().getFullYear();
  var maxNum = 0;
  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var value = String(ids[i][0] || "").trim();
      var prefix = "LST-" + year + "-";
      if (value.indexOf(prefix) !== 0) continue;
      var num = Number(value.slice(prefix.length));
      if (!isNaN(num)) maxNum = Math.max(maxNum, num);
    }
  }
  return "LST-" + year + "-" + String(maxNum + 1).padStart(3, "0");
}

// ── Video URL sync ────────────────────────────────────────────────────────────
// Scans a listing's 04_Video_Output Drive subfolder for
// video__{listingId}__landscape.mp4, sets it to "Anyone with link can view",
// and writes the share URL into the videoUrl column of the sheet.

function extractDriveFolderId_(url) {
  if (!url) return null;
  var m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

function sanitizePdfFilePart_(value, fallback) {
  var cleaned = String(value || fallback || "")
    .replace(/[\\\/:*?"<>|#%\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(fallback || "Application");
}

function buildRentalApplicationPdfName_(recordId, listingId, applicantName) {
  return [
    "Rental Application",
    sanitizePdfFilePart_(recordId, "APP"),
    sanitizePdfFilePart_(listingId, "Listing"),
    sanitizePdfFilePart_(applicantName, "Applicant")
  ].join(" - ") + ".pdf";
}

function isAffirmativeJointApplicant_(value) {
  var normalized = String(value || "").trim();
  return normalized === "Yes / 有" ||
    normalized === "Yes" ||
    normalized === "有" ||
    normalized === "是" ||
    normalized === "Yes / 是";
}

function getRentalApplicationArchiveFolder_(listingId, listingFolderId) {
  var parentFolder = listingFolderId
    ? DriveApp.getFolderById(listingFolderId)
    : DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var applicationsIter = parentFolder.getFoldersByName("Applications");
  var applicationsFolder = applicationsIter.hasNext()
    ? applicationsIter.next()
    : parentFolder.createFolder("Applications");
  var listingFolderName = String(listingId || "Unknown Listing");
  var listingFolderIter = applicationsFolder.getFoldersByName(listingFolderName);
  return listingFolderIter.hasNext()
    ? listingFolderIter.next()
    : applicationsFolder.createFolder(listingFolderName);
}

function trySetDriveViewSharing_(driveItem, label) {
  try {
    driveItem.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("[trySetDriveViewSharing] " + label + " sharing skipped: " + e.message);
    if (e && e.stack) Logger.log(e.stack);
  }
}

// Sync videoUrl for one listing. Can also be called from the Apps Script editor.
function syncVideoUrl_(listingId, auth) {
  if (!listingId) throw new Error("syncVideoUrl: listingId required");
  getListingById_(listingId, auth);

  var sheet     = getSheet_(LISTINGS_SHEET);
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var last      = sheet.getLastRow();
  if (last < 2) throw new Error("No listing rows found");

  // Find the row for this listing.
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  var rowNumber = -1;
  var row       = null;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === listingId) {
      rowNumber = i + 2;
      row       = sheet.getRange(rowNumber, 1, 1, numCols).getValues()[0];
      break;
    }
  }
  if (!row) throw new Error("Listing not found: " + listingId);

  var driveFolderLink = colVal_(row, headerMap, "Drive Folder Link");
  var folderId        = extractDriveFolderId_(driveFolderLink);

  Logger.log("[syncVideoUrl] listingId        : " + listingId);
  Logger.log("[syncVideoUrl] driveFolderLink  : " + driveFolderLink);
  Logger.log("[syncVideoUrl] folderId         : " + folderId);
  Logger.log("[syncVideoUrl] sheet            : " + LISTINGS_SHEET);
  Logger.log("[syncVideoUrl] rowNumber        : " + rowNumber);

  if (!folderId) throw new Error("No Drive Folder Link found for listing: " + listingId);

  // Open 04_Video_Output subfolder.
  var listingFolder   = DriveApp.getFolderById(folderId);
  var videoFolderIter = listingFolder.getFoldersByName("04_Video_Output");
  if (!videoFolderIter.hasNext()) throw new Error("04_Video_Output folder not found for: " + listingId);
  var videoFolder = videoFolderIter.next();
  Logger.log("[syncVideoUrl] 04_Video_Output folder ID: " + videoFolder.getId());

  // Find video__{listingId}__landscape.mp4.
  var targetFileName = "video__" + listingId + "__landscape.mp4";
  var fileIter       = videoFolder.getFilesByName(targetFileName);
  if (!fileIter.hasNext()) throw new Error("File not found in 04_Video_Output: " + targetFileName);

  var videoFile = fileIter.next();
  var fileId    = videoFile.getId();
  Logger.log("[syncVideoUrl] Found file       : " + targetFileName + " (id=" + fileId + ")");

  // Ensure Anyone with link can view.
  videoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileUrl = videoFile.getUrl();
  Logger.log("[syncVideoUrl] Drive URL        : " + fileUrl);

  // Ensure videoUrl column exists and write.
  addMissingHeaders_(sheet, LISTING_HEADERS);
  var freshMap    = getHeaderMap_(sheet);
  var videoColIdx = freshMap["videoUrl"];
  if (videoColIdx === undefined) throw new Error("videoUrl column not found after addMissingHeaders_");

  sheet.getRange(rowNumber, videoColIdx + 1).setValue(fileUrl);
  SpreadsheetApp.flush();
  Logger.log("[syncVideoUrl] Wrote to row " + rowNumber + ", col " + (videoColIdx + 1) + " (videoUrl)");

  return {
    success:   true,
    id:        listingId,
    fileId:    fileId,
    fileName:  targetFileName,
    videoUrl:  fileUrl,
    sheetName: LISTINGS_SHEET,
    rowNumber: rowNumber,
    colName:   "videoUrl",
    colIndex:  videoColIdx + 1,
  };
}

// Sync all listings that have a Drive folder but no videoUrl yet.
// Can be run directly from the Apps Script editor (no underscore wrapper needed).
function syncAllVideoUrls_() {
  var listings = getListings_();
  var results  = [];
  for (var i = 0; i < listings.length; i++) {
    var listing = listings[i];
    if (listing.videoUrl) {
      results.push({ id: listing.id, skipped: true, reason: "already has videoUrl" });
      continue;
    }
    try {
      var r = syncVideoUrl_(listing.id);
      results.push(r);
    } catch (e) {
      results.push({ id: listing.id, success: false, error: e.message });
    }
  }
  return results;
}

// Runnable from Apps Script editor: click Run → syncAllVideoUrls
function syncAllVideoUrls() {
  var results = syncAllVideoUrls_();
  Logger.log(JSON.stringify(results, null, 2));
}

// ── Contact form ──────────────────────────────────────────────────────────────

function saveContact_(data) {
  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var headerMap = getHeaderMap_(sheet);
  var submittedAt = new Date().toISOString();
  var numCols = Math.max(sheet.getLastColumn(), CONTACT_HEADERS.length);
  var row = new Array(numCols).fill("");
  row[headerMap["Name"]]             = data.name    || "";
  row[headerMap["Email"]]            = data.email   || "";
  row[headerMap["Phone"]]            = data.phone   || "";
  row[headerMap["WeChat ID"]]        = data.wechat  || "";
  row[headerMap["City"]]             = data.city    || "";
  row[headerMap["Service Interest"]] = data.service || "";
  row[headerMap["Message"]]          = data.message || "";
  row[headerMap["Submitted At"]]     = submittedAt;
  row[headerMap["Approval Status"]]  = "Pending";
  row[headerMap["Approved Module"]]  = "";
  row[headerMap["Access Type"]]      = "";
  row[headerMap["Payment Status"]]   = "";
  row[headerMap["Access Code"]]      = "";
  row[headerMap["Approved At"]]      = "";
  row[headerMap["Access Expires At"]] = "";
  row[headerMap["Admin Notes"]]      = "";
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  var rowNumber = sheet.getLastRow();

  var emailWarning = null;
  try {
    var body =
      "New trial request submitted via Vanisland AI Marketing Studio.\n\n" +
      "Name:             " + (data.name    || "—") + "\n" +
      "Email:            " + (data.email   || "—") + "\n" +
      "Phone:            " + (data.phone   || "—") + "\n" +
      "WeChat ID:        " + (data.wechat  || "—") + "\n" +
      "City:             " + (data.city    || "—") + "\n" +
      "Service Interest: " + (data.service || "—") + "\n" +
      "Message:\n" + (data.message || "—") + "\n\n" +
      "Submitted At: " + submittedAt + "\n\n" +
      "Please review this request in the Admin backend.";
    MailApp.sendEmail({
      to:      "mabelclaw67@gmail.com",
      subject: "New Trial Request - Vanisland AI Marketing Studio",
      body:    body,
    });
  } catch (emailErr) {
    emailWarning = emailErr.message;
  }

  var result = rowToContactRequest_(sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0], headerMap, rowNumber);
  result.success = true;
  if (emailWarning) result.emailWarning = emailWarning;
  return result;
}

function rowToContactRequest_(row, headerMap, rowNumber) {
  function col(name) { return colVal_(row, headerMap, name); }
  return {
    rowNumber: rowNumber,
    name: col("Name"),
    email: col("Email"),
    phone: col("Phone"),
    wechat: col("WeChat ID"),
    city: col("City"),
    serviceInterest: col("Service Interest"),
    message: col("Message"),
    submittedAt: col("Submitted At"),
    approvalStatus: col("Approval Status") || "Pending",
    approvedModule: col("Approved Module"),
    accessType: col("Access Type"),
    paymentStatus: col("Payment Status"),
    accessCode: col("Access Code"),
    approvedAt: col("Approved At"),
    accessExpiresAt: col("Access Expires At"),
    approvalEmailSentAt: col("Approval Email Sent At"),
    adminNotes: col("Admin Notes"),
  };
}

function getContactRequests_(auth) {
  assertAdmin_(auth);
  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, last - 1, numCols).getValues();
  var results = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var item = rowToContactRequest_(rows[i], headerMap, i + 2);
    if (!item.name && !item.email && !item.submittedAt) continue;
    results.push(item);
  }
  return results;
}

function approveContactRequest_(body, auth) {
  assertAdmin_(auth);
  var rowNumber = Number(body.rowNumber || 0);
  if (!rowNumber || rowNumber < 2) throw new Error("approveContactRequest: valid rowNumber required");

  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var headerMap = getHeaderMap_(sheet);
  if (rowNumber > sheet.getLastRow()) throw new Error("approveContactRequest: row not found");

  var approvalStatus = String(body.approvalStatus || "").trim();
  var approvedModule = String(body.approvedModule || "").trim();
  var accessType = normalizeAccessType_(body.accessType || "");
  var paymentStatus = normalizePaymentStatus_(body.paymentStatus || "");
  var durationDays = normalizeDurationDays_(body.durationDays, accessType);
  var isApproved = approvalStatus === "Approved" || (!approvalStatus && approvedModule);
  var nowIso = new Date().toISOString();

  if (isApproved && !approvedModule) {
    throw new Error("approveContactRequest: approvedModule required when approving");
  }
  if (isApproved && !accessType) {
    accessType = "Trial";
  }
  if (isApproved && !paymentStatus) {
    paymentStatus = defaultPaymentStatusForAccessType_(accessType);
  }

  setContactField_(sheet, headerMap, rowNumber, "Approval Status", isApproved ? "Approved" : (approvalStatus || "Rejected / Not Now"));
  setContactField_(sheet, headerMap, rowNumber, "Approved Module", isApproved ? approvedModule : "");
  setContactField_(sheet, headerMap, rowNumber, "Access Type", isApproved ? accessType : "");
  setContactField_(sheet, headerMap, rowNumber, "Payment Status", isApproved ? paymentStatus : "");
  setContactField_(sheet, headerMap, rowNumber, "Access Code", isApproved ? generateAccessCode_(sheet, headerMap) : "");
  setContactField_(sheet, headerMap, rowNumber, "Approved At", isApproved ? nowIso : "");
  setContactField_(sheet, headerMap, rowNumber, "Access Expires At", isApproved ? addDaysIso_(durationDays) : "");
  setContactField_(sheet, headerMap, rowNumber, "Approval Email Sent At", "");
  if (body.adminNotes !== undefined) {
    setContactField_(sheet, headerMap, rowNumber, "Admin Notes", body.adminNotes || "");
  }
  SpreadsheetApp.flush();

  var approvalEmailSent = false;
  var approvalEmailWarning = "";
  if (isApproved) {
    var approvedRow = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    var approvedRequest = rowToContactRequest_(approvedRow, headerMap, rowNumber);
    try {
      sendTrialApprovalEmail_(approvedRequest);
      approvalEmailSent = true;
      setContactField_(sheet, headerMap, rowNumber, "Approval Email Sent At", new Date().toISOString());
      SpreadsheetApp.flush();
    } catch (emailErr) {
      approvalEmailWarning = emailErr && emailErr.message ? emailErr.message : String(emailErr || "Unknown approval email error");
      Logger.log("[approveContactRequest] approval email error: " + approvalEmailWarning);
      if (emailErr && emailErr.stack) Logger.log(emailErr.stack);
    }
  }

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  var result = rowToContactRequest_(row, headerMap, rowNumber);
  result.approvalEmailSent = approvalEmailSent;
  if (approvalEmailWarning) result.approvalEmailWarning = approvalEmailWarning;
  return result;
}

function sendTrialApprovalEmail_(request) {
  var recipient = String(request && request.email || "").trim();
  if (!recipient) throw new Error("Approval email recipient is missing");

  var name = String(request && request.name || "").trim();
  var greetingName = name || "there";
  var body =
    "Hi " + greetingName + ",\n\n" +
    "Your trial access for Vanisland AI Marketing Studio has been approved.\n\n" +
    "Website:\n" +
    "https://landlord-ai-marketing-studio.netlify.app/\n\n" +
    "Login Email:\n" +
    (request.email || "") + "\n\n" +
    "Access Code:\n" +
    (request.accessCode || "") + "\n\n" +
    "Approved Module:\n" +
    (request.approvedModule || "") + "\n\n" +
    "Access Type:\n" +
    (request.accessType || "") + "\n\n" +
    "Expiry Date:\n" +
    (request.accessExpiresAt || "") + "\n\n" +
    "Please note: this access code is temporary and will automatically expire on the expiry date above.\n\n" +
    "If you have any questions or feedback during testing, please contact Mabel.\n\n" +
    "Thank you,\n" +
    "Mabel\n" +
    "Vanisland AI Marketing Studio";

  MailApp.sendEmail({
    to: recipient,
    subject: "Your Vanisland AI Studio Trial Access Has Been Approved",
    body: body,
  });
}

function updateContactRequestNotes_(rowNumber, notes, auth) {
  assertAdmin_(auth);
  rowNumber = Number(rowNumber || 0);
  if (!rowNumber || rowNumber < 2) throw new Error("updateContactRequestNotes: valid rowNumber required");

  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var headerMap = getHeaderMap_(sheet);
  if (rowNumber > sheet.getLastRow()) throw new Error("updateContactRequestNotes: row not found");

  setContactField_(sheet, headerMap, rowNumber, "Admin Notes", notes || "");
  SpreadsheetApp.flush();

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  return rowToContactRequest_(row, headerMap, rowNumber);
}

function validateAccessCode_(email, accessCode) {
  var normalizedEmail = normalizeEmail_(email);
  var normalizedCode = String(accessCode || "").trim().toUpperCase();
  if (!normalizedEmail || !normalizedCode) {
    return invalidAccessResult_();
  }

  var sheet = getSheet_(CONTACTS_SHEET);
  addMissingHeaders_(sheet, CONTACT_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return invalidAccessResult_();

  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, last - 1, numCols).getValues();

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var item = rowToContactRequest_(row, headerMap, i + 2);
    if (normalizeEmail_(item.email) !== normalizedEmail) continue;
    if (String(item.accessCode || "").trim().toUpperCase() !== normalizedCode) continue;
    if (String(item.approvalStatus || "").trim() !== "Approved") return invalidAccessResult_();
    if (isAccessExpired_(item.accessExpiresAt)) return invalidAccessResult_();
    return {
      valid: true,
      email: item.email,
      name: item.name,
      approvedModule: item.approvedModule,
      accessType: item.accessType,
      paymentStatus: item.paymentStatus,
      accessCode: item.accessCode,
      approvedAt: item.approvedAt,
      accessExpiresAt: item.accessExpiresAt,
    };
  }

  return invalidAccessResult_();
}

function invalidAccessResult_() {
  return {
    valid: false,
    message: "Access code not found, expired, or not approved. Please contact Mabel.",
  };
}

function setContactField_(sheet, headerMap, rowNumber, fieldName, value) {
  var colIdx = headerMap[fieldName];
  if (colIdx === undefined) throw new Error("Missing Contacts column: " + fieldName);
  sheet.getRange(rowNumber, colIdx + 1).setValue(value);
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAccessType_(value) {
  var text = String(value || "").trim().toLowerCase();
  if (text === "trial") return "Trial";
  if (text === "paid") return "Paid";
  if (text === "manual" || text.indexOf("complimentary") >= 0) return "Manual";
  return "";
}

function normalizePaymentStatus_(value) {
  var text = String(value || "").trim().toLowerCase();
  if (text === "paid") return "Paid";
  if (text === "unpaid") return "Unpaid";
  if (text === "manual") return "Manual";
  if (text === "not required" || text === "notrequired") return "Not Required";
  return "";
}

function normalizeDurationDays_(value, accessType) {
  var num = Number(value || 0);
  if (num === 7 || num === 10 || num === 30 || num === 90) return num;
  if (String(accessType || "") === "Trial") return 10;
  if (String(accessType || "") === "Paid") return 30;
  if (String(accessType || "") === "Manual") return 30;
  return 30;
}

function defaultPaymentStatusForAccessType_(accessType) {
  if (accessType === "Paid") return "Paid";
  if (accessType === "Manual") return "Not Required";
  return "Unpaid";
}

function isAccessExpired_(expiresAt) {
  if (!expiresAt) return false;
  var dt = new Date(expiresAt);
  if (isNaN(dt.getTime())) return false;
  return dt.getTime() < Date.now();
}

function addDaysIso_(days) {
  var dt = new Date();
  dt.setDate(dt.getDate() + Number(days || 0));
  return dt.toISOString();
}

function generateAccessCode_(sheet, headerMap) {
  var year = String(new Date().getFullYear());
  var last = sheet.getLastRow();
  var maxSeq = 0;
  if (last >= 2) {
    var rows = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < rows.length; i++) {
      var code = String(colVal_(rows[i], headerMap, "Access Code") || "").trim().toUpperCase();
      var match = code.match(/^VAI-(\d{4})-(\d{4})$/);
      if (!match || match[1] !== year) continue;
      maxSeq = Math.max(maxSeq, Number(match[2]) || 0);
    }
  }
  return "VAI-" + year + "-" + String(maxSeq + 1).padStart(4, "0");
}

// ── File upload → Drive (legacy — kept for backward compat) ──────────────────

function uploadFile_(body, auth) {
  if (!body.listingId) throw new Error("uploadFile: listingId required");
  if (!body.data)      throw new Error("uploadFile: base64 data required");
  getListingById_(body.listingId, auth);

  var parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var listingFolder;
  var it = parentFolder.getFoldersByName(body.listingId);
  listingFolder = it.hasNext() ? it.next() : parentFolder.createFolder(body.listingId);

  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mimeType || "application/octet-stream",
    body.fileName || ("upload_" + Date.now())
  );
  var file = listingFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId   = file.getId();
  var fileUrl  = file.getUrl();
  var thumbUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";

  // Update Drive Files cell via header-based lookup.
  var sheet     = getSheet_(LISTINGS_SHEET);
  var headerMap = getHeaderMap_(sheet);
  var filesColIdx = headerMap["Drive Files"];
  var last = sheet.getLastRow();
  if (last >= 2 && filesColIdx !== undefined) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === body.listingId) {
        var filesCell = sheet.getRange(i + 2, filesColIdx + 1);
        var existing  = tryParse_(filesCell.getValue(), []);
        existing.push({ name: blob.getName(), fileId: fileId, url: fileUrl, thumbUrl: thumbUrl, uploadedAt: new Date().toISOString() });
        filesCell.setValue(JSON.stringify(existing));
        break;
      }
    }
  }

  return { fileId: fileId, url: fileUrl, thumbUrl: thumbUrl, fileName: blob.getName() };
}

// ── List JPG/PNG files from a listing's own Drive folder ─────────────────────
// Reads the folder via its ID (extracted from the Drive Folder Link on the frontend).
// Does not modify any files.

function getListingFolderFiles_(folderId, listingId, auth) {
  var resolvedFolderId = resolveListingFolderIdForAccess_(folderId, listingId, auth);
  var folder = DriveApp.getFolderById(resolvedFolderId);
  return listDriveMediaFiles_(folder, { includeVideos: false });
}

function getListingSubfolderFiles_(folderId, subfolderName, listingId, auth) {
  if (!subfolderName) throw new Error("getListingSubfolder: subfolderName required");
  var resolvedFolderId = resolveListingFolderIdForAccess_(folderId, listingId, auth);
  var parent = DriveApp.getFolderById(resolvedFolderId);
  var folders = parent.getFoldersByName(subfolderName);
  if (!folders.hasNext()) {
    return {
      subfolderFolderId: "",
      subfolderUrl: "",
      files: [],
    };
  }
  var folder = folders.next();
  return {
    subfolderFolderId: auth && auth.mode === "admin" ? folder.getId() : "",
    subfolderUrl: auth && auth.mode === "admin" ? folder.getUrl() : "",
    files: listDriveMediaFiles_(folder, { includeVideos: true }),
  };
}

function resolveListingFolderIdForAccess_(folderId, listingId, auth) {
  if (folderId) {
    assertFolderAccess_(folderId, listingId, auth);
    return folderId;
  }
  if (!listingId) throw new Error("Listing media lookup requires listingId.");
  var listing = findListingById_(listingId);
  if (!listing || !canAccessListingRecord_(listing, auth)) {
    throw new Error("Access denied for this listing.");
  }
  var resolved = extractDriveFolderId_(listing.driveFolderLink || "");
  if (!resolved) throw new Error("Drive folder not found for this listing.");
  return resolved;
}

function assertFolderAccess_(folderId, listingId, auth) {
  if (auth && auth.mode === "admin") return;
  if (!auth || auth.mode !== "trial") {
    throw new Error("Access denied for this listing folder.");
  }
  if (listingId) {
    var listing = findListingById_(listingId);
    if (!listing || !canAccessListingRecord_(listing, auth)) {
      throw new Error("Access denied for this listing.");
    }
    var expected = extractDriveFolderId_(listing.driveFolderLink || "");
    if (expected && expected === folderId) return;
  }
  var ownedListing = findListingByFolderId_(folderId, auth.email);
  if (!ownedListing) throw new Error("Access denied for this listing folder.");
}

function findListingByFolderId_(folderId, ownerEmail) {
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var numCols = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows = sheet.getRange(2, 1, last - 1, numCols).getValues();
  var auth = { mode: "trial", email: ownerEmail };
  var listings = rows
    .map(function(row) { return rowToListing_(row, headerMap); })
    .filter(function(item) { return canAccessListingRecord_(item, auth); });
  for (var i = 0; i < listings.length; i++) {
    if (extractDriveFolderId_(listings[i].driveFolderLink || "") === folderId) return listings[i];
  }
  return null;
}

function listDriveMediaFiles_(folder, options) {
  var includeVideos = !!(options && options.includeVideos);
  var files  = [];
  var it     = folder.getFiles();
  while (it.hasNext()) {
    var file = it.next();
    var mime = file.getMimeType();
    var isImage = mime === "image/jpeg" || mime === "image/png";
    var isVideo = includeVideos && mime === "video/mp4";
    if (isImage || isVideo) {
      var fileId = file.getId();
      var entry = {
        name:       file.getName(),
        fileId:     fileId,
        mimeType:   mime,
        url:        file.getUrl(),
        thumbUrl:   "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800",
        thumbUrlLg: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1600",
      };
      if (isImage) {
      var blob = file.getBlob();
      var contentType = blob.getContentType();
      var base64 = Utilities.base64Encode(blob.getBytes());
      var dataUrl = "data:" + contentType + ";base64," + base64;
        entry.dataUrl = dataUrl;
      }
      files.push(entry);
    }
  }
  return files;
}

// ── Rental Application Intake ─────────────────────────────────────────────────

function rowToApplication_(row, headerMap) {
  function col(name) { return colVal_(row, headerMap, name); }
  var legacySupportingDocs = col("Indicate your and Joint Applicant willingness to provide supporting documents (e.g., proof of income, credit report).");
  return {
    // System
    recordId:        col("Record ID"),
    listingId:       col("Listing ID"),
    submittedAt:     col("Submitted At"),
    // Applicant info
    applicantName:   col("Applicant Name"),
    email:           col("Email"),
    phone:           col("Phone"),
    dateOfBirth:     col("Date of Birth"),
    currentAddress:  col("Current Address"),
    wechat:          col("WeChat"),
    // Employment
    employmentStatus: col("Employment Status"),
    employer:        col("Employer"),
    monthlyIncome:   col("Monthly Income"),
    // Reference & credit
    landlordReference: col("Landlord Reference"),
    creditHistory:   col("Credit History"),
    // Occupancy
    moveInDate:      col("Move-in Date"),
    leaseTerm:       col("Lease Term Requested"),
    occupants:       col("Occupants"),
    adults:          col("Adults"),
    minors:          col("Minors"),
    occupantNamesAges: col("Occupant Names Ages"),
    // Joint applicant
    hasJointApplicant:      col("Has Joint Applicant") || col("Joint Applicant / Co-Applicant Information"),
    jointName:              col("Joint Name") || col("Joint Applicant Full Legal Name"),
    jointPhone:             col("Joint Phone") || col("Joint Applicant Phone Number"),
    jointEmail:             col("Joint Email") || col("Joint Applicant Email Address"),
    jointDob:               col("Joint DOB") || col("Joint Applicant's Date of Birth (DD/MM/YYYY)"),
    jointAddress:           col("Joint Address") || col("Joint Applicant Current Address"),
    jointEmployment:        col("Joint Employment") || col("Joint Applicant Employment / Income Source"),
    jointIncome:            col("Joint Income") || col("Joint Applicant Monthly Income"),
    jointEmployerContact:   col("Joint Employer Contact") || col("Joint Applicant Employer Contact ") || col("Joint Applicant Employer Contact"),
    jointLandlordReference: col("Joint Landlord Reference") || col("Joint Applicant Current Landlord Reference"),
    jointCreditInfo:        col("Joint Credit Info") || col("Joint Applicant Credit Information"),
    jointProofOfIncome:     col("Joint Proof of Income") || extractSupportingDocsChoice_(legacySupportingDocs, "Joint Applicant"),
    // Deposit
    depositFundsAvailable: col("Deposit Funds Available"),
    depositAgreement:      col("Deposit Agreement"),
    // Pets
    hasPets:         col("Has Pets"),
    petDepositFunds: col("Pet Deposit Funds"),
    petDetails:      col("Pet Details"),
    // Tenancy history
    evictionHistory: col("Eviction History"),
    // Smoking
    smokesVapesCannabis: col("Smokes Vapes Cannabis"),
    noSmokingAgreement:  col("No Smoking Agreement"),
    // Documents
    proofOfIncome:   col("Proof of Income") || extractSupportingDocsChoice_(legacySupportingDocs, "Applicant"),
    // Insurance
    hasTenantInsurance:        col("Has Tenant Insurance"),
    tenantInsuranceAgreement:  col("Tenant Insurance Agreement"),
    proofInsuranceBeforeMoveIn: col("Proof Insurance Before Move-in"),
    // Additional
    reasonForMoving: col("Reason for Moving"),
    parkingRequest:  col("Parking Request"),
    additionalNotes: col("Additional Notes"),
    // Admin
    pdfUrl:        col("PDF URL"),
    reviewStatus:  col("Review Status") || "Pending",
    internalNotes: col("Internal Notes"),
    updatedAt:     col("Updated At"),
  };
}

function saveRentalApplication_(body) {
  if (!body.listingId) throw new Error("saveRentalApplication: listingId required");

  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var headerMap = getHeaderMap_(sheet);

  // Generate Record ID based on total existing rows (not just for this listing).
  var last = sheet.getLastRow();
  var existingCount = last >= 2 ? last - 1 : 0;
  var year = new Date().getFullYear();
  var num  = String(existingCount + 1).padStart(3, "0");
  var recordId = "APP-" + year + "-" + num;
  var submittedAt = new Date().toISOString();
  var supportingDocsValue = [
    body.proofOfIncome ? "Applicant: " + body.proofOfIncome : "",
    body.jointProofOfIncome ? "Joint Applicant: " + body.jointProofOfIncome : ""
  ].filter(Boolean).join(" | ");

  // Build data map.
  var dataMap = {
    // System
    "Record ID":    recordId,
    "Listing ID":   body.listingId,
    "Submitted At": submittedAt,
    // Applicant info
    "Applicant Name":  body.applicantName   || "",
    "Email":           body.email           || "",
    "Phone":           body.phone           || "",
    "Date of Birth":   body.dateOfBirth     || "",
    "Current Address": body.currentAddress  || "",
    "WeChat":          body.wechat          || "",
    // Employment
    "Employment Status": body.employmentStatus || "",
    "Employer":          body.employer         || "",
    "Monthly Income":    body.monthlyIncome    || "",
    // Reference & Credit
    "Landlord Reference": body.landlordReference || "",
    "Credit History":     body.creditHistory     || "",
    // Occupancy
    "Move-in Date":        body.moveInDate        || "",
    "Lease Term Requested": body.leaseTerm        || "",
    "Occupants":           body.occupants         || "",
    "Adults":              body.adults            || "",
    "Minors":              body.minors            || "",
    "Occupant Names Ages": body.occupantNamesAges || "",
    // Joint applicant
    "Has Joint Applicant":      body.hasJointApplicant      || "",
    "Joint Name":               body.jointName              || "",
    "Joint Phone":              body.jointPhone             || "",
    "Joint Email":              body.jointEmail             || "",
    "Joint DOB":                body.jointDob               || "",
    "Joint Address":            body.jointAddress           || "",
    "Joint Employment":         body.jointEmployment        || "",
    "Joint Income":             body.jointIncome            || "",
    "Joint Employer Contact":   body.jointEmployerContact   || "",
    "Joint Landlord Reference": body.jointLandlordReference || "",
    "Joint Credit Info":        body.jointCreditInfo        || "",
    "Joint Proof of Income":    body.jointProofOfIncome     || "",
    // Legacy joint applicant columns kept for sheet compatibility
    "Joint Applicant / Co-Applicant Information": body.hasJointApplicant || "",
    "Joint Applicant Full Legal Name": body.jointName || "",
    "Joint Applicant Phone Number": body.jointPhone || "",
    "Joint Applicant Email Address": body.jointEmail || "",
    "Joint Applicant's Date of Birth (DD/MM/YYYY)": body.jointDob || "",
    "Joint Applicant Current Address": body.jointAddress || "",
    "Joint Applicant Employment / Income Source": body.jointEmployment || "",
    "Joint Applicant Monthly Income": body.jointIncome || "",
    "Joint Applicant Employer Contact ": body.jointEmployerContact || "",
    "Joint Applicant Current Landlord Reference": body.jointLandlordReference || "",
    "Joint Applicant Credit Information": body.jointCreditInfo || "",
    // Deposit
    "Deposit Funds Available": body.depositFundsAvailable || "",
    "Deposit Agreement":       body.depositAgreement      || "",
    // Pets
    "Has Pets":         body.hasPets         || "",
    "Pet Deposit Funds": body.petDepositFunds || "",
    "Pet Details":      body.petDetails      || "",
    // Tenancy history
    "Eviction History": body.evictionHistory || "",
    // Smoking
    "Smokes Vapes Cannabis": body.smokesVapesCannabis || "",
    "No Smoking Agreement":  body.noSmokingAgreement  || "",
    // Documents
    "Proof of Income": body.proofOfIncome || "",
    "Indicate your and Joint Applicant willingness to provide supporting documents (e.g., proof of income, credit report).": supportingDocsValue,
    // Insurance
    "Has Tenant Insurance":        body.hasTenantInsurance        || "",
    "Tenant Insurance Agreement":  body.tenantInsuranceAgreement  || "",
    "Proof Insurance Before Move-in": body.proofInsuranceBeforeMoveIn || "",
    // Additional
    "Reason for Moving": body.reasonForMoving || "",
    "Parking Request":   body.parkingRequest  || "",
    "Additional Notes":  body.additionalNotes || "",
    // Admin
    "PDF URL":       "",
    "Review Status": "Pending",
    "Internal Notes": "",
    "Updated At":    submittedAt,
  };

  // Append initial row (without PDF URL yet).
  var numCols = Math.max(sheet.getLastColumn(), INTAKE_HEADERS.length);
  var row = new Array(numCols).fill("");
  for (var key in dataMap) {
    var idx = headerMap[key];
    if (idx !== undefined) row[idx] = dataMap[key];
  }
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  var newRowNumber = sheet.getLastRow();

  // Look up listing's Drive folder (Apps Script side, avoids passing folderId from client).
  var folderId = null;
  try {
    var listingsSheet = getSheet_(LISTINGS_SHEET);
    var lNumCols  = listingsSheet.getLastColumn();
    var lHeaderMap = getHeaderMap_(listingsSheet);
    var lLast = listingsSheet.getLastRow();
    if (lLast >= 2) {
      var lIds = listingsSheet.getRange(2, 1, lLast - 1, 1).getValues();
      for (var i = 0; i < lIds.length; i++) {
        if (lIds[i][0] === body.listingId) {
          var lRow = listingsSheet.getRange(i + 2, 1, 1, lNumCols).getValues()[0];
          var dfl  = colVal_(lRow, lHeaderMap, "Drive Folder Link");
          folderId = extractDriveFolderId_(dfl);
          break;
        }
      }
    }
  } catch (e) {
    Logger.log("[saveRentalApplication] Could not look up folderId: " + e.message);
  }

  // Generate PDF and upload to the listing's Applications archive folder.
  var pdfUrl = "";
  var pdfError = "";
  var subfolderUrl = "";
  try {
    var appFolder = getRentalApplicationArchiveFolder_(body.listingId, folderId);
    trySetDriveViewSharing_(appFolder, "archive folder");
    subfolderUrl = appFolder.getUrl();

    var pdfBlob = generateApplicationPdf_(dataMap, recordId);
    var pdfFileName = buildRentalApplicationPdfName_(
      recordId,
      body.listingId,
      body.applicantName || body.applicantFullName || "Applicant"
    );
    var existingPdf = appFolder.getFilesByName(pdfFileName);
    while (existingPdf.hasNext()) { existingPdf.next().setTrashed(true); }
    var pdfFile = appFolder.createFile(pdfBlob.setName(pdfFileName));
    trySetDriveViewSharing_(pdfFile, "pdf file");
    pdfUrl = pdfFile.getUrl();

    // Write PDF URL back to row.
    var pdfColIdx       = headerMap["PDF URL"];
    var updatedAtColIdx = headerMap["Updated At"];
    if (pdfColIdx !== undefined) {
      sheet.getRange(newRowNumber, pdfColIdx + 1).setValue(pdfUrl);
    }
    if (updatedAtColIdx !== undefined) {
      sheet.getRange(newRowNumber, updatedAtColIdx + 1).setValue(new Date().toISOString());
    }
    SpreadsheetApp.flush();
  } catch (e) {
    pdfError = e && e.message ? e.message : String(e);
    Logger.log("[saveRentalApplication] PDF/upload error: " + e.message);
    if (e && e.stack) Logger.log(e.stack);
  }

  return {
    success:      true,
    recordId:     recordId,
    pdfUrl:       pdfUrl,
    pdfError:     pdfError,
    subfolderUrl: subfolderUrl,
    submittedAt:  submittedAt,
  };
}

function generateApplicationPdf_(data, recordId) {
  var doc  = DocumentApp.create("temp_application_" + recordId);
  var body = doc.getBody();
  var hasJointApplicant = isAffirmativeJointApplicant_(
    data["Has Joint Applicant"] || data["Joint Applicant / Co-Applicant Information"] || ""
  );
  var jointEmployment = extractJointEmploymentParts_(data["Joint Employment"] || data["Joint Applicant Employment / Income Source"]);
  var jointProofOfIncome = data["Joint Proof of Income"] || extractSupportingDocsChoice_(
    data["Indicate your and Joint Applicant willingness to provide supporting documents (e.g., proof of income, credit report)."],
    "Joint Applicant"
  );

  function field(label, key) {
    body.appendParagraph(label + ": " + (data[key] || "—"));
  }
  function fieldValue(label, value) {
    body.appendParagraph(label + ": " + (value || "—"));
  }
  function section(title) {
    body.appendParagraph("");
    body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  }

  body.appendParagraph("RESIDENTIAL TENANCY APPLICATION").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("");
  body.appendParagraph("Record ID:    " + (data["Record ID"] || recordId));
  body.appendParagraph("Listing ID:   " + (data["Listing ID"] || ""));
  body.appendParagraph("Submitted At: " + (data["Submitted At"] || ""));

  section("APPLICANT INFORMATION");
  field("Name",             "Applicant Name");
  field("Email",            "Email");
  field("Phone",            "Phone");
  field("Date of Birth",    "Date of Birth");
  field("Current Address",  "Current Address");
  field("WeChat",           "WeChat");

  section("EMPLOYMENT / INCOME");
  field("Employment Status", "Employment Status");
  field("Employer",          "Employer");
  field("Monthly Income",    "Monthly Income");

  section("LANDLORD REFERENCE & CREDIT");
  field("Landlord Reference", "Landlord Reference");
  field("Credit History",     "Credit History");

  section("MOVE-IN & OCCUPANCY");
  field("Preferred Move-in Date", "Move-in Date");
  field("Lease Term",             "Lease Term Requested");
  field("Total Occupants",        "Occupants");
  field("Adults",                 "Adults");
  field("Minors",                 "Minors");
  field("Occupant Names & Ages",  "Occupant Names Ages");

  if (hasJointApplicant) {
    section("JOINT APPLICANT");
    field("Joint Applicant Name",             "Joint Name");
    field("Joint Applicant Phone",            "Joint Phone");
    field("Joint Applicant Email",            "Joint Email");
    field("Joint Applicant DOB",              "Joint DOB");
    field("Joint Applicant Address",          "Joint Address");
    fieldValue("Joint Applicant Employment Status", jointEmployment.status);
    fieldValue("Joint Applicant Employer / Income Source", jointEmployment.source);
    field("Joint Applicant Monthly Income",   "Joint Income");
    field("Joint Applicant Employer Contact", "Joint Employer Contact");
    field("Joint Applicant Landlord Ref",     "Joint Landlord Reference");
    field("Joint Applicant Credit History",   "Joint Credit Info");
    fieldValue("Joint Applicant Proof of Income", jointProofOfIncome);
  }

  section("LEASE & DEPOSIT");
  field("Deposit Funds Available", "Deposit Funds Available");
  field("Deposit Agreement",       "Deposit Agreement");

  section("PETS");
  field("Has Pets",         "Has Pets");
  field("Pet Deposit Funds", "Pet Deposit Funds");
  field("Pet Details",       "Pet Details");

  section("TENANCY HISTORY");
  field("Eviction History", "Eviction History");

  section("SMOKING / VAPING / CANNABIS");
  field("Smokes/Vapes/Cannabis", "Smokes Vapes Cannabis");
  field("No Smoking Agreement",  "No Smoking Agreement");

  section("SUPPORTING DOCUMENTS");
  field("Can Provide Proof of Income", "Proof of Income");

  section("TENANT INSURANCE");
  field("Has Tenant Insurance",          "Has Tenant Insurance");
  field("Insurance Agreement",           "Tenant Insurance Agreement");
  field("Proof of Insurance Before Move-in", "Proof Insurance Before Move-in");

  section("ADDITIONAL INFORMATION");
  field("Reason for Moving", "Reason for Moving");
  field("Parking Request",   "Parking Request");
  field("Additional Notes",  "Additional Notes");

  doc.saveAndClose();
  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs("application/pdf");
  docFile.setTrashed(true);
  return pdfBlob;
}

function getApplicationsByListing_(listingId, auth) {
  if (!listingId) throw new Error("getApplicationsByListing: listingId required");
  getListingById_(listingId, auth);
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows      = sheet.getRange(2, 1, last - 1, numCols).getValues();
  return rows
    .filter(function(row) { return colVal_(row, headerMap, "Listing ID") === listingId; })
    .map(function(row) { return rowToApplication_(row, headerMap); });
}

function getAllApplications_(auth) {
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows      = sheet.getRange(2, 1, last - 1, numCols).getValues();
  return rows
    .filter(function(row) { return !!colVal_(row, headerMap, "Record ID"); })
    .map(function(row) { return rowToApplication_(row, headerMap); })
    .filter(function(app) {
      if (!auth || auth.mode === "admin") return true;
      return !!findListingByIdForEmail_(app.listingId, auth.email);
    });
}

function getApplicationById_(applicationId, auth) {
  if (!applicationId) throw new Error("getApplicationById: applicationId required");
  var sheet = getSheet_(INTAKE_SHEET);
  var last  = sheet.getLastRow();
  if (last < 2) throw new Error("No application records found");
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var rows      = sheet.getRange(2, 1, last - 1, numCols).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (colVal_(rows[i], headerMap, "Record ID") === applicationId) {
      var app = rowToApplication_(rows[i], headerMap);
      if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
        throw new Error("Access denied for this listing.");
      }
      return app;
    }
  }
  throw new Error("Application not found: " + applicationId);
}

function updateApplicationStatus_(applicationId, reviewStatus, auth) {
  if (!applicationId) throw new Error("updateApplicationStatus: applicationId required");
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No records found");
  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var ids       = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === applicationId) {
      var row = sheet.getRange(i + 2, 1, 1, numCols).getValues()[0];
      var app = rowToApplication_(row, headerMap);
      if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
        throw new Error("Access denied for this listing.");
      }
      var rowNumber = i + 2;
      var statusColIdx    = headerMap["Review Status"];
      var updatedAtColIdx = headerMap["Updated At"];
      if (statusColIdx !== undefined) {
        sheet.getRange(rowNumber, statusColIdx + 1).setValue(reviewStatus);
      }
      if (updatedAtColIdx !== undefined) {
        sheet.getRange(rowNumber, updatedAtColIdx + 1).setValue(new Date().toISOString());
      }
      SpreadsheetApp.flush();
      return { success: true, recordId: applicationId, reviewStatus: reviewStatus };
    }
  }
  throw new Error("Application not found: " + applicationId);
}

function updateApplicationNotes_(applicationId, notes, auth) {
  if (!applicationId) throw new Error("updateApplicationNotes: applicationId required");
  var sheet = getSheet_(INTAKE_SHEET);
  addMissingHeaders_(sheet, INTAKE_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) throw new Error("No records found");
  var headerMap = getHeaderMap_(sheet);
  var ids       = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === applicationId) {
      var row = sheet.getRange(i + 2, 1, 1, sheet.getLastColumn()).getValues()[0];
      var app = rowToApplication_(row, headerMap);
      if (auth && auth.mode === "trial" && !findListingByIdForEmail_(app.listingId, auth.email)) {
        throw new Error("Access denied for this listing.");
      }
      var rowNumber       = i + 2;
      var notesColIdx     = headerMap["Internal Notes"];
      var updatedAtColIdx = headerMap["Updated At"];
      if (notesColIdx !== undefined) {
        sheet.getRange(rowNumber, notesColIdx + 1).setValue(notes || "");
      }
      if (updatedAtColIdx !== undefined) {
        sheet.getRange(rowNumber, updatedAtColIdx + 1).setValue(new Date().toISOString());
      }
      SpreadsheetApp.flush();
      return { success: true, recordId: applicationId };
    }
  }
  throw new Error("Application not found: " + applicationId);
}

// ── Upload into a subfolder of the listing's own Drive folder ─────────────────
// body: { folderId, subfolderName (optional), fileName, mimeType, data (base64) }
//
// subfolderName examples:
//   ""                     → listing folder root  (Add More Photos)
//   "02_AI_Enhanced_Photos" → AI-beautified images
//   "03_Cover_Images"       → social media covers
//   "04_Video_Output"       → video exports
//
// Subfolders are created on first use; existing ones are reused.
// Original photos in the folder root are never moved or modified.

function uploadToSubfolder_(body, auth) {
  if (!body.folderId) throw new Error("uploadToSubfolder: folderId required");
  if (!body.data)     throw new Error("uploadToSubfolder: base64 data required");
  assertFolderAccess_(body.folderId, body.listingId || "", auth);

  var parent = DriveApp.getFolderById(body.folderId);

  var target;
  if (body.subfolderName) {
    var it = parent.getFoldersByName(body.subfolderName);
    target = it.hasNext() ? it.next() : parent.createFolder(body.subfolderName);
  } else {
    target = parent;
  }

  // Delete any existing file with the same name so re-runs overwrite cleanly.
  var fileName = body.fileName || ("upload_" + Date.now());
  var existing = target.getFilesByName(fileName);
  while (existing.hasNext()) { existing.next().setTrashed(true); }

  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mimeType || "application/octet-stream",
    fileName
  );
  var file = target.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  return {
    fileId:          fileId,
    url:             file.getUrl(),
    thumbUrl:        "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400",
    fileName:        blob.getName(),
    subfolderFolderId: target.getId(),
    subfolderUrl:    target.getUrl(),
  };
}
