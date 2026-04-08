"use client";

function getActionClass(variant) {
  if (variant === "secondary") {
    return "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]";
  }

  return "border-transparent bg-slate-950 text-white hover:bg-slate-800";
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
  compareTitle = "Your options",
  tips,
  tipsTitle = "Worth knowing",
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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(15,23,42,0.28)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[34rem] rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {type === "SHORTFALL"
                ? "Keep reading"
                : type === "SUCCESS"
                  ? "Ready"
                  : "Quick note"}
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-black/12 hover:bg-[#f8f9fc]"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>

        {type === "SHORTFALL" ? (
          <div className="mt-4 rounded-[22px] border border-[rgba(0,113,227,0.14)] bg-[rgba(0,113,227,0.06)] px-4 py-3 text-sm text-slate-700">
            Need{" "}
            <span className="font-semibold text-slate-950">{shortfallPts}</span>{" "}
            more points to unlock this episode.
          </div>
        ) : null}

        {offer ? (
          <div className="mt-4 rounded-[24px] border border-black/6 bg-white/84 p-4 text-sm text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-950">
                {offer.title || offer.name}
              </span>
              {offerBadge ? (
                <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {offerBadge}
                </span>
              ) : null}
            </div>
            {offer.pricePts ? (
              <p className="mt-2 text-xs text-slate-500">
                {offer.pricePts} points
              </p>
            ) : null}
            {offerSavingsText ? (
              <p className="mt-2 text-xs font-semibold text-[var(--gush-accent-strong,#0058cc)]">
                {offerSavingsText}
              </p>
            ) : null}
          </div>
        ) : null}

        {Array.isArray(compareItems) && compareItems.length > 0 ? (
          <div className="mt-4 rounded-[24px] border border-black/6 bg-white/84 p-4 text-sm text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {compareTitle}
            </p>
            {compareItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 py-1"
              >
                <span>{item.label}</span>
                <span className="text-right text-slate-500">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {Array.isArray(tips) && tips.length > 0 ? (
          <div className="mt-4 rounded-[24px] border border-black/6 bg-[#f8f9fc] px-4 py-4 text-sm text-slate-600">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {tipsTitle}
            </p>
            {tips.map((tip) => (
              <div key={tip} className="flex gap-2">
                <span className="text-[var(--gush-accent-strong,#0058cc)]">
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
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${getActionClass(action.variant)}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
