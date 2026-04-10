import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description: `Read the rules for using ${siteConfig.siteName}, buying content, and keeping your account in good standing.`,
  path: "/terms-of-service",
});

const effectiveDate = "March 9, 2026";

const TERMS_SECTIONS = [
  {
    title: "Accounts",
    paragraphs: [
      "Keep your account information accurate and your login credentials secure.",
      `If you use ${siteConfig.siteName} on behalf of a company or organization, you confirm that you can bind that entity to these Terms.`,
    ],
  },
  {
    title: "What you cannot do",
    bullets: [
      `Do not misuse ${siteConfig.siteName}, interfere with other readers, or try to bypass technical limits.`,
      "Do not scrape, reverse engineer, resell, or automate access in ways we have not explicitly approved.",
      "Do not upload unlawful, infringing, fraudulent, or abusive material.",
    ],
  },
  {
    title: "Purchases and digital access",
    paragraphs: [
      `When you buy packs, memberships, credits, or promo benefits, you are getting personal access inside ${siteConfig.siteName} unless a separate written agreement says otherwise.`,
      "Prices, catalog availability, and promo rules can change, but we will not retroactively remove content you already unlocked lawfully unless we have to for legal or operational reasons.",
    ],
  },
  {
    title: "Ownership and rights",
    paragraphs: [
      `The site, design, trademarks, software, and all associated content are owned by ${siteConfig.companyName} or its licensors.`,
      "These Terms do not transfer ownership to you. You may not reproduce or distribute content outside the site except where the law clearly allows it.",
    ],
  },
  {
    title: "Availability and changes",
    paragraphs: [
      `We work to keep ${siteConfig.siteName} available and accurate, but we cannot promise the site will always be uninterrupted.`,
      "We may change features, pricing, catalog availability, security settings, or supported regions when needed to maintain the product or comply with law.",
    ],
  },
  {
    title: "Suspension or termination",
    paragraphs: [
      "We may suspend or terminate access if you break these Terms, create risk for the site, or use it in a way that harms other readers, rights holders, or operations.",
    ],
  },
  {
    title: "Warranty disclaimer",
    paragraphs: [
      'The site is provided on an "as is" and "as available" basis to the maximum extent permitted by law.',
      `We do not guarantee that ${siteConfig.siteName} will always be uninterrupted, error-free, or suitable for every purpose.`,
    ],
  },
  {
    title: "Limits on liability",
    paragraphs: [
      `To the maximum extent permitted by law, ${siteConfig.companyName} will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages arising from your use of the site.`,
    ],
  },
  {
    title: "Governing law",
    paragraphs: [
      `These Terms are governed by the laws that apply to the place where ${siteConfig.companyName} operates, without regard to conflict-of-law principles.`,
      "Disputes will be resolved in the courts or forums with competent jurisdiction over that place, unless mandatory law requires a different venue.",
    ],
  },
];

function LegalSection({
  title,
  paragraphs = [],
  bullets = [],
  className = "",
  children = null,
}) {
  return (
    <SurfacePanel className={className} appearance="light" accent="blue">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-slate-600 marker:text-[var(--gush-accent,#0071e3)]">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </SurfacePanel>
  );
}

function ContactCard() {
  return (
    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-950">Email:</span>{" "}
        <a
          href={`mailto:${siteConfig.legalEmail}`}
          className="text-[var(--gush-accent,#0071e3)] transition hover:text-[var(--gush-accent-strong,#0058cc)]"
        >
          {siteConfig.legalEmail}
        </a>
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-950">Address:</span>{" "}
          {siteConfig.companyAddress}
        </p>
      ) : null}
    </div>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Terms"
            title="Terms of service."
            description={
              <>
                Rules for using {siteConfig.siteName} and buying content. By
                using the site, you agree to these Terms and our{" "}
                <Link
                  href="/privacy-policy"
                  className="text-[var(--gush-accent,#0071e3)] transition hover:text-[var(--gush-accent-strong,#0058cc)]"
                >
                  Privacy Policy
                </Link>
                .
              </>
            }
            stats={[
              {
                label: "Effective",
                value: effectiveDate,
              },
              {
                label: "Covers",
                value: "Browsing + purchases",
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Legal
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  Legal contact.
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={`mailto:${siteConfig.legalEmail}`}
                className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Email legal
              </a>
              <Link
                href="/privacy-policy"
                className="rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                View privacy
              </Link>
            </div>
          </SurfacePanel>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          {TERMS_SECTIONS.map((section) => (
            <LegalSection key={section.title} {...section} />
          ))}

          <LegalSection title="Legal contact" className="xl:col-span-2">
            <ContactCard />
          </LegalSection>
        </div>
      </main>
    </div>
  );
}
