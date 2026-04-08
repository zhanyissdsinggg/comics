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
  appearance = "default",
  density = "default",
  href = "",
  showActionLabel = true,
  actionLabel = "View Series",
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
  const isLight = appearance === "light";
  const isCompact = density === "compact";
  const resolvedHref =
    href || (item?.id ? `/series/${encodeURIComponent(item.id)}` : "");
  const coverMeta = getCoverCardMeta(item);
  const hasItemGenres = Array.isArray(item?.genres)
    ? item.genres.length > 0
    : typeof item?.genres === "string" && item.genres.trim();
  const rawGenreData = hasItemGenres ? item.genres : coverMeta.genres;
  const genrePills = normalizeGenreList(rawGenreData);
  const showGenrePills = genrePills.length > 0;
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
        isCompact ? "rounded-[22px]" : "rounded-[26px]",
        isLight
          ? "border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(247,241,233,0.96))] shadow-[0_12px_28px_rgba(37,28,19,0.03)] group-hover:border-[color:var(--gush-border-strong)] group-hover:shadow-[0_16px_32px_rgba(37,28,19,0.05)]"
          : "border border-white/10 bg-[linear-gradient(180deg,rgba(16,21,31,0.88),rgba(8,11,18,0.98))] shadow-[0_20px_70px_rgba(0,0,0,0.2)] group-hover:border-white/20 group-hover:shadow-[0_26px_90px_rgba(0,0,0,0.28)]",
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
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
          className={cn(
            "absolute inset-0",
            isLight
              ? "bg-gradient-to-t from-black/38 via-black/6 to-transparent"
              : "bg-gradient-to-t from-black/85 via-black/18 to-transparent",
          )}
        />
        <div
          className={cn(
            "absolute inset-0",
            isLight
              ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_24%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_22%)]",
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

      <div
        className={cn(
          isCompact ? "space-y-2.5 px-3.5 py-3.5" : "space-y-3 px-4 py-4",
        )}
      >
        <div className="space-y-1.5">
          {showGenrePills ? (
            <div className="flex flex-wrap gap-2">
              {genrePills.map((genre) => (
                <span
                  key={`${item?.id || item?.title || "series"}-${genre}`}
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-full border font-medium",
                    isCompact
                      ? "px-2.5 py-1 text-[10px]"
                      : "px-3 py-1 text-[11px]",
                    isLight
                      ? "border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.62)] text-[color:var(--gush-ink-soft)]"
                      : "border-white/10 bg-white/[0.04] text-neutral-300",
                  )}
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : metaLine ? (
            <p
              className={cn(
                "line-clamp-1 font-semibold uppercase tracking-[0.2em] transition-colors",
                isCompact ? "text-[10px]" : "text-[11px]",
                isLight
                  ? "text-[color:var(--gush-ink-faint)] group-hover:text-[color:var(--gush-ink-soft)]"
                  : "text-neutral-500 group-hover:text-neutral-400",
              )}
            >
              {metaLine}
            </p>
          ) : null}
          <p
            className={cn(
              "line-clamp-2 font-semibold tracking-[-0.025em] transition-colors",
              isCompact
                ? "text-[0.99rem] leading-5"
                : "text-[1.04rem] leading-6",
              isLight
                ? "text-[color:var(--gush-ink-strong)] group-hover:text-[color:var(--gush-ink-strong)]"
                : "text-neutral-100 group-hover:text-white",
            )}
          >
            {item.title}
          </p>
        </div>

        {detailText ? (
          <p
            className={cn(
              "line-clamp-1 transition-colors",
              isCompact ? "text-[0.82rem] leading-5" : "text-sm leading-6",
              isLight
                ? "text-[color:var(--gush-ink-soft)] group-hover:text-[color:var(--gush-ink)]"
                : "text-neutral-400 group-hover:text-neutral-300",
            )}
          >
            {detailText}
          </p>
        ) : null}

        <div
          className={cn(
            "flex items-center pt-1",
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
                isLight
                  ? "text-[color:var(--gush-ink-faint)]"
                  : "text-neutral-500",
              )}
            >
              {Math.round(progressWidth)}% read
            </p>
          ) : showActionLabel ? (
            <span
              className={cn(
                isCompact ? "text-[10px]" : "text-[11px]",
                "font-medium uppercase tracking-[0.16em]",
                isLight
                  ? "text-[color:var(--gush-ink-faint)]"
                  : "text-neutral-500",
              )}
            >
              {actionLabel}
            </span>
          ) : null}
          <ArrowRight
            className={cn(
              "size-4 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1",
              isLight ? "text-[color:var(--gush-ink-faint)]" : "text-white",
            )}
          />
        </div>
        <div className="sr-only">View series details</div>
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
        aria-label={item?.title ? `Open ${item.title}` : "Open title"}
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
      aria-label={item?.title ? `Open ${item.title}` : "Open title"}
    >
      {cardContent}
    </Link>
  );
}

export default memo(PortraitCard);
