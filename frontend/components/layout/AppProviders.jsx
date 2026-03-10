"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../common/ErrorBoundary";
import ThemeProvider from "../common/ThemeProvider";
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
import { ToastProvider } from "../common/ToastContext";
import ToastContainer from "../common/ToastContainer";
import { ApiBootGuard } from "../common/ApiBootGuard";
import GlobalErrorToast from "../common/GlobalErrorToast";
import BackendMetaBadge from "../common/BackendMetaBadge";
import AuthRequiredModal from "../common/AuthRequiredModal";
import PWAInstallPrompt from "../common/PWAInstallPrompt";
import { useAuthOpenListener } from "../../hooks/useAuthOpenListener";
import OfflineNotice from "../common/OfflineNotice";
import PerfMonitorBadge from "../common/PerfMonitorBadge";
import TrackingInjector from "../tracking/TrackingInjector";
import SiteFooter from "./SiteFooter";

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
      let link = document.querySelector(`link[rel="${rel}"]`);
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
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <ErrorBoundary
      name="AppRoot"
      title="Application Error"
      message="Something went wrong with the application. Please reload the page."
    >
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WalletProvider>
              <AdultGateProvider>
                <BrandingProvider>
                  <RegionProvider>
                    <OfflineNotice />
                    <GlobalErrorToast />
                    <BackendMetaBadge />
                    <PerfMonitorBadge />
                    <TrackingInjector />
                    <BrandingHeadSync />
                    <ToastContainer />
                    {!isAdminRoute ? <AuthRequiredModal /> : null}
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
                                            {!isAdminRoute ? <SiteFooter /> : null}
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
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
