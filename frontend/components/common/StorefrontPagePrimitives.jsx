import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";

export const storefrontPrimaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-black bg-[#00E5FF] px-5 text-sm font-black uppercase tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out outline-none select-none hover:translate-x-0.5 hover:translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE500] h-11";

export const storefrontSecondaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-white/20 bg-black px-5 text-sm font-black uppercase tracking-[0.02em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out outline-none select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE500] h-11";

export const storefrontInfoCardClass =
  "rounded-[22px] border-2 border-white/20 bg-black px-5 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";

export function StorefrontSectionHeading({
  eyebrow,
  title,
  description = null,
  className = "",
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
          {eyebrow}
        </p>
      ) : null}
      <div>
        <h2 className="text-[1.9rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
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
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="text-base font-black uppercase tracking-[-0.02em] text-white">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 text-sm font-semibold leading-7 text-white/72">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
