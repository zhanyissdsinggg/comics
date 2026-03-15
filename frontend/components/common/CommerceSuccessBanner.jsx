"use client";

import { useRouter } from "next/navigation";

export default function CommerceSuccessBanner({
  notice,
  onDismiss,
  className = "",
}) {
  const router = useRouter();

  if (!notice) {
    return null;
  }

  return (
    <div
      className={`rounded-[28px] border border-emerald-400/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(255,255,255,0.03))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/85">
            {notice.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
            {notice.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-200">
            {notice.description}
          </p>
          {Array.isArray(notice.metaItems) && notice.metaItems.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-neutral-200">
              {notice.metaItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/10 px-3 py-1"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {notice.primaryAction ? (
            <button
              type="button"
              onClick={() => router.push(notice.primaryAction.href)}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              {notice.primaryAction.label}
            </button>
          ) : null}
          {notice.secondaryAction ? (
            <button
              type="button"
              onClick={() => router.push(notice.secondaryAction.href)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              {notice.secondaryAction.label}
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
