"use client";

import React, { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

const ShareButton = React.memo(function ShareButton({ url, title, description, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonClassName = className
    ? `flex items-center gap-2 ${className}`
    : "flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700";

  const platforms = useMemo(
    () => [
      {
        id: "facebook",
        name: "Facebook",
        icon: "FB",
        color: "bg-blue-600 hover:bg-blue-700",
        getUrl: (shareUrl) =>
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      },
      {
        id: "twitter",
        name: "X",
        icon: "X",
        color: "bg-neutral-800 hover:bg-neutral-700",
        getUrl: (shareUrl, shareTitle) =>
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      },
      {
        id: "reddit",
        name: "Reddit",
        icon: "RD",
        color: "bg-orange-600 hover:bg-orange-700",
        getUrl: (shareUrl, shareTitle) =>
          `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
      },
      {
        id: "whatsapp",
        name: "WhatsApp",
        icon: "WA",
        color: "bg-green-600 hover:bg-green-700",
        getUrl: (shareUrl, shareTitle) =>
          `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`,
      },
      {
        id: "telegram",
        name: "Telegram",
        icon: "TG",
        color: "bg-cyan-600 hover:bg-cyan-700",
        getUrl: (shareUrl, shareTitle) =>
          `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      },
    ],
    []
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCopied(false);
  }, []);

  const handleShare = useCallback(
    (platform) => {
      const shareUrl = platform.getUrl(url, title);
      window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=480");
      handleClose();
    },
    [handleClose, title, url]
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
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Send this title</h3>
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
                  className={`flex flex-col items-center gap-2 rounded-xl p-4 text-white transition-all ${platform.color}`}
                >
                  <span className="text-sm font-semibold">{platform.icon}</span>
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              ))}
            </div>

            <div className="rounded-[22px] border border-black/6 bg-white/84 p-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Or copy link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  readOnly
                  className="flex-1 rounded-xl border border-black/8 bg-[#f8f9fc] px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--gush-accent,#2f6bff)]"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    copied
                      ? "bg-[var(--gush-accent,#2f6bff)] text-white"
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
