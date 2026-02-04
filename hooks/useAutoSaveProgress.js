/**
 * 阅读进度自动保存Hook
 * 自动保存用户的阅读位置，下次打开时可以继续阅读
 */

import { useEffect, useRef, useCallback } from 'react';
import { useProgressStore } from '../store/useProgressStore';
import { track } from '../lib/analytics';

/**
 * Debounce函数 - 防止频繁调用
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 阅读进度自动保存Hook
 * @param {string} seriesId - 系列ID
 * @param {string} episodeId - 章节ID
 * @param {Object} options - 配置选项
 * @returns {Object} - 进度相关的方法和状态
 */
export function useAutoSaveProgress(seriesId, episodeId, options = {}) {
  const {
    debounceMs = 1000, // 防抖延迟（毫秒）
    saveInterval = 5000, // 定期保存间隔（毫秒）
    minScrollThreshold = 50, // 最小滚动距离才保存（像素）
    enabled = true, // 是否启用自动保存
  } = options;

  const { setProgress, getProgress } = useProgressStore();
  const lastScrollPosition = useRef(0);
  const lastSaveTime = useRef(Date.now());
  const saveTimerRef = useRef(null);

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

      // 如果不是强制保存，检查是否需要保存
      if (!force && timeSinceLastSave < saveInterval) {
        return;
      }

      // 保存进度
      setProgress(seriesId, episodeId, percent);
      lastSaveTime.current = now;

      // 追踪进度保存事件
      track('reading_progress_saved', {
        seriesId,
        episodeId,
        percent: Math.round(percent),
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Progress] Saved: ${Math.round(percent)}%`);
      }
    },
    [enabled, seriesId, episodeId, setProgress, saveInterval]
  );

  /**
   * 防抖的保存函数
   */
  const debouncedSave = useRef(
    debounce((percent) => {
      saveProgress(percent, false);
    }, debounceMs)
  ).current;

  /**
   * 处理滚动事件
   */
  const handleScroll = useCallback(() => {
    if (!enabled) return;

    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    const scrollDiff = Math.abs(currentScroll - lastScrollPosition.current);

    // 只有滚动距离超过阈值才保存
    if (scrollDiff < minScrollThreshold) {
      return;
    }

    lastScrollPosition.current = currentScroll;
    const percent = calculateProgress();

    // 使用防抖保存
    debouncedSave(percent);
  }, [enabled, calculateProgress, debouncedSave, minScrollThreshold]);

  /**
   * 强制保存当前进度
   */
  const forceSave = useCallback(() => {
    const percent = calculateProgress();
    saveProgress(percent, true);
  }, [calculateProgress, saveProgress]);

  /**
   * 恢复上次阅读位置
   */
  const restoreProgress = useCallback(() => {
    if (!enabled || !seriesId || !episodeId) return;

    const savedProgress = getProgress(seriesId, episodeId);
    if (!savedProgress || savedProgress.percent === 0) return;

    // 等待页面加载完成后滚动
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

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Progress] Restored: ${Math.round(savedProgress.percent)}%`);
      }
    }, 500);
  }, [enabled, seriesId, episodeId, getProgress]);

  /**
   * 设置滚动监听和定期保存
   */
  useEffect(() => {
    if (!enabled) return;

    // 添加滚动监听
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 设置定期保存定时器
    saveTimerRef.current = setInterval(() => {
      const percent = calculateProgress();
      saveProgress(percent, false);
    }, saveInterval);

    // 页面卸载时保存进度
    const handleBeforeUnload = () => {
      forceSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
      // 组件卸载时保存一次
      forceSave();
    };
  }, [enabled, handleScroll, saveInterval, calculateProgress, saveProgress, forceSave]);

  return {
    saveProgress: forceSave,
    restoreProgress,
    calculateProgress,
  };
}

/**
 * 使用示例：
 *
 * // 在ReaderPage组件中使用
 * function ReaderPage({ seriesId, episodeId }) {
 *   const { restoreProgress } = useAutoSaveProgress(seriesId, episodeId, {
 *     debounceMs: 1000,      // 1秒防抖
 *     saveInterval: 5000,    // 每5秒保存一次
 *     minScrollThreshold: 50, // 滚动50px才保存
 *     enabled: true,         // 启用自动保存
 *   });
 *
 *   // 页面加载时恢复进度
 *   useEffect(() => {
 *     restoreProgress();
 *   }, [restoreProgress]);
 *
 *   return <div>...</div>;
 * }
 */
