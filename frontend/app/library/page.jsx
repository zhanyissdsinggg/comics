import LibraryPage from "../../components/library/LibraryPage";
import { BookmarkProvider } from "../../store/useBookmarkStore";
import { RewardsProvider } from "../../store/useRewardsStore";
import { createPageMetadata } from "../../lib/seo";
import { cookies } from "next/headers";
import { WalletProvider } from "../../store/useWalletStore";
import { hasServerSessionCookie } from "../../lib/serverAdultGate";

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
  const cookieStore = await cookies();
  const initialSignedIn =
    cookieStore.get("mn_is_signed_in")?.value === "1" ||
    hasServerSessionCookie(cookieStore);

  return (
    <WalletProvider>
      <RewardsProvider>
        <BookmarkProvider>
          <LibraryPage initialSignedIn={initialSignedIn} />
        </BookmarkProvider>
      </RewardsProvider>
    </WalletProvider>
  );
}
