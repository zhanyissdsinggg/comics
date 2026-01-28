export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function ensureString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
