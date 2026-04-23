"use client";

import { X } from "lucide-react";

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
        className="relative w-full max-w-xl overflow-hidden border-[4px] border-black bg-[#fff6cf] p-0 text-black shadow-[14px_14px_0_0_rgba(255,0,122,1)] animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rotate-12 border-[4px] border-black bg-[#00e5ff]" />
        <div className="pointer-events-none absolute -bottom-7 left-8 h-16 w-16 rotate-12 border-[4px] border-black bg-[#ff007a]" />
        <div className="relative border-b-[4px] border-black bg-[#ffe500] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
          <div>
            <p className="inline-flex -rotate-1 border-[2px] border-black bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#ffe500]">
              Account access
            </p>
            <h3 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.06em] text-black sm:text-4xl">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="group border-[3px] border-black bg-white p-2 text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ff007a] hover:text-white hover:shadow-none active:scale-95"
            aria-label="Close modal"
          >
            <X
              size={20}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
          </button>
          </div>
        </div>
        <div className="relative space-y-4 bg-white px-5 py-5 text-sm text-black/72 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
