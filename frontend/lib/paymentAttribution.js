const STORAGE_KEY = "mn_payment_attribution";

const QUERY_KEY_MAP = {
  promotionId: "promotionId",
  offerId: "offerId",
  entryPoint: "entry",
  campaignId: "campaignId",
  sourcePath: "sourcePath",
  sourceSeriesId: "seriesId",
  sourceEpisodeId: "episodeId",
  returnTo: "returnTo",
};

function trimString(value, maxLength) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

function normalizePath(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const raw = value.trim();
  if (!raw) {
    return undefined;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    if (typeof window === "undefined") {
      return undefined;
    }

    try {
      const parsed = new URL(raw);
      if (parsed.origin !== window.location.origin) {
        return undefined;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 512);
    } catch {
      return undefined;
    }
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
  return normalized.slice(0, 512);
}

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function normalizePaymentAttribution(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const attribution = {
    promotionId: trimString(input.promotionId, 120),
    offerId: trimString(input.offerId, 120),
    entryPoint: trimString(input.entryPoint, 80),
    campaignId: trimString(input.campaignId, 120),
    sourcePath: normalizePath(input.sourcePath),
    sourceSeriesId: trimString(input.sourceSeriesId, 120),
    sourceEpisodeId: trimString(input.sourceEpisodeId, 120),
    returnTo: normalizePath(input.returnTo),
  };

  return Object.values(attribution).some(Boolean) ? attribution : null;
}

export function mergePaymentAttribution(...items) {
  const merged = {};
  items.forEach((item) => {
    const normalized = normalizePaymentAttribution(item);
    if (!normalized) {
      return;
    }
    Object.assign(merged, normalized);
  });
  return normalizePaymentAttribution(merged);
}

export function readPaymentAttributionFromSearchParams(searchParams) {
  if (!searchParams) {
    return null;
  }

  const readValue = (key, fallbackKey) => {
    if (typeof searchParams.get !== "function") {
      return undefined;
    }
    return searchParams.get(key) || (fallbackKey ? searchParams.get(fallbackKey) : undefined);
  };

  return normalizePaymentAttribution({
    promotionId: readValue("promotionId"),
    offerId: readValue("offerId"),
    entryPoint: readValue("entry", "entryPoint"),
    campaignId: readValue("campaignId"),
    sourcePath: readValue("sourcePath"),
    sourceSeriesId: readValue("seriesId", "sourceSeriesId"),
    sourceEpisodeId: readValue("episodeId", "sourceEpisodeId"),
    returnTo: readValue("returnTo"),
  });
}

export function persistPaymentAttribution(attribution) {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  const normalized = normalizePaymentAttribution(attribution);
  try {
    if (!normalized) {
      storage.removeItem(STORAGE_KEY);
      return;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore browser storage quota/privacy errors.
  }
}

export function loadPersistedPaymentAttribution() {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizePaymentAttribution(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearPersistedPaymentAttribution() {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore browser storage quota/privacy errors.
  }
}

export function buildPathWithAttribution(path, attribution, extraParams = {}) {
  const rawPath = String(path || "");
  const hashIndex = rawPath.indexOf("#");
  const pathWithoutHash = hashIndex >= 0 ? rawPath.slice(0, hashIndex) : rawPath;
  const hash = hashIndex >= 0 ? rawPath.slice(hashIndex) : "";
  const [pathname, rawQuery = ""] = pathWithoutHash.split("?");
  const params = new URLSearchParams(rawQuery);
  const normalized = normalizePaymentAttribution(attribution);

  if (normalized) {
    Object.entries(QUERY_KEY_MAP).forEach(([attributeKey, queryKey]) => {
      const value = normalized[attributeKey];
      if (value) {
        params.set(queryKey, value);
      }
    });
  }

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `${pathname}?${query}${hash}` : `${pathname}${hash}`;
}