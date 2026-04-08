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
      <div className="w-full max-w-2xl rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_22px_52px_rgba(15,23,42,0.08)] sm:p-7 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(18,24,35,0.98),rgba(12,18,28,0.98))] dark:shadow-[0_30px_72px_rgba(0,0,0,0.34)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-neutral-400">
              18+ access
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-neutral-300">
              {description}
            </p>
          </div>
          <div className="rounded-[24px] border border-[rgba(134,98,69,0.14)] bg-[rgba(134,98,69,0.06)] px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-white/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-neutral-400">
              Access
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-neutral-300">
              Sign in and confirm age if needed.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {trustItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-black/8 bg-white/84 px-3 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-300"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenModal}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200"
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
              className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:border-white/18 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              Browse standard catalog
            </a>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:border-white/18 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              Browse standard catalog
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
