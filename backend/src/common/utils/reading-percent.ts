function toNumeric(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toStoredReadingPercent(value: unknown): number {
  const numeric = toNumeric(value);
  if (numeric <= 0) {
    return 0;
  }
  if (numeric <= 1) {
    return Math.min(100, Math.round(numeric * 100));
  }
  return Math.min(100, Math.round(numeric));
}

export function toClientReadingPercent(value: unknown): number {
  const numeric = toNumeric(value);
  if (numeric <= 0) {
    return 0;
  }
  if (numeric <= 1) {
    return Math.min(1, numeric);
  }
  return Math.min(1, numeric / 100);
}
