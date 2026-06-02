import LegalEditorialLayout from "../../components/common/LegalEditorialLayout";
import { StorefrontInfoCard } from "../../components/common/StorefrontPagePrimitives";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `Privacy at ${siteConfig.siteName}.`,
  path: "/privacy-policy",
});

const effectiveDate = "March 9, 2026";
const monetizationLive =
  siteConfig.monetization.checkoutEnabled ||
  siteConfig.monetization.membershipEnabled ||
  siteConfig.monetization.pointPacksEnabled;

const PRIVACY_SECTIONS = [
  {
    title: "What we collect",
    bullets: [
      "Account details like email address, sign-in identifiers, and profile preferences.",
      monetizationLive
        ? "Purchase data tied to memberships, point packs, refunds, and promo redemptions."
        : "If payments are enabled later, purchase data may include memberships, point packs, refunds, and promo redemptions.",
      "Reading and device data such as pages visited, reading progress, device type, and basic diagnostics.",
      "Messages you send us through support, feedback forms, or direct email.",
    ],
  },
  {
    title: "How we use it",
    bullets: [
      monetizationLive
        ? "Run the site, sign readers in, and process payments."
        : "Run the site, sign readers in, and support future payment features when they are enabled.",
      "Fix bugs, prevent abuse, and keep the product secure.",
      "Personalize recommendations, reading tools, and product messages.",
      "Apply mature-content settings, age checks, and device-level visibility choices when a title is marked 18+.",
      "Meet legal obligations, enforce our Terms, and respond to valid requests from authorities.",
    ],
  },
  {
    title: "Why we process and share it",
    paragraphs: [
      monetizationLive
        ? `We process information when we need it to run ${siteConfig.siteName}, honor purchases, comply with law, protect the site, or improve the product.`
        : `We process information when we need it to run ${siteConfig.siteName}, comply with law, protect the site, or improve the product. If payments are enabled later, we may also process information needed to support purchases.`,
      "We may share data with hosting providers, payment processors, analytics vendors, support tools, or rights holders when that is required to run the site.",
    ],
  },
  {
    title: "How long we keep it",
    paragraphs: [
      "We keep data only as long as we need it for the reasons in this policy, including compliance, accounting, disputes, and site integrity.",
      "We use administrative, technical, and organizational safeguards, but no internet system is perfectly secure.",
    ],
  },
  {
    title: "International transfers",
    paragraphs: [
      "Your information may be processed outside the country where you live. When that happens, we use reasonable safeguards based on the type of data involved and the laws that apply.",
    ],
  },
  {
    title: "Your privacy choices",
    paragraphs: [
      "Depending on where you live, you may have the right to access, correct, delete, restrict, object to, or port certain personal information. You may also have the right to withdraw consent where processing depends on consent.",
      `To make a privacy request, contact us at ${siteConfig.privacyEmail}. We may need to verify your identity before completing the request.`,
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "The site is not directed to children under the age required by applicable law in their jurisdiction. If you believe a child provided personal information without proper consent, contact us so we can review it.",
    ],
  },
  {
    title: "Mature content controls",
    paragraphs: [
      "If a title is marked 18+, we may store age-gate confirmation and mature visibility settings on your device or account so the site can respect your current reading preferences.",
      "Hide mature history settings only affect how 18+ activity appears on the device you are using unless we explicitly say an account-level setting applies.",
    ],
  },
  {
    title: "Policy updates",
    paragraphs: [
      "We may update this policy when our practices, product features, or legal obligations change. When we make material updates, we will post the new version on this page and update the effective date above.",
    ],
  },
];

const overviewCards = [
  {
    label: "Effective",
    value: effectiveDate,
    hint: "This is the version currently published on the site.",
  },
  {
    label: "Focus",
    value: "Account + reading data",
    hint: "The main categories most readers care about first.",
  },
  {
    label: "Requests",
    value: "Privacy inbox",
    hint: "Use the direct privacy contact for access or deletion requests.",
  },
];

function ContactCard() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <StorefrontInfoCard
        eyebrow="Privacy"
        title={siteConfig.privacyEmail}
        description="Use this inbox for access, correction, deletion, or related data requests."
      />
      <StorefrontInfoCard
        eyebrow="Support"
        title={siteConfig.supportEmail}
        description="Use support when the issue is about reading, billing, or account flow instead of a privacy request."
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

export default function PrivacyPolicyPage() {
  return (
    <LegalEditorialLayout
      eyebrow="Privacy"
      title="Privacy that keeps the reading flow clear."
      description={`This page covers what ${siteConfig.siteName} collects, why it is used, and where to go if you need a privacy-specific answer instead of general support.`}
      heroStats={[
        {
          label: "Effective",
          value: effectiveDate,
        },
        {
          label: "Covers",
          value: "Account + reading",
        },
        {
          label: "Contact",
          value: "Privacy inbox",
        },
      ]}
      sideDesk={{
        eyebrow: "Contact",
        title: "Use the right privacy lane.",
        description:
          "If the issue is about personal data, use the privacy inbox. If the issue is reading or billing, support is faster.",
        actions: [
          {
            label: "Email privacy team",
            href: `mailto:${siteConfig.privacyEmail}`,
            external: true,
            primary: true,
            note: "For privacy-specific requests.",
          },
          {
            label: "Contact support",
            href: "/support",
          },
        ],
      }}
      overviewTitle="The short version first"
      overviewDescription="Most readers are trying to answer one of three things here: what data is involved, why it exists, and where to send a request."
      overviewCards={overviewCards}
      quickLinks={PRIVACY_SECTIONS.map((section) => ({
        title: section.title,
        description:
          section.title === "What we collect"
            ? "The main data buckets tied to using Gush."
            : section.title === "Your privacy choices"
              ? "Where requests and opt-out style questions usually start."
              : section.title === "Mature content controls"
                ? "How 18+ settings and visibility choices are handled."
                : "",
      }))}
      sections={PRIVACY_SECTIONS}
      contactTitle="Privacy requests"
      contactDescription="Use the direct inbox below when the request is specifically about personal data, policy, or legal privacy rights."
      contactCard={<ContactCard />}
    />
  );
}
