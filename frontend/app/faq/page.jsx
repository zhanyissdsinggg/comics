import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
} from "../../lib/structuredData";
import { getSiteFaqItems } from "../../lib/storefrontFaq";

export const metadata = createPageMetadata({
  title: "Help & FAQ",
  description:
    "Quick answers on billing, access, membership, and 18+ settings.",
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
    label: "Support",
  },
  {
    title: "How it works",
    description: "Points and plans.",
    href: "/how-it-works",
    label: "Guide",
  },
  {
    title: "Mature content",
    description: "18+ access settings.",
    href: "/mature-content",
    label: "18+ access",
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
      description:
        "Quick answers on billing, access, membership, and 18+ settings.",
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
            title="Answers first."
            description="Billing, access, membership, and 18+."
            actions={
              <>
                <Link
                  href="/support"
                  className="border-[3px] border-black bg-[#ff007a] px-5 py-3 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none"
                >
                  Support
                </Link>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="border-[3px] border-black bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none"
                >
                  Email support
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
            ]}
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                Support
              </p>
              <div>
                <h2 className="text-[1.7rem] font-black uppercase tracking-[-0.05em] text-black">
                  Support.
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/support"
                className="border-[3px] border-black bg-[#ff007a] px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none"
              >
                Support
              </Link>
              <Link
                href="/how-it-works"
                className="border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00e5ff] hover:shadow-none"
              >
                Guide
              </Link>
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                FAQ
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                Answers.
              </h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="border-[3px] border-black bg-white px-5 py-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
                >
                  <h3 className="text-base font-black uppercase tracking-[-0.02em] text-black">
                    {item.q}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-black/68">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            {QUICK_LINKS.map((item) => (
              <SurfacePanel
                key={item.title}
                className="h-full"
                appearance="light"
                accent="blue"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                  Next
                </p>
                <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  {item.title}
                </h2>
                <p className="mt-4 text-sm font-medium leading-7 text-black/68">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none"
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
