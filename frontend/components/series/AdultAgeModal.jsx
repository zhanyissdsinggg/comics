"use client";

import { AGE_GATE_TITLE } from "../../lib/adultGateCopy";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

export default function AdultAgeModal({ open, onClose, onConfirm, legalAge }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/82 p-4 backdrop-blur-[6px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(21,18,31,0.98)_0%,rgba(14,12,20,0.98)_100%)] p-6 text-white shadow-[0_28px_80px_rgba(6,5,16,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/56">
          Mature access
        </p>
        <h3 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">
          {AGE_GATE_TITLE}
        </h3>
        <p className="mt-3 text-sm leading-7 text-white/72">
          You must be at least {legalAge} years old to access mature content.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 text-sm ${storefrontSecondaryButtonClass}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 text-sm ${storefrontPrimaryButtonClass}`}
          >
            I confirm
          </button>
        </div>
      </div>
    </div>
  );
}
