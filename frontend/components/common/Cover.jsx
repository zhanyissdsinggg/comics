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

function readPlaceholdLabel(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "placehold.co") {
      return "";
    }

    return String(parsed.searchParams.get("text") || "")
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function isMockCoverUrl(url) {
  const value = String(url || "").trim();
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value, "https://gush.local");
    return parsed.pathname.includes("/mock-covers/");
  } catch {
    return value.includes("/mock-covers/");
  }
}

function buildFallbackInitials(label) {
  const tokens = String(label || "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "GS";
  }

  return tokens.map((token) => token[0]?.toUpperCase() || "").join("").slice(0, 2);
}

function CoverFallback({
  background,
  label = "",
  eyebrow = "",
  badge = "",
  className = "",
  style = {},
}) {
  const title = label
    .replace(/\bEp\s*\d+\b/gi, "")
    .replace(/\bP\s*\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const chipLabel = String(badge || eyebrow || "Gush").trim() || "Gush";
  const initials = buildFallbackInitials(title || chipLabel);

  return (
    <div
      className={`relative overflow-hidden ${className}`.trim()}
      style={{ background, ...style }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(255,255,255,0.12),transparent_22%),linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.46)_100%)]" />
      <div className="absolute -right-10 top-5 h-28 w-28 rounded-full border border-white/10 bg-white/5" />
      <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
        {chipLabel}
      </div>
      <div className="absolute inset-x-0 top-[28%] flex justify-center">
        <div className="rounded-[28px] border border-white/12 bg-black/15 px-5 py-3 text-[2.75rem] font-semibold tracking-[0.18em] text-white/18 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-[1px]">
          {initials}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="h-px w-12 bg-white/35" />
        {title ? (
          <p className="mt-3 max-w-[12ch] text-lg font-semibold leading-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.42)]">
            {title}
          </p>
        ) : (
          <>
            {eyebrow ? (
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
                {eyebrow}
              </p>
            ) : null}
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
              Gush series
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Cover({
  tone = "default",
  coverUrl,
  className = "",
  style = {},
  label = "",
  eyebrow = "",
  badge = "",
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const background = toneMap[tone] || toneMap.default;
  const resolvedUrl = normalizePlaceholdImageUrl(coverUrl);
  const placeholdLabel = readPlaceholdLabel(coverUrl);
  const usesMockFallback = isMockCoverUrl(coverUrl);
  const fallbackLabel = String(label || placeholdLabel || "").trim();

  if (placeholdLabel || usesMockFallback) {
    return (
      <CoverFallback
        background={background}
        label={fallbackLabel}
        eyebrow={eyebrow}
        badge={badge}
        className={className}
        style={style}
      />
    );
  }

  if (resolvedUrl) {
    return (
      <div
        className={`relative ${className}`.trim()}
        style={style}
        aria-hidden="true"
      >
        {isLoading && (
          <div
            className="absolute inset-0 animate-pulse bg-neutral-800"
            style={{ background }}
          />
        )}
        {hasError ? (
          <CoverFallback
            background={background}
            label={fallbackLabel}
            eyebrow={eyebrow}
            badge={badge}
            className="absolute inset-0"
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
    <CoverFallback
      background={background}
      label={fallbackLabel}
      eyebrow={eyebrow}
      badge={badge}
      className={`cover ${className}`.trim()}
      style={style}
    />
  );
}
