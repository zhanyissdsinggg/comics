import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "About Gush",
  description: siteConfig.aboutSummary,
  path: "/about",
});

const CONTACT_LINKS = [
  { label: "Email support", href: `mailto:${siteConfig.supportEmail}`, external: true },
  { label: "Legal contact", href: `mailto:${siteConfig.legalEmail}`, external: true },
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
            title="Stories first. Everything else stays quiet."
            description="Original comics and serialized fiction for calmer reading."
            actions={
              <>
                <Link
                  href="/support"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Support
                </Link>
                <Link
                  href="/faq"
                  className="rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  View FAQ
                </Link>
              </>
            }
          />

          <SurfacePanel tone="muted" accent="blue" className="flex h-full flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">
                Contact
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-white">
                  Support and legal.
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/support"
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-white/92"
              >
                Open Support
              </Link>
              <a
                href={`mailto:${siteConfig.legalEmail}`}
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/88 transition hover:border-white/18 hover:bg-white/[0.08]"
              >
                Email legal
              </a>
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Principles
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Built for readers first.
              </h2>
            </div>
            <p className="text-sm leading-7 text-slate-600">
              {siteConfig.companyName} is for readers who want to open a chapter and stay in the story.
              Discovery, purchases, and account flows stay simple.
            </p>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Details
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Clear contact details.
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-950">Support:</span> {siteConfig.supportEmail}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Privacy:</span> {siteConfig.privacyEmail}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Legal:</span> {siteConfig.legalEmail}
              </p>
              {siteConfig.companyAddress ? (
                <p>
                  <span className="font-semibold text-slate-950">Address:</span> {siteConfig.companyAddress}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {CONTACT_LINKS.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel className="space-y-4" appearance="light" accent="blue">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Need help?
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/support"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open Support
              </Link>
              <Link
                href="/privacy-policy"
                className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                Privacy
              </Link>
            </div>
          </div>
        </SurfacePanel>
      </main>
    </div>
  );
}
