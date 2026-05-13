export const SEARCH_HISTORY_KEY = "mn_search_history";
export const SEARCH_HISTORY_EVENT = "mn_search_history_updated";

function normalizeSearchHistory(items, limit) {
  const maxItems = Number.isFinite(limit) ? Math.max(1, limit) : 10;
  const seen = new Set();
  const normalized = [];

  (Array.isArray(items) ? items : []).forEach((item) => {
    const value = typeof item === "string" ? item.trim() : "";
    if (!value) {
      return;
    }

    const dedupeKey = value.toLowerCase();
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    normalized.push(value);
  });

  return normalized.slice(0, maxItems);
}

export function parseSearchHistory(raw, options = {}) {
  const { limit = 10 } = options;

  if (typeof raw !== "string") {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return normalizeSearchHistory(parsed, limit);
    }
  } catch {
    // Fall back to the legacy pipe-delimited format.
  }

  if (trimmed.includes("|")) {
    return normalizeSearchHistory(trimmed.split("|"), limit);
  }

  return normalizeSearchHistory([trimmed], limit);
}

function emitSearchHistory(items) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SEARCH_HISTORY_EVENT, {
      detail: { items },
    }),
  );
}

export function readSearchHistory(options = {}) {
  const { limit = 10 } = options;
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    return parseSearchHistory(raw, { limit });
  } catch {
    return [];
  }
}

export function writeSearchHistory(items, options = {}) {
  const { limit = 10 } = options;
  const normalized = normalizeSearchHistory(items, limit);

  if (typeof window === "undefined") {
    return normalized;
  }

  if (normalized.length === 0) {
    window.localStorage.removeItem(SEARCH_HISTORY_KEY);
  } else {
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(normalized));
  }

  emitSearchHistory(normalized);
  return normalized;
}

export function saveSearchHistoryItem(query, options = {}) {
  const { limit = 10, currentItems } = options;
  const trimmed = typeof query === "string" ? query.trim() : "";

  if (!trimmed) {
    return Array.isArray(currentItems)
      ? normalizeSearchHistory(currentItems, limit)
      : [];
  }

  const baseItems = Array.isArray(currentItems)
    ? currentItems
    : readSearchHistory({ limit });
  return writeSearchHistory([trimmed, ...baseItems], { limit });
}

export function removeSearchHistoryItem(query, options = {}) {
  const { limit = 10, currentItems } = options;
  const trimmed = typeof query === "string" ? query.trim().toLowerCase() : "";

  if (!trimmed) {
    return Array.isArray(currentItems)
      ? normalizeSearchHistory(currentItems, limit)
      : [];
  }

  const baseItems = Array.isArray(currentItems)
    ? currentItems
    : readSearchHistory({ limit });
  const nextItems = baseItems.filter((item) => item.toLowerCase() !== trimmed);
  return writeSearchHistory(nextItems, { limit });
}

export function clearSearchHistory() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SEARCH_HISTORY_KEY);
    emitSearchHistory([]);
  }

  return [];
}

export function subscribeSearchHistory(listener, options = {}) {
  const { limit = 10 } = options;
  if (typeof window === "undefined" || typeof listener !== "function") {
    return () => {};
  }

  const handleUpdate = (event) => {
    const items = Array.isArray(event?.detail?.items)
      ? normalizeSearchHistory(event.detail.items, limit)
      : readSearchHistory({ limit });

    listener(items);
  };

  const handleStorage = (event) => {
    if (event.key && event.key !== SEARCH_HISTORY_KEY) {
      return;
    }

    listener(readSearchHistory({ limit }));
  };

  window.addEventListener(SEARCH_HISTORY_EVENT, handleUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SEARCH_HISTORY_EVENT, handleUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}
