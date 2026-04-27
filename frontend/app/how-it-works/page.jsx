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
  title: "Access",
  description: "Free reads and unlocks.",
  path: "/how-it-works",
});

const HOW_IT_WORKS_STEPS = [
  {
    eyebrow: "1. Start",
    title: "Start free.",
    body: "",
  },
  {
    eyebrow: "2. Unlock",
    title: "Unlock.",
    body: "",
  },
  {
    eyebrow: "3. Keep reading",
    title: "Keep reading.",
    body: "",
  },
];

const FAQ_ITEMS = [
  {
    question: "What can I read for free on Gush?",
    answer: "Some titles start with free chapters.",
  },
  {
    question: "How do points work?",
    answer: "Points unlock locked episodes.",
  },
  {
    question: "What does membership change?",
    answer: "Plans can add perks for regular reading.",
  },
  {
    question: "Is membership recurring?",
    answer: "Yes. Plans renew monthly unless the plan says otherwise.",
  },
  {
    question: "How do I cancel membership?",
    answer: "Open Account to manage or end your plan.",
  },
  {
    question: "Where do I find receipts and order IDs?",
    answer: "Open Orders.",
  },
];

export default function HowItWorksPage() {
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Access", path: "/how-it-works" },
    ]),
    buildFaqStructuredData({
      path: "/how-it-works",
      name: `Access | ${siteConfig.siteName}`,
      description: "Free reads and unlocks.",
      items: FAQ_ITEMS,
    }),
  ].filter(Boolean);

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <StructuredDataScript id="how-it-works-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Access"
            title="Access."
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
            title="Access."
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
              />
            </SurfacePanel>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading eyebrow="Access" title="Access." />
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading eyebrow="Billing" title="Billing." />
            <ul className="space-y-3 text-sm font-medium leading-7 text-black/68">
              <li>Orders shows packs, plans, and order IDs.</li>
              <li>Account shows your plan.</li>
              <li>Support handles billing issues.</li>
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
          <StorefrontSectionHeading eyebrow="FAQ" title="FAQ." />
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
