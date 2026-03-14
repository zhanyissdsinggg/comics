import ReaderPage from "../../../../components/reader/ReaderPage";
import { BookmarkProvider } from "../../../../store/useBookmarkStore";
import { CouponProvider } from "../../../../store/useCouponStore";
import { EntitlementProvider } from "../../../../store/useEntitlementStore";
import { ReaderSettingsProvider } from "../../../../store/useReaderSettingsStore";
import { RewardsProvider } from "../../../../store/useRewardsStore";

export default function Page({ params }) {
  return (
    <RewardsProvider>
      <EntitlementProvider>
        <CouponProvider>
          <ReaderSettingsProvider>
            <BookmarkProvider>
              <ReaderPage seriesId={params.seriesId} episodeId={params.episodeId} />
            </BookmarkProvider>
          </ReaderSettingsProvider>
        </CouponProvider>
      </EntitlementProvider>
    </RewardsProvider>
  );
}
