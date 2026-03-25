const TONE_KEYS = {
  warm: "romance",
  cool: "sciFi",
  dusk: "fantasy",
  neon: "sciFi",
  noir: "thriller",
  default: "default",
};

const PALETTES = {
  romance: {
    label: "Romance",
    background:
      "linear-gradient(150deg, #2b0c16 0%, #7f2344 46%, #fb7185 100%)",
    accent: "#fb7185",
    accentSoft: "rgba(251, 113, 133, 0.3)",
    border: "rgba(255, 255, 255, 0.16)",
    panel: "rgba(17, 6, 12, 0.48)",
  },
  fantasy: {
    label: "Fantasy",
    background:
      "linear-gradient(150deg, #17153b 0%, #4c1d95 48%, #60a5fa 100%)",
    accent: "#c084fc",
    accentSoft: "rgba(192, 132, 252, 0.3)",
    border: "rgba(255, 255, 255, 0.18)",
    panel: "rgba(13, 10, 28, 0.5)",
  },
  action: {
    label: "Action",
    background:
      "linear-gradient(150deg, #31140b 0%, #8a2f0c 46%, #f59e0b 100%)",
    accent: "#fb923c",
    accentSoft: "rgba(251, 146, 60, 0.28)",
    border: "rgba(255, 255, 255, 0.16)",
    panel: "rgba(24, 11, 6, 0.48)",
  },
  thriller: {
    label: "Thriller",
    background:
      "linear-gradient(150deg, #071217 0%, #17313a 48%, #14b8a6 100%)",
    accent: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.26)",
    border: "rgba(255, 255, 255, 0.15)",
    panel: "rgba(5, 12, 15, 0.54)",
  },
  comedy: {
    label: "Comedy",
    background:
      "linear-gradient(150deg, #3a2209 0%, #c46d05 44%, #38bdf8 100%)",
    accent: "#facc15",
    accentSoft: "rgba(250, 204, 21, 0.28)",
    border: "rgba(255, 255, 255, 0.16)",
    panel: "rgba(22, 13, 5, 0.46)",
  },
  drama: {
    label: "Drama",
    background:
      "linear-gradient(150deg, #161d2c 0%, #374151 44%, #a855f7 100%)",
    accent: "#60a5fa",
    accentSoft: "rgba(96, 165, 250, 0.26)",
    border: "rgba(255, 255, 255, 0.16)",
    panel: "rgba(11, 14, 22, 0.48)",
  },
  sciFi: {
    label: "Sci-Fi",
    background:
      "linear-gradient(150deg, #082036 0%, #115e59 46%, #38bdf8 100%)",
    accent: "#22d3ee",
    accentSoft: "rgba(34, 211, 238, 0.28)",
    border: "rgba(255, 255, 255, 0.17)",
    panel: "rgba(6, 15, 24, 0.5)",
  },
  historical: {
    label: "Historical",
    background:
      "linear-gradient(150deg, #26160f 0%, #6e4b29 42%, #c084fc 100%)",
    accent: "#fbbf24",
    accentSoft: "rgba(251, 191, 36, 0.26)",
    border: "rgba(255, 255, 255, 0.18)",
    panel: "rgba(19, 11, 7, 0.48)",
  },
  mature: {
    label: "18+",
    background:
      "linear-gradient(150deg, #220813 0%, #5c1631 42%, #9333ea 100%)",
    accent: "#f43f5e",
    accentSoft: "rgba(244, 63, 94, 0.28)",
    border: "rgba(255, 255, 255, 0.16)",
    panel: "rgba(17, 6, 12, 0.52)",
  },
  default: {
    label: "Featured",
    background:
      "linear-gradient(150deg, #1f2937 0%, #334155 44%, #f59e0b 100%)",
    accent: "#f8fafc",
    accentSoft: "rgba(255, 255, 255, 0.18)",
    border: "rgba(255, 255, 255, 0.16)",
    panel: "rgba(9, 13, 19, 0.48)",
  },
};

const PLACEHOLDER_HOSTS = new Set([
  "placehold.co",
  "via.placeholder.com",
  "dummyimage.com",
]);

const PLACEHOLDER_PATH_FRAGMENTS = [
  "/mock-covers/",
  "/placeholder/",
  "/placeholders/",
  "/mock-cover/",
  "/default-cover/",
  "/series-placeholder/",
];

function toTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s/-]/g, " ")
    .split(/[\s/|,-]+/)
    .filter(Boolean);
}

function findPaletteKey(genres, badge, tone) {
  const genreText = normalizeGenreList(genres).join(" ").toLowerCase();
  const badgeText = String(badge || "").toLowerCase();
  const combined = `${genreText} ${badgeText}`.trim();

  if (/(18\+|adult|mature|explicit)/.test(combined)) {
    return "mature";
  }
  if (/(romance|love|bl|gl|yaoi|yuri|josei|shoujo)/.test(combined)) {
    return "romance";
  }
  if (/(fantasy|magic|myth|supernatural|isekai|demon|witch)/.test(combined)) {
    return "fantasy";
  }
  if (/(action|battle|martial|adventure|hero|sports|war)/.test(combined)) {
    return "action";
  }
  if (/(thriller|horror|mystery|crime|psychological|suspense|dark)/.test(combined)) {
    return "thriller";
  }
  if (/(sci|cyber|mecha|future|space|tech|robot)/.test(combined)) {
    return "sciFi";
  }
  if (/(historical|period|palace|regency|ancient)/.test(combined)) {
    return "historical";
  }
  if (/(comedy|school|campus|office|slice|healing)/.test(combined)) {
    return "comedy";
  }
  if (/(drama|family|revenge|melodrama|daily)/.test(combined)) {
    return "drama";
  }

  return TONE_KEYS[String(tone || "").trim().toLowerCase()] || TONE_KEYS.default;
}

