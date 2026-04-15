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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(15,23,42,0.46)] backdrop-blur-sm">
      <div className="flex h-full w-full max-w-full flex-col border-l border-white/8 bg-[rgba(12,12,14,0.96)] px-4 py-5 shadow-[-16px_0_44px_rgba(0,0,0,0.24)] sm:max-w-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setTab("toc")}
              className={`rounded-full px-3 py-1 ${
                tab === "toc"
                  ? "bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.08)]"
                  : "border border-white/8 bg-white/[0.04] text-neutral-300 hover:border-white/16 hover:bg-white/[0.08]"
              }`}
            >
              Contents
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarks")}
              className={`rounded-full px-3 py-1 ${
                tab === "bookmarks"
                  ? "bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.08)]"
                  : "border border-white/8 bg-white/[0.04] text-neutral-300 hover:border-white/16 hover:bg-white/[0.08]"
              }`}
            >
              Bookmarks
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300 transition hover:border-white/16 hover:bg-white/[0.08]"
          >
            Close
          </button>
        </div>
        {onSubscribe ? (
          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-xs text-neutral-300 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <span>Members get free reads and lower prices.</span>
              <button
                type="button"
                onClick={() => {
                  trackEvent("click_subscribe_from_toc", { seriesId: currentSeriesId });
                  onSubscribe();
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] transition hover:border-white/16 hover:bg-white/[0.08]"
              >
                See membership
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
              return (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => {
                    if (unlocked || isCurrentEpisode) {
                      onSelectEpisode(episode.id);
                    }
                  }}
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-left text-sm text-neutral-200 transition hover:border-white/16 hover:bg-white/[0.08]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        Ep {episode.number} {episode.title}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {isCurrentEpisode ? "Now reading" : "Tap to open"}
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
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 backdrop-blur-sm">
                <div className="text-sm font-semibold text-neutral-100">No bookmarks yet.</div>
                <div className="mt-1 text-xs leading-5 text-neutral-400">
                  Save a spot and it will show up here.
                </div>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-neutral-200 backdrop-blur-sm"
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
                      className="text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      Remove
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoBookmark(bookmark)}
                    className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs transition hover:border-white/16 hover:bg-white/[0.08]"
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
