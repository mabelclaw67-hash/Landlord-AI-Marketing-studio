// ============================================================
//  Vanisland AI Marketing Studio — Apps Script Backend v0.2
//  Spreadsheet ID : 1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4
//  Drive Folder ID: 1RNF_WZWsDECSnIqnaZuXWsbUy-xtmE2r
// ============================================================

var SPREADSHEET_ID  = "1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4";
var DRIVE_FOLDER_ID = "1RNF_WZWsDECSnIqnaZuXWsbUy-xtmE2r";
var LISTINGS_SHEET  = "01 Listings";
var CONTACTS_SHEET  = "Contacts";

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
  "Status",            // V 21
  "Drive Folder Link", // W 22  — existing column, source of truth for photos
  "Outputs",           // X 23  JSON
  "Review Status",     // Y 24  JSON
  "Compliance Flag",   // Z 25  JSON
  "Media Checklist",      // AA 26 JSON
  "Drive Files",          // AB 27 JSON
  "Enhanced Folder ID",   // AC 28 — 02_AI_Enhanced_Photos subfolder Drive ID
];

// ── Router ───────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";
    if (action === "getListings")      return ok(getListings_());
    if (action === "getListingFolder") return ok(getListingFolderFiles_(e.parameter.folderId));
    if (action === "ping")             return ok({ status: "connected" });
    return err("Unknown GET action: " + action);
  } catch (ex) {
    return err(ex.message);
  }
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action || "";
    if (action === "getListings")       return ok(getListings_());        // POST avoids GET cache
    if (action === "saveListing")       return ok(saveListing_(body.data));
    if (action === "saveContact")       return ok(saveContact_(body.data));
    if (action === "uploadFile")        return ok(uploadFile_(body));
    if (action === "uploadToSubfolder") return ok(uploadToSubfolder_(body));
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

function tryParse_(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str) || fallback; }
  catch (_) { return fallback; }
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

function getListings_() {
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];

  var numCols   = sheet.getLastColumn();
  var headerMap = getHeaderMap_(sheet);
  var data      = sheet.getRange(2, 1, last - 1, numCols).getValues();

  return data
    .map(function(row) { return rowToListing_(row, headerMap); })
    .filter(function(l) { return !!l.id; });
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
    platforms:       parsePlatforms_(col("Platforms")),
    status:          col("Status") || "Draft",
    driveFolderLink: col("Drive Folder Link"),          // W — existing column
    outputs:         tryParse_(col("Outputs"),         {}),
    reviewStatus:    tryParse_(col("Review Status"),   {}),
    complianceFlag:  tryParse_(col("Compliance Flag"), {}),
    mediaChecklist:  tryParse_(col("Media Checklist"), [false, false, false, false]),
    driveFiles:      tryParse_(col("Drive Files"),     []),
    enhancedFolderId: col("Enhanced Folder ID") || null,
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
  m["Platforms"]         = JSON.stringify(d.platforms      || []);
  m["Status"]            = d.status          || "Draft";
  m["Drive Folder Link"] = d.driveFolderLink || "";   // W — never overwrite with blank
  m["Outputs"]           = JSON.stringify(d.outputs        || {});
  m["Review Status"]     = JSON.stringify(d.reviewStatus   || {});
  m["Compliance Flag"]   = JSON.stringify(d.complianceFlag || {});
  m["Media Checklist"]      = JSON.stringify(d.mediaChecklist || [false, false, false, false]);
  m["Drive Files"]          = JSON.stringify(d.driveFiles     || []);
  m["Enhanced Folder ID"]   = d.enhancedFolderId             || "";
  return m;
}

function saveListing_(data) {
  if (!data || !data.id) throw new Error("Listing data missing id");
  var sheet = getSheet_(LISTINGS_SHEET);
  ensureHeaders_(sheet, LISTING_HEADERS);

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
    // Update only the columns that exist in the header row (safe for partial schemas).
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

// ── Contact form ──────────────────────────────────────────────────────────────

function saveContact_(data) {
  var sheet   = getSheet_(CONTACTS_SHEET);
  var headers = ["Name", "Email", "Phone", "WeChat ID", "City", "Service Interest", "Message", "Submitted At"];
  ensureHeaders_(sheet, headers);
  var submittedAt = new Date().toISOString();
  sheet.appendRow([
    data.name    || "",
    data.email   || "",
    data.phone   || "",
    data.wechat  || "",
    data.city    || "",
    data.service || "",
    data.message || "",
    submittedAt,
  ]);

  var emailWarning = null;
  try {
    var body =
      "New service inquiry submitted via Vanisland AI Marketing Studio.\n\n" +
      "Name:             " + (data.name    || "—") + "\n" +
      "Email:            " + (data.email   || "—") + "\n" +
      "Phone:            " + (data.phone   || "—") + "\n" +
      "WeChat ID:        " + (data.wechat  || "—") + "\n" +
      "City:             " + (data.city    || "—") + "\n" +
      "Service Interest: " + (data.service || "—") + "\n" +
      "Message:\n" + (data.message || "—") + "\n\n" +
      "Submitted At: " + submittedAt;
    MailApp.sendEmail({
      to:      "mabelclaw67@gmail.com",
      subject: "New AI Marketing Studio Service Inquiry",
      body:    body,
    });
  } catch (emailErr) {
    emailWarning = emailErr.message;
  }

  return emailWarning ? { success: true, emailWarning: emailWarning } : { success: true };
}

// ── File upload → Drive (legacy — kept for backward compat) ──────────────────

function uploadFile_(body) {
  if (!body.listingId) throw new Error("uploadFile: listingId required");
  if (!body.data)      throw new Error("uploadFile: base64 data required");

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

function getListingFolderFiles_(folderId) {
  if (!folderId) throw new Error("getListingFolder: folderId required");
  var folder = DriveApp.getFolderById(folderId);
  var files  = [];
  var it     = folder.getFiles();
  while (it.hasNext()) {
    var file = it.next();
    var mime = file.getMimeType();
    if (mime === "image/jpeg" || mime === "image/png") {
      var fileId = file.getId();
      var blob = file.getBlob();
      var contentType = blob.getContentType();
      var base64 = Utilities.base64Encode(blob.getBytes());
      var dataUrl = "data:" + contentType + ";base64," + base64;
      files.push({
        name:       file.getName(),
        fileId:     fileId,
        url:        file.getUrl(),
        thumbUrl:   "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800",
        thumbUrlLg: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1600",
        dataUrl:    dataUrl,
      });
    }
  }
  return files;
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

function uploadToSubfolder_(body) {
  if (!body.folderId) throw new Error("uploadToSubfolder: folderId required");
  if (!body.data)     throw new Error("uploadToSubfolder: base64 data required");

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
