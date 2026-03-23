/**
 * Portrait card: calmer storefront card shared by home, search, and creator pages.
 */
import { memo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Cover from "../common/Cover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCoverCardMeta, normalizeCoverBadge } from "../../lib/coverPresentation";

const badgeConfig = {
  Trending: "bg-rose-500 text-white",
  New: "bg-sky-500 text-white",
  Free: "bg-emerald-500 text-neutral-950",
  Completed: "bg-teal-500 text-neutral-950",
  "18+": "bg-red-600 text-white",
};

function BadgePill({ badge }) {
  const label = normalizeCoverBadge(badge);
  if (!label) {
    return null;
  }

  return (
    <Badge
      className={cn(
        "absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-lg",
        badgeConfig[label] || "bg-white text-neutral-950",
      )}
    >
      {label}
    </Badge>
  );
}

function isModifiedEvent(event) {
  return Boolean(
    event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0,
  );
}

function PortraitCard({ item, tone, onClick, appearance = "default", href = "" }) {
  const metaLine = item.subtitle || item.eyebrow || "";
  const progressPercent = Number(item.progressPercent || 0);
  const progressWidth = Math.max(0, Math.min(progressPercent <= 1 ? progressPercent * 100 : progressPercent, 100));
  const isLight = appearance === "light";
  const resolvedHref = href || (item?.id ? `/series/${encodeURIComponent(item.id)}` : "");
  const coverMeta = getCoverCardMeta(item);
  const coverChips = coverMeta.chips.slice(0, 2);
  const detailCopy = item.statusLabel || item.metaLabel || coverMeta.detailText || "";

  const handleClick = (event) => {
    if (typeof onClick !== "function") {
      return;
    }

    if (isModifiedEvent(event)) {
      return;
    }

    event.preventDefault();
    onClick(event);
  };

  return (
    <Link
      href={resolvedHref || "#"}
      onClick={handleClick}
      className="group relative block w-full text-left"
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-label={item?.title ? `Open ${item.title}` : "Open title"}
    >
      <div
        className={cn(
          "overflow-hidden rounded-[28px] transition-all duration-300 group-hover:-translate-y-0.5",
          isLight
            ? "border border-black/8 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] group-hover:border-black/10 group-hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]"
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
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className={cn("absolute inset-0", isLight ? "bg-gradient-to-t from-black/50 via-black/8 to-transparent" : "bg-gradient-to-t from-black/85 via-black/18 to-transparent")} />
          <div className={cn("absolute inset-0", isLight ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_24%)]" : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_22%)]")} />
          <BadgePill badge={item.badge} />

          {typeof item.progressPercent === "number" && item.progressPercent > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
              <div
                className="h-full bg-[var(--gush-accent,#3157d6)]"
                style={{ width: `${Math.round(progressWidth)}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="space-y-1.5">
            {metaLine ? (
              <p className={cn("line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors", isLight ? "text-slate-400 group-hover:text-slate-500" : "text-neutral-500 group-hover:text-neutral-400")}>
                {metaLine}
              </p>
            ) : null}
            <p className={cn("line-clamp-2 text-[1rem] font-semibold leading-6 tracking-tight transition-colors", isLight ? "text-slate-900 group-hover:text-slate-950" : "text-neutral-100 group-hover:text-white")}>
              {item.title}
            </p>
          </div>

          {detailCopy ? (
            <p
              className={cn(
                "line-clamp-2 text-sm leading-6 transition-colors",
                isLight ? "text-slate-600 group-hover:text-slate-700" : "text-neutral-400 group-hover:text-neutral-300",
              )}
            >
              {detailCopy}
            </p>
          ) : null}

          {coverChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {coverChips.map((chip) => (
                <span
                  key={`${item?.id || item?.title}-${chip.id}-${chip.label}`}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                    chip.tone === "accent"
                      ? isLight
                        ? "border-[rgba(49,87,214,0.14)] bg-[rgba(49,87,214,0.08)] text-[var(--gush-accent,#3157d6)]"
                        : "border-white/12 bg-white/10 text-white/80"
                      : chip.tone === "danger"
                        ? "border-red-200 bg-red-50 text-red-600"
                      : chip.tone === "soft"
                          ? isLight
                            ? "border-black/8 bg-[rgba(246,243,237,0.92)] text-slate-500"
                            : "border-white/10 bg-white/8 text-neutral-400"
                          : isLight
                            ? "border-black/8 bg-white text-slate-600"
                            : "border-white/10 bg-white/10 text-neutral-300",
                  )}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-1">
            {typeof item.progressPercent === "number" && item.progressPercent > 0 ? (
              <p className={cn("text-[11px] font-medium", isLight ? "text-slate-400" : "text-neutral-500")}>
                Reading progress {Math.round(progressWidth)}%
              </p>
            ) : (
              <span className={cn("text-[11px] font-medium", isLight ? "text-slate-400" : "text-neutral-500")}>
                Open title
              </span>
            )}
            <ArrowRight className={cn("size-4 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1", isLight ? "text-slate-400" : "text-white")} />
          </div>
          <div className="sr-only">Open title details</div>
        </div>
      </div>
    </Link>
  );
}

export default memo(PortraitCard);
