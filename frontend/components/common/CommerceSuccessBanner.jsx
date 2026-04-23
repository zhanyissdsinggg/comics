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
      className={`relative overflow-hidden rounded-[30px] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),transparent_32%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/55">
            {notice.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[1.8rem] font-black uppercase tracking-[-0.05em] text-black">
            {notice.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-black/68">
            {notice.description}
          </p>
          {Array.isArray(notice.metaItems) && notice.metaItems.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-black/60">
              {notice.metaItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border-[3px] border-black bg-[#fff6cf] px-3 py-1"
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
              className="rounded-full border-[3px] border-black bg-black px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[6px_6px_0_0_rgba(255,0,122,1)] transition hover:-translate-y-0.5 hover:bg-[#ff007a]"
            >
              {notice.primaryAction.label}
            </button>
          ) : null}
          {notice.secondaryAction ? (
            <button
              type="button"
              onClick={() => router.push(notice.secondaryAction.href)}
              className="rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:-translate-y-0.5 hover:bg-[#dffcff]"
            >
              {notice.secondaryAction.label}
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-black/68 transition hover:-translate-y-0.5 hover:bg-[#fff6cf]"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
