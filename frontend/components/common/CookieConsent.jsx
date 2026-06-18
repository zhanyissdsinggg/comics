/**
 * Cookie Consent Banner Component
 * Shows the banner on public routes only.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie, X } from "lucide-react";
import { isFigmaRoute } from "../../lib/figmaRoutes";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

export default function CookieConsent() {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const [showImmersiveCard, setShowImmersiveCard] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");
  const isReaderRoute = pathname?.startsWith("/read");
  const isHomeRoute = pathname === "/";
  const isImmersiveCategoryRoute = [
    "/comics",
    "/novels",
    "/interactive",
    "/rankings",
  ].some((route) => pathname?.startsWith(route));
  const useFigmaChrome = isFigmaRoute(pathname);
  const useDocumentNavigation = shouldUseDocumentNavigation(
    pathname,
    "/privacy-policy",
  );

  useEffect(() => {
    if (isAdminRoute || isReaderRoute || useFigmaChrome) {
      setShowBanner(false);
      return;
    }

    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const revealDelay = isHomeRoute
        ? 4000
        : isImmersiveCategoryRoute
          ? 7800
          : 1200;
      const timer = setTimeout(
        () => {
          setShowBanner(true);
          setShowImmersiveCard(false);
        },
        revealDelay,
      );
      return () => clearTimeout(timer);
    }
  }, [
    isAdminRoute,
    isHomeRoute,
    isImmersiveCategoryRoute,
    isReaderRoute,
    useFigmaChrome,
  ]);

  useEffect(() => {
    if (!showBanner) {
      setShowImmersiveCard(false);
    }
  }, [showBanner, pathname]);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShowBanner(false);
    setShowImmersiveCard(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShowBanner(false);
    setShowImmersiveCard(false);
  };

  if (isAdminRoute || isReaderRoute || useFigmaChrome || !showBanner)
    return null;

  const consentCard = (
    <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(24,20,33,0.97)_0%,rgba(14,12,20,0.98)_100%)] p-3 text-white shadow-[0_24px_64px_rgba(0,0,0,0.38)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.16),transparent_36%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.12),transparent_42%)]" />
      <button
        onClick={handleDecline}
        className={`absolute right-2 top-2 z-10 p-1.5 text-white/70 sm:right-3 sm:top-3 sm:p-2 ${storefrontSecondaryButtonClass}`}
        aria-label="Close"
      >
        <X size={16} />
      </button>

      <div className="relative flex items-start gap-3 pr-8 sm:gap-4">
        <div className="mt-0.5 flex-shrink-0">
          <div className="rounded-[20px] border border-[rgba(255,79,154,0.2)] bg-[rgba(255,79,154,0.12)] p-2 text-[var(--gush-accent)] shadow-[0_12px_28px_rgba(255,79,154,0.16)] sm:p-3">
            <Cookie size={18} className="sm:size-5" />
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/56">
            Privacy
          </p>
          <h3 className="font-display text-base font-semibold tracking-[-0.04em] text-white sm:text-lg">
            Cookie settings
          </h3>
          <p className="text-xs leading-5 text-white/74 sm:text-sm sm:leading-6">
            Cookies keep sign-in, reading progress, and a few site
            preferences working.{" "}
            {useDocumentNavigation ? (
              <a
                href="/privacy-policy"
                onClick={(event) => {
                  event.preventDefault();
                  navigateWithDocument("/privacy-policy");
                }}
                className="font-semibold text-white underline decoration-white/20 underline-offset-4 transition hover:text-white/85"
              >
                Privacy policy
              </a>
            ) : (
              <Link
                href="/privacy-policy"
                className="font-semibold text-white underline decoration-white/20 underline-offset-4 transition hover:text-white/85"
              >
                Privacy policy
              </Link>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-nowrap gap-2 sm:mt-4 sm:flex-wrap sm:gap-2.5">
        <button
          onClick={handleDecline}
          className={`${storefrontSecondaryButtonClass} min-w-0 flex-1 px-3 py-2 text-xs sm:flex-none sm:px-4 sm:py-2 sm:text-sm`}
        >
          Not now
        </button>
        <button
          onClick={handleAccept}
          className={`${storefrontPrimaryButtonClass} min-w-0 flex-1 px-3 py-2 text-xs sm:flex-none sm:px-4 sm:py-2 sm:text-sm`}
        >
          Allow
        </button>
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--gush-mobile-bottom-nav-height)+0.75rem+env(safe-area-inset-bottom,0px))] z-30 md:inset-x-auto md:bottom-5 md:right-5">
      <div className="pointer-events-auto mx-auto max-w-[22rem] sm:max-w-md">
        {isImmersiveCategoryRoute ? (
          <>
            <div className="md:hidden">
              {showImmersiveCard ? (
                consentCard
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowImmersiveCard(true)}
                    className="group inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(24,20,33,0.95)_0%,rgba(14,12,20,0.98)_100%)] text-left text-white shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:border-white/20 hover:bg-[rgba(22,18,31,0.98)]"
                    aria-label="Open cookie settings"
                    title="Privacy"
                  >
                    <span className="inline-flex size-7 items-center justify-center rounded-full border border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.12)] text-[var(--gush-accent)] shadow-[0_10px_24px_rgba(255,79,154,0.14)]">
                      <Cookie size={14} />
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className="hidden md:block">{consentCard}</div>
          </>
        ) : (
          consentCard
        )}
      </div>
    </div>
  );
}
