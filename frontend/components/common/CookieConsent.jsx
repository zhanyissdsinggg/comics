/**
 * Cookie Consent Banner Component
 * Shows the banner on public routes only.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie, X } from "lucide-react";
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
  const isAdminRoute = pathname?.startsWith("/admin");
  const isReaderRoute = pathname?.startsWith("/read");
  const isHomeRoute = pathname === "/";
  const useDocumentNavigation = shouldUseDocumentNavigation(
    pathname,
    "/privacy-policy",
  );

  useEffect(() => {
    if (isAdminRoute || isReaderRoute) {
      setShowBanner(false);
      return;
    }

    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const timer = setTimeout(
        () => {
          setShowBanner(true);
        },
        isHomeRoute ? 4000 : 1200,
      );
      return () => clearTimeout(timer);
    }
  }, [isAdminRoute, isHomeRoute, isReaderRoute]);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShowBanner(false);
  };

  if (isAdminRoute || isReaderRoute || !showBanner) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--gush-mobile-bottom-nav-height)+0.45rem+env(safe-area-inset-bottom,0px))] z-30 md:inset-x-auto md:bottom-5 md:right-5">
      <div className="pointer-events-auto mx-auto max-w-md">
        <div className="relative overflow-hidden border-[3px] border-black bg-white p-3 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] sm:p-5 sm:shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),transparent_32%)]" />
          <button
            onClick={handleDecline}
            className="absolute right-2 top-2 z-10 border-[2px] border-black bg-white p-1.5 text-black/55 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe7ec] hover:text-black hover:shadow-none sm:right-3 sm:top-3 sm:border-[3px] sm:p-2"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="relative flex items-start gap-3 pr-8 sm:gap-4">
            <div className="mt-0.5 flex-shrink-0">
              <div className="rounded-2xl border-[3px] border-black bg-[#ffe500] p-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:p-3 sm:shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                <Cookie size={18} className="text-black sm:size-5" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/55">
                Privacy
              </p>
              <h3 className="font-display text-base font-black uppercase tracking-[-0.04em] text-black sm:text-lg">
                Cookies
              </h3>
              <p className="text-xs font-semibold leading-5 text-black/68 sm:text-sm sm:font-normal sm:leading-6">
                Cookies keep sign-in and reading progress working.{" "}
                {useDocumentNavigation ? (
                  <a
                    href="/privacy-policy"
                    onClick={(event) => {
                      event.preventDefault();
                      navigateWithDocument("/privacy-policy");
                    }}
                    className="font-semibold text-black underline decoration-black/25 underline-offset-4 transition hover:text-[#ff007a]"
                  >
                    Policy
                  </a>
                ) : (
                  <Link
                    href="/privacy-policy"
                    className="font-semibold text-black underline decoration-black/25 underline-offset-4 transition hover:text-[#ff007a]"
                  >
                    Policy
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
      </div>
    </div>
  );
}
