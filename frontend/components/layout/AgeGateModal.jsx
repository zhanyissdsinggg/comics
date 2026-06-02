"use client";

import { useEffect } from "react";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { AGE_RULES } from "../../lib/ageRules";
import {
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-[rgba(8,7,15,0.76)] px-4 py-6 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(22,19,35,0.98)_0%,rgba(14,12,24,0.98)_100%)] text-white shadow-[0_28px_80px_rgba(0,0,0,0.46)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-gate-title"
        aria-describedby="adult-gate-description"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,137,177,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,233,246,0.14),transparent_30%)]" />
        <div className="relative border-b border-white/10 p-6 sm:p-7">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-[rgba(245,137,177,0.24)] bg-[rgba(245,137,177,0.12)] text-[#ffd9e6] shadow-[0_12px_26px_rgba(245,137,177,0.16)]">
            <ShieldAlert className="size-5" strokeWidth={2} />
          </div>

          <p className={`mt-5 ${storefrontBadgeClass} text-white/70`}>
            Mature access
          </p>
          <h2
            id="adult-gate-title"
            className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.3rem]"
          >
            Confirm your age
          </h2>
          <p
            id="adult-gate-description"
            className="mt-4 text-sm leading-7 text-white/72 sm:text-[15px]"
          >
            Mature titles are only available to readers who meet the legal age
            requirement for their region.
          </p>
        </div>

        <div className="relative p-6 sm:p-7">
          <div className={`${storefrontInfoCardClass} px-4 text-white`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
              Region check
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              {regionLabel} requires {currentAge}+ access for mature titles.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/64">
              This MVP stores verification status on the device. No document
              images or raw sensitive data are saved.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className={`${storefrontSecondaryButtonClass} px-5 text-white`}
            >
              Not now
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm?.(normalizedRule)}
              className={`${storefrontPrimaryButtonClass} px-5 text-[#25111f]`}
            >
              I am {currentAge} or older
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
