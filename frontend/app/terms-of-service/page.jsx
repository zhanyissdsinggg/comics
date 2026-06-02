import LegalEditorialLayout from "../../components/common/LegalEditorialLayout";
import { StorefrontInfoCard } from "../../components/common/StorefrontPagePrimitives";
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
}

const overviewCards = [
  {
    label: "Effective",
    value: effectiveDate,
    hint: "This is the version currently published on the site.",
  },
  {
    label: "Scope",
    value: monetizationLive
      ? "Browsing + purchases"
      : "Browsing + future purchases",
    hint: "Covers the public product and any commerce features that are live.",
  },
  {
    label: "Contact",
    value: "Legal inbox",
    hint: "Use the direct legal route for formal questions or notices.",
  },
];

function ContactCard() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <StorefrontInfoCard
        eyebrow="Legal"
        title={siteConfig.legalEmail}
        description="Use this inbox for legal notices, formal questions, or policy-level issues."
      />
      <StorefrontInfoCard
        eyebrow="Privacy"
        title={siteConfig.privacyEmail}
        description="Use the privacy inbox instead when the request is specifically about data handling."
      />
      {siteConfig.companyAddress ? (
        <StorefrontInfoCard
          eyebrow="Address"
          title={siteConfig.companyAddress}
          description="Business contact location."
          className="lg:col-span-2"
        />
      ) : null}
    </div>
  );
}

export default function TermsOfServicePage() {
  return (
    <LegalEditorialLayout
      eyebrow="Terms"
      title="Terms that explain the rules without burying the reader."
      description={`Using ${siteConfig.siteName} means you agree to the product rules below, including account conduct, reading access, and any commerce behavior that is currently live.`}
      heroStats={[
        {
          label: "Effective",
          value: effectiveDate,
        },
        {
          label: "Scope",
          value: monetizationLive
            ? "Reading + purchases"
            : "Reading + future purchases",
        },
        {
          label: "Contact",
          value: "Legal inbox",
        },
      ]}
      sideDesk={{
        eyebrow: "Legal",
        title: "Use the right legal route.",
        description:
          "Formal policy or legal questions go to the legal inbox. Privacy-specific issues still belong in the privacy lane.",
        actions: [
          {
            label: "Email legal team",
            href: `mailto:${siteConfig.legalEmail}`,
            external: true,
            primary: true,
            note: "For legal questions or notices.",
          },
          {
            label: "View privacy policy",
            href: "/privacy-policy",
          },
        ],
      }}
      overviewTitle="The short version first"
      overviewDescription="Most readers come here to confirm what is allowed, how purchases behave, and what happens if the service changes or access gets restricted."
      overviewCards={overviewCards}
      quickLinks={TERMS_SECTIONS.map((section) => ({
        title: section.title,
        description:
          section.title === "What you cannot do"
            ? "The fastest way to check prohibited behavior."
            : section.title === "Purchases and digital access"
              ? "How paid access and unlocks are framed."
              : section.title === "Mature content"
                ? "Rules tied to 18+ access and visibility controls."
                : "",
      }))}
      sections={TERMS_SECTIONS}
      contactTitle="Legal contact"
      contactDescription="If the question is formal, contractual, or notice-related, use the direct legal contact details below."
      contactCard={<ContactCard />}
    />
  );
}
