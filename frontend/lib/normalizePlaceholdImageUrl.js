import {
  getFallbackImageUrl,
  isLegacyPlaceholderUrl,
  readLegacyPlaceholderText,
} from "./fallbackImage";

const PLACEHOLD_IMAGE_FORMAT_RE = /\.(png|jpg|jpeg|webp|gif)$/i;
const PLACEHOLD_FORMAT_SEGMENT_RE = /\/(png|jpg|jpeg|webp|gif)$/i;

export function normalizePlaceholdImageUrl(url) {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (!isLegacyPlaceholderUrl(parsed.toString())) {
      return url;
    }

    const text = readLegacyPlaceholderText(parsed.toString()).toLowerCase();
    const isAdult = /\b18\+\b|\badult\b|\bmature\b|\bnsfw\b|\br18\b/.test(text);

    if (/reader|ep|page|panel|\bp\d+\b/.test(text)) {
      return getFallbackImageUrl({
        kind: "reader",
        adult: isAdult,
      });
    }

    if (/night shelf|reading|login|banner/.test(text)) {
      return getFallbackImageUrl({
        kind: "banner",
        adult: isAdult,
      });
    }

    if (/^me\b|\bnc\b|\bsm\b|\baz\b|avatar/.test(text)) {
      return getFallbackImageUrl({
        kind: "avatar",
        adult: isAdult,
      });
    }

    if (
      PLACEHOLD_IMAGE_FORMAT_RE.test(parsed.pathname) ||
      PLACEHOLD_FORMAT_SEGMENT_RE.test(parsed.pathname)
    ) {
      return getFallbackImageUrl({
        kind: "cover",
        adult: isAdult,
      });
    }

    parsed.pathname = `${parsed.pathname}.png`;
    return getFallbackImageUrl({
      kind: "cover",
      adult: isAdult,
    });
  } catch {
    return url;
  }
}
