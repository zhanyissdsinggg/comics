import LibraryPage from "../../components/library/LibraryPage";
import { BookmarkProvider } from "../../store/useBookmarkStore";
import { RewardsProvider } from "../../store/useRewardsStore";

export const metadata = {
  title: "Library",
  description: "Your library and continue reading list.",
};

export default function Page() {
  return (
    <RewardsProvider>
      <BookmarkProvider>
        <LibraryPage />
      </BookmarkProvider>
    </RewardsProvider>
  );
}
