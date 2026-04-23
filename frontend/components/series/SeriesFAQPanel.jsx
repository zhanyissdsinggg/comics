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
    "rounded-full border-[3px] border-black bg-[#ff007a] px-5 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]";
  const secondaryButtonClass =
    "rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-black transition hover:-translate-y-0.5 hover:bg-[#fff7cf]";

  if (faqItems.length === 0) {
    return null;
  }

  return (
    <SurfacePanel className="space-y-5" appearance="light" accent="blue">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-black/45">
            Reader FAQ
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-black sm:text-3xl">
            Answers.
          </h2>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {faqItems.map((item) => (
          <article
            key={item.id || item.question}
            className="rounded-[26px] border-[3px] border-black bg-white px-5 py-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
          >
            <h3 className="text-base font-black uppercase tracking-[0.04em] text-black sm:text-lg">
              {item.question}
            </h3>
            <p className="mt-3 text-sm leading-7 text-black/68">
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
