import { BookmarkProvider } from "../../../../store/useBookmarkStore";
import { CouponProvider } from "../../../../store/useCouponStore";
import { EntitlementProvider } from "../../../../store/useEntitlementStore";
import { ReaderSettingsProvider } from "../../../../store/useReaderSettingsStore";
import { RewardsProvider } from "../../../../store/useRewardsStore";
import { WalletProvider } from "../../../../store/useWalletStore";
import { resolveSeriesCreatorName } from "../../../../lib/creatorIdentity";
import { createPageMetadata } from "../../../../lib/seo";
import { siteConfig } from "../../../../lib/siteConfig";
import { loadReaderSeoPayload } from "../../../../lib/storefrontSeo";
import ReaderPageShell from "./ReaderPageShell";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = String(resolvedParams?.seriesId || "").trim();
  const episodeId = String(resolvedParams?.episodeId || "").trim();
  const { series, episode } = await loadReaderSeoPayload(seriesId, episodeId);

  if (!series || !episode) {
    return createPageMetadata({
      title: "Read Episode",
      description: `Continue reading episodes on ${siteConfig.siteName}.`,
      path: `/read/${seriesId}/${episodeId}`,
      robots: {
        index: false,
        follow: true,
      },
    });
  }

  const seriesTitle = String(series?.title || "").trim() || "Series";
  const episodeTitle = String(episode?.title || "").trim() || `Episode ${episodeId}`;
  const creatorName = resolveSeriesCreatorName(series);
  const description = [
    `Read ${episodeTitle} from ${seriesTitle} on ${siteConfig.siteName}.`,
    creatorName ? `By ${creatorName}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPageMetadata({
    title: `${episodeTitle} · ${seriesTitle}`,
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

export default function Page({ params }) {
  return (
    <WalletProvider>
      <RewardsProvider>
        <EntitlementProvider>
          <CouponProvider>
            <ReaderSettingsProvider>
              <BookmarkProvider>
                <ReaderPageShell seriesId={params.seriesId} episodeId={params.episodeId} />
              </BookmarkProvider>
            </ReaderSettingsProvider>
          </CouponProvider>
        </EntitlementProvider>
      </RewardsProvider>
    </WalletProvider>
  );
}
