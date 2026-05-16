// ============================================================
// AI Home Sale Marketing Studio — Read/Write Apps Script
// Spreadsheet ID: 1z-pCCkJt0XcLmbzPL8ZDKw8fEmLNPc9X7CpRj7FspxQ
// ============================================================

var HOME_SALE_SPREADSHEET_ID = "1z-pCCkJt0XcLmbzPL8ZDKw8fEmLNPc9X7CpRj7FspxQ";
var HOME_SALE_DRIVE_FOLDER_ID = "1u0SHW4PqZUuPARtehbTumu90GFKSuvKI";
var HOME_SALE_LISTINGS_SHEET = "01 Sale Listings";
var HOME_SALE_MEDIA_SHEET = "02 Media Assets";
var HOME_SALE_MARKETING_SHEET = "03 Marketing Copy";
var HOME_SALE_VIDEO_SHEET = "05 Video Scripts";
var HOME_SALE_BUYER_INQUIRIES_SHEET = "04 Buyer Inquiries";
var HOME_SALE_ADMIN_ACCESS_CODE = "246810"; // local security test only
var HOME_SALE_LISTING_ACCESS_HEADERS = [
  "Created By Email",
  "Created By Access Code",
  "Created By Role",
];

function doGet(e) {
  try {
    var action = homeSaleParam_(e, "action");
    var publicGetActions = ["getSaleListings", "getSaleListingById", "getMarketingCopyByListingId", "getVideoScriptsByListingId"];
    var isPublicGet = publicGetActions.indexOf(action) >= 0;
    var auth = homeSaleResolveAccess_((e && e.parameter) || {}, "sale", isPublicGet);

    if (action === "getSaleListings") return homeSaleOk_(getSaleListings_(auth));
    if (action === "getSaleListingById") return homeSaleOk_(getSaleListingById_(homeSaleParam_(e, "listingId"), auth));
    if (action === "getSaleMediaByListingId") return homeSaleOk_(getSaleMediaByListingId_(homeSaleParam_(e, "listingId"), auth));
    if (action === "getMarketingCopyByListingId") return homeSaleOk_(getMarketingCopyByListingId_(homeSaleParam_(e, "listingId"), auth));
    if (action === "getVideoScriptsByListingId") return homeSaleOk_(getVideoScriptsByListingId_(homeSaleParam_(e, "listingId"), auth));

    return homeSaleErr_("Unknown GET action: " + action);
  } catch (err) {
    return homeSaleErr_(err.message);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || "{}");
    var action = body.action || "";
    var publicPostActions = ["getSaleListings", "getSaleListingById", "submitBuyerInquiry"];
    var isPublicPost = publicPostActions.indexOf(action) >= 0;
    var auth = homeSaleResolveAccess_(body || {}, "sale", isPublicPost);

    if (action === "getSaleListings") return homeSaleOk_(getSaleListings_(auth));
    if (action === "getSaleListingById") return homeSaleOk_(getSaleListingById_(body.listingId, auth));
    if (action === "createSaleListing") return homeSaleOk_(createSaleListing_(body.record || {}, auth));
    if (action === "updateSaleListing") return homeSaleOk_(updateSaleListing_(body.listingId, body.record || {}, auth));
    if (action === "getSaleMediaByListingId") return homeSaleOk_(getSaleMediaByListingId_(body.listingId, auth));
    if (action === "createSaleMediaAsset") return homeSaleOk_(createSaleMediaAsset_(body.record || {}, auth));
    if (action === "syncSaleMediaFromDriveFolder") return homeSaleOk_(syncSaleMediaFromDriveFolder_(body, auth));
    if (action === "uploadSaleMediaFile") return homeSaleOk_(uploadSaleMediaFile_(body, auth));
    if (action === "getMarketingCopyByListingId") return homeSaleOk_(getMarketingCopyByListingId_(body.listingId, auth));
    if (action === "generateHomeSaleMarketingCopy") return homeSaleOk_(generateHomeSaleMarketingCopy_(body.listingId, auth));
    if (action === "createOrUpdateMarketingCopy") return homeSaleOk_(createOrUpdateMarketingCopy_(body.copyId, body.record || {}, auth));
    if (action === "getVideoScriptsByListingId") return homeSaleOk_(getVideoScriptsByListingId_(body.listingId, auth));
    if (action === "createOrUpdateVideoScript") return homeSaleOk_(createOrUpdateVideoScript_(body.scriptId, body.record || {}, auth));
    if (action === "submitBuyerInquiry") return homeSaleOk_(submitBuyerInquiry_(body, auth));
    if (action === "getBuyerInquiries") return homeSaleOk_(getBuyerInquiries_(body, auth));
    if (action === "updateBuyerInquiry") return homeSaleOk_(updateBuyerInquiry_(body, auth));

    return homeSaleErr_("Unknown POST action: " + action);
  } catch (err) {
    return homeSaleErr_(err.message);
  }
}

function homeSaleResolveAccess_(payload, moduleName, allowPublic) {
  payload = payload || {};
  var adminAccessCode = String(payload.adminAccessCode || "").trim();
  var expectedAdminCode = homeSaleGetAdminAccessCode_();
  if (adminAccessCode && expectedAdminCode && adminAccessCode === expectedAdminCode) {
    return { mode: "admin", module: moduleName || "" };
  }

  var email = homeSaleNormalizeEmail_(payload.accessEmail || payload.email || "");
  var accessCode = String(payload.accessCode || "").trim().toUpperCase();
  if (email && accessCode) {
    var validated = homeSaleValidateTrialAccess_(email, accessCode, moduleName || "");
    return {
      mode: "trial",
      module: moduleName || "",
      email: validated.email,
      accessCode: validated.accessCode,
      approvedModule: validated.approvedModule,
      accessExpiresAt: validated.accessExpiresAt,
    };
  }

  if (allowPublic) return { mode: "public", module: moduleName || "" };
  throw new Error("Access denied. Please sign in with an approved trial access code.");
}

function homeSaleGetAdminAccessCode_() {
  // Source of truth: rental spreadsheet's "08 System Settings" sheet.
  // Sheet is checked first to avoid stale PropertiesService values.
  try {
    var RENTAL_SS_ID = "1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4";
    var ss = SpreadsheetApp.openById(RENTAL_SS_ID);
    var sheet = ss.getSheetByName("08 System Settings");
    if (sheet && sheet.getLastRow() >= 2) {
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === "admin_access_code") {
          var code = String(rows[i][1] || "").trim();
          if (code) {
            PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", code);
            return code;
          }
        }
      }
    }
  } catch (_) {}
  // Bootstrap fallback — used until a real code is set via Admin Settings
  var bootstrap = HOME_SALE_ADMIN_ACCESS_CODE || "";
  if (bootstrap) PropertiesService.getScriptProperties().setProperty("ADMIN_ACCESS_CODE", bootstrap);
  return bootstrap;
}

