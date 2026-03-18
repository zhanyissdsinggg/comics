import LibraryPage from "../../components/library/LibraryPage";
import { BookmarkProvider } from "../../store/useBookmarkStore";
import { RewardsProvider } from "../../store/useRewardsStore";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Library",
  description: "Your saved series, reading history, and continue reading list.",
  path: "/library",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return (
    <RewardsProvider>
      <BookmarkProvider>
        <LibraryPage />
      </BookmarkProvider>
    </RewardsProvider>
  );
}
