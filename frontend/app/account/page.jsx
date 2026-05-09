import { BookmarkProvider } from "../../store/useBookmarkStore";
import { WalletProvider } from "../../store/useWalletStore";
import FigmaAccountPage from "../../components/figma/FigmaAccountPage";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Account",
  description: "Manage your account, plans, orders, and reading settings.",
  path: "/account",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function Page() {
  const payload = await loadSeriesCatalogSeoPayload({ includeAdult: false });

  return (
    <WalletProvider>
      <BookmarkProvider>
        <FigmaAccountPage seriesList={payload?.series || []} />
      </BookmarkProvider>
    </WalletProvider>
  );
}
