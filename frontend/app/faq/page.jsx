import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";
import { buildBreadcrumbStructuredData, buildFaqStructuredData } from "../../lib/structuredData";
import { getSiteFaqItems } from "../../lib/storefrontFaq";

export const metadata = createPageMetadata({
  title: "Help & FAQ",
  description: "Quick answers on billing, access, membership, and 18+ settings.",
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
    label: "Open Support",
  },
  {
    title: "How it works",
    description: "Points and plans.",
    href: "/how-it-works",
    label: "Open Guide",
  },
  {
    title: "Mature content",
    description: "18+ access settings.",
    href: "/mature-content",
    label: "View 18+ Access",
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
      description: "Quick answers on billing, access, membership, and 18+ settings.",
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
            title="Quick answers first."
            description="Billing, account access, membership, and 18+ settings."
            actions={
              <>
                <Link
                  href="/support"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Support
                </Link>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  Email Support
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
              {
                label: "How it works",
                value: "Points + plans",
              },
              {
                label: "18+ access",
                value: "Age + region",
              },
            ]}
          />

          <SurfacePanel tone="muted" accent="blue" className="flex h-full flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">
                Support
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-white">
                  Start here.
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
              <Link
                href="/how-it-works"
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/88 transition hover:border-white/18 hover:bg-white/[0.08]"
              >
                Open Guide
              </Link>
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                FAQ
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Quick answers.
              </h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="rounded-[24px] border border-black/8 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                >
                  <h3 className="text-base font-semibold text-slate-950">{item.q}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            {QUICK_LINKS.map((item) => (
              <SurfacePanel key={item.title} className="h-full" appearance="light" accent="blue">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Next</p>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
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
