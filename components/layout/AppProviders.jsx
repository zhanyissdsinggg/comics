"use client";

import { AuthProvider } from "../../store/useAuthStore";
import { WalletProvider } from "../../store/useWalletStore";
import { AdultGateProvider } from "../../store/useAdultGateStore";
import { HomeProvider } from "../../store/useHomeStore";
import { EntitlementProvider } from "../../store/useEntitlementStore";
import { ProgressProvider } from "../../store/useProgressStore";
import { RewardsProvider } from "../../store/useRewardsStore";
import { FollowProvider } from "../../store/useFollowStore";
import { NotificationsProvider } from "../../store/useNotificationsStore";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <WalletProvider>
        <AdultGateProvider>
          <RewardsProvider>
            <EntitlementProvider>
              <ProgressProvider>
                <HomeProvider>
                  <FollowProvider>
                    <NotificationsProvider>{children}</NotificationsProvider>
                  </FollowProvider>
                </HomeProvider>
              </ProgressProvider>
            </EntitlementProvider>
          </RewardsProvider>
        </AdultGateProvider>
      </WalletProvider>
    </AuthProvider>
  );
}
