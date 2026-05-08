import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";

export const storefrontPrimaryButtonClass =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[rgba(255,182,211,0.35)] bg-[linear-gradient(135deg,#ff7faa_0%,#ff8fcf_100%)] px-5 text-sm font-semibold tracking-[-0.01em] text-[#241221] shadow-[0_12px_30px_rgba(255,118,170,0.28)] transition-all duration-150 ease-out outline-none select-none hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(255,118,170,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd5e5]";

export const storefrontSecondaryButtonClass =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/12 bg-[rgba(255,255,255,0.04)] px-5 text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_10px_28px_rgba(8,6,20,0.2)] transition-all duration-150 ease-out outline-none select-none hover:-translate-y-0.5 hover:border-white/20 hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c1f5ff]";

export const storefrontInfoCardClass =
  "rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-4 shadow-[0_14px_34px_rgba(8,6,20,0.22)]";

export function StorefrontSectionHeading({
  eyebrow,
  title,
  description = null,
  className = "",
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
          {eyebrow}
        </p>
      ) : null}
      <div>
        <h2 className="text-[1.9rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-7 text-white/72">
            {description}
          </p>
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
      className={cn("flex h-full flex-col justify-between space-y-6", className)}
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="text-base font-semibold tracking-[-0.02em] text-white">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 text-sm leading-7 text-white/70">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
