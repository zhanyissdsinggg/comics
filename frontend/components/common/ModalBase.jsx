"use client";

import { X } from "lucide-react";

export default function ModalBase({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.28)] px-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Account access
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="group rounded-full border border-black/8 p-2 text-slate-500 transition-all duration-300 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950 hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <X size={20} className="transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>
        <div className="space-y-4 text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}
