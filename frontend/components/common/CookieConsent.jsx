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
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-30 md:inset-x-auto md:bottom-4 md:right-4">
      <div className="pointer-events-auto mx-auto max-w-xl">
        <div className="relative rounded-[24px] border border-black/8 bg-[rgba(255,255,255,0.9)] p-5 text-slate-800 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <button
            onClick={handleDecline}
            className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition-colors hover:bg-black/[0.04] hover:text-slate-900"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="mt-0.5 flex-shrink-0">
              <div className="rounded-2xl border border-[rgba(134,98,69,0.14)] bg-[rgba(134,98,69,0.08)] p-3">
                <Cookie
                  size={22}
                  className="text-[var(--gush-accent,#866245)]"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-base font-semibold text-slate-900">
                Cookies
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                We use cookies to keep sign-in, reading progress, and basic
                preferences in place.{" "}
                {useDocumentNavigation ? (
                  <a
                    href="/privacy-policy"
                    onClick={(event) => {
                      event.preventDefault();
                      navigateWithDocument("/privacy-policy");
                    }}
                    className="font-semibold text-[var(--gush-accent,#866245)] underline-offset-4 transition hover:text-[var(--gush-accent-strong,#63472f)] hover:underline"
                  >
                    Learn more
                  </a>
                ) : (
                  <Link
                    href="/privacy-policy"
                    className="font-semibold text-[var(--gush-accent,#866245)] underline-offset-4 transition hover:text-[var(--gush-accent-strong,#63472f)] hover:underline"
                  >
                    Learn more
                  </Link>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleDecline}
              className="rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-white hover:text-slate-900"
            >
              Not now
            </button>
            <button
              onClick={handleAccept}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
