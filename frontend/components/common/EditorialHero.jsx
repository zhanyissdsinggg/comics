"use client";

import SurfacePanel from "./SurfacePanel";

export default function EditorialHero({
  eyebrow,
  title,
  description,
  secondary,
  actions = null,
  stats = [],
  className = "",
}) {
  return (
    <SurfacePanel className={`relative overflow-hidden ${className}`.trim()}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.14),transparent_24%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.96] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
              {description}
            </p>
          ) : null}
          {secondary ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400">{secondary}</p>
          ) : null}
          {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
        </div>

        {stats.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-lg"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                  {stat.label}
                </p>
                <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                  {stat.value}
                </p>
                {stat.hint ? (
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{stat.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SurfacePanel>
  );
}
