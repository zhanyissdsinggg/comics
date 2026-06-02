"use client";

import {
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function getActionClass(variant) {
  if (variant === "secondary") {
    return storefrontSecondaryButtonClass;
  }

  return storefrontPrimaryButtonClass;
}

export default function ActionModal({
  open,
  type,
  title,
  description,
  shortfallPts,
  offer,
  offerBadge,
  offerSavingsText,
  compareItems,
  compareTitle = "Options",
  tips,
  tipsTitle = "Quick notes",
  actions,
  onClose,
}) {
  if (!open) {
    return null;
  }

  const toneLabel =
    type === "SHORTFALL"
      ? "Reading access"
      : type === "SUCCESS"
        ? "Ready to read"
        : "Heads up";

  const resolvedActions =
    Array.isArray(actions) && actions.length > 0
      ? actions
      : [
          {
            label: "Close",
            onClick: onClose,
            variant: "primary",
          },
        ];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/82 p-4 backdrop-blur-[6px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[34rem] overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(21,18,31,0.98)_0%,rgba(14,12,20,0.98)_100%)] text-white shadow-[0_28px_80px_rgba(6,5,16,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-5">
          <div>
            <p className={`${storefrontBadgeClass} border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.12)] text-[#ffd6e5]`}>
              {toneLabel}
            </p>
            <h3 className="mt-3 font-display text-[2rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${storefrontSecondaryButtonClass} px-3 py-1.5 text-xs`}
          >
            Close
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm leading-7 text-white/72">{description}</p>

          {type === "SHORTFALL" ? (
            <div className="mt-4 rounded-[24px] border border-amber-200/16 bg-[rgba(244,201,93,0.12)] px-4 py-3 text-sm text-amber-100 shadow-[0_16px_36px_rgba(8,6,20,0.2)]">
              Need{" "}
              <span className="font-semibold text-amber-50">
                {shortfallPts}
              </span>{" "}
              more points for this chapter.
            </div>
          ) : null}

          {offer ? (
            <div className={`mt-4 ${storefrontInfoCardClass} p-4 text-sm text-white/76`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold tracking-[-0.02em] text-white">
                  {offer.title || offer.name}
                </span>
                {offerBadge ? (
                  <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                    {offerBadge}
                  </span>
                ) : null}
              </div>
              {offer.pricePts ? (
                <p className="mt-2 text-xs font-semibold text-white/70">
                  {offer.pricePts} points
                </p>
              ) : null}
              {offerSavingsText ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/64">
                  {offerSavingsText}
                </p>
              ) : null}
            </div>
          ) : null}

          {Array.isArray(compareItems) && compareItems.length > 0 ? (
            <div className={`mt-4 ${storefrontInfoCardClass} p-4 text-sm text-white/76`}>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/58">
                {compareTitle}
              </p>
              {compareItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 py-1"
                >
                  <span>{item.label}</span>
                  <span className="text-right font-semibold text-white/70">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {Array.isArray(tips) && tips.length > 0 ? (
            <div className={`mt-4 ${storefrontNoticeClass} px-4 py-4 text-sm text-white/76`}>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/58">
                {tipsTitle}
              </p>
              {tips.map((tip) => (
                <div key={tip} className="flex gap-2">
                  <span className="font-semibold text-[#ff76ad]">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {resolvedActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`px-4 py-2.5 text-sm ${getActionClass(action.variant)}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
