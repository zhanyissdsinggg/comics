/**
 * Portrait card: calmer storefront card shared by home, search, and creator pages.
 */
import { memo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Cover from "../common/Cover";
import { cn } from "@/lib/utils";
import {
  getCoverCardMeta,
  normalizeGenreList,
} from "../../lib/coverPresentation";

function isModifiedEvent(event) {
  return Boolean(
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0,
  );
}

function PortraitCard({
  item,
  tone,
  onClick,
  density = "default",
  href = "",
  showActionLabel = true,
  actionLabel = "Series",
  coverFallbackVariant = "default",
  interactionMode = "link",
}) {
  const metaLine = item.subtitle || item.eyebrow || "";
  const progressPercent = Number(item.progressPercent || 0);
  const progressWidth = Math.max(
    0,
    Math.min(
      progressPercent <= 1 ? progressPercent * 100 : progressPercent,
      100,
    ),
  );
  const isCompact = density === "compact";
  const resolvedHref =
    href || (item?.id ? `/series/${encodeURIComponent(item.id)}` : "");
  const coverMeta = getCoverCardMeta(item);
  const hasItemGenres = Array.isArray(item?.genres)
    ? item.genres.length > 0
    : typeof item?.genres === "string" && item.genres.trim();
  const rawGenreData = hasItemGenres ? item.genres : coverMeta.genres;
  const genrePills = normalizeGenreList(rawGenreData);
  const visibleGenrePills = genrePills.slice(0, isCompact ? 1 : 2);
  const showGenrePills = visibleGenrePills.length > 0;
  const rawDetailCopy =
    item.statusLabel || item.metaLabel || coverMeta.detailText || "";
  const normalizedMetaLine = String(metaLine || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const normalizedDetailCopy =
    typeof rawDetailCopy === "string"
      ? String(rawDetailCopy || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase()
      : "";
  const normalizedBadgeLabel = String(coverMeta.badgeLabel || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const detailText =
    typeof rawDetailCopy === "string"
      ? normalizedDetailCopy &&
        normalizedDetailCopy !== normalizedMetaLine &&
        normalizedDetailCopy !== normalizedBadgeLabel
        ? rawDetailCopy
        : ""
      : rawDetailCopy;

  const handleClick = (event) => {
    if (typeof onClick !== "function") {
      return;
    }

    if (interactionMode === "link" && isModifiedEvent(event)) {
      return;
    }

    if (interactionMode === "link") {
      event.preventDefault();
    }
    onClick(event);
  };

  const cardContent = (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 group-hover:-translate-y-1",
        "rounded-[28px] border border-black/10 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)] group-hover:border-black/14 group-hover:bg-[#fcfcfd] group-hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]",
      )}
    >
      <div className={cn("p-2", isCompact ? "pb-1.5" : "pb-2")}>
        <div
          className={cn(
            "relative aspect-[3/4] overflow-hidden",
            "bg-[#f6f7f9]",
          )}
        >
          <Cover
            tone={tone || item.coverTone}
            coverUrl={item.coverUrl}
            label={item.title}
            eyebrow={metaLine}
            badge={item.badge}
            genres={item.genres}
            seriesType={item.seriesType || item.type}
            fallbackVariant={coverFallbackVariant}
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/44 via-black/10 to-transparent"
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_24%)]"
          />
          <div
            className={cn(
              "absolute inset-[1px]",
              "border border-white/40",
            )}
          />

          {typeof item.progressPercent === "number" &&
          item.progressPercent > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
              <div
                className="h-full bg-[var(--gush-accent,#3157d6)]"
                style={{ width: `${Math.round(progressWidth)}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          isCompact ? "space-y-2.5 px-4 pb-4 pt-2" : "space-y-3 px-4 pb-4 pt-2",
        )}
      >
        <div className="space-y-2">
          {metaLine ? (
            <p
              className={cn(
                "line-clamp-1 font-semibold uppercase tracking-[0.2em] transition-colors",
                isCompact ? "text-[10px]" : "text-[11px]",
                "text-black/45 group-hover:text-black/60",
              )}
            >
              {metaLine}
            </p>
          ) : null}
            <p
              className={cn(
                "line-clamp-2 font-black tracking-[-0.04em] transition-colors",
                isCompact
                  ? "text-[1.08rem] leading-5"
                  : "text-[1.12rem] leading-6",
              "text-black group-hover:text-black",
            )}
          >
            {item.title}
          </p>
        </div>

        {showGenrePills ? (
          <div className="flex flex-wrap gap-2">
            {visibleGenrePills.map((genre) => (
              <span
                key={`${item?.id || item?.title || "series"}-${genre}`}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-full border font-medium",
                  isCompact
                    ? "px-2.5 py-1 text-[10px]"
                    : "px-3 py-1 text-[11px]",
                  "border-black/10 bg-[#f6f7f9] text-black/60",
                )}
              >
                {genre}
              </span>
            ))}
          </div>
        ) : null}

        {detailText ? (
          <p
            className={cn(
              "line-clamp-1 transition-colors",
              isCompact ? "text-[0.82rem] leading-5" : "text-sm leading-6",
              "text-black/60 group-hover:text-black/72",
            )}
          >
            {detailText}
          </p>
        ) : null}

        <div
          className={cn(
            "flex items-center border-t border-black/8 pt-3",
            typeof item.progressPercent === "number" && item.progressPercent > 0
              ? "justify-between"
              : showActionLabel
                ? "justify-between"
                : "justify-end",
          )}
        >
          {typeof item.progressPercent === "number" &&
          item.progressPercent > 0 ? (
            <p
              className={cn(
                "text-[11px] font-medium",
                "text-black/45",
              )}
            >
              {Math.round(progressWidth)}% read
            </p>
          ) : showActionLabel ? (
            <span
              className={cn(
                isCompact ? "text-[10px]" : "text-[11px]",
                "font-medium uppercase tracking-[0.16em]",
                "text-black/45",
              )}
            >
              {actionLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 group-hover:translate-x-1",
              "border border-black/10 bg-[#f6f7f9] text-black/70 shadow-[0_10px_20px_rgba(15,23,42,0.06)] group-hover:bg-white",
            )}
          >
            <ArrowRight className="size-4" />
          </span>
        </div>
        <div className="sr-only">Series</div>
      </div>
    </div>
  );

  if (interactionMode === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="group relative block w-full text-left"
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label={item?.title ? `Series ${item.title}` : "Series"}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href={resolvedHref || "#"}
      onClick={handleClick}
      className="group relative block w-full text-left"
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-label={item?.title ? `Series ${item.title}` : "Series"}
    >
      {cardContent}
    </Link>
  );
}

export default memo(PortraitCard);