function homeSaleValidateTrialAccess_(email, accessCode, moduleName) {
  var contactsSheet = homeSaleGetSheetById_("1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4", "Contacts");
  homeSaleAddMissingHeaders_(contactsSheet, [
    "Email",
    "Access Code",
    "Approval Status",
    "Approved Module",
    "Access Expires At",
  ]);
  var lastRow = contactsSheet.getLastRow();
  if (lastRow < 2) throw new Error("Access code not found, expired, or not approved. Please contact Mabel.");
  var headerMap = homeSaleHeaderMap_(contactsSheet);
  var rows = contactsSheet.getRange(2, 1, lastRow - 1, contactsSheet.getLastColumn()).getValues();

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rowEmail = homeSaleNormalizeEmail_(homeSaleColVal_(row, headerMap, "Email"));
    var rowCode = String(homeSaleColVal_(row, headerMap, "Access Code") || "").trim().toUpperCase();
    if (rowEmail !== homeSaleNormalizeEmail_(email)) continue;
    if (rowCode !== String(accessCode || "").trim().toUpperCase()) continue;
    if (String(homeSaleColVal_(row, headerMap, "Approval Status") || "").trim() !== "Approved") {
      throw new Error("Access code not found, expired, or not approved. Please contact Mabel.");
    }
    var approvedModule = homeSaleColVal_(row, headerMap, "Approved Module");
    if (!homeSaleApprovedModuleAllows_(approvedModule, moduleName)) {
      throw new Error("Access denied for this module.");
    }
    var expiresAt = homeSaleColVal_(row, headerMap, "Access Expires At");
    if (homeSaleIsExpired_(expiresAt)) {
      throw new Error("Access code not found, expired, or not approved. Please contact Mabel.");
    }
    return {
      valid: true,
      email: homeSaleColVal_(row, headerMap, "Email"),
      accessCode: rowCode,
      approvedModule: approvedModule,
      accessExpiresAt: expiresAt,
    };
  }

  throw new Error("Access code not found, expired, or not approved. Please contact Mabel.");
}

function homeSaleApprovedModuleAllows_(approvedModule, moduleName) {
  var text = String(approvedModule || "").toLowerCase();
  var module = String(moduleName || "").toLowerCase();
  if (text.indexOf("both") >= 0) return true;
  if (module === "sale") return text.indexOf("sale") >= 0;
  if (module === "rental") return text.indexOf("rental") >= 0;
  return false;
}

function homeSaleNormalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function homeSaleIsExpired_(expiresAt) {
  if (!expiresAt) return false;
  var dt = new Date(expiresAt);
  if (isNaN(dt.getTime())) return false;
  return dt.getTime() < Date.now();
}

function homeSaleCanAccessListing_(record, auth) {
  if (!record) return false;
  if (!auth) return false;
  if (auth.mode === "admin") return true;
  if (auth.mode === "public") {
    var status = String(record["Status"] || "").trim();
    return status === "Published" || status === "Active";
  }
  return homeSaleNormalizeEmail_(record["Created By Email"]) === homeSaleNormalizeEmail_(auth.email);
}

function homeSaleAssertListingAccess_(listingId, auth) {
  var match = homeSaleFindByValue_(HOME_SALE_LISTINGS_SHEET, "Listing ID", listingId);
  if (!match) throw new Error("Sale listing not found: " + listingId);
  if (!homeSaleCanAccessListing_(match.record, auth)) {
    throw new Error("Access denied for this listing.");
  }
  return match;
}

function getSaleListings_(auth) {
  homeSaleAddMissingHeaders_(homeSaleGetSheet_(HOME_SALE_LISTINGS_SHEET), HOME_SALE_LISTING_ACCESS_HEADERS);
  var rows = homeSaleGetDataRows_(HOME_SALE_LISTINGS_SHEET);
  return rows
    .filter(function(item) { return homeSaleCanAccessListing_(item.record, auth); })
    .map(function(item) { return homeSaleListingFromRecord_(item.record, auth); })
    .filter(function(item) { return !!item.id; });
}

function getSaleListingById_(listingId, auth) {
  if (!listingId) throw new Error("Missing listingId.");
  homeSaleAddMissingHeaders_(homeSaleGetSheet_(HOME_SALE_LISTINGS_SHEET), HOME_SALE_LISTING_ACCESS_HEADERS);
  var match = homeSaleAssertListingAccess_(listingId, auth);
  return homeSaleListingFromRecord_(match.record, auth);
}

function createSaleListing_(record, auth) {
  var sheet = homeSaleGetSheet_(HOME_SALE_LISTINGS_SHEET);
  homeSaleAddMissingHeaders_(sheet, HOME_SALE_LISTING_ACCESS_HEADERS);
  var headers = homeSaleGetHeaders_(sheet);
  var listingId = record["Listing ID"] || homeSaleGenerateNextId_(sheet, "Listing ID", "SALE");

  if (homeSaleFindByValue_(HOME_SALE_LISTINGS_SHEET, "Listing ID", listingId)) {
    throw new Error("Listing ID already exists: " + listingId);
  }

  record["Listing ID"] = listingId;
  if (!record.Status) record.Status = "Draft";
  if (!record["Public Listing URL"]) record["Public Listing URL"] = "";
  if (auth.mode === "trial") {
    record["Created By Email"] = auth.email;
    record["Created By Access Code"] = auth.accessCode;
    record["Created By Role"] = "Trial User";
  } else {
    record["Created By Role"] = record["Created By Role"] || "Admin";
  }
  // Auto-create Drive media folder if one isn't already provided.
  if (!record["Google Drive Folder URL"]) {
    try {
      record["Google Drive Folder URL"] = createSaleListingMediaFolder_(listingId, record["Property Address"] || "");
    } catch (e) {
      Logger.log("[createSaleListing_] Auto-folder creation failed: " + e.message);
    }
  }

  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true, setUpdatedAt: true });
  return {
    success: true,
    listingId: listingId,
    record: getSaleListingById_(listingId, auth),
  };
}

function updateSaleListing_(listingId, record, auth) {
  var targetId = listingId || record["Listing ID"];
  if (!targetId) throw new Error("Missing Listing ID for update.");

  homeSaleAddMissingHeaders_(homeSaleGetSheet_(HOME_SALE_LISTINGS_SHEET), HOME_SALE_LISTING_ACCESS_HEADERS);
  homeSaleAddMissingHeaders_(homeSaleGetSheet_(HOME_SALE_LISTINGS_SHEET), ["Showing Availability"]);
  var match = homeSaleAssertListingAccess_(targetId, auth);
  if (auth.mode === "trial") {
    record["Created By Email"] = auth.email;
    record["Created By Access Code"] = auth.accessCode;
    record["Created By Role"] = "Trial User";
  }

  homeSaleUpdateRecord_(match.sheet, match.headers, match.rowIndex, record, { setUpdatedAt: true });
  return {
    success: true,
    listingId: targetId,
    record: getSaleListingById_(targetId, auth),
  };
}

function getSaleMediaByListingId_(listingId, auth) {
  if (!listingId) throw new Error("Missing listingId.");
  homeSaleAssertListingAccess_(listingId, auth);
  return homeSaleGetDataRows_(HOME_SALE_MEDIA_SHEET)
    .map(function(item) { return homeSaleMediaFromRecord_(item.record, auth); })
    .filter(function(item) { return item.listingId === listingId; });
}

function createSaleMediaAsset_(record, auth) {
  var sheet = homeSaleGetSheet_(HOME_SALE_MEDIA_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var listingId = record["Listing ID"];
  if (!listingId) throw new Error("Missing Listing ID for media asset.");
  homeSaleAssertListingAccess_(listingId, auth);

  var assetId = record["Asset ID"] || homeSaleGenerateNextId_(sheet, "Asset ID", "MEDIA");
  record["Asset ID"] = assetId;

  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true });
  return { success: true, assetId: assetId };
}

