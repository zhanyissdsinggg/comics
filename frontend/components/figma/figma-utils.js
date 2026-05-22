"use client";

import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { getFallbackImageUrl } from "../../lib/fallbackImage";
import {
  CONTENT_MODE_NORMAL,
  deriveContentModeFromAdultFlag,
} from "../../lib/contentMode";
import { filterContentByMode, isAdultContent } from "../../lib/contentFilters";
import { isMatureGenreValue } from "../../lib/matureContent";
import {
  formatInstallmentLabel,
  getStartReadingLabel,
} from "../../lib/seriesFormatLabels";

export const FIGMA_CONTENT_TYPES = {
  COMICS: "COMICS",
  NOVELS: "NOVELS",
  INTERACTIVE: "INTERACTIVE",
};

export const FIGMA_CONTENT_OPTIONS = [
  { key: FIGMA_CONTENT_TYPES.COMICS, label: "Comics" },
  { key: FIGMA_CONTENT_TYPES.NOVELS, label: "Novels" },
  { key: FIGMA_CONTENT_TYPES.INTERACTIVE, label: "Interactive" },
];

const INTERACTIVE_FALLBACK_ITEMS = [
  {
    id: "interactive-solar-wind",
    seriesId: "series-011",
    title: "Solar Wind: First Contact",
    author: "Signal Drift Studio",
    coverUrl: getFallbackImageUrl({ kind: "cover", adult: false }),
    description:
      "A branching relay-field thriller where every decision pushes the crew closer to rescue or collapse.",
    chapter: 1,
    latestEpisodeId: "",
    genres: ["Sci-Fi", "Choices", "Interactive"],
    status: "HOT",
    adult: false,
    interactive: true,
    routeHref: "/series/series-011/interactive",
  },
  {
    id: "interactive-neon-heir",
    seriesId: "interactive-neon-heir",
    title: "Neon Heir",
    author: "Metro Ghost Works",
    coverUrl: getFallbackImageUrl({ kind: "cover", adult: false }),
    description:
      "Pick allies, burn bridges, and decide who owns the city by sunrise.",
    chapter: 1,
    latestEpisodeId: "",
    genres: ["Cyberpunk", "Drama", "Interactive"],
    status: "NEW",
    adult: false,
    interactive: true,
    routeHref: "/series/interactive-neon-heir/interactive",
  },
  {
    id: "interactive-vampire-oath",
    seriesId: "interactive-vampire-oath",
    title: "Vampire Oath",
    author: "Crimson Thread",
    coverUrl: getFallbackImageUrl({ kind: "cover", adult: true }),
    description:
      "Choose who to trust inside a decaying manor where every promise has teeth.",
    chapter: 1,
    latestEpisodeId: "",
    genres: ["Horror", "Romance", "Interactive"],
    status: "UP",
    adult: true,
    interactive: true,
    routeHref: "/series/interactive-vampire-oath/interactive",
  },
];

export function cn(...values) {
  return values.filter(Boolean).join(" ");
}

export { filterContentByMode, isAdultContent };

