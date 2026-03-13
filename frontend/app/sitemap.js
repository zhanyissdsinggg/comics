import { absoluteUrl } from "../lib/siteConfig";

const STATIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/comics",
  "/novels",
  "/adult",
  "/library",
  "/store",
  "/search",
  "/rankings",
  "/subscribe",
  "/notifications",
  "/support",
  "/faq",
  "/privacy-policy",
  "/terms-of-service",
  "/events",
];

const ROUTE_PRIORITIES = {
  "/": 1.0,
  "/adult": 0.9,
  "/library": 0.9,
  "/rankings": 0.9,
  "/comics": 0.9,
  "/novels": 0.9,
  "/store": 0.8,
  "/search": 0.8,
  "/support": 0.8,
  "/faq": 0.8,
  "/subscribe": 0.7,
  "/events": 0.7,
  "/notifications": 0.6,
  "/privacy-policy": 0.5,
  "/terms-of-service": 0.5,
};

const ROUTE_CHANGE_FREQUENCIES = {
  "/": "daily",
  "/adult": "daily",
  "/library": "daily",
  "/search": "daily",
  "/rankings": "daily",
  "/notifications": "daily",
  "/store": "weekly",
  "/subscribe": "weekly",
  "/events": "weekly",
  "/support": "monthly",
  "/faq": "monthly",
  "/about": "monthly",
  "/privacy-policy": "yearly",
  "/terms-of-service": "yearly",
};

export default function sitemap() {
  const currentDate = new Date().toISOString();

  return STATIC_SITEMAP_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: currentDate,
    changeFrequency: ROUTE_CHANGE_FREQUENCIES[path] || "monthly",
    priority: ROUTE_PRIORITIES[path] || 0.7,
  }));
}
