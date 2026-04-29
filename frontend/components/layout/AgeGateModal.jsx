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
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-black/82 px-4 py-6 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[30px] border-2 border-[#FFE500] bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-gate-title"
        aria-describedby="adult-gate-description"
      >
        <div className="relative border-b-2 border-[#FFE500] bg-black p-6 sm:p-7">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl border-2 border-black bg-[#FF007A] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <ShieldAlert className="size-5" strokeWidth={2} />
          </div>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <AlertTriangle className="size-3.5" />
            18+ access
          </p>
          <h2
            id="adult-gate-title"
            className="mt-3 text-[2rem] font-black tracking-[-0.04em] text-white sm:text-[2.35rem]"
          >
            Adult Access Check
          </h2>
          <p
            id="adult-gate-description"
            className="mt-4 text-sm leading-7 text-white/70 sm:text-[15px]"
          >
            Adults only. Are you {currentAge} or older?
          </p>
        </div>

        <div className="p-6 sm:p-7">

          <div className="rounded-[24px] border-2 border-white/20 bg-[#0a0a0a] px-4 py-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
              Region check
            </p>
            <p className="mt-2 text-sm font-semibold tracking-[0.01em] text-white">
              {regionLabel} requires {currentAge}+ access for this catalog.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Saved on this device.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 rounded-full border-2 border-white/20 bg-black px-5 text-sm font-black uppercase tracking-[0.02em] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:border-white/35 hover:bg-[#111111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              No, take me back
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm?.(normalizedRule)}
              className="h-11 rounded-full border-2 border-black bg-[#00E5FF] px-5 text-sm font-black uppercase tracking-[0.02em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
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
