"use client";

import { useEffect, useState } from "react";
import Pill from "../common/Pill";
import { track } from "../../lib/analytics";

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="w-full max-w-full border-l border-neutral-800 bg-neutral-950 px-4 py-5 sm:max-w-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setTab("toc")}
              className={`rounded-full px-3 py-1 ${
                tab === "toc" ? "bg-white text-neutral-900" : "border border-neutral-800 text-neutral-300"
              }`}
            >
              Contents
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarks")}
              className={`rounded-full px-3 py-1 ${
                tab === "bookmarks"
                  ? "bg-white text-neutral-900"
                  : "border border-neutral-800 text-neutral-300"
              }`}
            >
              Bookmarks
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300"
          >
            Close
          </button>
        </div>
        {onSubscribe ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-300">
            <div className="flex items-center justify-between gap-3">
              <span>Unlock more with subscription perks.</span>
              <button
                type="button"
                onClick={() => {
                  track("click_subscribe_from_toc", { seriesId: currentSeriesId });
                  onSubscribe();
                }}
                className="rounded-full border border-neutral-700 px-3 py-1 text-[10px]"
              >
                Subscribe for perks
              </button>
            </div>
          </div>
        ) : null}

        {tab === "toc" ? (
          <div className="mt-4 space-y-2">
            {episodes.map((episode) => {
              const unlocked = unlockedIds.includes(episode.id);
              return (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => {
                    if (unlocked || episode.id === currentEpisodeId) {
                      onSelectEpisode(episode.id);
                    }
                  }}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-left text-sm text-neutral-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        Ep {episode.number} {episode.title}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {episode.id === currentEpisodeId ? "Now reading" : "Tap to open"}
                      </div>
                    </div>
                    {unlocked ? <Pill>Unlocked</Pill> : <Pill>Locked</Pill>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {bookmarks.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-400">
                No bookmarks yet.
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-200"
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
                    className="mt-2 w-full rounded-full border border-neutral-700 px-3 py-1 text-xs"
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
  );
}
