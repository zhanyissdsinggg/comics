import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import {
  StorefrontDesk,
  StorefrontInfoCard,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import SurfacePanel from "../../components/common/SurfacePanel";
import { createPageMetadata } from "../../lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
} from "../../lib/structuredData";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "How Reading Works",
  description: "Free chapters, points, and plans.",
  path: "/how-it-works",
});

const HOW_IT_WORKS_STEPS = [
  {
    eyebrow: "1. Start",
    title: "Start free.",
    body: "Start with free chapters.",
  },
  {
    eyebrow: "2. Unlock",
    title: "Unlock.",
    body: "Use points to keep going.",
  },
  {
    eyebrow: "3. Keep reading",
    title: "Read on.",
    body: "Your progress saves.",
  },
];

const FAQ_ITEMS = [
  {
    question: "What can I read for free on Gush?",
    answer: "Some titles start with free chapters.",
  },
  {
    question: "How do points work?",
    answer: "Points unlock locked chapters.",
  },
  {
    question: "What do plans change?",
    answer: "Plans can add extra reading perks.",
  },
  {
    question: "Do plans renew?",
    answer: "Yes. Plans renew monthly unless the offer says otherwise.",
  },
  {
    question: "How do I cancel a plan?",
    answer: "Go to Account to manage or end your plan.",
  },
  {
    question: "Where do I find receipts and order IDs?",
    answer: "Go to Orders.",
  },
];

export default function HowItWorksPage() {
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "How Reading Works", path: "/how-it-works" },
    ]),
    buildFaqStructuredData({
      path: "/how-it-works",
      name: `How Reading Works | ${siteConfig.siteName}`,
      description: "Free chapters, points, and plans.",
      items: FAQ_ITEMS,
    }),
  ].filter(Boolean);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#090b12_0%,#0f1119_34%,#13131d_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(255,79,154,0.12),transparent_20%),radial-gradient(circle_at_84%_10%,rgba(103,232,249,0.12),transparent_22%),radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.08),transparent_24%)]" />
      <StructuredDataScript id="how-it-works-jsonld" data={structuredData} />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="Reading"
            title="How reading works."
            description=""
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
                label: "Plans",
                value: "Monthly",
              },
            ]}
            actions={
              <>
                <Link href="/store" className={storefrontPrimaryButtonClass}>
                  Store
                </Link>
                <Link
                  href="/subscribe"
                  className={storefrontSecondaryButtonClass}
                >
                  Plans
                </Link>
              </>
            }
          />

          <StorefrontDesk
            eyebrow="More"
            title="Billing."
            actions={
              <>
                <Link href="/orders" className={storefrontPrimaryButtonClass}>
                  Orders
                </Link>
                <Link
                  href="/support"
                  className={storefrontSecondaryButtonClass}
                >
                  Support
                </Link>
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <SurfacePanel key={step.title} appearance="dark" accent="cyan">
              <StorefrontSectionHeading
                eyebrow={step.eyebrow}
                title={step.title}
              />
              <p className="mt-3 text-sm leading-[1.68] text-white/75">
                {step.body}
              </p>
            </SurfacePanel>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
            <StorefrontSectionHeading eyebrow="Reading" title="Basics." />
            <ul className="space-y-3 text-sm leading-[1.72] text-white/70">
              <li>Some series start free.</li>
              <li>Locked chapters use points.</li>
              <li>Your place saves automatically.</li>
            </ul>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
            <StorefrontSectionHeading eyebrow="Billing" title="Billing." />
            <ul className="space-y-3 text-sm leading-[1.72] text-white/70">
              <li>Orders shows receipts.</li>
              <li>Account shows your plan.</li>
              <li>Support handles billing issues.</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link href="/orders" className={storefrontPrimaryButtonClass}>
                Orders
              </Link>
              <Link href="/support" className={storefrontSecondaryButtonClass}>
                Support
              </Link>
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
          <StorefrontSectionHeading eyebrow="FAQ" title="Answers." />
          <div className="grid gap-3 lg:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <StorefrontInfoCard
                key={item.question}
                title={item.question}
                description={item.answer}
              />
            ))}
          </div>
        </SurfacePanel>
      </main>
    </div>
  );
}
