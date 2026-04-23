import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import {
  StorefrontDesk,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import SiteHeader from "../../components/layout/SiteHeader";
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

export default function AboutPage() {
  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="About Gush"
            title="Built for reading."
            description="Comics and serialized fiction, kept clear."
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
          />

          <StorefrontDesk
            eyebrow="Contact"
            title="Support and legal."
            actions={
              <>
                <Link href="/support" className={storefrontPrimaryButtonClass}>
                  Support
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

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading
              eyebrow="Principles"
              title="Readers first."
            />
            <p className="text-sm leading-7 text-black/68">
              {siteConfig.companyName} is for readers who want to open a chapter
              and stay in the story. Discovery, purchases, and account flows
              stay simple.
            </p>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <StorefrontSectionHeading
              eyebrow="Details"
              title="Contact details."
            />
            <div className="space-y-3 text-sm text-black/68">
              <p>
                <span className="font-semibold text-black">Support:</span>{" "}
                {siteConfig.supportEmail}
              </p>
              <p>
                <span className="font-semibold text-black">Privacy:</span>{" "}
                {siteConfig.privacyEmail}
              </p>
              <p>
                <span className="font-semibold text-black">Legal:</span>{" "}
                {siteConfig.legalEmail}
              </p>
              {siteConfig.companyAddress ? (
                <p>
                  <span className="font-semibold text-black">Address:</span>{" "}
                  {siteConfig.companyAddress}
                </p>
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
      </main>
    </div>
  );
}
