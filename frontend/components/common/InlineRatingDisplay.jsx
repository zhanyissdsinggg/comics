"use client";

function formatScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  return numeric.toFixed(1).replace(/\.0$/, "");
}

function formatRatingCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  if (numeric >= 1000000) {
    return `${(numeric / 1000000)
      .toFixed(numeric >= 10000000 ? 0 : 1)
      .replace(/\.0$/, "")}M`;
  }

  if (numeric >= 1000) {
    return `${(numeric / 1000)
      .toFixed(numeric >= 10000 ? 0 : 1)
      .replace(/\.0$/, "")}K`;
  }

  return numeric.toLocaleString();
}

export default function InlineRatingDisplay({ score, ratingCount, className = "" }) {
  const formattedScore = formatScore(score);
  const formattedCount = formatRatingCount(ratingCount);

  if (!formattedScore) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 align-middle text-xs font-medium text-slate-600 ${className}`.trim()}
    >
      <span>{formattedScore}</span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-3.5 flex-shrink-0 text-amber-500"
        fill="currentColor"
      >
        <path d="M12 2.75l2.84 5.76 6.36.92-4.6 4.48 1.08 6.33L12 17.26 6.32 20.24l1.08-6.33-4.6-4.48 6.36-.92L12 2.75z" />
      </svg>
      {formattedCount ? <span>({formattedCount})</span> : null}
    </span>
  );
}
