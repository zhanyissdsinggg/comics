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
        <div className="relative rounded-[28px] border border-[color:var(--gush-border)] bg-white p-5 text-slate-800 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <button
            onClick={handleDecline}
            className="absolute right-3 top-3 rounded-full border border-[color:var(--gush-border)] bg-white p-2 text-slate-400 transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-900"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="mt-0.5 flex-shrink-0">
              <div className="rounded-2xl border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <Cookie size={20} className="text-[var(--gush-accent)]" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)]">
                Privacy
              </p>
              <h3 className="text-base font-semibold text-slate-900">
                Cookies
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                We use cookies for sign-in, reading progress, and basic
                preferences.{" "}
                {useDocumentNavigation ? (
                  <a
                    href="/privacy-policy"
                    onClick={(event) => {
                      event.preventDefault();
                      navigateWithDocument("/privacy-policy");
                    }}
                    className="font-semibold text-[var(--gush-accent)] underline-offset-4 transition hover:text-[var(--gush-accent-strong)] hover:underline"
                  >
                    Policy
                  </a>
                ) : (
                  <Link
                    href="/privacy-policy"
                    className="font-semibold text-[var(--gush-accent)] underline-offset-4 transition hover:text-[var(--gush-accent-strong)] hover:underline"
                  >
                    Policy
                  </Link>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={handleDecline}
              className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-900"
            >
              Not now
            </button>
            <button
              onClick={handleAccept}
              className="rounded-full bg-[color:var(--gush-ink-strong)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition hover:bg-black/82"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
