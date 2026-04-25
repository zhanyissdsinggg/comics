import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";

export const storefrontPrimaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-black bg-black px-5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:ring-[3px] focus-visible:ring-black/10 active:translate-y-px h-11";

export const storefrontSecondaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-black/12 bg-white px-5 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none hover:border-black/18 hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:ring-[3px] focus-visible:ring-black/10 active:translate-y-px h-11";

export const storefrontInfoCardClass =
  "rounded-[22px] border border-black/10 bg-white px-5 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]";

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
