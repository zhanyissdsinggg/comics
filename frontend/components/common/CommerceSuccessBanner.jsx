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
      className={`rounded-[28px] border border-[rgba(47,107,255,0.14)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gush-accent,#2f6bff)]">
            {notice.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
            {notice.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {notice.description}
          </p>
          {Array.isArray(notice.metaItems) && notice.metaItems.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
              {notice.metaItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/8 bg-white/84 px-3 py-1"
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
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {notice.primaryAction.label}
            </button>
          ) : null}
          {notice.secondaryAction ? (
            <button
              type="button"
              onClick={() => router.push(notice.secondaryAction.href)}
              className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
            >
              {notice.secondaryAction.label}
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-black/8 bg-[#f8f9fc] px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-black/12 hover:bg-white"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
