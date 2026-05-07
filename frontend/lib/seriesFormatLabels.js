function resolveSeriesType(input) {
  if (!input) {
    return "";
  }

  if (typeof input === "string") {
    return input.trim().toLowerCase();
  }

  return String(
    input.type ||
      input.seriesType ||
      input.format ||
      input.series?.type ||
      input.series?.seriesType ||
      "",
  )
    .trim()
    .toLowerCase();
}

export function isNovelSeries(input) {
  return resolveSeriesType(input) === "novel";
}

export function getInstallmentLabel(input, { plural = false, short = false } = {}) {
  const isNovel = isNovelSeries(input);

  if (short) {
    return isNovel ? "Ep." : "Ch.";
  }

  if (plural) {
    return isNovel ? "Episodes" : "Chapters";
  }

  return isNovel ? "Episode" : "Chapter";
}

export function getEntryLabelSingular(input) {
  return getInstallmentLabel(input);
}

export function getEntryLabelPlural(input) {
  return getInstallmentLabel(input, { plural: true });
}

export function getEntryLabel(input, count) {
  if (count === null || count === undefined) {
    return getEntryLabelSingular(input);
  }

  return Number(count) === 1
    ? getEntryLabelSingular(input)
    : getEntryLabelPlural(input);
}

export function getLatestEntryLabel(series, latestEntryNumber) {
  if (latestEntryNumber === null || latestEntryNumber === undefined || latestEntryNumber === "") {
    return "Coming soon";
  }

  return `${getEntryLabelSingular(series)} ${latestEntryNumber}`;
}

export function getSeriesHeroMetadataParts(series, creatorName, latestEntryNumber) {
  const normalizedCreatorName = String(creatorName || "").trim();
  const creatorText = normalizedCreatorName
    ? `By ${normalizedCreatorName}`
    : "";
  const hasLatestNumber =
    latestEntryNumber !== null &&
    latestEntryNumber !== undefined &&
    String(latestEntryNumber).trim() !== "";
  const latestEntryLabel = getLatestEntryLabel(series, latestEntryNumber);
  const latestText = hasLatestNumber ? `Latest ${latestEntryLabel}` : "";
  const separator = creatorText && latestText ? " \u00b7 " : "";

  return {
    creatorText,
    latestText,
    separator,
    combinedText: `${creatorText}${separator}${latestText}`,
  };
}

export function formatInstallmentLabel(input, number, options = {}) {
  const label = getInstallmentLabel(input, options);

  if (number === null || number === undefined || number === "") {
    return label;
  }

  return `${label} ${number}`;
}

export function formatInstallmentCount(input, count) {
  const safeCount = Number(count || 0);
  return `${safeCount} ${getEntryLabel(input, safeCount).toLowerCase()}`;
}

export function getStartReadingLabel(input, number = 1) {
  return `Read ${formatInstallmentLabel(input, number)}`;
}

export function getContinueReadingNote(input, number) {
  return `Resume ${formatInstallmentLabel(input, number)}.`;
}

export function isDefaultInstallmentTitle(title, input) {
  const normalizedTitle = String(title || "").trim();
  if (!normalizedTitle) {
    return false;
  }

  const genericPatterns = [
    /^(chapter|ch\.?)\s*\d+$/i,
    /^(episode|ep\.?)\s*\d+$/i,
  ];

  if (genericPatterns.some((pattern) => pattern.test(normalizedTitle))) {
    return true;
  }

  const installmentLabel = getInstallmentLabel(input).toLowerCase();
  const shortLabel = getInstallmentLabel(input, { short: true }).toLowerCase();

  return new RegExp(
    `^(${installmentLabel}|${shortLabel.replace(".", "\\.")})\\s*\\d+$`,
    "i",
  ).test(normalizedTitle);
}
