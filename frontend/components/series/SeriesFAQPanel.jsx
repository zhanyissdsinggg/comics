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
    "rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-black/90 hover:shadow-[0_10px_24px_rgba(15,23,42,0.14)] active:translate-y-px";
  const secondaryButtonClass =
    "rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/18 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] active:translate-y-px";

  if (faqItems.length === 0) {
    return null;
  }

  return (
    <SurfacePanel className="space-y-5" appearance="light" accent="blue">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-black/45">
            FAQ
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-black sm:text-3xl">
            FAQ.
          </h2>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {faqItems.map((item) => (
          <article
            key={item.id || item.question}
            className="rounded-[26px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] px-5 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
          >
            <h3 className="text-base font-semibold tracking-[-0.02em] text-black sm:text-lg">
              {item.question}
            </h3>
            <p className="mt-3 text-sm font-medium leading-7 text-black/68">
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
            Creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/faq")}
          className={secondaryButtonClass}
        >
          FAQ
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
