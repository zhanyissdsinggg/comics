import { absoluteUrl, siteConfig } from "./siteConfig";
import { buildCreatorHref, normalizeCreatorName } from "./creators";
import { getSeriesFaqItems } from "./storefrontFaq";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value) {
  if (!value) {
    return undefined;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}

function resolveImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return undefined;
  }

  try {
    return new URL(raw, `${siteConfig.siteUrl}/`).toString();
  } catch {
    return undefined;
  }
}

function pickSeriesSchemaType(series) {
  return String(series?.type || "").toLowerCase() === "novel" ? "BookSeries" : "ComicSeries";
}

function inferCreatorEntityType(name) {
  const normalized = normalizeText(name).toLowerCase();
  if (!normalized || normalized === "studio") {
    return "Organization";
  }

  if (/\b(studio|team|works|comics|press|entertainment|media|collective|lab|labs|house)\b/.test(normalized)) {
    return "Organization";
  }

  return "Person";
}

function buildAggregateRating(entity) {
  const ratingValue = toNumber(entity?.rating);
  const ratingCount = Math.max(0, Math.floor(toNumber(entity?.ratingCount)));

  if (ratingValue <= 0 || ratingCount <= 0) {
    return undefined;
  }

  return {
    "@type": "AggregateRating",
    ratingValue,
    ratingCount,
    reviewCount: ratingCount,
  };
}

function buildPublisherEntity() {
  return {
    "@type": "Organization",
    name: siteConfig.companyName,
    url: absoluteUrl("/"),
  };
}

export function buildOrganizationStructuredData() {
  const sameAs = [siteConfig.twitterUrl].filter(Boolean);

  return cleanObject({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: siteConfig.companyName,
    alternateName:
      siteConfig.siteName !== siteConfig.companyName ? siteConfig.siteName : undefined,
    url: absoluteUrl("/"),
    email: siteConfig.supportEmail || undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    contactPoint: [
      siteConfig.supportEmail
        ? {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: siteConfig.supportEmail,
            availableLanguage: ["English"],
            url: absoluteUrl("/support"),
          }
        : null,
      siteConfig.privacyEmail
        ? {
            "@type": "ContactPoint",
            contactType: "privacy inquiries",
            email: siteConfig.privacyEmail,
            availableLanguage: ["English"],
            url: absoluteUrl("/privacy-policy"),
          }
        : null,
    ].filter(Boolean),
    address: siteConfig.companyAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: siteConfig.companyAddress,
        }
      : undefined,
  });
}

export function buildWebsiteStructuredData({
  description = siteConfig.defaultDescription,
} = {}) {
  return cleanObject({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: siteConfig.siteName,
    alternateName: siteConfig.companyName,
    url: absoluteUrl("/"),
    description,
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  });
}

function buildCreatorEntity(creatorName, creatorPath) {
  const normalizedName = normalizeCreatorName(creatorName);
  if (!normalizedName) {
    return undefined;
  }

  return {
    "@type": inferCreatorEntityType(normalizedName),
    "@id": `${absoluteUrl(creatorPath)}#creator`,
    name: normalizedName,
    url: absoluteUrl(creatorPath),
  };
}

function buildSeriesEntity(series, creatorEntityId) {
  if (!series?.id) {
    return null;
  }

  const seriesPath = `/series/${encodeURIComponent(series.id)}`;
  const creatorName = normalizeCreatorName(series?.author);
  const creatorPath = creatorName ? buildCreatorHref(creatorName) : null;
  const hasFreeAccess =
    toNumber(series?.freeEpisodeCount) > 0 ||
    Boolean(series?.hasFreeEpisodes) ||
    Boolean(series?.previewFreePages);

  return {
    "@type": pickSeriesSchemaType(series),
    "@id": `${absoluteUrl(seriesPath)}#series`,
    url: absoluteUrl(seriesPath),
    mainEntityOfPage: absoluteUrl(seriesPath),
    name: normalizeText(series?.title),
    description: normalizeText(series?.description) || undefined,
    image: resolveImageUrl(series?.coverUrl),
    genre: Array.isArray(series?.genres) && series.genres.length > 0 ? series.genres : undefined,
    author: creatorEntityId
      ? { "@id": creatorEntityId }
      : creatorPath && creatorName
        ? buildCreatorEntity(creatorName, creatorPath)
        : undefined,
    publisher: buildPublisherEntity(),
    inLanguage: "en-US",
    dateCreated: toIsoDate(series?.createdAt),
    dateModified: toIsoDate(series?.updatedAt),
    aggregateRating: buildAggregateRating(series),
    numberOfItems: Number.isFinite(Number(series?.episodeCount))
      ? Math.max(0, Math.floor(Number(series.episodeCount)))
      : undefined,
    isAccessibleForFree: hasFreeAccess,
    keywords:
      Array.isArray(series?.genres) && series.genres.length > 0 ? series.genres.join(", ") : undefined,
  };
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map(cleanObject).filter((item) => item !== undefined);
  }

  if (!value || typeof value !== "object") {
    return value === undefined ? undefined : value;
  }

  const entries = Object.entries(value)
    .map(([key, itemValue]) => [key, cleanObject(itemValue)])
    .filter(([, itemValue]) => {
      if (itemValue === undefined) {
        return false;
      }

      if (Array.isArray(itemValue) && itemValue.length === 0) {
        return false;
      }

      return true;
    });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function serializeStructuredData(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildBreadcrumbStructuredData(items) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      name: normalizeText(item?.name),
      path: item?.path ? String(item.path).trim() : "",
    }))
    .filter((item) => item.name);

  if (normalizedItems.length < 2) {
    return null;
  }

  return cleanObject({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: normalizedItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path ? absoluteUrl(item.path) : undefined,
    })),
  });
}

