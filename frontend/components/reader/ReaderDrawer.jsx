"use client";

import { useEffect, useState } from "react";
import Pill from "../common/Pill";
import { trackEvent } from "../../lib/trackEvent";
import {
  formatInstallmentLabel,
  getInstallmentLabel,
} from "../../lib/seriesFormatLabels";

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
  seriesType,
}) {
  const [tab, setTab] = useState("toc");
  const installmentPlural = getInstallmentLabel(seriesType, { plural: true });

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
                  ? "border-2 border-black bg-[#FFE500] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  : "border-2 border-white/15 bg-black text-neutral-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#111111]"
              }`}
            >
              {installmentPlural}
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarks")}
              aria-pressed={tab === "bookmarks"}
              className={`rounded-full px-3 py-1 transition-[background-color,border-color,box-shadow,transform] duration-200 ${
                tab === "bookmarks"
                  ? "border-2 border-black bg-[#FFE500] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  : "border-2 border-white/15 bg-black text-neutral-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#111111]"
              }`}
            >
              Bookmarks
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-white/15 bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-200 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-[#111111] active:translate-y-px"
          >
            Close
          </button>
        </div>
        {onSubscribe ? (
          <div className="mt-4 rounded-[22px] border-2 border-white/12 bg-black p-3 text-xs text-neutral-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between gap-3">
              <span>Plans can unlock free reads.</span>
              <button
                type="button"
                onClick={() => {
                  trackEvent("click_subscribe_from_toc", { seriesId: currentSeriesId });
                  onSubscribe();
                }}
                className="rounded-full border-2 border-white/20 bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111] active:translate-y-px"
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
                ? "Current"
                : unlocked
                  ? "Ready"
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
                  className="w-full rounded-[22px] border-2 border-white/12 bg-black px-3 py-2 text-left text-sm text-neutral-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-[#111111]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {formatInstallmentLabel(seriesType, episode.number)} {episode.title}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {helperLabel}
                      </div>
                    </div>
                    {isCurrentEpisode ? <Pill>Reading</Pill> : unlocked ? <Pill>Ready</Pill> : <Pill>Locked</Pill>}
                  </div>
                </button>
              );
            })}
            </div>
          ) : (
            <div className="space-y-2 pb-6">
            {bookmarks.length === 0 ? (
              <div className="rounded-[22px] border-2 border-white/12 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-sm font-black uppercase tracking-[0.04em] text-neutral-100">No bookmarks yet.</div>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="rounded-[22px] border-2 border-white/12 bg-black px-3 py-2 text-sm text-neutral-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{bookmark.label}</div>
                      <div className="text-xs text-neutral-400">
                        {formatInstallmentLabel(seriesType, bookmark.episodeId)} - {formatPercent(bookmark.percent)}
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
                    className="mt-2 w-full rounded-full border-2 border-white/20 bg-black px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111] active:translate-y-px"
                  >
                    Go there
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
