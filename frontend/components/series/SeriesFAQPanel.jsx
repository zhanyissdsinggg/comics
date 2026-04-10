"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { getSeriesFaqItems } from "../../lib/storefrontFaq";
import { buildSupportPath } from "../../lib/supportRouting";

export default function SeriesFAQPanel({
  series,
  episodes = [],
  creatorHref = "",
}) {
  const router = useRouter();
  const faqItems = useMemo(
    () => getSeriesFaqItems({ series, episodes }),
    [episodes, series],
  );
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]";

  if (faqItems.length === 0) {
    return null;
  }

  return (
    <SurfacePanel className="space-y-5" appearance="light" accent="blue">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Reader FAQ
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Answers.
          </h2>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {faqItems.map((item) => (
          <article
            key={item.id || item.question}
            className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-5 py-4"
          >
            <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
              {item.question}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {item.answer}
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {creatorHref ? (
          <button
            type="button"
            onClick={() => router.push(creatorHref)}
            className={primaryButtonClass}
          >
            More by this creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/faq")}
          className={secondaryButtonClass}
        >
          More answers
        </button>
        <button
          type="button"
          onClick={() =>
            router.push(
              buildSupportPath({
                topic: "reader",
                context: `Series question before starting ${series?.title || "this title"}`,
              }),
            )
          }
          className={secondaryButtonClass}
        >
          Support
        </button>
      </div>
    </SurfacePanel>
  );
}
