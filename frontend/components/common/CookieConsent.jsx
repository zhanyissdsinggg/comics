/**
 * Cookie Consent Banner Component
 * Shows the banner on public routes only.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie, X } from "lucide-react";

export default function CookieConsent() {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");
  const isReaderRoute = pathname?.startsWith("/read");

  useEffect(() => {
    if (isAdminRoute || isReaderRoute) {
      setShowBanner(false);
      return;
    }

    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdminRoute, isReaderRoute]);

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
    <div className="fixed inset-x-4 bottom-24 z-50 md:inset-x-auto md:bottom-4 md:right-4">
      <div className="mx-auto max-w-xl">
        <div className="relative rounded-[24px] border border-white/10 bg-neutral-950/94 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <button
            onClick={handleDecline}
            className="absolute right-3 top-3 rounded-full p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="mt-0.5 flex-shrink-0">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                <Cookie size={22} className="text-amber-300" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-base font-semibold text-white">We use cookies</h3>
              <p className="text-sm leading-6 text-neutral-300">
                We use cookies to keep sign-in, reading progress, and site analytics working smoothly.{" "}
                <Link
                  href="/privacy-policy"
                  className="font-semibold text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
                >
                  Learn more
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleDecline}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Not now
            </button>
            <button
              onClick={handleAccept}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
