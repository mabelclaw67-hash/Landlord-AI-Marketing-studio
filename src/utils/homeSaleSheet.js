import { getStudioRequestAuth } from "./trialAccess";

const HOME_SALE_SPREADSHEET_ID = "1z-pCCkJt0XcLmbzPL8ZDKw8fEmLNPc9X7CpRj7FspxQ";
const HOME_SALE_EXEC_URL = import.meta.env.VITE_HOME_SALE_EXEC_URL || "";

export const homeSaleSheetConfig = {
  spreadsheetId: HOME_SALE_SPREADSHEET_ID,
  spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${HOME_SALE_SPREADSHEET_ID}/edit`,
  tabs: {
    listings: "01 Sale Listings",
    media: "02 Media Assets",
    marketing: "03 Marketing Copy",
    video: "05 Video Scripts",
  },
};

export const HOME_SALE_STATUS_OPTIONS = [
  "Draft",
  "In Review",
  "Ready to Publish",
  "Published",
  "Open House",
  "Pending",
  "Sold",
  "Archived",
  "Active",
];

export const HOME_SALE_PROPERTY_TYPES = [
  "House",
  "Townhouse",
  "Condo",
  "Apartment",
  "Duplex",
  "Triplex",
  "Acreage",
  "Commercial",
  "Land",
  "Other",
];

export const HOME_SALE_MEDIA_TYPE_OPTIONS = ["Photo", "Video", "Floorplan"];
export const HOME_SALE_MEDIA_ROLE_OPTIONS = [
  "Cover",
  "Exterior",
  "Living Room",
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Yard",
  "View",
  "Other",
];

export const HOME_SALE_MARKETING_CHANNELS = [
  "Website",
  "WeChat",
  "Xiaohongshu",
  "Facebook",
  "Realtor version",
  "FSBO owner version",
];

export const HOME_SALE_LANGUAGES = ["Chinese", "English", "Bilingual"];
export const HOME_SALE_MARKETING_STATUS_OPTIONS = ["Draft", "In Review", "Ready", "Published", "Archived"];
export const HOME_SALE_VIDEO_TYPES = ["Listing Video", "Walkthrough", "Open House", "Realtor Version", "FSBO Version"];
export const HOME_SALE_VIDEO_STATUS_OPTIONS = ["Draft", "In Review", "Ready", "Published", "Archived"];

const LISTING_HEADER_MAP = {
  "Listing ID": "listingId",
  Status: "status",
  "Owner Name": "ownerName",
  "Property Address": "address",
  City: "city",
  Province: "province",
  "Asking Price": "askingPrice",
  "Property Type": "propertyType",
  Bedrooms: "bedrooms",
  Bathrooms: "bathrooms",
  "Interior SqFt": "interiorSqft",
  "Lot Size": "lotSize",
  "Year Built": "yearBuilt",
  "Key Features": "keyFeatures",
  "Description EN": "descriptionEn",
  "Description CN": "descriptionCn",
  "Contact Name": "contactName",
  "Contact Phone": "contactPhone",
  "Contact Email": "contactEmail",
  "Public Listing URL": "publicListingUrl",
  "QR Code URL": "qrCodeUrl",
  "Google Drive Folder URL": "googleDriveFolderUrl",
  "Primary Photo URL": "primaryPhotoUrl",
  "Video URL": "videoUrl",
  "MLS Number": "mlsNumber",
  "Listing Source": "listingSource",
  Notes: "notes",
  "Internal Status": "internalStatus",
  "Created At": "createdAt",
  "Updated At": "updatedAt",
  "Created By Email": "createdByEmail",
  "Created By Access Code": "createdByAccessCode",
  "Created By Role": "createdByRole",
};

const MEDIA_HEADER_MAP = {
  "Asset ID": "assetId",
  "Listing ID": "listingId",
  "Asset Type": "assetType",
  "Asset Role": "assetRole",
  "File Name": "fileName",
  "Drive URL": "driveUrl",
  "Public URL": "publicUrl",
  "Sort Order": "sortOrder",
  "Caption EN": "captionEn",
  "Caption CN": "captionCn",
  "Alt Text": "altText",
  "Created At": "createdAt",
  Notes: "notes",
};

const MARKETING_HEADER_MAP = {
  "Copy ID": "copyId",
  "Listing ID": "listingId",
  Channel: "channel",
  Language: "language",
  Headline: "headline",
  "Body Copy": "bodyCopy",
  "Call To Action": "callToAction",
  Hashtags: "hashtags",
  "Public URL": "publicUrl",
  Version: "version",
  Status: "status",
  "Created At": "createdAt",
  "Updated At": "updatedAt",
};

const VIDEO_HEADER_MAP = {
  "Script ID": "scriptId",
  "Listing ID": "listingId",
  "Video Type": "videoType",
  Language: "language",
  "Voiceover Script": "voiceoverScript",
  "Subtitle Text": "subtitleText",
  "Music Style": "musicStyle",
  "Video Length": "videoLength",
  Status: "status",
  "Output MP4 URL": "outputMp4Url",
  "Created At": "createdAt",
  Notes: "notes",
};

const LISTING_SUPPORTED_HEADERS = Object.keys(LISTING_HEADER_MAP);
const LISTING_CONNECTED_HEADERS = [
  "Listing ID",
  "Status",
  "Owner Name",
  "Property Address",
  "City",
  "Province",
  "Asking Price",
  "Property Type",
  "Bedrooms",
  "Bathrooms",
  "Interior SqFt",
  "Lot Size",
  "Year Built",
  "Key Features",
  "Description EN",
  "Description CN",
  "Contact Name",
  "Contact Phone",
  "Contact Email",
  "Public Listing URL",
  "QR Code URL",
  "Google Drive Folder URL",
  "Primary Photo URL",
  "Video URL",
  "MLS Number",
  "Listing Source",
];

export function isHomeSaleApiConnected() {
  return !!HOME_SALE_EXEC_URL && !HOME_SALE_EXEC_URL.startsWith("PASTE");
}

export function getHomeSaleSetupMessage() {
  return "Home Sale Apps Script endpoint is not configured or not redeployed yet. Please update the separate Home Sale web app and set VITE_HOME_SALE_EXEC_URL in .env.local.";
}

export function getHomeSaleFieldConnectionWarnings() {
  return [
    "Notes",
    "Internal Status",
  ].filter((header) => LISTING_SUPPORTED_HEADERS.includes(header) && !LISTING_CONNECTED_HEADERS.includes(header));
}

export function buildHomeSalePublicUrl(listingId) {
  if (!listingId) return "";
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/home-sale-studio/listings/${listingId}`;
  }
  return `/home-sale-studio/listings/${listingId}`;
}

