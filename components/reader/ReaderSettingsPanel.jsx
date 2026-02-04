"use client";

import { memo } from "react";
import { useReaderSettingsStore } from "../../store/useReaderSettingsStore";

/**
 * 老王注释：阅读器设置面板组件
 * 提供完整的阅读器设置选项，包括主题、字体、亮度等
 */
const ReaderSettingsPanel = memo(function ReaderSettingsPanel({ isOpen, onClose }) {
  const {
    theme,
    readingMode,
    fontSize,
    lineHeight,
    brightness,
    fullscreen,
    autoScroll,
    autoScrollSpeed,
    setTheme,
    setReadingMode,
    setFontSize,
    setLineHeight,
    setBrightness,
    toggleFullscreen,
    setAutoScroll,
    setAutoScrollSpeed,
  } = useReaderSettingsStore();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 老王注释：标题栏 */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Reader Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 老王注释：主题设置 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "light", label: "Light", icon: "☀️" },
                { value: "dark", label: "Dark", icon: "🌙" },
                { value: "sepia", label: "Sepia", icon: "📜" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTheme(item.value)}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    theme === item.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                  }`}
                >
                  <div className="text-xl">{item.icon}</div>
                  <div className="mt-1">{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 老王注释：阅读模式设置 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300">Reading Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "scroll", label: "Scroll" },
                { value: "single", label: "Single" },
                { value: "double", label: "Double" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setReadingMode(item.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    readingMode === item.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 老王注释：字体大小设置 */}
          <div>
            <label className="mb-3 flex items-center justify-between text-sm font-medium text-neutral-300">
              <span>Font Size</span>
              <span className="text-emerald-400">{fontSize}px</span>
            </label>
            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
              style={{
                background: `linear-gradient(to right, rgb(52, 211, 153) 0%, rgb(52, 211, 153) ${
                  ((fontSize - 12) / 12) * 100
                }%, rgb(38, 38, 38) ${((fontSize - 12) / 12) * 100}%, rgb(38, 38, 38) 100%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-neutral-500">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          {/* 老王注释：行高设置 */}
          <div>
            <label className="mb-3 flex items-center justify-between text-sm font-medium text-neutral-300">
              <span>Line Height</span>
              <span className="text-emerald-400">{lineHeight.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="1.2"
              max="2.0"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(e.target.value)}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
              style={{
                background: `linear-gradient(to right, rgb(52, 211, 153) 0%, rgb(52, 211, 153) ${
                  ((lineHeight - 1.2) / 0.8) * 100
                }%, rgb(38, 38, 38) ${((lineHeight - 1.2) / 0.8) * 100}%, rgb(38, 38, 38) 100%)`,
              }}
            />
          </div>

          {/* 老王注释：亮度设置 */}
          <div>
            <label className="mb-3 flex items-center justify-between text-sm font-medium text-neutral-300">
              <span>Brightness</span>
              <span className="text-emerald-400">{brightness}%</span>
            </label>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={brightness}
              onChange={(e) => setBrightness(e.target.value)}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
              style={{
                background: `linear-gradient(to right, rgb(52, 211, 153) 0%, rgb(52, 211, 153) ${
                  ((brightness - 50) / 100) * 100
                }%, rgb(38, 38, 38) ${((brightness - 50) / 100) * 100}%, rgb(38, 38, 38) 100%)`,
              }}
            />
          </div>

          {/* 老王注释：全屏模式开关 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-neutral-300">Fullscreen Mode</div>
              <div className="mt-1 text-xs text-neutral-500">Immersive reading experience</div>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                fullscreen ? "bg-emerald-500" : "bg-neutral-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  fullscreen ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 老王注释：自动滚动开关 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-neutral-300">Auto Scroll</div>
              <div className="mt-1 text-xs text-neutral-500">Automatic page scrolling</div>
            </div>
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoScroll ? "bg-emerald-500" : "bg-neutral-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoScroll ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 老王注释：自动滚动速度（仅在开启自动滚动时显示） */}
          {autoScroll ? (
            <div>
              <label className="mb-3 flex items-center justify-between text-sm font-medium text-neutral-300">
                <span>Scroll Speed</span>
                <span className="text-emerald-400">{autoScrollSpeed}x</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={autoScrollSpeed}
                onChange={(e) => setAutoScrollSpeed(e.target.value)}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800"
                style={{
                  background: `linear-gradient(to right, rgb(52, 211, 153) 0%, rgb(52, 211, 153) ${
                    ((autoScrollSpeed - 1) / 4) * 100
                  }%, rgb(38, 38, 38) ${((autoScrollSpeed - 1) / 4) * 100}%, rgb(38, 38, 38) 100%)`,
                }}
              />
              <div className="mt-2 flex justify-between text-xs text-neutral-500">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 老王注释：底部按钮 */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              // 老王注释：重置为默认设置
              setTheme("light");
              setReadingMode("scroll");
              setFontSize(16);
              setLineHeight(1.6);
              setBrightness(100);
              setAutoScroll(false);
            }}
            className="flex-1 rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
});

export default ReaderSettingsPanel;
