"use client";

import { cn } from "../../lib/utils";

export default function ReaderErrorState({
  isComic = false,
  installmentNoun = "",
  rootClassName = "",
  heroClassName = "",
  mutedClassName = "",
  primaryButtonClassName = "",
  secondaryButtonClassName = "",
  onRetry,
  onBack,
}) {
  const resolvedInstallment = String(
    installmentNoun || (isComic ? "chapter" : "episode"),
  ).trim();

  return (
    <main
      className={cn(
        "flex min-h-screen items-center justify-center px-4 py-20",
        rootClassName,
        isComic ? "text-white" : "text-current",
      )}
    >
      <div
        className={cn(
          "w-full max-w-xl rounded-[32px] border p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.22)]",
          heroClassName,
        )}
      >
        <p
          className={cn(
            "text-xs font-black uppercase tracking-[0.22em]",
            mutedClassName,
          )}
        >
          Reader Error
        </p>
        <h1
          className={cn(
            "mt-3 text-3xl font-black",
            isComic ? "text-white" : "text-current",
          )}
        >
          We couldn&apos;t load this {resolvedInstallment}.
        </h1>
        <p
          className={cn(
            "mx-auto mt-4 max-w-md text-sm leading-6",
            mutedClassName,
          )}
        >
          Try again in a moment, or head back to the series page and reopen this{" "}
          {resolvedInstallment} from there.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className={primaryButtonClassName}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onBack}
            className={secondaryButtonClassName}
          >
            View Series
          </button>
        </div>
      </div>
    </main>
  );
}
