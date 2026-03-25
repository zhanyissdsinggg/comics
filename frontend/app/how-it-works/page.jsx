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
  description:
    "Learn what is free, how points work, how membership works, and where to get billing help on Gush.",
  path: "/how-it-works",
});

const HOW_IT_WORKS_STEPS = [
  {
    eyebrow: "1. Browse",
    title: "Start with free chapters when they are available.",
    body:
      "Browse comics and novels, then look for free chapters or preview access before you spend anything.",
  },
  {
    eyebrow: "2. Unlock",
    title: "Use points to unlock more episodes.",
    body:
      "When a chapter is not free, you can use points to unlock it on your account. Point packs are one-time purchases.",
  },
  {
    eyebrow: "3. Keep reading",
    title: "Save progress, purchases, and settings on your account.",
    body:
      "Your library, purchases, reading progress, mature-content settings, and support history are easier to manage once you are signed in.",
  },
];

const FAQ_ITEMS = [
  {
    question: "What can I read for free on Gush?",
    answer:
      "Some series offer free first chapters or preview access. Free availability depends on the title and can change over time.",
  },
  {
    question: "How do points work?",
    answer:
      "Points are used to unlock locked episodes. You can buy point packs from the Store, and eligible purchases appear in Purchases.",
  },
  {
    question: "What does membership change?",
    answer:
      "Membership can add discounts, daily free reads, shorter wait timers, or monthly point benefits depending on the plan shown on the Membership page.",
  },
  {
    question: "Is membership recurring?",
    answer:
      "Yes. Membership plans are monthly unless the plan details say otherwise, and renewal timing appears in your account when a plan is active.",
  },
  {
    question: "How do I cancel membership?",
    answer:
      "Open Account, review your current plan, and end the membership there. If anything looks wrong, contact Support.",
  },
  {
    question: "Where do I find receipts and order IDs?",
    answer:
      "Open Purchases to review point packs, memberships, charge status, and the order ID you may need for billing help.",
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
      description:
        "Learn what is free, how points work, how membership works, and where to get billing help on Gush.",
      items: FAQ_ITEMS,
    }),
  ].filter(Boolean);

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <StructuredDataScript id="how-it-works-jsonld" data={structuredData} />
      <SiteHeader variant="light" />
      <main className="relative px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="How it works"
            title="How Gush works."
            description="Read free where it is available, unlock more with points, or choose membership."
            secondary="Free chapters, point packs, membership, receipts, and billing help."
            stats={[
              {
                label: "Free access",
                value: "Title-based",
                hint: "Free chapters depend on the series.",
              },
              {
                label: "Unlocks",
                value: "Points",
                hint: "Locked episodes are unlocked with points on your account.",
              },
              {
                label: "Membership",
                value: "Monthly",
                hint: "Renewal timing appears in your account when active.",
              },
              {
                label: "Billing help",
                value: "Support",
                hint: `You can contact ${siteConfig.supportEmail} if billing needs a person.`,
              },
            ]}
            actions={
              <>
                <Link
                  href="/store"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View point packs
                </Link>
                <Link
                  href="/subscribe"
                  className="rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  View Plans
                </Link>
              </>
            }
          />

          <section className="grid gap-4 lg:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <SurfacePanel key={step.title} appearance="light" accent="blue">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {step.eyebrow}
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {step.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{step.body}</p>
              </SurfacePanel>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Pricing basics
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  What is free, what costs points, and what membership changes.
                </h2>
              </div>
              <div className="space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  Free access depends on the title. Some series offer free first chapters, preview pages, or timed free access.
                </p>
                <p>
                  Locked episodes use points. Point packs are one-time purchases, and your purchase history appears in Purchases once the order is recorded.
                </p>
                <p>
                  Membership is a separate monthly plan for readers who want better value over time. Plan benefits can include lower unlock prices, daily free reads, shorter wait timers, or monthly points, depending on the plan you choose.
                </p>
                <p>
                  Membership benefits only apply while the plan is active. Account, purchase, and receipt history stay tied to your signed-in account.
                </p>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Billing and receipts
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Where to check charges, cancellation, and billing help.
                </h2>
              </div>
              <ul className="space-y-3 text-sm leading-7 text-slate-600">
                <li>Purchases is where you can review point packs, memberships, and order IDs.</li>
                <li>Account is where you can review your active membership and end it when that option is available.</li>
                <li>If a charge looks wrong, contact Support and include the order ID so the team can find it faster.</li>
                <li>Refund handling depends on the purchase status and whether the purchase still qualifies.</li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/orders"
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View purchases
                </Link>
                <Link
                  href="/support"
                  className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  Contact support
                </Link>
              </div>
            </SurfacePanel>
          </section>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Quick answers
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                The questions readers usually ask first.
              </h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[24px] border border-black/8 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                >
                  <h3 className="text-base font-semibold text-slate-950">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>
      </main>
    </div>
  );
}
