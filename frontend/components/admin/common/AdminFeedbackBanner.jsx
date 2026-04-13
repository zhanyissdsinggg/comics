import React from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminFeedbackBanner({
  feedback,
  onDismiss,
  className = "",
  dismissLabel = "关闭",
  dismissAriaLabel,
}) {
  if (!feedback?.message) {
    return null;
  }

  const tone =
    feedback.type === "error"
      ? "border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(254,242,242,0.96))] text-red-700"
      : "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.95))] text-emerald-700";
  const Icon = feedback.type === "error" ? CircleAlert : CheckCircle2;

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-[24px] border px-4 py-3 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02] ${tone} ${className}`.trim()}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/12 bg-white/70">
          <Icon className="h-4 w-4" />
        </div>
        <p className="leading-6">{feedback.message}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onDismiss}
        aria-label={dismissAriaLabel || dismissLabel}
        className="mt-0.5 shrink-0"
      >
        {dismissLabel}
      </Button>
    </div>
  );
}
