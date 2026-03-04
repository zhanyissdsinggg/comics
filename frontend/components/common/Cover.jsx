/**
 * 鑰佺帇娉ㄩ噴锛氬皝闈㈢粍浠讹紝鏀寔娓愯繘寮忓姞杞藉拰blur-up鏁堟灉
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

/**
 * 鑰佺帇娉ㄩ噴锛氬皢 placehold.co 鐨?SVG URL 杞负 PNG 鏍煎紡
 * Next.js Image Optimization 涓嶆敮鎸?SVG锛宲lacehold.co 榛樿杩斿洖 SVG
 * 瑙ｅ喅鏂规锛氬湪 URL 鐨勮矾寰勯儴鍒嗗姞涓?.png 鎵╁睍鍚? * 渚嬶細https://placehold.co/400x600/ff0000/fff?text=Hello
 *  鈫?https://placehold.co/400x600/ff0000/fff.png?text=Hello
 */
function normalizeCoverUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "placehold.co" && !parsed.pathname.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
      parsed.pathname = parsed.pathname + ".png";
      return parsed.toString();
    }
  } catch {
    // 濡傛灉 URL 瑙ｆ瀽澶辫触锛岃繑鍥炲師濮?URL
  }
  return url;
}

export default function Cover({ tone = "default", coverUrl, className = "", style = {} }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const background = toneMap[tone] || toneMap.default;
  const resolvedUrl = normalizeCoverUrl(coverUrl);

  // 鑰佺帇娉ㄩ噴锛氬鏋滄湁coverUrl锛屾樉绀哄浘鐗?
  if (resolvedUrl) {
    return (
      <div className={`relative ${className}`.trim()} style={style} aria-hidden="true">
        {/* 鑰佺帇娉ㄩ噴锛氬姞杞芥椂鐨勬ā绯婅儗鏅?*/}
        {isLoading && (
          <div
            className="absolute inset-0 animate-pulse bg-neutral-800"
            style={{ background }}
          />
        )}

        {/* 鑰佺帇娉ㄩ噴锛氬浘鐗囧姞杞藉け璐ユ椂鐨刦allback */}
        {hasError ? (
          <div
            className="absolute inset-0"
            style={{ background }}
          />
        ) : (
          <Image
            src={resolvedUrl}
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

  // 鑰佺帇娉ㄩ噴锛氭病鏈塩overUrl鏃讹紝鏄剧ず娓愬彉鑳屾櫙
  return (
    <div
      className={`cover ${className}`.trim()}
      style={{ background, ...style }}
      aria-hidden="true"
    />
  );
}