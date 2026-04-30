import { BookmarkProvider } from "../../../../store/useBookmarkStore";
import { CouponProvider } from "../../../../store/useCouponStore";
import { EntitlementProvider } from "../../../../store/useEntitlementStore";
import { ReaderSettingsProvider } from "../../../../store/useReaderSettingsStore";
import { RewardsProvider } from "../../../../store/useRewardsStore";
import { WalletProvider } from "../../../../store/useWalletStore";
import { notFound } from "next/navigation";
import { resolveSeriesCreatorName } from "../../../../lib/creatorIdentity";
import {
  isBlockedPublicSeriesIdentifier,
  isBlockedPublicSeriesRecord,
  shouldBlockDemoContentInProduction,
} from "../../../../lib/publicCatalogVisibility";
import { createPageMetadata } from "../../../../lib/seo";
import {
  formatInstallmentLabel,
  getInstallmentLabel,
  isDefaultInstallmentTitle,
} from "../../../../lib/seriesFormatLabels";
import { siteConfig } from "../../../../lib/siteConfig";
import { loadReaderSeoPayload } from "../../../../lib/storefrontSeo";
import ReaderPageShell from "./ReaderPageShell";

export const revalidate = 300;

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
  const { series, episode } = await loadReaderSeoPayload(seriesId, episodeId);

  if (!series || !episode) {
    return createPageMetadata({
      title: "Read story",
      description: `Read stories on ${siteConfig.siteName}.`,
      path: `/read/${seriesId}/${episodeId}`,
      robots: {
        index: false,
        follow: true,
      },
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

  return createPageMetadata({
    title: `${episodeTitle} | ${seriesTitle}`,
    description,
    path: `/read/${seriesId}/${episodeId}`,
    image: series?.coverUrl || null,
    openGraphType: "article",
    robots: {
      index: false,
      follow: true,
    },
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
  const { series, episode, episodes } = await loadReaderSeoPayload(
    seriesId,
    episodeId,
  );
  if (!series || !episode) {
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
    episode && !isDefaultInstallmentTitle(episode?.title, series?.type || episode)
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

  return (
    <WalletProvider>
      <RewardsProvider>
        <EntitlementProvider>
          <CouponProvider>
            <ReaderSettingsProvider>
              <BookmarkProvider>
                <ReaderPageShell
                  seriesId={seriesId}
                  episodeId={episodeId}
                  fallbackData={fallbackData}
                />
              </BookmarkProvider>
            </ReaderSettingsProvider>
          </CouponProvider>
        </EntitlementProvider>
      </RewardsProvider>
    </WalletProvider>
  );
}
