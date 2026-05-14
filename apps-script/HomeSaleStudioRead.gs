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
    if (action === "generateHomeSaleMarketingCopy") return homeSaleOk_(generateHomeSaleMarketingCopy_(body.listingId));
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

function generateHomeSaleMarketingCopy_(listingId) {
  if (!listingId) throw new Error("Missing listingId for marketing copy generation.");

  var listing = getSaleListingById_(listingId);
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

  generatedRows = getMarketingCopyByListingId_(listingId)
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

function getVideoScriptsByListingId_(listingId) {
  if (!listingId) throw new Error("Missing listingId.");
  return homeSaleGetDataRows_(HOME_SALE_VIDEO_SHEET)
    .map(function(item) { return homeSaleVideoFromRecord_(item.record); })
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
