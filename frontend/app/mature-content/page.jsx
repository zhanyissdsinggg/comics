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
  title: "Mature Content",
  description:
    "See how 18+ access, age checks, and visibility controls work on Gush.",
  path: "/mature-content",
});

const FAQ_ITEMS = [
  {
    question: "What counts as mature content on Gush?",
    answer:
      "Mature content means titles that stay hidden until 18+ access is turned on and the required age check is complete.",
  },
  {
    question: "Who needs to complete an age check?",
    answer:
      "Readers who want the 18+ catalog may need to sign in and confirm age for the current region.",
  },
  {
    question: "What does Hide 18+ history do?",
    answer:
      "It hides mature titles from visible reading history on the account or device where it is turned on.",
  },
  {
    question: "Can region settings change what I see?",
    answer:
      "Yes. Mature-content rules and age thresholds can depend on your region setting.",
  },
  {
    question: "What if age check fails or 18+ titles still look hidden?",
    answer:
      "Try the age check again, confirm your region in Account, and contact Support if access still looks wrong.",
  },
];

const CONTROL_CARDS = [
  {
    title: "Turn 18+ on or off",
    body: "Use the 18+ toggle in the site header when you want access.",
  },
  {
    title: "Confirm age once",
    body: "The site may ask for a one-time age check for your region.",
  },
  {
    title: "Hide 18+ history",
    body: "Use the account setting to hide mature history on that device.",
  },
  {
    title: "Get support",
    body: "Support can help if access still looks wrong.",
  },
];

export default function MatureContentPage() {
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Mature Content", path: "/mature-content" },
    ]),
    buildFaqStructuredData({
      path: "/mature-content",
      name: `Mature Content | ${siteConfig.siteName}`,
      description:
        "See how 18+ access, region checks, and 18+ history controls work on Gush.",
      items: FAQ_ITEMS,
    }),
  ].filter(Boolean);

  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <StructuredDataScript id="mature-content-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Mature content"
            title="18+ access."
            description="Mature titles stay hidden until you turn them on."
            stats={[
              {
                label: "Default",
                value: "Hidden",
              },
              {
                label: "Age check",
                value: "One-time",
              },
              {
                label: "Privacy",
                value: "18+ history",
              },
              {
                label: "Help",
                value: "Support",
              },
            ]}
            actions={
              <>
                <Link
                  href="/adult-gate"
                  className={storefrontPrimaryButtonClass}
                >
                  18+ access
                </Link>
                <Link href="/support" className={storefrontSecondaryButtonClass}>
                  Support
                </Link>
              </>
            }
          />

          <StorefrontDesk
            eyebrow="Access"
            title="Age gate and privacy."
            description="Keep 18+ hidden by default, confirm the age check once, and control whether mature history stays visible on this device."
            actions={
              <>
                <Link
                  href="/adult-gate"
                  className={storefrontPrimaryButtonClass}
                >
                  18+ gate
                </Link>
                <Link
                  href="/account"
                  className={storefrontSecondaryButtonClass}
                >
                  Open account
                </Link>
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {CONTROL_CARDS.map((card) => (
            <SurfacePanel key={card.title} appearance="light" accent="blue">
              <StorefrontSectionHeading
                title={card.title}
                description={card.body}
              />
            </SurfacePanel>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading
              eyebrow="Checklist"
              title="If 18+ stays hidden."
            />
            <ul className="space-y-3 text-sm font-medium leading-7 text-black/68">
              <li>Sign in if the gate asks for account access.</li>
              <li>Confirm the age check for your current region.</li>
              <li>
                Review the region setting in Account if the threshold looks
                wrong.
              </li>
              <li>
                Check whether Hide 18+ history is changing what appears in your
                account view.
              </li>
              <li>
                If access still looks wrong, contact Support and name the page
                or title.
              </li>
            </ul>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading eyebrow="Related pages" title="Related." />
            <div className="space-y-3">
              {[
                {
                  href: "/account",
                  title: "Account settings",
                  body: "Check region, language, and 18+ history settings.",
                },
                {
                  href: "/faq",
                  title: "FAQ",
                  body: "Quick answers on age checks and account access.",
                },
                {
                  href: "/support",
                  title: "Support",
                  body: "Contact us if a mature title is still missing after the age check.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                >
                  <StorefrontInfoCard
                    title={item.title}
                    description={item.body}
                    className="hover:bg-[#fff6c7]"
                  />
                </Link>
              ))}
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
