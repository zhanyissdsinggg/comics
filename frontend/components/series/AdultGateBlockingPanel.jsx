"use client";

import {
  ADULT_GATE_ACTION_LABELS,
  ADULT_GATE_DESCRIPTIONS,
  ADULT_GATE_TITLES,
} from "../../lib/adultGateCopy";

export default function AdultGateBlockingPanel({ status, onOpenModal }) {
  const title = ADULT_GATE_TITLES[status] || ADULT_GATE_TITLES.NEED_AGE_CONFIRM;
  const description =
    ADULT_GATE_DESCRIPTIONS[status] || ADULT_GATE_DESCRIPTIONS.NEED_AGE_CONFIRM;

  return (
    <section className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-900 bg-neutral-900/60 p-6 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-neutral-400">{description}</p>
        <button
          type="button"
          onClick={onOpenModal}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900"
        >
          {ADULT_GATE_ACTION_LABELS[status] || "Continue"}
        </button>
      </div>
    </section>
  );
}
