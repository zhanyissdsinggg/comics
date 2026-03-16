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
      title: "Homepage lane",
      hint: "Return to the main storefront and compare the current lead shelf before committing here.",
    };
  }

  if (path.startsWith("/search")) {
    return {
      label: "Back to search desk",
      title: "Search desk",
      hint: "Go back to the current search lane if the reader still wants a broader compare set before locking in.",
    };
  }

  if (path.startsWith("/rankings")) {
    return {
      label: "Back to rankings",
      title: "Rankings board",
      hint: "Return to the chart and compare this title against the rest of the live board without losing context.",
    };
  }

  if (path.startsWith("/creators")) {
    return {
      label: "Back to creator shelf",
      title: "Creator shelf",
      hint: "Step back into the creator lane and compare adjacent titles from the same body of work.",
    };
  }

  if (path.startsWith("/library")) {
    return {
      label: "Back to library",
      title: "Library return",
      hint: "Return to the saved shelf and keep the session anchored in previously qualified titles.",
    };
  }

  if (path.startsWith("/adult")) {
    return {
      label: "Back to 18+ desk",
      title: "Protected desk",
      hint: "Return to the protected shelf and compare this title against the rest of the gated lane.",
    };
  }

  return {
    label: "Back to previous lane",
    title: "Discovery lane",
    hint: "Return to the surface that delivered this session and compare the current title against that broader lane.",
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
        sourceLabel: "Search desk",
        laneValue: "Free-start rescue",
        title: `${series?.title || "This title"} is the low-friction handoff the search desk is pushing right now.`,
        description:
          freeEpisodeCount > 0
            ? `${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} make it easier to rescue a weak query with a concrete next click instead of another generic filter pass.`
            : "Search is using this title as a lower-friction recovery path when the reader needs a stronger first commitment.",
      };
    }

    if (campaignId.includes("binge") || campaignId.includes("completed") || status === "completed") {
      return {
        sourceLabel: "Search desk",
        laneValue: "Binge-ready rescue",
        title: `${series?.title || "This title"} is the binge-ready handoff search is using to save narrow result sets.`,
        description:
          "Completed runs reduce uncertainty fast, which makes them a stronger rescue path than sending the reader back into a dead-end query lane.",
      };
    }

    if (campaignId.includes("breakout") || campaignId.includes("editorial") || isNewOrHot) {
      return {
        sourceLabel: "Search desk",
        laneValue: "Breakout push",
        title: `${series?.title || "This title"} is the breakout push currently carrying the search desk.`,
        description:
          "When search intent is still soft, a breakout title gives the session a clearer handoff than a blank grid, especially when editorial is already backing the shelf.",
      };
    }

    return {
      sourceLabel: "Search desk",
      laneValue: "Search handoff",
      title: `${series?.title || "This title"} is the strongest next click from the current search lane.`,
      description:
        "The search experience should not die at the results count. This title is being used as the handoff that keeps the session moving.",
    };
  }

  if (entryPoint.startsWith("home_")) {
    if (campaignId.includes("free")) {
      return {
        sourceLabel: "Homepage desk",
        laneValue: "Free-start lead",
        title: `${series?.title || "This title"} is leading the homepage free-start lane.`,
        description:
          freeEpisodeCount > 0
            ? `Homepage is using its ${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} to convert a cold visit into chapter one with less bounce risk.`
            : "Homepage is using this title as a low-friction first click before the reader commits to premium unlocks.",
      };
    }

    if (campaignId.includes("resume")) {
      return {
        sourceLabel: "Homepage desk",
        laneValue: "Return spotlight",
        title: `${series?.title || "This title"} is being surfaced as a return-session spotlight on the homepage.`,
        description:
          "Homepage is using this title to pull the reader back into an active reading habit instead of forcing them to rediscover the catalog from zero.",
      };
    }

    return {
      sourceLabel: "Homepage desk",
      laneValue: "Editorial shelf",
      title: `${series?.title || "This title"} is currently being pushed from the homepage discovery desk.`,
      description:
        "The storefront is already giving this title premium surface area, so the series page should explain the handoff and keep the user inside the same lane.",
    };
  }

  if (entryPoint.startsWith("rankings_")) {
    return {
      sourceLabel: "Rankings board",
      laneValue: "Chart momentum",
      title: `${series?.title || "This title"} is part of the live rankings conversation right now.`,
      description:
        "Chart traffic converts better when the series page acknowledges the live board behind the click instead of pretending the visit arrived in a vacuum.",
    };
  }

  if (entryPoint.startsWith("creator_")) {
    return {
      sourceLabel: "Creator shelf",
      laneValue: "Body-of-work compare",
      title: `${series?.title || "This title"} came through the creator shelf as part of a broader comparison set.`,
      description:
        "Readers coming from a creator page are evaluating range and fit, so the series page should keep that comparison context visible.",
    };
  }

  if (entryPoint.startsWith("library_")) {
    return {
      sourceLabel: "Library return",
      laneValue: "Return-session pick",
      title: `${series?.title || "This title"} came back into view through the reader's saved shelf.`,
      description:
        "Library visits already carry high intent, so the right job here is to remove friction and keep the return session moving.",
    };
  }

  if (entryPoint.startsWith("adult_")) {
    return {
      sourceLabel: "Protected desk",
      laneValue: "Protected discovery",
      title: `${series?.title || "This title"} was surfaced through the protected 18+ desk.`,
      description:
        "Protected discovery works best when the reader still gets a clear why-now explanation after clearing access rules.",
    };
  }

  return {
    sourceLabel: "Discovery lane",
    laneValue: "Editorial handoff",
    title: `${series?.title || "This title"} arrived through a live discovery surface.`,
    description:
      "The click came from an editorial or merchandising path, so the page should acknowledge that context instead of acting like a direct visit.",
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
