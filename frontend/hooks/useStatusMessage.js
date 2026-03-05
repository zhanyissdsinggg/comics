// NOTE: cleaned corrupted comment.
"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export function useStatusMessage(duration = 3000) {
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const timeoutRef = useRef(null);

  // NOTE: cleaned corrupted comment.
  const showStatus = useCallback((type, text) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatusMessage({ type, text });

    timeoutRef.current = setTimeout(() => {
      setStatusMessage({ type: "", text: "" });
    }, duration);
  }, [duration]);

  // NOTE: cleaned corrupted comment.
  const clearStatus = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatusMessage({ type: "", text: "" });
  }, []);

  // NOTE: cleaned corrupted comment.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { statusMessage, showStatus, clearStatus };
}