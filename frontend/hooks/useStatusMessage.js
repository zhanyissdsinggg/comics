// 鑰佺帇锛氱姸鎬佹秷鎭痟ook锛岀粺涓€绠＄悊鎴愬姛/閿欒鎻愮ず
"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export function useStatusMessage(duration = 3000) {
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const timeoutRef = useRef(null);

  // 鑰佺帇锛氭樉绀虹姸鎬佹秷鎭?
  const showStatus = useCallback((type, text) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatusMessage({ type, text });

    timeoutRef.current = setTimeout(() => {
      setStatusMessage({ type: "", text: "" });
    }, duration);
  }, [duration]);

  // 鑰佺帇锛氭竻闄ょ姸鎬佹秷鎭?
  const clearStatus = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatusMessage({ type: "", text: "" });
  }, []);

  // 鑰佺帇锛氱粍浠跺嵏杞芥椂娓呯悊瀹氭椂鍣?
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { statusMessage, showStatus, clearStatus };
}