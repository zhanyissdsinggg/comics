"use client";

import { useCallback, useRef } from "react";

/**
 * 老王注释：移动端触摸反馈Hook
 * 功能：为按钮添加触觉反馈和视觉反馈
 * 遵循KISS原则：简单的触摸反馈实现
 * 遵循DRY原则：可复用的Hook
 *
 * 使用方法：
 * const touchProps = useTouchFeedback({ haptic: true, scale: 0.95 });
 * <button {...touchProps}>Click me</button>
 */
export function useTouchFeedback({
  haptic = true,
  scale = 0.95,
  duration = 150,
  onTap
} = {}) {
  const elementRef = useRef(null);
  const timeoutRef = useRef(null);

  // 老王注释：触发触觉反馈（如果设备支持）
  const triggerHaptic = useCallback(() => {
    if (!haptic) return;

    // 老王注释：使用Vibration API（如果支持）
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10); // 10ms的轻微震动
    }

    // 老王注释：使用Haptic Feedback API（iOS Safari）
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      // iOS设备会自动提供触觉反馈，不需要额外处理
    }
  }, [haptic]);

  // 老王注释：处理触摸开始
  const handleTouchStart = useCallback((e) => {
    const element = e.currentTarget;
    if (!element) return;

    // 老王注释：添加缩放效果
    element.style.transform = `scale(${scale})`;
    element.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    // 老王注释：触发触觉反馈
    triggerHaptic();
  }, [scale, duration, triggerHaptic]);

  // 老王注释：处理触摸结束
  const handleTouchEnd = useCallback((e) => {
    const element = e.currentTarget;
    if (!element) return;

    // 老王注释：恢复原始大小
    element.style.transform = "scale(1)";

    // 老王注释：清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 老王注释：延迟执行回调
    if (onTap) {
      timeoutRef.current = setTimeout(() => {
        onTap(e);
      }, duration);
    }
  }, [duration, onTap]);

  // 老王注释：处理触摸取消
  const handleTouchCancel = useCallback((e) => {
    const element = e.currentTarget;
    if (!element) return;

    // 老王注释：恢复原始大小
    element.style.transform = "scale(1)";
  }, []);

  return {
    ref: elementRef,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    style: {
      WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
      userSelect: "none",
      WebkitUserSelect: "none"
    }
  };
}

/**
 * 老王注释：按钮触摸反馈Hook（简化版）
 * 专门为按钮优化的触摸反馈
 */
export function useButtonTouchFeedback(options = {}) {
  return useTouchFeedback({
    haptic: true,
    scale: 0.95,
    duration: 150,
    ...options
  });
}

/**
 * 老王注释：卡片触摸反馈Hook
 * 为卡片组件优化的触摸反馈（更轻微的缩放）
 */
export function useCardTouchFeedback(options = {}) {
  return useTouchFeedback({
    haptic: false,
    scale: 0.98,
    duration: 200,
    ...options
  });
}

export default useTouchFeedback;
