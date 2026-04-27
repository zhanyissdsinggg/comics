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
      "Mature titles stay hidden until 18+ access is enabled.",
  },
  {
    question: "Who needs to complete an age check?",
    answer:
      "Sign in and confirm age when prompted.",
  },
  {
    question: "What does Hide 18+ history do?",
    answer:
      "It hides mature titles from visible reading history.",
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
    body: "",
  },
  {
    title: "Age check",
    body: "",
  },
  {
    title: "Hide history",
    body: "",
  },
  {
    title: "Support",
    body: "",
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
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <StructuredDataScript id="mature-content-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="18+"
            title="18+ access."
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
            title="18+."
            description=""
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
              appearance="light"
              accent="blue"
              className="border border-black/10 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.07)]"
            >
              <StorefrontSectionHeading
                title={card.title}
              />
            </SurfacePanel>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel
            className="space-y-5 border border-black/10 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.07)]"
            appearance="light"
            accent="blue"
          >
            <StorefrontSectionHeading
              eyebrow="Check"
              title="Before you enter."
            />
            <ul className="space-y-3 text-sm font-medium leading-7 text-black/68">
              <li>Sign in.</li>
              <li>Confirm age.</li>
              <li>Support.</li>
            </ul>
          </SurfacePanel>

          <SurfacePanel
            className="space-y-5 border border-black/10 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.07)]"
            appearance="light"
            accent="blue"
          >
            <StorefrontSectionHeading eyebrow="More" title="Pages." />
            <div className="space-y-3">
              {[
                {
                  href: "/account",
                  title: "Account settings",
                  body: "",
                },
                {
                  href: "/faq",
                  title: "FAQ",
                  body: "",
                },
                {
                  href: "/support",
                  title: "Support",
                  body: "",
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
                    className="border border-black/10 bg-black/[0.03] hover:bg-black/[0.05]"
                  />
                </Link>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel
          className="space-y-5 border border-black/10 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.07)]"
          appearance="light"
          accent="blue"
        >
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
