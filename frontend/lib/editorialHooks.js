import { normalizeGenreList } from "./coverPresentation";
import { isMatureGenreValue } from "./matureContent";

const GENERIC_COPY_PATTERNS = [
  /\ban epic tale\b/i,
  /\ba tale of\b/i,
  /\bwarriors? and kingdoms?\b/i,
  /\bfight(?:ing)? for\b/i,
  /\bmust save\b/i,
  /\bjourney of\b/i,
  /\bdiscover(?:s|ing)? a secret\b/i,
  /\bworld of magic\b/i,
  /\bfull of twists and turns\b/i,
  /\btests? of friendship\b/i,
  /\blove and betrayal\b/i,
  /\bface(?:s)? impossible odds\b/i,
  /\bwhen destiny calls\b/i,
];

const CONFLICT_HINTS = [
  "betrayal",
  "secret",
  "revenge",
  "confession",
  "missing",
  "lies",
  "blackmail",
  "murder",
  "curse",
  "storm",
  "war",
  "rival",
  "forbidden",
  "haunted",
  "danger",
  "fight",
  "chase",
  "survive",
  "protect",
  "escape",
];

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampText(value, maxLength = 120) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function looksLikeGenericCopy(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return true;
  }

  if (GENERIC_COPY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const lowerText = normalized.toLowerCase();
  const conflictCount = CONFLICT_HINTS.filter((token) => lowerText.includes(token)).length;

  return normalized.length > 150 && conflictCount === 0;
}

function buildGenreProfile(series) {
  return normalizeGenreList(series?.genres).filter((genre) => !isMatureGenreValue(genre));
}

function buildGenreFallback(series, { includeTitle = false } = {}) {
  const title = normalizeText(series?.title) || "This story";
  const primaryGenre = buildGenreProfile(series)[0]?.toLowerCase() || "";

  const leadIn = includeTitle ? title : "This story";

  if (/(romance|love|bl|gl)/.test(primaryGenre)) {
    return `${leadIn} opens with messy feelings, bad timing, and a romance that gets harder to walk away from.`;
  }

  if (/(fantasy|magic|isekai|supernatural)/.test(primaryGenre)) {
    return `${leadIn} throws one impossible choice into a world that gets stranger and more dangerous by the chapter.`;
  }

  if (/(school|slice|comedy)/.test(primaryGenre)) {
    return `${leadIn} turns everyday chaos into the kind of drama that starts funny and ends way too personal.`;
  }

  if (/(mystery|thriller|crime|dark|horror)/.test(primaryGenre)) {
    return `${leadIn} starts with one wrong move and keeps the tension tight long after the first reveal lands.`;
  }

  if (/(action|adventure|sports|battle)/.test(primaryGenre)) {
    return `${leadIn} drops fast, hits hard, and keeps raising the stakes before anyone gets a clean way out.`;
  }

  if (/(sci-fi|sci fi|science fiction|cyber)/.test(primaryGenre)) {
    return `${leadIn} moves like a late-night rush job, with pressure building every time the plan gets one step uglier.`;
  }

  if (String(series?.status || "").trim().toLowerCase() === "completed") {
    return `${leadIn} is all payoff, sharp turns, and a finish that doesn't make you wait around.`;
  }

  return `${leadIn} starts fast, keeps the pressure close, and leaves just enough unresolved to make the next chapter feel dangerous.`;
}

function extractEditorialSentence(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "";
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => normalizeText(sentence))
    .filter(Boolean);

  const candidate =
    sentences.find((sentence) => sentence.length >= 36 && !looksLikeGenericCopy(sentence)) ||
    sentences[0] ||
    normalized;

  return candidate;
}

export function buildEditorialHook(series, options = {}) {
  const { maxLength = 120, includeTitle = false } = options;
  const source = [
    series?.shortDescription,
    series?.summary,
    series?.synopsis,
    series?.description,
    series?.hook,
  ]
    .map((value) => normalizeText(value))
    .find(Boolean);

  const candidate = extractEditorialSentence(source);
  if (candidate && !looksLikeGenericCopy(candidate)) {
    return clampText(candidate, maxLength);
  }

  return clampText(buildGenreFallback(series, { includeTitle }), maxLength);
}

export function buildEditorialCardHook(series, options = {}) {
  return buildEditorialHook(series, {
    maxLength: options.maxLength ?? 84,
    includeTitle: false,
  }).replace(/^This story\s+/i, "");
}

export function buildCreatorEditorialHook(creator, options = {}) {
  const maxLength = options.maxLength ?? 108;
  const source = normalizeText(creator?.leadSummary || creator?.bio || "");

  if (source && !looksLikeGenericCopy(source)) {
    return clampText(extractEditorialSentence(source), maxLength);
  }

  const genres = normalizeGenreList(creator?.topGenres).filter(
    (genre) => !isMatureGenreValue(genre),
  );

  if (genres.length > 0) {
    return clampText(
      `Stories built around ${genres.slice(0, 2).join(" and ").toLowerCase()}, with enough personality to keep the shelf feeling distinct.`,
      maxLength,
    );
  }

  return clampText(
    "A creator page for readers who want the next title to come with a clear point of view.",
    maxLength,
  );
}
