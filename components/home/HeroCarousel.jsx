"use client";

import { useMemo, useState } from "react";
import Cover from "../common/Cover";
import { ensureArray } from "../../lib/validators";

export default function HeroCarousel({ items }) {
  const safeItems = useMemo(() => ensureArray(items), [items]);
  const [index, setIndex] = useState(0);
  const active = safeItems[index] || safeItems[0];

  if (safeItems.length === 0) {
    return (
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
        No featured items.
      </section>
    );
  }

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length);
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % safeItems.length);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-neutral-900 bg-neutral-900/50">
      <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
            Featured
          </p>
          <h1 className="text-3xl font-bold md:text-4xl">{active.title}</h1>
          <p className="text-sm text-neutral-300">{active.description}</p>
          <div className="flex items-center gap-3">
            <button className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900">
              Read now
            </button>
            <button className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200">
              Add to library
            </button>
          </div>
          <div className="flex items-center gap-2">
            {safeItems.map((_, dotIndex) => (
              <button
                key={`dot-${dotIndex}`}
                type="button"
                className={`h-2 w-2 rounded-full ${
                  dotIndex === index ? "bg-white" : "bg-neutral-700"
                }`}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        </div>
        <div className="relative aspect-[4/3]">
          <Cover
            tone={active.coverTone}
            coverUrl={active.coverUrl}
            className="absolute inset-0 h-full w-full rounded-2xl"
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-full border border-neutral-700 bg-neutral-900/70 px-3 py-1 text-xs"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full border border-neutral-700 bg-neutral-900/70 px-3 py-1 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
