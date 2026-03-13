import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import InfoPageNav from "../../components/layout/InfoPageNav";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Help & FAQ",
  description: "Common questions about purchases, subscriptions, adult content, and account support.",
  path: "/faq",
});

const FAQ = [
  {
    q: "How do I unlock episodes?",
    a: "Use POINTS to unlock or wait for TTF if the series is eligible. Subscription benefits may also reduce the cost on selected titles.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Open Account, review your subscription section, and cancel there. You can re-subscribe later without losing access to the rest of your account.",
  },
  {
    q: "Where can I see my orders?",
    a: "Visit the orders ledger to review recent purchases, reconciliation state, and refund eligibility from one place.",
  },
  {
    q: "Why can't I see adult series?",
    a: "Enable 18+ mode and complete the age gate flow. The catalog view changes immediately after the gate confirms access.",
  },
];

const QUICK_LINKS = [
  {
    title: "Support form",
    description: "Send billing, account, or reading issues without hunting for the right channel.",
    href: "/support",
    label: "Open support",
  },
  {
    title: "Orders",
    description: "Review receipts, reconciliation, and refund status in the same ledger view.",
    href: "/orders",
    label: "View orders",
  },
  {
    title: "Account center",
    description: "Manage subscriptions, history, preferences, and notification settings.",
    href: "/account",
    label: "Go to account",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <main className="px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <InfoPageNav current="faq" />

          <EditorialHero
            eyebrow="Help & FAQ"
            title="Short answers for the issues users hit most often."
            description="This page covers the repeat questions around unlocking, subscriptions, order history, and adult catalog access so users can recover quickly without opening a ticket first."
            secondary="When the answer here is not enough, the support form and email path remain one click away."
            actions={
              <>
                <Link
                  href="/support"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Contact support
                </Link>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200"
                >
                  Email support
                </a>
              </>
            }
            stats={[
              {
                label: "Answers",
                value: String(FAQ.length),
                hint: "Focused on the support topics users reach for most often.",
              },
              {
                label: "Support",
                value: "Email or form",
                hint: "Escalation stays available if the self-serve answer does not solve it.",
              },
              {
                label: "Billing",
                value: "Order ledger",
                hint: "Receipts and refund state now live in a dedicated orders view.",
              },
              {
                label: "Adult access",
                value: "18+ gate",
                hint: "Catalog visibility depends on the age-gate flow and current preference state.",
              },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <SurfacePanel className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Frequently asked questions
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Quick fixes before you open a ticket.
                </h2>
              </div>
              <div className="space-y-3">
                {FAQ.map((item, index) => (
                  <div
                    key={item.q}
                    className="rounded-[24px] border border-white/8 bg-black/20 px-5 py-4 backdrop-blur-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                      Question {index + 1}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-white">{item.q}</h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-300">{item.a}</p>
                  </div>
                ))}
              </div>
            </SurfacePanel>

            <div className="grid gap-4">
              {QUICK_LINKS.map((item) => (
                <SurfacePanel key={item.title} className="h-full">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Shortcut</p>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                    {item.title}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-neutral-300">{item.description}</p>
                  <Link
                    href={item.href}
                    className="mt-6 inline-flex rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-emerald-300 hover:text-emerald-200"
                  >
                    {item.label}
                  </Link>
                </SurfacePanel>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
