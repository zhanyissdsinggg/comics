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

const CONTACT_LINKS = [
  { label: "Support", href: `mailto:${siteConfig.supportEmail}`, external: true },
  { label: "FAQ", href: "/faq", external: false },
  { label: "Privacy Policy", href: "/privacy-policy", external: false },
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
            secondary="We keep browsing, buying, and reading as clear as possible so readers can get to the story faster."
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
          />

          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <SurfacePanel className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  What this site is
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  A digital reading platform for comics and novels.
                </h2>
              </div>
              <div className="space-y-4 text-sm leading-7 text-neutral-300">
                <p>
                  {siteConfig.companyName} is built for readers who want to discover a title, open an episode, and keep reading without wrestling the interface.
                </p>
                <p>
                  That means less interface clutter, clearer purchase paths, and support pages that help when billing, account, or catalog issues happen.
                </p>
                <p>
                  It also means visible policies, a direct support inbox, and predictable reading behavior across desktop and mobile.
                </p>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Contact and policies
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Real company details should be easy to find.
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

          <SurfacePanel className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
              Need help now?
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="max-w-3xl text-sm leading-7 text-neutral-300">
                For billing questions, reading bugs, or account problems, Support is the fastest path. For common questions, the FAQ and policy pages usually answer them immediately.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/support"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Open Support
                </Link>
                <Link
                  href="/privacy-policy"
                  className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:text-white"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </SurfacePanel>
        </div>
      </main>
    </div>
  );
}
