// ============================================================
// AI Home Sale Marketing Studio — Read/Write Apps Script
// Spreadsheet ID: 1z-pCCkJt0XcLmbzPL8ZDKw8fEmLNPc9X7CpRj7FspxQ
// ============================================================

var HOME_SALE_SPREADSHEET_ID = "1z-pCCkJt0XcLmbzPL8ZDKw8fEmLNPc9X7CpRj7FspxQ";
var HOME_SALE_LISTINGS_SHEET = "01 Sale Listings";
var HOME_SALE_MEDIA_SHEET = "02 Media Assets";
var HOME_SALE_MARKETING_SHEET = "03 Marketing Copy";
var HOME_SALE_VIDEO_SHEET = "05 Video Scripts";

function doGet(e) {
  try {
    var action = homeSaleParam_(e, "action");

    if (action === "getSaleListings") return homeSaleOk_(getSaleListings_());
    if (action === "getSaleListingById") return homeSaleOk_(getSaleListingById_(homeSaleParam_(e, "listingId")));
    if (action === "getSaleMediaByListingId") return homeSaleOk_(getSaleMediaByListingId_(homeSaleParam_(e, "listingId")));
    if (action === "getMarketingCopyByListingId") return homeSaleOk_(getMarketingCopyByListingId_(homeSaleParam_(e, "listingId")));
    if (action === "getVideoScriptsByListingId") return homeSaleOk_(getVideoScriptsByListingId_(homeSaleParam_(e, "listingId")));

    return homeSaleErr_("Unknown GET action: " + action);
  } catch (err) {
    return homeSaleErr_(err.message);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || "{}");
    var action = body.action || "";

    if (action === "getSaleListings") return homeSaleOk_(getSaleListings_());
    if (action === "getSaleListingById") return homeSaleOk_(getSaleListingById_(body.listingId));
    if (action === "createSaleListing") return homeSaleOk_(createSaleListing_(body.record || {}));
    if (action === "updateSaleListing") return homeSaleOk_(updateSaleListing_(body.listingId, body.record || {}));
    if (action === "getSaleMediaByListingId") return homeSaleOk_(getSaleMediaByListingId_(body.listingId));
    if (action === "createSaleMediaAsset") return homeSaleOk_(createSaleMediaAsset_(body.record || {}));
    if (action === "syncSaleMediaFromDriveFolder") return homeSaleOk_(syncSaleMediaFromDriveFolder_(body));
    if (action === "getMarketingCopyByListingId") return homeSaleOk_(getMarketingCopyByListingId_(body.listingId));
    if (action === "createOrUpdateMarketingCopy") return homeSaleOk_(createOrUpdateMarketingCopy_(body.copyId, body.record || {}));
    if (action === "getVideoScriptsByListingId") return homeSaleOk_(getVideoScriptsByListingId_(body.listingId));
    if (action === "createOrUpdateVideoScript") return homeSaleOk_(createOrUpdateVideoScript_(body.scriptId, body.record || {}));

    return homeSaleErr_("Unknown POST action: " + action);
  } catch (err) {
    return homeSaleErr_(err.message);
  }
}

function getSaleListings_() {
  var rows = homeSaleGetDataRows_(HOME_SALE_LISTINGS_SHEET);
  return rows
    .map(function(item) { return homeSaleListingFromRecord_(item.record); })
    .filter(function(item) { return !!item.id; });
}

function getSaleListingById_(listingId) {
  if (!listingId) throw new Error("Missing listingId.");
  var match = homeSaleFindByValue_(HOME_SALE_LISTINGS_SHEET, "Listing ID", listingId);
  if (!match) throw new Error("Sale listing not found: " + listingId);
  return homeSaleListingFromRecord_(match.record);
}

function createSaleListing_(record) {
  var sheet = homeSaleGetSheet_(HOME_SALE_LISTINGS_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var listingId = record["Listing ID"] || homeSaleGenerateNextId_(sheet, "Listing ID", "SALE");

  if (homeSaleFindByValue_(HOME_SALE_LISTINGS_SHEET, "Listing ID", listingId)) {
    throw new Error("Listing ID already exists: " + listingId);
  }

  record["Listing ID"] = listingId;
  if (!record.Status) record.Status = "Draft";
  if (!record["Public Listing URL"]) record["Public Listing URL"] = "";

  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true, setUpdatedAt: true });
  return {
    success: true,
    listingId: listingId,
    record: getSaleListingById_(listingId),
  };
}

function updateSaleListing_(listingId, record) {
  var targetId = listingId || record["Listing ID"];
  if (!targetId) throw new Error("Missing Listing ID for update.");

  var match = homeSaleFindByValue_(HOME_SALE_LISTINGS_SHEET, "Listing ID", targetId);
  if (!match) throw new Error("Sale listing not found: " + targetId);

  homeSaleUpdateRecord_(match.sheet, match.headers, match.rowIndex, record, { setUpdatedAt: true });
  return {
    success: true,
    listingId: targetId,
    record: getSaleListingById_(targetId),
  };
}

