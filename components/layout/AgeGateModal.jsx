"use client";

import { useEffect, useState } from "react";
import ModalBase from "../common/ModalBase";
import { AGE_GATE_TITLE } from "../../lib/adultGateCopy";
import { AGE_RULES } from "../../lib/ageRules";

export default function AgeGateModal({ open, onClose, onConfirm, ageRuleKey, legalAge }) {
  const [selectedRule, setSelectedRule] = useState(ageRuleKey || "global");
  const currentAge = AGE_RULES[selectedRule]?.legalAge || legalAge;

  useEffect(() => {
    if (open) {
      setSelectedRule(ageRuleKey || "global");
    }
  }, [ageRuleKey, open]);

  return (
    <ModalBase open={open} title={AGE_GATE_TITLE} onClose={onClose}>
      <p>You must be at least {currentAge} years old.</p>
      <div className="space-y-2">
        {Object.entries(AGE_RULES).map(([key, rule]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="age-rule"
              value={key}
              checked={selectedRule === key}
              onChange={() => setSelectedRule(key)}
            />
            {rule.label} ({rule.legalAge}+)
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(selectedRule)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
        >
          Confirm
        </button>
      </div>
    </ModalBase>
  );
}
