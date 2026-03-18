import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import InfoPageNav from "../../components/layout/InfoPageNav";
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
  { label: "FAQ", href: "/faq", external: false },
  { label: "Privacy", href: "/privacy-policy", external: false },
  { label: "Terms", href: "/terms-of-service", external: false },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <InfoPageNav current="about" appearance="light" />

          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="About Gush"
            title="Stories first. Everything else stays out of the way."
            description={siteConfig.aboutSummary}
            secondary="Browse, buy, and read without the site turning into work."
            actions={
              <>
                <Link
                  href="/support"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Get help
                </Link>
                <Link
                  href="/faq"
                  className="rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  Read FAQ
                </Link>
              </>
            }
          />

          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  What we care about
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Built for readers, not platform busywork.
                </h2>
              </div>
              <div className="space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  {siteConfig.companyName} is for people who want to find something good, open a chapter, and stay in the story.
                </p>
                <p>
                  We keep discovery, purchases, and account flows simple so the site does not feel like homework.
                </p>
                <p>
                  It also means help should be easy to reach, policies should be readable, and the reading experience should feel steady on desktop and mobile.
                </p>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Trust
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  You should always know who you are dealing with.
                </h2>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-950">Support:</span> {siteConfig.supportEmail}
                </p>
                <p>
                  <span className="font-semibold text-slate-950">Privacy:</span> {siteConfig.privacyEmail}
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
              Need something?
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="max-w-3xl text-sm leading-7 text-slate-600">
                If a charge looks wrong, a page breaks, or you just need an answer, start with Support. If you want the fine print, Privacy and Terms are right here.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/support"
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open help
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
        </div>
      </main>
    </div>
  );
}
