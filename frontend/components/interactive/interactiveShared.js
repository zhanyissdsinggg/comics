import { CONTENT_MODE_ADULT } from "../../lib/contentMode";
import { getFallbackImageUrl, resolveDisplayImageUrl } from "../../lib/fallbackImage";

export function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function getInteractiveCover(story) {
  return resolveDisplayImageUrl(story?.coverImage, {
    kind: "cover",
    adult: story?.contentMode === CONTENT_MODE_ADULT,
  });
}

export function getInteractiveNodeImage(story, node) {
  return resolveDisplayImageUrl(node?.imageUrl, {
    kind: "banner",
    adult: story?.contentMode === CONTENT_MODE_ADULT,
  });
}

export function getInteractiveFallbackCover(isAdult = false) {
  return getFallbackImageUrl({
    kind: "cover",
    adult: isAdult,
  });
}
