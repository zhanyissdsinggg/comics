import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import InfoPageNav from "../../components/layout/InfoPageNav";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description: `Read the terms that govern access to ${siteConfig.siteName} and the services we provide.`,
  path: "/terms-of-service",
});

const effectiveDate = "March 9, 2026";

const TERMS_SECTIONS = [
  {
    title: "1. Eligibility and accounts",
    paragraphs: [
      "You must provide accurate account information and keep your login credentials secure.",
      "If you use the platform on behalf of an organization, you confirm that you are authorized to bind that organization.",
    ],
  },
  {
    title: "2. Acceptable use",
    bullets: [
      "Do not misuse the service, interfere with other users, or attempt to bypass technical restrictions.",
      "Do not scrape, reverse engineer, resell, or automate access in ways we have not explicitly approved.",
      "Do not upload unlawful, infringing, fraudulent, or abusive material.",
    ],
  },
  {
    title: "3. Digital content and purchases",
    paragraphs: [
      "Purchases, subscriptions, credits, and promotional benefits are licensed for personal use inside the service unless a separate written agreement says otherwise.",
      "Prices, catalog availability, and promotional rules may change at any time, but those changes will not retroactively remove content you have already lawfully unlocked unless required for legal or operational reasons.",
    ],
  },
  {
    title: "4. Intellectual property",
    paragraphs: [
      `The platform, site design, trademarks, software, and all associated content are owned by ${siteConfig.companyName} or its licensors.`,
      "These Terms do not transfer ownership to you. You may not reproduce or distribute content outside the service except where the law clearly allows it.",
    ],
  },
  {
    title: "5. Availability and changes",
    paragraphs: [
      "We work to keep the service available and accurate, but we do not promise uninterrupted access.",
      "We may update features, pricing, catalogs, security controls, or supported regions when necessary to maintain the product or comply with law.",
    ],
  },
  {
    title: "6. Suspension and termination",
    paragraphs: [
      "We may suspend or terminate access if you violate these Terms, create risk for the platform, or use the service in a way that harms other users, rights holders, or our operations.",
    ],
  },
  {
    title: "7. Warranty disclaimer",
    paragraphs: [
      'The service is provided on an "as is" and "as available" basis to the maximum extent permitted by law.',
      "We do not make guarantees that the service will always be uninterrupted, error-free, or suitable for every purpose.",
    ],
  },
  {
    title: "8. Limitation of liability",
    paragraphs: [
      `To the maximum extent permitted by law, ${siteConfig.companyName} will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages arising from your use of the service.`,
    ],
  },
  {
    title: "9. Governing law",
    paragraphs: [
      `These Terms are governed by the laws that apply to the place where ${siteConfig.companyName} operates, without regard to conflict-of-law principles.`,
      "Disputes will be resolved in the courts or forums with competent jurisdiction over that place, unless mandatory law requires a different venue.",
    ],
  },
];

function LegalSection({ title, paragraphs = [], bullets = [], className = "", children = null }) {
  return (
    <SurfacePanel className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Terms section</p>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-300">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-neutral-300 marker:text-emerald-300/80">
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
    <div className="rounded-[24px] border border-white/8 bg-black/20 px-5 py-4 backdrop-blur-sm">
      <p className="text-sm text-neutral-300">
        <span className="font-semibold text-white">Email:</span>{" "}
        <a
          href={`mailto:${siteConfig.legalEmail}`}
          className="text-emerald-200 transition hover:text-emerald-100"
        >
          {siteConfig.legalEmail}
        </a>
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-3 text-sm text-neutral-300">
          <span className="font-semibold text-white">Address:</span> {siteConfig.companyAddress}
        </p>
      ) : null}
    </div>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SiteHeader />
      <main className="px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <InfoPageNav current="terms" />

          <EditorialHero
            eyebrow="Legal"
            title="Terms of Service"
            description={
              <>
                These Terms govern your use of {siteConfig.siteName}. By accessing or using the site, you agree to follow
                these Terms, our{" "}
                <Link href="/privacy-policy" className="text-emerald-200 transition hover:text-emerald-100">
                  Privacy Policy
                </Link>
                , and any service-specific rules shown inside the product.
              </>
            }
            secondary="The agreement below is arranged into clear sections so users can scan account rules, purchase language, liability, and legal contact details without reading a dense block of prose."
            stats={[
              {
                label: "Effective",
                value: effectiveDate,
                hint: "This date marks the active version of the Terms now shown on the site.",
              },
              {
                label: "Coverage",
                value: "Accounts + purchases",
                hint: "These Terms apply to browsing, accounts, payments, subscriptions, and platform use.",
              },
              {
                label: "Content",
                value: "Licensed use",
                hint: "Purchases unlock personal access inside the service rather than ownership transfer.",
              },
              {
                label: "Contact",
                value: siteConfig.legalEmail,
                hint: "Formal notices and legal questions should route to this address.",
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {TERMS_SECTIONS.map((section) => (
              <LegalSection key={section.title} {...section} />
            ))}

            <LegalSection
              title="10. Contact"
              className="xl:col-span-2"
              paragraphs={[
                "If you have legal questions or need to send a formal notice, use the contact details below.",
              ]}
            >
              <ContactCard />
            </LegalSection>
          </div>
        </div>
      </main>
    </div>
  );
}
