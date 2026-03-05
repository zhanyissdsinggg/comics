"use client";

import React, { useCallback, useMemo, useState } from "react";

const ShareButton = React.memo(function ShareButton({ url, title, description, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
        className={`flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 ${className}`}
        aria-label="Share"
      >
        <span>Share</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Share</h3>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                aria-label="Close"
              >
                X
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

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <p className="mb-2 text-xs font-medium text-neutral-400">Or copy link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  readOnly
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
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
