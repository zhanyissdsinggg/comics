"use client";

export default function ReaderTopBar({
  title,
  episodeLabel,
  onBack,
  onPrev,
  onNext,
  nextLocked,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-200"
        >
          Back
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-neutral-400">{episodeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-200"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            className={`rounded-full px-3 py-1 text-xs ${
              nextLocked
                ? "border border-red-700 text-red-300"
                : "border border-neutral-800 text-neutral-200"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </header>
  );
}
