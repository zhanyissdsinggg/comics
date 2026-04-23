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
    <div className="min-h-screen overflow-hidden bg-black text-black">
      <StructuredDataScript id="how-it-works-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
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
            eyebrow="Overview"
            title="Free, then points or plans."
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
            <SurfacePanel key={step.title} appearance="light" accent="blue">
              <StorefrontSectionHeading
                eyebrow={step.eyebrow}
                title={step.title}
                description={step.body}
              />
            </SurfacePanel>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading eyebrow="Access" title="Access." />
            <div className="space-y-4 text-sm font-medium leading-7 text-black/68">
              <p>Free access depends on the title.</p>
              <p>Locked episodes use points.</p>
              <p>Plans renew monthly.</p>
            </div>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading eyebrow="Billing" title="Billing." />
            <ul className="space-y-3 text-sm font-medium leading-7 text-black/68">
              <li>Open Orders for packs, plans, and order IDs.</li>
              <li>Open Account to manage your plan.</li>
              <li>Use Support if a charge looks wrong.</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link href="/orders" className={storefrontPrimaryButtonClass}>
                Orders
              </Link>
              <Link
                href="/support"
                className={storefrontSecondaryButtonClass}
              >
                Support
              </Link>
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <StorefrontSectionHeading eyebrow="FAQ" title="Answers." />
          <div className="grid gap-3 lg:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <StorefrontInfoCard
                key={item.question}
                title={item.question}
                description={item.answer}
              >
              </StorefrontInfoCard>
            ))}
          </div>
        </SurfacePanel>
      </main>
    </div>
  );
}
