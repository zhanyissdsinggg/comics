"use client";

import { AGE_GATE_TITLE } from "../../lib/adultGateCopy";

export default function AdultAgeModal({
  open,
  onClose,
  onConfirm,
  legalAge,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(15,23,42,0.28)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Age check
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
          {AGE_GATE_TITLE}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          You must be at least {legalAge} years old to access mature content.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            I confirm
          </button>
        </div>
      </div>
    </div>
  );
}
