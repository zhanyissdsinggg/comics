"use client";

import React, { useState, useCallback } from "react";

/**
 * 老王注释：分享按钮组件
 * 功能：支持分享到多个社交媒体平台
 * 遵循KISS原则：简洁的弹窗设计
 * 遵循DRY原则：统一的分享逻辑
 */
const ShareButton = React.memo(({ url, title, description, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // 老王注释：分享平台配置
  const platforms = [
    {
      id: "facebook",
      name: "Facebook",
      icon: "📘",
      color: "bg-blue-600 hover:bg-blue-700",
      getUrl: (url, title) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      id: "twitter",
      name: "Twitter",
      icon: "🐦",
      color: "bg-sky-500 hover:bg-sky-600",
      getUrl: (url, title) =>
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      id: "reddit",
      name: "Reddit",
      icon: "🤖",
      color: "bg-orange-600 hover:bg-orange-700",
      getUrl: (url, title) =>
        `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: "💬",
      color: "bg-green-600 hover:bg-green-700",
      getUrl: (url, title) =>
        `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: "✈️",
      color: "bg-blue-500 hover:bg-blue-600",
      getUrl: (url, title) =>
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
  ];

  // 老王注释：打开分享弹窗
  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  // 老王注释：关闭分享弹窗
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCopied(false);
  }, []);

  // 老王注释：分享到社交媒体
  const handleShare = useCallback(
    (platform) => {
      const shareUrl = platform.getUrl(url, title);
      window.open(shareUrl, "_blank", "width=600,height=400");
    },
    [url, title]
  );

  // 老王注释：复制链接
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("艹，复制链接失败:", error);
    }
  }, [url]);

  // 老王注释：使用Web Share API（移动端）
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: url,
        });
      } catch (error) {
        // 老王注释：用户取消分享，不需要报错
        if (error.name !== "AbortError") {
          console.error("艹，分享失败:", error);
        }
      }
    } else {
      handleOpen();
    }
  }, [title, description, url, handleOpen]);

  return (
    <>
      {/* 老王注释：分享按钮 */}
      <button
        onClick={handleNativeShare}
        className={`flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 ${className}`}
        aria-label="Share"
      >
        <span>🔗</span>
        <span>Share</span>
      </button>

      {/* 老王注释：分享弹窗 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 老王注释：标题 */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Share</h3>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* 老王注释：分享平台 */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform)}
                  className={`flex flex-col items-center gap-2 rounded-xl p-4 text-white transition-all ${platform.color}`}
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              ))}
            </div>

            {/* 老王注释：复制链接 */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <p className="mb-2 text-xs font-medium text-neutral-400">
                Or copy link
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  readOnly
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {copied ? "✓ Copied" : "Copy"}
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