export function createEmptySaleListingForm(overrides = {}) {
  return {
    listingId: "",
    status: "Draft",
    ownerName: "",
    address: "",
    city: "Nanaimo",
    province: "BC",
    askingPrice: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
    interiorSqft: "",
    lotSize: "",
    yearBuilt: "",
    keyFeatures: "",
    descriptionCn: "",
    descriptionEn: "",
    contactName: "Mabel Chen",
    contactPhone: "672-514-8866",
    contactEmail: "mabelclaw67@gmail.com",
    publicListingUrl: "",
    qrCodeUrl: "",
    googleDriveFolderUrl: "",
    primaryPhotoUrl: "",
    videoUrl: "",
    mlsNumber: "",
    listingSource: "Manual / Realtor / FSBO",
    notes: "",
    internalStatus: "",
    ...overrides,
  };
}

export async function getHomeSaleListings() {
  ensureHomeSaleApiConnected();
  const data = await homeSaleApiGet({ action: "getSaleListings", ...getStudioRequestAuth("sale") });
  return Array.isArray(data) ? data.map(normalizeSaleListing) : [];
}

export async function getHomeSaleListing(listingId) {
  ensureHomeSaleApiConnected();
  if (!listingId) throw new Error("Missing sale listing ID.");
  const data = await homeSaleApiGet({ action: "getSaleListingById", listingId, ...getStudioRequestAuth("sale") });
  return normalizeSaleListing(data);
}

