import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import SurfacePanel from "../../components/common/SurfacePanel";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
} from "../../lib/structuredData";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "How Gush Works",
  description: "Free reads, points, and plans on Gush.",
  path: "/how-it-works",
});

const HOW_IT_WORKS_STEPS = [
  {
    eyebrow: "1. Browse",
    title: "Start free where a title allows it.",
    body: "Some titles start free or with previews.",
  },
  {
    eyebrow: "2. Unlock",
    title: "Use points to unlock more episodes.",
    body: "Use points for locked episodes.",
  },
  {
    eyebrow: "3. Keep reading",
    title: "Keep progress and purchases on your account.",
    body: "Sign in to keep progress, purchases, and settings together.",
  },
];

const FAQ_ITEMS = [
  {
    question: "What can I read for free on Gush?",
    answer: "Some titles start with free chapters or previews.",
  },
  {
    question: "How do points work?",
    answer: "Points unlock locked episodes.",
  },
  {
    question: "What does membership change?",
    answer:
      "Plans can add discounts, free reads, shorter waits, or monthly points.",
  },
  {
    question: "Is membership recurring?",
    answer: "Yes. Plans renew monthly unless the plan says otherwise.",
  },
  {
    question: "How do I cancel membership?",
    answer:
      "Open Account to manage or end your plan. Use Support if anything looks wrong.",
  },
  {
    question: "Where do I find receipts and order IDs?",
    answer: "Open Orders for packs, plans, charges, and order IDs.",
  },
];

export default function HowItWorksPage() {
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "How It Works", path: "/how-it-works" },
    ]),
    buildFaqStructuredData({
      path: "/how-it-works",
      name: `How Gush Works | ${siteConfig.siteName}`,
      description: "Free reads, points, and plans on Gush.",
      items: FAQ_ITEMS,
    }),
  ].filter(Boolean);

  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <StructuredDataScript id="how-it-works-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="How it works"
            title="How reading works."
            description="Free where available. Then points or plans."
            stats={[
              {
                label: "Free access",
                value: "Title-based",
              },
              {
                label: "Unlocks",
                value: "Points",
              },
              {
                label: "Membership",
                value: "Monthly",
              },
            ]}
            actions={
              <>
                <Link
                  href="/store"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Store
                </Link>
                <Link
                  href="/subscribe"
                  className="rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
                >
                  Plans
                </Link>
              </>
            }
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Overview
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  Free, then points or plans.
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/orders"
                className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Orders
              </Link>
              <Link
                href="/support"
                className="rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                Support
              </Link>
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <SurfacePanel key={step.title} appearance="light" accent="blue">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {step.eyebrow}
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
                {step.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {step.body}
              </p>
            </SurfacePanel>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Access
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Access.
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-slate-600">
              <p>Free access depends on the title.</p>
              <p>Locked episodes use points.</p>
              <p>Plans renew monthly.</p>
            </div>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Billing
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Billing.
              </h2>
            </div>
            <ul className="space-y-3 text-sm leading-7 text-slate-600">
              <li>Open Orders for packs, plans, and order IDs.</li>
              <li>Open Account to manage your plan.</li>
              <li>Use Support if a charge looks wrong.</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/orders"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Orders
              </Link>
              <Link
                href="/support"
                className="rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                Support
              </Link>
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              FAQ
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
              Answers.
            </h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.question}
                className="rounded-[24px] border border-[color:var(--gush-border)] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
              >
                <h3 className="text-base font-semibold text-slate-950">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </SurfacePanel>
      </main>
    </div>
  );
}
