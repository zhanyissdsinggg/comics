import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import {
  buildEditorialCardHook,
  buildEditorialHook,
} from "../../lib/editorialHooks";
import { formatInstallmentLabel } from "../../lib/seriesFormatLabels";

export function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeType(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizeStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "end" || normalized === "completed") {
    return "completed";
  }

  if (!normalized || normalized === "up" || normalized === "hot") {
    return "ongoing";
  }

  return normalized;
}

export function uniqueBySeriesId(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const id = String(item?.id || item?.seriesId || "").trim();
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

export function filterSeriesByType(seriesList = [], type = "") {
  const normalizedType = normalizeType(type);
  if (!normalizedType) {
    return Array.isArray(seriesList) ? seriesList : [];
  }

  return (Array.isArray(seriesList) ? seriesList : []).filter(
    (series) => normalizeType(series?.type) === normalizedType,
  );
}

export function sortByUpdated(seriesList = []) {
  return [...(Array.isArray(seriesList) ? seriesList : [])].sort(
    (left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
  );
}

export function sortByPopularity(seriesList = []) {
  return [...(Array.isArray(seriesList) ? seriesList : [])].sort((left, right) => {
    const rightScore =
      Number(right?.views || right?.viewsValue || 0) +
      Number(right?.followers || 0) * 4 +
      Number(right?.ratingCount || 0) * 3 +
      Number(right?.episodeCount || 0) * 2 +
      Math.round(Number(right?.ratingAvg || right?.rating || 0) * 100);
    const leftScore =
      Number(left?.views || left?.viewsValue || 0) +
      Number(left?.followers || 0) * 4 +
      Number(left?.ratingCount || 0) * 3 +
      Number(left?.episodeCount || 0) * 2 +
      Math.round(Number(left?.ratingAvg || left?.rating || 0) * 100);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt);
  });
}

export function getLatestInstallmentNumber(series) {
  return (
    Number(
      series?.latestEpisodeNumber ||
        series?.latestChapterNumber ||
        series?.episodeCount ||
        1,
    ) || 1
  );
}

export function buildLatestInstallmentLabel(series) {
  return formatInstallmentLabel(
    series?.type || "comic",
    getLatestInstallmentNumber(series),
  );
}

export function inferFirstEpisodeId(series) {
  const direct =
    String(series?.firstReadableEpisodeId || "").trim() ||
    String(series?.firstEpisodeId || "").trim();
  if (direct) {
    return direct;
  }

  const latestEpisodeId = String(series?.latestEpisodeId || "").trim();
  const match = latestEpisodeId.match(/^(.*?)(\d+)$/);
  if (!match) {
    return "";
  }

  const [, prefix, digits] = match;
  return `${prefix}${String(1).padStart(digits.length, "0")}`;
}

export function buildReadHref(series) {
  const seriesId = String(series?.id || "").trim();
  const episodeId = inferFirstEpisodeId(series);

  if (seriesId && episodeId) {
    return `/read/${seriesId}/${episodeId}`;
  }

  if (seriesId) {
    return `/series/${seriesId}`;
  }

  return "/";
}

export function buildSeriesHref(series) {
  const seriesId = String(series?.id || "").trim();
  return seriesId ? `/series/${seriesId}` : "/";
}

export function buildSeriesHook(series, maxLength = 118) {
  return (
    buildEditorialHook(series, {
      maxLength,
      includeTitle: false,
    }) ||
    String(
      series?.shortDescription ||
        series?.synopsis ||
        series?.description ||
        "",
    ).trim()
  );
}

export function buildCardHook(series, maxLength = 84) {
  return (
    buildEditorialCardHook(series, { maxLength }) ||
    buildSeriesHook(series, maxLength)
  );
}

export function buildGenreLabel(series, limit = 3) {
  const genres = Array.isArray(series?.genres) ? series.genres : [];
  return genres.slice(0, limit).join(" / ");
}

export function buildCreatorLabel(series) {
  return resolveSeriesCreatorName(series) || "";
}

export function buildUpdatedLabel(series) {
  const updatedAt = toTimestamp(series?.updatedAt);
  if (!updatedAt) {
    return "New";
  }

  const oneDay = 24 * 60 * 60 * 1000;
  if (updatedAt >= Date.now() - oneDay) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(updatedAt));
}

function buildFreshnessFallback(series, position = 0) {
  const labels = ["Updated today", "2h ago", "4h ago", "New today", "Today"];
  const seed = String(series?.id || series?.title || position || "")
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  return labels[seed % labels.length];
}

