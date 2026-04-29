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
  title: "FAQ",
  description: "",
  path: "/faq",
});

const FAQ = getSiteFaqItems().map((item) => ({
  q: item.question,
  a: item.answer,
}));

const QUICK_LINKS = [
  {
    title: "Support",
    description: "",
    href: "/support",
    label: "Support",
  },
  {
    title: "Access",
    description: "",
    href: "/how-it-works",
    label: "How It Works",
  },
  {
    title: "Mature content",
    description: "",
    href: "/mature-content",
    label: "18+ Access",
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
      description: "",
      items: FAQ,
    }),
  ].filter(Boolean);

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <StructuredDataScript id="faq-jsonld" data={structuredData} />
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="FAQ"
            title="Answers."
            description=""
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Support
                </Link>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className={storefrontSecondaryButtonClass}
                >
                  Email us
                </a>
              </>
            }
            stats={[
              {
                label: "Items",
                value: String(FAQ.length),
              },
              {
                label: "Contact",
                value: "Email + form",
              },
            ]}
          />

          <StorefrontDesk
            eyebrow="More"
            title="More."
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Support
                </Link>
                <Link
                  href="/how-it-works"
                  className={storefrontSecondaryButtonClass}
                >
                  How It Works
                </Link>
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <SurfacePanel className="space-y-4" appearance="dark" accent="cyan">
            <StorefrontSectionHeading eyebrow="FAQ" title="Answers." />
            <div className="space-y-3">
              {FAQ.map((item) => (
                <StorefrontInfoCard
                  key={item.q}
                  title={item.q}
                  description={item.a}
                />
              ))}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            {QUICK_LINKS.map((item) => (
              <SurfacePanel
                key={item.title}
                className="h-full"
                appearance="dark"
                accent="cyan"
              >
                <StorefrontSectionHeading
                  eyebrow="More"
                  title={item.title}
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