function trimLabel(value, maxLength = 36) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function labelsMatch(left, right) {
  return trimLabel(left, 40).toLowerCase() === trimLabel(right, 40).toLowerCase();
}

export function normalizeGenreList(input) {
  if (Array.isArray(input)) {
    return input
      .map((value) => trimLabel(value, 22))
      .filter(Boolean)
      .slice(0, 4);
  }

  const text = trimLabel(input, 80);
  if (!text) {
    return [];
  }

  return text
    .split(/[/|,]/)
    .map((value) => trimLabel(value, 22))
    .filter(Boolean)
    .slice(0, 4);
}

export function getSeriesTypeLabel(value, fallback = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  if (raw.includes("comic")) {
    return "Comic";
  }
  if (raw.includes("novel")) {
    return "Novel";
  }
  return fallback;
}

export function normalizeCoverBadge(value) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return "";
  }

  const upper = raw.toUpperCase();
  if (upper.includes("18")) {
    return "18+";
  }
  if (upper.includes("FREE") || upper.includes("TTF")) {
    return "Free";
  }
  if (upper.includes("COMPLETE")) {
    return "Completed";
  }
  if (upper.includes("NEW")) {
    return "New";
  }
  if (upper.includes("HOT") || upper.includes("TREND") || upper.includes("POPULAR")) {
    return "Trending";
  }
  return trimLabel(raw, 18);
}

export function getCoverArtDirection({
  tone = "default",
  genres = [],
  badge = "",
  seriesType = "",
  eyebrow = "",
}) {
  const palette = PALETTES[findPaletteKey(genres, badge, tone)] || PALETTES.default;
  const typeLabel = getSeriesTypeLabel(seriesType, "Series");
  const genreLabels = normalizeGenreList(genres);
  const primaryGenre = genreLabels[0] || palette.label;
  const secondaryGenre = genreLabels[1] || trimLabel(eyebrow, 34) || `${typeLabel} on Gush`;
  const normalizedBadgeLabel = normalizeCoverBadge(badge);
  const badgeLabel =
    normalizedBadgeLabel &&
    !labelsMatch(normalizedBadgeLabel, typeLabel) &&
    !labelsMatch(normalizedBadgeLabel, primaryGenre) &&
    !labelsMatch(normalizedBadgeLabel, secondaryGenre)
      ? normalizedBadgeLabel
      : "";
  const kicker = primaryGenre || badgeLabel || palette.label || "Gush pick";

  return {
    ...palette,
    badgeLabel,
    typeLabel,
    primaryGenre,
    secondaryGenre,
    kicker,
  };
}

export function getCoverCardMeta(item = {}) {
  const subtitleValue = String(item?.subtitle || "").trim();
  const subtitleLooksEditorial =
    /[/|,]/.test(subtitleValue) &&
    !/(episode|chapter|continue|last read|updated|rating|saved|series)/i.test(subtitleValue);
  const genres = normalizeGenreList(
    Array.isArray(item?.genres) && item.genres.length > 0
      ? item.genres
      : subtitleLooksEditorial
        ? subtitleValue
        : [],
  );
  const typeLabel = getSeriesTypeLabel(item?.seriesType || item?.type, "");
  const badgeLabel = item?.adult || item?.isAdult ? "18+" : normalizeCoverBadge(item?.badge);
  const chips = [];

  if (typeLabel) {
    chips.push({ id: "type", label: typeLabel, tone: "neutral" });
  }
  if (genres[0]) {
    chips.push({ id: "genre", label: genres[0], tone: "accent" });
  }
  if (badgeLabel && !chips.some((chip) => chip.label.toLowerCase() === badgeLabel.toLowerCase())) {
    chips.push({
      id: "badge",
      label: badgeLabel,
      tone: badgeLabel === "18+" ? "danger" : "soft",
    });
  } else if (genres[1]) {
    chips.push({ id: "genre-2", label: genres[1], tone: "soft" });
  }

  const rawDetail =
    trimLabel(item?.statusLabel || item?.metaLabel, 48) ||
    trimLabel(item?.subtitle, 48) ||
    trimLabel(item?.author, 48);

  const normalizedGenreText = genres.join(" / ").toLowerCase();
  const detailText =
    rawDetail && rawDetail.toLowerCase() !== normalizedGenreText ? rawDetail : "";

  return {
    genres,
    typeLabel,
    badgeLabel,
    detailText,
    chips: chips.slice(0, 3),
  };
}

export function isLikelyPlaceholderCover(url) {
  const value = String(url || "").trim();
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value, "https://gush.local");
    if (PLACEHOLDER_HOSTS.has(parsed.hostname)) {
      return true;
    }
    return PLACEHOLDER_PATH_FRAGMENTS.some((fragment) =>
      parsed.pathname.toLowerCase().includes(fragment),
    );
  } catch {
    const lowerValue = value.toLowerCase();
    return PLACEHOLDER_PATH_FRAGMENTS.some((fragment) => lowerValue.includes(fragment));
  }
}

export function getCoverOverlayStyle(options) {
  const artDirection = getCoverArtDirection(options);
  return {
    backgroundImage: `radial-gradient(circle at 16% 18%, ${artDirection.accentSoft} 0%, transparent 28%), linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 24%, rgba(9, 13, 19, 0.18) 100%)`,
    borderColor: artDirection.border,
  };
}

export function buildCoverAltTokens(value) {
  return toTokens(value).slice(0, 4);
}
