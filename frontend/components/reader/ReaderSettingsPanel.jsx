"use client";

import { memo, useEffect, useState } from "react";
import { Bookmark, ChevronRight, Keyboard, RotateCcw, X } from "lucide-react";

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
      {children}
    </p>
  );
}

function SegmentedButton({ active, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[42px] rounded-full border px-4 text-sm font-semibold transition ${
        active
          ? "border-white/40 bg-white text-black"
          : disabled
            ? "border-white/8 bg-white/[0.03] text-white/30"
            : "border-white/12 bg-white/[0.04] text-white/78 hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
      aria-pressed={enabled}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-white/50">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
          enabled ? "bg-white" : "bg-white/12"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-black transition ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function RangeField({ label, valueLabel, min, max, step, value, onChange }) {
  const progress =
    ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100;

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-sm text-white/65">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange?.(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.95) ${progress}%, rgba(255,255,255,0.1) ${progress}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  onClick,
  trailing,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-4 rounded-[22px] border px-4 py-3 text-left transition ${
        disabled
          ? "border-white/8 bg-white/[0.02] text-white/28"
          : "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-white/50">
              {description}
            </span>
          ) : null}
        </span>
      </span>
      {trailing || <ChevronRight className="h-4 w-4 text-white/35" />}
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
  theme = "light",
  onThemeChange,
  fontSize = 18,
  onFontSizeChange,
  lineHeight = 1.78,
  onLineHeightChange,
  brightness = 100,
  onBrightnessChange,
  showLayoutControls = true,
  showTextControls = false,
  onSaveProgress,
}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const safeBrightness = clamp(brightness, 50, 150, 100);
  const safeFontSize = clamp(fontSize, 12, 24, 18);
  const safeLineHeight = clamp(lineHeight, 1.2, 2.0, 1.78);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (!isOpen) {
    return null;
  }

  const resetDefaults = () => {
    try {
      if (nightMode) {
        onToggleNight?.();
      }
      if (
        showLayoutControls &&
        layoutMode === "horizontal" &&
        !disableLayoutToggle
      ) {
        onToggleLayout?.();
      }
      if (showTextControls && theme !== "light") {
        onThemeChange?.("light");
      }
      if (showTextControls && safeFontSize !== 18) {
        onFontSizeChange?.(18);
      }
      if (showTextControls && safeLineHeight !== 1.78) {
        onLineHeightChange?.(1.78);
      }
      if (safeBrightness !== 100) {
        onBrightnessChange?.(100);
      }
    } catch {
      // Keep reader stable even if a setting write fails.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-[rgba(7,10,16,0.56)] backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className={`absolute flex max-h-[min(100vh,48rem)] w-full flex-col overflow-hidden border border-white/10 bg-[#0b0f16] text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)] ${
          isDesktop
            ? "right-0 top-0 h-full max-w-[28rem] rounded-l-[28px]"
            : "bottom-0 left-0 rounded-t-[28px]"
        }`}
        onClick={(event) => event.stopPropagation()}
        aria-label="Reader settings sheet"
      >
        {!isDesktop ? (
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-white/16" />
        ) : null}

        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <SectionLabel>Reading settings</SectionLabel>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {showLayoutControls ? "Reader display" : "Reading settings"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/72 transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {showLayoutControls ? (
            <div className="space-y-3">
              <SectionLabel>Comic settings</SectionLabel>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Reading direction
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/50">
                      Switch between vertical scrolling and horizontal paging.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SegmentedButton
                    active={layoutMode !== "horizontal"}
                    disabled={disableLayoutToggle}
                    onClick={() => {
                      if (layoutMode === "horizontal") {
                        onToggleLayout?.();
                      }
                    }}
                  >
                    Vertical
                  </SegmentedButton>
                  <SegmentedButton
                    active={layoutMode === "horizontal"}
                    disabled={disableLayoutToggle}
                    onClick={() => {
                      if (layoutMode !== "horizontal") {
                        onToggleLayout?.();
                      }
                    }}
                  >
                    Horizontal
                  </SegmentedButton>
                </div>
              </div>

              <ActionRow
                title="Fit width"
                description="Pages stay edge-to-edge on mobile and centered on larger screens."
                trailing={
                  <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/62">
                    Always on
                  </span>
                }
                disabled
              />

              <RangeField
                label="Brightness"
                valueLabel={`${safeBrightness}%`}
                min={50}
                max={150}
                step={5}
                value={safeBrightness}
                onChange={onBrightnessChange}
              />

              <ToggleRow
                label="Night mode"
                description="Keep comic pages inside a darker reader shell."
                enabled={nightMode}
                onToggle={onToggleNight}
              />
            </div>
          ) : null}

          {showTextControls ? (
            <div className="space-y-3">
              <SectionLabel>Novel settings</SectionLabel>
              <RangeField
                label="Font size"
                valueLabel={`${safeFontSize}px`}
                min={12}
                max={24}
                step={1}
                value={safeFontSize}
                onChange={onFontSizeChange}
              />

              <RangeField
                label="Line height"
                valueLabel={safeLineHeight.toFixed(1)}
                min={1.2}
                max={2}
                step={0.1}
                value={safeLineHeight}
                onChange={onLineHeightChange}
              />

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Theme</p>
                    <p className="mt-1 text-xs leading-5 text-white/50">
                      Choose the reading mood for long-form text.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <SegmentedButton
                    active={theme === "light"}
                    onClick={() => onThemeChange?.("light")}
                  >
                    Light
                  </SegmentedButton>
                  <SegmentedButton
                    active={theme === "sepia"}
                    onClick={() => onThemeChange?.("sepia")}
                  >
                    Sepia
                  </SegmentedButton>
                  <SegmentedButton
                    active={theme === "dark"}
                    onClick={() => onThemeChange?.("dark")}
                  >
                    Dark
                  </SegmentedButton>
                </div>
              </div>

              <RangeField
                label="Brightness"
                valueLabel={`${safeBrightness}%`}
                min={50}
                max={150}
                step={5}
                value={safeBrightness}
                onChange={onBrightnessChange}
              />

              <ActionRow
                icon={RotateCcw}
                title="Reset defaults"
                description="Return font size, line height, brightness, and theme to the default reading setup."
                onClick={resetDefaults}
              />
            </div>
          ) : null}

          <div className="space-y-3">
            <SectionLabel>General</SectionLabel>
            <ActionRow
              icon={Bookmark}
              title="Save progress"
              description="Store your current place so you can come back to this chapter later."
              onClick={() => {
                onSaveProgress?.();
                onClose?.();
              }}
            />
            <ActionRow
              icon={Keyboard}
              title="Keyboard shortcuts"
              description={
                showLayoutControls
                  ? "Use arrow keys for chapter movement and space to scroll through pages."
                  : "Use arrow keys for chapter movement and Page Down to keep the story flowing."
              }
              trailing={
                <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/62">
                  Tips
                </span>
              }
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/8 px-5 py-4">
          <button
            type="button"
            onClick={resetDefaults}
            className="min-h-[46px] rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm font-semibold text-white/82 transition hover:bg-white/[0.08]"
          >
            {showTextControls ? "Reset defaults" : "Reset"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] rounded-full bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
});

export default ReaderSettingsPanel;
