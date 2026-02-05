"use client";

import { useEffect } from "react";
import { AuthProvider } from "../../store/useAuthStore";
import { WalletProvider } from "../../store/useWalletStore";
import { AdultGateProvider } from "../../store/useAdultGateStore";
import { HomeProvider } from "../../store/useHomeStore";
import { EntitlementProvider } from "../../store/useEntitlementStore";
import { ProgressProvider } from "../../store/useProgressStore";
import { RewardsProvider } from "../../store/useRewardsStore";
import { FollowProvider } from "../../store/useFollowStore";
import { NotificationsProvider } from "../../store/useNotificationsStore";
import { BehaviorProvider } from "../../store/useBehaviorStore";
import { CouponProvider } from "../../store/useCouponStore";
import { ReaderSettingsProvider } from "../../store/useReaderSettingsStore";
import { BookmarkProvider } from "../../store/useBookmarkStore";
import { BrandingProvider, useBrandingStore } from "../../store/useBrandingStore";
import { RegionProvider } from "../../store/useRegionStore";
import { HistoryProvider } from "../../store/useHistoryStore";
import BackendHealthBanner from "../common/BackendHealthBanner";
import { ApiBootGuard } from "../common/ApiBootGuard";
import GlobalErrorToast from "../common/GlobalErrorToast";
import BackendMetaBadge from "../common/BackendMetaBadge";
import AuthRequiredModal from "../common/AuthRequiredModal";
import PWAInstallPrompt from "../common/PWAInstallPrompt";
import { usePathname } from "next/navigation";
import { useAuthOpenListener } from "../../hooks/useAuthOpenListener";
import OfflineNotice from "../common/OfflineNotice";
import PerfMonitorBadge from "../common/PerfMonitorBadge";
import TrackingInjector from "../tracking/TrackingInjector";
import SiteFooter from "./SiteFooter";
import BottomTabNav from "./BottomTabNav";

function BrandingHeadSync() {
  const { branding } = useBrandingStore();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const faviconUrl = branding?.faviconUrl || "";
    if (!faviconUrl) {
      return;
    }
    const ensureLink = (rel) => {
      let link = document.querySelector(`link[rel=\"${rel}\"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", faviconUrl);
    };
    ensureLink("icon");
    ensureLink("apple-touch-icon");
  }, [branding?.faviconUrl]);

  return null;
}

export default function AppProviders({ children }) {
  useAuthOpenListener();
  const pathname = usePathname();
  const showAuthModal = !pathname?.startsWith("/admin");
  return (
    <AuthProvider>
      <WalletProvider>
        <AdultGateProvider>
          <BrandingProvider>
            <RegionProvider>
            <BackendHealthBanner />
            <OfflineNotice />
            <GlobalErrorToast />
            <BackendMetaBadge />
            <PerfMonitorBadge />
            <TrackingInjector />
            <BrandingHeadSync />
            {/* 老王注释：禁用全局登录弹窗，让用户自由浏览 */}
            {/* {showAuthModal ? <AuthRequiredModal /> : null} */}
            <ApiBootGuard>
              <RewardsProvider>
                <EntitlementProvider>
                  <ProgressProvider>
                    <HomeProvider>
                      <FollowProvider>
                        <NotificationsProvider>
                          <CouponProvider>
                            <BehaviorProvider>
                              <ReaderSettingsProvider>
                                <HistoryProvider>
                                  <BookmarkProvider>
                                    {children}
                                    <SiteFooter />
                                    <BottomTabNav />
                                    <PWAInstallPrompt />
                                  </BookmarkProvider>
                                </HistoryProvider>
                              </ReaderSettingsProvider>
                            </BehaviorProvider>
                          </CouponProvider>
                        </NotificationsProvider>
                      </FollowProvider>
                    </HomeProvider>
                  </ProgressProvider>
                </EntitlementProvider>
              </RewardsProvider>
            </ApiBootGuard>
            </RegionProvider>
          </BrandingProvider>
        </AdultGateProvider>
      </WalletProvider>
    </AuthProvider>
  );
}