export async function createSaleListing(values) {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({
    action: "createSaleListing",
    record: buildSaleListingRecord(values),
    ...getStudioRequestAuth("sale"),
  });
}

export async function updateSaleListing(values) {
  ensureHomeSaleApiConnected();
  const listingId = values?.listingId || values?.id;
  if (!listingId) throw new Error("Missing Listing ID for update.");
  return homeSaleApiPost({
    action: "updateSaleListing",
    listingId,
    record: buildSaleListingRecord(values),
    ...getStudioRequestAuth("sale"),
  });
}

export async function getSaleMediaByListingId(listingId) {
  ensureHomeSaleApiConnected();
  if (!listingId) throw new Error("Missing Listing ID for media lookup.");
  const data = await homeSaleApiGet({ action: "getSaleMediaByListingId", listingId, ...getStudioRequestAuth("sale") });
  return Array.isArray(data) ? data.map((item) => normalizeRecord(item, MEDIA_HEADER_MAP)) : [];
}

export async function createSaleMediaAsset(values) {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({
    action: "createSaleMediaAsset",
    record: buildSaleMediaRecord(values),
    ...getStudioRequestAuth("sale"),
  });
}

export async function uploadSaleMediaFile({ listingId, file, sortOrder, assetRole }) {
  ensureHomeSaleApiConnected();
  const base64 = await fileToBase64(file);
  return homeSaleApiPost({
    action: "uploadSaleMediaFile",
    listingId,
    fileName: file.name,
    mimeType: file.type || "image/jpeg",
    data: base64,
    sortOrder: sortOrder || "",
    assetRole: assetRole || "Other",
    ...getStudioRequestAuth("sale"),
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function syncSaleMediaFromDriveFolder(values) {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({
    action: "syncSaleMediaFromDriveFolder",
    listingId: values.listingId || "",
    folderUrl: values.folderUrl || "",
    startingSortOrder: values.startingSortOrder || 1,
    defaultAssetType: values.defaultAssetType || "Photo",
    defaultAssetRole: values.defaultAssetRole || "Other",
    ...getStudioRequestAuth("sale"),
  });
}

export async function getPublicSaleMarketingCopy(listingId) {
  if (!HOME_SALE_EXEC_URL || !listingId) return [];
  try {
    const data = await homeSaleApiGet({ action: "getMarketingCopyByListingId", listingId });
    return Array.isArray(data) ? data.map((item) => normalizeRecord(item, MARKETING_HEADER_MAP)) : [];
  } catch (_) { return []; }
}

export async function getPublicSaleVideoScripts(listingId) {
  if (!HOME_SALE_EXEC_URL || !listingId) return [];
  try {
    const data = await homeSaleApiGet({ action: "getVideoScriptsByListingId", listingId });
    return Array.isArray(data) ? data.map((item) => normalizeRecord(item, VIDEO_HEADER_MAP)) : [];
  } catch (_) { return []; }
}

export async function getMarketingCopyByListingId(listingId) {
  ensureHomeSaleApiConnected();
  if (!listingId) throw new Error("Missing Listing ID for marketing lookup.");
  const data = await homeSaleApiGet({ action: "getMarketingCopyByListingId", listingId, ...getStudioRequestAuth("sale") });
  return Array.isArray(data) ? data.map((item) => normalizeRecord(item, MARKETING_HEADER_MAP)) : [];
}

export async function createOrUpdateMarketingCopy(values) {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({
    action: "createOrUpdateMarketingCopy",
    copyId: values.copyId || "",
    record: buildMarketingCopyRecord(values),
    ...getStudioRequestAuth("sale"),
  });
}

export async function generateHomeSaleMarketingCopy(listingId) {
  ensureHomeSaleApiConnected();
  if (!listingId) throw new Error("Missing Listing ID for marketing copy generation.");
  return homeSaleApiPost({
    action: "generateHomeSaleMarketingCopy",
    listingId,
    ...getStudioRequestAuth("sale"),
  });
}

export async function getVideoScriptsByListingId(listingId) {
  ensureHomeSaleApiConnected();
  if (!listingId) throw new Error("Missing Listing ID for video workflow lookup.");
  const data = await homeSaleApiGet({ action: "getVideoScriptsByListingId", listingId, ...getStudioRequestAuth("sale") });
  return Array.isArray(data) ? data.map((item) => normalizeRecord(item, VIDEO_HEADER_MAP)) : [];
}

export async function createOrUpdateVideoScript(values) {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({
    action: "createOrUpdateVideoScript",
    scriptId: values.scriptId || "",
    record: buildVideoScriptRecord(values),
    ...getStudioRequestAuth("sale"),
  });
}

export function getSuggestedSaleListingId(listings = []) {
  const year = new Date().getFullYear();
  const prefix = `SALE-${year}-`;
  const maxNum = listings.reduce((acc, item) => {
    const id = item?.id || item?.listingId || "";
    if (!id.startsWith(prefix)) return acc;
    const num = Number(id.slice(prefix.length));
    return Number.isFinite(num) ? Math.max(acc, num) : acc;
  }, 0);
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

export function formatSalePrice(value) {
  const digits = String(value || "").replace(/[^\d.]/g, "");
  if (!digits) return "待填写 / To be added";
  const amount = Number(digits);
  if (Number.isNaN(amount)) return String(value || "");
  return `$${amount.toLocaleString()}`;
}

export function extractHomeSaleDriveFileId(url) {
  const text = String(url || "").trim();
  if (!text) return "";
  const fileMatch = text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = text.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return "";
}

export function toHomeSaleImageSrc(url, width = 1200) {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return "";
  const fileId = extractHomeSaleDriveFileId(cleanUrl);
  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
  return cleanUrl;
}

export function resolveHomeSaleImageUrl(listing = {}, mediaRows = [], width = 1200) {
  const listingCandidates = [
    listing.primaryPhotoUrl,
    listing.coverImageUrl,
    listing.photoUrl,
    listing.imageUrl,
    listing.thumbnailUrl,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const mediaCandidates = []
    .concat(
      mediaRows.filter((item) => item.assetType === "Photo" && item.assetRole === "Cover"),
      mediaRows.filter((item) => item.assetType === "Photo"),
      mediaRows
    )
    .flatMap((item) => [item?.publicUrl, item?.driveUrl])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const candidate = [...listingCandidates, ...mediaCandidates].find(Boolean) || "";
  return toHomeSaleImageSrc(candidate, width);
}

export function normalizeSaleListing(data) {
  const normalized = normalizeRecord(data, LISTING_HEADER_MAP);
  return {
    ...createEmptySaleListingForm(),
    ...normalized,
    id: normalized.listingId || normalized.id || "",
    publicListingUrl: normalized.publicListingUrl || buildHomeSalePublicUrl(normalized.listingId || normalized.id || ""),
  };
}

function normalizeRecord(data, headerMap) {
  const result = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (headerMap[key]) {
      result[headerMap[key]] = value ?? "";
      return;
    }
    result[key] = value ?? "";
  });
  return result;
}

function buildSaleListingRecord(values) {
  const state = createEmptySaleListingForm(values);
  return {
    "Listing ID": state.listingId || "",
    Status: state.status || "Draft",
    "Owner Name": state.ownerName || "",
    "Property Address": state.address || "",
    City: state.city || "",
    Province: state.province || "",
    "Asking Price": state.askingPrice || "",
    "Property Type": state.propertyType || "",
    Bedrooms: state.bedrooms || "",
    Bathrooms: state.bathrooms || "",
    "Interior SqFt": state.interiorSqft || "",
    "Lot Size": state.lotSize || "",
    "Year Built": state.yearBuilt || "",
    "Key Features": state.keyFeatures || "",
    "Description EN": state.descriptionEn || "",
    "Description CN": state.descriptionCn || "",
    "Contact Name": state.contactName || "",
    "Contact Phone": state.contactPhone || "",
    "Contact Email": state.contactEmail || "",
    "Public Listing URL": state.publicListingUrl || buildHomeSalePublicUrl(state.listingId || ""),
    "QR Code URL": state.qrCodeUrl || "",
    "Google Drive Folder URL": state.googleDriveFolderUrl || "",
    "Primary Photo URL": state.primaryPhotoUrl || "",
    "Video URL": state.videoUrl || "",
    "MLS Number": state.mlsNumber || "",
    "Listing Source": state.listingSource || "",
    Notes: state.notes || "",
    "Internal Status": state.internalStatus || "",
  };
}

function buildSaleMediaRecord(values) {
  return {
    "Asset ID": values.assetId || "",
    "Listing ID": values.listingId || "",
    "Asset Type": values.assetType || "Photo",
    "Asset Role": values.assetRole || "Other",
    "File Name": values.fileName || "",
    "Drive URL": values.driveUrl || "",
    "Public URL": values.publicUrl || "",
    "Sort Order": values.sortOrder || "",
    "Caption EN": values.captionEn || "",
    "Caption CN": values.captionCn || "",
    "Alt Text": values.altText || "",
    Notes: values.notes || "",
  };
}

function buildMarketingCopyRecord(values) {
  return {
    "Copy ID": values.copyId || "",
    "Listing ID": values.listingId || "",
    Channel: values.channel || "Website",
    Language: values.language || "Chinese",
    Headline: values.headline || "",
    "Body Copy": values.bodyCopy || "",
    "Call To Action": values.callToAction || "",
    Hashtags: values.hashtags || "",
    "Public URL": values.publicUrl || buildHomeSalePublicUrl(values.listingId || ""),
    Version: values.version || "v1",
    Status: values.status || "Draft",
  };
}

function buildVideoScriptRecord(values) {
  return {
    "Script ID": values.scriptId || "",
    "Listing ID": values.listingId || "",
    "Video Type": values.videoType || "Listing Video",
    Language: values.language || "Chinese",
    "Voiceover Script": values.voiceoverScript || "",
    "Subtitle Text": values.subtitleText || "",
    "Music Style": values.musicStyle || "",
    "Video Length": values.videoLength || "",
    Status: values.status || "Draft",
    "Output MP4 URL": values.outputMp4Url || "",
    Notes: values.notes || "",
  };
}

export async function saveHomeSaleShowingAvailability(listingId, showingAvailability) {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({
    action: "updateSaleListing",
    listingId,
    record: { "Showing Availability": showingAvailability },
    ...getStudioRequestAuth("sale"),
  });
}

export async function getHomeSaleBuyerInquiries() {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({ action: "getBuyerInquiries", ...getStudioRequestAuth("sale") });
}

export async function updateHomeSaleBuyerInquiry(inquiryId, { status, sellerApproval, sellerNotes, confirmedShowingTime, sendNotification = false }) {
  ensureHomeSaleApiConnected();
  return homeSaleApiPost({
    action: "updateBuyerInquiry",
    inquiryId,
    status,
    sellerApproval,
    sellerNotes,
    confirmedShowingTime,
    sendNotification,
    ...getStudioRequestAuth("sale"),
  });
}

export async function submitHomeSaleBuyerInquiry({ listingId, listingTitle, buyerFirstName, buyerLastName, phone, email, preferredShowingDate, preferredTimeWindow, message }) {
  if (!HOME_SALE_EXEC_URL) throw new Error("Home Sale API endpoint is not configured.");
  return homeSaleApiPost({
    action: "submitBuyerInquiry",
    listingId,
    listingTitle,
    buyerFirstName,
    buyerLastName,
    phone,
    email,
    preferredShowingDate,
    preferredTimeWindow,
    message,
  });
}

function ensureHomeSaleApiConnected() {
  if (!isHomeSaleApiConnected()) {
    throw new Error(getHomeSaleSetupMessage());
  }
}

async function homeSaleApiGet(params) {
  const url = new URL(HOME_SALE_EXEC_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set("_t", String(Date.now()));

  const res = await fetch(url.toString(), {
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Home Sale API GET error: ${res.status}`);

  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

async function homeSaleApiPost(payload) {
  const res = await fetch(HOME_SALE_EXEC_URL, {
    method: "POST",
    redirect: "follow",
    cache: "no-store",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Home Sale API POST error: ${res.status}`);
  }

  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}
