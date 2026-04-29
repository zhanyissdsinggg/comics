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
  title: "18+ Access",
  description: "18+ access controls.",
  path: "/mature-content",
});

const FAQ_ITEMS = [
  {
    question: "What counts as mature content on Gush?",
    answer:
      "Mature titles stay hidden until 18+ is on.",
  },
    {
      question: "Who needs to complete an age check?",
      answer:
        "Sign in and confirm once.",
  },
  {
    question: "What does Hide 18+ history do?",
    answer:
      "It hides 18+ titles from visible history.",
  },
  {
    question: "Can region settings change what I see?",
    answer:
      "Yes. Rules can vary by region.",
  },
  {
    question: "What if age check fails or 18+ titles still look hidden?",
    answer: "Try the gate again or contact support.",
  },
];

const CONTROL_CARDS = [
  {
    title: "18+ toggle",
    body: "Keep mature titles hidden until you turn them on.",
  },
  {
    title: "Age check",
    body: "Confirm once after you sign in.",
  },
  {
    title: "Hide history",
    body: "Keep 18+ reads out of visible history.",
  },
  {
    title: "Support",
    body: "Use support if the gate gets stuck.",
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
        "How 18+ access works.",
      items: FAQ_ITEMS,
    }),
  ].filter(Boolean);

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <StructuredDataScript id="mature-content-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="18+"
            title="18+ access"
            description=""
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
            eyebrow="Controls"
            title="18+ settings."
            description=""
            actions={
              <>
                <Link
                  href="/adult-gate"
                  className={storefrontPrimaryButtonClass}
                >
                  Open 18+
                </Link>
                <Link
                  href="/account"
                  className={storefrontSecondaryButtonClass}
                >
                  Account
                </Link>
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {CONTROL_CARDS.map((card) => (
            <SurfacePanel
              key={card.title}
              appearance="dark"
              accent="blue"
              className="border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              <StorefrontSectionHeading
                title={card.title}
              />
              <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
                {card.body}
              </p>
            </SurfacePanel>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel
            className="space-y-5 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
              <StorefrontSectionHeading
                eyebrow="Check"
                title="Before you enter"
              />
              <ul className="space-y-3 text-sm font-medium leading-7 text-white/70">
                <li>Sign in</li>
                <li>Confirm your age</li>
                <li>Use support if you get stuck</li>
              </ul>
          </SurfacePanel>

          <SurfacePanel
            className="space-y-5 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            <StorefrontSectionHeading eyebrow="More" title="More" />
            <div className="space-y-3">
              {[
                {
                  href: "/account",
                  title: "Account settings",
                  body: "Manage your preferences.",
                },
                {
                  href: "/faq",
                  title: "FAQ",
                  body: "Answers.",
                },
                {
                  href: "/support",
                  title: "Support",
                  body: "Talk to support.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block transition-all"
                >
                  <StorefrontInfoCard
                    title={item.title}
                    description={item.body}
                    className="border-2 border-white/15 bg-[#0a0a0a] hover:bg-[#111111]"
                  />
                </Link>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel
          className="space-y-5 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          appearance="dark"
          accent="blue"
        >
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
