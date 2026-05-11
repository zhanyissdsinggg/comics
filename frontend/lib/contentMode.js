export const CONTENT_MODE_NORMAL = "normal";
export const CONTENT_MODE_ADULT = "adult";

export function normalizeContentMode(value) {
  return value === CONTENT_MODE_ADULT
    ? CONTENT_MODE_ADULT
    : CONTENT_MODE_NORMAL;
}

export function deriveContentModeFromAdultFlag(isAdultMode) {
  return isAdultMode ? CONTENT_MODE_ADULT : CONTENT_MODE_NORMAL;
}

export function isAdultContentMode(value) {
  return normalizeContentMode(value) === CONTENT_MODE_ADULT;
}

export function isNormalContentMode(value) {
  return normalizeContentMode(value) === CONTENT_MODE_NORMAL;
}
