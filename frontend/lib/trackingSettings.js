export const TRACKING_SETTINGS_STORAGE_KEY = "mn_tracking_settings_v1";
export const TRACKING_SETTINGS_GLOBAL_KEY = "__mnTrackingSettings";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function coerceSnapshot(input) {
  if (!input) {
    return null;
  }

  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }

  return isObject(input) ? input : null;
}

export function parseTrackingSettingsSnapshot(input) {
  const parsed = coerceSnapshot(input);
  if (!parsed) {
    return {
      savedAt: "",
      values: {},
    };
  }

  const values = isObject(parsed.values)
    ? parsed.values
    : isObject(parsed)
      ? parsed
      : {};

  return {
    savedAt: readString(parsed.savedAt),
    values,
  };
}

export function writeTrackingSettingsToWindow(values) {
  if (typeof window === "undefined") {
    return;
  }

  window[TRACKING_SETTINGS_GLOBAL_KEY] = isObject(values) ? values : {};
}

export function readTrackingSettingsSnapshot() {
  if (typeof window === "undefined") {
    return {
      savedAt: "",
      values: {},
    };
  }

  const fromWindow = parseTrackingSettingsSnapshot({
    values: window[TRACKING_SETTINGS_GLOBAL_KEY],
  });
  if (Object.keys(fromWindow.values || {}).length > 0) {
    return fromWindow;
  }

  const raw = window.localStorage.getItem(TRACKING_SETTINGS_STORAGE_KEY);
  const snapshot = parseTrackingSettingsSnapshot(raw);
  writeTrackingSettingsToWindow(snapshot.values);
  return snapshot;
}

export function getGoogleTrackingConfig(
  snapshot = readTrackingSettingsSnapshot(),
) {
  const values = isObject(snapshot?.values) ? snapshot.values : {};
  const google = isObject(values.google) ? values.google : {};

  return {
    measurementId: readString(google.measurementId),
    adsConversionId: readString(google.adsConversionId),
  };
}

export function getSnapTrackingConfig(
  snapshot = readTrackingSettingsSnapshot(),
) {
  const values = isObject(snapshot?.values) ? snapshot.values : {};
  const snapchat = isObject(values.snapchat) ? values.snapchat : {};

  return {
    pixelId: readString(snapchat.pixelId),
    apiToken: readString(snapchat.apiToken),
  };
}
