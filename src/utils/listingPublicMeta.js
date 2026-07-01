export const PUBLIC_LISTING_STATUS_OPTIONS = [
  "Available",
  "Active",
  "Open House",
  "Accepting Applications",
  "Pending",
  "Rented",
  "Application Closed",
  "Closed",
  "Inactive",
  "Removed",
  "Unavailable",
  "Archived",
  "Old",
];

const STATUS_META = {
  Available: {
    label: "Available",
    background: "#e7f7ed",
    color: "#20623d",
    border: "#b8e1c7",
  },
  Active: {
    label: "Active",
    background: "#e7f7ed",
    color: "#20623d",
    border: "#b8e1c7",
  },
  "Open House": {
    label: "Open House",
    background: "#fff4df",
    color: "#8a4b16",
    border: "#efd09b",
  },
  "Accepting Applications": {
    label: "Accepting Applications",
    background: "#e7f7ed",
    color: "#20623d",
    border: "#b8e1c7",
  },
  Pending: {
    label: "Pending",
    background: "#fef3c7",
    color: "#8a5b00",
    border: "#f4d77a",
  },
  Rented: {
    label: "Rented",
    background: "#edf2f7",
    color: "#455468",
    border: "#ced6e0",
  },
  "Application Closed": {
    label: "Application Closed",
    background: "#fce7e7",
    color: "#9b2c2c",
    border: "#efb6b6",
  },
  Closed: {
    label: "Closed",
    background: "#fce7e7",
    color: "#9b2c2c",
    border: "#efb6b6",
  },
  Inactive: {
    label: "Inactive",
    background: "#edf2f7",
    color: "#455468",
    border: "#ced6e0",
  },
  Removed: {
    label: "Removed",
    background: "#edf2f7",
    color: "#455468",
    border: "#ced6e0",
  },
  Unavailable: {
    label: "Unavailable",
    background: "#edf2f7",
    color: "#455468",
    border: "#ced6e0",
  },
  Archived: {
    label: "Archived",
    background: "#edf2f7",
    color: "#455468",
    border: "#ced6e0",
  },
  Old: {
    label: "Old",
    background: "#edf2f7",
    color: "#455468",
    border: "#ced6e0",
  },
};

const STATUS_VALUE_MAP = PUBLIC_LISTING_STATUS_OPTIONS.reduce((map, status) => {
  map[status.toLowerCase()] = status;
  map[status.replace(/\s+/g, "").toLowerCase()] = status;
  return map;
}, {});

Object.assign(STATUS_VALUE_MAP, {
  "可申请": "Accepting Applications",
  "开放申请": "Accepting Applications",
  "开放看房": "Open House",
  "已出租": "Rented",
  "已关闭": "Application Closed",
  "不可申请": "Application Closed",
  "停止申请": "Application Closed",
});

const APPLICATION_STATUS_FIELDS = [
  "tenantListingStatus",
  "listingStatus",
  "availabilityStatus",
  "rentalStatus",
  "tenantStatus",
  "applicationStatus",
  "applicationAvailabilityStatus",
];

const LEGACY_APPLICATION_STATUS_FIELDS = [
  "publicStatus",
  "publicListingStatus",
];

const VISIBILITY_STATUS_WORDS = [
  "published",
  "已发布",
  "draft",
  "unpublished",
  "未发布",
];

const PUBLICATION_CLOSED_WORDS = [
  "rented",
  "closed",
  "inactive",
  "removed",
  "old",
  "leased",
  "unavailable",
  "application closed",
  "applications closed",
  "not available",
  "off market",
  "off-market",
  "archived",
  "deleted",
  "已出租",
  "已关闭",
  "不可申请",
  "停止申请",
];

const APPLICATION_OPEN_WORDS = [
  "available",
  "active",
  "accepting applications",
  "accepting application",
  "open house",
  "可申请",
  "开放申请",
  "开放看房",
];

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value) {
  if (!value) return "";
  const normalized = normalizedText(value);
  return STATUS_VALUE_MAP[normalized] || "";
}

function isVisibilityStatusValue(value) {
  const normalized = normalizedText(value);
  return VISIBILITY_STATUS_WORDS.some((word) => normalized === word || normalized.includes(word));
}

