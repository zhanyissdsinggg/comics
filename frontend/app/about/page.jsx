import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import {
  StorefrontDesk,
  StorefrontInfoCard,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import { StorefrontPage } from "../../components/storefront/StorefrontScaffold";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "About Gush",
  description: siteConfig.aboutSummary,
  path: "/about",
});

const CONTACT_LINKS = [
  {
    label: "Email support",
    href: `mailto:${siteConfig.supportEmail}`,
    external: true,
  },
  {
    label: "Legal contact",
    href: `mailto:${siteConfig.legalEmail}`,
    external: true,
  },
  { label: "FAQ", href: "/faq", external: false },
  { label: "Privacy", href: "/privacy-policy", external: false },
  { label: "Terms", href: "/terms-of-service", external: false },
];

const PRINCIPLES = [
  {
    label: "Entertainment first",
    value:
      "Gush is built to feel like opening a story app, not digging through a dusty catalog.",
  },
  {
    label: "One shelf, more formats",
    value:
      "Comics, novels, and interactive stories all live in one reading home with the same discovery rhythm.",
  },
  {
    label: "Cleaner discovery",
    value:
      "The front page, search, rankings, and details are designed to get readers into the next obsession faster.",
  },
];

const STATUS_CARDS = [
  {
    label: "Formats",
    value: "Comics, novels, interactive",
  },
  {
    label: "Audience",
    value: "US teen entertainment",
  },
  {
    label: "Vibe",
    value: "Story-first, fast, bingeable",
  },
];

export default function AboutPage() {
  return (
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]">
      <div className="flex flex-col gap-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="About Gush"
            title="Stories should feel easy to open and hard to forget."
            description={siteConfig.aboutSummary}
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Support
                </Link>
                <Link href="/faq" className={storefrontSecondaryButtonClass}>
                  FAQ
                </Link>
              </>
            }
            stats={STATUS_CARDS}
          />

          <StorefrontDesk
            eyebrow="Contact"
            title="Talk to the right lane."
            description="Support, privacy, and legal contacts stay one click away."
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Open support
                </Link>
                <a
                  href={`mailto:${siteConfig.legalEmail}`}
                  className={storefrontSecondaryButtonClass}
                >
                  Email legal
                </a>
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
            <StorefrontSectionHeading
              eyebrow="What we are building"
              title="A reading platform that behaves like entertainment."
              description="The goal is simple: discovery should feel alive, browsing should feel intentional, and every route back into a story should be fast."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {PRINCIPLES.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-4 shadow-[0_18px_36px_rgba(8,6,20,0.18)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm leading-[1.68] text-white/76">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="dark" accent="rose">
            <StorefrontSectionHeading
              eyebrow="Contact details"
              title="Reach the right inbox."
              description="Use the support form for reader issues. Use the direct addresses below when the conversation belongs to privacy or legal."
            />
            <div className="grid gap-3">
              <StorefrontInfoCard
                eyebrow="Support"
                title={siteConfig.supportEmail}
                description="Reading issues, billing questions, and account help."
              />
              <StorefrontInfoCard
                eyebrow="Privacy"
                title={siteConfig.privacyEmail}
                description="Requests related to privacy, data, and policy."
              />
              <StorefrontInfoCard
                eyebrow="Legal"
                title={siteConfig.legalEmail}
                description="Legal notices and formal contact."
              />
              {siteConfig.companyAddress ? (
                <StorefrontInfoCard
                  eyebrow="Address"
                  title={siteConfig.companyAddress}
                  description="Business contact location."
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {CONTACT_LINKS.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className={storefrontSecondaryButtonClass}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={storefrontSecondaryButtonClass}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </SurfacePanel>
        </section>
      </div>
    </StorefrontPage>
  );
}
