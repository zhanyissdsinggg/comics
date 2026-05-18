const SERIES_ASSET_BASES = {
  "series-001": "/images/mock-comics/series-001",
  "the last kingdom": "/images/mock-comics/series-001",
  "series-010": "/images/mock-comics/series-010",
  "crimson tide": "/images/mock-comics/series-010",
  "series-012": "/images/mock-comics/series-012",
  "wild hearts": "/images/mock-comics/series-012",
};

const DEFAULT_ASSET_BASE = "/images/mock-comics/default";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePageNumber(pageNumber) {
  const numeric = Number(pageNumber || 1);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return ((Math.round(numeric) - 1) % 3) + 1;
}

export function getApprovedMockComicPageAsset({
  seriesId = "",
  seriesTitle = "",
  pageNumber = 1,
} = {}) {
  const assetBase =
    SERIES_ASSET_BASES[normalizeKey(seriesId)] ||
    SERIES_ASSET_BASES[normalizeKey(seriesTitle)] ||
    DEFAULT_ASSET_BASE;
  return `${assetBase}/page-${normalizePageNumber(pageNumber)}.svg`;
}

export function isApprovedMockComicAsset(value) {
  return /^\/images\/mock-comics\/.+\/page-\d+\.svg$/i.test(
    String(value || "").trim(),
  );
}
