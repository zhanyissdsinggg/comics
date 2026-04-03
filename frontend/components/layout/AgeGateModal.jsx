"use client";

import { useEffect } from "react";
import { AlertTriangle, ChevronRight, ShieldAlert } from "lucide-react";
import { AGE_RULES } from "../../lib/ageRules";
import { Button } from "@/components/ui/button";

export default function AgeGateModal({ open, onClose, onConfirm, ageRuleKey, legalAge }) {
  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const normalizedRule = AGE_RULES[ageRuleKey] ? ageRuleKey : "global";
  const currentAge = AGE_RULES[normalizedRule]?.legalAge || legalAge;
  const regionLabel = AGE_RULES[normalizedRule]?.label || "your current region";

  return (
    <div
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-[rgba(15,23,42,0.58)] px-4 py-6 backdrop-blur-md dark:bg-[rgba(2,6,12,0.72)]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_32px_120px_rgba(15,23,42,0.28)] sm:p-7 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(18,24,35,0.98),rgba(12,18,28,0.98))] dark:shadow-[0_34px_120px_rgba(0,0,0,0.36)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-gate-title"
        aria-describedby="adult-gate-description"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.08),transparent_24%)]" />
        <div className="relative">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-[rgba(168,85,247,0.14)] bg-[rgba(168,85,247,0.08)] text-[var(--gush-accent,#6d28d9)]">
            <ShieldAlert className="size-5" strokeWidth={2} />
          </div>

          <p className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-neutral-400">
            <AlertTriangle className="size-3.5" />
            18+ access
          </p>
          <h2 id="adult-gate-title" className="mt-3 font-display text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[2.35rem]">
            Adult Content Warning
          </h2>
          <p id="adult-gate-description" className="mt-4 text-sm leading-7 text-slate-600 dark:text-neutral-300 sm:text-[15px]">
            This section contains material meant for adults only. Are you {currentAge} years of age or older?
          </p>

          <div className="mt-5 rounded-[24px] border border-[rgba(109,40,217,0.12)] bg-[rgba(109,40,217,0.06)] px-4 py-4 dark:border-white/10 dark:bg-white/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-neutral-400">
              Region check
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {regionLabel} requires {currentAge}+ access for this catalog.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">
              We remember this choice on this device so you do not need to confirm again during future visits.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 rounded-full px-5 text-sm font-semibold text-slate-600 hover:bg-black/[0.04] hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              No, take me back
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm?.(normalizedRule)}
              className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Yes, I am {currentAge} or older
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
