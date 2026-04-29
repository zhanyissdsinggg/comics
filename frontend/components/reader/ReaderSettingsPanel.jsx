"use client";

import { memo } from "react";

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border-2 border-white/15 bg-black px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{label}</div>
        {description ? (
          <div className="mt-1 text-xs text-neutral-400">{description}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-black transition-colors ${
          enabled ? "bg-[#00E5FF]" : "bg-[#111111]"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full border border-black bg-[#FFE500] transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function ModeButton({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[20px] border-2 px-4 py-3 text-sm font-black uppercase tracking-[0.06em] transition ${
        active
          ? "border-black bg-[#FFE500] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          : disabled
            ? "border-white/10 bg-black text-white/30"
            : "border-white/20 bg-black text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111]"
      }`}
    >
      {children}
    </button>
  );
}

const ReaderSettingsPanel = memo(function ReaderSettingsPanel({
  isOpen,
  onClose,
  nightMode = false,
  onToggleNight,
  layoutMode = "vertical",
  onToggleLayout,
  disableLayoutToggle = false,
  brightness = 100,
  onBrightnessChange,
  autoScroll = false,
  onToggleAutoScroll,
  autoScrollSpeed = 1,
  onAutoScrollSpeedChange,
  fullscreen = false,
  onToggleFullscreen,
  showLayoutControls = true,
}) {
  const safeBrightness = clamp(brightness, 50, 150, 100);
  const safeAutoScrollSpeed = clamp(autoScrollSpeed, 1, 5, 1);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.54)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(92vh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-[30px] border-2 border-white/20 bg-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Reader</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-white/20 bg-black px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-white/75 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111] hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-5 py-5">
          <ToggleRow
            label="Night mode"
            description=""
            enabled={nightMode}
            onToggle={onToggleNight}
          />

          {showLayoutControls ? (
            <div className="space-y-3 rounded-[22px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="text-sm font-semibold text-white">Page view</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ModeButton
                  active={layoutMode !== "horizontal"}
                  disabled={disableLayoutToggle}
                  onClick={() => {
                    if (layoutMode === "horizontal") {
                      onToggleLayout?.();
                    }
                  }}
                >
                  Vertical
                </ModeButton>
                <ModeButton
                  active={layoutMode === "horizontal"}
                  disabled={disableLayoutToggle}
                  onClick={() => {
                    if (layoutMode !== "horizontal") {
                      onToggleLayout?.();
                    }
                  }}
                >
                  Wide
                </ModeButton>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-[22px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Brightness</div>
              </div>
                <span className="text-sm font-semibold text-white/90">{safeBrightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={safeBrightness}
              onChange={(event) => onBrightnessChange?.(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-800"
              style={{
                background: `linear-gradient(to right, rgb(0 229 255) 0%, rgb(0 229 255) ${
                  ((safeBrightness - 50) / 100) * 100
                }%, rgb(38 38 38) ${((safeBrightness - 50) / 100) * 100}%, rgb(38 38 38) 100%)`,
              }}
            />
          </div>

          <ToggleRow
            label="Auto-scroll"
            description=""
            enabled={autoScroll}
            onToggle={onToggleAutoScroll}
          />

          {autoScroll ? (
            <div className="space-y-3 rounded-[22px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Speed</div>
                </div>
                <span className="text-sm font-semibold text-white/90">{safeAutoScrollSpeed}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={safeAutoScrollSpeed}
                onChange={(event) => onAutoScrollSpeedChange?.(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-800"
                style={{
                  background: `linear-gradient(to right, rgb(255 0 122) 0%, rgb(255 0 122) ${
                    ((safeAutoScrollSpeed - 1) / 4) * 100
                  }%, rgb(38 38 38) ${((safeAutoScrollSpeed - 1) / 4) * 100}%, rgb(38 38 38) 100%)`,
                }}
              />
            </div>
          ) : null}

          <ToggleRow
            label="Full screen"
            description=""
            enabled={fullscreen}
            onToggle={onToggleFullscreen}
          />
        </div>

        <div className="flex gap-3 border-t-2 border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              if (nightMode) {
                onToggleNight?.();
              }
              if (showLayoutControls && layoutMode === "horizontal" && !disableLayoutToggle) {
                onToggleLayout?.();
              }
              if (safeBrightness !== 100) {
                onBrightnessChange?.(100);
              }
              if (autoScroll) {
                onToggleAutoScroll?.();
              }
              if (safeAutoScrollSpeed !== 1) {
                onAutoScrollSpeedChange?.(1);
              }
            }}
            className="flex-1 rounded-full border-2 border-white/20 bg-black px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-2 border-black bg-[#FFE500] px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff173]"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
});

export default ReaderSettingsPanel;
