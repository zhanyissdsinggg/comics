"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Link2, Share2, X } from "lucide-react";

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
      typeof window !== "undefined" ? window.location.origin : "https://www.gushcomics.com";
    const parsed = new URL(value, base);

    Array.from(parsed.searchParams.keys()).forEach((key) => {
      if (TRACKING_PARAM_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    });

    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
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
    : "inline-flex items-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-black/18 hover:bg-black/[0.03]";

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
        badgeClass: "border-black bg-white text-black",
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="inline-flex rounded-full border border-black/10 bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  Share
                </p>
                <h3 className="mt-3 text-3xl font-black leading-none tracking-[-0.06em] text-black">
                  Send this title
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-black/10 bg-white p-2 text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-black/16 hover:bg-black/[0.03]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            </div>

            <div className="relative grid grid-cols-3 gap-3 p-5">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleShare(platform)}
                  className="flex flex-col items-center gap-2 rounded-[22px] border border-black/10 bg-white p-4 text-black shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition hover:border-black/16 hover:bg-black/[0.02]"
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

            <div className="relative m-5 mt-0 rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                <Link2 size={14} />
                <span>Copy link</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareableUrl}
                  readOnly
                  className="flex-1 rounded-[18px] border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold tracking-[0.02em] transition-colors ${
                    copied
                      ? "border-emerald-200/80 bg-[linear-gradient(180deg,#f4fff8_0%,#ecfdf3_100%)] text-emerald-700"
                      : "border-black bg-black text-white hover:bg-black/90"
                  }`}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ShareButton.displayName = "ShareButton";

export default ShareButton;
