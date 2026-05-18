// Legacy placeholder cleanup normalizer.
// These old hosts are only used to identify legacy data and rewrite it to
// local fallback assets. They must never be emitted again as new fallback
// outputs for storefront rendering.

import {
  getFallbackImageUrl,
  isLegacyInlineReaderPlaceholder,
  isLegacyPlaceholderUrl,
} from "./fallbackImage";
import { getApprovedMockComicPageAsset } from "./readerMockAssets";

export function normalizeLegacyImageUrl(url) {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (isLegacyInlineReaderPlaceholder(url)) {
      return getApprovedMockComicPageAsset({ pageNumber: 1 });
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
      return getApprovedMockComicPageAsset({ pageNumber: 1 });
    }
    return url;
  }
}
