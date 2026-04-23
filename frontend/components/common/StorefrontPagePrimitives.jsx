import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";

export const storefrontPrimaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black bg-[#ff007a] px-5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e0006b] hover:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:ring-[3px] focus-visible:ring-[rgba(255,0,122,0.18)] active:translate-y-px h-11 px-5";

export const storefrontSecondaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black bg-white px-5 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:ring-[3px] focus-visible:ring-[rgba(255,0,122,0.18)] active:translate-y-px h-11 px-5";

export const storefrontInfoCardClass =
  "border-[3px] border-black bg-white px-5 py-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]";

export function StorefrontSectionHeading({
  eyebrow,
  title,
  description = null,
  className = "",
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
          {eyebrow}
        </p>
      ) : null}
      <div>
        <h2 className="text-[1.9rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-black">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm font-medium leading-7 text-black/68">
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
      accent="blue"
      appearance="light"
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
    <div className={cn(storefrontInfoCardClass, className)}>
      {eyebrow ? (
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="text-base font-black uppercase tracking-[-0.02em] text-black">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 text-sm font-medium leading-7 text-black/68">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
