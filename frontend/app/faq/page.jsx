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
import { StorefrontPage } from "../../components/storefront/StorefrontScaffold";
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
    description: "Need a person instead of an answer block? Use the support form.",
    href: "/support",
    label: "Open support",
  },
  {
    title: "How Reading Works",
    description: "Points, plans, free chapters, and the basic reading flow.",
    href: "/how-it-works",
    label: "Reading basics",
  },
  {
    title: "18+ Access",
    description: "How mature access works and why the two content modes stay separate.",
    href: "/mature-content",
    label: "Mature access",
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
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]">
      <StructuredDataScript id="faq-jsonld" data={structuredData} />
      <div className="flex flex-col gap-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="FAQ"
            title="Fast answers for the pages people actually get stuck on."
            description="Reading, billing, access, and support basics in one place."
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
                label: "FAQ items",
                value: String(FAQ.length),
              },
              {
                label: "Fallback",
                value: "Support + email",
              },
              {
                label: "Focus",
                value: "Reading + billing",
              },
            ]}
          />

          <StorefrontDesk
            eyebrow="Need more"
            title="Jump to the right page."
            description="If the answer is not here, move straight to the correct support lane."
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Open support
                </Link>
                <Link
                  href="/how-it-works"
                  className={storefrontSecondaryButtonClass}
                >
                  Reading basics
                </Link>
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <SurfacePanel className="space-y-4" appearance="dark" accent="cyan">
            <StorefrontSectionHeading
              eyebrow="Help center"
              title="Most asked right now"
              description="Short answers for the questions that come up most often when readers are browsing, paying, or trying to get back into a story."
            />
            <div className="space-y-3">
              {FAQ.map((item, index) => (
                <StorefrontInfoCard
                  key={item.q}
                  eyebrow={`FAQ ${index + 1}`}
                  title={item.q}
                  description={item.a}
                />
              ))}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            {QUICK_LINKS.map((item, index) => (
              <SurfacePanel
                key={item.title}
                className="h-full"
                appearance="dark"
                accent={index === 0 ? "rose" : index === 1 ? "cyan" : "amber"}
              >
                <StorefrontSectionHeading
                  eyebrow="Next step"
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
      </div>
    </StorefrontPage>
  );
}
