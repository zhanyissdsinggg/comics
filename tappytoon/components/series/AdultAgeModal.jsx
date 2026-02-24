"use client";

import { AGE_GATE_TITLE } from "../../lib/adultGateCopy";

export default function AdultAgeModal({
  open,
  onClose,
  onConfirm,
  ageRuleKey,
  legalAge,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true">
        <h3>{AGE_GATE_TITLE}</h3>
        <p>
          You must be at least {legalAge} years old ({ageRuleKey} policy).
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            I confirm
          </button>
        </div>
      </div>
    </div>
  );
}
