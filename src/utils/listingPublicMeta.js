export const PUBLIC_LISTING_STATUS_OPTIONS = [
  "Available",
  "Open House",
  "Pending",
  "Rented",
  "Application Closed",
];

const STATUS_META = {
  Available: {
    label: "Available",
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
};

const STATUS_VALUE_MAP = PUBLIC_LISTING_STATUS_OPTIONS.reduce((map, status) => {
  map[status.toLowerCase()] = status;
  map[status.replace(/\s+/g, "").toLowerCase()] = status;
  return map;
}, {});

const STATUS_FIELDS = [
  "tenantListingStatus",
  "listingStatus",
  "publicStatus",
  "publicListingStatus",
  "availabilityStatus",
  "rentalStatus",
  "tenantStatus",
  "status",
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
];

const APPLICATION_OPEN_WORDS = [
  "available",
  "active",
  "accepting applications",
  "accepting application",
  "applications open",
  "application open",
  "open house",
  "open",
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

function joinDateTime(date, time) {
  const cleanDate = firstNonEmpty(date);
  const cleanTime = firstNonEmpty(time);
  if (cleanDate && cleanTime) return `${cleanDate} ${cleanTime}`;
  return cleanDate || cleanTime;
}

export function getListingDisplayStatus(listing) {
  for (const field of STATUS_FIELDS) {
    const normalized = normalizeStatus(listing?.[field]);
    if (normalized) return normalized;
  }
  return "Available";
}

export function isRentalListingAcceptingApplications(listing) {
  const statusValues = STATUS_FIELDS
    .map((field) => normalizedText(listing?.[field]))
    .filter(Boolean);

  if (statusValues.some((value) => PUBLICATION_CLOSED_WORDS.some((word) => value.includes(word)))) {
    return false;
  }

  const knownDisplayStatus = statusValues.map(normalizeStatus).find(Boolean);
  if (knownDisplayStatus) {
    return knownDisplayStatus === "Available" || knownDisplayStatus === "Open House";
  }

  if (statusValues.some((value) => APPLICATION_OPEN_WORDS.some((word) => value.includes(word)))) {
    return true;
  }

  const publishStatus = normalizedText(listing?.status || listing?.listingStatus);
  return publishStatus === "published";
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
  return file.dataUrl || file.thumbUrlLg || file.thumbUrl || file.url || "";
}
