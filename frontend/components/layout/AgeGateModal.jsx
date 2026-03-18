"use client";

import ModalBase from "../common/ModalBase";
import { AGE_GATE_TITLE } from "../../lib/adultGateCopy";
import { AGE_RULES } from "../../lib/ageRules";

export default function AgeGateModal({ open, onClose, onConfirm, ageRuleKey, legalAge }) {
  const normalizedRule = AGE_RULES[ageRuleKey] ? ageRuleKey : "global";
  const currentAge = AGE_RULES[normalizedRule]?.legalAge || legalAge;
  const regionLabel = AGE_RULES[normalizedRule]?.label || "your current region";

  return (
    <ModalBase open={open} title={AGE_GATE_TITLE} onClose={onClose}>
      <div className="space-y-3 text-sm text-slate-600">
        <p>You must be at least {currentAge} years old to access mature content.</p>
        <div className="rounded-2xl border border-black/8 bg-white/84 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Region rule
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {regionLabel} ({currentAge}+)
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          I confirm
        </button>
      </div>
    </ModalBase>
  );
}
