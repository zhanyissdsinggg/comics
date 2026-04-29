"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../common/ErrorBoundary";
import ThemeProvider from "../common/ThemeProvider";
import { AuthProvider } from "../../store/useAuthStore";
import { AdultGateProvider } from "../../store/useAdultGateStore";
import { ProgressProvider } from "../../store/useProgressStore";
import { FollowProvider } from "../../store/useFollowStore";
import { NotificationsProvider } from "../../store/useNotificationsStore";
import { BehaviorProvider } from "../../store/useBehaviorStore";
import { BrandingProvider, useBrandingStore } from "../../store/useBrandingStore";
import { RegionProvider } from "../../store/useRegionStore";
import { HistoryProvider } from "../../store/useHistoryStore";
import { ToastProvider } from "../common/ToastContext";
import { useAuthOpenListener } from "../../hooks/useAuthOpenListener";

const GlobalErrorToast = dynamic(() => import("../common/GlobalErrorToast"), {
  ssr: false,
});
const BackendMetaBadge = dynamic(() => import("../common/BackendMetaBadge"), {
  ssr: false,
});
const PerfMonitorBadge = dynamic(() => import("../common/PerfMonitorBadge"), {
  ssr: false,
});
const PublicHeader = dynamic(() => import("./PublicHeader"));
const PublicFooter = dynamic(() => import("./PublicFooter"));
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
  const isReaderRoute = pathname?.startsWith("/read");
  const shouldShowPublicChrome = !isAdminRoute && !isReaderRoute;

  return (
    <ErrorBoundary
      name="AppRoot"
      title="Application Error"
      message="Something went wrong. Reload the page."
    >
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
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
                  <ProgressProvider>
                    <FollowProvider>
                      <NotificationsProvider>
                        <BehaviorProvider>
                          <HistoryProvider>
                            {shouldShowPublicChrome ? <PublicHeader /> : null}
                            {children}
                            {shouldShowPublicChrome ? <PublicFooter /> : null}
                            <PWAInstallPrompt />
                          </HistoryProvider>
                        </BehaviorProvider>
                      </NotificationsProvider>
                    </FollowProvider>
                  </ProgressProvider>
                </RegionProvider>
              </BrandingProvider>
            </AdultGateProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
