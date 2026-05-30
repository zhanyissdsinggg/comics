import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";

export const storefrontPrimaryButtonClass =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[rgba(255,79,154,0.32)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff7ab1_52%,#ff9cc0_100%)] px-5 text-sm font-semibold tracking-[0em] text-[#1a0e16] shadow-[0_18px_36px_rgba(255,79,154,0.22)] transition-all duration-150 ease-out outline-none select-none hover:-translate-y-0.5 hover:shadow-[0_24px_46px_rgba(255,79,154,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd5e5]";

export const storefrontSecondaryButtonClass =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/12 bg-[rgba(255,255,255,0.045)] px-5 text-sm font-semibold tracking-[0em] text-white shadow-[0_14px_30px_rgba(8,6,20,0.18)] transition-all duration-150 ease-out outline-none select-none hover:-translate-y-0.5 hover:border-white/20 hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c1f5ff]";

export const storefrontInputClass =
  "mt-2 w-full rounded-[22px] border border-white/12 bg-[rgba(7,10,21,0.72)] px-4 py-3 text-sm font-medium text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_28px_rgba(8,6,20,0.18)] transition-all duration-150 placeholder:text-white/35 focus:border-cyan-300/40 focus:bg-[rgba(11,15,28,0.92)] focus:ring-4 focus:ring-cyan-400/10";

export const storefrontInsetCardClass =
  "rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.045)] px-4 py-4 shadow-[0_18px_38px_rgba(8,6,20,0.24)] backdrop-blur-xl";

export const storefrontSoftCardClass =
  "rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.035)] px-4 py-3.5 shadow-[0_14px_30px_rgba(8,6,20,0.2)] backdrop-blur-xl";

export const storefrontBadgeClass =
  "inline-flex items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/78 backdrop-blur-xl";

export const storefrontHighlightBadgeClass =
  "inline-flex items-center rounded-full border border-[rgba(255,143,195,0.3)] bg-[linear-gradient(135deg,rgba(255,79,154,0.22)_0%,rgba(124,58,237,0.18)_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_24px_rgba(255,79,154,0.18)]";

export const storefrontNoticeClass =
  "rounded-[24px] border border-white/12 bg-[rgba(255,255,255,0.04)] px-4 py-3.5 text-sm font-medium text-white/78 shadow-[0_18px_40px_rgba(8,6,20,0.24)] backdrop-blur-xl";

export const storefrontInfoCardClass =
  "rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-5 py-4 shadow-[0_18px_38px_rgba(8,6,20,0.24)] backdrop-blur-xl";

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
