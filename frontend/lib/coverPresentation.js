import { resolveSeriesCreatorName } from "./creatorIdentity";

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
      "linear-gradient(150deg, #ff007a 0%, #ff6ab3 48%, #ffe500 100%)",
    accent: "#ffe500",
    accentSoft: "rgba(255, 229, 0, 0.34)",
    border: "rgba(0, 0, 0, 0.78)",
    panel: "rgba(255, 0, 122, 0.78)",
  },
  fantasy: {
    label: "Fantasy",
    background:
      "linear-gradient(150deg, #8b00ff 0%, #ff007a 48%, #00e5ff 100%)",
    accent: "#00e5ff",
    accentSoft: "rgba(0, 229, 255, 0.32)",
    border: "rgba(0, 0, 0, 0.78)",
    panel: "rgba(139, 0, 255, 0.76)",
  },
  action: {
    label: "Action",
    background:
      "linear-gradient(150deg, #ff6b00 0%, #ff007a 46%, #ffe500 100%)",
    accent: "#ffe500",
    accentSoft: "rgba(255, 229, 0, 0.34)",
    border: "rgba(0, 0, 0, 0.78)",
    panel: "rgba(255, 107, 0, 0.76)",
  },
  thriller: {
    label: "Thriller",
    background:
      "linear-gradient(150deg, #111111 0%, #8b00ff 48%, #00e5ff 100%)",
    accent: "#00e5ff",
    accentSoft: "rgba(0, 229, 255, 0.3)",
    border: "rgba(0, 0, 0, 0.82)",
    panel: "rgba(0, 0, 0, 0.72)",
  },
  comedy: {
    label: "Comedy",
    background:
      "linear-gradient(150deg, #ffe500 0%, #00e5ff 48%, #ff007a 100%)",
    accent: "#ff007a",
    accentSoft: "rgba(255, 0, 122, 0.3)",
    border: "rgba(0, 0, 0, 0.78)",
    panel: "rgba(0, 0, 0, 0.58)",
  },
  drama: {
    label: "Drama",
    background:
      "linear-gradient(150deg, #00e5ff 0%, #8b00ff 44%, #ff007a 100%)",
    accent: "#ffe500",
    accentSoft: "rgba(255, 229, 0, 0.3)",
    border: "rgba(0, 0, 0, 0.78)",
    panel: "rgba(0, 0, 0, 0.62)",
  },
  sciFi: {
    label: "Sci-Fi",
    background:
      "linear-gradient(150deg, #00e5ff 0%, #111111 46%, #ffe500 100%)",
    accent: "#00e5ff",
    accentSoft: "rgba(0, 229, 255, 0.32)",
    border: "rgba(0, 0, 0, 0.82)",
    panel: "rgba(0, 0, 0, 0.68)",
  },
  historical: {
    label: "Historical",
    background:
      "linear-gradient(150deg, #ffe500 0%, #ff6b00 42%, #8b00ff 100%)",
    accent: "#8b00ff",
    accentSoft: "rgba(139, 0, 255, 0.28)",
    border: "rgba(0, 0, 0, 0.78)",
    panel: "rgba(0, 0, 0, 0.58)",
  },
  mature: {
    label: "18+",
    background:
      "linear-gradient(150deg, #111111 0%, #ff007a 42%, #8b00ff 100%)",
    accent: "#ff007a",
    accentSoft: "rgba(255, 0, 122, 0.3)",
    border: "rgba(0, 0, 0, 0.82)",
    panel: "rgba(0, 0, 0, 0.72)",
  },
  default: {
    label: "Featured",
    background:
      "linear-gradient(150deg, #ffe500 0%, #00e5ff 44%, #ff007a 100%)",
    accent: "#ff007a",
    accentSoft: "rgba(255, 0, 122, 0.3)",
    border: "rgba(0, 0, 0, 0.78)",
    panel: "rgba(0, 0, 0, 0.58)",
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
  const splitGenreValue = (value) => {
    const text = trimLabel(value, 80);
    if (!text) {
      return [];
    }

    const delimiter = text.includes(" / ")
      ? " / "
      : text.includes(",")
        ? ","
        : null;

    const parts = delimiter ? text.split(delimiter) : text.split(/[/|,]/);
    return parts.map((part) => trimLabel(part, 22)).filter(Boolean);
  };

  const values = Array.isArray(input) ? input.flatMap(splitGenreValue) : splitGenreValue(input);
  return Array.from(new Set(values)).slice(0, 4);
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
  if (/(H[O]T|TREND|POPULAR|FRESH)/.test(upper)) {
    return "";
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
  const genreSource =
    Array.isArray(item?.genres) && item.genres.length > 0
      ? item.genres
      : typeof item?.genres === "string" && item.genres.trim()
        ? item.genres
        : subtitleLooksEditorial
          ? subtitleValue
          : [];
  const genres = normalizeGenreList(genreSource);
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
    trimLabel(resolveSeriesCreatorName(item), 48);

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
