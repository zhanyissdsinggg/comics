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
      className={`relative overflow-hidden rounded-[26px] border-2 border-black bg-[#0b0b0b] p-5 text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] ${className}`}
    >
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
            {notice.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[1.8rem] font-black uppercase tracking-[-0.05em] text-white">
            {notice.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/75">
            {notice.description}
          </p>
          {Array.isArray(notice.metaItems) && notice.metaItems.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/70">
              {notice.metaItems.map((item) => (
                <span
                  key={item}
                  className={`${storefrontInfoCardClass} px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]`}
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
