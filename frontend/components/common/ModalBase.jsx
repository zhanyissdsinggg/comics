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
        className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-0 text-black shadow-[0_28px_60px_rgba(15,23,42,0.18)] animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute right-6 top-6 h-16 w-16 rounded-full bg-sky-100/70 blur-2xl" />
        <div className="pointer-events-none absolute bottom-5 left-5 h-14 w-14 rounded-full bg-slate-100 blur-2xl" />
        <div className="relative border-b border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">
                Account access
              </p>
              <h3 className="mt-3 text-3xl font-semibold leading-none tracking-[-0.06em] text-black sm:text-4xl">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="group rounded-full border border-black/10 bg-white p-2 text-black/55 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_12px_26px_rgba(15,23,42,0.1)] active:translate-y-px"
              aria-label="Close modal"
            >
              <X
                size={20}
                className="transition-transform duration-300 group-hover:rotate-90"
              />
            </button>
          </div>
        </div>
        <div className="relative space-y-4 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] px-5 py-5 text-sm text-black/72 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
