"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ADULT_GATE_ACTION_LABELS,
  ADULT_GATE_DESCRIPTIONS,
  ADULT_GATE_TITLES,
} from "../../lib/adultGateCopy";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

export default function AdultGateBlockingPanel({ status, onOpenModal }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const title = ADULT_GATE_TITLES[status] || ADULT_GATE_TITLES.NEED_AGE_CONFIRM;
  const description =
    ADULT_GATE_DESCRIPTIONS[status] || ADULT_GATE_DESCRIPTIONS.NEED_AGE_CONFIRM;
  const forceDocumentNavigation = shouldUseDocumentNavigation(pathname, "/");
  const trustItems = [
    "Private by default",
    "Age-gated before access",
    "You can turn 18+ browsing off anytime",
  ];

  return (
    <section className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-[32px] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/45">
              18+ access
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.04em] text-black">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-black/68">
              {description}
            </p>
          </div>
          <div className="rounded-[24px] border-[3px] border-black bg-[#fff7cf] px-4 py-4 text-left shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              Access
            </p>
            <p className="mt-2 text-sm leading-6 text-black/72">
              Sign in and confirm age if needed.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {trustItems.map((item) => (
            <span
              key={item}
              className="rounded-full border-[2px] border-black bg-[#eefcff] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-black/68"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenModal}
            className="rounded-full border-[3px] border-black bg-[#ff007a] px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          >
            {ADULT_GATE_ACTION_LABELS[status] || "Continue"}
          </button>
          {forceDocumentNavigation ? (
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigateWithDocument("/");
              }}
              className="inline-flex items-center justify-center rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]"
            >
              Browse standard catalog
            </a>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]"
            >
              Browse standard catalog
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
