"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ReaderSettingsContext = createContext(null);
const STORAGE_KEY = "mn_reader_settings";

const DEFAULT_SETTINGS = {
  // NOTE: cleaned corrupted comment.
  nightMode: false, // 鍏煎鏃х増鏈?
  // NOTE: cleaned corrupted comment.
  layoutMode: "vertical", // vertical, horizontal
  readingMode: "scroll", // scroll, single, double

  // NOTE: cleaned corrupted comment.
  lineHeight: 1.6, // 1.2-2.0

  // NOTE: cleaned corrupted comment.
  backgroundColor: "#ffffff",

  // NOTE: cleaned corrupted comment.
  autoScroll: false,
  autoScrollSpeed: 1, // 1-5
};

function readSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(next) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function ReaderSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  const setNightMode = useCallback((value) => {
    setSettings((prev) => {
      const next = { ...prev, nightMode: Boolean(value) };
      writeSettings(next);
      return next;
    });
  }, []);

  const toggleNightMode = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, nightMode: !prev.nightMode };
      writeSettings(next);
      return next;
    });
  }, []);

  const setLayoutMode = useCallback((mode) => {
    setSettings((prev) => {
      const next = { ...prev, layoutMode: mode === "horizontal" ? "horizontal" : "vertical" };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setTheme = useCallback((theme) => {
    setSettings((prev) => {
      const validThemes = ["light", "dark", "sepia"];
      const next = {
        ...prev,
        theme: validThemes.includes(theme) ? theme : "light",
        nightMode: theme === "dark", // 鍚屾nightMode浠ュ吋瀹规棫鐗堟湰
      };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setReadingMode = useCallback((mode) => {
    setSettings((prev) => {
      const validModes = ["scroll", "single", "double"];
      const next = { ...prev, readingMode: validModes.includes(mode) ? mode : "scroll" };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setFontSize = useCallback((size) => {
    setSettings((prev) => {
      const fontSize = Math.max(12, Math.min(24, Number(size) || 16));
      const next = { ...prev, fontSize };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setLineHeight = useCallback((height) => {
    setSettings((prev) => {
      const lineHeight = Math.max(1.2, Math.min(2.0, Number(height) || 1.6));
      const next = { ...prev, lineHeight };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setBrightness = useCallback((brightness) => {
    setSettings((prev) => {
      const value = Math.max(50, Math.min(150, Number(brightness) || 100));
      const next = { ...prev, brightness: value };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setBackgroundColor = useCallback((color) => {
    setSettings((prev) => {
      const next = { ...prev, backgroundColor: color || "#ffffff" };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setFullscreen = useCallback((value) => {
    setSettings((prev) => {
      const next = { ...prev, fullscreen: Boolean(value) };
      writeSettings(next);
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, fullscreen: !prev.fullscreen };
      writeSettings(next);
      return next;
    });
  }, []);

  // NOTE: cleaned corrupted comment.
  const setAutoScroll = useCallback((value) => {
    setSettings((prev) => {
      const next = { ...prev, autoScroll: Boolean(value) };
      writeSettings(next);
      return next;
    });
  }, []);

  const setAutoScrollSpeed = useCallback((speed) => {
    setSettings((prev) => {
      const value = Math.max(1, Math.min(5, Number(speed) || 1));
      const next = { ...prev, autoScrollSpeed: value };
      writeSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      // NOTE: cleaned corrupted comment.

      // NOTE: cleaned corrupted comment.
      toggleNightMode,
      setLayoutMode,
      setTheme,
      setReadingMode,
      setFontSize,
      setLineHeight,
      setBrightness,
      setBackgroundColor,
      setFullscreen,
      toggleFullscreen,
      setAutoScroll,
      setAutoScrollSpeed,
    }),
    [
      settings,
      setNightMode,
      toggleNightMode,
      setLayoutMode,
      setTheme,
      setReadingMode,
      setFontSize,
      setLineHeight,
      setBrightness,
      setBackgroundColor,
      setFullscreen,
      toggleFullscreen,
      setAutoScroll,
      setAutoScrollSpeed,
    ]
  );

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettingsStore() {
  const context = useContext(ReaderSettingsContext);
  if (!context) {
    throw new Error("useReaderSettingsStore must be used within ReaderSettingsProvider");
  }
  return context;
}