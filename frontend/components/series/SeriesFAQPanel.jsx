"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { getSeriesFaqItems } from "../../lib/storefrontFaq";
import { buildSupportPath } from "../../lib/supportRouting";

export default function SeriesFAQPanel({ series, episodes = [], creatorHref = "" }) {
  const router = useRouter();
  const faqItems = useMemo(() => getSeriesFaqItems({ series, episodes }), [episodes, series]);
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";

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
            Quick answers before you start.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            The best pre-read questions are simple: Is it finished, can I try it, how much is there, and where do I go if something breaks?
          </p>
        </div>
        <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-4 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Why it helps
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Clear answers keep small questions from turning into a bounce.
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {faqItems.map((item, index) => (
          <article
            key={item.id || `${item.question}-${index}`}
            className="rounded-[24px] border border-black/8 bg-[#f8f9fc] px-5 py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Question {index + 1}
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-950 sm:text-lg">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
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
          Get help
        </button>
      </div>
    </SurfacePanel>
  );
}
