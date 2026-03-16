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
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.7),rgba(8,12,18,0.95))] shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
          <Cover tone={tone || item.coverTone} coverUrl={item.coverUrl} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/12 to-transparent" />
          <BadgePill badge={item.badge} />

          {typeof item.progressPercent === "number" && item.progressPercent > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                style={{ width: `${Math.round(item.progressPercent * 100)}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5 px-3.5 py-4">
          {item.eyebrow ? (
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/85">
              {item.eyebrow}
            </p>
          ) : null}
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-white">
            {item.title}
          </p>
          {item.subtitle ? (
            <p className="line-clamp-1 text-xs text-neutral-400 transition-colors group-hover:text-neutral-300">
              {item.subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default memo(PortraitCard);
