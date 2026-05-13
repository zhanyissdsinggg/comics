export function buildReaderPath(seriesId, episodeId) {
  const normalizedSeriesId = String(seriesId || "").trim();
  const normalizedEpisodeId = String(episodeId || "").trim();

  if (!normalizedSeriesId || !normalizedEpisodeId) {
    return normalizedSeriesId ? `/series/${normalizedSeriesId}` : "/";
  }

  return `/read/${normalizedSeriesId}/${normalizedEpisodeId}`;
}