function uploadSaleMediaFile_(body, auth) {
  var listingId  = body.listingId  || "";
  var fileName   = body.fileName   || ("upload_" + Date.now());
  var mimeType   = body.mimeType   || "image/jpeg";
  var data       = body.data       || "";
  var sortOrder  = body.sortOrder  || "";
  var assetRole  = body.assetRole  || "Other";

  if (!listingId) throw new Error("uploadSaleMediaFile: listingId required");
  if (!data)      throw new Error("uploadSaleMediaFile: base64 data required");

  var match = homeSaleAssertListingAccess_(listingId, auth);
  var driveFolderUrl = match.record["Google Drive Folder URL"] || "";
  if (!driveFolderUrl) {
    throw new Error("No Google Drive folder is set for this listing. Add the Drive Folder URL in the listing info first.");
  }

  var folderId = homeSaleExtractDriveFolderId_(driveFolderUrl);
  if (!folderId) throw new Error("Cannot extract Drive folder ID from listing folder URL.");

  var folder = DriveApp.getFolderById(folderId);
  var blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId    = file.getId();
  var driveUrl  = file.getUrl();
  var publicUrl = homeSaleBuildDriveImagePublicUrl_(fileId);

  var mediaSheet   = homeSaleGetSheet_(HOME_SALE_MEDIA_SHEET);
  var mediaHeaders = homeSaleGetHeaders_(mediaSheet);
  var assetId      = homeSaleGenerateNextId_(mediaSheet, "Asset ID", "MEDIA");

  var record = {
    "Asset ID":   assetId,
    "Listing ID": listingId,
    "Asset Type": "Photo",
    "Asset Role": assetRole,
    "File Name":  fileName,
    "Drive URL":  driveUrl,
    "Public URL": publicUrl,
    "Sort Order": sortOrder,
    "Caption EN": "",
    "Caption CN": "",
    "Alt Text":   fileName,
    Notes:        "Direct upload",
  };

  homeSaleAppendRecord_(mediaSheet, mediaHeaders, record, { setCreatedAt: true });
  return { success: true, assetId: assetId, fileId: fileId, driveUrl: driveUrl, publicUrl: publicUrl, fileName: fileName };
}

function syncSaleMediaFromDriveFolder_(payload, auth) {
  var listingId = payload.listingId || "";
  var folderUrl = payload.folderUrl || "";
  var defaultAssetType = payload.defaultAssetType || "Photo";
  var defaultAssetRole = payload.defaultAssetRole || "Other";
  var startingSortOrder = Number(payload.startingSortOrder || 1);

  if (!listingId) throw new Error("Missing Listing ID for Drive media sync.");
  if (!folderUrl) throw new Error("Missing Google Drive folder URL.");
  if (!Number.isFinite(startingSortOrder) || startingSortOrder < 1) startingSortOrder = 1;

  var listingMatch = homeSaleAssertListingAccess_(listingId, auth);

  var folderId = homeSaleExtractDriveFolderId_(folderUrl);
  if (!folderId) throw new Error("Unable to extract Google Drive folder ID from URL.");

  var folder = DriveApp.getFolderById(folderId);
  var fileIterator = folder.getFiles();
  var existingMedia = getSaleMediaByListingId_(listingId);
  var existingDriveUrls = {};
  var hasCover = false;

  for (var i = 0; i < existingMedia.length; i++) {
    if (existingMedia[i].driveUrl) existingDriveUrls[existingMedia[i].driveUrl] = true;
    if (existingMedia[i].assetRole === "Cover") hasCover = true;
  }

  var mediaSheet = homeSaleGetSheet_(HOME_SALE_MEDIA_SHEET);
  var mediaHeaders = homeSaleGetHeaders_(mediaSheet);
  var listingRecordUpdate = {};
  var importedCount = 0;
  var skippedDuplicateCount = 0;
  var nextSortOrder = startingSortOrder;
  var importedFiles = [];
  var filesToImport = [];

  while (fileIterator.hasNext()) {
    var file = fileIterator.next();
    if (!homeSaleIsImportableImage_(file)) continue;
    filesToImport.push(file);
  }

  filesToImport.sort(function(a, b) {
    return String(a.getName() || "").localeCompare(String(b.getName() || ""));
  });

  for (var j = 0; j < filesToImport.length; j++) {
    var currentFile = filesToImport[j];
    var driveUrl = currentFile.getUrl();
    if (existingDriveUrls[driveUrl]) {
      skippedDuplicateCount += 1;
      continue;
    }

    var publicUrl = homeSaleBuildDriveImagePublicUrl_(currentFile.getId());
    var assetRole = (!hasCover && importedCount === 0) ? "Cover" : defaultAssetRole;
    var record = {
      "Asset ID": homeSaleGenerateNextId_(mediaSheet, "Asset ID", "MEDIA"),
      "Listing ID": listingId,
      "Asset Type": defaultAssetType,
      "Asset Role": assetRole,
      "File Name": currentFile.getName(),
      "Drive URL": driveUrl,
      "Public URL": publicUrl,
      "Sort Order": nextSortOrder,
      "Caption EN": "",
      "Caption CN": "",
      "Alt Text": currentFile.getName(),
      Notes: "Imported from Drive folder sync",
    };

    homeSaleAppendRecord_(mediaSheet, mediaHeaders, record, { setCreatedAt: true });
    existingDriveUrls[driveUrl] = true;
    importedCount += 1;
    nextSortOrder += 1;
    if (assetRole === "Cover") hasCover = true;

    if (!listingMatch.record["Google Drive Folder URL"] && !listingRecordUpdate["Google Drive Folder URL"]) {
      listingRecordUpdate["Google Drive Folder URL"] = folderUrl;
    }
    if (!listingMatch.record["Primary Photo URL"] && !listingRecordUpdate["Primary Photo URL"]) {
      listingRecordUpdate["Primary Photo URL"] = publicUrl;
    }

    importedFiles.push({
      fileName: currentFile.getName(),
      driveUrl: driveUrl,
      publicUrl: publicUrl,
      assetRole: assetRole,
      sortOrder: record["Sort Order"],
    });
  }

  if (Object.keys(listingRecordUpdate).length > 0) {
    homeSaleUpdateRecord_(listingMatch.sheet, listingMatch.headers, listingMatch.rowIndex, listingRecordUpdate, { setUpdatedAt: true });
  }

  return {
    success: true,
    importedCount: importedCount,
    skippedDuplicateCount: skippedDuplicateCount,
    files: importedFiles,
  };
}

function getMarketingCopyByListingId_(listingId, auth) {
  if (!listingId) throw new Error("Missing listingId.");
  homeSaleAssertListingAccess_(listingId, auth);
  return homeSaleGetDataRows_(HOME_SALE_MARKETING_SHEET)
    .map(function(item) { return homeSaleMarketingFromRecord_(item.record, auth); })
    .filter(function(item) { return item.listingId === listingId; });
}

