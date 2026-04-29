"use client";

import { X } from "lucide-react";
import { storefrontSecondaryButtonClass } from "./StorefrontPagePrimitives";

export default function ModalBase({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[26px] border-2 border-black bg-[#0b0b0b] p-0 text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b-2 border-black bg-black px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full border-2 border-black bg-[#0b0b0b] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                Account access
              </p>
              <h3 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.06em] text-white sm:text-4xl">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="group rounded-full border-2 border-black bg-[#FFE500] p-2 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-px"
              aria-label="Close modal"
            >
              <X
                size={20}
                className="transition-transform duration-300 group-hover:rotate-90"
              />
            </button>
          </div>
        </div>
        <div className="relative space-y-4 bg-[#0b0b0b] px-5 py-5 text-sm text-white/80 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
