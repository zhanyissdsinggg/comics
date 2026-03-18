function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === "string" && item.trim()) || "";
  }

  return typeof value === "string" ? value : "";
}

export function getSearchParam(searchParams, key, fallback = "") {
  if (!searchParams) {
    return fallback;
  }

  if (typeof searchParams.get === "function") {
    return searchParams.get(key) || fallback;
  }

  const value = normalizeValue(searchParams[key]);
  return value || fallback;
}

export function toURLSearchParams(searchParams) {
  if (!searchParams) {
    return new URLSearchParams();
  }

  if (searchParams instanceof URLSearchParams) {
    return new URLSearchParams(searchParams.toString());
  }

  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        const normalized = normalizeValue(entry);
        if (normalized) {
          params.append(key, normalized);
        }
      });
      return;
    }

    const normalized = normalizeValue(value);
    if (normalized) {
      params.set(key, normalized);
    }
  });

  return params;
}
