import { cache } from "react";
import { buildCreatorDirectory } from "./creatorDirectory";
import {
  creatorMatchesSlug,
  getCreatorDisplayName,
  humanizeCreatorSlug,
} from "./creators";

export const SEO_REVALIDATE_SECONDS = 300;

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function getSeoApiBaseUrl() {
  return normalizeBaseUrl(
    process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:4000",
  );
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCreatorSeriesScore(series) {
  return Math.max(
    toNumber(series?.followers),
    toNumber(series?.views),
    toNumber(series?.ratingCount),
    Math.round(toNumber(series?.rating) * 100),
  );
}

function sortCreatorSeries(items) {
  return [...items].sort((left, right) => {
    const popularityDelta = getCreatorSeriesScore(right) - getCreatorSeriesScore(left);
    if (popularityDelta !== 0) {
      return popularityDelta;
    }

    const updatedDelta = new Date(right?.updatedAt || 0) - new Date(left?.updatedAt || 0);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

export const loadSeriesSeoPayload = cache(async (seriesId) => {
  if (!seriesId) {
    return null;
  }

  try {
    const response = await fetch(
      `${getSeoApiBaseUrl()}/api/series/${encodeURIComponent(seriesId)}`,
      {
        next: { revalidate: SEO_REVALIDATE_SECONDS },
        headers: {
          "x-gush-seo": "series-metadata",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.series ? payload : null;
  } catch {
    return null;
  }
});

export const loadCreatorSeoPayload = cache(async (creatorSlug) => {
  const fallbackName = humanizeCreatorSlug(creatorSlug);
  if (!creatorSlug) {
    return {
      creatorName: fallbackName,
      items: [],
    };
  }

  try {
    const response = await fetch(`${getSeoApiBaseUrl()}/api/series?adult=0`, {
      next: { revalidate: SEO_REVALIDATE_SECONDS },
      headers: {
        "x-gush-seo": "creator-metadata",
      },
    });

    if (!response.ok) {
      return {
        creatorName: fallbackName,
        items: [],
      };
    }

    const payload = await response.json();
    const seriesList = Array.isArray(payload?.series) ? payload.series : [];
    const creatorItems = sortCreatorSeries(
      seriesList.filter((item) => creatorMatchesSlug(item?.author, creatorSlug)),
    );

    return {
      creatorName: creatorItems[0]?.author
        ? getCreatorDisplayName(creatorItems[0].author)
        : fallbackName,
      items: creatorItems,
    };
  } catch {
    return {
      creatorName: fallbackName,
      items: [],
    };
  }
});

export const loadCreatorsDirectorySeoPayload = cache(async () => {
  try {
    const response = await fetch(`${getSeoApiBaseUrl()}/api/series?adult=0`, {
      next: { revalidate: SEO_REVALIDATE_SECONDS },
      headers: {
        "x-gush-seo": "creators-directory",
      },
    });

    if (!response.ok) {
      return {
        creators: [],
      };
    }

    const payload = await response.json();
    const seriesList = Array.isArray(payload?.series) ? payload.series : [];

    return {
      creators: buildCreatorDirectory(seriesList),
    };
  } catch {
    return {
      creators: [],
    };
  }
});
