"use client";

import { X } from "lucide-react";

export default function ModalBase({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in dark:bg-black/78"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[30px] border-[3px] border-black bg-white p-6 shadow-[12px_12px_0_0_rgba(0,0,0,1)] animate-slide-up dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(19,24,35,0.98),rgba(13,18,27,0.98))] dark:shadow-[0_32px_90px_rgba(0,0,0,0.34)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),transparent_28%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_32%)]" />
        <div className="pointer-events-none absolute -left-10 top-2 h-24 w-24 rounded-full bg-[#ffe500]/35 blur-3xl" />
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/55 dark:text-neutral-400">
              Account access
            </p>
            <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black dark:text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="group rounded-full border-[3px] border-black p-2 text-black/55 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffe7ec] hover:text-black active:translate-y-0 active:scale-95 dark:border-white/10 dark:text-neutral-400 dark:hover:border-white/18 dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label="Close modal"
          >
            <X
              size={20}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
          </button>
        </div>
        <div className="relative space-y-4 text-sm text-black/68 dark:text-neutral-300">
          {children}
        </div>
      </div>
    </div>
  );
}
