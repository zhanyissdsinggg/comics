import { BookmarkProvider } from "../../../../store/useBookmarkStore";
import { CouponProvider } from "../../../../store/useCouponStore";
import { EntitlementProvider } from "../../../../store/useEntitlementStore";
import { ReaderSettingsProvider } from "../../../../store/useReaderSettingsStore";
import { RewardsProvider } from "../../../../store/useRewardsStore";
import { WalletProvider } from "../../../../store/useWalletStore";
import ReaderPageShell from "./ReaderPageShell";

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
