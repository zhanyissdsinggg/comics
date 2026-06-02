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
import { StorefrontPage } from "../../components/storefront/StorefrontScaffold";
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
    eyebrow: "1. Open",
    title: "Start with the free part of the shelf.",
    body:
      "Some stories begin free so readers can test the hook before deciding where to go next.",
  },
  {
    eyebrow: "2. Unlock",
    title: "Use points when the route turns premium.",
    body:
      "Locked chapters and some premium beats use points so you can keep reading without losing your place.",
  },
  {
    eyebrow: "3. Keep going",
    title: "Your progress stays with you.",
    body:
      "The reader saves progress so your next session starts where you actually left off.",
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

const READING_BASICS = [
  "Some series start free.",
  "Locked chapters use points.",
  "Your place saves automatically.",
];

const BILLING_BASICS = [
  "Orders shows receipts and order IDs.",
  "Account shows your current plan state.",
  "Support handles purchase and billing issues.",
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
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]">
      <StructuredDataScript id="how-it-works-jsonld" data={structuredData} />
      <div className="flex flex-col gap-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="Reading flow"
            title="How reading works when the story is free, premium, or somewhere in between."
            description="The short version: start free where available, use points when the story turns locked, and let your progress stay synced."
            stats={[
              {
                label: "Start point",
                value: "Free chapters",
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
                  Open store
                </Link>
                <Link
                  href="/subscribe"
                  className={storefrontSecondaryButtonClass}
                >
                  View plans
                </Link>
              </>
            }
          />

          <StorefrontDesk
            eyebrow="Billing lane"
            title="Need the money side?"
            description="Orders, plans, and support all stay close to the reading flow."
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
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <SurfacePanel
              key={step.title}
              appearance="dark"
              accent={index === 0 ? "cyan" : index === 1 ? "rose" : "amber"}
            >
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
            <StorefrontSectionHeading
              eyebrow="Reading basics"
              title="What happens on the shelf"
              description="The point is to keep the path obvious: open a story, see what is free, unlock what is not, and get back in fast."
            />
            <div className="grid gap-3">
              {READING_BASICS.map((item) => (
                <StorefrontInfoCard
                  key={item}
                  eyebrow="Reading"
                  title={item}
                  description=""
                />
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="dark" accent="rose">
            <StorefrontSectionHeading
              eyebrow="Billing basics"
              title="Where the receipts and plan questions go"
              description="If the issue is commercial, the path stays simple: orders for proof, account for plan state, support for humans."
            />
            <div className="grid gap-3">
              {BILLING_BASICS.map((item) => (
                <StorefrontInfoCard
                  key={item}
                  eyebrow="Billing"
                  title={item}
                  description=""
                />
              ))}
            </div>
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
          <StorefrontSectionHeading
            eyebrow="FAQ"
            title="Reading + billing answers"
            description="These are the short answers that keep showing up once readers start spending points, managing plans, or checking receipts."
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {FAQ_ITEMS.map((item, index) => (
              <StorefrontInfoCard
                key={item.question}
                eyebrow={`FAQ ${index + 1}`}
                title={item.question}
                description={item.answer}
              />
            ))}
          </div>
        </SurfacePanel>
      </div>
    </StorefrontPage>
  );
}
