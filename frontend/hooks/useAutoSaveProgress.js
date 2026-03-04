import { useCallback, useEffect, useRef } from "react";
import { useProgressStore } from "../store/useProgressStore";
import { trackEvent } from "../lib/trackEvent";

export function useAutoSaveProgress(seriesId, episodeId, options = {}) {
  const {
    debounceMs = 1000,
    saveInterval = 5000,
    minScrollThreshold = 50,
    enabled = true,
  } = options;

  const { setProgress, getProgress } = useProgressStore();
  const lastScrollPosition = useRef(0);
  const lastSaveTime = useRef(Date.now());
  const saveTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const saveProgressRef = useRef(null);

  const calculateProgress = useCallback(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollHeight <= clientHeight) {
      return 1;
    }

    const ratio = scrollTop / (scrollHeight - clientHeight);
    return Math.min(Math.max(ratio, 0), 1);
  }, []);

  const saveProgress = useCallback(
    (percent, force = false) => {
      if (!enabled || !seriesId || !episodeId) {
        return;
      }

      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTime.current;
      if (!force && timeSinceLastSave < saveInterval) {
        return;
      }

      setProgress(seriesId, episodeId, percent);
      lastSaveTime.current = now;

      trackEvent("reading_progress_saved", {
        seriesId,
        episodeId,
        percent: Math.round(percent * 100),
      });
    },
    [enabled, episodeId, saveInterval, seriesId, setProgress]
  );

  saveProgressRef.current = saveProgress;

  const debouncedSave = useCallback(
    (percent) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        saveProgressRef.current?.(percent, false);
      }, debounceMs);
    },
    [debounceMs]
  );

  const handleScroll = useCallback(() => {
    if (!enabled) {
      return;
    }

    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    const scrollDiff = Math.abs(currentScroll - lastScrollPosition.current);
    if (scrollDiff < minScrollThreshold) {
      return;
    }

    lastScrollPosition.current = currentScroll;
    const percent = calculateProgress();
    debouncedSave(percent);
  }, [calculateProgress, debouncedSave, enabled, minScrollThreshold]);

  const forceSave = useCallback(() => {
    const percent = calculateProgress();
    saveProgressRef.current?.(percent, true);
  }, [calculateProgress]);

  const restoreProgress = useCallback(() => {
    if (!enabled || !seriesId || !episodeId) {
      return;
    }

    const savedProgress = getProgress(seriesId, episodeId);
    if (!savedProgress || savedProgress.percent === 0) {
      return;
    }

    setTimeout(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const targetScroll = (scrollHeight - clientHeight) * savedProgress.percent;

      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });

      trackEvent("reading_progress_restored", {
        seriesId,
        episodeId,
        percent: Math.round(savedProgress.percent * 100),
      });
    }, 500);
  }, [enabled, episodeId, getProgress, seriesId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    saveTimerRef.current = setInterval(() => {
      const percent = calculateProgress();
      saveProgressRef.current?.(percent, false);
    }, saveInterval);

    const handleBeforeUnload = () => {
      forceSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      forceSave();
    };
  }, [calculateProgress, enabled, forceSave, handleScroll, saveInterval]);

  return {
    saveProgress: forceSave,
    restoreProgress,
    calculateProgress,
  };
}
