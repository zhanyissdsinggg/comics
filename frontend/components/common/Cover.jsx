import { useState } from "react";
import Image from "next/image";
import { normalizePlaceholdImageUrl } from "../../lib/normalizePlaceholdImageUrl";

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
  const resolvedUrl = normalizePlaceholdImageUrl(coverUrl);

  if (resolvedUrl) {
    return (
      <div className={`relative ${className}`.trim()} style={style} aria-hidden="true">
        {isLoading && (
          <div
            className="absolute inset-0 animate-pulse bg-neutral-800"
            style={{ background }}
          />
        )}
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

  return (
    <div
      className={`cover ${className}`.trim()}
      style={{ background, ...style }}
      aria-hidden="true"
    />
  );
}
