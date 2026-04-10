"use client";

import { useEffect } from "react";
import { AlertTriangle, ChevronRight, ShieldAlert } from "lucide-react";
import { AGE_RULES } from "../../lib/ageRules";
import { Button } from "@/components/ui/button";

export default function AgeGateModal({
  open,
  onClose,
  onConfirm,
  ageRuleKey,
  legalAge,
}) {
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
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-[rgba(15,23,42,0.44)] px-4 py-6 backdrop-blur-sm dark:bg-[rgba(2,6,12,0.72)]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_22px_56px_rgba(15,23,42,0.1)] sm:p-7 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(18,24,35,0.98),rgba(12,18,28,0.98))] dark:shadow-[0_34px_120px_rgba(0,0,0,0.36)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-gate-title"
        aria-describedby="adult-gate-description"
      >
        <div className="relative">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-[var(--gush-accent,#0071e3)] shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <ShieldAlert className="size-5" strokeWidth={2} />
          </div>

          <p className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-neutral-400">
            <AlertTriangle className="size-3.5" />
            18+ access
          </p>
          <h2
            id="adult-gate-title"
            className="mt-3 font-display text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[2.35rem]"
          >
            Adult Access Check
          </h2>
          <p
            id="adult-gate-description"
            className="mt-4 text-sm leading-7 text-slate-600 dark:text-neutral-300 sm:text-[15px]"
          >
            Adults only. Are you {currentAge} or older?
          </p>

          <div className="mt-5 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 dark:border-white/10 dark:bg-white/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-neutral-400">
              Region check
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {regionLabel} requires {currentAge}+ access for this catalog.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">
              Saved on this device after you confirm.
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
              className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-slate-800"
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
