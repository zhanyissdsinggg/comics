export function normalizeReadingPercent(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  if (numeric <= 1) {
    return Math.min(1, numeric);
  }

  return Math.min(1, numeric / 100);
}
