import Link from "next/link";
import SiteHeader from "../../components/layout/SiteHeader";
import InfoPageNav from "../../components/layout/InfoPageNav";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "About",
  description: siteConfig.aboutSummary,
  path: "/about",
});

export default function AboutPage() {
  const contactLinks = [
    { label: "Support", href: `mailto:${siteConfig.supportEmail}` },
    { label: "Privacy", href: `mailto:${siteConfig.privacyEmail}` },
    { label: "Terms", href: "/terms-of-service" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SiteHeader />
      <main className="px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <InfoPageNav current="about" />
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">About</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {siteConfig.companyName}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-300 sm:text-lg">
              {siteConfig.aboutSummary}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
              We focus on fast page loads, reliable reading progress, and a storefront that keeps the buying flow simple.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Reader first</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Layouts, payment flows, and discovery all stay focused on reading instead of noise.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Operationally simple</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Admin tools, branding controls, and observability stay practical so the platform is easier to run.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Built for trust</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Clear policies, real support contacts, and stable deployment metadata make the product easier to trust.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-neutral-900/80 p-8">
            <h2 className="text-xl font-semibold">Contact</h2>
            <div className="mt-4 space-y-2 text-sm text-neutral-300">
              <p>Email: {siteConfig.supportEmail}</p>
              {siteConfig.companyAddress ? <p>Address: {siteConfig.companyAddress}</p> : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {contactLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-neutral-200 transition hover:border-emerald-400 hover:text-emerald-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