function hashString(value) {
  const input = String(value || "");
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededNumber(seed, min, max, precision = 1) {
  const base = hashString(seed) % 10_000;
  const normalized = base / 10_000;
  const raw = min + (max - min) * normalized;
  const factor = 10 ** precision;
  return Math.round(raw * factor) / factor;
}

function compactNumber(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0";
  }

  if (numeric >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(numeric >= 10_000_000 ? 0 : 1)}M`;
  }

  if (numeric >= 1_000) {
    return `${(numeric / 1_000).toFixed(numeric >= 100_000 ? 0 : 1)}K`;
  }

  return `${Math.round(numeric)}`;
}

function toTitleCase(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toIsoDateLabel(value) {
  if (!value) {
    return "Today";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function normalizeGenres(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

export function getFigmaPalette(isAdultMode = false) {
  if (isAdultMode) {
    return {
      rootBg: "bg-[#090607]",
      pageBg: "bg-[#0c0a0a]",
      pageAlt: "bg-[#120d0f]",
      pageSolid: "#0c0a0a",
      surface: "bg-[#161212]",
      surfaceAlt: "bg-[#1d1719]",
      surfaceGlass: "bg-[#120d0f]/88",
      border: "border-red-900/40",
      borderSoft: "border-white/8",
      primaryText: "text-red-500",
      primaryGlowText:
        "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.45)]",
      primaryBg:
        "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600",
      primarySoft: "bg-red-500/10 text-red-400 border-red-500/25",
      primaryMuted: "bg-red-500/15",
      heroOverlay: "from-[#0c0a0a]",
      heroGlow: "bg-red-500/15",
      ring: "ring-red-500/25",
      shadow: "shadow-[0_0_28px_rgba(239,68,68,0.2)]",
      textMain: "text-white",
      textBody: "text-gray-300",
      textMuted: "text-gray-400",
      textFaint: "text-gray-500",
      tagline: "Mature mode",
    };
  }

  return {
    rootBg: "bg-[#080c13]",
    pageBg: "bg-[#0a0c10]",
    pageAlt: "bg-[#11151d]",
    pageSolid: "#0a0c10",
    surface: "bg-[#12161f]",
    surfaceAlt: "bg-[#18202d]",
    surfaceGlass: "bg-[#0b1018]/88",
    border: "border-indigo-500/20",
    borderSoft: "border-white/8",
    primaryText: "text-indigo-400",
    primaryGlowText:
      "text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.45)]",
    primaryBg:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500",
    primarySoft: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    primaryMuted: "bg-indigo-500/15",
    heroOverlay: "from-[#0a0c10]",
    heroGlow: "bg-indigo-500/15",
    ring: "ring-indigo-400/25",
    shadow: "shadow-[0_0_28px_rgba(99,102,241,0.2)]",
    textMain: "text-white",
    textBody: "text-gray-300",
    textMuted: "text-gray-400",
    textFaint: "text-gray-500",
    tagline: "Core mode",
  };
}

export function normalizeSeriesKind(value, interactive = false) {
  if (interactive) {
    return FIGMA_CONTENT_TYPES.INTERACTIVE;
  }

  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "novel") {
    return FIGMA_CONTENT_TYPES.NOVELS;
  }
  return FIGMA_CONTENT_TYPES.COMICS;
}

function buildStatusLabel(series) {
  const normalizedStatus = String(series?.status || "")
    .trim()
    .toLowerCase();
  if (normalizedStatus === "completed") {
    return "END";
  }

  const createdAt = new Date(series?.createdAt || 0).getTime() || 0;
  const updatedAt = new Date(series?.updatedAt || 0).getTime() || 0;
  const now = Date.now();

  if (createdAt && now - createdAt < 21 * 24 * 60 * 60 * 1000) {
    return "NEW";
  }

  if (updatedAt && now - updatedAt < 7 * 24 * 60 * 60 * 1000) {
    return "UP";
  }

  const episodeCount = Number(series?.episodeCount || 0);
  if (episodeCount >= 30) {
    return "HOT";
  }

  return "";
}

function buildFallbackViews(series, interactive = false) {
  const episodeCount = Math.max(1, Number(series?.episodeCount || 1));
  const seed = [
    series?.id || "series",
    series?.title || "untitled",
    series?.author || "author",
    episodeCount,
    interactive ? "interactive" : "default",
  ].join(":");
  const curatedBands = interactive
    ? [1_800, 2_300, 2_900, 3_600, 4_400, 5_300, 6_200]
    : [1_800, 2_400, 3_100, 3_700, 4_300, 5_200, 6_100, 7_600, 8_900];
  const band = curatedBands[hashString(`${seed}:band`) % curatedBands.length];
  const microVariance = seededNumber(
    `${seed}:variance`,
    interactive ? 0 : 40,
    interactive ? 160 : 220,
    0,
  );
  const chapterLift = Math.min(
    Math.max(episodeCount - 1, 0) * (interactive ? 22 : 36),
    interactive ? 120 : 240,
  );

  return Math.round(band + microVariance + chapterLift);
}

function buildFallbackLikes(series) {
  return Math.round(
    36 +
      Math.max(1, Number(series?.episodeCount || 1)) * 11 +
      seededNumber(series?.id, 0, 420, 0),
  );
}

function buildFallbackRating(series, interactive = false) {
  return seededNumber(
    `${series?.id || "series"}:${interactive ? "interactive" : "base"}`,
    interactive ? 8.7 : 8.2,
    interactive ? 9.4 : 9.1,
    1,
  );
}

function buildReadHref(seriesId, episodeId) {
  const normalizedSeriesId = String(seriesId || "").trim();
  const normalizedEpisodeId = String(episodeId || "").trim();
  if (!normalizedSeriesId) {
    return "/";
  }

  if (normalizedEpisodeId) {
    return `/read/${encodeURIComponent(normalizedSeriesId)}/${encodeURIComponent(normalizedEpisodeId)}`;
  }

  return `/series/${encodeURIComponent(normalizedSeriesId)}`;
}

function inferFirstEpisodeId(series, fallbackEpisodeId = "") {
  const direct =
    String(series?.firstReadableEpisodeId || "").trim() ||
    String(series?.firstEpisodeId || "").trim() ||
    String(fallbackEpisodeId || "").trim();
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

function inferEpisodeNumberFromId(episodeId) {
  const normalizedEpisodeId = String(episodeId || "").trim();
  if (!normalizedEpisodeId) {
    return 0;
  }

  const match = normalizedEpisodeId.match(/(\d+)$/);
  if (!match) {
    return 0;
  }

  return Number(match[1] || 0);
}

function buildTitleSeed(series) {
  return `${series?.id || "series"}:${series?.title || ""}:${series?.episodeCount || 0}`;
}

export function buildFigmaSeriesItem(series, options = {}) {
  const interactive = Boolean(options.interactive);
  const seriesId = String(series?.id || series?.seriesId || "").trim();
  if (!seriesId) {
    return null;
  }

  const contentKind = normalizeSeriesKind(series?.type, interactive);
  const title = String(series?.title || "Untitled").trim();
  const genres = normalizeGenres(series?.genres);
  const adult = isAdultContent(series);
  const latestEpisodeNumber = Math.max(
    1,
    Number(
      series?.latestEpisodeNumber ||
        series?.episodeCount ||
        series?.chapter ||
        1,
    ),
  );
  const latestEpisodeId = String(series?.latestEpisodeId || "").trim();
  const firstEpisodeId = inferFirstEpisodeId(series, options.defaultEpisodeId);
  const progressEpisodeId = String(
    options.progressEpisodeId ||
      series?.progressEpisodeId ||
      series?.progress?.lastEpisodeId ||
      series?.lastEpisodeId ||
      "",
  ).trim();
  const progressPercent = Number(
    options.progressPercent ??
      series?.progressPercent ??
      series?.progress?.percent ??
      0,
  );
  const hasProgress =
    Boolean(progressEpisodeId) &&
    (progressPercent > 0 ||
      Boolean(options.progressEpisodeId) ||
      Boolean(series?.progress?.updatedAt) ||
      Boolean(series?.lastReadAt) ||
      progressEpisodeId !== firstEpisodeId);
  const progressEpisodeNumber = Math.max(
    1,
    Number(
      options.progressEpisodeNumber ||
        series?.progressEpisodeNumber ||
        series?.progress?.lastEpisodeNumber ||
        inferEpisodeNumberFromId(progressEpisodeId) ||
        1,
    ),
  );
  const author =
    resolveSeriesCreatorName(series) ||
    String(series?.author || series?.creator?.label || "Editorial Crew").trim();
  const rating =
    Number(series?.rating) || buildFallbackRating(series, interactive);
  const viewsValue =
    Number(series?.views) || buildFallbackViews(series, interactive);
  const likesValue = Number(series?.likes) || buildFallbackLikes(series);
  const description = String(series?.description || "").trim();
  const interactiveHref = interactive
    ? String(series?.routeHref || series?.interactiveHref || "").trim() ||
      `/series/${encodeURIComponent(seriesId)}/interactive`
    : `/series/${encodeURIComponent(seriesId)}/interactive`;
  const detailHref = interactive
    ? interactiveHref
    : `/series/${encodeURIComponent(seriesId)}`;
  const readEpisodeId = hasProgress
    ? progressEpisodeId
    : firstEpisodeId || latestEpisodeId;
  const readHref = interactive
    ? interactiveHref
    : buildReadHref(seriesId, readEpisodeId);
  const latestInstallmentLabel = formatInstallmentLabel(
    series?.type || series,
    latestEpisodeNumber,
  );
  const startInstallmentLabel = formatInstallmentLabel(
    series?.type || series,
    1,
  );
  const progressInstallmentLabel = formatInstallmentLabel(
    series?.type || series,
    progressEpisodeNumber,
  );
  const ctaChapterLabel = hasProgress
    ? progressInstallmentLabel
    : startInstallmentLabel;
  const readLabel = interactive
    ? "Start Playing"
    : hasProgress
      ? "Continue reading"
      : getStartReadingLabel(series?.type || series, 1);

  return {
    id: seriesId,
    seriesId,
    title,
    author,
    coverUrl:
      String(series?.coverUrl || series?.cover || "").trim() ||
      getFallbackImageUrl({ kind: "cover", adult }),
    description:
      description ||
      "A sharp, bingeable story with enough momentum to ruin your sleep schedule in the best possible way.",
    tags: [...genres.slice(0, 2), adult ? "Mature" : null].filter(Boolean),
    genres,
    isAdult: adult,
    rating,
    viewsValue,
    viewsText: compactNumber(viewsValue),
    likesValue,
    likesText: compactNumber(likesValue),
    status: buildStatusLabel(series),
    chapter: latestEpisodeNumber,
    episodeCount: Math.max(
      1,
      Number(series?.episodeCount || latestEpisodeNumber || 1),
    ),
    firstEpisodeId,
    latestEpisodeId,
    progressEpisodeId,
    hasProgress,
    latestInstallmentLabel,
    kind: contentKind,
    readHref,
    detailHref,
    interactiveHref,
    chapterLabel: formatInstallmentLabel(
      series?.type || series,
      latestEpisodeNumber,
    ),
    ctaChapterLabel,
    readLabel: options.readLabel || readLabel,
    createdAt: series?.createdAt || null,
    updatedAt: series?.updatedAt || null,
    raw: series,
    seed: buildTitleSeed(series),
  };
}

export function buildInteractiveFallbackCatalog() {
  return INTERACTIVE_FALLBACK_ITEMS.map((item) =>
    buildFigmaSeriesItem(item, {
      interactive: true,
      defaultEpisodeId: item.latestEpisodeId || "",
      readLabel: "Start Playing",
    }),
  ).filter(Boolean);
}

export function buildFigmaCatalog(seriesList = [], options = {}) {
  const items = (Array.isArray(seriesList) ? seriesList : [])
    .map((series) => buildFigmaSeriesItem(series, options))
    .filter(Boolean);

  const comics = items.filter(
    (item) => item.kind === FIGMA_CONTENT_TYPES.COMICS,
  );
  const novels = items.filter(
    (item) => item.kind === FIGMA_CONTENT_TYPES.NOVELS,
  );
  const interactive = buildInteractiveFallbackCatalog();

  return {
    items,
    comics,
    novels,
    interactive,
  };
}

export function buildDisplayItems(contentType, catalog, isAdultMode = false) {
  const contentMode =
    typeof isAdultMode === "string"
      ? isAdultMode
      : deriveContentModeFromAdultFlag(Boolean(isAdultMode));
  const source =
    contentType === FIGMA_CONTENT_TYPES.NOVELS
      ? catalog.novels
      : contentType === FIGMA_CONTENT_TYPES.INTERACTIVE
        ? catalog.interactive
        : catalog.comics;

  return filterContentByMode(source, contentMode || CONTENT_MODE_NORMAL);
}

export function sortByRating(items = []) {
  return [...items].sort((left, right) => {
    const delta = Number(right?.rating || 0) - Number(left?.rating || 0);
    if (delta !== 0) {
      return delta;
    }
    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

export function sortByUpdated(items = []) {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right?.updatedAt || 0).getTime() || 0;
    const leftTime = new Date(left?.updatedAt || 0).getTime() || 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

export function filterByGenre(items = [], genre = "All") {
  if (!genre || genre === "All") {
    return [...items];
  }
  return items.filter((item) =>
    normalizeGenres(item?.genres).some(
      (current) => current.toLowerCase() === genre.toLowerCase(),
    ),
  );
}

export function buildChapterItems(series, episodes = []) {
  const normalizedEpisodes = Array.isArray(episodes) ? episodes : [];
  if (normalizedEpisodes.length > 0) {
    return [...normalizedEpisodes]
      .sort((left, right) => {
        const rightNumber = Number(right?.number || 0);
        const leftNumber = Number(left?.number || 0);
        if (rightNumber !== leftNumber) {
          return rightNumber - leftNumber;
        }

        const rightTime = new Date(right?.releasedAt || 0).getTime() || 0;
        const leftTime = new Date(left?.releasedAt || 0).getTime() || 0;
        return rightTime - leftTime;
      })
      .map((episode) => ({
        id: String(episode?.id || "").trim(),
        title:
          String(episode?.title || "").trim() ||
          formatInstallmentLabel(series?.type || series, episode?.number || 1),
        date: toIsoDateLabel(episode?.releasedAt),
        views: compactNumber(
          seededNumber(
            `${series?.id || "series"}:${episode?.id || episode?.number}`,
            45_000,
            280_000,
            0,
          ),
        ),
        number: Number(episode?.number || 0) || 1,
      }));
  }

  const fallbackCount = Math.max(
    6,
    Number(series?.episodeCount || series?.chapter || 0),
  );
  return Array.from({ length: Math.min(fallbackCount, 18) }, (_, index) => {
    const number = fallbackCount - index;
    return {
      id: `${series?.id || "series"}e${number}`,
      title: formatInstallmentLabel(series?.type || series, number),
      date: index === 0 ? "Today" : `${index + 1} days ago`,
      views: compactNumber(
        seededNumber(`${series?.id || "series"}:${number}`, 45_000, 240_000, 0),
      ),
      number,
    };
  });
}

export function formatWalletTotal(wallet) {
  const paid = Number(wallet?.paidPts || 0);
  const bonus = Number(wallet?.bonusPts || 0);
  return paid + bonus;
}

export function formatUsd(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numeric);
}

export function buildCommentSeed(seriesTitle = "Story") {
  void seriesTitle;
  return [];
}

export function buildProfileHistoryItems(historyItems = [], catalogItems = []) {
  const lookup = new Map(
    (Array.isArray(catalogItems) ? catalogItems : []).map((item) => [
      item.id,
      item,
    ]),
  );

  return (Array.isArray(historyItems) ? historyItems : [])
    .map((entry, index) => {
      const matched = lookup.get(String(entry?.seriesId || "").trim());
      if (!matched) {
        return null;
      }

      const percent = Math.max(
        1,
        Math.min(100, Math.round(Number(entry?.percent || 0) * 100) || 0),
      );

      return {
        id: entry?.id || `${entry?.seriesId || "history"}-${index}`,
        title: matched.title,
        chapter:
          matched.chapterLabel ||
          formatInstallmentLabel(
            matched?.raw?.type || matched?.kind || "comic",
            entry?.episodeId || index + 1,
          ),
        coverUrl: matched.coverUrl,
        progress: percent,
        href: matched.detailHref || "/library",
        readHref:
          matched.readHref ||
          buildReadHref(
            entry?.seriesId || matched?.id,
            entry?.episodeId || matched?.latestEpisodeId,
          ),
      };
    })
    .filter(Boolean);
}

export function buildBookmarksView(bookmarksBySeries = {}, catalogItems = []) {
  const lookup = new Map(
    (Array.isArray(catalogItems) ? catalogItems : []).map((item) => [
      item.id,
      item,
    ]),
  );

  return Object.entries(bookmarksBySeries || {})
    .flatMap(([seriesId, entries]) =>
      (Array.isArray(entries) ? entries : []).map((entry) => {
        const matched = lookup.get(String(seriesId || "").trim());
        if (!matched) {
          return null;
        }

        return {
          id: entry?.id || `${seriesId}-${entry?.episodeId || "bookmark"}`,
          title: matched.title,
          chapter:
            entry?.label ||
            matched.chapterLabel ||
            formatInstallmentLabel(
              matched?.raw?.type || matched?.kind || "comic",
              entry?.episodeId || 1,
            ),
          coverUrl: matched.coverUrl,
          href: matched.detailHref || "/library",
          readHref:
            matched.readHref ||
            buildReadHref(
              seriesId,
              entry?.episodeId || matched?.latestEpisodeId,
            ),
        };
      }),
    )
    .filter(Boolean)
    .slice(0, 12);
}

export function buildNotificationCards(notifications = []) {
  return (Array.isArray(notifications) ? notifications : []).map(
    (item, index) => {
      const title =
        item?.title ||
        (item?.type === "PROMO"
          ? "Limited-time offer"
          : item?.type === "TTF_READY"
            ? "Time-to-free unlocked"
            : "New update");
      const body =
        item?.body ||
        item?.message ||
        (item?.type === "PROMO"
          ? "A points pack or member offer is ready."
          : item?.type === "TTF_READY"
            ? "A locked chapter can be opened now."
            : "A followed title has something new waiting.");

      return {
        id: item?.id || `notification-${index}`,
        title,
        body,
        cta: item?.read ? "Viewed" : "Open",
        read: Boolean(item?.read),
        kind: item?.type || "UPDATE",
        item,
      };
    },
  );
}

export function inferCatalogHero(items = []) {
  return sortByRating(items)[0] || null;
}

export function buildGenreOptions(items = []) {
  const genres = new Set(["All"]);
  (Array.isArray(items) ? items : []).forEach((item) => {
    normalizeGenres(item?.genres)
      .slice(0, 3)
      .forEach((genre) => {
        if (isMatureGenreValue(genre)) {
          return;
        }
        genres.add(toTitleCase(genre));
      });
  });
  return Array.from(genres).slice(0, 10);
}
