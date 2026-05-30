import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import {
  StorefrontDesk,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "About Gush",
  description: siteConfig.aboutSummary,
  path: "/about",
});

const CONTACT_LINKS = [
  {
    label: "Email us",
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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#090b12_0%,#0f1119_34%,#13131d_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(255,79,154,0.12),transparent_20%),radial-gradient(circle_at_84%_10%,rgba(103,232,249,0.12),transparent_22%),radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.08),transparent_24%)]" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="About Gush"
            title="About Gush."
            description=""
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
            title="Contact."
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
          <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
            <StorefrontSectionHeading
              eyebrow="Principles"
              title="Readers first."
              description={siteConfig.aboutSummary}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Focus",
                  value: "Comics, novels, and interactive stories in one reading home.",
                },
                {
                  label: "Approach",
                  value: "Fast discovery, cleaner shelves, and less friction between curiosity and the next chapter.",
                },
                {
                  label: "Promise",
                  value: "A front page that feels like entertainment, not a dusty archive.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-4 shadow-[0_18px_36px_rgba(8,6,20,0.18)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-[1.68] text-white/76">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
            <StorefrontSectionHeading eyebrow="Details" title="Contact." />
            <div className="space-y-3 text-sm leading-[1.68] text-white/70">
              <p>
                <span className="font-semibold text-white">Support:</span>{" "}
                {siteConfig.supportEmail}
              </p>
              <p>
                <span className="font-semibold text-white">Privacy:</span>{" "}
                {siteConfig.privacyEmail}
              </p>
              <p>
                <span className="font-semibold text-white">Legal:</span>{" "}
                {siteConfig.legalEmail}
              </p>
              {siteConfig.companyAddress ? (
                <p>
                  <span className="font-semibold text-white">Address:</span>{" "}
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
