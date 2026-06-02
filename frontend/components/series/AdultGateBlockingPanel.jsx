"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontBadgeClass,
  storefrontChipClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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
    "Age check first",
    "Turn it off anytime",
  ];

  return (
    <section className="flex min-h-[50vh] items-center justify-center px-4">
      <SurfacePanel
        appearance="dark"
        tone="muted"
        accent="rose"
        className="w-full max-w-3xl border-white/10 bg-[linear-gradient(145deg,rgba(20,16,28,0.98)_0%,rgba(11,12,18,0.96)_50%,rgba(16,11,22,0.98)_100%)] p-6 shadow-[0_30px_82px_rgba(0,0,0,0.34)] sm:p-7"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className={`${storefrontBadgeClass} border-[rgba(255,151,189,0.24)] bg-[rgba(255,79,154,0.12)] text-[#ffd6e5]`}>
              18+ access
            </p>
            <h2 className="mt-3 font-display text-[2.2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/72">
              {description}
            </p>
          </div>
          <div className={`${storefrontNoticeClass} px-4 py-4 text-left`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
              Access
            </p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Private by default.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {trustItems.map((item) => (
            <span
              key={item}
              className={`${storefrontChipClass} min-h-0 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-white/62`}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenModal}
            className={`px-5 py-2.5 text-sm ${storefrontPrimaryButtonClass}`}
          >
            {ADULT_GATE_ACTION_LABELS[status] || "Keep Going"}
          </button>
          {forceDocumentNavigation ? (
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigateWithDocument("/");
              }}
              className={`inline-flex items-center justify-center px-5 py-2.5 text-sm ${storefrontSecondaryButtonClass}`}
            >
              Home
            </a>
          ) : (
            <Link
              href="/"
              className={`inline-flex items-center justify-center px-5 py-2.5 text-sm ${storefrontSecondaryButtonClass}`}
            >
              Home
            </Link>
          )}
        </div>
      </SurfacePanel>
    </section>
  );
}
