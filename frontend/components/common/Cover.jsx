import { useState } from "react";
import Image from "next/image";
import { normalizePlaceholdImageUrl } from "../../lib/normalizePlaceholdImageUrl";
import {
  getCoverArtDirection,
  getCoverOverlayStyle,
  isLikelyPlaceholderCover,
} from "../../lib/coverPresentation";

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
  label = "",
  eyebrow = "",
  badge = "",
  tone = "default",
  genres = [],
  seriesType = "",
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
  const artDirection = getCoverArtDirection({
    tone,
    genres,
    seriesType,
    badge,
    eyebrow,
  });

  return (
    <div
      className={`relative overflow-hidden ${className}`.trim()}
      style={{ background: artDirection.background, ...style }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.16) 0%, transparent 24%), radial-gradient(circle at 82% 18%, ${artDirection.accentSoft} 0%, transparent 26%), linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.36) 100%)`,
        }}
      />
      <div className="absolute inset-3 rounded-[24px] border" style={{ borderColor: artDirection.border }} />
      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
        <div className="flex max-w-[70%] flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/82">
            {artDirection.typeLabel}
          </span>
          {artDirection.primaryGenre ? (
            <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">
              {artDirection.primaryGenre}
            </span>
          ) : null}
        </div>
        {artDirection.badgeLabel ? (
          <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/82">
            {artDirection.badgeLabel}
          </span>
        ) : null}
      </div>
      <div className="absolute inset-x-0 top-[26%] flex justify-center">
        <div
          className="rounded-[28px] border bg-black/14 px-5 py-3 text-[2.75rem] font-semibold tracking-[0.2em] text-white/16 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur-[2px]"
          style={{ borderColor: artDirection.border }}
        >
          {initials}
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-4">
        <div
          className="rounded-[24px] border px-4 py-4 backdrop-blur-[3px]"
          style={{
            borderColor: artDirection.border,
            background: `linear-gradient(180deg, rgba(8, 12, 18, 0.12) 0%, ${artDirection.panel} 100%)`,
          }}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/76">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: artDirection.accent }}
            />
            <span>{artDirection.kicker}</span>
          </div>
          {title ? (
            <p className="mt-2 line-clamp-3 text-lg font-semibold leading-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.42)]">
              {title}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/82">
              {chipLabel}
            </p>
          )}
          <p className="mt-3 text-[11px] font-medium leading-5 text-white/74">
            {artDirection.secondaryGenre}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Cover({
  tone = "default",
  coverUrl,
  genres = [],
  seriesType = "",
  className = "",
  style = {},
  label = "",
  eyebrow = "",
  badge = "",
  sizes = "(max-width: 768px) 160px, 240px",
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = normalizePlaceholdImageUrl(coverUrl);
  const placeholdLabel = readPlaceholdLabel(coverUrl);
  const usesMockFallback = isLikelyPlaceholderCover(coverUrl);
  const fallbackLabel = String(label || placeholdLabel || "").trim();
  const overlayStyle = getCoverOverlayStyle({
    tone,
    genres,
    seriesType,
    badge,
    eyebrow,
  });

  if (placeholdLabel || usesMockFallback) {
    return (
      <CoverFallback
        label={fallbackLabel}
        eyebrow={eyebrow}
        badge={badge}
        tone={tone}
        genres={genres}
        seriesType={seriesType}
        className={className}
        style={style}
      />
    );
  }

  if (resolvedUrl) {
    return (
      <div
        className={`relative overflow-hidden ${className}`.trim()}
        style={style}
        aria-hidden="true"
      >
        {isLoading && (
          <div
            className="absolute inset-0 animate-pulse bg-neutral-800"
            style={{ background: getCoverArtDirection({ tone, genres, seriesType, badge, eyebrow }).background }}
          />
        )}
        {hasError ? (
          <CoverFallback
            label={fallbackLabel}
            eyebrow={eyebrow}
            badge={badge}
            tone={tone}
            genres={genres}
            seriesType={seriesType}
            className="absolute inset-0"
          />
        ) : (
          <>
            <Image
              src={resolvedUrl}
              alt=""
              fill
              sizes={sizes}
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
            <div className="pointer-events-none absolute inset-0" style={overlayStyle} />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/6" />
          </>
        )}
      </div>
    );
  }

  return (
    <CoverFallback
      label={fallbackLabel}
      eyebrow={eyebrow}
      badge={badge}
      tone={tone}
      genres={genres}
      seriesType={seriesType}
      className={`cover ${className}`.trim()}
      style={style}
    />
  );
}
