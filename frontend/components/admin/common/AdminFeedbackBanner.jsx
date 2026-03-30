import React from "react";

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
      ? "border-red-200 bg-red-50/90 text-red-700"
      : "border-emerald-200 bg-emerald-50/90 text-emerald-700";

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-[24px] border px-4 py-3 text-sm shadow-[var(--gush-shadow-soft)] ${tone} ${className}`.trim()}
    >
      <p className="leading-6">{feedback.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissAriaLabel || dismissLabel}
        className="rounded-full px-2 py-1 text-xs font-semibold text-current opacity-80 transition hover:opacity-100"
      >
        {dismissLabel}
      </button>
    </div>
  );
}
