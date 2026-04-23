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
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[32px] border-[3px] border-black bg-[#fffdf7] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-gate-title"
        aria-describedby="adult-gate-description"
      >
        <div className="relative">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl border-[3px] border-black bg-[#ffe500] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <ShieldAlert className="size-5" strokeWidth={2} />
          </div>

          <p className="mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
            <AlertTriangle className="size-3.5" />
            18+ access
          </p>
          <h2
            id="adult-gate-title"
            className="mt-3 text-[2rem] font-black uppercase tracking-[0.04em] text-black sm:text-[2.35rem]"
          >
            Adult Access Check
          </h2>
          <p
            id="adult-gate-description"
            className="mt-4 text-sm leading-7 text-black/68 sm:text-[15px]"
          >
            Adults only. Are you {currentAge} or older?
          </p>

          <div className="mt-5 rounded-[24px] border-[3px] border-black bg-[#eefcff] px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              Region check
            </p>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.03em] text-black">
              {regionLabel} requires {currentAge}+ access for this catalog.
            </p>
            <p className="mt-2 text-sm leading-6 text-black/68">
              Saved on this device after you confirm.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 rounded-full border-[3px] border-black bg-white px-5 text-sm font-black uppercase tracking-[0.06em] text-black hover:bg-[#fff1f7]"
            >
              No, take me back
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm?.(normalizedRule)}
              className="h-11 rounded-full border-[3px] border-black bg-[#ff007a] px-5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
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
