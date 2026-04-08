"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Link2, Share2, X } from "lucide-react";

const ShareButton = React.memo(function ShareButton({
  url,
  title,
  description,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonClassName = className
    ? `inline-flex items-center gap-2 ${className}`
    : "inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/88 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:border-black/12 hover:bg-white hover:text-slate-950";

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
        badgeClass: "border-black/10 bg-[rgba(15,23,42,0.06)] text-slate-700",
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
      const shareUrl = platform.getUrl(url, title);
      window.open(
        shareUrl,
        "_blank",
        "noopener,noreferrer,width=600,height=480",
      );
      handleClose();
    },
    [handleClose, title, url],
  );

  const handleCopyLink = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  }, [url]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to share:", error);
        }
      }
    }
    setIsOpen(true);
  }, [description, title, url]);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.28)] p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Share
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  Send this title
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Copy the link or open a sharing app without leaving the page
                  feeling noisy.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-black/8 p-2 text-slate-500 transition-colors hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleShare(platform)}
                  className="flex flex-col items-center gap-2 rounded-[20px] border border-black/8 bg-white/92 p-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
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

            <div className="rounded-[22px] border border-black/6 bg-white/84 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link2 size={14} />
                <span>Copy link</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  readOnly
                  className="flex-1 rounded-xl border border-black/8 bg-[#f8f9fc] px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--gush-accent,#0071e3)]"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    copied
                      ? "bg-[var(--gush-accent,#0071e3)] text-white"
                      : "bg-slate-950 text-white hover:bg-slate-800"
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
