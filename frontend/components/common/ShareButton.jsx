"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Link2, Share2, X } from "lucide-react";
import {
  storefrontBadgeClass,
  storefrontInputClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "./StorefrontPagePrimitives";

const TRACKING_PARAM_KEYS = new Set([
  "entry",
  "entrypoint",
  "campaignid",
  "sourcepath",
  "seriesid",
  "episodeid",
  "sourceseriesid",
  "sourceepisodeid",
  "returnto",
  "promotionid",
  "offerid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
]);

function sanitizeShareUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return "";
  }

  try {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.gushcomics.com";
    const parsed = new URL(value, base);

    Array.from(parsed.searchParams.keys()).forEach((key) => {
      if (TRACKING_PARAM_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    });

    if (
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin
    ) {
      const query = parsed.searchParams.toString();
      return `${parsed.pathname}${query ? `?${query}` : ""}${parsed.hash || ""}`;
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

const ShareButton = React.memo(function ShareButton({
  url,
  title,
  description,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareableUrl = useMemo(() => sanitizeShareUrl(url), [url]);
  const buttonClassName = className
    ? `inline-flex items-center gap-2 ${className}`
    : `inline-flex min-h-[44px] items-center gap-2 ${storefrontSecondaryButtonClass}`;

  const platforms = useMemo(
    () => [
      {
        id: "facebook",
        name: "Facebook",
        icon: "FB",
        badgeClass:
          "border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] text-[#2563eb]",
        getUrl: (shareUrl) =>
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      },
      {
        id: "twitter",
        name: "X",
        icon: "X",
        badgeClass: "border-black bg-[#FFE500] text-black",
        getUrl: (shareUrl, shareTitle) =>
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      },
      {
        id: "reddit",
        name: "Reddit",
        icon: "RD",
        badgeClass:
          "border-[rgba(234,88,12,0.16)] bg-[rgba(234,88,12,0.08)] text-[#ea580c]",
        getUrl: (shareUrl, shareTitle) =>
          `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
      },
      {
        id: "whatsapp",
        name: "WhatsApp",
        icon: "WA",
        badgeClass:
          "border-[rgba(22,163,74,0.16)] bg-[rgba(22,163,74,0.08)] text-[#16a34a]",
        getUrl: (shareUrl, shareTitle) =>
          `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`,
      },
      {
        id: "telegram",
        name: "Telegram",
        icon: "TG",
        badgeClass:
          "border-[rgba(8,145,178,0.16)] bg-[rgba(8,145,178,0.08)] text-[#0891b2]",
        getUrl: (shareUrl, shareTitle) =>
          `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      },
    ],
    [],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCopied(false);
  }, []);

  const handleShare = useCallback(
    (platform) => {
      const shareUrl = platform.getUrl(shareableUrl, title);
      window.open(
        shareUrl,
        "_blank",
        "noopener,noreferrer,width=600,height=480",
      );
      handleClose();
    },
    [handleClose, shareableUrl, title],
  );

  const handleCopyLink = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  }, [shareableUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url: shareableUrl });
        return;
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to share:", error);
        }
      }
    }
    setIsOpen(true);
  }, [description, shareableUrl, title]);

  return (
    <>
      <button
        type="button"
        onClick={handleNativeShare}
        className={buttonClassName}
        aria-label="Share"
      >
        <Share2 size={16} />
        <span>Share</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-t-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,33,0.98)_0%,rgba(12,12,21,0.96)_100%)] text-white shadow-[0_28px_68px_rgba(8,6,20,0.42)] backdrop-blur-[26px] sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute left-5 top-5 h-14 w-14 rounded-full bg-cyan-300/18 blur-[42px]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,79,154,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_28%)] opacity-90" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,transparent_46%)]" />

            <div className="relative border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex justify-center pb-2 sm:hidden">
                <div className="h-1.5 w-12 rounded-full bg-white/14" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={storefrontBadgeClass}>
                    Share
                  </p>
                  <h3 className="mt-3 font-display text-[2rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-[2.2rem]">
                    Send this title
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    Pass the link around without dragging tracking noise with it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/12 bg-white/6 p-2 text-white/74 shadow-[0_14px_30px_rgba(8,6,20,0.24)] transition-all duration-150 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 sm:p-6">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleShare(platform)}
                  className={`flex flex-col items-center gap-2 rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.025)_100%)] p-4 text-white shadow-[0_18px_34px_rgba(8,6,20,0.24)] transition-all duration-150 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.035)_100%)]`}
                >
                  <span
                    className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border px-2 text-xs font-semibold ${platform.badgeClass}`}
                  >
                    {platform.icon}
                  </span>
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              ))}
            </div>

            <div
              className={`relative m-5 mt-0 rounded-[24px] border-white/10 p-4 sm:m-6 sm:mt-0 ${storefrontSoftCardClass}`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/60">
                <Link2 size={14} />
                <span>Copy link</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={shareableUrl}
                  readOnly
                  className={`flex-1 ${storefrontInputClass}`}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`min-h-[44px] px-4 text-sm ${
                    copied
                      ? storefrontSecondaryButtonClass
                      : storefrontPrimaryButtonClass
                  }`}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-xs leading-6 text-white/46">
                Shared links keep the route clean and drop campaign params.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ShareButton.displayName = "ShareButton";

export default ShareButton;
