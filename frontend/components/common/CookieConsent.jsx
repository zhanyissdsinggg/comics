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
        <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 text-black shadow-[0_20px_46px_rgba(15,23,42,0.12)] sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),transparent_32%)]" />
          <button
            onClick={handleDecline}
            className="absolute right-2 top-2 z-10 rounded-full border border-black/10 bg-white p-1.5 text-black/45 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)] active:translate-y-px sm:right-3 sm:top-3 sm:p-2"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="relative flex items-start gap-3 pr-8 sm:gap-4">
            <div className="mt-0.5 flex-shrink-0">
              <div className="rounded-2xl border border-black/10 bg-[#f6f7f9] p-2 shadow-[0_12px_26px_rgba(15,23,42,0.08)] sm:p-3">
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
                    className="font-semibold text-black underline decoration-black/20 underline-offset-4 transition hover:text-black/70"
                  >
                    Policy
                  </a>
                ) : (
                  <Link
                    href="/privacy-policy"
                    className="font-semibold text-black underline decoration-black/20 underline-offset-4 transition hover:text-black/70"
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
