function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

function getBadges(series) {
  return [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
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
      label: "Back to homepage",
      title: "Home",
      hint: "Go back home if you want to compare more featured picks before choosing this series.",
    };
  }

  if (path.startsWith("/search")) {
    return {
      label: "Back to search",
      title: "Search",
      hint: "Go back to search if you want to compare more results before committing.",
    };
  }

  if (path.startsWith("/rankings")) {
    return {
      label: "Back to rankings",
      title: "Charts",
      hint: "Go back to the chart and compare this series with the other top picks.",
    };
  }

  if (path.startsWith("/creators")) {
    return {
      label: "Back to creator page",
      title: "Creator page",
      hint: "Go back to the creator page and browse more work from the same creator.",
    };
  }

  if (path.startsWith("/library")) {
    return {
      label: "Back to library",
      title: "Library",
      hint: "Go back to your library and keep reading from the series you have already saved.",
    };
  }

  if (path.startsWith("/adult")) {
    return {
      label: "Back to 18+ page",
      title: "18+ section",
      hint: "Go back to the 18+ section and compare more unlocked titles.",
    };
  }

  return {
    label: "Back to previous page",
    title: "Discovery",
    hint: "Go back to the page that led you here and keep browsing.",
  };
}

function getLaneReason({ entryPoint, campaignId, series }) {
  const status = normalizeToken(series?.status);
  const badges = getBadges(series);
  const freeEpisodeCount = Number(series?.freeEpisodeCount || 0);
  const isNewOrHot = badges.includes("NEW") || badges.includes("HOT");

  if (entryPoint.startsWith("search_")) {
    if (campaignId.includes("free") || entryPoint.includes("free")) {
      return {
        sourceLabel: "Search",
        laneValue: "Free to start",
        title: `${series?.title || "This title"} is an easy place to start from search.`,
        description:
          freeEpisodeCount > 0
            ? `${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} make it easy to try before spending points.`
            : "This title gives search users a lower-commitment place to begin.",
      };
    }

    if (campaignId.includes("binge") || campaignId.includes("completed") || status === "completed") {
      return {
        sourceLabel: "Search",
        laneValue: "Completed pick",
        title: `${series?.title || "This title"} is a finished series search is surfacing right now.`,
        description: "Completed runs are easier to commit to because you can read straight through without waiting.",
      };
    }

    if (campaignId.includes("breakout") || campaignId.includes("editorial") || isNewOrHot) {
      return {
        sourceLabel: "Search",
        laneValue: "Breakout pick",
        title: `${series?.title || "This title"} is one of the standout picks from search right now.`,
        description: "When a reader is still deciding, a strong breakout title makes the next click easier.",
      };
    }

    return {
      sourceLabel: "Search",
      laneValue: "Top result",
      title: `${series?.title || "This title"} is one of the clearest next picks from search.`,
      description: "Search should help readers move forward, not stop at a result count.",
    };
  }

  if (entryPoint.startsWith("home_")) {
    if (campaignId.includes("free")) {
      return {
        sourceLabel: "Home",
        laneValue: "Free to start",
        title: `${series?.title || "This title"} is being featured on home as an easy place to start.`,
        description:
          freeEpisodeCount > 0
            ? `${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} make it easy for new readers to jump in.`
            : "This title is being featured on home as a low-commitment first click.",
      };
    }

    if (campaignId.includes("resume")) {
      return {
        sourceLabel: "Home",
        laneValue: "Return pick",
        title: `${series?.title || "This title"} is being featured on home for returning readers.`,
        description: "Home is surfacing this series to make it easier to jump back into reading.",
      };
    }

    return {
      sourceLabel: "Home",
      laneValue: "Featured pick",
      title: `${series?.title || "This title"} is one of the featured picks on home right now.`,
      description: "Home is already giving this series premium placement, so the page should keep that context clear.",
    };
  }

  if (entryPoint.startsWith("rankings_")) {
      return {
        sourceLabel: "Charts",
        laneValue: "Chart pick",
        title: `${series?.title || "This title"} is trending on the charts right now.`,
        description: "Chart traffic works best when readers still understand why this title is hot right now.",
      };
  }

  if (entryPoint.startsWith("creator_")) {
    return {
      sourceLabel: "Creator page",
      laneValue: "More from this creator",
      title: `${series?.title || "This title"} was opened from the creator page during a broader browse session.`,
      description: "Readers coming from a creator page are usually comparing more than one title at once.",
    };
  }

  if (entryPoint.startsWith("library_")) {
    return {
      sourceLabel: "Library",
      laneValue: "Resume pick",
      title: `${series?.title || "This title"} is ready for a quick return from your library.`,
      description: "Library visits already show strong intent, so the goal here is to keep the return smooth.",
    };
  }

  if (entryPoint.startsWith("adult_")) {
    return {
      sourceLabel: "18+ section",
      laneValue: "18+ pick",
      title: `${series?.title || "This title"} was opened from the 18+ section.`,
      description: "After clearing access rules, readers should still get a clear reason to keep browsing.",
    };
  }

  return {
    sourceLabel: "Discovery",
    laneValue: "Featured pick",
    title: `${series?.title || "This title"} arrived through a live discovery surface.`,
    description: "This click came from a featured surface, not a random direct visit.",
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
