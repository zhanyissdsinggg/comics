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
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/70">
            FAQ
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-white sm:text-3xl">
            Answers
          </h2>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {faqItems.map((item) => (
          <article
            key={item.id || item.question}
            className="rounded-[26px] border-2 border-white/20 bg-black px-5 py-4 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <h3 className="text-base font-black uppercase tracking-[-0.02em] text-white sm:text-lg">
              {item.question}
            </h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
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
