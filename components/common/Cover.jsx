/**
 * 老王注释：封面组件，支持渐进式加载和blur-up效果
 */
import { useState } from "react";
import Image from "next/image";

const toneMap = {
  warm: "linear-gradient(135deg, #ffb347 0%, #ff5f6d 100%)",
  cool: "linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%)",
  dusk: "linear-gradient(135deg, #614385 0%, #516395 100%)",
  neon: "linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)",
  noir: "linear-gradient(135deg, #434343 0%, #000000 100%)",
  default: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
};

export default function Cover({ tone = "default", coverUrl, className = "", style = {} }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const background = toneMap[tone] || toneMap.default;

  // 老王注释：如果有coverUrl，显示图片
  if (coverUrl) {
    return (
      <div className={`relative ${className}`.trim()} style={style} aria-hidden="true">
        {/* 老王注释：加载时的模糊背景 */}
        {isLoading && (
          <div
            className="absolute inset-0 animate-pulse bg-neutral-800"
            style={{ background }}
          />
        )}

        {/* 老王注释：图片加载失败时的fallback */}
        {hasError ? (
          <div
            className="absolute inset-0"
            style={{ background }}
          />
        ) : (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 160px, 240px"
            className={`object-cover transition-opacity duration-500 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            priority={false}
          />
        )}
      </div>
    );
  }

  // 老王注释：没有coverUrl时，显示渐变背景
  return (
    <div
      className={`cover ${className}`.trim()}
      style={{ background, ...style }}
      aria-hidden="true"
    />
  );
}
