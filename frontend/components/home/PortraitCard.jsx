/**
 * Portrait card: calmer storefront card shared by home, search, and creator pages.
 */
import { memo } from "react";
import { ArrowRight } from "lucide-react";
import Cover from "../common/Cover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const badgeConfig = {
  TRENDING: "bg-rose-500 text-white",
  NEW: "bg-sky-500 text-white",
  FREE: "bg-emerald-500 text-neutral-950",
  COMPLETED: "bg-teal-500 text-neutral-950",
  "18+": "bg-red-600 text-white",
};

function normalizeBadge(badge) {
  const raw = String(badge || "").trim().toUpperCase();
  if (!raw) {
    return null;
  }
  if (raw.includes("18")) {
    return "18+";
  }
  if (raw.includes("TTF") || raw.includes("FREE")) {
    return "FREE";
  }
  if (raw.includes("COMPLETE")) {
    return "COMPLETED";
  }
  if (raw.includes("NEW")) {
    return "NEW";
  }
  if (raw.includes("HOT") || raw.includes("POPULAR")) {
    return "TRENDING";
  }
  return null;
}

function BadgePill({ badge }) {
  const key = normalizeBadge(badge);
  if (!key) {
    return null;
  }

  return (
    <Badge
      className={cn(
        "absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-lg",
        badgeConfig[key] || "bg-white text-neutral-950",
      )}
    >
      {key}
    </Badge>
  );
}

function PortraitCard({ item, tone, onClick, appearance = "default" }) {
  const metaLine = item.subtitle || item.eyebrow || "";
  const progressPercent = Number(item.progressPercent || 0);
  const progressWidth = Math.max(0, Math.min(progressPercent <= 1 ? progressPercent * 100 : progressPercent, 100));
  const isLight = appearance === "light";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className={cn(
          "overflow-hidden rounded-[28px] transition-all duration-300 group-hover:-translate-y-1",
          isLight
            ? "border border-black/6 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] group-hover:border-black/10 group-hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]"
            : "border border-white/10 bg-[linear-gradient(180deg,rgba(16,21,31,0.88),rgba(8,11,18,0.98))] shadow-[0_20px_70px_rgba(0,0,0,0.2)] group-hover:border-white/20 group-hover:shadow-[0_26px_90px_rgba(0,0,0,0.28)]",
        )}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
          <Cover
            tone={tone || item.coverTone}
            coverUrl={item.coverUrl}
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className={cn("absolute inset-0", isLight ? "bg-gradient-to-t from-black/45 via-transparent to-transparent" : "bg-gradient-to-t from-black/85 via-black/18 to-transparent")} />
          <div className={cn("absolute inset-0", isLight ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_24%)]" : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_22%)]")} />
          <BadgePill badge={item.badge} />

          {typeof item.progressPercent === "number" && item.progressPercent > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                style={{ width: `${Math.round(progressWidth)}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2.5 px-4 py-4">
          <p className={cn("line-clamp-2 text-[15px] font-semibold leading-5 transition-colors", isLight ? "text-slate-900 group-hover:text-slate-950" : "text-neutral-100 group-hover:text-white")}>
            {item.title}
          </p>
          {metaLine ? (
            <p className={cn("line-clamp-1 text-xs transition-colors", isLight ? "text-slate-500 group-hover:text-slate-600" : "text-neutral-400 group-hover:text-neutral-300")}>
              {metaLine}
            </p>
          ) : null}

          <div className="flex items-center justify-end pt-1">
            <ArrowRight className={cn("size-4 transition-transform duration-300 group-hover:translate-x-1", isLight ? "text-slate-400" : "text-white")} />
          </div>
        </div>
      </div>
    </button>
  );
}

export default memo(PortraitCard);
