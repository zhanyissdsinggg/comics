"use client";

import { useEffect, useState } from "react";
import Pill from "../common/Pill";
import { trackEvent } from "../../lib/trackEvent";

function formatPercent(value) {
  if (typeof value !== "number") {
    return "0%";
  }
  return `${Math.round(value * 100)}%`;
}

export default function ReaderDrawer({
  open,
  onClose,
  episodes,
  unlockedIds,
  currentSeriesId,
  currentEpisodeId,
  bookmarks,
  onSelectEpisode,
  onGoBookmark,
  onRemoveBookmark,
  onSubscribe,
}) {
  const [tab, setTab] = useState("toc");

  useEffect(() => {
    if (open) {
      setTab("toc");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[rgba(15,23,42,0.46)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-full flex-col border-l border-black/10 bg-[linear-gradient(180deg,rgba(18,20,24,0.98)_0%,rgba(13,15,18,0.99)_100%)] px-4 py-5 shadow-[-20px_0_44px_rgba(0,0,0,0.28)] sm:max-w-sm"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Reader contents"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setTab("toc")}
              aria-pressed={tab === "toc"}
              className={`rounded-full px-3 py-1 transition-[background-color,border-color,box-shadow,transform] duration-200 ${
                tab === "toc"
                  ? "border border-white/15 bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.08)]"
                  : "border border-white/15 bg-white/8 text-neutral-300 hover:bg-white/14"
              }`}
            >
              Contents
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarks")}
              aria-pressed={tab === "bookmarks"}
              className={`rounded-full px-3 py-1 transition-[background-color,border-color,box-shadow,transform] duration-200 ${
                tab === "bookmarks"
                  ? "border border-white/15 bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.08)]"
                  : "border border-white/15 bg-white/8 text-neutral-300 hover:bg-white/14"
              }`}
            >
              Bookmarks
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-200 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-white/14 hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)] active:translate-y-px"
          >
            Close
          </button>
        </div>
        {onSubscribe ? (
          <div className="mt-4 rounded-[22px] border border-white/12 bg-white/8 p-3 text-xs text-neutral-300 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <span>Plans add free reads.</span>
              <button
                type="button"
                onClick={() => {
                  trackEvent("click_subscribe_from_toc", { seriesId: currentSeriesId });
                  onSubscribe();
                }}
                className="rounded-full border border-white/18 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black shadow-[0_10px_18px_rgba(255,255,255,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-white/92 hover:shadow-[0_12px_20px_rgba(255,255,255,0.1)] active:translate-y-px"
              >
                Plans
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "toc" ? (
            <div className="space-y-2 pb-6">
            {episodes.map((episode) => {
              const isCurrentEpisode = episode.id === currentEpisodeId;
              const unlocked = unlockedIds.includes(episode.id);
              const helperLabel = isCurrentEpisode
                ? "Now reading"
                : unlocked
                  ? "Open"
                  : "Locked";
              return (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => {
                    if (unlocked || isCurrentEpisode) {
                      onSelectEpisode(episode.id);
                    }
                  }}
                  className="w-full rounded-[22px] border border-white/12 bg-white/8 px-3 py-2 text-left text-sm text-neutral-200 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-white/14 hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        Ep {episode.number} {episode.title}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {helperLabel}
                      </div>
                    </div>
                    {isCurrentEpisode ? <Pill>Reading</Pill> : unlocked ? <Pill>Unlocked</Pill> : <Pill>Locked</Pill>}
                  </div>
                </button>
              );
            })}
            </div>
          ) : (
            <div className="space-y-2 pb-6">
            {bookmarks.length === 0 ? (
              <div className="rounded-[22px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="text-sm font-black uppercase tracking-[0.04em] text-neutral-100">No bookmarks yet.</div>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="rounded-[22px] border border-white/12 bg-white/8 px-3 py-2 text-sm text-neutral-200 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{bookmark.label}</div>
                      <div className="text-xs text-neutral-400">
                        Ep {bookmark.episodeId} - {formatPercent(bookmark.percent)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bookmark.id)}
                      className="text-xs font-black uppercase tracking-[0.08em] text-neutral-400 hover:text-neutral-200"
                    >
                      Remove
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoBookmark(bookmark)}
                    className="mt-2 w-full rounded-full border border-white/18 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-black shadow-[0_10px_18px_rgba(255,255,255,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-white/92 hover:shadow-[0_12px_20px_rgba(255,255,255,0.1)] active:translate-y-px"
                  >
                    Go
                  </button>
                </div>
              ))
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
