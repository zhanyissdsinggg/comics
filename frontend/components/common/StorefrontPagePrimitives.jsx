import { CheckCircle2, Clock3, Lock, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";
import { Skeleton } from "./Skeleton";

export const storefrontPrimaryButtonClass =
  "gush-transition-base inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[rgba(236,72,153,0.32)] [background:var(--gush-gradient-primary)] px-5 text-sm font-semibold tracking-[0em] text-[color:var(--gush-button-text-dark)] shadow-[var(--gush-shadow-button)] outline-none select-none hover:-translate-y-0.5 hover:shadow-[var(--gush-shadow-button),var(--gush-shadow-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gush-focus-pink)]";

export const storefrontSecondaryButtonClass =
  "gush-transition-base inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--gush-glass-border)] [background:linear-gradient(180deg,var(--gush-panel-strong),var(--gush-panel-soft)),var(--gush-panel)] px-5 text-sm font-semibold tracking-[0em] text-[color:var(--gush-text)] shadow-[var(--gush-glass-shadow)] outline-none select-none hover:-translate-y-0.5 hover:border-[color:var(--gush-glass-border-strong)] hover:bg-[rgba(255,255,255,0.075)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gush-focus-cyan)]";

export const storefrontInputClass =
  "mt-2 w-full [border-radius:var(--gush-radius-lg)] border border-[color:var(--gush-glass-border)] bg-[rgba(9,11,22,0.82)] px-4 py-3 text-sm font-medium text-[color:var(--gush-text)] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_14px_32px_rgba(8,6,20,0.2)] placeholder:text-white/35 focus:border-cyan-300/40 focus:bg-[rgba(9,11,22,0.94)] focus:ring-4 focus:ring-cyan-400/10";

export const storefrontInsetCardClass =
  "[border-radius:var(--gush-radius-xl)] border border-[color:var(--gush-glass-border)] [background:linear-gradient(180deg,var(--gush-panel-strong),var(--gush-panel-soft)),var(--gush-glass-bg)] px-4 py-4 shadow-[var(--gush-glass-shadow)] backdrop-blur-xl";

export const storefrontSoftCardClass =
  "[border-radius:var(--gush-radius-lg)] border border-[color:var(--gush-glass-border)] [background:linear-gradient(180deg,var(--gush-panel),rgba(255,255,255,0.024)),var(--gush-glass-bg-soft)] px-4 py-3.5 shadow-[var(--gush-shadow-card)] backdrop-blur-xl";

export const storefrontBadgeClass =
  "inline-flex items-center rounded-full border border-[color:var(--gush-glass-border)] bg-[var(--gush-panel)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--gush-text-secondary)] backdrop-blur-xl";

export const storefrontChipClass =
  "gush-transition-base inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[color:var(--gush-glass-border)] bg-[var(--gush-panel)] px-4 text-sm font-medium text-[color:var(--gush-text-secondary)] shadow-[0_14px_30px_rgba(8,6,20,0.18)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-[color:var(--gush-glass-border-strong)] hover:bg-[rgba(255,255,255,0.075)] hover:text-[color:var(--gush-text)]";

export const storefrontAccentChipClass =
  "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[rgba(255,79,154,0.16)] bg-[rgba(255,79,154,0.1)] px-4 text-sm font-medium text-white/82 shadow-[0_16px_32px_rgba(8,6,20,0.2)] backdrop-blur-xl transition-all duration-150 hover:-translate-y-0.5 hover:border-[rgba(255,133,181,0.26)] hover:bg-[rgba(255,79,154,0.16)]";

export const storefrontHighlightBadgeClass =
  "inline-flex items-center rounded-full border border-[rgba(255,143,195,0.3)] bg-[linear-gradient(135deg,rgba(255,79,154,0.22)_0%,rgba(124,58,237,0.18)_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_24px_rgba(255,79,154,0.18)]";

export const storefrontStateBadgeBaseClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-xl";

const storefrontStateBadgeVariants = {
  completed:
    "border-amber-200/24 bg-amber-200/10 text-amber-100 shadow-[0_10px_24px_rgba(251,191,36,0.08)]",
  ongoing:
    "border-cyan-200/20 bg-cyan-200/10 text-cyan-100 shadow-[0_10px_24px_rgba(103,232,249,0.08)]",
  newToday:
    "border-fuchsia-200/22 bg-fuchsia-200/10 text-fuchsia-100 shadow-[0_10px_24px_rgba(255,79,154,0.08)]",
  replayable:
    "border-violet-200/22 bg-violet-200/10 text-violet-100 shadow-[0_10px_24px_rgba(167,139,250,0.1)]",
  locked:
    "border-white/14 bg-white/[0.06] text-white/72 shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
  muted: "border-white/10 bg-white/[0.04] text-white/54",
};

const storefrontStateBadgeIcons = {
  completed: CheckCircle2,
  ongoing: Clock3,
  newToday: Sparkles,
  replayable: RefreshCw,
  locked: Lock,
  muted: null,
};

const storefrontStateBadgeLabels = {
  completed: "Completed",
  ongoing: "Ongoing",
  newToday: "New today",
  replayable: "Replayable",
  locked: "Locked",
  muted: "Available",
};

export function StorefrontStateBadge({
  variant = "ongoing",
  label = "",
  icon: Icon = null,
  className = "",
}) {
  const BadgeIcon = Icon || storefrontStateBadgeIcons[variant] || null;

  return (
    <span
      className={cn(
        storefrontStateBadgeBaseClass,
        storefrontStateBadgeVariants[variant] || storefrontStateBadgeVariants.muted,
        className,
      )}
    >
      {BadgeIcon ? <BadgeIcon className="size-3.5 shrink-0" /> : null}
      <span>{label || storefrontStateBadgeLabels[variant] || "Story"}</span>
    </span>
  );
}

export function StorefrontNoCoverCard({
  title = "No cover yet",
  description = "A clean fallback keeps the shelf intentional until artwork lands.",
  label = "No cover",
  compact = false,
  className = "",
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(103,232,249,0.08),transparent_28%)]" />
      <div className={cn("relative flex flex-col justify-between p-4", compact ? "min-h-[160px]" : "min-h-[220px]")}>
        <StorefrontStateBadge variant="muted" label={label} />
        <div>
          <h3 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function StorefrontLoadingCard({
  compact = false,
  className = "",
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-4 shadow-[var(--gush-shadow-card)] backdrop-blur-xl",
        className,
      )}
    >
      <div className={`grid gap-4 ${compact ? "grid-cols-[88px_minmax(0,1fr)]" : "sm:grid-cols-[120px_minmax(0,1fr)]"}`}>
        <Skeleton
          className={`aspect-[3/4] ${compact ? "rounded-[18px]" : "rounded-[20px]"}`}
        />
        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" rounded="full" />
            <Skeleton className="h-6 w-4/5" rounded="sm" />
          </div>
          <Skeleton className="h-3.5 w-full" rounded="full" />
          <Skeleton className="h-3.5 w-[88%]" rounded="full" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-8 w-24" rounded="full" />
            <Skeleton className="h-8 w-20" rounded="full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const storefrontNoticeClass =
  "[border-radius:var(--gush-radius-xl)] border border-[color:var(--gush-glass-border)] [background:linear-gradient(180deg,var(--gush-panel-strong),var(--gush-panel-soft)),var(--gush-glass-bg)] px-4 py-3.5 text-sm font-medium text-[color:var(--gush-text-secondary)] shadow-[var(--gush-glass-shadow)] backdrop-blur-xl";

export const storefrontInfoCardClass =
  "[border-radius:var(--gush-radius-xl)] border border-[color:var(--gush-glass-border)] [background:linear-gradient(180deg,var(--gush-panel-strong),rgba(255,255,255,0.025)),var(--gush-glass-bg)] px-5 py-4 shadow-[var(--gush-glass-shadow)] backdrop-blur-xl";

export const storefrontHomeGlassCardClass = "gush-home-glass-card";

export const storefrontHomeInteractiveCardClass =
  "gush-home-glass-card gush-home-glass-card--interactive";

export const storefrontHomeSectionEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--gush-home-text-muted)]";

