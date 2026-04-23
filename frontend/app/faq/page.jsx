import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import {
  StorefrontDesk,
  StorefrontInfoCard,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
} from "../../lib/structuredData";
import { getSiteFaqItems } from "../../lib/storefrontFaq";

export const metadata = createPageMetadata({
  title: "Help & FAQ",
  description:
    "Quick answers on billing, access, membership, and 18+ settings.",
  path: "/faq",
});

const FAQ = getSiteFaqItems().map((item) => ({
  q: item.question,
  a: item.answer,
}));

const QUICK_LINKS = [
  {
    title: "Support",
    description: "Billing or access help.",
    href: "/support",
    label: "Support",
  },
  {
    title: "How it works",
    description: "Points and plans.",
    href: "/how-it-works",
    label: "Guide",
  },
  {
    title: "Mature content",
    description: "18+ access settings.",
    href: "/mature-content",
    label: "18+ access",
  },
];

export default function FAQPage() {
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "FAQ", path: "/faq" },
    ]),
    buildFaqStructuredData({
      path: "/faq",
      name: `Help & FAQ | ${siteConfig.siteName}`,
      description:
        "Quick answers on billing, access, membership, and 18+ settings.",
      items: FAQ,
    }),
  ].filter(Boolean);

  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <StructuredDataScript id="faq-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Help"
            title="Answers first."
            description="Billing, access, membership, and 18+."
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Support
                </Link>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className={storefrontSecondaryButtonClass}
                >
                  Email support
                </a>
              </>
            }
            stats={[
              {
                label: "Answers",
                value: String(FAQ.length),
              },
              {
                label: "Contact",
                value: "Email + form",
              },
            ]}
          />

          <StorefrontDesk
            eyebrow="Support"
            title="Support."
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Support
                </Link>
                <Link
                  href="/how-it-works"
                  className={storefrontSecondaryButtonClass}
                >
                  Guide
                </Link>
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <StorefrontSectionHeading eyebrow="FAQ" title="Answers." />
            <div className="space-y-3">
              {FAQ.map((item) => (
                <StorefrontInfoCard
                  key={item.q}
                  title={item.q}
                  description={item.a}
                >
                </StorefrontInfoCard>
              ))}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            {QUICK_LINKS.map((item) => (
              <SurfacePanel
                key={item.title}
                className="h-full"
                appearance="light"
                accent="blue"
              >
                <StorefrontSectionHeading
                  eyebrow="Next"
                  title={item.title}
                  description={item.description}
                />
                <Link
                  href={item.href}
                  className={`mt-6 inline-flex ${storefrontSecondaryButtonClass}`}
                >
                  {item.label}
                </Link>
              </SurfacePanel>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
