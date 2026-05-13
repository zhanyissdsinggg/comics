export const PUBLIC_SERIES_IDS = Object.freeze(
  Array.from(
    { length: 12 },
    (_, index) => `series-${String(index + 1).padStart(3, "0")}`,
  ),
);

export function isKnownPublicSeriesId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return PUBLIC_SERIES_IDS.includes(normalized);
}

export function buildPublicSeriesStaticParams() {
  return PUBLIC_SERIES_IDS.map((id) => ({ id }));
}
