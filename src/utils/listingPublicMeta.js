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

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeStatus(value) {
  if (!value) return "";
  const normalized = String(value).trim().toLowerCase();
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

export function getListingStatusMeta(listing) {
  const status = getListingDisplayStatus(listing);
  return {
    status,
    ...STATUS_META[status],
    applicationsClosed: status === "Rented" || status === "Application Closed",
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
