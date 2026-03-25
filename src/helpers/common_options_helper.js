const DEFAULT_LOCATION = "central";
const MAX_LIMIT_VALUE = 1000;

export const extractListFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (data && typeof data === "object" && data.data !== undefined) {
    return extractListFromResponse(data.data);
  }
  return [];
};

export const buildUniqueTextOptions = (items, resolver) => {
  const list = extractListFromResponse(items);
  const seen = new Set();

  list.forEach((item) => {
    const rawValue = resolver(item);
    const value = String(rawValue ?? "").trim();
    if (!value) return;
    seen.add(value);
  });

  return Array.from(seen).sort((a, b) => a.localeCompare(b));
};

export const buildUniqueOptionObjects = (items, resolver) =>
  buildUniqueTextOptions(items, resolver).map((value) => ({ value }));

export const findOptionByValue = (options, rawValue) => {
  const key = String(rawValue ?? "").trim().toLowerCase();
  if (!key) return null;
  return options.find((item) => String(item?.value ?? "").toLowerCase() === key);
};

export const normalizeLocationValue = (rawLocation) => {
  const value = String(rawLocation ?? "").trim();
  return value || DEFAULT_LOCATION;
};

export const buildLocationSuggestions = (movementData) => {
  const list = extractListFromResponse(movementData);
  const countsByKey = new Map();

  list.forEach((movement) => {
    const locationValue = String(movement?.location ?? "").trim();
    if (!locationValue) return;

    const key = locationValue.toLowerCase();
    const existing = countsByKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      countsByKey.set(key, { value: locationValue, count: 1 });
    }
  });

  return Array.from(countsByKey.values()).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
};

export const resolveStockLocationLimit = (rawEnvValue) => {
  if (rawEnvValue === undefined || rawEnvValue === null) {
    return { hasLimit: false, maxLocations: Number.POSITIVE_INFINITY };
  }

  const trimmed = String(rawEnvValue).trim();
  if (!trimmed) {
    return { hasLimit: false, maxLocations: Number.POSITIVE_INFINITY };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { hasLimit: false, maxLocations: Number.POSITIVE_INFINITY };
  }

  const maxLocations = Math.min(Math.floor(parsed), MAX_LIMIT_VALUE);
  return { hasLimit: true, maxLocations };
};

export const isLocationCreationDisabled = (locationCount, maxLocations) =>
  Number.isFinite(maxLocations) && locationCount >= maxLocations;

export const findLocationOption = (locationSuggestions, rawValue) => {
  return findOptionByValue(locationSuggestions, rawValue);
};

export const upsertLocationSuggestion = (
  prevSuggestions,
  rawLocation,
  maxLocations,
) => {
  const normalized = normalizeLocationValue(rawLocation);
  const key = normalized.toLowerCase();
  const existing = prevSuggestions.find((item) => item.value.toLowerCase() === key);

  if (existing) {
    return prevSuggestions
      .map((item) =>
        item.value.toLowerCase() === key
          ? { ...item, count: item.count + 1 }
          : item,
      )
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }

  if (isLocationCreationDisabled(prevSuggestions.length, maxLocations)) {
    return prevSuggestions;
  }

  return [...prevSuggestions, { value: normalized, count: 1 }].sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
};