export function buildHomeUpdatedLabel(series, position = 0) {
  const updatedAt = toTimestamp(series?.updatedAt);
  if (!updatedAt) {
    return buildFreshnessFallback(series, position);
  }

  const diffHours = Math.max(0, (Date.now() - updatedAt) / (60 * 60 * 1000));
  if (diffHours < 1) {
    return "Updated today";
  }

  if (diffHours < 12) {
    return `${Math.max(1, Math.round(diffHours))}h ago`;
  }

  if (diffHours < 24) {
    return "Today";
  }

  return buildFreshnessFallback(series, position);
}

export function buildStatusLabel(series) {
  return normalizeStatus(series?.status) === "completed" ? "Completed" : "Ongoing";
}

export function buildReadingTimeLabel(series) {
  const explicit =
    Number(series?.readingTimeMinutes || series?.readingTime || 0) || 0;
  if (explicit > 0) {
    return `${explicit} min`;
  }

  const episodeCount = Math.max(1, Number(series?.episodeCount || 1));
  const estimated = Math.max(8, Math.min(36, episodeCount * 4));
  return `${estimated} min`;
}

export function pickFeaturedSeries(seriesList = [], preferredSeriesId = "") {
  const preferredId = String(preferredSeriesId || "").trim();
  const uniqueItems = uniqueBySeriesId(seriesList);

  return (
    uniqueItems.find((series) => String(series?.id || "").trim() === preferredId) ||
    sortByPopularity(uniqueItems)[0] ||
    uniqueItems[0] ||
    null
  );
}

export function buildCompletedRail(seriesList = [], limit = 8) {
  return sortByPopularity(seriesList)
    .filter((series) => normalizeStatus(series?.status) === "completed")
    .slice(0, limit);
}

export function buildUpdatedRail(seriesList = [], limit = 8) {
  return sortByUpdated(seriesList).slice(0, limit);
}

export function buildPopularRail(seriesList = [], limit = 8) {
  return sortByPopularity(seriesList).slice(0, limit);
}

export function buildNewRail(seriesList = [], limit = 8) {
  return sortByUpdated(seriesList)
    .filter((series) => toTimestamp(series?.updatedAt) > 0)
    .slice(0, limit);
}

export function buildShortReadsRail(seriesList = [], limit = 8) {
  return sortByPopularity(seriesList)
    .filter((series) => Number(series?.episodeCount || 0) > 0)
    .sort((left, right) => Number(left?.episodeCount || 0) - Number(right?.episodeCount || 0))
    .slice(0, limit);
}

export function buildTopTen(seriesList = []) {
  return sortByPopularity(seriesList).slice(0, 10);
}

export function buildGenreShelves(seriesList = [], options = {}) {
  const maxGenres = Number(options.maxGenres || 4);
  const perGenre = Number(options.perGenre || 8);
  const grouped = new Map();

  sortByPopularity(seriesList).forEach((series) => {
    const genres = Array.isArray(series?.genres) ? series.genres : [];
    genres.forEach((genre) => {
      const label = String(genre || "").trim();
      if (!label) {
        return;
      }
      const bucket = grouped.get(label) || [];
      if (bucket.length < perGenre) {
        bucket.push(series);
      }
      grouped.set(label, bucket);
    });
  });

  return [...grouped.entries()]
    .map(([genre, items]) => ({
      genre,
      items: uniqueBySeriesId(items),
    }))
    .filter((entry) => entry.items.length >= 2)
    .sort((left, right) => right.items.length - left.items.length)
    .slice(0, maxGenres);
}

export function buildMoodTags(seriesList = []) {
  const moods = [
    "Slow-Burn Romance",
    "Messy Friend Group",
    "Late-Night Mystery",
    "Chaotic Fantasy",
    "Campus Drama",
    "Soft Escape",
    "One-Sitting Binge",
    "Dangerous Crush",
  ];

  if ((Array.isArray(seriesList) ? seriesList : []).length === 0) {
    return moods;
  }

  return moods;
}

export function buildContinueReadingItems(seriesList = [], progressMap = {}) {
  const byId = new Map(
    (Array.isArray(seriesList) ? seriesList : []).map((series) => [
      String(series?.id || "").trim(),
      series,
    ]),
  );

  return Object.entries(progressMap || {})
    .map(([seriesId, progress]) => {
      const series = byId.get(String(seriesId || "").trim());
      if (!series || !progress?.lastEpisodeId) {
        return null;
      }

      return {
        ...series,
        resumeEpisodeId: progress.lastEpisodeId,
        progressPercent: Number(progress?.percent || 0),
        progressUpdatedAt: progress?.updatedAt || null,
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        toTimestamp(right?.progressUpdatedAt) - toTimestamp(left?.progressUpdatedAt),
    );
}
