import { useState } from "react";
import Image from "next/image";
import { normalizeLegacyImageUrl } from "../../lib/normalizeLegacyImageUrl";
import { readLegacyPlaceholderText } from "../../lib/fallbackImage";
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
    return readLegacyPlaceholderText(parsed.toString());
  } catch {
    return "";
  }
}

function labelsMatch(left, right) {
  return (
    String(left || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase() ===
    String(right || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
}

function buildCoverAltText(label, seriesType = "") {
  const normalizedLabel = String(label || "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedType = String(seriesType || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (normalizedLabel) {
    if (normalizedType === "comic" || normalizedType === "novel") {
      return `${normalizedType.charAt(0).toUpperCase()}${normalizedType.slice(1)} cover image for ${normalizedLabel}`;
    }

    return `Cover image for ${normalizedLabel}`;
  }

  if (normalizedType === "comic" || normalizedType === "novel") {
    return `${normalizedType.charAt(0).toUpperCase()}${normalizedType.slice(1)} cover image`;
  }

  return "Series cover image";
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
  fallbackVariant = "default",
  ariaLabel = "Series cover image",
  decorative = false,
}) {
  const isMinimalCard = fallbackVariant === "minimal-card";
  const title = label
    .replace(/\bEp\s*\d+\b/gi, "")
    .replace(/\bP\s*\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const chipLabel = String(badge || eyebrow || "Gush").trim() || "Gush";
  const artDirection = getCoverArtDirection({
    tone,
    genres,
    seriesType,
    badge,
    eyebrow,
  });
  const shouldShowKicker =
    Boolean(artDirection.kicker) &&
    ![
      artDirection.typeLabel,
      artDirection.primaryGenre,
      artDirection.badgeLabel,
      artDirection.secondaryGenre,
    ].some((value) => labelsMatch(value, artDirection.kicker));
  const shouldShowTypeLabel =
    Boolean(artDirection.typeLabel) && !artDirection.primaryGenre;
  const shouldShowSecondaryGenre =
    Boolean(artDirection.secondaryGenre) &&
    ![
      title,
      artDirection.typeLabel,
      artDirection.primaryGenre,
      artDirection.badgeLabel,
    ].some((value) => labelsMatch(value, artDirection.secondaryGenre));
  const minimalChipLabel = artDirection.badgeLabel || "";

  return (
    <div
      className={`relative overflow-hidden ${className}`.trim()}
      style={{ background: artDirection.background, ...style }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? "true" : undefined}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.16) 0%, transparent 24%), radial-gradient(circle at 82% 18%, ${artDirection.accentSoft} 0%, transparent 26%), linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.52) 100%)`,
        }}
      />
      <div
        className="absolute inset-3 rounded-[22px] border"
        style={{ borderColor: artDirection.border }}
      />
      {isMinimalCard ? (
        <div className="absolute left-4 top-4">
          {minimalChipLabel ? (
            <span className="inline-flex whitespace-nowrap rounded-full border border-white/14 bg-[rgba(15,13,19,0.76)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              {minimalChipLabel}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="absolute left-3 right-4 top-3 flex flex-wrap items-start gap-2">
          {artDirection.badgeLabel ? (
            <span className="order-1 ml-auto inline-flex shrink-0 whitespace-nowrap rounded-full border border-white/14 bg-[rgba(15,13,19,0.76)] py-1 pl-2.5 pr-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              {artDirection.badgeLabel}
            </span>
          ) : null}
          <div className="order-2 flex w-full flex-wrap gap-2">
            {shouldShowTypeLabel ? (
              <span className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                {artDirection.typeLabel}
              </span>
            ) : null}
            {artDirection.primaryGenre ? (
              <span className="rounded-full border border-[rgba(255,79,154,0.2)] bg-[rgba(255,79,154,0.14)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                {artDirection.primaryGenre}
              </span>
            ) : null}
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 top-[25%] flex justify-center">
        <div
          className="relative h-28 w-40 rounded-[28px] border bg-black/10 shadow-[0_18px_36px_rgba(0,0,0,0.24)] backdrop-blur-[2px]"
          style={{ borderColor: artDirection.border }}
        />
        <div
          className="absolute mt-6 h-20 w-20 rounded-full border bg-[rgba(7,10,21,0.82)] blur-[0.5px]"
          style={{ borderColor: artDirection.border }}
        />
      </div>
      {isMinimalCard ? (
        <div
          className="absolute inset-x-4 bottom-4 h-16 rounded-[22px] border backdrop-blur-[3px]"
          style={{
            borderColor: artDirection.border,
            background: `linear-gradient(180deg, rgba(8, 12, 18, 0.08) 0%, ${artDirection.panel} 100%)`,
          }}
        />
      ) : (
        <div className="absolute inset-x-4 bottom-4">
          <div
            className="rounded-[24px] border px-4 py-4 backdrop-blur-[3px]"
            style={{
              borderColor: artDirection.border,
              background: `linear-gradient(180deg, rgba(8, 12, 18, 0.12) 0%, ${artDirection.panel} 100%)`,
            }}
          >
            {shouldShowKicker ? (
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">
                <span
                  className="h-1.5 w-1.5"
                  style={{ backgroundColor: artDirection.accent }}
                />
                <span>{artDirection.kicker}</span>
              </div>
            ) : null}
            {title ? (
              <p
                className={`${shouldShowKicker ? "mt-2" : ""} line-clamp-3 text-lg font-semibold leading-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.42)]`.trim()}
              >
                {title}
              </p>
            ) : (
              <p
                className={`${shouldShowKicker ? "mt-2" : ""} text-sm font-semibold uppercase tracking-[0.18em] text-white/80`.trim()}
              >
                {chipLabel}
              </p>
            )}
            {shouldShowSecondaryGenre ? (
              <p className="mt-3 text-[11px] font-medium leading-5 text-white/70">
                {artDirection.secondaryGenre}
              </p>
            ) : null}
          </div>
        </div>
      )}
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
  fallbackVariant = "default",
  sizes = "(max-width: 768px) 160px, 240px",
  decorative = false,
  altText: customAltText = "",
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = normalizeLegacyImageUrl(coverUrl);
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
  const altText =
    String(customAltText || "").trim() ||
    buildCoverAltText(fallbackLabel, seriesType);

  if (placeholdLabel || usesMockFallback) {
    return (
      <CoverFallback
        label={fallbackLabel}
        eyebrow={eyebrow}
        badge={badge}
        tone={tone}
        genres={genres}
        seriesType={seriesType}
        fallbackVariant={fallbackVariant}
        className={className}
        style={style}
        ariaLabel={altText}
        decorative={decorative}
      />
    );
  }

  if (resolvedUrl) {
    return (
      <div
        className={`relative overflow-hidden ${className}`.trim()}
        style={style}
      >
        {isLoading && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: getCoverArtDirection({
                tone,
                genres,
                seriesType,
                badge,
                eyebrow,
              }).background,
            }}
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
            fallbackVariant={fallbackVariant}
            className="absolute inset-0"
            ariaLabel={altText}
            decorative={decorative}
          />
        ) : (
          <>
            <Image
              src={resolvedUrl}
              alt={decorative ? "" : altText}
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
            <div
              className="pointer-events-none absolute inset-0"
              style={overlayStyle}
            />
            <div className="pointer-events-none absolute inset-0 border border-black/20" />
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
      fallbackVariant={fallbackVariant}
      className={`cover ${className}`.trim()}
      style={style}
      ariaLabel={altText}
      decorative={decorative}
    />
  );
}
