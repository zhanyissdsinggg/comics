import { BookmarkProvider } from "../../store/useBookmarkStore";
import { WalletProvider } from "../../store/useWalletStore";
import FigmaAccountPage from "../../components/figma/FigmaAccountPage";
import { createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Library",
  description: "Your saved series, reading history, and continue reading list.",
  path: "/library",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function Page() {
  const includeAdult = await isServerAdultModeEnabled();
  const payload = await loadSeriesCatalogSeoPayload({ includeAdult });

  return (
    <WalletProvider>
      <BookmarkProvider>
        <FigmaAccountPage seriesList={payload?.series || []} />
      </BookmarkProvider>
    </WalletProvider>
  );
}