function createOrUpdateMarketingCopy_(copyId, record, auth) {
  var sheet = homeSaleGetSheet_(HOME_SALE_MARKETING_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var finalCopyId = copyId || record["Copy ID"];

  if (finalCopyId) {
    var match = homeSaleFindByValue_(HOME_SALE_MARKETING_SHEET, "Copy ID", finalCopyId);
    if (match) {
      homeSaleAssertListingAccess_(match.record["Listing ID"], auth);
      homeSaleUpdateRecord_(match.sheet, match.headers, match.rowIndex, record, { setUpdatedAt: true });
      return { success: true, copyId: finalCopyId };
    }
  }

  homeSaleAssertListingAccess_(record["Listing ID"], auth);
  finalCopyId = finalCopyId || homeSaleGenerateNextId_(sheet, "Copy ID", "COPY");
  record["Copy ID"] = finalCopyId;
  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true, setUpdatedAt: true });
  return { success: true, copyId: finalCopyId };
}

function generateHomeSaleMarketingCopy_(listingId, auth) {
  if (!listingId) throw new Error("Missing listingId for marketing copy generation.");

  var listing = getSaleListingById_(listingId, auth);
  if (!listing || !listing.id) throw new Error("Sale listing not found: " + listingId);

  var sheet = homeSaleGetSheet_(HOME_SALE_MARKETING_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var existingRows = homeSaleGetDataRows_(HOME_SALE_MARKETING_SHEET);
  var specs = homeSaleBuildMarketingSpecs_(listing);
  var generatedRows = [];

  for (var i = 0; i < specs.length; i++) {
    var spec = specs[i];
    var record = homeSaleBuildGeneratedMarketingRecord_(listing, spec);
    var match = homeSaleFindMarketingRow_(existingRows, listingId, spec.channel, spec.language, record.Version);

    if (match) {
      homeSaleUpdateRecord_(match.sheet, match.headers, match.rowIndex, record, { setUpdatedAt: true });
    } else {
      record["Copy ID"] = homeSaleGenerateNextId_(sheet, "Copy ID", "COPY");
      homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true, setUpdatedAt: true });
    }
  }

  generatedRows = getMarketingCopyByListingId_(listingId, auth)
    .filter(function(item) {
      return item.version === "v1";
    });

  return {
    success: true,
    listingId: listingId,
    generatedCount: generatedRows.length,
    rows: generatedRows,
  };
}

function getVideoScriptsByListingId_(listingId, auth) {
  if (!listingId) throw new Error("Missing listingId.");
  homeSaleAssertListingAccess_(listingId, auth);
  return homeSaleGetDataRows_(HOME_SALE_VIDEO_SHEET)
    .map(function(item) { return homeSaleVideoFromRecord_(item.record, auth); })
    .filter(function(item) { return item.listingId === listingId; });
}

function homeSaleFindMarketingRow_(rows, listingId, channel, language, version) {
  for (var i = 0; i < rows.length; i++) {
    var record = rows[i].record || {};
    if (String(record["Listing ID"] || "").trim() !== String(listingId).trim()) continue;
    if (String(record.Channel || "").trim() !== String(channel).trim()) continue;
    if (String(record.Language || "").trim() !== String(language).trim()) continue;
    if (String(record.Version || "").trim() !== String(version).trim()) continue;
    return rows[i];
  }
  return null;
}

function homeSaleBuildMarketingSpecs_(listing) {
  return [
    { channel: "Website", language: "English" },
    { channel: "Website", language: "Chinese" },
    { channel: "WeChat", language: "Chinese" },
    { channel: "Xiaohongshu", language: "Chinese" },
    { channel: "Facebook", language: "English" },
    { channel: "Realtor version", language: "English" },
    { channel: "FSBO owner version", language: "English" }
  ];
}

function homeSaleBuildGeneratedMarketingRecord_(listing, spec) {
  var language = spec.language;
  var channel = spec.channel;
  var version = "v1";
  var publicUrl = listing.publicListingUrl || "";

  return {
    "Listing ID": listing.id || listing.listingId || "",
    Channel: channel,
    Language: language,
    Headline: language === "Chinese"
      ? homeSaleBuildHeadlineZh_(listing, channel)
      : homeSaleBuildHeadlineEn_(listing, channel),
    "Body Copy": language === "Chinese"
      ? homeSaleBuildBodyZh_(listing, channel)
      : homeSaleBuildBodyEn_(listing, channel),
    "Call To Action": language === "Chinese"
      ? homeSaleBuildCallToActionZh_(listing, channel)
      : homeSaleBuildCallToActionEn_(listing, channel),
    Hashtags: language === "Chinese"
      ? homeSaleBuildHashtagsZh_(listing, channel)
      : homeSaleBuildHashtagsEn_(listing, channel),
    "Public URL": publicUrl,
    Version: version,
    Status: "Draft"
  };
}

function homeSaleBuildHeadlineEn_(listing, channel) {
  var price = homeSaleFormatPrice_(listing.askingPrice);
  var beds = homeSaleNumberLabel_(listing.bedrooms, "bed", "beds");
  var baths = homeSaleNumberLabel_(listing.bathrooms, "bath", "baths");
  var type = listing.propertyType || "Home";
  var city = listing.city || "BC";
  var address = listing.address || "Home Sale Listing";

  if (channel === "Facebook") {
    return [price, beds, baths, type + " in " + city].filter(Boolean).join(" · ") || address;
  }
  if (channel === "Realtor version") {
    return [address, type, city].filter(Boolean).join(" | ");
  }
  if (channel === "FSBO owner version") {
    return [price, type, "For Sale in " + city].filter(Boolean).join(" | ") || address;
  }
  return [price, beds, baths, type + " for Sale in " + city].filter(Boolean).join(" · ") || address;
}

function homeSaleBuildHeadlineZh_(listing, channel) {
  var price = homeSaleFormatPrice_(listing.askingPrice);
  var city = listing.city || "BC";
  var type = homeSalePropertyTypeZh_(listing.propertyType);
  var address = listing.address || "出售房源";
  var beds = listing.bedrooms ? String(listing.bedrooms) + "房" : "";
  var baths = listing.bathrooms ? String(listing.bathrooms) + "卫" : "";

  if (channel === "WeChat") {
    return [city, type, beds, baths, price].filter(Boolean).join(" · ") || address;
  }
  if (channel === "Xiaohongshu") {
    return [city + "好房推荐", type, price].filter(Boolean).join(" | ") || address;
  }
  return [city, type, "出售", price].filter(Boolean).join(" · ") || address;
}

function homeSaleBuildBodyEn_(listing, channel) {
  var parts = [];
  var intro = homeSaleBuildIntroEn_(listing);
  var facts = homeSaleBuildFactsEn_(listing);
  var features = homeSaleBuildFeaturesEn_(listing);
  var description = homeSaleSafeText_(listing.descriptionEn);
  var missingNote = homeSaleBuildMissingDetailsNoteEn_(listing);

  if (channel === "Facebook") {
    parts.push(intro);
    if (facts) parts.push(facts);
    if (features) parts.push("Highlights: " + features);
  } else if (channel === "Realtor version") {
    parts.push(intro);
    if (facts) parts.push(facts);
    if (description) {
      parts.push(description);
    } else if (features) {
      parts.push("Property highlights include " + features + ".");
    }
  } else if (channel === "FSBO owner version") {
    parts.push(intro);
    if (facts) parts.push(facts);
    if (features) parts.push("Notable features: " + features + ".");
  } else {
    parts.push(intro);
    if (facts) parts.push(facts);
    if (description) {
      parts.push(description);
    } else if (features) {
      parts.push("Property highlights include " + features + ".");
    }
  }

  if (missingNote) parts.push(missingNote);
  return parts.filter(Boolean).join("\n\n");
}

