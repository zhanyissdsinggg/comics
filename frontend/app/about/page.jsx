import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import InfoPageNav from "../../components/layout/InfoPageNav";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "About",
  description: siteConfig.aboutSummary,
  path: "/about",
});

const PLATFORM_PILLARS = [
  {
    title: "Reader-first product decisions",
    description:
      "Discovery, checkout, and reading flows are shaped to reduce friction instead of chasing vanity features.",
  },
  {
    title: "Operationally practical systems",
    description:
      "Admin controls, analytics, and support tooling stay clear enough to run without drowning the team in busywork.",
  },
  {
    title: "Trust through clarity",
    description:
      "Support channels, legal pages, and platform status stay visible so users can verify how the product behaves.",
  },
];

const CONTACT_LINKS = [
  { label: "Support", href: `mailto:${siteConfig.supportEmail}`, external: true },
  { label: "Privacy", href: `mailto:${siteConfig.privacyEmail}`, external: true },
  { label: "Terms", href: "/terms-of-service", external: false },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SiteHeader />
      <main className="px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <InfoPageNav current="about" />

          <EditorialHero
            eyebrow="About"
            title={siteConfig.companyName}
            description={siteConfig.aboutSummary}
            secondary="We focus on fast page loads, dependable reading progress, and a buying flow that stays straightforward."
            actions={
              <>
                <Link
                  href="/support"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Contact support
                </Link>
                <Link
                  href="/faq"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200"
                >
                  Browse FAQ
                </Link>
              </>
            }
            stats={[
              {
                label: "Focus",
                value: "Reader first",
                hint: "Interfaces are shaped around discovery, purchase clarity, and uninterrupted reading.",
              },
              {
                label: "Ops model",
                value: "Lean systems",
                hint: "The platform is designed to stay maintainable instead of hiding simple work behind noise.",
              },
              {
                label: "Trust",
                value: "Visible",
                hint: "Support, policy, and billing touchpoints stay obvious so users know where to go next.",
              },
              {
                label: "Contact",
                value: siteConfig.supportEmail,
                hint: "Direct access to the support inbox remains available across the product.",
              },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <SurfacePanel className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  What we optimize for
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  A reading product should feel fast, legible, and predictable.
                </h2>
              </div>
              <div className="space-y-4 text-sm leading-7 text-neutral-300">
                <p>
                  {siteConfig.companyName} exists to make digital reading easier to browse, easier to buy, and easier to
                  return to across both comics and novels.
                </p>
                <p>
                  That means less interface clutter, fewer dead-end flows, and clearer support paths when billing,
                  account, or catalog issues happen.
                </p>
                <p>
                  We also treat the operational side of the product as part of the user experience. Clean back-office
                  tools, consistent metadata, and visible legal information all contribute to a platform that feels more
                  trustworthy.
                </p>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Contact snapshot
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Reach the team through the channel that matches the issue.
                </h2>
              </div>
              <div className="space-y-3 text-sm text-neutral-300">
                <p>
                  <span className="font-semibold text-white">Support:</span> {siteConfig.supportEmail}
                </p>
                <p>
                  <span className="font-semibold text-white">Privacy:</span> {siteConfig.privacyEmail}
                </p>
                {siteConfig.companyAddress ? (
                  <p>
                    <span className="font-semibold text-white">Address:</span> {siteConfig.companyAddress}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                {CONTACT_LINKS.map((item) =>
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.href}
                      className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-emerald-300 hover:text-emerald-200"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-emerald-300 hover:text-emerald-200"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </div>
            </SurfacePanel>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {PLATFORM_PILLARS.map((pillar) => (
              <SurfacePanel key={pillar.title} className="h-full">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">Principle</p>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                  {pillar.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-neutral-300">{pillar.description}</p>
              </SurfacePanel>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
