"use client";

export default function ActionModal({
  open,
  type,
  title,
  description,
  shortfallPts,
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
          <p>Need {shortfallPts} pts more.</p>
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