function homeSaleBuildBodyZh_(listing, channel) {
  var parts = [];
  var intro = homeSaleBuildIntroZh_(listing);
  var facts = homeSaleBuildFactsZh_(listing);
  var features = homeSaleBuildFeaturesZh_(listing);
  var description = homeSaleSafeText_(listing.descriptionCn);
  var missingNote = homeSaleBuildMissingDetailsNoteZh_(listing);

  if (channel === "Xiaohongshu") {
    parts.push(intro);
    if (facts) parts.push(facts);
    if (features) parts.push("亮点包括：" + features);
  } else if (channel === "WeChat") {
    parts.push(intro);
    if (facts) parts.push(facts);
    if (description) {
      parts.push(description);
    } else if (features) {
      parts.push("房源亮点：" + features);
    }
  } else {
    parts.push(intro);
    if (facts) parts.push(facts);
    if (description) {
      parts.push(description);
    } else if (features) {
      parts.push("房源亮点：" + features);
    }
  }

  if (missingNote) parts.push(missingNote);
  return parts.filter(Boolean).join("\n\n");
}

function homeSaleBuildCallToActionEn_(listing, channel) {
  if (channel === "Facebook") return "Message for details or to arrange a private showing.";
  if (channel === "Realtor version") return "Review the listing details and contact the seller or agent for showing arrangements.";
  if (channel === "FSBO owner version") return "Contact the owner directly to learn more or book a viewing.";
  return "Open the listing page for full details and contact information.";
}

function homeSaleBuildCallToActionZh_(listing, channel) {
  if (channel === "Xiaohongshu") return "欢迎私信了解详情，或点击公开页面查看完整资料。";
  if (channel === "WeChat") return "欢迎联系了解详情，预约看房，或打开公开页面查看完整信息。";
  return "欢迎联系了解详情或查看公开页面。";
}

function homeSaleBuildHashtagsEn_(listing, channel) {
  var tags = [
    "#HomeSale",
    homeSaleToHashtag_(listing.city, "RealEstate"),
    homeSaleToHashtag_(listing.propertyType, "ForSale"),
    "#BCHome"
  ];
  return homeSaleJoinHashtags_(tags);
}

function homeSaleBuildHashtagsZh_(listing, channel) {
  var tags = [
    "#房屋出售",
    "#温哥华岛房产",
    homeSaleToZhHashtag_(listing.city, "房产"),
    homeSaleToZhHashtag_(homeSalePropertyTypeZh_(listing.propertyType), "出售")
  ];
  return homeSaleJoinHashtags_(tags);
}

function homeSaleBuildIntroEn_(listing) {
  var address = listing.address || "This home";
  var city = listing.city ? listing.city + ", " + (listing.province || "BC") : (listing.province || "BC");
  var price = homeSaleFormatPrice_(listing.askingPrice);
  var type = listing.propertyType || "home";

  if (price) {
    return address + " is a " + type + " offered at " + price + (city ? " in " + city : "") + ".";
  }
  return address + " is a " + type + (city ? " located in " + city : "") + ".";
}

function homeSaleBuildIntroZh_(listing) {
  var address = listing.address || "这套房源";
  var city = listing.city || "";
  var province = listing.province || "BC";
  var price = homeSaleFormatPrice_(listing.askingPrice);
  var type = homeSalePropertyTypeZh_(listing.propertyType);

  if (price) {
    return address + "是一套位于" + [city, province].filter(Boolean).join("，") + "的" + type + "，叫价" + price + "。";
  }
  return address + "是一套位于" + [city, province].filter(Boolean).join("，") + "的" + type + "。";
}

function homeSaleBuildFactsEn_(listing) {
  var facts = [];
  if (listing.bedrooms) facts.push(String(listing.bedrooms) + " bed");
  if (listing.bathrooms) facts.push(String(listing.bathrooms) + " bath");
  if (listing.interiorSqft) facts.push(String(listing.interiorSqft) + " sq ft");
  if (listing.lotSize) facts.push("lot size " + listing.lotSize);
  if (listing.yearBuilt) facts.push("built in " + listing.yearBuilt);
  if (listing.mlsNumber) facts.push("MLS " + listing.mlsNumber);
  return facts.length ? "Key facts: " + facts.join(" • ") + "." : "";
}

function homeSaleBuildFactsZh_(listing) {
  var facts = [];
  if (listing.bedrooms) facts.push(String(listing.bedrooms) + "房");
  if (listing.bathrooms) facts.push(String(listing.bathrooms) + "卫");
  if (listing.interiorSqft) facts.push("室内约" + listing.interiorSqft + "平方英尺");
  if (listing.lotSize) facts.push("地块面积" + listing.lotSize);
  if (listing.yearBuilt) facts.push("建于" + listing.yearBuilt + "年");
  if (listing.mlsNumber) facts.push("MLS " + listing.mlsNumber);
  return facts.length ? "房源要点：" + facts.join(" · ") + "。" : "";
}

function homeSaleBuildFeaturesEn_(listing) {
  return homeSaleSafeText_(listing.keyFeatures);
}

function homeSaleBuildFeaturesZh_(listing) {
  var features = homeSaleSafeText_(listing.keyFeatures);
  if (!features) return "";
  return homeSaleLooksChinese_(features) ? features : "";
}

function homeSaleBuildMissingDetailsNoteEn_(listing) {
  var missing = homeSaleCollectMissingDetails_(listing);
  if (!missing.length) return "";
  return "Note: Some listing details are not yet filled in: " + missing.join(", ") + ".";
}

function homeSaleBuildMissingDetailsNoteZh_(listing) {
  var missing = homeSaleCollectMissingDetails_(listing);
  if (!missing.length) return "";
  return "说明：以下部分房源信息暂未填写：" + missing.join("、") + "。";
}

function homeSaleCollectMissingDetails_(listing) {
  var missing = [];
  if (!listing.askingPrice) missing.push("Asking Price");
  if (!listing.bedrooms) missing.push("Bedrooms");
  if (!listing.bathrooms) missing.push("Bathrooms");
  if (!listing.interiorSqft) missing.push("Interior SqFt");
  if (!listing.yearBuilt) missing.push("Year Built");
  if (!listing.mlsNumber) missing.push("MLS Number");
  if (!listing.descriptionEn) missing.push("Description EN");
  if (!listing.descriptionCn) missing.push("Description CN");
  return missing;
}

function homeSaleFormatPrice_(value) {
  var digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return "";
  var amount = Number(digits);
  if (isNaN(amount)) return String(value || "");
  return "$" + amount.toLocaleString();
}

function homeSaleNumberLabel_(value, singular, plural) {
  if (!value) return "";
  var num = Number(value);
  if (!isNaN(num)) return String(num) + " " + (num === 1 ? singular : plural);
  return String(value) + " " + plural;
}

function homeSalePropertyTypeZh_(type) {
  var map = {
    House: "独立屋",
    Townhouse: "联排屋",
    Condo: "公寓",
    Apartment: "公寓",
    Duplex: "双拼屋",
    Triplex: "三拼屋",
    Acreage: "农地住宅",
    Commercial: "商业物业",
    Land: "土地",
    Other: "房产"
  };
  return map[type] || type || "房产";
}

