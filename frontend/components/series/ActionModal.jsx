"use client";

function getActionClass(variant) {
  if (variant === "secondary") {
    return "border-[3px] border-black bg-white text-black hover:-translate-y-0.5 hover:bg-[#fff7cf]";
  }

  return "border-[3px] border-black bg-[#ff007a] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]";
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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[6px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[34rem] rounded-[30px] border-[3px] border-black bg-[#fffdf7] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b-[3px] border-black pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
              {type === "SHORTFALL"
                ? "Keep reading"
                : type === "SUCCESS"
                  ? "Ready"
                  : "Quick note"}
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-black">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-[3px] border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:bg-[#ffe500]"
          >
            Close
          </button>
        </div>

        <p className="mt-4 text-sm leading-7 text-black/68">{description}</p>

        {type === "SHORTFALL" ? (
          <div className="mt-4 rounded-[24px] border-[3px] border-black bg-[#fff7cf] px-4 py-3 text-sm text-black/75">
            Need{" "}
            <span className="font-black text-black">{shortfallPts}</span>{" "}
            more points to unlock this episode.
          </div>
        ) : null}

        {offer ? (
          <div className="mt-4 rounded-[24px] border-[3px] border-black bg-white p-4 text-sm text-black/68 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black uppercase tracking-[0.04em] text-black">
                {offer.title || offer.name}
              </span>
              {offerBadge ? (
                <span className="rounded-full border-[2px] border-black bg-[#eefcff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
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
          <div className="mt-4 rounded-[24px] border-[3px] border-black bg-white p-4 text-sm text-black/68 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
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
          <div className="mt-4 rounded-[24px] border-[3px] border-black bg-[#fff1f7] px-4 py-4 text-sm text-black/68">
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
              className={`rounded-full px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] transition ${getActionClass(action.variant)}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
