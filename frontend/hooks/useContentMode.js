"use client";

import { useCallback, useMemo } from "react";
import { useAdultGateStore } from "../store/useAdultGateStore";
import {
  CONTENT_MODE_ADULT,
  CONTENT_MODE_NORMAL,
  isAdultContentMode,
  isNormalContentMode,
} from "../lib/contentMode";

export function useContentMode() {
  const {
    contentMode,
    setContentMode,
    enterAdultMode,
    exitAdultMode,
    hydrated,
    legalAge,
  } = useAdultGateStore();

  const getContentMode = useCallback(() => contentMode, [contentMode]);
  const isAdultMode = useCallback(
    () => isAdultContentMode(contentMode),
    [contentMode],
  );
  const isNormalMode = useCallback(
    () => isNormalContentMode(contentMode),
    [contentMode],
  );

  return useMemo(
    () => ({
      contentMode,
      hydrated,
      legalAge,
      getContentMode,
      setContentMode,
      enterAdultMode,
      exitAdultMode,
      isAdultMode,
      isNormalMode,
      adultModeEnabled: contentMode === CONTENT_MODE_ADULT,
      normalModeEnabled: contentMode === CONTENT_MODE_NORMAL,
    }),
    [
      contentMode,
      enterAdultMode,
      exitAdultMode,
      getContentMode,
      hydrated,
      isAdultMode,
      isNormalMode,
      legalAge,
      setContentMode,
    ],
  );
}
