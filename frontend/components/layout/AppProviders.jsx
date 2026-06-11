"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../common/ErrorBoundary";
import ThemeProvider from "../common/ThemeProvider";
import { AuthProvider } from "../../store/useAuthStore";
import { AdultGateProvider } from "../../store/useAdultGateStore";
import { BookmarkProvider } from "../../store/useBookmarkStore";
import { CouponProvider } from "../../store/useCouponStore";
import { EntitlementProvider } from "../../store/useEntitlementStore";
import { ProgressProvider } from "../../store/useProgressStore";
import { FollowProvider } from "../../store/useFollowStore";
import { NotificationsProvider } from "../../store/useNotificationsStore";
import { RewardsProvider } from "../../store/useRewardsStore";
import { WalletProvider } from "../../store/useWalletStore";
import { BehaviorProvider } from "../../store/useBehaviorStore";
import {
  BrandingProvider,
  useBrandingStore,
} from "../../store/useBrandingStore";
import { RegionProvider } from "../../store/useRegionStore";
import { HistoryProvider } from "../../store/useHistoryStore";
import { ToastProvider } from "../common/ToastContext";
import { useAuthOpenListener } from "../../hooks/useAuthOpenListener";
import AppShell from "./AppShell";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
import { InteractiveAvailabilityProvider } from "../../lib/interactiveAvailability";

const GlobalErrorToast = dynamic(() => import("../common/GlobalErrorToast"), {
  ssr: false,
});
const BackendMetaBadge = dynamic(() => import("../common/BackendMetaBadge"), {
  ssr: false,
});
const PerfMonitorBadge = dynamic(() => import("../common/PerfMonitorBadge"), {
  ssr: false,
});
const ToastContainer = dynamic(() => import("../common/ToastContainer"), {
  ssr: false,
});
const AuthRequiredModal = dynamic(() => import("../common/AuthRequiredModal"), {
  ssr: false,
});
const PWAInstallPrompt = dynamic(() => import("../common/PWAInstallPrompt"), {
  ssr: false,
});
const OfflineNotice = dynamic(() => import("../common/OfflineNotice"), {
  ssr: false,
});
const TrackingInjector = dynamic(() => import("../tracking/TrackingInjector"), {
  ssr: false,
});
const PageViewTracker = dynamic(() => import("../tracking/PageViewTracker"), {
  ssr: false,
});

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

export default function AppProviders({
  children,
  initialAdultState = null,
  initialShowInteractiveNav = true,
}) {
  useAuthOpenListener();

  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isReaderRoute = pathname?.startsWith("/read");
  const isStandaloneAuthActionRoute =
    pathname === "/auth/reset" || pathname?.startsWith("/auth/reset/");
  // PublicHeader stays off immersive and standalone account-action routes.
  const shouldShowPublicHeader =
    !isAdminRoute && !isReaderRoute && !isStandaloneAuthActionRoute;
  const shouldShowPublicFooter = !isAdminRoute && !isStandaloneAuthActionRoute;

  return (
    <ErrorBoundary
      name="AppRoot"
      title="Application Error"
      message="Something went wrong. Reload the page."
    >
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AdultGateProvider initialAdultState={initialAdultState}>
              <BrandingProvider>
                <RegionProvider>
                  <OfflineNotice />
                  <GlobalErrorToast />
                  <BackendMetaBadge />
                  <PerfMonitorBadge />
                  <TrackingInjector />
                  <PageViewTracker />
                  <BrandingHeadSync />
                  <ToastContainer />
                  {!isAdminRoute ? <AuthRequiredModal /> : null}
                  <InteractiveAvailabilityProvider
                    initialShowInteractiveNav={initialShowInteractiveNav}
                  >
                    <ProgressProvider>
                      <WalletProvider>
                        <RewardsProvider>
                          <EntitlementProvider>
                            <CouponProvider>
                              <BookmarkProvider>
                                <FollowProvider>
                                  <NotificationsProvider>
                                    <BehaviorProvider>
                                      <HistoryProvider>
                                        <AppShell
                                          header={
                                            shouldShowPublicHeader ? (
                                              <PublicHeader
                                                initialShowInteractiveNav={initialShowInteractiveNav}
                                              />
                                            ) : null
                                          }
                                          footer={
                                            shouldShowPublicFooter ? (
                                              <PublicFooter
                                                initialShowInteractiveNav={initialShowInteractiveNav}
                                              />
                                            ) : null
                                          }
                                        >
                                          {children}
                                        </AppShell>
                                        <PWAInstallPrompt />
                                      </HistoryProvider>
                                    </BehaviorProvider>
                                  </NotificationsProvider>
                                </FollowProvider>
                              </BookmarkProvider>
                            </CouponProvider>
                          </EntitlementProvider>
                        </RewardsProvider>
                      </WalletProvider>
                    </ProgressProvider>
                  </InteractiveAvailabilityProvider>
                </RegionProvider>
              </BrandingProvider>
            </AdultGateProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