function homeSaleSafeText_(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function homeSaleLooksChinese_(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

function homeSaleToHashtag_(value, suffix) {
  var clean = String(value || "").replace(/[^A-Za-z0-9]/g, "");
  if (!clean) return "";
  return "#" + clean + (suffix || "");
}

function homeSaleToZhHashtag_(value, suffix) {
  var clean = String(value || "").replace(/\s+/g, "");
  if (!clean) return "";
  return "#" + clean + (suffix || "");
}

function homeSaleJoinHashtags_(items) {
  var seen = {};
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var item = String(items[i] || "").trim();
    if (!item || seen[item]) continue;
    seen[item] = true;
    result.push(item);
  }
  return result.join(" ");
}

function createOrUpdateVideoScript_(scriptId, record, auth) {
  var sheet = homeSaleGetSheet_(HOME_SALE_VIDEO_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var finalScriptId = scriptId || record["Script ID"];

  if (finalScriptId) {
    var match = homeSaleFindByValue_(HOME_SALE_VIDEO_SHEET, "Script ID", finalScriptId);
    if (match) {
      homeSaleAssertListingAccess_(match.record["Listing ID"], auth);
      homeSaleUpdateRecord_(match.sheet, match.headers, match.rowIndex, record, {});
      return { success: true, scriptId: finalScriptId };
    }
  }

  homeSaleAssertListingAccess_(record["Listing ID"], auth);
  finalScriptId = finalScriptId || homeSaleGenerateNextId_(sheet, "Script ID", "SCRIPT");
  record["Script ID"] = finalScriptId;
  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true });
  return { success: true, scriptId: finalScriptId };
}

function submitBuyerInquiry_(body, auth) {
  var listingId = String(body.listingId || "").trim();
  var buyerFirstName = String(body.buyerFirstName || "").trim();
  var buyerLastName = String(body.buyerLastName || "").trim();
  var phone = String(body.phone || "").trim();
  var email = String(body.email || "").trim();
  var preferredShowingDate = String(body.preferredShowingDate || "").trim();
  var preferredTimeWindow = String(body.preferredTimeWindow || "").trim();
  var message = String(body.message || "").trim();

  if (!listingId) throw new Error("Missing listingId.");
  if (!buyerFirstName) throw new Error("First name is required.");
  if (!email) throw new Error("Email is required.");

  // Fetch listing title — skip access guard, public submission
  var listingTitle = String(body.listingTitle || "").trim();
  if (!listingTitle) {
    try {
      var match = homeSaleFindByValue_(HOME_SALE_LISTINGS_SHEET, "Listing ID", listingId);
      if (match) listingTitle = match.record["Property Address"] || listingId;
    } catch (_) { listingTitle = listingId; }
  }

  var sheet = homeSaleGetSheet_(HOME_SALE_BUYER_INQUIRIES_SHEET);
  var requiredHeaders = [
    "Timestamp", "Inquiry ID", "Listing ID", "Listing Title",
    "Buyer First Name", "Buyer Last Name", "Email", "Phone",
    "Preferred Showing Date", "Preferred Time Window", "Message",
    "Source Page", "Status", "Seller Approval", "Seller Notes",
    "Confirmed Showing Time", "Notes"
  ];
  homeSaleAddMissingHeaders_(sheet, requiredHeaders);
  var headers = homeSaleGetHeaders_(sheet);

  var inquiryId = homeSaleGenerateNextId_(sheet, "Inquiry ID", "BI");
  var record = {
    "Timestamp": new Date(),
    "Inquiry ID": inquiryId,
    "Listing ID": listingId,
    "Listing Title": listingTitle,
    "Buyer First Name": buyerFirstName,
    "Buyer Last Name": buyerLastName,
    "Email": email,
    "Phone": phone,
    "Preferred Showing Date": preferredShowingDate,
    "Preferred Time Window": preferredTimeWindow,
    "Message": message,
    "Source Page": "Home Sale Public Page",
    "Status": "New",
    "Seller Approval": "Pending",
    "Seller Notes": "",
    "Confirmed Showing Time": "",
    "Notes": ""
  };

  homeSaleAppendRecord_(sheet, headers, record, {});
  return { success: true, inquiryId: inquiryId };
}

function getBuyerInquiries_(body, auth) {
  if (auth.mode !== "admin") throw new Error("Admin access required to view buyer inquiries.");
  var sheet = homeSaleGetSheet_(HOME_SALE_BUYER_INQUIRIES_SHEET);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var headers = homeSaleGetHeaders_(sheet);
  var rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var record = homeSaleObjectFromRow_(headers, rows[i]);
    if (!record["Inquiry ID"]) continue;
    result.push({
      inquiryId: String(record["Inquiry ID"] || ""),
      listingId: String(record["Listing ID"] || ""),
      listingTitle: String(record["Listing Title"] || ""),
      buyerFirstName: String(record["Buyer First Name"] || ""),
      buyerLastName: String(record["Buyer Last Name"] || ""),
      email: String(record["Email"] || ""),
      phone: String(record["Phone"] || ""),
      preferredShowingDate: record["Preferred Showing Date"] ? String(record["Preferred Showing Date"]) : "",
      preferredTimeWindow: String(record["Preferred Time Window"] || ""),
      message: String(record["Message"] || ""),
      sourcePage: String(record["Source Page"] || ""),
      status: String(record["Status"] || "New"),
      sellerApproval: String(record["Seller Approval"] || "Pending"),
      sellerNotes: String(record["Seller Notes"] || ""),
      confirmedShowingTime: String(record["Confirmed Showing Time"] || ""),
      timestamp: record["Timestamp"] ? String(record["Timestamp"]) : "",
    });
  }
  return result;
}

function updateBuyerInquiry_(body, auth) {
  if (auth.mode !== "admin") throw new Error("Admin access required to update buyer inquiries.");
  var inquiryId = String(body.inquiryId || "").trim();
  if (!inquiryId) throw new Error("Missing inquiryId.");

  var sheet = homeSaleGetSheet_(HOME_SALE_BUYER_INQUIRIES_SHEET);
  var requiredHeaders = [
    "Timestamp", "Inquiry ID", "Listing ID", "Listing Title",
    "Buyer First Name", "Buyer Last Name", "Email", "Phone",
    "Preferred Showing Date", "Preferred Time Window", "Message",
    "Source Page", "Status", "Seller Approval", "Seller Notes",
    "Confirmed Showing Time", "Notes", "Email Sent At"
  ];
  homeSaleAddMissingHeaders_(sheet, requiredHeaders);
  var headers = homeSaleGetHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No buyer inquiries found.");

  var rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var idIndex = headers.indexOf("Inquiry ID");
  if (idIndex === -1) throw new Error("Inquiry ID column not found.");

  var targetRow = -1;
  var existingRecord = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idIndex] || "").trim() === inquiryId) {
      targetRow = i + 2;
      existingRecord = homeSaleObjectFromRow_(headers, rows[i]);
      break;
    }
  }
  if (targetRow === -1) throw new Error("Buyer inquiry not found: " + inquiryId);

  var emailSentAt = "";
  var emailResult = { sent: false };

  if (body.sendNotification) {
    emailResult = homeSaleSendBuyerNotification_(existingRecord, body);
    if (emailResult.sent) emailSentAt = new Date().toString();
  }

  var allowedFields = {
    "Status": body.status,
    "Seller Approval": body.sellerApproval,
    "Seller Notes": body.sellerNotes,
    "Confirmed Showing Time": body.confirmedShowingTime,
  };
  if (emailSentAt) allowedFields["Email Sent At"] = emailSentAt;

  var current = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  var updated = current.slice();
  for (var col = 0; col < headers.length; col++) {
    var header = headers[col];
    if (allowedFields.hasOwnProperty(header) && allowedFields[header] !== undefined) {
      updated[col] = allowedFields[header];
    }
  }
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([updated]);
  return { success: true, inquiryId: inquiryId, emailSent: emailResult.sent };
}

