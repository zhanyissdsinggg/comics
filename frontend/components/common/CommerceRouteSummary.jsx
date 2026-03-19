"use client";

import SurfacePanel from "./SurfacePanel";

function SummaryCard({
  eyebrow,
  title,
  description,
  tags = [],
  cta,
  onClick,
  secondaryCta = "",
  onSecondaryClick = null,
  emphasis = "default",
}) {
  const cardClass =
    emphasis === "primary"
      ? "border-[rgba(47,107,255,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))]"
      : "border-black/8 bg-white/92";
  const primaryButtonClass =
    emphasis === "primary"
      ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
      : "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-[#f8f9fc] px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-white";

  return (
    <div className={`flex h-full flex-col rounded-[26px] border p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${cardClass}`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
          {tags.map((tag) => (
            <span key={`${title}-${tag}`} className="rounded-full border border-black/8 bg-white px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {(cta || secondaryCta) ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {cta ? (
            <button type="button" onClick={onClick} className={primaryButtonClass}>
              {cta}
            </button>
          ) : null}
          {secondaryCta ? (
            <button type="button" onClick={onSecondaryClick} className={secondaryButtonClass}>
              {secondaryCta}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function CommerceRouteSummary({
  eyebrow = "Compare the paths",
  title,
  description,
  primary,
  secondary,
  support,
}) {
  return (
    <SurfacePanel className="space-y-5" appearance="light" accent="blue">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.86fr]">
        <SummaryCard {...primary} emphasis="primary" />
        <SummaryCard {...secondary} />
        <SummaryCard {...support} />
      </div>
    </SurfacePanel>
  );
}
