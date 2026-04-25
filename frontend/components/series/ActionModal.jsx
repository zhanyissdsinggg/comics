"use client";

function getActionClass(variant) {
  if (variant === "secondary") {
    return "rounded-full border border-black/12 bg-white text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-black/18 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] active:translate-y-px";
  }

  return "rounded-full border border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] hover:bg-black/90 hover:shadow-[0_10px_24px_rgba(15,23,42,0.14)] active:translate-y-px";
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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/82 p-4 backdrop-blur-[6px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[34rem] overflow-hidden rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_28px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
          <div>
            <p className="inline-flex rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">
              {type === "SHORTFALL"
                ? "Keep reading"
                : type === "SUCCESS"
                  ? "Ready"
                  : "Quick note"}
            </p>
            <h3 className="mt-3 text-3xl font-semibold leading-none tracking-[-0.06em] text-black">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/12 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-black/72 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/18 hover:bg-black/[0.03] hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)] active:translate-y-px"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm leading-7 text-black/68">{description}</p>

          {type === "SHORTFALL" ? (
            <div className="mt-4 rounded-[24px] border border-amber-200/70 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] px-4 py-3 text-sm text-black/75 shadow-[0_14px_30px_rgba(245,158,11,0.08)]">
              Need{" "}
              <span className="font-semibold text-black">{shortfallPts}</span>{" "}
              more points to unlock this episode.
            </div>
          ) : null}

          {offer ? (
            <div className="mt-4 rounded-[24px] border border-black/10 bg-white p-4 text-sm text-black/68 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold tracking-[0.01em] text-black">
                  {offer.title || offer.name}
                </span>
                {offerBadge ? (
                  <span className="rounded-full border border-sky-200/70 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    {offerBadge}
                  </span>
                ) : null}
              </div>
              {offer.pricePts ? (
                <p className="mt-2 text-xs text-black/55">
                  {offer.pricePts} points
                </p>
              ) : null}
              {offerSavingsText ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/72">
                  {offerSavingsText}
                </p>
              ) : null}
            </div>
          ) : null}

          {Array.isArray(compareItems) && compareItems.length > 0 ? (
            <div className="mt-4 rounded-[24px] border border-black/10 bg-white p-4 text-sm text-black/68 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-black/45">
                {compareTitle}
              </p>
              {compareItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 py-1"
                >
                  <span>{item.label}</span>
                  <span className="text-right font-semibold text-black/55">{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {Array.isArray(tips) && tips.length > 0 ? (
            <div className="mt-4 rounded-[24px] border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] px-4 py-4 text-sm text-black/68">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-black/45">
                {tipsTitle}
              </p>
              {tips.map((tip) => (
                <div key={tip} className="flex gap-2">
                  <span className="font-semibold text-rose-500">
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
                className={`px-4 py-2.5 text-sm font-semibold tracking-[0.02em] transition ${getActionClass(action.variant)}`}
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
