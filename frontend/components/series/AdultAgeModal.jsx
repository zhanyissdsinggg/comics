"use client";

import { AGE_GATE_TITLE } from "../../lib/adultGateCopy";

export default function AdultAgeModal({ open, onClose, onConfirm, legalAge }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[6px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[30px] border-[3px] border-black bg-[#fffdf7] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
          Age check
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-black">
          {AGE_GATE_TITLE}
        </h3>
        <p className="mt-3 text-sm leading-7 text-black/68">
          You must be at least {legalAge} years old to access mature content.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full border-[3px] border-black bg-[#ff007a] px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          >
            I confirm
          </button>
        </div>
      </div>
    </div>
  );
}
