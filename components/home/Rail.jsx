"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import IconButton from "../common/IconButton";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";
import { track } from "../../lib/analytics";

function pushPerfMetric(name, value) {
  if (typeof window === "undefined") {
    return;
  }
  if (!window.__perfMetrics) {
    window.__perfMetrics = {};
  }
  const metrics = window.__perfMetrics;
  if (name === "rail_preload") {
    metrics.railPreloadCount = (metrics.railPreloadCount || 0) + value;
  }
}

const ITEM_WIDTH = 156;
const WINDOW_BEFORE = 6;
const WINDOW_AFTER = 10;

export default function Rail({ title, items, tone, railName, onItemClick }) {
  const railRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const preloadedRef = useRef(new Set());
  const safeItems = ensureArray(items);
  const preloadTimerRef = useRef(null);

  const handleScroll = (direction) => {
    if (!railRef.current) {
      return;
    }
    const step = ITEM_WIDTH * 2.5;
    railRef.current.scrollBy({
      left: direction * step,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const node = railRef.current;
    if (!node) {
      return undefined;
    }
    let frame = null;
    let last = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - last < 60) {
        return;
      }
      last = now;
      if (frame) {
        return;
      }
      frame = requestAnimationFrame(() => {
        setScrollLeft(node.scrollLeft);
        frame = null;
      });
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  const windowed = useMemo(() => {
    if (safeItems.length === 0) {
      return { items: [], start: 0 };
    }
    const index = Math.floor(scrollLeft / ITEM_WIDTH);
    const start = Math.max(0, index - WINDOW_BEFORE);
    const end = Math.min(safeItems.length, index + WINDOW_AFTER);
    return { items: safeItems.slice(start, end), start };
  }, [safeItems, scrollLeft]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const start = windowed.start;
    const end = Math.min(safeItems.length, start + WINDOW_AFTER + 6);
    const slice = safeItems.slice(start, end);
    const run = () => {
      track("rail_preload_start", { title, count: slice.length });
      slice.forEach((item) => {
        if (!item?.coverUrl) {
          return;
        }
        if (preloadedRef.current.has(item.coverUrl)) {
          return;
        }
        const img = new Image();
        img.src = item.coverUrl;
        preloadedRef.current.add(item.coverUrl);
      });
      track("rail_preload_complete", { title, count: slice.length });
      pushPerfMetric("rail_preload", slice.length);
    };
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
    }
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 800 });
    } else {
      preloadTimerRef.current = setTimeout(run, 120);
    }
    return () => {
      if (preloadTimerRef.current) {
        clearTimeout(preloadTimerRef.current);
      }
    };
  }, [safeItems, title, windowed.start, windowed.items.length]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-lg font-bold text-transparent md:text-xl">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <IconButton label="Scroll left" onClick={() => handleScroll(-1)}>
            {"<"}
          </IconButton>
          <IconButton label="Scroll right" onClick={() => handleScroll(1)}>
            {">"}
          </IconButton>
        </div>
      </div>
      {safeItems.length === 0 ? (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 text-sm text-neutral-400">
          No items available.
        </div>
      ) : (
        <div
          ref={railRef}
          className="no-scrollbar flex gap-3 overflow-x-auto pb-2 scroll-snap-x md:gap-4"
        >
          <div style={{ width: windowed.start * ITEM_WIDTH }} className="shrink-0" />
          {windowed.items.map((item) => (
            <PortraitCard
              key={item.id}
              item={item}
              tone={tone}
              onClick={() => onItemClick?.(item, railName || title)}
            />
          ))}
          <div
            style={{
              width:
                (safeItems.length - windowed.start - windowed.items.length) *
                ITEM_WIDTH,
            }}
            className="shrink-0"
          />
        </div>
      )}
    </section>
  );
}
