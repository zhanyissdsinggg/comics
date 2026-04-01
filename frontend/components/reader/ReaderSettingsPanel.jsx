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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="mt-1 text-xs text-neutral-400">{description}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-emerald-500" : "bg-neutral-700"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
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
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
          : disabled
            ? "border-neutral-900 bg-neutral-950 text-neutral-600"
            : "border-white/10 bg-white/5 text-neutral-200 hover:border-white/20 hover:bg-white/10"
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(92vh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/10 bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Reader Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-5 py-5">
          <ToggleRow
            label="Night Mode"
            description="Reduce glare for long reading sessions."
            enabled={nightMode}
            onToggle={onToggleNight}
          />

          {showLayoutControls ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="text-sm font-semibold text-white">Layout</div>
                <div className="mt-1 text-xs text-neutral-400">
                  Switch between continuous scroll and side-by-side paging.
                </div>
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
                  Horizontal
                </ModeButton>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Brightness</div>
                <div className="mt-1 text-xs text-neutral-400">
                  Tune the page luminance without affecting site theme.
                </div>
              </div>
              <span className="text-sm font-semibold text-emerald-300">{safeBrightness}%</span>
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
                background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${
                  ((safeBrightness - 50) / 100) * 100
                }%, rgb(38 38 38) ${((safeBrightness - 50) / 100) * 100}%, rgb(38 38 38) 100%)`,
              }}
            />
          </div>

          <ToggleRow
            label="Auto Scroll"
            description="Keep the chapter moving hands-free."
            enabled={autoScroll}
            onToggle={onToggleAutoScroll}
          />

          {autoScroll ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Auto Scroll Speed</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Increase speed when you want a faster glide.
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-300">{safeAutoScrollSpeed}x</span>
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
                  background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${
                    ((safeAutoScrollSpeed - 1) / 4) * 100
                  }%, rgb(38 38 38) ${((safeAutoScrollSpeed - 1) / 4) * 100}%, rgb(38 38 38) 100%)`,
                }}
              />
            </div>
          ) : null}

          <ToggleRow
            label="Fullscreen"
            description="Hide browser chrome for an immersive pass."
            enabled={fullscreen}
            onToggle={onToggleFullscreen}
          />
        </div>

        <div className="flex gap-3 border-t border-white/10 px-5 py-4">
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
            className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
});

export default ReaderSettingsPanel;
