"use client";

import ReaderV2 from "../../../../components/storefront/ReaderV2";
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
  initialReaderPayload,
}) {
  return (
    <WalletProvider>
      <RewardsProvider>
        <EntitlementProvider>
          <CouponProvider>
            <ReaderSettingsProvider>
              <BookmarkProvider>
                <ReaderV2
                  seriesId={seriesId}
                  episodeId={episodeId}
                  fallbackData={fallbackData}
                  initialReaderPayload={initialReaderPayload}
                />
              </BookmarkProvider>
            </ReaderSettingsProvider>
          </CouponProvider>
        </EntitlementProvider>
      </RewardsProvider>
    </WalletProvider>
  );
}