function homeSaleSendBuyerNotification_(record, body) {
  var buyerEmail = String(record["Email"] || "").trim();
  if (!buyerEmail) return { sent: false, reason: "No buyer email on record." };

  var firstName = String(record["Buyer First Name"] || "").trim() || "Buyer";
  var listingTitle = String(record["Listing Title"] || "").trim() || "the property";
  var showingDate = String(record["Preferred Showing Date"] || "").trim();
  var timeWindow = String(record["Preferred Time Window"] || "").trim();
  var confirmedTime = String(body.confirmedShowingTime || record["Confirmed Showing Time"] || "").trim();
  var sellerApproval = String(body.sellerApproval || "").trim();

  var subject = "";
  var bodyText = "";

  if (sellerApproval === "Approved") {
    subject = "Your Showing Request is Confirmed / 您的看房申请已确认 — " + listingTitle;
    bodyText = [
      "Dear " + firstName + ",",
      "",
      "Great news! Your showing request has been confirmed.",
      "",
      "Property / 房源: " + listingTitle,
      confirmedTime
        ? "Confirmed Showing Time / 确认看房时间: " + confirmedTime
        : "Showing Date / 看房日期: " + showingDate + (timeWindow ? "  " + timeWindow : ""),
      "",
      "Please arrive on time. If you need to make any changes, please reply to this email.",
      "",
      "---",
      "",
      "亲爱的 " + firstName + "，",
      "",
      "好消息！您的看房申请已确认。",
      "",
      "房源：" + listingTitle,
      confirmedTime
        ? "确认看房时间：" + confirmedTime
        : "看房日期：" + showingDate + (timeWindow ? "  " + timeWindow : ""),
      "",
      "请准时到场。如需更改，请回复本邮件。",
      "",
      "— Vanisland Property Management"
    ].join("\n");

  } else if (sellerApproval === "Reschedule") {
    subject = "Showing Request — Reschedule Needed / 看房申请 — 需要重新安排时间 — " + listingTitle;
    bodyText = [
      "Dear " + firstName + ",",
      "",
      "Thank you for your interest in " + listingTitle + ".",
      "",
      "Unfortunately, the requested showing time (" + (showingDate || "your selected date") + (timeWindow ? " " + timeWindow : "") + ") is not available.",
      "Please contact us to arrange a new time.",
      "",
      "---",
      "",
      "亲爱的 " + firstName + "，",
      "",
      "感谢您对 " + listingTitle + " 的关注。",
      "",
      "很遗憾，您申请的看房时间（" + (showingDate || "所选日期") + (timeWindow ? " " + timeWindow : "") + "）暂时无法安排。",
      "请联系我们重新选择合适的时间。",
      "",
      "— Vanisland Property Management"
    ].join("\n");

  } else if (sellerApproval === "Declined") {
    subject = "Regarding Your Showing Request / 关于您的看房申请 — " + listingTitle;
    bodyText = [
      "Dear " + firstName + ",",
      "",
      "Thank you for your interest in " + listingTitle + ".",
      "",
      "We appreciate your inquiry. Unfortunately, we are unable to accommodate a showing at this time.",
      "We wish you the best in your property search.",
      "",
      "---",
      "",
      "亲爱的 " + firstName + "，",
      "",
      "感谢您对 " + listingTitle + " 的关注。",
      "",
      "非常感谢您的咨询。很遗憾，我们目前无法安排此次看房。",
      "祝您早日找到心仪的房源。",
      "",
      "— Vanisland Property Management"
    ].join("\n");

  } else {
    return { sent: false, reason: "No notification template for approval: " + sellerApproval };
  }

  try {
    MailApp.sendEmail({
      to: buyerEmail,
      subject: subject,
      body: bodyText,
      replyTo: "mabelclaw67@gmail.com",
      name: "Vanisland Property Management"
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

function homeSaleGetDataRows_(sheetName) {
  var sheet = homeSaleGetSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var headers = homeSaleGetHeaders_(sheet);
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var result = [];

  for (var i = 0; i < rows.length; i++) {
    var record = homeSaleObjectFromRow_(headers, rows[i]);
    result.push({
      sheet: sheet,
      headers: headers,
      rowIndex: i + 2,
      record: record,
    });
  }
  return result;
}

function homeSaleGetSheetById_(spreadsheetId, sheetName) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function homeSaleAddMissingHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  var existing = homeSaleHeaderMap_(sheet);
  var lastCol = sheet.getLastColumn();
  for (var i = 0; i < headers.length; i++) {
    if (existing[headers[i]] === undefined) {
      lastCol += 1;
      sheet.getRange(1, lastCol).setValue(headers[i]);
    }
  }
}

function homeSaleHeaderMap_(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) return {};
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var header = String(headers[i] || "").trim();
    if (header) map[header] = i;
  }
  return map;
}

function homeSaleColVal_(row, headerMap, name) {
  var idx = headerMap[name];
  return (idx !== undefined && idx < row.length) ? (row[idx] || "") : "";
}

function homeSaleFindByValue_(sheetName, headerName, value) {
  if (!value) return null;
  var rows = homeSaleGetDataRows_(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].record[headerName] || "").trim() === String(value).trim()) {
      return rows[i];
    }
  }
  return null;
}

function homeSaleAppendRecord_(sheet, headers, record, options) {
  var timestamp = new Date();
  var row = headers.map(function(header) {
    if (options && options.setCreatedAt && header === "Created At") return timestamp;
    if (options && options.setUpdatedAt && header === "Updated At") return timestamp;
    return record.hasOwnProperty(header) ? record[header] : "";
  });
  sheet.appendRow(row);
}

function homeSaleUpdateRecord_(sheet, headers, rowIndex, record, options) {
  var timestamp = new Date();
  var current = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var next = current.slice();

  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    if (record.hasOwnProperty(header) && header !== "Created At") {
      next[i] = record[header];
    }
    if (options && options.setUpdatedAt && header === "Updated At") {
      next[i] = timestamp;
    }
  }

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([next]);
}

function homeSaleGenerateNextId_(sheet, headerName, prefix) {
  var headers = homeSaleGetHeaders_(sheet);
  var headerIndex = headers.indexOf(headerName);
  if (headerIndex === -1) throw new Error("Missing header: " + headerName);

  var lastRow = sheet.getLastRow();
  var year = new Date().getFullYear();
  var prefixValue = prefix + "-" + year + "-";
  var maxNum = 0;

  if (lastRow >= 2) {
    var values = sheet.getRange(2, headerIndex + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var value = String(values[i][0] || "").trim();
      if (value.indexOf(prefixValue) !== 0) continue;
      var num = Number(value.slice(prefixValue.length));
      if (!isNaN(num)) maxNum = Math.max(maxNum, num);
    }
  }

  return prefixValue + homeSalePad_(maxNum + 1, 3);
}

