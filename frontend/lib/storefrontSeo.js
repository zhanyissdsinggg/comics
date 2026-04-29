import { cache } from "react";
import { buildCreatorDirectory } from "./creatorDirectory";
import {
  humanizeCreatorSlug,
} from "./creators";
import {
  resolveSeriesCreatorName,
  seriesMatchesCreatorSlug,
} from "./creatorIdentity";
import { buildHomeHeroItems, getHomeEditorialSnapshot } from "./homeMerchandising";
import {
  filterBlockedPublicSeries,
  isBlockedPublicCreatorSlug,
} from "./publicCatalogVisibility";

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

async function fetchSeoApiJson(path, requestId) {
  try {
    const response = await fetch(`${getSeoApiBaseUrl()}${path}`, {
      next: { revalidate: SEO_REVALIDATE_SECONDS },
      headers: requestId
        ? {
            "x-gush-seo": requestId,
          }
        : undefined,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCreatorSeriesScore(series) {
  return (
    Math.max(0, toNumber(series?.episodeCount)) * 100 +
    (String(series?.status || "").toLowerCase() === "completed" ? 60 : 0) +
    (new Date(series?.updatedAt || 0).getTime() || 0)
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
  const routePayload = await loadSeriesRoutePayload(seriesId);
  return routePayload?.payload || null;
});

export const loadReaderSeoPayload = cache(async (seriesId, episodeId) => {
  if (!seriesId || !episodeId) {
    return {
      series: null,
      episode: null,
      episodes: [],
    };
  }

  const [seriesRoutePayload, episodePayload] = await Promise.all([
    loadSeriesRoutePayload(seriesId),
    fetchSeoApiJson(
      `/api/episode?seriesId=${encodeURIComponent(seriesId)}&episodeId=${encodeURIComponent(episodeId)}`,
      "reader-metadata",
    ),
  ]);

  return {
    series: seriesRoutePayload?.payload?.series || null,
    episode: episodePayload?.episode || null,
    episodes: Array.isArray(seriesRoutePayload?.payload?.episodes)
      ? seriesRoutePayload.payload.episodes
      : [],
  };
});

export const loadSeriesRoutePayload = cache(async (seriesId) => {
  if (!seriesId) {
    return {
      payload: null,
      state: "not-found",
      gateReason: null,
    };
  }

  try {
    const normalizedSeriesId = String(seriesId || "").trim().toLowerCase();
    if (normalizedSeriesId === "demo-series" || normalizedSeriesId === "fixture-series") {
      return {
        payload: null,
        state: "not-found",
        gateReason: null,
      };
    }

    const response = await fetch(
      `${getSeoApiBaseUrl()}/api/series/${encodeURIComponent(seriesId)}`,
      {
        next: { revalidate: SEO_REVALIDATE_SECONDS },
        headers: {
          "x-gush-seo": "series-metadata",
        },
      },
    );

    if (response.status === 404) {
      return {
        payload: null,
        state: "not-found",
        gateReason: null,
      };
    }

    if (response.status === 403) {
      const payload = await response.json().catch(() => null);
      return {
        payload: null,
        state: payload?.error === "ADULT_GATED" ? "adult-gated" : "unavailable",
        gateReason: payload?.reason || null,
      };
    }

    if (!response.ok) {
      return {
        payload: null,
        state: "unavailable",
        gateReason: null,
      };
    }

    const payload = await response.json();
    if (payload?.series) {
      const safeSeries = filterBlockedPublicSeries([payload.series])[0] || null;
      if (!safeSeries) {
        return {
          payload: null,
          state: "not-found",
          gateReason: null,
        };
      }

      return {
        payload: {
          ...payload,
          series: safeSeries,
        },
        state: "ready",
        gateReason: null,
      };
    }

    return {
      payload: null,
      state: payload?.error === "NOT_FOUND" ? "not-found" : "unavailable",
      gateReason: payload?.reason || null,
    };
  } catch {
    return {
      payload: null,
      state: "unavailable",
      gateReason: null,
    };
  }
});

export const loadSeriesCatalogSeoPayload = cache(async () => {
  const payload = await fetchSeoApiJson("/api/series?adult=0", "series-catalog");
  return {
    series: filterBlockedPublicSeries(
      Array.isArray(payload?.series) ? payload.series : [],
    ),
    ready: Boolean(payload),
  };
});

export const loadHomepageSeoPayload = cache(async () => {
  const [seriesPayload, hotPayload, recommendationsPayload] = await Promise.all([
    fetchSeoApiJson("/api/series?adult=0", "home-series"),
    fetchSeoApiJson("/api/search/hot?adult=0&window=day", "home-hot-keywords"),
    fetchSeoApiJson("/api/recommendations/homepage?adult=0", "home-recommendations"),
  ]);

  const seriesList = filterBlockedPublicSeries(
    Array.isArray(seriesPayload?.series) ? seriesPayload.series : [],
  );
  const homepageSlots = Array.isArray(recommendationsPayload?.slots)
    ? recommendationsPayload.slots
    : [];
  const editorialSnapshot = getHomeEditorialSnapshot(seriesList, { homepageSlots });
  const hasExplicitHomeHeroSlot = homepageSlots.some(
    (slot) =>
      String(slot?.slot || slot?.name || slot?.id || "")
        .trim()
        .toLowerCase() === "home-hero",
  );
  const canonicalHeroSeriesId =
    (hasExplicitHomeHeroSlot
      ? buildHomeHeroItems(seriesList, { homepageSlots })[0]?.seriesId
      : null) ||
    editorialSnapshot.breakoutPick?.id ||
    editorialSnapshot.freeStartPick?.id ||
    buildHomeHeroItems(seriesList, { homepageSlots })[0]?.seriesId ||
    null;
  let canonicalHeroFirstEpisodeId = null;

  if (canonicalHeroSeriesId) {
    const detailPayload = await fetchSeoApiJson(
      `/api/series/${encodeURIComponent(canonicalHeroSeriesId)}?adult=0`,
      "home-canonical-hero",
    );
    const firstEpisode = Array.isArray(detailPayload?.episodes)
      ? [...detailPayload.episodes].sort(
          (left, right) => Number(left?.number || 0) - Number(right?.number || 0),
        )[0] || null
      : null;
    canonicalHeroFirstEpisodeId = firstEpisode?.id || null;
  }

  return {
    seriesList,
    hotKeywords: Array.isArray(hotPayload?.keywords) ? hotPayload.keywords : [],
    homepageSlots,
    canonicalHome: canonicalHeroSeriesId
      ? {
          featuredSeriesId: canonicalHeroSeriesId,
          featuredReadHref: canonicalHeroFirstEpisodeId
            ? `/read/${canonicalHeroSeriesId}/${canonicalHeroFirstEpisodeId}`
            : `/series/${canonicalHeroSeriesId}`,
        }
      : null,
    ready: true,
  };
});

export const loadRankingsSeoPayload = cache(async (type = "popular", window = "all") => {
  const payload = await fetchSeoApiJson(
    `/api/rankings?type=${encodeURIComponent(type)}&window=${encodeURIComponent(window)}&adult=0`,
    "rankings-page",
  );

  return {
    rankings: Array.isArray(payload?.rankings) ? payload.rankings : [],
    ready: Boolean(payload),
  };
});

export const loadTopupCatalogSeoPayload = cache(async () => {
  const payload = await fetchSeoApiJson("/api/billing/topups", "store-topups");

  return {
    packages: Array.isArray(payload?.packages) ? payload.packages : [],
    billing: payload?.billing || null,
    ready: Boolean(payload),
  };
});

export const loadSubscriptionPlansSeoPayload = cache(async () => {
  const payload = await fetchSeoApiJson("/api/billing/plans", "subscription-plans");
  const plans = Array.isArray(payload?.plans) ? payload.plans : [];

  return {
    plans,
    planCatalog: plans.reduce((catalog, plan) => {
      const planId = String(plan?.id || "").trim();
      if (!planId) {
        return catalog;
      }

      catalog[planId] = plan;
      return catalog;
    }, {}),
    billing: payload?.billing || null,
    ready: Boolean(payload),
  };
});

export const loadCreatorSeoPayload = cache(async (creatorSlug) => {
  const fallbackName = humanizeCreatorSlug(creatorSlug);
  if (!creatorSlug) {
    return {
      creatorName: fallbackName,
      items: [],
    };
  }

  if (isBlockedPublicCreatorSlug(creatorSlug)) {
    return {
      creatorName: fallbackName,
      items: [],
      blocked: true,
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
    const seriesList = filterBlockedPublicSeries(
      Array.isArray(payload?.series) ? payload.series : [],
    );
    const creatorItems = sortCreatorSeries(
      seriesList.filter((item) => seriesMatchesCreatorSlug(item, creatorSlug)),
    );

    return {
      creatorName: resolveSeriesCreatorName(creatorItems[0]) || fallbackName,
      items: creatorItems,
      blocked: false,
    };
  } catch {
    return {
      creatorName: fallbackName,
      items: [],
      blocked: false,
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
    const seriesList = filterBlockedPublicSeries(
      Array.isArray(payload?.series) ? payload.series : [],
    );

    return {
      creators: buildCreatorDirectory(seriesList),
      ready: true,
    };
  } catch {
    return {
      creators: [],
      ready: false,
    };
  }
});
