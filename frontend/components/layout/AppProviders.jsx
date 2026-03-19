"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../common/ErrorBoundary";
import ThemeProvider from "../common/ThemeProvider";
import { AuthProvider } from "../../store/useAuthStore";
import { WalletProvider } from "../../store/useWalletStore";
import { AdultGateProvider } from "../../store/useAdultGateStore";
import { ProgressProvider } from "../../store/useProgressStore";
import { FollowProvider } from "../../store/useFollowStore";
import { NotificationsProvider } from "../../store/useNotificationsStore";
import { BehaviorProvider } from "../../store/useBehaviorStore";
import { BrandingProvider, useBrandingStore } from "../../store/useBrandingStore";
import { RegionProvider } from "../../store/useRegionStore";
import { HistoryProvider } from "../../store/useHistoryStore";
import { ToastProvider } from "../common/ToastContext";
import ToastContainer from "../common/ToastContainer";
import { ApiBootGuard } from "../common/ApiBootGuard";
import AuthRequiredModal from "../common/AuthRequiredModal";
import PWAInstallPrompt from "../common/PWAInstallPrompt";
import { useAuthOpenListener } from "../../hooks/useAuthOpenListener";
import OfflineNotice from "../common/OfflineNotice";
import TrackingInjector from "../tracking/TrackingInjector";

const GlobalErrorToast = dynamic(() => import("../common/GlobalErrorToast"), {
  ssr: false,
});
const BackendMetaBadge = dynamic(() => import("../common/BackendMetaBadge"), {
  ssr: false,
});
const PerfMonitorBadge = dynamic(() => import("../common/PerfMonitorBadge"), {
  ssr: false,
});
const SiteFooter = dynamic(() => import("./SiteFooter"));

const FULL_FOOTER_PATHS = [];

function matchesPath(pathname, prefix) {
  if (!pathname || !prefix) {
    return false;
  }

  if (prefix === "/") {
    return pathname === "/";
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

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
  const isHomeRoute = pathname === "/";
  const shouldShowFooter = !isAdminRoute && !isReaderRoute && !isHomeRoute;
  const useFullFooter = FULL_FOOTER_PATHS.some((prefix) => matchesPath(pathname, prefix));
  const footerTone = shouldShowFooter ? "light" : "default";
  const footerVariant = useFullFooter ? "full" : "compact";

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
                      <ProgressProvider>
                        <FollowProvider>
                          <NotificationsProvider>
                            <BehaviorProvider>
                              <HistoryProvider>
                                {children}
                                {shouldShowFooter ? <SiteFooter tone={footerTone} variant={footerVariant} pathname={pathname || ""} /> : null}
                                <PWAInstallPrompt />
                              </HistoryProvider>
                            </BehaviorProvider>
                          </NotificationsProvider>
                        </FollowProvider>
                      </ProgressProvider>
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
