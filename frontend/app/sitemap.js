import { resolveSeriesCreatorIdentity } from "../lib/creatorIdentity";
import { CONTENT_MODE_NORMAL } from "../lib/contentMode";
import { filterContentByMode } from "../lib/contentFilters";
import { absoluteUrl, siteConfig } from "../lib/siteConfig";
import {
  loadSeriesCatalogSeoPayload,
  loadTopupCatalogSeoPayload,
} from "../lib/storefrontSeo";

const STATIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/comics",
  "/novels",
  "/creators",
  "/rankings",
  "/support",
  "/faq",
  "/how-it-works",
  "/privacy-policy",
  "/terms-of-service",
].filter(Boolean);

const ROUTE_PRIORITIES = {
  "/": 1.0,
  "/comics": 0.9,
  "/novels": 0.9,
  "/rankings": 0.9,
  "/creators": 0.85,
  "/store": 0.8,
  "/support": 0.8,
  "/faq": 0.8,
  "/how-it-works": 0.8,
  "/about": 0.75,
  "/privacy-policy": 0.5,
  "/terms-of-service": 0.5,
};

const ROUTE_CHANGE_FREQUENCIES = {
  "/": "daily",
  "/comics": "daily",
  "/novels": "daily",
  "/rankings": "daily",
  "/creators": "weekly",
  "/store": "weekly",
  "/support": "monthly",
  "/faq": "monthly",
  "/how-it-works": "monthly",
  "/about": "monthly",
  "/privacy-policy": "yearly",
  "/terms-of-service": "yearly",
};

function buildSitemapEntry(path, lastModified, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return {
    url: absoluteUrl(normalizedPath),
    lastModified,
    changeFrequency:
      options.changeFrequency ||
      (normalizedPath.startsWith("/creators/")
        ? "weekly"
        : ROUTE_CHANGE_FREQUENCIES[normalizedPath] || "weekly"),
    priority:
      options.priority ??
      (normalizedPath.startsWith("/creators/") ? 0.7 : ROUTE_PRIORITIES[normalizedPath] || 0.7),
  };
}

function resolveLastModified(value, fallbackDate) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return fallbackDate;
  }

  return new Date(parsed).toISOString();
}

function shouldIncludeStorePath(topupPayload) {
  const checkoutEnabled = siteConfig.monetization.checkoutEnabled === true;
  const pointPacksEnabled = siteConfig.monetization.pointPacksEnabled === true;
  if (!checkoutEnabled || !pointPacksEnabled) {
    return false;
  }

  return topupPayload?.billing?.purchaseActionsEnabled !== false;
}

function buildSeriesEntries(seriesList, currentDate) {
  return seriesList
    .filter((series) => series?.id)
    .map((series) =>
      buildSitemapEntry(
        `/series/${encodeURIComponent(series.id)}`,
        resolveLastModified(series?.updatedAt, currentDate),
        {
          changeFrequency:
            String(series?.status || "").toLowerCase() === "ongoing"
              ? "daily"
              : "weekly",
          priority: 0.8,
        },
      ),
    );
}

function buildCreatorEntries(seriesList, currentDate) {
  const creatorPaths = new Set();

  seriesList.forEach((series) => {
    const creatorIdentity = resolveSeriesCreatorIdentity(series);
    if (!creatorIdentity?.hasPublicCredit || !creatorIdentity?.href) {
      return;
    }

    creatorPaths.add(creatorIdentity.href);
  });

  return Array.from(creatorPaths).map((path) => buildSitemapEntry(path, currentDate));
}

export default async function sitemap() {
  const currentDate = new Date().toISOString();
  const [catalogPayload, topupPayload] = await Promise.all([
    loadSeriesCatalogSeoPayload(),
    loadTopupCatalogSeoPayload(),
  ]);

  const sitemapSeries = filterContentByMode(
    catalogPayload?.series || [],
    CONTENT_MODE_NORMAL,
  );
  const staticPaths = shouldIncludeStorePath(topupPayload)
    ? [...STATIC_SITEMAP_PATHS, "/store"]
    : STATIC_SITEMAP_PATHS;

  return [
    ...staticPaths.map((path) => buildSitemapEntry(path, currentDate)),
    ...buildSeriesEntries(sitemapSeries, currentDate),
    ...buildCreatorEntries(sitemapSeries, currentDate),
  ];
}
