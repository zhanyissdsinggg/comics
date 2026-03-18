import { absoluteUrl } from "../lib/siteConfig";
import { normalizeCreatorName, slugifyCreatorName } from "../lib/creators";

const STATIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/comics",
  "/novels",
  "/creators",
  "/store",
  "/rankings",
  "/subscribe",
  "/support",
  "/faq",
  "/how-it-works",
  "/mature-content",
  "/privacy-policy",
  "/terms-of-service",
];

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
  "/mature-content": 0.75,
  "/subscribe": 0.7,
  "/privacy-policy": 0.5,
  "/terms-of-service": 0.5,
};

const ROUTE_CHANGE_FREQUENCIES = {
  "/": "daily",
  "/rankings": "daily",
  "/creators": "weekly",
  "/store": "weekly",
  "/subscribe": "weekly",
  "/how-it-works": "monthly",
  "/mature-content": "monthly",
  "/support": "monthly",
  "/faq": "monthly",
  "/about": "monthly",
  "/privacy-policy": "yearly",
  "/terms-of-service": "yearly",
};

const CREATOR_SITEMAP_REVALIDATE_SECONDS = 60 * 60;

function buildSitemapEntry(path, currentDate) {
  return {
    url: absoluteUrl(path),
    lastModified: currentDate,
    changeFrequency: path.startsWith("/creators/")
      ? "weekly"
      : ROUTE_CHANGE_FREQUENCIES[path] || "monthly",
    priority: path.startsWith("/creators/") ? 0.7 : ROUTE_PRIORITIES[path] || 0.7,
  };
}

async function loadCreatorPaths() {
  try {
    const response = await fetch(absoluteUrl("/api/series?adult=0"), {
      next: { revalidate: CREATOR_SITEMAP_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const seriesList = Array.isArray(payload?.series)
      ? payload.series
      : Array.isArray(payload?.data?.series)
        ? payload.data.series
        : [];

    const creatorPaths = new Set();

    seriesList.forEach((series) => {
      const author = normalizeCreatorName(series?.author);
      if (!author) {
        return;
      }

      creatorPaths.add(`/creators/${encodeURIComponent(slugifyCreatorName(author))}`);
    });

    return Array.from(creatorPaths);
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const currentDate = new Date().toISOString();
  const creatorPaths = await loadCreatorPaths();
  const allPaths = [...new Set([...STATIC_SITEMAP_PATHS, ...creatorPaths])];

  return allPaths.map((path) => buildSitemapEntry(path, currentDate));
}
