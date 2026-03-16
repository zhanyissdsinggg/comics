const PLACEHOLD_IMAGE_FORMAT_RE = /\.(png|jpg|jpeg|webp|gif)$/i;
const PLACEHOLD_FORMAT_SEGMENT_RE = /\/(png|jpg|jpeg|webp|gif)$/i;

export function normalizePlaceholdImageUrl(url) {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "placehold.co") {
      return url;
    }

    if (
      PLACEHOLD_IMAGE_FORMAT_RE.test(parsed.pathname) ||
      PLACEHOLD_FORMAT_SEGMENT_RE.test(parsed.pathname)
    ) {
      return url;
    }

    parsed.pathname = `${parsed.pathname}.png`;
    return parsed.toString();
  } catch {
    return url;
  }
}
