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

  useEffect(() => {
    if (isAdminRoute) {
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
  }, [isAdminRoute]);

  const handleAccept = () => {

    localStorage.setItem("cookie_consent", "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShowBanner(false);
  };

  if (isAdminRoute || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="relative rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl p-6 md:p-8">
          <button
            onClick={handleDecline}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-400" />
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Cookie size={32} className="text-amber-400" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-white">
                We use cookies
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                We use cookies and similar technologies to enhance your browsing experience,
                personalize content and ads, provide social media features, and analyze our traffic.
                By clicking &quot;Accept All&quot;, you consent to our use of cookies.{" "}
                <Link
                  href="/privacy-policy"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Learn more
                </Link>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleDecline}
                className="px-6 py-2.5 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white transition-all duration-200 text-sm font-medium whitespace-nowrap"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-200 text-sm font-medium whitespace-nowrap shadow-lg shadow-emerald-500/20"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

