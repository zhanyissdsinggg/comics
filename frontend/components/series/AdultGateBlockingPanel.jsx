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
    "18+ can be turned off anytime",
  ];

  return (
    <section className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.12)] sm:p-7">
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
          <div className="rounded-[24px] border border-black/10 bg-[#f8f9fb] px-4 py-4 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              Access
            </p>
            <p className="mt-2 text-sm leading-6 text-black/72">
              Sign in and confirm age.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {trustItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-black/10 bg-[#f6f7fb] px-3 py-1.5 text-xs font-semibold tracking-[0.03em] text-black/68"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenModal}
            className="rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-black/90"
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
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-black transition hover:border-black/18 hover:bg-black/[0.03]"
            >
              Catalog
            </a>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-black transition hover:border-black/18 hover:bg-black/[0.03]"
            >
              Catalog
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
