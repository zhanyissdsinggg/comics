"use client";

import useCountdown from "../../hooks/useCountdown";

export default function EndOfEpisodeOverlay({
  open,
  nextEpisode,
  nextUnlocked,
  onNext,
  onUnlock,
  onSubscribe,
  onClaim,
  onNotify,
}) {
  if (!open || !nextEpisode) {
    return null;
  }

  const readyAtMs = nextEpisode.ttfReadyAt
    ? Date.parse(nextEpisode.ttfReadyAt)
    : null;
  const { isReady, formatted } = useCountdown(readyAtMs);
  const showTtf = Boolean(nextEpisode.ttfEligible);

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/95 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">Next Episode</p>
            <p className="text-lg font-semibold">{nextEpisode.title}</p>
          </div>
          {nextUnlocked ? (
            <button
              type="button"
              onClick={onNext}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
            >
              Next
            </button>
          ) : null}
        </div>

        {!nextUnlocked ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onUnlock}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
            >
              Unlock Next ({nextEpisode.pricePts} PTS)
            </button>
            <button
              type="button"
              onClick={onSubscribe}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
            >
              Subscribe
            </button>
            <button
              type="button"
              onClick={() => onNotify?.()}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
            >
              Pack Offer (3/10)
            </button>
            {showTtf ? (
              isReady ? (
                <button
                  type="button"
                  onClick={onClaim}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
                >
                  Claim Free
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-full border border-neutral-800 px-4 py-2 text-xs text-neutral-300">
                  <span>TTF in {formatted || "--:--:--"}</span>
                  <button
                    type="button"
                    onClick={() => onNotify?.()}
                    className="rounded-full border border-neutral-700 px-3 py-1 text-[10px]"
                  >
                    Notify me
                  </button>
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
