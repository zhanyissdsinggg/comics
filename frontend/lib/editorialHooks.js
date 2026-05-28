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
  const conflictCount = CONFLICT_HINTS.filter((token) =>
    lowerText.includes(token),
  ).length;

  return normalized.length > 150 && conflictCount === 0;
}

function buildGenreProfile(series) {
  return normalizeGenreList(series?.genres).filter(
    (genre) => !isMatureGenreValue(genre),
  );
}

function buildGenreFallback(series, { includeTitle = false } = {}) {
  const title = normalizeText(series?.title) || "This story";
  const primaryGenre = buildGenreProfile(series)[0]?.toLowerCase() || "";
  const titleHint = title.toLowerCase();

  const leadIn = includeTitle ? title : "This story";

  if (/(crown|king|kingdom|prince|queen|royal|throne)/.test(titleHint)) {
    return `${leadIn} opens with a stolen crown, a bad lie, and a court already hunting someone down.`;
  }

  if (/(ghost|grave|funeral|midnight|mourning)/.test(titleHint)) {
    return `${leadIn} opens with grief in the room and gets worse once the dead ask for something back.`;
  }

  if (/(school|campus|class|detention|club)/.test(titleHint)) {
    return `${leadIn} turns one reckless choice into gossip, fallout, and feelings nobody can explain.`;
  }

  if (/(blood|knife|hunt|hunter|crime|case)/.test(titleHint)) {
    return `${leadIn} starts after the damage is done, and every answer makes the next move worse.`;
  }

  if (/(romance|love|bl|gl)/.test(primaryGenre)) {
    return `${leadIn} starts with bad timing, one loaded glance too many, and feelings that get riskier by the chapter.`;
  }

  if (/(fantasy|magic|isekai|supernatural)/.test(primaryGenre)) {
    return `${leadIn} drops one bad decision into a world where the rules never save anyone for long.`;
  }

  if (/(school|slice|comedy)/.test(primaryGenre)) {
    return `${leadIn} starts playful, gets messy fast, and hits where the feelings hurt.`;
  }

  if (/(mystery|thriller|crime|dark|horror)/.test(primaryGenre)) {
    return `${leadIn} opens with one wrong move and keeps tightening until even the quiet scenes feel dangerous.`;
  }

  if (/(action|adventure|sports|battle)/.test(primaryGenre)) {
    return `${leadIn} hits fast, bruises early, and keeps escalating before anyone earns a way out.`;
  }

  if (/(sci-fi|sci fi|science fiction|cyber)/.test(primaryGenre)) {
    return `${leadIn} moves like a plan that already failed once, with pressure climbing every time the fix gets uglier.`;
  }

  if (
    String(series?.status || "")
      .trim()
      .toLowerCase() === "completed"
  ) {
    return `${leadIn} is all sharp turns, fallout, and a finish that lands without making you wait.`;
  }

  return `${leadIn} opens on a problem already spiraling and leaves the next chapter feeling impossible to skip.`;
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
    sentences.find(
      (sentence) => sentence.length >= 36 && !looksLikeGenericCopy(sentence),
    ) ||
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
      `Stories built around ${genres.slice(0, 2).join(" and ").toLowerCase()}, with enough pull to stand out fast.`,
      maxLength,
    );
  }

  return clampText(
    "A creator page for readers chasing a strong point of view.",
    maxLength,
  );
}
