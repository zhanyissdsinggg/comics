/**
 * Portrait card: calmer storefront card shared by home, search, and creator pages.
 */
import { memo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Cover from "../common/Cover";
import { cn } from "@/lib/utils";
import { getCoverCardMeta } from "../../lib/coverPresentation";
import {
  formatTitleCardFormatStatus,
  formatTitleCardGenres,
} from "../../lib/titleCardText";

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
  actionLabel = "Read More",
  coverFallbackVariant = "minimal-card",
  interactionMode = "link",
}) {
  const metaLine = item.subtitle || item.eyebrow || "";
  const formatStatusLine = formatTitleCardFormatStatus(
    item?.seriesType || item?.type || "",
    item?.status || item?.statusLabel || "",
  );
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
  const normalizedMetaTokens = new Set(
    String(metaLine || "")
      .split(/[\/|,·]/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  const visiblePills = [];

  if (coverMeta.badgeLabel === "18+") {
    visiblePills.push({
      key: `${item?.id || item?.title || "series"}-badge-${coverMeta.badgeLabel}`,
      label: coverMeta.badgeLabel,
      tone: "danger",
    });
  }

  const showGenrePills = visiblePills.length > 0;
  const genreLine = formatTitleCardGenres(rawGenreData, { limit: 3 })
    .split(" · ")
    .filter(
      (genre) =>
        !normalizedMetaTokens.has(String(genre || "").trim().toLowerCase()),
    )
    .join(" · ");

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

  const rankLabel = Number.isFinite(Number(item?.rank))
    ? `#${Number(item.rank)}`
    : String(item?.rankLabel || "").trim();
  const hookLine = String(item?.hook || item?.description || "").trim();

  const cardContent = (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(17,13,24,0.98)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.34)]",
        "transition-all duration-200 group-hover:-translate-y-1.5 group-hover:border-white/16 group-hover:shadow-[0_30px_90px_rgba(0,0,0,0.4)] group-focus-visible:translate-y-[-4px]",
      )}
    >
      <div className={cn("p-2", isCompact ? "pb-1.5" : "pb-2")}>
        <div
          className={cn(
            "relative aspect-[3/4] overflow-hidden rounded-[22px] border border-white/10 bg-[#0e0c18] shadow-[0_18px_42px_rgba(8,6,20,0.24)]",
          )}
        >
          <Cover
            tone={tone || item.coverTone}
            coverUrl={item.coverUrl}
            label={item.title}
            eyebrow={metaLine}
            badge=""
            genres={[]}
            seriesType=""
            fallbackVariant={coverFallbackVariant}
            decorative
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.045]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/8 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,79,154,0.14),transparent_26%)]" />
          <div className={cn("absolute inset-[1px] rounded-[21px]", "border border-white/18")} />

          {rankLabel ? (
            <div className="absolute left-3 top-3 inline-flex rounded-full border border-white/14 bg-[rgba(10,9,16,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              {rankLabel}
            </div>
          ) : null}

          {typeof item.progressPercent === "number" &&
          item.progressPercent > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
              <div
                className="h-full bg-[var(--gush-accent,#ff4f9a)]"
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
          <p
            className={cn(
              "line-clamp-2 font-display font-semibold tracking-[-0.04em] transition-colors",
              isCompact ? "text-[1.08rem] leading-5" : "text-[1.16rem] leading-6",
              "text-white group-hover:text-white",
            )}
          >
            {item.title}
          </p>
          {formatStatusLine ? (
            <p
              className={cn(
                "line-clamp-1 font-black uppercase tracking-[0.2em]",
                isCompact ? "text-[10px]" : "text-[11px]",
                "text-white/55",
              )}
            >
              {formatStatusLine}
            </p>
          ) : null}
        </div>

        {hookLine ? (
          <p
            className={cn(
              "line-clamp-2 text-white/62 transition-colors group-hover:text-white/78",
              isCompact ? "text-[0.8rem] leading-5" : "text-[0.9rem] leading-6",
            )}
          >
            {hookLine}
          </p>
        ) : null}

        {showGenrePills ? (
          <div className="flex flex-wrap gap-2">
            {visiblePills.map((pill) => (
              <span
                key={pill.key}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-full border font-semibold uppercase shadow-[0_8px_20px_rgba(8,6,20,0.18)]",
                  isCompact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]",
                  pill.tone === "danger"
                    ? "border-[rgba(255,152,189,0.24)] bg-[rgba(255,102,156,0.18)] text-[#ffd8e7]"
                    : "border-[rgba(255,239,170,0.28)] bg-[rgba(255,231,128,0.16)] text-[#fff4bf]",
                )}
              >
                {pill.label}
              </span>
            ))}
          </div>
        ) : null}

        {genreLine ? (
          <p
            className={cn(
              "line-clamp-2 transition-colors",
              isCompact ? "text-[0.82rem] leading-5" : "text-sm leading-6",
              "text-white/60 group-hover:text-white/78",
            )}
          >
            {genreLine}
          </p>
        ) : null}

        <div
          className={cn(
            "flex items-center border-t border-white/10 pt-3",
            typeof item.progressPercent === "number" && item.progressPercent > 0
              ? "justify-between"
              : showActionLabel
                ? "justify-between"
                : "justify-end",
          )}
        >
          {typeof item.progressPercent === "number" &&
          item.progressPercent > 0 ? (
            <p className={cn("text-[11px] font-medium", "text-white/45")}>
              {Math.round(progressWidth)}% read
            </p>
          ) : showActionLabel ? (
            <span
              className={cn(
                isCompact ? "text-[10px]" : "text-[11px]",
                "font-medium uppercase tracking-[0.16em]",
                "text-white/45",
              )}
            >
              {actionLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] text-white shadow-[0_8px_20px_rgba(8,6,20,0.18)]",
              "transition-transform duration-150 group-hover:translate-x-0.5 group-hover:bg-[rgba(255,79,154,0.14)]",
            )}
          >
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );

  if (interactionMode === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="group relative block w-full rounded-[28px] text-left focus-visible:ring-2 focus-visible:ring-[rgba(255,79,154,0.48)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gush-bg)]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href={resolvedHref || "#"}
      onClick={handleClick}
      className="group relative block w-full rounded-[28px] text-left focus-visible:ring-2 focus-visible:ring-[rgba(255,79,154,0.48)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gush-bg)]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {cardContent}
    </Link>
  );
}

export default memo(PortraitCard);
