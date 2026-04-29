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
        className="w-full max-w-md rounded-[30px] border-2 border-white/20 bg-black/95 p-6 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
          Age check
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-white">
          {AGE_GATE_TITLE}
        </h3>
        <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
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
