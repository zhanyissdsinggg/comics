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
    title: "Get help",
    description: "Send a request about billing, access, or a broken page.",
    href: "/support",
    label: "Send Request",
  },
  {
    title: "How it works",
    description: "See what is free, how points work, and where membership fits.",
    href: "/how-it-works",
    label: "Read how it works",
  },
  {
    title: "Mature content",
    description: "Check age verification, region settings, and 18+ history controls.",
    href: "/mature-content",
    label: "Review 18+ access",
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
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <StructuredDataScript id="faq-jsonld" data={structuredData} />
      <SiteHeader variant="light" />
      <main className="relative px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Help"
            title="Quick answers before support."
            description="Billing, account access, membership, and 18+ settings."
            secondary="Still stuck? Contact us in one step."
            actions={
              <>
                <Link
                  href="/support"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Get help
                </Link>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  Email us
                </a>
              </>
            }
            stats={[
              {
                label: "Answers",
                value: String(FAQ.length),
                hint: "The issues readers hit most.",
              },
              {
                label: "Contact",
                value: "Email + form",
                hint: "A person is one click away.",
              },
              {
                label: "How it works",
                value: "Points + plans",
                hint: "Free reads, points, and plans.",
              },
              {
                label: "18+ access",
                value: "Age + region",
                hint: "Access depends on age and region.",
              },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Common questions
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Start here.
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Shortcut</p>
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
        </div>
      </main>
    </div>
  );
}
