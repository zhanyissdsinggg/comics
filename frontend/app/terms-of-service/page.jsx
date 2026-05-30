import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import {
  StorefrontDesk,
  StorefrontInfoCard,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description: `Terms for ${siteConfig.siteName}.`,
  path: "/terms-of-service",
});

const effectiveDate = "March 9, 2026";
const monetizationLive =
  siteConfig.monetization.checkoutEnabled ||
  siteConfig.monetization.membershipEnabled ||
  siteConfig.monetization.pointPacksEnabled;
const hasResolvedLegalJurisdiction = Boolean(
  siteConfig.governingLaw && siteConfig.legalVenue,
);

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
      monetizationLive
        ? `When you buy packs, memberships, credits, or promo benefits, you are getting personal access inside ${siteConfig.siteName} unless a separate written agreement says otherwise.`
        : `If packs, memberships, credits, or promo benefits are enabled later, they will provide personal access inside ${siteConfig.siteName} unless a separate written agreement says otherwise.`,
      monetizationLive
        ? "Prices, catalog availability, and promo rules can change, but we will not retroactively remove content you already unlocked lawfully unless we have to for legal or operational reasons."
        : "If payments are enabled later, prices, catalog availability, and promo rules may change before launch or while those features roll out.",
    ],
  },
  {
    title: "Refunds and cancellations",
    paragraphs: [
      monetizationLive
        ? "If a purchase, membership, or other paid feature goes live, any refund or cancellation terms shown during checkout will control together with applicable law."
        : "If purchases are enabled later, any refund or cancellation terms will be shown at checkout before you pay.",
      "Unless local law requires otherwise, digital access that has already been delivered may be limited or non-refundable once unlocked.",
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
    title: "Mature content",
    paragraphs: [
      "Some titles may be marked Mature or 18+. Access to those titles can require sign-in, age confirmation, or device-level visibility settings before the title opens.",
      "Do not try to bypass age gates, regional access limits, or mature visibility controls.",
    ],
  },
];

if (hasResolvedLegalJurisdiction) {
  TERMS_SECTIONS.splice(8, 0, {
    title: "Governing Law and Venue",
    paragraphs: [
      `These Terms are governed by the laws of ${siteConfig.governingLaw}, without regard to conflict-of-law rules.`,
      `Any dispute will be resolved in the courts located in ${siteConfig.legalVenue}, unless applicable consumer law gives you rights in another location.`,
      `${siteConfig.siteName} is operated by ${siteConfig.companyName}.`,
    ],
  });
} else {
  // TODO: Populate NEXT_PUBLIC_GOVERNING_LAW and NEXT_PUBLIC_LEGAL_VENUE before public launch.
}

function LegalSection({
  title,
  paragraphs = [],
  bullets = [],
  className = "",
  children = null,
}) {
  return (
    <SurfacePanel className={className} appearance="dark" accent="cyan">
      <h2 className="font-display text-[1.8rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-[1.72] text-white/72">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-white/72 marker:text-[#FF007A]">
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
    <StorefrontInfoCard title="Legal contact">
      <p className="mt-3 text-sm text-white/68">
        <span className="font-semibold uppercase tracking-[0.08em] text-white">
          Email:
        </span>{" "}
        <a
          href={`mailto:${siteConfig.legalEmail}`}
          className="font-semibold text-[#ff77b0] transition hover:text-[#ff9cc0]"
        >
          {siteConfig.legalEmail}
        </a>
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-3 text-sm text-white/68">
          <span className="font-semibold uppercase tracking-[0.08em] text-white">
            Address:
          </span>{" "}
          {siteConfig.companyAddress}
        </p>
      ) : null}
    </StorefrontInfoCard>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#090b12_0%,#0f1119_34%,#13131d_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(255,79,154,0.12),transparent_20%),radial-gradient(circle_at_84%_10%,rgba(103,232,249,0.12),transparent_22%),radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.08),transparent_24%)]" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="Terms"
            title="Terms."
            description={
              <>
                Using {siteConfig.siteName} means you agree to these Terms and
                our{" "}
                <Link
                  href="/privacy-policy"
                  className="font-semibold text-[#ff77b0] transition hover:text-[#ff9cc0]"
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
                value: monetizationLive
                  ? "Browsing + purchases"
                  : "Browsing + future purchases",
              },
            ]}
          />

          <StorefrontDesk
            eyebrow="Legal"
            title="Contact."
            actions={
              <ul className="grid gap-2.5">
                <li>
                  <a
                    href={`mailto:${siteConfig.legalEmail}`}
                    className={storefrontPrimaryButtonClass}
                  >
                    Email legal team
                  </a>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/45">
                    For legal questions.
                  </p>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className={storefrontSecondaryButtonClass}
                  >
                    View privacy policy
                  </Link>
                </li>
              </ul>
            }
            description="Choose the legal contact link you need below."
          />
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
