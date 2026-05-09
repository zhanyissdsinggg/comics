import { normalizeGenreList } from "./coverPresentation";
import { isMatureGenreValue } from "./matureContent";

const GENERIC_COPY_PATTERNS = [
  /\ban epic tale\b/i,
  /\ba tale of\b/i,
  /\ba heartwarming story of\b/i,
  /\ba young hero must save the world\b/i,
  /\blife gets complicated when\b/i,
  /\ba crew of misfits uncovers\b/i,
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
  const titleHint = title.toLowerCase();

  const leadIn = includeTitle ? title : "This story";

  if (/(crown|king|kingdom|prince|queen|royal|throne)/.test(titleHint)) {
    return `${leadIn} starts with a stolen crown, a lie dressed up as loyalty, and someone running for their life before the court can finish the job.`;
  }

  if (/(ghost|grave|funeral|midnight|mourning)/.test(titleHint)) {
    return `${leadIn} opens with grief already in the room, then keeps tightening once the dead start asking for something back.`;
  }

  if (/(school|campus|class|detention|club)/.test(titleHint)) {
    return `${leadIn} turns one reckless choice into gossip, damage control, and feelings nobody involved knows how to explain cleanly.`;
  }

  if (/(blood|knife|hunt|hunter|crime|case)/.test(titleHint)) {
    return `${leadIn} begins after the damage is already done, and every answer only makes the next decision look worse.`;
  }

  if (/(romance|love|bl|gl)/.test(primaryGenre)) {
    return `${leadIn} starts with terrible timing, one loaded glance too many, and a relationship that gets riskier the longer nobody says the obvious part out loud.`;
  }

  if (/(fantasy|magic|isekai|supernatural)/.test(primaryGenre)) {
    return `${leadIn} drops one bad decision into a world built on rules nobody survives by following for long.`;
  }

  if (/(school|slice|comedy)/.test(primaryGenre)) {
    return `${leadIn} starts playful, gets messy fast, and somehow lands exactly where the feelings hurt most.`;
  }

  if (/(mystery|thriller|crime|dark|horror)/.test(primaryGenre)) {
    return `${leadIn} opens with one wrong move, then keeps tightening the screws until even the quiet scenes feel like a trap.`;
  }

  if (/(action|adventure|sports|battle)/.test(primaryGenre)) {
    return `${leadIn} hits fast, leaves bruises early, and keeps escalating before anybody earns a safe way out.`;
  }

  if (/(sci-fi|sci fi|science fiction|cyber)/.test(primaryGenre)) {
    return `${leadIn} moves like a plan that already went wrong once, with pressure building every time the fix gets uglier.`;
  }

  if (String(series?.status || "").trim().toLowerCase() === "completed") {
    return `${leadIn} is all sharp turns, emotional fallout, and a finish that lands without making you wait around for it.`;
  }

  return `${leadIn} opens on a problem already spiraling, keeps the pressure close, and leaves the next chapter feeling like a very bad idea you still want immediately.`;
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
