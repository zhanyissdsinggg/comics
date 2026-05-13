import { notFound } from "next/navigation";
import { resolveSeriesCreatorName } from "../../../../lib/creatorIdentity";
import {
  isBlockedPublicSeriesIdentifier,
  isBlockedPublicSeriesRecord,
  shouldBlockDemoContentInProduction,
} from "../../../../lib/publicCatalogVisibility";
import {
  buildIndexRobots,
  buildNoIndexRobots,
  createPageMetadata,
} from "../../../../lib/seo";
import {
  formatInstallmentLabel,
  getInstallmentLabel,
  isDefaultInstallmentTitle,
} from "../../../../lib/seriesFormatLabels";
import { siteConfig } from "../../../../lib/siteConfig";
import { isAdultContent } from "../../../../lib/contentFilters";
import { buildPublicSeriesStaticParams } from "../../../../lib/publicSeriesCatalog";
import {
  logSeriesInvariant,
  validateReaderPayload,
} from "../../../../lib/publicSeriesRouteValidation";
import { isServerAdultModeEnabled } from "../../../../lib/serverAdultGate";
import { loadReaderSeoPayload } from "../../../../lib/storefrontSeo";
import ReaderPageShell from "./ReaderPageShell";

export const revalidate = 300;
export const dynamic = "force-dynamic";
export async function generateStaticParams() {
  return buildPublicSeriesStaticParams().flatMap(({ id }) => [
    { seriesId: id, episodeId: `${id}e1` },
  ]);
}

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = String(resolvedParams?.seriesId || "").trim();
  const episodeId = String(resolvedParams?.episodeId || "").trim();
  if (
    shouldBlockDemoContentInProduction() &&
    (isBlockedPublicSeriesIdentifier(seriesId) ||
      isBlockedPublicSeriesIdentifier(episodeId))
  ) {
    notFound();
  }
  const includeAdult = await isServerAdultModeEnabled();
  const { series, episode, state } = await loadReaderSeoPayload(
    seriesId,
    episodeId,
    {
      includeAdult,
    },
  );

  if (!series || !episode || state !== "ready") {
    return createPageMetadata({
      title: "Read story",
      description: `Read stories on ${siteConfig.siteName}.`,
      path: `/read/${seriesId}/${episodeId}`,
      robots: buildNoIndexRobots({ follow: false }),
    });
  }

  const seriesTitle = String(series?.title || "").trim() || "Series";
  const fallbackEpisodeTitle = formatInstallmentLabel(
    series?.type || episode,
    episode?.number || episodeId,
  );
  const rawEpisodeTitle = String(episode?.title || "").trim();
  const episodeTitle =
    rawEpisodeTitle &&
    !isDefaultInstallmentTitle(rawEpisodeTitle, series?.type || episode)
      ? rawEpisodeTitle
      : fallbackEpisodeTitle;
  const creatorName = resolveSeriesCreatorName(series);
  const description = [
    `Read ${episodeTitle} from ${seriesTitle} on ${siteConfig.siteName}.`,
    creatorName ? `By ${creatorName}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const isMatureReader = isAdultContent(series) || isAdultContent(episode);
  const isPaidEpisode =
    Number(episode?.access?.pricePts ?? episode?.pricePts ?? 0) > 0;
  const robots = isMatureReader
    ? buildNoIndexRobots({ follow: false })
    : isPaidEpisode
      ? buildNoIndexRobots({ follow: true })
      : buildIndexRobots({ follow: true });

  return createPageMetadata({
    title: `${episodeTitle} | ${seriesTitle}`,
    description,
    path: `/read/${seriesId}/${episodeId}`,
    image: series?.coverUrl || null,
    openGraphType: "article",
    robots,
  });
}

export default async function Page({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = String(resolvedParams?.seriesId || "").trim();
  const episodeId = String(resolvedParams?.episodeId || "").trim();
  if (
    shouldBlockDemoContentInProduction() &&
    (isBlockedPublicSeriesIdentifier(seriesId) ||
      isBlockedPublicSeriesIdentifier(episodeId))
  ) {
    notFound();
  }
  if (isBlockedPublicSeriesRecord({ id: seriesId })) {
    notFound();
  }
  const includeAdult = await isServerAdultModeEnabled();
  const { series, episode, episodes, state } = await loadReaderSeoPayload(
    seriesId,
    episodeId,
    {
      includeAdult,
    },
  );
  const isModeBlocked = state === "adult-gated" || state === "mode-mismatch";
  const isRecoverableShellState = isModeBlocked || state === "unavailable";
  if (
    !isRecoverableShellState &&
    !validateReaderPayload(seriesId, episodeId, { series, episode, episodes })
  ) {
    logSeriesInvariant("Reader route payload failed validation", {
      seriesId,
      episodeId,
      hasSeries: Boolean(series),
      hasEpisode: Boolean(episode),
      episodeListCount: Array.isArray(episodes) ? episodes.length : -1,
    });
    notFound();
  }
  const currentIndex = episodes.findIndex(
    (item) => String(item?.id || "").trim() === episodeId,
  );
  const previousEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;

  const defaultEpisodeLabel = formatInstallmentLabel(
    series?.type || episode?.type,
    episode?.number,
  );
  const episodeTitle =
    episode &&
    !isDefaultInstallmentTitle(episode?.title, series?.type || episode)
      ? String(episode.title || "").trim()
      : defaultEpisodeLabel;

  const buildEpisodeTitle = (item) => {
    if (!item) {
      return "";
    }

    return isDefaultInstallmentTitle(item?.title, series?.type || item)
      ? formatInstallmentLabel(series?.type || item, item?.number)
      : String(item?.title || "").trim() ||
          formatInstallmentLabel(series?.type || item, item?.number);
  };

  const fallbackData = {
    seriesId,
    episodeId,
    seriesTitle: String(series?.title || "").trim() || "Reader",
    episodeTitle:
      episodeTitle ||
      `Loading ${getInstallmentLabel(series?.type || episode).toLowerCase()}`,
    backToSeriesHref: seriesId ? `/series/${seriesId}` : "/",
    previousEpisode:
      previousEpisode && previousEpisode?.id
        ? {
            href: `/read/${seriesId}/${previousEpisode.id}`,
            label: buildEpisodeTitle(previousEpisode),
          }
        : null,
    nextEpisode:
      nextEpisode && nextEpisode?.id
        ? {
            href: `/read/${seriesId}/${nextEpisode.id}`,
            label: buildEpisodeTitle(nextEpisode),
          }
        : null,
  };

  const initialReaderPayload = {
    state,
    series:
      series && !isModeBlocked
        ? {
            series,
            episodes,
          }
        : null,
    episode: episode && !isModeBlocked ? episode : null,
  };

  return (
    <ReaderPageShell
      seriesId={seriesId}
      episodeId={episodeId}
      fallbackData={fallbackData}
      initialReaderPayload={initialReaderPayload}
    />
  );
}