function getSaleMediaByListingId_(listingId) {
  if (!listingId) throw new Error("Missing listingId.");
  return homeSaleGetDataRows_(HOME_SALE_MEDIA_SHEET)
    .map(function(item) { return homeSaleMediaFromRecord_(item.record); })
    .filter(function(item) { return item.listingId === listingId; });
}

function createSaleMediaAsset_(record) {
  var sheet = homeSaleGetSheet_(HOME_SALE_MEDIA_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var listingId = record["Listing ID"];
  if (!listingId) throw new Error("Missing Listing ID for media asset.");

  var assetId = record["Asset ID"] || homeSaleGenerateNextId_(sheet, "Asset ID", "MEDIA");
  record["Asset ID"] = assetId;

  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true });
  return { success: true, assetId: assetId };
}

function syncSaleMediaFromDriveFolder_(payload) {
  var listingId = payload.listingId || "";
  var folderUrl = payload.folderUrl || "";
  var defaultAssetType = payload.defaultAssetType || "Photo";
  var defaultAssetRole = payload.defaultAssetRole || "Other";
  var startingSortOrder = Number(payload.startingSortOrder || 1);

  if (!listingId) throw new Error("Missing Listing ID for Drive media sync.");
  if (!folderUrl) throw new Error("Missing Google Drive folder URL.");
  if (!Number.isFinite(startingSortOrder) || startingSortOrder < 1) startingSortOrder = 1;

  var listingMatch = homeSaleFindByValue_(HOME_SALE_LISTINGS_SHEET, "Listing ID", listingId);
  if (!listingMatch) throw new Error("Sale listing not found: " + listingId);

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

function getMarketingCopyByListingId_(listingId) {
  if (!listingId) throw new Error("Missing listingId.");
  return homeSaleGetDataRows_(HOME_SALE_MARKETING_SHEET)
    .map(function(item) { return homeSaleMarketingFromRecord_(item.record); })
    .filter(function(item) { return item.listingId === listingId; });
}

function createOrUpdateMarketingCopy_(copyId, record) {
  var sheet = homeSaleGetSheet_(HOME_SALE_MARKETING_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var finalCopyId = copyId || record["Copy ID"];

  if (finalCopyId) {
    var match = homeSaleFindByValue_(HOME_SALE_MARKETING_SHEET, "Copy ID", finalCopyId);
    if (match) {
      homeSaleUpdateRecord_(match.sheet, match.headers, match.rowIndex, record, { setUpdatedAt: true });
      return { success: true, copyId: finalCopyId };
    }
  }

  finalCopyId = finalCopyId || homeSaleGenerateNextId_(sheet, "Copy ID", "COPY");
  record["Copy ID"] = finalCopyId;
  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true, setUpdatedAt: true });
  return { success: true, copyId: finalCopyId };
}

function getVideoScriptsByListingId_(listingId) {
  if (!listingId) throw new Error("Missing listingId.");
  return homeSaleGetDataRows_(HOME_SALE_VIDEO_SHEET)
    .map(function(item) { return homeSaleVideoFromRecord_(item.record); })
    .filter(function(item) { return item.listingId === listingId; });
}

function createOrUpdateVideoScript_(scriptId, record) {
  var sheet = homeSaleGetSheet_(HOME_SALE_VIDEO_SHEET);
  var headers = homeSaleGetHeaders_(sheet);
  var finalScriptId = scriptId || record["Script ID"];

  if (finalScriptId) {
    var match = homeSaleFindByValue_(HOME_SALE_VIDEO_SHEET, "Script ID", finalScriptId);
    if (match) {
      homeSaleUpdateRecord_(match.sheet, match.headers, match.rowIndex, record, {});
      return { success: true, scriptId: finalScriptId };
    }
  }

  finalScriptId = finalScriptId || homeSaleGenerateNextId_(sheet, "Script ID", "SCRIPT");
  record["Script ID"] = finalScriptId;
  homeSaleAppendRecord_(sheet, headers, record, { setCreatedAt: true });
  return { success: true, scriptId: finalScriptId };
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

function homeSaleListingFromRecord_(record) {
  return {
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
    notes: record.Notes || "",
    internalStatus: record["Internal Status"] || "",
    createdAt: record["Created At"] || "",
    updatedAt: record["Updated At"] || "",
  };
}

function homeSaleMediaFromRecord_(record) {
  return {
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
}

function homeSaleMarketingFromRecord_(record) {
  return {
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
}

function homeSaleVideoFromRecord_(record) {
  return {
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
