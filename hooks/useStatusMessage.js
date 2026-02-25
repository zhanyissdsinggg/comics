// 老王：状态消息hook，统一管理成功/错误提示
"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export function useStatusMessage(duration = 3000) {
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const timeoutRef = useRef(null);

  // 老王：显示状态消息
  const showStatus = useCallback((type, text) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatusMessage({ type, text });

    timeoutRef.current = setTimeout(() => {
      setStatusMessage({ type: "", text: "" });
    }, duration);
  }, [duration]);

  // 老王：清除状态消息
  const clearStatus = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatusMessage({ type: "", text: "" });
  }, []);

  // 老王：组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { statusMessage, showStatus, clearStatus };
}