function homeSaleListingFromRecord_(record, auth) {
  var result = {
    id: record["Listing ID"] || "",
    listingId: record["Listing ID"] || "",
    status: record.Status || "Draft",
    ownerName: record["Owner Name"] || "",
    address: record["Property Address"] || "",
    city: record.City || "",
    province: record.Province || "",
    askingPrice: record["Asking Price"] || "",
    propertyType: record["Property Type"] || "",
    bedrooms: record.Bedrooms || "",
    bathrooms: record.Bathrooms || "",
    interiorSqft: record["Interior SqFt"] || "",
    lotSize: record["Lot Size"] || "",
    yearBuilt: record["Year Built"] || "",
    keyFeatures: record["Key Features"] || "",
    descriptionEn: record["Description EN"] || "",
    descriptionCn: record["Description CN"] || "",
    contactName: record["Contact Name"] || "",
    contactPhone: record["Contact Phone"] || "",
    contactEmail: record["Contact Email"] || "",
    publicListingUrl: record["Public Listing URL"] || "",
    qrCodeUrl: record["QR Code URL"] || "",
    googleDriveFolderUrl: record["Google Drive Folder URL"] || "",
    primaryPhotoUrl: record["Primary Photo URL"] || "",
    videoUrl: record["Video URL"] || "",
    mlsNumber: record["MLS Number"] || "",
    listingSource: record["Listing Source"] || "",
    showingAvailability: record["Showing Availability"] || "",
    notes: record.Notes || "",
    internalStatus: record["Internal Status"] || "",
    createdAt: record["Created At"] || "",
    updatedAt: record["Updated At"] || "",
    createdByEmail: record["Created By Email"] || "",
    createdByAccessCode: record["Created By Access Code"] || "",
    createdByRole: record["Created By Role"] || "",
  };
  return homeSaleSanitizeListingForAccess_(result, auth);
}

function homeSaleMediaFromRecord_(record, auth) {
  var result = {
    assetId: record["Asset ID"] || "",
    listingId: record["Listing ID"] || "",
    assetType: record["Asset Type"] || "",
    assetRole: record["Asset Role"] || "",
    fileName: record["File Name"] || "",
    driveUrl: record["Drive URL"] || "",
    publicUrl: record["Public URL"] || "",
    sortOrder: record["Sort Order"] || "",
    captionEn: record["Caption EN"] || "",
    captionCn: record["Caption CN"] || "",
    altText: record["Alt Text"] || "",
    createdAt: record["Created At"] || "",
    notes: record.Notes || "",
  };
  return homeSaleSanitizeMediaForAccess_(result, auth);
}

function homeSaleMarketingFromRecord_(record, auth) {
  var result = {
    copyId: record["Copy ID"] || "",
    listingId: record["Listing ID"] || "",
    channel: record.Channel || "",
    language: record.Language || "",
    headline: record.Headline || "",
    bodyCopy: record["Body Copy"] || "",
    callToAction: record["Call To Action"] || "",
    hashtags: record.Hashtags || "",
    publicUrl: record["Public URL"] || "",
    version: record.Version || "",
    status: record.Status || "Draft",
    createdAt: record["Created At"] || "",
    updatedAt: record["Updated At"] || "",
  };
  return auth && auth.mode === "admin" ? result : result;
}

function homeSaleVideoFromRecord_(record, auth) {
  var result = {
    scriptId: record["Script ID"] || "",
    listingId: record["Listing ID"] || "",
    videoType: record["Video Type"] || "",
    language: record.Language || "",
    voiceoverScript: record["Voiceover Script"] || "",
    subtitleText: record["Subtitle Text"] || "",
    musicStyle: record["Music Style"] || "",
    videoLength: record["Video Length"] || "",
    status: record.Status || "Draft",
    outputMp4Url: record["Output MP4 URL"] || "",
    createdAt: record["Created At"] || "",
    notes: record.Notes || "",
  };
  if (auth && auth.mode !== "admin") delete result.notes;
  return result;
}

function homeSaleSanitizeListingForAccess_(listing, auth) {
  if (!listing) return null;
  if (!auth || auth.mode === "admin") return listing;

  var safe = {};
  for (var key in listing) {
    if (!Object.prototype.hasOwnProperty.call(listing, key)) continue;
    safe[key] = listing[key];
  }

  // Trial users need googleDriveFolderUrl to upload photos to their own listings.
  if (auth.mode !== "trial") delete safe.googleDriveFolderUrl;
  delete safe.notes;
  delete safe.internalStatus;
  delete safe.createdByEmail;
  delete safe.createdByAccessCode;
  delete safe.createdByRole;
  return safe;
}

function homeSaleSanitizeMediaForAccess_(media, auth) {
  if (!media) return null;
  if (!auth || auth.mode === "admin") return media;

  var safe = {};
  for (var key in media) {
    if (!Object.prototype.hasOwnProperty.call(media, key)) continue;
    safe[key] = media[key];
  }

  delete safe.notes;
  return safe;
}

function homeSaleGetSheet_(sheetName) {
  var ss = SpreadsheetApp.openById(HOME_SALE_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function homeSaleGetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function homeSaleObjectFromRow_(headers, row) {
  var result = {};
  for (var i = 0; i < headers.length; i++) {
    result[headers[i]] = row[i];
  }
  return result;
}

function createSaleListingMediaFolder_(listingId, address) {
  var parent = DriveApp.getFolderById(HOME_SALE_DRIVE_FOLDER_ID);
  var folderName = listingId + (address ? " - " + address + " - Media" : " - Media");
  // Reuse existing folder with the same name to avoid duplicates on retry.
  var iter = parent.getFoldersByName(folderName);
  var folder = iter.hasNext() ? iter.next() : parent.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder.getUrl();
}

function homeSaleExtractDriveFolderId_(folderUrl) {
  var text = String(folderUrl || "").trim();
  if (!text) return "";

  var folderMatch = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  var idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return "";
}

function homeSaleIsImportableImage_(file) {
  var mimeType = String(file.getMimeType() || "").toLowerCase();
  return mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "image/heic";
}

function homeSaleBuildDriveImagePublicUrl_(fileId) {
  return "https://drive.google.com/uc?export=view&id=" + fileId;
}

function homeSaleParam_(e, key) {
  return (e && e.parameter && e.parameter[key]) || "";
}

function homeSalePad_(value, digits) {
  var text = String(value);
  while (text.length < digits) text = "0" + text;
  return text;
}

function homeSaleOk_(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function homeSaleErr_(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function testSaleDriveBasic() {
  try {
    var root = DriveApp.getRootFolder();
    Logger.log("Root folder OK: " + root.getName());
  } catch (e) {
    Logger.log("Root folder FAILED: " + e.message);
    return;
  }
  try {
    var folder = DriveApp.getFolderById(HOME_SALE_DRIVE_FOLDER_ID);
    Logger.log("Sale parent folder OK: " + folder.getName());
  } catch (e) {
    Logger.log("Sale parent folder getFolderById FAILED: " + e.message);
  }
}

function testSaleFolderCreation() {
  try {
    var url = createSaleListingMediaFolder_("TEST-SALE-001", "456 Test Ave");
    Logger.log("SUCCESS: " + url);
  } catch (e) {
    Logger.log("FAILED: " + e.message);
  }
}
