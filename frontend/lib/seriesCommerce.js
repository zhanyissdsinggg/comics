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

export function mergeSeriesCommerceAccess(detailPayload, commercePayload) {
  if (!detailPayload?.series) {
    return detailPayload;
  }

  const accessMap = buildCommerceEpisodeMap(commercePayload);
  const episodes = (Array.isArray(detailPayload?.episodes) ? detailPayload.episodes : []).map(
    (episode) => {
      const episodeId = String(episode?.id || "").trim();
      const access = accessMap.get(episodeId);
      if (!access) {
        return episode;
      }

      return {
        ...episode,
        access,
      };
    },
  );

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
  const episodes = (Array.isArray(detailPayload?.episodes) ? detailPayload.episodes : []).map(
    (episode) => {
      const episodeId = String(episode?.id || "").trim();
      const access = accessMap.get(episodeId);
      if (!access) {
        return episode;
      }

      return {
        ...episode,
        ...access,
      };
    },
  );

  return {
    ...detailPayload,
    episodes,
  };
}
