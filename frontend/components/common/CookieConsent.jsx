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
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--gush-mobile-bottom-nav-height)+0.85rem+env(safe-area-inset-bottom,0px))] z-30 md:inset-x-auto md:bottom-5 md:right-5">
      <div className="pointer-events-auto mx-auto max-w-md">
        <div className="relative rounded-[28px] border border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.92)] p-5 text-slate-800 shadow-[0_20px_48px_rgba(15,23,42,0.1)] backdrop-blur-2xl dark:border-white/10 dark:bg-[rgba(18,18,21,0.9)]">
          <button
            onClick={handleDecline}
            className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition-colors hover:bg-black/[0.04] hover:text-slate-900 dark:text-neutral-500 dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="mt-0.5 flex-shrink-0">
              <div className="rounded-2xl border border-[rgba(0,113,227,0.12)] bg-[rgba(0,113,227,0.08)] p-3 dark:border-[rgba(41,151,255,0.16)] dark:bg-[rgba(41,151,255,0.12)]">
                <Cookie size={20} className="text-[var(--gush-accent)]" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)]">
                Privacy
              </p>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Cookies
              </h3>
              <p className="text-sm leading-6 text-slate-600 dark:text-neutral-300">
                We use cookies to keep sign-in, reading progress, and basic
                preferences in place.{" "}
                {useDocumentNavigation ? (
                  <a
                    href="/privacy-policy"
                    onClick={(event) => {
                      event.preventDefault();
                      navigateWithDocument("/privacy-policy");
                    }}
                    className="font-semibold text-[var(--gush-accent)] underline-offset-4 transition hover:text-[var(--gush-accent-strong)] hover:underline"
                  >
                    Learn more
                  </a>
                ) : (
                  <Link
                    href="/privacy-policy"
                    className="font-semibold text-[var(--gush-accent)] underline-offset-4 transition hover:text-[var(--gush-accent-strong)] hover:underline"
                  >
                    Learn more
                  </Link>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={handleDecline}
              className="rounded-full border border-[color:var(--gush-border)] bg-white/72 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:border-white/16 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              Not now
            </button>
            <button
              onClick={handleAccept}
              className="rounded-full bg-[var(--gush-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--gush-accent-strong)]"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
