/**
 * Portrait card: calmer storefront card shared by home, search, and creator pages.
 */
import { memo } from "react";
import Cover from "../common/Cover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const badgeConfig = {
  HOT: "bg-rose-500 text-white",
  POPULAR: "bg-amber-500 text-neutral-950",
  NEW: "bg-sky-500 text-white",
  TTF: "bg-emerald-500 text-neutral-950",
  COMPLETED: "bg-teal-500 text-neutral-950",
  "18+": "bg-red-600 text-white",
};

function BadgePill({ badge }) {
  if (!badge) {
    return null;
  }

  const key = String(badge).toUpperCase();

  return (
    <Badge
      className={cn(
        "absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-lg",
        badgeConfig[key] || "bg-white text-neutral-950",
      )}
    >
      {key === "TTF" ? "FREE" : badge}
    </Badge>
  );
}

function PortraitCard({ item, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,21,31,0.88),rgba(8,11,18,0.98))] shadow-[0_20px_70px_rgba(0,0,0,0.2)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-white/20 group-hover:shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
          <Cover
            tone={tone || item.coverTone}
            coverUrl={item.coverUrl}
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/18 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_22%)]" />
          <BadgePill badge={item.badge} />

          {typeof item.progressPercent === "number" && item.progressPercent > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                style={{ width: `${Math.round(item.progressPercent * 100)}%` }}
              />
            </div>
          ) : null}

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200">
              {item.eyebrow || item.badge || "Official"}
            </span>
            <span className="text-xs font-semibold text-white">Open</span>
          </div>
        </div>

        <div className="space-y-2 px-4 py-4">
          {item.eyebrow ? (
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/85">
              {item.eyebrow}
            </p>
          ) : null}
          <p className="line-clamp-2 text-[15px] font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-white">
            {item.title}
          </p>
          {item.subtitle ? (
            <p className="line-clamp-1 text-xs text-neutral-400 transition-colors group-hover:text-neutral-300">
              {item.subtitle}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Read now</span>
            <span className="text-sm font-semibold text-white transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default memo(PortraitCard);