export const storefrontHomePrimaryButtonClass =
  "inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-[color:var(--gush-home-text-primary)] shadow-[0_18px_42px_rgba(124,58,237,0.28)] transition-all duration-200 ease-out [background:var(--gush-home-primary-gradient)] hover:-translate-y-[2px] hover:shadow-[0_26px_56px_rgba(124,58,237,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]";

export const storefrontHomeIconButtonClass =
  "inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--gush-home-card-border)] bg-[var(--gush-home-card-bg)] px-4 text-sm font-medium text-[color:var(--gush-home-text-secondary)] shadow-[var(--gush-shadow-card)] backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-y-[2px] hover:border-[color:var(--gush-home-card-border-hover)] hover:bg-[rgba(255,255,255,0.065)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gush-focus-cyan)]";

export const storefrontHomeSearchPillClass =
  "inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--gush-home-card-border)] bg-[var(--gush-home-card-bg)] px-4 text-sm font-medium text-[color:var(--gush-home-text-secondary)] shadow-[var(--gush-shadow-card)] backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-y-[2px] hover:border-[color:var(--gush-home-card-border-hover)] hover:bg-[rgba(255,255,255,0.065)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gush-focus-cyan)]";

export const storefrontHomeChipClass =
  "inline-flex min-h-[34px] items-center rounded-full border border-[color:var(--gush-home-card-border)] bg-[var(--gush-home-card-bg)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--gush-home-text-secondary)] shadow-[var(--gush-shadow-pill)] backdrop-blur-xl";

export const storefrontHomeAccentChipClass =
  "inline-flex min-h-[34px] items-center rounded-full border border-[rgba(236,72,153,0.24)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_16px_30px_rgba(124,58,237,0.22)] [background:linear-gradient(135deg,rgba(236,72,153,0.22)_0%,rgba(124,58,237,0.2)_100%)] backdrop-blur-xl";

export function StorefrontSectionHeading({
  eyebrow,
  title,
  description = null,
  className = "",
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/54">
          {eyebrow}
        </p>
      ) : null}
      <div>
        <h2 className="font-display text-[1.82rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[1.95rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-[1.72] text-white/64">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function StorefrontDesk({
  eyebrow,
  title,
  description = null,
  children = null,
  actions = null,
  className = "",
}) {
  return (
    <SurfacePanel
      tone="muted"
      accent="cyan"
      appearance="dark"
      className={cn(
        "flex h-full flex-col justify-between space-y-6",
        className,
      )}
    >
      <StorefrontSectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      {children}
      {actions ? <div className="flex flex-col gap-2.5">{actions}</div> : null}
    </SurfacePanel>
  );
}

export function StorefrontInfoCard({
  title,
  description = null,
  eyebrow = null,
  className = "",
  children = null,
}) {
  return (
    <div className={cn(storefrontInfoCardClass, "text-white", className)}>
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 text-sm leading-[1.72] text-white/68">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
