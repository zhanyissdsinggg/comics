"use client";

function getActionClass(variant) {
  if (variant === "secondary") {
    return "border-[3px] border-black bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff7cf] hover:shadow-none";
  }

  return "border-[3px] border-black bg-[#ff007a] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none";
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
        className="w-full max-w-[34rem] overflow-hidden border-[4px] border-black bg-white shadow-[14px_14px_0_0_rgba(255,0,122,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b-[4px] border-black bg-[#ffe500] p-5">
          <div>
            <p className="inline-flex -rotate-1 border-[2px] border-black bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#ffe500]">
              {type === "SHORTFALL"
                ? "Keep reading"
                : type === "SUCCESS"
                  ? "Ready"
                  : "Quick note"}
            </p>
            <h3 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.06em] text-black">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-[3px] border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ff007a] hover:text-white hover:shadow-none"
          >
            Close
          </button>
        </div>

        <div className="p-5">
        <p className="text-sm leading-7 text-black/68">{description}</p>

        {type === "SHORTFALL" ? (
          <div className="mt-4 border-[3px] border-black bg-[#fff7cf] px-4 py-3 text-sm text-black/75 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
            Need{" "}
            <span className="font-black text-black">{shortfallPts}</span>{" "}
            more points to unlock this episode.
          </div>
        ) : null}

        {offer ? (
          <div className="mt-4 border-[3px] border-black bg-white p-4 text-sm text-black/68 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black uppercase tracking-[0.04em] text-black">
                {offer.title || offer.name}
              </span>
              {offerBadge ? (
                <span className="border-[2px] border-black bg-[#eefcff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
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
              <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-[#ff007a]">
                {offerSavingsText}
              </p>
            ) : null}
          </div>
        ) : null}

        {Array.isArray(compareItems) && compareItems.length > 0 ? (
          <div className="mt-4 border-[3px] border-black bg-white p-4 text-sm text-black/68 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
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
          <div className="mt-4 border-[3px] border-black bg-[#fff1f7] px-4 py-4 text-sm text-black/68">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-black/45">
              {tipsTitle}
            </p>
            {tips.map((tip) => (
              <div key={tip} className="flex gap-2">
                <span className="font-black text-[#ff007a]">
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
              className={`px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] transition ${getActionClass(action.variant)}`}
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
