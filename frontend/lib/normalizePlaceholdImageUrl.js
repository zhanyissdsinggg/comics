import {
  getFallbackImageUrl,
  isLegacyInlineReaderPlaceholder,
  isLegacyPlaceholderUrl,
} from "./fallbackImage";

export function normalizePlaceholdImageUrl(url) {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (isLegacyInlineReaderPlaceholder(url)) {
      return getFallbackImageUrl({
        kind: "reader",
        adult: false,
      });
    }

    if (!isLegacyPlaceholderUrl(parsed.toString())) {
      return url;
    }

    const pathname = String(parsed.pathname || "").toLowerCase();
    const isAvatarLike =
      pathname.includes("avatar") ||
      pathname.includes("/profile/") ||
      pathname.includes("/user/");
    const isBannerLike =
      pathname.includes("banner") ||
      pathname.includes("hero") ||
      pathname.includes("promo");

    return getFallbackImageUrl({
      kind: isAvatarLike ? "avatar" : isBannerLike ? "banner" : "reader",
      adult: false,
      variant: isAvatarLike ? "reader" : "",
    });
  } catch {
    if (isLegacyInlineReaderPlaceholder(url)) {
      return getFallbackImageUrl({
        kind: "reader",
        adult: false,
      });
    }
    return url;
  }
}
