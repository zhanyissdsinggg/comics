"use client";

import { useEffect, useState } from "react";
import Pill from "../common/Pill";
import {
  storefrontChipClass,
  storefrontHighlightBadgeClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
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
        className="flex h-full w-full max-w-full flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(17,18,30,0.98)_0%,rgba(10,12,20,0.99)_100%)] px-4 py-5 shadow-[-20px_0_44px_rgba(0,0,0,0.28)] sm:max-w-sm"
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
              className={`px-3 py-1 transition-[background-color,border-color,box-shadow,transform] duration-200 ${
                tab === "toc"
                  ? `${storefrontHighlightBadgeClass} border border-cyan-300/28 bg-[linear-gradient(135deg,rgba(86,215,255,0.24)_0%,rgba(124,92,255,0.18)_100%)] text-white shadow-[0_14px_28px_rgba(86,215,255,0.16)]`
                  : `${storefrontChipClass} text-white/72 hover:bg-[rgba(255,255,255,0.075)]`
              }`}
            >
              {installmentPlural}
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarks")}
              aria-pressed={tab === "bookmarks"}
              className={`px-3 py-1 transition-[background-color,border-color,box-shadow,transform] duration-200 ${
                tab === "bookmarks"
                  ? `${storefrontHighlightBadgeClass} border border-cyan-300/28 bg-[linear-gradient(135deg,rgba(86,215,255,0.24)_0%,rgba(124,92,255,0.18)_100%)] text-white shadow-[0_14px_28px_rgba(86,215,255,0.16)]`
                  : `${storefrontChipClass} text-white/72 hover:bg-[rgba(255,255,255,0.075)]`
              }`}
            >
              Bookmarks
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${storefrontChipClass} min-h-[32px] px-3 py-1 text-xs uppercase tracking-[0.1em] text-white/76 active:translate-y-px`}
          >
            Close
          </button>
        </div>
        {onSubscribe ? (
          <div className={`mt-4 ${storefrontSoftCardClass} p-3 text-xs text-white/68`}>
            <div className="flex items-center justify-between gap-3">
              <span>Plans can unlock free reads.</span>
              <button
                type="button"
                onClick={() => {
                  trackEvent("click_subscribe_from_toc", {
                    seriesId: currentSeriesId,
                  });
                  onSubscribe();
                }}
                className={`${storefrontChipClass} min-h-[30px] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] hover:-translate-y-0.5 active:translate-y-px`}
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
                    className={`w-full ${storefrontSoftCardClass} px-3 py-2 text-left text-sm text-white/78 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-[rgba(255,255,255,0.075)]`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {formatInstallmentLabel(seriesType, episode.number)}{" "}
                          {episode.title}
                        </div>
                        <div className="text-xs text-white/46">
                          {helperLabel}
                        </div>
                      </div>
                      {isCurrentEpisode ? (
                        <Pill>Reading</Pill>
                      ) : unlocked ? (
                        <Pill>Ready</Pill>
                      ) : (
                        <Pill>Locked</Pill>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {bookmarks.length === 0 ? (
                <div className={`${storefrontSoftCardClass} p-4`}>
                  <div className="text-sm font-black uppercase tracking-[0.04em] text-white">
                    No bookmarks yet.
                  </div>
                </div>
              ) : (
                bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className={`${storefrontSoftCardClass} px-3 py-2 text-sm text-white/78`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{bookmark.label}</div>
                        <div className="text-xs text-white/46">
                          {formatInstallmentLabel(
                            seriesType,
                            bookmark.episodeId,
                          )}{" "}
                          - {formatPercent(bookmark.percent)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveBookmark(bookmark.id)}
                        className="text-xs font-black uppercase tracking-[0.08em] text-white/44 hover:text-white/76"
                      >
                        Remove
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onGoBookmark(bookmark)}
                      className={`${storefrontChipClass} mt-2 w-full justify-center px-3 py-1 text-xs font-black uppercase tracking-[0.08em] hover:-translate-y-0.5 active:translate-y-px`}
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
