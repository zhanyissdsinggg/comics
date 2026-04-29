"use client";

import {
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
        className="w-full max-w-[34rem] overflow-hidden rounded-[30px] border-2 border-white/20 bg-black/95 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-white/10 bg-black/80 p-5">
          <div>
            <p className="inline-flex rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {type === "SHORTFALL"
                ? "Keep reading"
                : type === "SUCCESS"
                  ? "Ready"
                  : "Quick note"}
            </p>
            <h3 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.06em] text-white">
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
          <p className="text-sm font-semibold leading-7 text-white/80">
            {description}
          </p>

          {type === "SHORTFALL" ? (
            <div className="mt-4 rounded-[24px] border-2 border-black bg-[#FFE500] px-4 py-3 text-sm font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Need{" "}
                <span className="font-black text-black">{shortfallPts}</span>{" "}
                more points for this chapter.
              </div>
            ) : null}

          {offer ? (
            <div className="mt-4 rounded-[24px] border-2 border-white/20 bg-black p-4 text-sm text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black uppercase tracking-[0.01em] text-white">
                  {offer.title || offer.name}
                </span>
                {offerBadge ? (
                  <span className="rounded-full border-2 border-black bg-[#00E5FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
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
                <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-white/75">
                  {offerSavingsText}
                </p>
              ) : null}
            </div>
          ) : null}

          {Array.isArray(compareItems) && compareItems.length > 0 ? (
            <div className="mt-4 rounded-[24px] border-2 border-white/20 bg-black p-4 text-sm text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
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
            <div className="mt-4 rounded-[24px] border-2 border-white/20 bg-black px-4 py-4 text-sm text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                {tipsTitle}
              </p>
              {tips.map((tip) => (
                <div key={tip} className="flex gap-2">
                  <span className="font-black text-[#FF007A]">
                    -
                  </span>
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
