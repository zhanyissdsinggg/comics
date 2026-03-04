"use client";

import { useCallback, useRef } from "react";

export function useTouchFeedback({
  haptic = true,
  scale = 0.95,
  duration = 150,
  onTap,
} = {}) {
  const elementRef = useRef(null);
  const timeoutRef = useRef(null);

  const triggerHaptic = useCallback(() => {
    if (!haptic) {
      return;
    }
    if (typeof window !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
  }, [haptic]);

  const handleTouchStart = useCallback(
    (event) => {
      const element = event.currentTarget;
      if (!element) {
        return;
      }
      element.style.transform = `scale(${scale})`;
      element.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      triggerHaptic();
    },
    [duration, scale, triggerHaptic]
  );

  const handleTouchEnd = useCallback(
    (event) => {
      const element = event.currentTarget;
      if (!element) {
        return;
      }
      element.style.transform = "scale(1)";
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (typeof onTap === "function") {
        timeoutRef.current = setTimeout(() => onTap(event), duration);
      }
    },
    [duration, onTap]
  );

  const handleTouchCancel = useCallback((event) => {
    const element = event.currentTarget;
    if (!element) {
      return;
    }
    element.style.transform = "scale(1)";
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
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
      WebkitUserSelect: "none",
    },
  };
}

export function useButtonTouchFeedback(options = {}) {
  return useTouchFeedback({
    haptic: true,
    scale: 0.95,
    duration: 150,
    ...options,
  });
}

export function useCardTouchFeedback(options = {}) {
  return useTouchFeedback({
    haptic: false,
    scale: 0.98,
    duration: 200,
    ...options,
  });
}

export default useTouchFeedback;