export function buildSeriesStructuredData({ series, episodes }) {
  if (!series?.id || !series?.title) {
    return [];
  }

  const shelfCrumb = series?.adult
    ? { name: "Adult", path: "/adult" }
    : String(series?.type || "").toLowerCase() === "novel"
      ? { name: "Novels", path: "/novels" }
      : { name: "Comics", path: "/comics" };
  const seriesPath = `/series/${encodeURIComponent(series.id)}`;
  const withEpisodeCount = {
    ...series,
    episodeCount: Array.isArray(episodes) ? episodes.length : Number(series?.episodeCount || 0),
  };
  const faqItems = getSeriesFaqItems({ series: withEpisodeCount, episodes });

  return [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      shelfCrumb,
      { name: normalizeText(series.title) },
    ]),
    cleanObject({
      "@context": "https://schema.org",
      ...buildSeriesEntity(withEpisodeCount),
    }),
    buildFaqStructuredData({
      path: seriesPath,
      name: `${normalizeText(series.title)} FAQ`,
      description: `Reader questions and quick answers for ${normalizeText(series.title)}.`,
      items: faqItems,
    }),
  ].filter(Boolean);
}

export function buildCreatorStructuredData({ creatorName, creatorPath, items }) {
  const normalizedCreatorName = normalizeCreatorName(creatorName);
  const creatorEntity = buildCreatorEntity(normalizedCreatorName, creatorPath);
  if (!creatorEntity || !creatorPath) {
    return [];
  }

  const latestModified = (Array.isArray(items) ? items : []).reduce((latest, item) => {
    const nextDate = toIsoDate(item?.updatedAt);
    if (!nextDate) {
      return latest;
    }
    if (!latest) {
      return nextDate;
    }

    return Date.parse(nextDate) > Date.parse(latest) ? nextDate : latest;
  }, undefined);

  return [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: normalizedCreatorName },
    ]),
    cleanObject({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "@id": `${absoluteUrl(creatorPath)}#profile`,
      url: absoluteUrl(creatorPath),
      name: `${normalizedCreatorName} | ${siteConfig.siteName}`,
      description: `Browse published titles from ${normalizedCreatorName} on ${siteConfig.siteName}.`,
      dateModified: latestModified,
      mainEntity: creatorEntity,
      hasPart: (Array.isArray(items) ? items : []).slice(0, 12).map((series) =>
        buildSeriesEntity(series, creatorEntity["@id"]),
      ),
    }),
  ].filter(Boolean);
}

export function buildCreatorsDirectoryStructuredData({ creators }) {
  const safeCreators = (Array.isArray(creators) ? creators : []).filter((creator) => creator?.name && creator?.path);

  return [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Creators", path: "/creators" },
    ]),
    cleanObject({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${absoluteUrl("/creators")}#directory`,
      url: absoluteUrl("/creators"),
      name: `Creators & Studios | ${siteConfig.siteName}`,
      description: `Browse creators and studios published on ${siteConfig.siteName}.`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: safeCreators.slice(0, 24).map((creator, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(creator.path),
          name: creator.name,
        })),
      },
    }),
  ].filter(Boolean);
}

export function buildFaqStructuredData({ path = "/", name = "", description = "", items = [] }) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      question: normalizeText(item?.question || item?.q),
      answer: normalizeText(item?.answer || item?.a),
    }))
    .filter((item) => item.question && item.answer);

  if (normalizedItems.length === 0) {
    return null;
  }

  const normalizedPath = String(path || "/").trim() || "/";

  return cleanObject({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteUrl(normalizedPath)}#faq`,
    url: absoluteUrl(normalizedPath),
    name: normalizeText(name) || undefined,
    description: normalizeText(description) || undefined,
    mainEntity: normalizedItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
}
