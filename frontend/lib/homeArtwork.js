const HOME_ARTWORK_BY_TITLE = {
  "The Last Kingdom": {
    hero: {
      src: "/images/home/the-last-kingdom-hero.png",
      position: "center right",
    },
  },
  "Crimson Tide": {
    cover: {
      src: "/images/home/crimson-tide-cover.png",
      position: "center 22%",
    },
  },
  "Cherry Blossom High": {
    cover: {
      src: "/images/home/cherry-blossom-high-cover.png",
      position: "center 18%",
    },
  },
  "Wild Hearts": {
    cover: {
      src: "/images/home/wild-hearts-cover.png",
      position: "center 18%",
    },
  },
  "Solar Wind": {
    cover: {
      src: "/images/home/solar-wind-cover.png",
      position: "center 18%",
    },
  },
};

export const HOME_FEATURED_TITLE = "The Last Kingdom";

export const HOME_PRIORITY_TITLES = [
  "Crimson Tide",
  "Cherry Blossom High",
  "Wild Hearts",
  "Solar Wind",
];

export const HOME_TRENDING_PRIORITY_TITLES = [
  "Crimson Tide",
  "Cherry Blossom High",
  "Wild Hearts",
  "Solar Wind",
  "Starfall Academy",
  "Shadow Protocol",
];

export const HOME_COMPLETED_PRIORITY_TITLES = [
  "Crimson Tide",
  "Cherry Blossom High",
  "Wild Hearts",
];

export const HOME_UPDATES_PRIORITY_TITLES = [
  "Wild Hearts",
  "The Last Kingdom",
];

export const INTERACTIVE_STORIES_HOME_ARTWORK = {
  src: "/images/home/interactive-stories-banner.png",
  position: "center center",
};

function normalizeTitle(value) {
  return String(value || "").trim();
}

export function getHomeArtwork(title, variant = "cover") {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    return null;
  }

  return HOME_ARTWORK_BY_TITLE[normalizedTitle]?.[variant] || null;
}

export function withHomeArtwork(series, variant = "cover") {
  if (!series || typeof series !== "object") {
    return series;
  }

  const artwork = getHomeArtwork(series.title, variant);
  if (!artwork) {
    return series;
  }

  if (variant === "hero") {
    return {
      ...series,
      bannerUrl: artwork.src,
      homeHeroArtwork: artwork,
      homeCoverArtwork: artwork,
    };
  }

  return {
    ...series,
    coverUrl: artwork.src,
    homeCoverArtwork: artwork,
  };
}

export function prioritizeSeriesByTitles(seriesList = [], titles = [], limit = Infinity) {
  const normalizedTitles = (Array.isArray(titles) ? titles : [])
    .map((title) => normalizeTitle(title))
    .filter(Boolean);
  const safeItems = Array.isArray(seriesList) ? seriesList.filter(Boolean) : [];
  const selected = [];
  const seenIds = new Set();

  normalizedTitles.forEach((title) => {
    const match = safeItems.find(
      (series) => normalizeTitle(series?.title) === title,
    );
    const seriesId = String(match?.id || "").trim();
    if (!match || !seriesId || seenIds.has(seriesId)) {
      return;
    }
    seenIds.add(seriesId);
    selected.push(match);
  });

  safeItems.forEach((series) => {
    const seriesId = String(series?.id || "").trim();
    if (!seriesId || seenIds.has(seriesId)) {
      return;
    }
    seenIds.add(seriesId);
    selected.push(series);
  });

  return selected.slice(0, limit);
}

export function pickSeriesByExactTitle(seriesList = [], title = "") {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    return null;
  }

  return (
    (Array.isArray(seriesList) ? seriesList : []).find(
      (series) => normalizeTitle(series?.title) === normalizedTitle,
    ) || null
  );
}
