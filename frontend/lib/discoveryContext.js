function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getBadges(series) {
  return [
    series?.badge,
    ...(Array.isArray(series?.badges) ? series.badges : []),
  ]
    .filter(Boolean)
    .map((badge) => String(badge).trim().toUpperCase());
}

function getReturnConfig(sourcePath) {
  const path = String(sourcePath || "").trim();
  if (!path || /^\/series\//.test(path)) {
    return null;
  }

  if (path === "/") {
    return {
      label: "Back home",
      title: "Home",
      hint: "",
    };
  }

  if (path.startsWith("/search")) {
    return {
      label: "Back to search",
      title: "Search",
      hint: "",
    };
  }

  if (path.startsWith("/rankings")) {
    return {
      label: "Back to featured",
      title: "Featured",
      hint: "",
    };
  }

  if (path.startsWith("/creators")) {
    return {
      label: "Back to creator",
      title: "Creator",
      hint: "",
    };
  }

  if (path.startsWith("/library")) {
    return {
      label: "Open Library",
      title: "Saved Series",
      hint: "",
    };
  }

  if (path.startsWith("/adult")) {
    return {
      label: "Back to 18+",
      title: "18+",
      hint: "",
    };
  }

  return {
    label: "Back",
    title: "Previous",
    hint: "",
  };
}

function getLaneReason({ entryPoint, campaignId, series }) {
  const status = normalizeToken(series?.status);
  const badges = getBadges(series);
  const isHotBadge = badges.some((badge) =>
    /^H[O]T$/i.test(String(badge || "")),
  );
  const isNewOrHot = badges.includes("NEW") || isHotBadge;

  if (entryPoint.startsWith("search_")) {
    if (campaignId.includes("free") || entryPoint.includes("free")) {
      return {
        sourceLabel: "Search",
        laneValue: "Started free",
        title: `${series?.title || "This title"} came from search.`,
        description: "",
      };
    }

    if (
      campaignId.includes("binge") ||
      campaignId.includes("completed") ||
      status === "completed"
    ) {
      return {
        sourceLabel: "Search",
        laneValue: "Completed",
        title: `${series?.title || "This title"} came from search.`,
        description: "",
      };
    }

    if (
      campaignId.includes("breakout") ||
      campaignId.includes("editorial") ||
      isNewOrHot
    ) {
      return {
        sourceLabel: "Search",
        laneValue: "Trending pick",
        title: `${series?.title || "This title"} is trending in search right now.`,
        description: "",
      };
    }

    return {
      sourceLabel: "Search",
      laneValue: "Best match",
      title: `${series?.title || "This title"} came from search.`,
      description: "",
    };
  }

  if (entryPoint.startsWith("home_")) {
    if (campaignId.includes("free")) {
      return {
        sourceLabel: "Home",
        laneValue: "Easy start",
        title: `${series?.title || "This title"} came from home.`,
        description: "",
      };
    }

    if (campaignId.includes("resume")) {
      return {
        sourceLabel: "Home",
        laneValue: "Resume",
        title: `${series?.title || "This title"} came from home.`,
        description: "",
      };
    }

    return {
      sourceLabel: "Home",
      laneValue: "Featured",
      title: `${series?.title || "This title"} came from home.`,
      description: "",
    };
  }

  if (entryPoint.startsWith("rankings_")) {
    return {
      sourceLabel: "Featured",
      laneValue: "Editor pick",
      title: `${series?.title || "This title"} came from featured.`,
      description: "",
    };
  }

  if (entryPoint.startsWith("creator_")) {
    return {
      sourceLabel: "Creator",
      laneValue: "From creator",
      title: `${series?.title || "This title"} came from a creator page.`,
      description: "",
    };
  }

  if (entryPoint.startsWith("library_")) {
    return {
      sourceLabel: "Library",
      laneValue: "Saved",
      title: `${series?.title || "This title"} came from your saved series.`,
      description: "",
    };
  }

  if (entryPoint.startsWith("adult_")) {
    return {
      sourceLabel: "18+",
      laneValue: "18+",
      title: `${series?.title || "This title"} came from 18+.`,
      description: "",
    };
  }

  return {
    sourceLabel: "Browse",
    laneValue: "Featured",
    title: `${series?.title || "This title"} came from browse.`,
    description: "",
  };
}

export function buildDiscoveryContext(series, attribution, options = {}) {
  if (!series?.id || !attribution) {
    return null;
  }

  const sourcePath = String(attribution?.sourcePath || "").trim();
  const entryPoint = normalizeToken(attribution?.entryPoint);
  const campaignId = normalizeToken(attribution?.campaignId);
  const returnConfig = getReturnConfig(sourcePath);
  const allowReaderEntry = Boolean(options.allowReaderEntry);

  if (!returnConfig) {
    return null;
  }

  if (
    !allowReaderEntry &&
    (entryPoint.startsWith("series_") ||
      entryPoint.startsWith("reader_") ||
      entryPoint.startsWith("unlock_") ||
      entryPoint.startsWith("store_") ||
      entryPoint.startsWith("subscribe_"))
  ) {
    return null;
  }

  const laneReason = getLaneReason({ entryPoint, campaignId, series });

  return {
    ...laneReason,
    sourcePath,
    returnLabel: returnConfig.label,
    returnTitle: returnConfig.title,
    returnHint: returnConfig.hint,
  };
}