function getApplicationStatusValues(listing) {
  const values = APPLICATION_STATUS_FIELDS
    .map((field) => listing?.[field])
    .filter((value) => typeof value === "string" && value.trim());

  if (values.length > 0) return values.map(normalizedText);

  return LEGACY_APPLICATION_STATUS_FIELDS
    .map((field) => listing?.[field])
    .filter((value) => typeof value === "string" && value.trim() && !isVisibilityStatusValue(value))
    .map(normalizedText);
}

function joinDateTime(date, time) {
  const cleanDate = firstNonEmpty(date);
  const cleanTime = firstNonEmpty(time);
  if (cleanDate && cleanTime) return `${cleanDate} ${cleanTime}`;
  return cleanDate || cleanTime;
}

export function getListingDisplayStatus(listing) {
  const values = getApplicationStatusValues(listing);
  for (const value of values) {
    const normalized = normalizeStatus(value);
    if (normalized) return normalized;
  }
  return "Application Closed";
}

export function isRentalListingAcceptingApplications(listing) {
  const statusValues = getApplicationStatusValues(listing);

  if (statusValues.some((value) => PUBLICATION_CLOSED_WORDS.some((word) => value.includes(word)))) {
    return false;
  }

  const knownDisplayStatus = statusValues.map(normalizeStatus).find(Boolean);
  if (knownDisplayStatus) {
    return knownDisplayStatus === "Available"
      || knownDisplayStatus === "Active"
      || knownDisplayStatus === "Open House"
      || knownDisplayStatus === "Accepting Applications";
  }

  if (statusValues.some((value) => APPLICATION_OPEN_WORDS.some((word) => value.includes(word)))) {
    return true;
  }

  return false;
}

export function getListingStatusMeta(listing) {
  const status = getListingDisplayStatus(listing);
  return {
    status,
    ...STATUS_META[status],
    applicationsClosed: !isRentalListingAcceptingApplications(listing),
  };
}

export function getOpenHouseInfo(listing) {
  if (getListingDisplayStatus(listing) !== "Open House") return null;

  const openHouse = listing?.openHouse && typeof listing.openHouse === "object"
    ? listing.openHouse
    : {};

  const dateTime = firstNonEmpty(
    listing?.openHouseDateTime,
    listing?.openHouseWhen,
    joinDateTime(listing?.openHouseDate, listing?.openHouseTime),
    openHouse.dateTime,
    openHouse.when,
    openHouse.schedule,
  );

  const viewingInstructions = firstNonEmpty(
    listing?.openHouseViewingInstructions,
    listing?.openHouseInstructions,
    openHouse.viewingInstructions,
    openHouse.instructions,
  );

  const parkingAccessNotes = firstNonEmpty(
    listing?.openHouseParkingAccessNotes,
    listing?.openHouseParkingNotes,
    listing?.openHouseAccessNotes,
    openHouse.parkingAccessNotes,
    openHouse.parkingNotes,
    openHouse.accessNotes,
  );

  if (!dateTime && !viewingInstructions && !parkingAccessNotes) return null;

  return {
    dateTime,
    viewingInstructions,
    parkingAccessNotes,
  };
}

export function extractDriveFolderId(link) {
  if (!link) return null;
  const match = String(link).match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function resolveRentalListingCover(rootPhotos = [], coverFiles = [], coverImageFileId = "") {
  const allFiles = [...coverFiles, ...rootPhotos];
  if (coverImageFileId) {
    const match = allFiles.find((file) => file.fileId === coverImageFileId);
    if (match) return match;
    return {
      fileId: coverImageFileId,
      name: "cover-image",
      thumbUrl: `https://drive.google.com/thumbnail?id=${coverImageFileId}&sz=w640-h480`,
      thumbUrlLg: `https://drive.google.com/thumbnail?id=${coverImageFileId}&sz=w1600`,
      url: "",
    };
  }

  if (allFiles.length === 0) return null;

  if (coverFiles.length > 0) {
    const collages = coverFiles
      .filter((file) => file.name && file.name.startsWith("collage_cover__"))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (collages.length > 0) return collages[0];
    return coverFiles[0];
  }

  const sortedRootPhotos = [...rootPhotos].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
  return sortedRootPhotos.find((file) => /^1/i.test(file.name)) || sortedRootPhotos[0];
}

export function resolveRentalListingImageSrc(file) {
  if (!file) return "";
  return file.dataUrl || file.thumbUrlLg || file.thumbUrl || "";
}
