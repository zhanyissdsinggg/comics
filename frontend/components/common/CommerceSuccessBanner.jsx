"use client";

import { useRouter } from "next/navigation";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontInfoCardClass,
} from "./StorefrontPagePrimitives";

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
      className={`relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(29,24,37,0.98)_0%,rgba(16,13,24,0.98)_100%)] p-5 text-white shadow-[0_26px_64px_rgba(8,6,20,0.34)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.14),transparent_22%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.08),transparent_18%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/52">
            {notice.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white">
            {notice.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
            {notice.description}
          </p>
          {Array.isArray(notice.metaItems) && notice.metaItems.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/70">
              {notice.metaItems.map((item) => (
                <span
                  key={item}
                  className={`${storefrontInfoCardClass} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]`}
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
              className={storefrontPrimaryButtonClass}
            >
              {notice.primaryAction.label}
            </button>
          ) : null}
          {notice.secondaryAction ? (
            <button
              type="button"
              onClick={() => router.push(notice.secondaryAction.href)}
              className={storefrontSecondaryButtonClass}
            >
              {notice.secondaryAction.label}
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className={storefrontSecondaryButtonClass}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
