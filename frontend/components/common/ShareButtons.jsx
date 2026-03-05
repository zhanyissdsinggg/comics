/**
 * 老王的社交分享组件 - 让用户能分享到Twitter/Facebook/Reddit
 * 欧美用户超级喜欢分享好东西
 */
"use client";

import { Share2, Twitter, Facebook, Link2 } from "lucide-react";
import { useState, useCallback } from "react";

export default function ShareButtons({ title, url, description }) {
  const [copied, setCopied] = useState(false);

  // 老王优化：使用useCallback避免重复创建函数
  const shareOnTwitter = useCallback(() => {
    const text = `${title} - ${description || "Check this out!"}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  }, [title, url, description]);

  const shareOnFacebook = useCallback(() => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  }, [url]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [url]);

  const shareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (err) {
        // 老王注释：用户取消分享不算错误，静默处理
        if (err.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    }
  }, [title, description, url]);

  return (
    <div className="flex items-center gap-2">
      {/* Twitter分享 */}
      <button
        type="button"
        onClick={shareOnTwitter}
        className="p-2 rounded-lg bg-gray-800/50 hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-200 group"
        aria-label="Share on Twitter"
        title="Share on Twitter"
      >
        <Twitter size={18} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Facebook分享 */}
      <button
        type="button"
        onClick={shareOnFacebook}
        className="p-2 rounded-lg bg-gray-800/50 hover:bg-blue-600/20 hover:text-blue-500 transition-all duration-200 group"
        aria-label="Share on Facebook"
        title="Share on Facebook"
      >
        <Facebook size={18} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* 复制链接 */}
      <button
        type="button"
        onClick={copyLink}
        className="p-2 rounded-lg bg-gray-800/50 hover:bg-green-500/20 hover:text-green-400 transition-all duration-200 group relative"
        aria-label="Copy link"
        title={copied ? "Copied!" : "Copy link"}
      >
        <Link2 size={18} className="group-hover:scale-110 transition-transform" />
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Copied!
          </span>
        )}
      </button>

      {/* 原生分享（移动端） */}
      {typeof navigator !== "undefined" && navigator.share && (
        <button
          type="button"
          onClick={shareNative}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-purple-500/20 hover:text-purple-400 transition-all duration-200 group"
          aria-label="Share"
          title="Share"
        >
          <Share2 size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
}
