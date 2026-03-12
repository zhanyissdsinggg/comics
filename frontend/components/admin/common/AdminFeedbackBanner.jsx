import React from 'react';

export function AdminFeedbackBanner({
  feedback,
  onDismiss,
  className = '',
  dismissLabel = 'Dismiss',
  dismissAriaLabel,
}) {
  if (!feedback?.message) {
    return null;
  }

  const tone =
    feedback.type === 'error'
      ? 'border-red-500/25 bg-red-500/10 text-red-200'
      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';

  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${tone} ${className}`.trim()}>
      <p>{feedback.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissAriaLabel || dismissLabel}
        className="rounded-md px-2 py-1 text-xs font-medium text-current opacity-80 transition hover:opacity-100"
      >
        {dismissLabel}
      </button>
    </div>
  );
}