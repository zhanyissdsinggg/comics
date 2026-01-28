"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import IconButton from "../common/IconButton";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";

const ITEM_WIDTH = 156;
const WINDOW_BEFORE = 6;
const WINDOW_AFTER = 10;

export default function Rail({ title, items, tone }) {
  const railRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const safeItems = ensureArray(items);

  const handleScroll = (direction) => {
    if (!railRef.current) {
      return;
    }
    railRef.current.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const node = railRef.current;
    if (!node) {
      return undefined;
    }
    let frame = null;
    const onScroll = () => {
      if (frame) {
        return;
      }
      frame = requestAnimationFrame(() => {
        setScrollLeft(node.scrollLeft);
        frame = null;
      });
    };
    node.addEventListener("scroll", onScroll);
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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <IconButton label="Scroll left" onClick={() => handleScroll(-1)}>
            ←
          </IconButton>
          <IconButton label="Scroll right" onClick={() => handleScroll(1)}>
            →
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
          className="no-scrollbar flex gap-4 overflow-x-auto pb-2 scroll-snap-x"
        >
          <div style={{ width: windowed.start * ITEM_WIDTH }} className="shrink-0" />
          {windowed.items.map((item) => (
            <PortraitCard key={item.id} item={item} tone={tone} />
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
