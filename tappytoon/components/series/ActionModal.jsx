"use client";

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
  tips,
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
            label: "OK",
            onClick: onClose,
            variant: "primary",
          },
        ];

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{description}</p>
        {type === "SHORTFALL" ? (
          <p>Need {shortfallPts} POINTS more.</p>
        ) : null}
        {offer ? (
          <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-300">
            <div className="flex items-center justify-between gap-2">
              <span>{offer.title || offer.name}</span>
              {offerBadge ? (
                <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px]">
                  {offerBadge}
                </span>
              ) : null}
            </div>
            {offer.pricePts ? (
              <p className="mt-2 text-[11px] text-neutral-400">
                Price {offer.pricePts} POINTS
              </p>
            ) : null}
            {offerSavingsText ? (
              <p className="mt-2 text-[10px] text-emerald-300">{offerSavingsText}</p>
            ) : null}
          </div>
        ) : null}
        {Array.isArray(compareItems) && compareItems.length > 0 ? (
          <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-[11px] text-neutral-300">
            {compareItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-neutral-400">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        {Array.isArray(tips) && tips.length > 0 ? (
          <div className="mt-3 space-y-1 text-[11px] text-neutral-400">
            {tips.map((tip) => (
              <div key={tip}>- {tip}</div>
            ))}
          </div>
        ) : null}
        <div className="modal-actions">
          {resolvedActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              data-variant={action.variant}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

