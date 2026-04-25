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
        className="w-full max-w-md rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.14)]"
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
            className="rounded-full border border-black/12 bg-white px-4 py-2.5 text-sm font-semibold tracking-[0.02em] text-black transition hover:border-black/18 hover:bg-black/[0.03]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full border border-black bg-black px-4 py-2.5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-black/90"
          >
            I confirm
          </button>
        </div>
      </div>
    </div>
  );
}
