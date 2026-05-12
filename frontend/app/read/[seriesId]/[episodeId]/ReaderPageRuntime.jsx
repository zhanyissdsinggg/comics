"use client";

import FigmaReaderPage from "../../../../components/figma/FigmaReaderPage";
import { BookmarkProvider } from "../../../../store/useBookmarkStore";
import { CouponProvider } from "../../../../store/useCouponStore";
import { EntitlementProvider } from "../../../../store/useEntitlementStore";
import { ReaderSettingsProvider } from "../../../../store/useReaderSettingsStore";
import { RewardsProvider } from "../../../../store/useRewardsStore";
import { WalletProvider } from "../../../../store/useWalletStore";

export default function ReaderPageRuntime({
  seriesId,
  episodeId,
  fallbackData,
}) {
  return (
    <WalletProvider>
      <RewardsProvider>
        <EntitlementProvider>
          <CouponProvider>
            <ReaderSettingsProvider>
              <BookmarkProvider>
                <FigmaReaderPage
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
