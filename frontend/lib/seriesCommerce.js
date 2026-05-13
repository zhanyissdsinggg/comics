function buildCommerceEpisodeMap(commercePayload) {
  return new Map(
    (Array.isArray(commercePayload?.episodes) ? commercePayload.episodes : [])
      .map((episode) => [
        String(episode?.id || "").trim(),
        {
          pricePts: Number(episode?.pricePts || 0),
          ttfEligible: Boolean(episode?.ttfEligible),
          ttfReadyAt: episode?.ttfReadyAt || null,
        },
      ])
      .filter(([episodeId]) => Boolean(episodeId)),
  );
}

export function getEpisodeCommerceAccess(episode) {
  if (episode?.access && typeof episode.access === "object") {
    return {
      pricePts: Number(episode.access?.pricePts || 0),
      ttfEligible: Boolean(episode.access?.ttfEligible),
      ttfReadyAt: episode.access?.ttfReadyAt || null,
    };
  }

  return {
    pricePts: Number(episode?.pricePts || 0),
    ttfEligible: Boolean(episode?.ttfEligible),
    ttfReadyAt: episode?.ttfReadyAt || null,
  };
}

export function mergeSeriesCommerceAccess(detailPayload, commercePayload) {
  if (!detailPayload?.series) {
    return detailPayload;
  }

  const accessMap = buildCommerceEpisodeMap(commercePayload);
  const episodes = (
    Array.isArray(detailPayload?.episodes) ? detailPayload.episodes : []
  ).map((episode) => {
    const episodeId = String(episode?.id || "").trim();
    const access = accessMap.get(episodeId);
    if (!access) {
      return episode;
    }

    return {
      ...episode,
      access,
    };
  });

  return {
    ...detailPayload,
    episodes,
  };
}

export function mergeSeriesCommerceEpisodes(detailPayload, commercePayload) {
  if (!detailPayload?.series) {
    return detailPayload;
  }

  const accessMap = buildCommerceEpisodeMap(commercePayload);
  const episodes = (
    Array.isArray(detailPayload?.episodes) ? detailPayload.episodes : []
  ).map((episode) => {
    const episodeId = String(episode?.id || "").trim();
    const access = accessMap.get(episodeId);
    if (!access) {
      return episode;
    }

    return {
      ...episode,
      ...access,
    };
  });

  return {
    ...detailPayload,
    episodes,
  };
}
