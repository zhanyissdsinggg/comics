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
        className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_28px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-gate-title"
        aria-describedby="adult-gate-description"
      >
        <div className="relative border-b border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 sm:p-7">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-black/10 bg-[#f6f7f9] text-black shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
            <ShieldAlert className="size-5" strokeWidth={2} />
          </div>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">
            <AlertTriangle className="size-3.5" />
            18+ access
          </p>
          <h2
            id="adult-gate-title"
            className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-black sm:text-[2.35rem]"
          >
            Adult Access Check
          </h2>
          <p
            id="adult-gate-description"
            className="mt-4 text-sm leading-7 text-black/68 sm:text-[15px]"
          >
            Adults only. Are you {currentAge} or older?
          </p>
        </div>

        <div className="p-6 sm:p-7">

          <div className="rounded-[24px] border border-sky-200/70 bg-sky-50 px-4 py-4 shadow-[0_14px_30px_rgba(125,211,252,0.16)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              Region check
            </p>
            <p className="mt-2 text-sm font-semibold tracking-[0.01em] text-black">
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
              className="h-11 rounded-full border border-black/12 bg-white px-5 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-black/18 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)]"
            >
              No, take me back
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm?.(normalizedRule)}
              className="h-11 rounded-full border border-black bg-black px-5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] hover:bg-black/90 hover:shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
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
