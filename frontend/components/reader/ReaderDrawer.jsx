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
      <div className="flex h-full w-full max-w-full flex-col border-l-[3px] border-black bg-[#111111] px-4 py-5 shadow-[-10px_0_0_0_rgba(0,0,0,1)] sm:max-w-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setTab("toc")}
              className={`rounded-full px-3 py-1 ${
                tab === "toc"
                  ? "border-[3px] border-black bg-[#ffe500] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                  : "border-[3px] border-white/20 bg-white/10 text-neutral-300 hover:bg-white/20"
              }`}
            >
              Contents
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarks")}
              className={`rounded-full px-3 py-1 ${
                tab === "bookmarks"
                  ? "border-[3px] border-black bg-[#00e5ff] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                  : "border-[3px] border-white/20 bg-white/10 text-neutral-300 hover:bg-white/20"
              }`}
            >
              Bookmarks
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-[3px] border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-neutral-200 transition hover:bg-white/20"
          >
            Close
          </button>
        </div>
        {onSubscribe ? (
          <div className="mt-4 border-[3px] border-white/20 bg-white/10 p-3 text-xs text-neutral-300 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <span>Members get free reads and lower prices.</span>
              <button
                type="button"
                onClick={() => {
                  trackEvent("click_subscribe_from_toc", { seriesId: currentSeriesId });
                  onSubscribe();
                }}
                className="border-[3px] border-black bg-[#ff007a] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none"
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
                  className="w-full border-[3px] border-white/20 bg-white/10 px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-white/20"
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
              <div className="border-[3px] border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-sm font-black uppercase tracking-[0.04em] text-neutral-100">No bookmarks yet.</div>
                <div className="mt-1 text-xs leading-5 text-neutral-400">
                  Save a spot and it will show up here.
                </div>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="border-[3px] border-white/20 bg-white/10 px-3 py-2 text-sm text-neutral-200 backdrop-blur-sm"
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
                    className="mt-2 w-full border-[3px] border-black bg-[#ffe500] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
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
