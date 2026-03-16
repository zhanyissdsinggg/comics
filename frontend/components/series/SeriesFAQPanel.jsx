"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { getSeriesFaqItems } from "../../lib/storefrontFaq";

export default function SeriesFAQPanel({ series, episodes = [], creatorHref = "" }) {
  const router = useRouter();
  const faqItems = useMemo(() => getSeriesFaqItems({ series, episodes }), [episodes, series]);

  if (faqItems.length === 0) {
    return null;
  }

  return (
    <SurfacePanel className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
            Reader FAQ
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Questions readers ask before they start.
          </h2>
          <p className="mt-3 text-sm leading-7 text-neutral-300">
            Pricing, update pace, creator credit, and support should be easy to understand before someone commits to a long read.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Why this matters
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            Clear answers help readers decide faster and bounce less when they hit their first question.
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {faqItems.map((item, index) => (
          <article
            key={item.id || `${item.question}-${index}`}
            className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Question {index + 1}
            </p>
            <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-neutral-300">{item.answer}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {creatorHref ? (
          <button
            type="button"
            onClick={() => router.push(creatorHref)}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
          >
            More by this creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/faq")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          Open full FAQ
        </button>
        <button
          type="button"
          onClick={() => router.push("/support")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          Contact support
        </button>
      </div>
    </SurfacePanel>
  );
}
