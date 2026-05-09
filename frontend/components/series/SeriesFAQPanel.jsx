"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { getSeriesFaqItems } from "../../lib/storefrontFaq";
import { buildSupportPath } from "../../lib/supportRouting";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

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

  if (faqItems.length === 0) {
    return null;
  }

  return (
    <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/58">
            FAQ
          </p>
          <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.35rem]">
            Answers
          </h2>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {faqItems.map((item) => (
          <article
            key={item.id || item.question}
            className="rounded-[26px] border border-white/10 bg-white/[0.03] px-5 py-4 text-white shadow-[0_18px_40px_rgba(8,6,20,0.22)]"
          >
            <h3 className="text-base font-semibold tracking-[-0.03em] text-white sm:text-lg">
              {item.question}
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/72">
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
            className={storefrontPrimaryButtonClass}
          >
            Creator Page
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/faq")}
          className={storefrontSecondaryButtonClass}
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
          className={storefrontSecondaryButtonClass}
        >
          Support
        </button>
      </div>
    </SurfacePanel>
  );
}
