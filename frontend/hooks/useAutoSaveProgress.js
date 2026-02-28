/**
 * 阅读进度自动保存Hook
 * 自动保存用户的阅读位置，下次打开时可以继续阅读
 */

import { useEffect, useRef, useCallback } from 'react';
import { useProgressStore } from '../store/useProgressStore';
import { track } from '../lib/analytics';

/**
 * 阅读进度自动保存Hook
 * @param {string} seriesId - 系列ID
 * @param {string} episodeId - 章节ID
 * @param {Object} options - 配置选项
 * @returns {Object} - 进度相关的方法和状态
 */
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

  // 用 ref 保存最新的 saveProgress，避免闭包过期
  const saveProgressRef = useRef(null);

  /**
   * 计算当前阅读进度百分比
   */
  const calculateProgress = useCallback(() => {
    if (typeof window === 'undefined') return 0;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollHeight <= clientHeight) return 100;

    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }, []);

  /**
   * 保存进度到store
   */
  const saveProgress = useCallback(
    (percent, force = false) => {
      if (!enabled || !seriesId || !episodeId) return;

      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTime.current;

      if (!force && timeSinceLastSave < saveInterval) {
        return;
      }

      setProgress(seriesId, episodeId, percent);
      lastSaveTime.current = now;

      track('reading_progress_saved', {
        seriesId,
        episodeId,
        percent: Math.round(percent),
      });
    },
    [enabled, seriesId, episodeId, setProgress, saveInterval]
  );

  // 始终保持 ref 指向最新的 saveProgress
  saveProgressRef.current = saveProgress;

  /**
   * 防抖保存 — 用 ref 存 timer，不用 debounce 函数包装
   */
  const debouncedSave = useCallback((percent) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveProgressRef.current?.(percent, false);
    }, debounceMs);
  }, [debounceMs]);

  /**
   * 处理滚动事件
   */
  const handleScroll = useCallback(() => {
    if (!enabled) return;

    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    const scrollDiff = Math.abs(currentScroll - lastScrollPosition.current);

    if (scrollDiff < minScrollThreshold) {
      return;
    }

    lastScrollPosition.current = currentScroll;
    const percent = calculateProgress();
    debouncedSave(percent);
  }, [enabled, calculateProgress, debouncedSave, minScrollThreshold]);

  /**
   * 强制保存当前进度
   */
  const forceSave = useCallback(() => {
    const percent = calculateProgress();
    saveProgressRef.current?.(percent, true);
  }, [calculateProgress]);

  /**
   * 恢复上次阅读位置
   */
  const restoreProgress = useCallback(() => {
    if (!enabled || !seriesId || !episodeId) return;

    const savedProgress = getProgress(seriesId, episodeId);
    if (!savedProgress || savedProgress.percent === 0) return;

    setTimeout(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const targetScroll = ((scrollHeight - clientHeight) * savedProgress.percent) / 100;

      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      track('reading_progress_restored', {
        seriesId,
        episodeId,
        percent: Math.round(savedProgress.percent),
      });
    }, 500);
  }, [enabled, seriesId, episodeId, getProgress]);

  /**
   * 设置滚动监听和定期保存
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('scroll', handleScroll, { passive: true });

    saveTimerRef.current = setInterval(() => {
      const percent = calculateProgress();
      saveProgressRef.current?.(percent, false);
    }, saveInterval);

    const handleBeforeUnload = () => {
      forceSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      forceSave();
    };
  }, [enabled, handleScroll, saveInterval, calculateProgress, forceSave]);

  return {
    saveProgress: forceSave,
    restoreProgress,
    calculateProgress,
  };
}
